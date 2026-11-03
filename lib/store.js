// Shared state: rate limits, result cache and the private usage log.
// Uses Upstash Redis (REST, no SDK) when its env vars are set; otherwise falls back to
// process memory plus an append-only JSONL file, which is fine on localhost only.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '';
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';
const useRedis = Boolean(REDIS_URL && REDIS_TOKEN);
const ON_VERCEL = Boolean(process.env.VERCEL);
const TZ = process.env.STATS_TZ || 'Asia/Kolkata';
const DAY_TTL = 40 * 86400;

// ---------- Redis over REST ----------

async function redis(commands) {
  const res = await fetch(`${REDIS_URL}/pipeline`, {
    method: 'POST',
    headers: { authorization: `Bearer ${REDIS_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify(commands),
    signal: AbortSignal.timeout(3000),
  });
  if (!res.ok) throw new Error(`Upstash HTTP ${res.status}`);
  return (await res.json()).map(r => {
    if (r.error) throw new Error(`Upstash: ${r.error}`);
    return r.result;
  });
}

// ---------- Local fallback ----------

const DATA_DIR = path.join(__dirname, '..', 'data');
const LOG_FILE = path.join(DATA_DIR, 'checks.jsonl');
const memory = { counters: new Map(), cache: new Map(), log: [] };
const canWriteFiles = !useRedis && !ON_VERCEL;
if (canWriteFiles) fs.mkdirSync(DATA_DIR, { recursive: true });

// A stable secret salt keeps visitor IDs consistent without letting anyone reverse them to an IP.
const salt = process.env.VISITOR_SALT || (() => {
  if (!canWriteFiles) return crypto.randomBytes(16).toString('hex'); // set VISITOR_SALT in production
  const file = path.join(DATA_DIR, '.salt');
  try { fs.writeFileSync(file, crypto.randomBytes(16).toString('hex'), { flag: 'wx' }); } catch {}
  return fs.readFileSync(file, 'utf8');
})();

// ---------- Visitors ----------

// Behind Vercel the platform overwrites x-real-ip / x-forwarded-for, so they can be trusted.
// Anywhere else a client could forge them, so use the socket address unless TRUST_PROXY=1.
function clientIp(req) {
  if (ON_VERCEL || process.env.TRUST_PROXY === '1') {
    const fwd = req.headers['x-real-ip'] || String(req.headers['x-forwarded-for'] || '').split(',')[0];
    if (fwd) return fwd.trim();
  }
  return req.socket?.remoteAddress || '';
}

const hash = s => crypto.createHash('sha256').update(`${salt}|${s}`).digest('hex').slice(0, 12);

// Short hash of IP + user agent for the usage log. The raw IP is never stored.
const visitorId = req => hash(`${clientIp(req)}|${req.headers['user-agent'] || ''}`);

// ---------- Rate limits ----------

// Fixed-window counter. Returns true when the call is over the limit.
async function overLimit(key, limit, windowSec) {
  const bucket = `rl:${key}:${Math.floor(Date.now() / 1000 / windowSec)}`;
  if (useRedis) {
    const [count] = await redis([['INCR', bucket], ['EXPIRE', bucket, windowSec * 2]]);
    return count > limit;
  }
  const count = (memory.counters.get(bucket) || 0) + 1;
  memory.counters.set(bucket, count);
  if (memory.counters.size > 50000) memory.counters.clear();
  return count > limit;
}

// Per visitor (IP only, since the user agent is trivially changed) and a global ceiling.
async function rateLimited(req) {
  try {
    if (await overLimit(`ip:${hash(clientIp(req))}`, 20, 60)) return 'visitor';
    return null;
  } catch (err) {
    console.error('rate limit store failed:', err.message);
    return null; // fail open: a broken store shouldn't take the checker down
  }
}

async function globalLimited() {
  try { return await overLimit('global', 600, 60); } catch { return false; }
}

// ---------- Result cache ----------

const CACHE_TTL = 300;

async function cacheGet(domain) {
  try {
    if (useRedis) {
      const [hit] = await redis([['GET', `cache:${domain}`]]);
      return hit ? JSON.parse(hit) : null;
    }
    const hit = memory.cache.get(domain);
    return hit && hit.until > Date.now() ? hit.value : null;
  } catch { return null; }
}

async function cacheSet(domain, value) {
  try {
    if (useRedis) return void await redis([['SET', `cache:${domain}`, JSON.stringify(value), 'EX', CACHE_TTL]]);
    memory.cache.set(domain, { value, until: Date.now() + CACHE_TTL * 1000 });
    if (memory.cache.size > 5000) memory.cache.clear();
  } catch {}
}

// ---------- Usage log ----------

const dayOf = d => new Date(d).toLocaleDateString('en-CA', { timeZone: TZ });

async function logCheck(req, domain, result, error) {
  const entry = {
    ts: new Date().toISOString(),
    domain,
    score: result ? result.score : null,
    dmarc: result ? result.checks.dmarc.policy : null,
    error: error || undefined,
    visitor: visitorId(req),
    referrer: String(req.headers.referer || '').slice(0, 200) || null,
    ua: String(req.headers['user-agent'] || '').slice(0, 120) || null,
  };
  const day = dayOf(entry.ts);
  try {
    if (useRedis) {
      await redis([
        ['INCR', 'stats:total'],
        ['INCR', `stats:day:${day}`], ['EXPIRE', `stats:day:${day}`, DAY_TTL],
        ['PFADD', 'stats:visitors', entry.visitor],
        ['PFADD', `stats:visitors:${day}`, entry.visitor], ['EXPIRE', `stats:visitors:${day}`, DAY_TTL],
        ['PFADD', 'stats:domains', domain],
        ['LPUSH', 'stats:latest', JSON.stringify(entry)], ['LTRIM', 'stats:latest', 0, 99],
      ]);
    } else if (canWriteFiles) {
      fs.appendFile(LOG_FILE, JSON.stringify(entry) + '\n', err => err && console.error('log write failed:', err.message));
    } else {
      memory.log.push(entry);
      if (memory.log.length > 1000) memory.log.shift();
    }
  } catch (err) {
    console.error('usage log failed:', err.message);
  }
}

function last30Days() {
  const days = [];
  for (let i = 29; i >= 0; i--) days.push(dayOf(Date.now() - i * 86400000));
  return days;
}

async function stats() {
  const days = last30Days();
  const today = days.at(-1);

  if (useRedis) {
    const [total, visitors, domains, visitorsToday, perDay, latest] = await redis([
      ['GET', 'stats:total'], ['PFCOUNT', 'stats:visitors'], ['PFCOUNT', 'stats:domains'],
      ['PFCOUNT', `stats:visitors:${today}`],
      ['MGET', ...days.map(d => `stats:day:${d}`)],
      ['LRANGE', 'stats:latest', 0, 99],
    ]);
    const counts = perDay.map(n => Number(n) || 0);
    return {
      checksToday: counts.at(-1), visitorsToday, totalChecks: Number(total) || 0,
      uniqueVisitors: visitors, uniqueDomains: domains,
      perDay: days.map((day, i) => ({ day, checks: counts[i] })),
      latest: latest.map(s => JSON.parse(s)),
    };
  }

  let checks = memory.log;
  if (canWriteFiles) {
    try {
      checks = fs.readFileSync(LOG_FILE, 'utf8').split('\n').filter(Boolean)
        .flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
    } catch { checks = []; }
  }
  const todays = checks.filter(c => dayOf(c.ts) === today);
  const perDay = days.map(day => ({ day, checks: 0 }));
  const index = Object.fromEntries(days.map((d, i) => [d, i]));
  for (const c of checks) if (index[dayOf(c.ts)] !== undefined) perDay[index[dayOf(c.ts)]].checks++;
  return {
    checksToday: todays.length,
    visitorsToday: new Set(todays.map(c => c.visitor)).size,
    totalChecks: checks.length,
    uniqueVisitors: new Set(checks.map(c => c.visitor)).size,
    uniqueDomains: new Set(checks.map(c => c.domain)).size,
    perDay,
    latest: checks.slice(-100).reverse(),
  };
}

module.exports = { useRedis, rateLimited, globalLimited, cacheGet, cacheSet, logCheck, stats };
