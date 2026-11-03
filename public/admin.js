const $ = id => document.getElementById(id);

// The key arrives once as ?key= (or through the form), then lives only in this tab's session
// and travels as a header, so it stays out of server logs and browser history.
const KEY_SLOT = 'unspoof-admin-key';
let key = '';
try { key = sessionStorage.getItem(KEY_SLOT) || ''; } catch {}
const fromUrl = new URLSearchParams(location.search).get('key');
if (fromUrl) {
  key = fromUrl;
  try { sessionStorage.setItem(KEY_SLOT, key); } catch {}
  history.replaceState(null, '', location.pathname);
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => Number(n || 0).toLocaleString();
const shortDay = d => new Date(`${d}T00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const VERDICT = { reject: 'pass', quarantine: 'pass', none: 'warn', missing: 'fail', invalid: 'fail' };
const VERDICT_LABEL = { pass: 'Protected', warn: 'Not protected yet', fail: 'Open to spoofing', error: 'Lookup failed' };
const ICON = {
  pass: '<path d="m4.5 8.2 2.3 2.3 4.7-5" />',
  warn: '<path d="M8 4.2v4.6M8 11.4v.1" />',
  fail: '<path d="m5.2 5.2 5.6 5.6M10.8 5.2l-5.6 5.6" />',
  error: '<path d="M8 4.2v4.6M8 11.4v.1" />',
};
const statusIcon = s => `<svg class="sicon ${s}" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7.5"/>${ICON[s]}</svg>`;
const scoreStatus = c => (c.dmarc ? VERDICT[c.dmarc] : 'error');

function ago(ts) {
  const s = Math.max(0, (Date.now() - new Date(ts)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function device(ua) {
  if (!ua) return '–';
  if (/curl|wget|python|node|go-http|bot|spider|crawl/i.test(ua)) return ua.split(/[/ ]/)[0] + ' (script)';
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS'
    : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
  return os ? `${browser} · ${os}` : browser;
}

function source(ref) {
  if (!ref) return 'direct';
  try { return new URL(ref).hostname.replace(/^www\./, ''); } catch { return 'other'; }
}

// ---------- Chart ----------

function niceMax(n) {
  if (n <= 4) return 4;
  const step = 10 ** Math.floor(Math.log10(n));
  return Math.ceil(n / step) * step;
}

function renderChart(perDay) {
  const max = niceMax(Math.max(...perDay.map(d => d.checks)));
  $('chart-y').innerHTML = [max, max / 2, 0].map(v => `<span>${fmt(Math.round(v))}</span>`).join('');
  $('chart').replaceChildren(...perDay.map((d, i) => {
    const bar = document.createElement('div');
    bar.className = 'bar' + (i === perDay.length - 1 ? ' today' : '');
    bar.tabIndex = 0;
    bar.dataset.tip = `${shortDay(d.day)}: ${fmt(d.checks)} check${d.checks === 1 ? '' : 's'}`;
    const fill = document.createElement('span');
    fill.style.height = d.checks ? `max(3px, ${(d.checks / max) * 100}%)` : '0';
    bar.append(fill);
    return bar;
  }));
  $('chart-x').innerHTML = perDay.map((d, i) =>
    `<span>${i === perDay.length - 1 ? 'Today' : i % 7 === 1 ? shortDay(d.day) : ''}</span>`).join('');
}

function showTip(e) {
  const bar = e.target.closest('.bar');
  const tip = $('chart-tip');
  if (!bar) { tip.hidden = true; return; }
  tip.textContent = bar.dataset.tip;
  tip.hidden = false;
  const wrap = $('chart').getBoundingClientRect();
  const r = bar.getBoundingClientRect();
  const x = Math.min(Math.max(r.left + r.width / 2 - wrap.left, 60), wrap.width - 60);
  tip.style.left = `${x + $('chart').offsetLeft}px`;
}
$('chart').addEventListener('pointerover', showTip);
$('chart').addEventListener('focusin', showTip);
$('chart').addEventListener('pointerleave', () => { $('chart-tip').hidden = true; });
$('chart').addEventListener('focusout', () => { $('chart-tip').hidden = true; });

// ---------- Panels ----------

function renderMix(verdicts) {
  const order = ['pass', 'warn', 'fail', 'error'];
  const total = order.reduce((n, k) => n + (verdicts[k] || 0), 0);
  $('mix-bar').innerHTML = total
    ? order.filter(k => verdicts[k]).map(k => `<span class="${k}" title="${VERDICT_LABEL[k]}: ${fmt(verdicts[k])}"></span>`).join('')
    : '<span class="none"></span>';
  // Inline flex values are set through the DOM so the strict CSP (no inline styles) still holds.
  $('mix-bar').querySelectorAll('span').forEach(el => {
    const k = el.className; if (verdicts[k]) el.style.flex = String(verdicts[k]);
  });
  $('mix-legend').innerHTML = order.map(k => {
    const n = verdicts[k] || 0;
    if (!n && k === 'error') return '';
    return `<li>${statusIcon(k)}<span class="name">${VERDICT_LABEL[k]}</span><span class="count">${fmt(n)}</span><span class="pct">${total ? Math.round((n / total) * 100) : 0}%</span></li>`;
  }).join('');
}

function scorePill(score, status) {
  return score == null ? '<span class="score error">–</span>' : `<span class="score ${status}">${score}</span>`;
}

function renderTop(top) {
  if (!top.length) {
    $('top-rows').innerHTML = '<tr><td colspan="4" class="empty">No checks yet.</td></tr>';
    return;
  }
  $('top-rows').innerHTML = top.map((t, i) => `
    <tr>
      <td class="rank">${i + 1}</td>
      <td><a class="dom" href="/?d=${encodeURIComponent(t.domain)}" target="_blank" rel="noopener">${esc(t.domain)}</a></td>
      <td class="num">${fmt(t.checks)}</td>
      <td class="num">${scorePill(t.lastScore, t.lastStatus || 'error')}</td>
    </tr>`).join('');
}

function renderSources(sources) {
  const max = Math.max(1, ...sources.map(s => s.checks));
  $('sources').innerHTML = sources.length ? sources.map(s => `
    <li>
      <span class="name">${esc(s.source === 'mail.google.com' ? 'Gmail' : s.source)}</span>
      <span class="count">${fmt(s.checks)}</span>
      <span class="meter"><i data-w="${(s.checks / max) * 100}"></i></span>
    </li>`).join('') : '<li class="empty">No checks yet.</li>';
  $('sources').querySelectorAll('i[data-w]').forEach(i => { i.style.width = `${i.dataset.w}%`; });
}

let latest = [];
const isScript = ua => !ua || /\(script\)$/.test(device(ua));
const sourceName = ref => (source(ref) === 'mail.google.com' ? 'Gmail' : source(ref));

// Keep the source menu in step with the data without losing the current choice.
function syncSourceOptions() {
  const select = $('f-source');
  const chosen = select.value;
  const names = [...new Set(latest.map(c => sourceName(c.referrer)))].sort();
  const have = [...select.options].slice(1).map(o => o.value);
  if (names.join('|') === have.join('|')) return;
  select.replaceChildren(new Option('All sources', ''), ...names.map(n => new Option(n, n)));
  select.value = names.includes(chosen) ? chosen : '';
}

function renderRows() {
  const q = $('filter').value.trim().toLowerCase();
  const verdict = $('f-verdict').value, src = $('f-source').value, dev = $('f-device').value;
  const maxAge = Number($('f-time').value) * 1000;
  const rows = latest.filter(c =>
    (!q || c.domain.includes(q)) &&
    (!verdict || scoreStatus(c) === verdict) &&
    (!src || sourceName(c.referrer) === src) &&
    (!dev || (dev === 'script') === isScript(c.ua)) &&
    (!maxAge || Date.now() - new Date(c.ts) <= maxAge));
  const filtered = Boolean(q || verdict || src || dev || maxAge);
  $('f-clear').hidden = !filtered;
  $('latest-count').textContent = filtered ? `${rows.length} of ${latest.length}` : `newest first · ${latest.length}`;
  if (!rows.length) {
    $('rows').innerHTML = `<tr><td colspan="7" class="empty">${latest.length ? 'Nothing matches that filter.' : 'No checks yet.'}</td></tr>`;
    return;
  }
  $('rows').innerHTML = rows.map(c => {
    const st = scoreStatus(c);
    return `
    <tr>
      <td class="when" title="${esc(new Date(c.ts).toLocaleString())}">${ago(c.ts)}</td>
      <td><a class="dom" href="/?d=${encodeURIComponent(c.domain)}" target="_blank" rel="noopener">${esc(c.domain)}</a></td>
      <td class="num">${scorePill(c.score, st)}</td>
      <td class="vcell">${statusIcon(st)}${VERDICT_LABEL[st]}</td>
      <td>${esc(sourceName(c.referrer))}</td>
      <td class="muted" title="${esc(c.ua)}">${esc(device(c.ua))}</td>
      <td class="mono">${esc(c.visitor)}</td>
    </tr>`;
  }).join('');
}
$('filter').addEventListener('input', renderRows);
for (const id of ['f-verdict', 'f-source', 'f-device', 'f-time']) $(id).addEventListener('change', renderRows);
$('f-clear').addEventListener('click', () => {
  $('filter').value = '';
  for (const id of ['f-verdict', 'f-source', 'f-device', 'f-time']) $(id).value = '';
  renderRows();
});

// ---------- Load ----------

async function load() {
  try {
    const res = await fetch('/api/stats', { cache: 'no-store', headers: { 'x-admin-key': key } });
    if (res.status === 401) {
      $('login').hidden = false;
      throw new Error(key ? 'That admin key is wrong.' : 'Enter the admin key to see stats.');
    }
    if (!res.ok) throw new Error(`Stats failed (HTTP ${res.status}).`);
    $('login').hidden = true;
    const s = await res.json();
    for (const k of ['checksToday', 'visitorsToday', 'totalChecks', 'uniqueVisitors', 'uniqueDomains']) $(`t-${k}`).textContent = fmt(s[k]);
    const yesterday = s.perDay.at(-2)?.checks || 0;
    $('s-checksToday').textContent = `${fmt(yesterday)} yesterday`;
    renderChart(s.perDay);
    renderMix(s.verdicts || {});
    renderTop(s.topDomains || []);
    renderSources(s.sources || []);
    latest = s.latest;
    syncSourceOptions();
    renderRows();
    $('error').hidden = true;
    $('updated').classList.add('on');
    $('updated').lastChild.textContent = `Live · updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  } catch (err) {
    $('updated').classList.remove('on');
    $('updated').lastChild.textContent = 'Not connected';
    $('error').textContent = err.message;
    $('error').hidden = false;
  }
}

$('login').addEventListener('submit', e => {
  e.preventDefault();
  key = $('admin-key').value.trim();
  try { sessionStorage.setItem(KEY_SLOT, key); } catch {}
  load();
});

load();
setInterval(load, 10000);
