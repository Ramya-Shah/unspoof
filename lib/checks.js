// The four checks (DMARC, SPF, DKIM, MX), scoring and the headline verdict.
// Reads public DNS only.

const { resolve, DnsError } = require('./dns');

const DKIM_SELECTORS = [
  'google', 'selector1', 'selector2', 'default', 'k1', 'k2', 's1', 's2', 'dkim', 'mail',
  'smtp', 'zoho', 'zmail', 'mandrill', 'mxvault', 'fm1', 'fm2', 'protonmail', 'pm',
  'everlytic', 'sendgrid', 'smtpapi', 'amazonses', 'hs1', 'hs2',
];
const SPF_LOOKUP_LIMIT = 10;
// Hard caps so a hostile SPF tree can't turn one check into hundreds of DNS queries.
const SPF_MAX_QUERIES = 40;
const SPF_MAX_DEPTH = 10;

// Accepts "https://www.acme.com/path", "jo@acme.com", "ACME.com." and returns "acme.com",
// or null when the input is not a domain.
function normalizeDomain(input) {
  let s = String(input || '').trim().toLowerCase();
  if (!s || /\s/.test(s)) return null;
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
  s = s.split(/[/?#]/)[0];
  if (s.includes('@')) s = s.slice(s.lastIndexOf('@') + 1);
  s = s.replace(/:\d+$/, '').replace(/\.$/, '').replace(/^www\./, '');
  let host;
  try { host = new URL(`http://${s}`).hostname; } catch { return null; } // also converts IDN to punycode
  if (host.length > 253) return null;
  const labels = host.split('.');
  if (labels.length < 2) return null;
  const labelOk = l => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(l);
  if (!labels.every(labelOk)) return null;
  if (!/^(?:[a-z]{2,63}|xn--[a-z0-9-]+)$/.test(labels.at(-1))) return null;
  return host;
}

function parseTags(record) {
  const tags = {};
  for (const part of record.split(';')) {
    const eq = part.indexOf('=');
    if (eq > 0) tags[part.slice(0, eq).trim().toLowerCase()] = part.slice(eq + 1).trim();
  }
  return tags;
}

// ---------- DMARC ----------

async function checkDmarc(domain) {
  const txt = await resolve(`_dmarc.${domain}`, 'TXT');
  const records = txt.filter(r => /^v=DMARC1\s*(;|$)/i.test(r.trim()));
  const base = { record: records.join('\n') || null };

  if (records.length === 0) {
    return { ...base, policy: 'missing', points: 0, status: 'fail',
      summary: 'No DMARC. Anyone can send email pretending to be you, and Gmail may push your mail to spam.',
      fix: `Add a TXT record at _dmarc.${domain} with: v=DMARC1; p=none; rua=mailto:dmarc@${domain} — then move to p=quarantine once reports look clean.` };
  }
  if (records.length > 1) {
    return { ...base, policy: 'invalid', points: 5, status: 'fail',
      summary: 'You have more than one DMARC record, so mail servers ignore all of them.',
      fix: `Delete the extra records at _dmarc.${domain} and keep just one.` };
  }

  const tags = parseTags(records[0]);
  const policy = (tags.p || '').toLowerCase();
  const reporting = Boolean(tags.rua);
  if (!['none', 'quarantine', 'reject'].includes(policy)) {
    return { ...base, policy: 'invalid', reporting, points: 5, status: 'fail',
      summary: 'Your DMARC record has an error (no valid p= policy), so mail servers ignore it.',
      fix: 'Set p= to none, quarantine or reject.' };
  }

  const reportNote = reporting
    ? ' You receive reports showing who sends email as you.'
    : ' You don\'t receive reports, so you can\'t see who sends email as you.';
  const reportFix = reporting ? null : `Add rua=mailto:dmarc@${domain} to start receiving reports.`;

  if (policy === 'reject') {
    return { ...base, policy, reporting, points: 40, status: 'pass',
      summary: 'Mail servers reject email that fakes your domain. This is the strongest setting.' + reportNote,
      fix: reportFix };
  }
  if (policy === 'quarantine') {
    return { ...base, policy, reporting, points: 30, status: 'pass',
      summary: 'Fake email sent as you lands in spam instead of the inbox.' + reportNote,
      fix: reportFix || 'When reports show only your real senders, move to p=reject.' };
  }
  return { ...base, policy, reporting, points: 10, status: 'warn',
    summary: 'DMARC is in watch-only mode (p=none). Fake email sent as you still gets delivered.' + reportNote,
    fix: (reportFix ? reportFix + ' ' : '') + 'Once your real senders pass, change p=none to p=quarantine.' };
}

// ---------- SPF ----------

const isSpf = r => /^v=spf1(\s|$)/i.test(r.trim());

// Counts DNS-querying terms per RFC 7208 4.6.4: include, redirect, a, mx, ptr, exists.
// Nested includes and redirects add their own counts.
async function countSpfLookups(record, seen, depth = 0) {
  let count = 0;
  for (const term of record.trim().split(/\s+/).slice(1)) {
    const m = term.toLowerCase().match(/^[+\-~?]?(include:|redirect=|a\b|mx\b|ptr\b|exists:)(.*)$/);
    if (!m) continue;
    count++;
    const kind = m[1];
    if (kind !== 'include:' && kind !== 'redirect=') continue;
    const target = m[2].replace(/\.$/, '');
    if (!target || target.includes('%') || seen.has(target)) continue; // macros can't be followed
    if (seen.size > SPF_MAX_QUERIES || depth >= SPF_MAX_DEPTH) { seen.truncated = true; continue; }
    seen.add(target);
    const nested = (await resolve(target, 'TXT')).filter(isSpf);
    if (nested.length === 1) count += await countSpfLookups(nested[0], seen, depth + 1);
  }
  return count;
}

async function checkSpf(domain) {
  const records = (await resolve(domain, 'TXT')).filter(isSpf);
  const base = { record: records.join('\n') || null };

  if (records.length === 0) {
    return { ...base, all: null, lookups: 0, points: 0, status: 'fail',
      summary: 'No SPF record. Mail servers can\'t tell which services may send email for you.',
      fix: `Add a TXT record at ${domain} listing your email provider, e.g. v=spf1 include:_spf.google.com -all for Google Workspace.` };
  }
  if (records.length > 1) {
    return { ...base, all: null, lookups: 0, points: 5, status: 'fail',
      summary: 'You have more than one SPF record. That is invalid, so SPF fails for all your email.',
      fix: 'Merge them into a single record that starts with v=spf1.' };
  }

  const record = records[0];
  const seen = new Set([domain]);
  const lookups = await countSpfLookups(record, seen);
  const allTerm = record.toLowerCase().split(/\s+/).find(t => /^[+\-~?]?all$/.test(t));
  const all = allTerm ? (/^[+\-~?]/.test(allTerm) ? allTerm : '+all') : null;
  const out = { ...base, all, lookups, lookupsCapped: Boolean(seen.truncated), limit: SPF_LOOKUP_LIMIT };

  if (lookups > SPF_LOOKUP_LIMIT) {
    return { ...out, points: 10, status: 'fail',
      summary: `Your SPF record needs ${out.lookupsCapped ? "more than" : "up to"} ${lookups} DNS lookups; the limit is ${SPF_LOOKUP_LIMIT}. Senders listed early still pass, but services near the end of your record, and spoofers, get an SPF error.`,
      fix: 'Remove services you no longer use, or replace nested includes with the IP ranges they point to (SPF flattening).' };
  }
  const endings = {
    '-all': [30, 'pass', 'SPF lists your senders and tells mail servers to reject everyone else.', null],
    '~all': [25, 'pass', 'SPF lists your senders and marks everyone else as suspicious.', 'For stricter protection, change ~all to -all once all senders are listed.'],
    '?all': [10, 'fail', 'SPF ends in ?all, which tells mail servers to treat unknown senders as neutral, so it protects nothing.', 'Change ?all to ~all or -all.'],
    '+all': [10, 'fail', 'SPF ends in +all, which allows anyone in the world to send as you.', 'Change +all to -all right away.'],
  };
  if (!all) {
    return { ...out, points: 15, status: 'warn',
      summary: 'SPF lists your senders but doesn\'t say what to do with everyone else.',
      fix: 'Add ~all or -all to the end of the record.' };
  }
  const [points, status, summary, fix] = endings[all];
  return { ...out, points, status, summary, fix };
}

// ---------- DKIM ----------

async function checkDkim(domain) {
  const results = await Promise.allSettled(DKIM_SELECTORS.map(async selector => {
    const txt = await resolve(`${selector}._domainkey.${domain}`, 'TXT');
    const record = txt.find(r => /(^|;)\s*p=/i.test(r));
    if (!record) return null;
    return { selector, live: Boolean(parseTags(record).p), record };
  }));

  const failed = results.filter(r => r.status === 'rejected').length;
  if (failed === results.length) throw new DnsError('All DKIM lookups failed');
  const keys = results.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value);
  const live = keys.filter(k => k.live);
  const revoked = keys.filter(k => !k.live);
  const record = keys.map(k => `${k.selector}._domainkey: ${k.record}`).join('\n') || null;
  const base = { record, selectors: live.map(k => k.selector), checked: DKIM_SELECTORS.length, failedLookups: failed };

  if (live.length) {
    return { ...base, found: true, points: 20, status: 'pass',
      summary: `Your email is signed, so receivers can verify it really came from you (key${live.length > 1 ? 's' : ''}: ${live.map(k => k.selector).join(', ')}).`,
      fix: null };
  }
  // Empty keys under every name means a wildcard "signs nothing" record (example.com).
  // Only some empty means old keys were retired; the current one may use a name we don't try.
  if (revoked.length && revoked.length === DKIM_SELECTORS.length - failed) {
    return { ...base, found: false, points: 0, status: 'fail',
      summary: 'This domain publishes empty DKIM keys, which means it signs no email.',
      fix: 'If you do send email from this domain, turn on DKIM signing in your email provider and publish the key it gives you.' };
  }
  if (revoked.length) {
    return { ...base, found: false, points: 0, status: 'warn',
      summary: `Only retired DKIM keys found (${revoked.map(k => k.selector).join(', ')}). Your current key probably uses a name we don't check, so this isn't proof DKIM is off.`,
      fix: 'Check your email provider\'s DKIM settings to confirm signing is on.' };
  }
  return { ...base, found: false, points: 0, status: 'warn',
    summary: `No DKIM key found under ${DKIM_SELECTORS.length} common names. Your provider may use a custom name, so this isn't proof DKIM is off.`,
    fix: 'Check your email provider\'s DKIM settings; if signing is off, turn it on and publish the key.' };
}

// ---------- MX ----------

async function checkMx(domain) {
  const mx = (await resolve(domain, 'MX')).sort((a, b) => a.priority - b.priority);
  const record = mx.map(m => `${m.priority} ${m.exchange || '.'}`).join('\n') || null;
  const servers = mx.filter(m => m.exchange);

  if (mx.length && !servers.length) {
    return { record, servers: [], points: 0, status: 'warn',
      summary: 'This domain declares that it accepts no email (null MX).', fix: null };
  }
  if (!servers.length) {
    return { record, servers: [], points: 0, status: 'fail',
      summary: 'No mail servers are set up, so this domain can\'t receive email.',
      fix: 'Add the MX records your email provider gives you.' };
  }
  const provider = guessProvider(servers);
  return { record, servers, provider, points: 10, status: 'pass',
    summary: `Your domain receives email${provider ? ` through ${provider}` : ''} (${servers.length} server${servers.length > 1 ? 's' : ''}).`,
    fix: null };
}

function guessProvider(servers) {
  const hosts = servers.map(s => s.exchange).join(' ');
  const known = [
    [/google\.com|googlemail\.com/, 'Google'], [/outlook\.com|microsoft/, 'Microsoft 365'],
    [/zoho\./, 'Zoho'], [/protonmail|proton\.me/, 'Proton'], [/pphosted\.com/, 'Proofpoint'],
    [/mimecast/, 'Mimecast'], [/secureserver\.net/, 'GoDaddy'], [/messagingengine\.com/, 'Fastmail'],
    [/amazonaws\.com|amazonses/, 'Amazon SES'], [/yahoodns\.net/, 'Yahoo'],
  ];
  return (known.find(([re]) => re.test(hosts)) || [])[1] || null;
}

// ---------- Run everything ----------

const VERDICTS = {
  reject: ['pass', 'Protected against spoofing'],
  quarantine: ['pass', 'Protected against spoofing'],
  none: ['warn', 'Not protected yet'],
  missing: ['fail', 'Open to spoofing'],
  invalid: ['fail', 'Open to spoofing'],
};

async function runChecks(domain) {
  const [dmarc, spf, dkim, mx] = await Promise.all([
    checkDmarc(domain), checkSpf(domain), checkDkim(domain), checkMx(domain),
  ]);
  const score = dmarc.points + spf.points + dkim.points + mx.points;
  const [status, headline] = VERDICTS[dmarc.policy];
  return { domain, score, verdict: { status, headline }, checks: { dmarc, spf, dkim, mx }, checkedAt: new Date().toISOString() };
}

module.exports = { runChecks, normalizeDomain, DnsError };
