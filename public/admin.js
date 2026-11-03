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
const POLICY_STATUS = { reject: 'pass', quarantine: 'pass', none: 'warn', missing: 'fail', invalid: 'fail' };
const shortDay = d => new Date(`${d}T00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

function renderChart(perDay) {
  const max = Math.max(1, ...perDay.map(d => d.checks));
  const chart = $('chart');
  chart.replaceChildren(...perDay.map(d => {
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.title = `${shortDay(d.day)}: ${d.checks} check${d.checks === 1 ? '' : 's'}`;
    const fill = document.createElement('span');
    fill.style.height = `${(d.checks / max) * 100}%`;
    bar.append(fill);
    return bar;
  }));
  $('axis-start').textContent = shortDay(perDay[0].day);
  $('axis-max').textContent = `max ${max}/day`;
  $('axis-end').textContent = 'Today';
}

function renderRows(latest) {
  if (!latest.length) {
    $('rows').innerHTML = '<tr><td colspan="7">No checks yet.</td></tr>';
    return;
  }
  $('rows').innerHTML = latest.map(c => `
    <tr>
      <td>${esc(new Date(c.ts).toLocaleString())}</td>
      <td class="mono">${esc(c.domain)}</td>
      <td class="num">${c.score ?? '<span class="pill fail">error</span>'}</td>
      <td>${c.dmarc ? `<span class="pill ${POLICY_STATUS[c.dmarc]}">${esc(c.dmarc)}</span>` : '–'}</td>
      <td class="mono">${esc(c.visitor)}</td>
      <td class="trunc" title="${esc(c.referrer)}">${esc(c.referrer || '–')}</td>
      <td class="trunc" title="${esc(c.ua)}">${esc(c.ua || '–')}</td>
    </tr>`).join('');
}

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
    for (const k of ['checksToday', 'visitorsToday', 'totalChecks', 'uniqueVisitors', 'uniqueDomains']) {
      $(`t-${k}`).textContent = s[k].toLocaleString();
    }
    renderChart(s.perDay);
    renderRows(s.latest);
    $('error').hidden = true;
    $('updated').textContent = `Updated ${new Date().toLocaleTimeString()} · refreshes every 10s`;
  } catch (err) {
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
