// Runs in <head> before first paint so the page never flashes the wrong theme.
(function () {
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem('pf-theme'); } catch (e) { /* storage blocked */ }
  var pref = saved || root.getAttribute('data-default-theme') || 'dark';
  if (pref === 'system') pref = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  root.setAttribute('data-theme', pref === 'light' ? 'light' : 'dark');
  root.classList.add('js');
})();
