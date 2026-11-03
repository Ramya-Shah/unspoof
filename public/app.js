const $ = id => document.getElementById(id);
const BADGE = { pass: 'Good', warn: 'Check', fail: 'Fix needed' };
const ICON = {
  pass: '<path d="m4.5 8.2 2.3 2.3 4.7-5" />',
  warn: '<path d="M8 4.2v4.6M8 11.4v.1" />',
  fail: '<path d="m5.2 5.2 5.6 5.6M10.8 5.2l-5.6 5.6" />',
};
const NAMES = {
  dmarc: ['DMARC', 'spoofing policy'], spf: ['SPF', 'allowed senders'],
  dkim: ['DKIM', 'email signing'], mx: ['Mail servers', 'MX'],
};
const MEANING = {
  reject: 'Email that fakes your name gets rejected.',
  quarantine: 'Email that fakes your name lands in spam.',
  none: 'Email that fakes your name still gets delivered.',
  missing: 'Anyone can send email as you.',
  invalid: 'Your DMARC record is broken, so anyone can send email as you.',
};
const RANK = { fail: 0, warn: 1, pass: 2 };

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const badge = status => `<span class="badge ${status}"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7.5"/>${ICON[status]}</svg>${BADGE[status]}</span>`;

function facts(name, c) {
  if (name === 'dmarc' && c.policy !== 'missing') return [`p=${c.policy}`, c.reporting ? 'reports on' : 'no reports'];
  if (name === 'spf' && c.record) return [c.all || 'no all', ...(c.limit ? [`${c.lookups}${c.lookupsCapped ? "+" : ""} of ${c.limit} lookups`] : [])];
  if (name === 'dkim') return c.selectors.length ? c.selectors : [`${c.checked} names checked`];
  if (name === 'mx') return c.servers.slice(0, 3).map(s => s.exchange).concat(c.servers.length > 3 ? [`+${c.servers.length - 3} more`] : []);
  return [];
}

function row(name, c) {
  const [title, sub] = NAMES[name];
  return `
    <li class="check-row" id="check-${name}">
      <div class="check-head">
        <h3>${title} <span>${sub}</span></h3>
        ${badge(c.status)}
      </div>
      <p class="summary">${esc(c.summary)}</p>
      ${c.fix ? `<p class="fix"><strong>Fix:</strong> ${esc(c.fix)}</p>` : ''}
      <div class="facts">${facts(name, c).map(f => `<span class="fact">${esc(f)}</span>`).join('')}</div>
      <details><summary>Show record</summary><pre>${esc(c.record || 'No record found.')}</pre></details>
    </li>`;
}

function setCard(state, { score = '–', headline, meaning, domain, date, status } = {}) {
  const card = $('card');
  card.dataset.state = state;
  card.dataset.status = status || '';
  card.dataset.digits = String(score).length;
  $('score-num').textContent = score;
  $('headline').textContent = headline;
  $('meaning').textContent = meaning;
  if (domain) $('card-domain').textContent = domain;
  $('card-date').textContent = date || 'Public DNS';
  for (const li of $('scale').children) {
    const min = Number(li.dataset.min);
    const next = li.nextElementSibling ? Number(li.nextElementSibling.dataset.min) : 101;
    li.classList.toggle('on', typeof score === 'number' && score >= min && score < next);
  }
}

function render(r) {
  const order = Object.keys(NAMES).sort((a, b) => RANK[r.checks[a].status] - RANK[r.checks[b].status]);
  const toFix = order.filter(n => r.checks[n].status !== 'pass');
  const date = new Date(r.checkedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  setCard('done', {
    score: r.score, status: r.verdict.status, headline: r.verdict.headline, domain: r.domain,
    meaning: MEANING[r.checks.dmarc.policy] + (toFix.length ? ` ${toFix.length} thing${toFix.length > 1 ? 's' : ''} to fix.` : ' Nothing to fix.'),
    date: `Inspected ${date}`,
  });
  const first = $('first-fix');
  first.hidden = !toFix.length;
  if (toFix.length) {
    first.href = `#check-${toFix[0]}`;
    first.textContent = `Fix first: ${NAMES[toFix[0]][0]}`;
  }

  $('checks').innerHTML = order.map(n => row(n, r.checks[n])).join('');
  $('results').hidden = false;

  // Stamp the card once per result.
  const card = $('card');
  card.classList.remove('stamp');
  void card.offsetWidth;
  card.classList.add('stamp');
}

async function check(input) {
  $('error').hidden = true;
  $('results').hidden = true;
  $('first-fix').hidden = true;
  $('submit').disabled = true;
  $('submit').textContent = 'Checking…';
  setCard('loading', { headline: 'Inspecting…', meaning: 'Reading DMARC, SPF, DKIM and mail server records.', domain: 'Checking…' });
  try {
    const res = await fetch(`/api/check?domain=${encodeURIComponent(input)}`);
    const body = await res.json().catch(() => ({ error: 'Something went wrong. Try again.' }));
    if (!res.ok) throw Object.assign(new Error(body.error || 'Something went wrong. Try again.'), { status: res.status });
    render(body);
    $('domain').value = body.domain;
    history.replaceState(null, '', `/?d=${encodeURIComponent(body.domain)}`);
    document.title = `${body.domain}: ${body.verdict.headline} · Unspoof`;
  } catch (err) {
    $('error').textContent = err.message === 'Failed to fetch' ? 'Could not reach the server. Check your connection and try again.' : err.message;
    $('error').hidden = false;
    if (err.status >= 400 && err.status < 500) {
      // Bad input: nothing was inspected, so the card goes back to its empty state.
      setCard('empty', { headline: 'Not inspected yet', meaning: 'Enter a domain to see whether it can be spoofed.', domain: 'yourcompany.com' });
    } else {
      setCard('error', { headline: 'Not inspected', meaning: 'No score: we couldn’t finish reading this domain’s records.', domain: input });
    }
  } finally {
    $('submit').disabled = false;
    $('submit').textContent = 'Check domain';
  }
}

$('form').addEventListener('submit', e => {
  e.preventDefault();
  const value = $('domain').value.trim();
  if (value) check(value);
});

const preset = new URLSearchParams(location.search).get('d');
if (preset) {
  $('domain').value = preset;
  check(preset);
}
