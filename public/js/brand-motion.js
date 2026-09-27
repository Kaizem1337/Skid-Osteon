(() => {
  const mark = document.querySelector('.brand-mark');
  if (!mark) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reducedMotion.matches || navigator.connection?.saveData) return;

  try {
    if (sessionStorage.getItem('osteon-brand-motion-seen') === '1') return;
  } catch { /* Storage may be unavailable. */ }

  const reveal = () => {
    if (reducedMotion.matches) return;
    mark.classList.add('is-playing');
    try { sessionStorage.setItem('osteon-brand-motion-seen', '1'); } catch { /* The reveal still works. */ }
    window.setTimeout(() => mark.classList.remove('is-playing'), 1650);
  };
  const schedule = () => {
    if ('requestIdleCallback' in window) requestIdleCallback(reveal, { timeout: 1000 });
    else window.setTimeout(reveal, 200);
  };
  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule, { once: true });
  reducedMotion.addEventListener('change', event => {
    if (event.matches) mark.classList.remove('is-playing');
  });
})();
