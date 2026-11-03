// DNS lookups over DNS-over-HTTPS (JSON API), with system DNS as the last resort.
// Plain DNS can stall on large TXT answers (TCP fallback) and Node then reports
// ENOTFOUND/ENODATA, which looks like "record missing". DoH avoids that.

const { Resolver } = require('node:dns').promises;

const TYPES = { TXT: 16, MX: 15 };
const TIMEOUT_MS = 5000;

const PROVIDERS = (process.env.DOH_PROVIDERS ||
  'https://cloudflare-dns.com/dns-query,https://1.1.1.1/dns-query,https://dns.google/resolve')
  .split(',').map(s => s.trim()).filter(Boolean);

let preferred = 0; // index of the provider that last worked

class DnsError extends Error {}

// Returns an array of records: strings for TXT, { priority, exchange } for MX.
// An empty array means the name or record does not exist.
// Throws DnsError when no resolver could answer.
async function resolve(name, type) {
  const order = PROVIDERS.map((_, i) => (preferred + i) % PROVIDERS.length);
  for (const i of order) {
    try {
      const records = await queryDoh(PROVIDERS[i], name, type);
      preferred = i;
      return records;
    } catch { /* try the next provider */ }
  }
  try {
    return await querySystem(name, type);
  } catch {
    throw new DnsError(`Could not resolve ${type} ${name}`);
  }
}

async function queryDoh(base, name, type) {
  const url = `${base}?name=${encodeURIComponent(name)}&type=${type}`;
  const res = await fetch(url, {
    headers: { accept: 'application/dns-json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  // Corporate proxies may answer with an HTML block page; that is a failure.
  const body = JSON.parse(await res.text());
  if (body.Status === 3) return [];
  if (body.Status !== 0) throw new Error(`DoH status ${body.Status}`);
  const answers = (body.Answer || []).filter(a => a.type === TYPES[type]);
  return answers.map(a => (type === 'TXT' ? joinTxt(a.data) : parseMx(a.data)));
}

// DoH returns TXT data as quoted chunks: "v=spf1 " "include:...". Join them.
function joinTxt(data) {
  const chunks = data.match(/"((?:[^"\\]|\\.)*)"/g);
  if (!chunks) return data;
  return chunks.map(c => c.slice(1, -1).replace(/\\(.)/g, '$1')).join('');
}

function parseMx(data) {
  const [priority, exchange = ''] = data.trim().split(/\s+/);
  return { priority: Number(priority), exchange: exchange.replace(/\.$/, '').toLowerCase() };
}

async function querySystem(name, type) {
  const resolver = new Resolver({ timeout: TIMEOUT_MS, tries: 2 });
  if (process.env.SYSTEM_DNS) resolver.setServers(process.env.SYSTEM_DNS.split(','));
  try {
    if (type === 'TXT') return (await resolver.resolveTxt(name)).map(chunks => chunks.join(''));
    return (await resolver.resolveMx(name)).map(r => ({ priority: r.priority, exchange: r.exchange.toLowerCase() }));
  } catch (err) {
    if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') return [];
    throw err;
  }
}

module.exports = { resolve, DnsError };
