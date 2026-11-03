// Unspoof local server: plain Node, no dependencies. On Vercel the same handlers run as api/ functions.
//   GET /                 checker page (/?d=acme.com auto-runs)
//   GET /api/check        ?domain=acme.com -> JSON
//   GET /admin            usage monitor (page asks for ADMIN_KEY)
//   GET /api/stats        monitor data (x-admin-key header)

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { handleCheck, handleStats, send, ADMIN_KEY } = require('./lib/handlers');
const { useRedis } = require('./lib/store');

const PORT = Number(process.env.PORT) || 3100;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const STATIC = { '/': 'index.html', '/admin': 'admin.html', '/style.css': 'style.css', '/app.js': 'app.js', '/admin.js': 'admin.js', '/theme.js': 'theme.js', '/favicon.svg': 'favicon.svg', '/fonts/public-sans-latin.woff2': 'fonts/public-sans-latin.woff2' };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Method not allowed' });

  if (url.pathname === '/api/check') return handleCheck(req, res);
  if (url.pathname === '/api/stats') return handleStats(req, res);

  const file = STATIC[url.pathname];
  if (!file) return send(res, 404, 'Not found', 'text/plain; charset=utf-8');
  fs.readFile(path.join(PUBLIC_DIR, file), (err, data) => {
    if (err) return send(res, 500, 'Server error', 'text/plain; charset=utf-8');
    const extra = file === 'admin.html' ? { 'x-robots-tag': 'noindex', 'cache-control': 'no-store' } : {};
    send(res, 200, data, MIME[path.extname(file)], extra);
  });
});

server.listen(PORT, () => {
  console.log(`Unspoof on http://localhost:${PORT} (store: ${useRedis ? 'Upstash Redis' : 'memory + data/checks.jsonl'})`);
  if (!ADMIN_KEY) console.log('ADMIN_KEY is not set: /admin is open locally and closed in production.');
});
