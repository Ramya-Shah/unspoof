// Request handlers shared by the local server (server.js) and the Vercel functions (api/).

const crypto = require('node:crypto');
const { runChecks, normalizeDomain, DnsError } = require('./checks');
const store = require('./store');

const ADMIN_KEY = process.env.ADMIN_KEY || '';
const PRODUCTION = Boolean(process.env.VERCEL) || process.env.NODE_ENV === 'production';

const SECURITY_HEADERS = {
  'content-security-policy': "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'DENY',
};

function send(res, status, body, type = 'application/json; charset=utf-8', extra = {}) {
  const data = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, { 'content-type': type, ...SECURITY_HEADERS, ...extra });
  res.end(data);
}

// The key travels in a header, never the URL, so it stays out of logs and history.
// Without ADMIN_KEY the monitor is open on localhost but closed in production.
function adminAllowed(req) {
  if (!ADMIN_KEY) return !PRODUCTION;
  const given = Buffer.from(String(req.headers['x-admin-key'] || ''));
  const want = Buffer.from(ADMIN_KEY);
  return given.length === want.length && crypto.timingSafeEqual(given, want);
}

async function handleCheck(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const raw = url.searchParams.get('domain');
  const domain = normalizeDomain(raw);
  if (!domain) {
    return send(res, 400, { error: `"${String(raw || '').slice(0, 100)}" doesn't look like a domain. Try something like acme.com.` });
  }
  if (await store.rateLimited(req)) {
    return send(res, 429, { error: 'Too many checks from your network. Wait a minute and try again.' }, undefined, { 'retry-after': '60' });
  }

  // Repeat checks within 5 minutes reuse the stored result instead of querying DNS again.
  const cached = await store.cacheGet(domain);
  if (cached) {
    await store.logCheck(req, domain, cached);
    return send(res, 200, cached, undefined, { 'cache-control': 'no-store' });
  }
  if (await store.globalLimited()) {
    return send(res, 503, { error: 'The checker is busy right now. Try again in a minute.' }, undefined, { 'retry-after': '60' });
  }

  try {
    const result = await runChecks(domain);
    await Promise.all([store.cacheSet(domain, result), store.logCheck(req, domain, result)]);
    send(res, 200, result, undefined, { 'cache-control': 'no-store' });
  } catch (err) {
    // Never turn failed lookups into a "0/100, everything missing" score.
    await store.logCheck(req, domain, null, err instanceof DnsError ? 'dns' : 'internal');
    if (!(err instanceof DnsError)) console.error(err);
    send(res, 502, { error: 'Could not reach DNS to check this domain. Please try again in a moment.' });
  }
}

async function handleStats(req, res) {
  if (!adminAllowed(req)) return send(res, 401, { error: 'Unauthorized' });
  try {
    send(res, 200, await store.stats(), undefined, { 'cache-control': 'no-store' });
  } catch (err) {
    console.error(err);
    send(res, 502, { error: 'Could not load stats.' });
  }
}

module.exports = { handleCheck, handleStats, send, SECURITY_HEADERS, ADMIN_KEY, PRODUCTION };
