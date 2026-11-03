# Unspoof: email domain security checker

Free check: can someone send email pretending to be your domain? Reads public DNS only (DMARC, SPF, DKIM, MX). No npm dependencies.

```bash
npm start            # http://localhost:3100  (node --use-system-ca server.js, Node >= 22.15)
```

- `/?d=acme.com` auto-runs a check (for cold-email links).
- `/api/check?domain=acme.com` returns JSON. 400 for invalid input, 429 when rate limited, 502 when DNS can't be reached (never a fake 0 score).
- `/admin` usage monitor. Open `/admin?key=…` once; the key moves to the tab's session and is sent as an `x-admin-key` header.

## Deploy (Vercel + Upstash)

`api/check.js` and `api/stats.js` run the same handlers as `server.js`; `public/` is served as static files (`vercel.json`).
Add the Upstash Redis integration to the Vercel project (it sets `KV_REST_API_URL` / `KV_REST_API_TOKEN`), plus `ADMIN_KEY` and `VISITOR_SALT`.

## Environment

| Var | Purpose |
| --- | --- |
| `ADMIN_KEY` | Protects `/api/stats`. Unset: open locally, closed in production |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` (or `KV_REST_API_URL` / `_TOKEN`) | Shared store for rate limits, 5-minute result cache and usage stats. Unset: memory + `data/checks.jsonl` |
| `VISITOR_SALT` | Salt for visitor hashes (required for stable IDs in production) |
| `STATS_TZ` | Time zone for "today" in stats (default `Asia/Kolkata`) |
| `TRUST_PROXY` | `1` to trust `x-forwarded-for` behind your own proxy (automatic on Vercel) |
| `PORT` | Local port, default 3100 |
| `DOH_PROVIDERS`, `SYSTEM_DNS` | Override DNS resolvers (testing) |

## Abuse limits

- 20 checks per minute per IP, 600 uncached checks per minute overall.
- Results cached per domain for 5 minutes.
- SPF include walking capped at 40 queries and depth 10.

## Layout

- `lib/dns.js`: DoH resolver with provider fallback, system DNS last
- `lib/checks.js`: checks, scoring, verdict, input normalisation
- `lib/store.js`: rate limits, cache and usage log (Upstash or local fallback)
- `lib/handlers.js`: HTTP handlers shared by `server.js` and `api/`
- `public/`: checker and admin pages
