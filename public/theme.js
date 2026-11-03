// Light by default; the visitor's choice is remembered on this device.
(() => {
  const root = document.documentElement;
  let saved = null;
  try { saved = localStorage.getItem('theme'); } catch {}
  root.dataset.theme = saved === 'dark' ? 'dark' : 'light';

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    const sync = () => {
      const dark = root.dataset.theme === 'dark';
      btn.setAttribute('aria-pressed', String(dark));
      btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      btn.title = btn.getAttribute('aria-label');
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.content = dark ? '#1A1D20' : '#FFFFFF';
    };
    btn.addEventListener('click', () => {
      root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('theme', root.dataset.theme); } catch {}
      sync();
    });
    sync();
  });
})();
