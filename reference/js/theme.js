// Runs before styles paint; saved choices override the device until Device is selected.
(() => {
  const storageKey = 'osteon-theme';
  const device = window.matchMedia('(prefers-color-scheme: dark)');
  function readPreference() {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved === 'light' || saved === 'dark' ? saved : 'system';
    } catch { return 'system'; }
  }
  let preference = readPreference();
  function updateOptions(picker) {
    picker.querySelectorAll('[data-theme-choice]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.themeChoice === preference));
    });
  }
  function applyTheme() {
    const resolved = preference === 'system' ? (device.matches ? 'dark' : 'light') : preference;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themePreference = preference;
    document.documentElement.style.colorScheme = resolved;
    document.querySelectorAll('.theme-picker[open]').forEach(updateOptions);
  }
  function closePickers(except) {
    document.querySelectorAll('.theme-picker[open]').forEach(picker => {
      if (picker !== except) picker.open = false;
    });
  }
  applyTheme();
  device.addEventListener('change', () => { if (preference === 'system') applyTheme(); });
  window.addEventListener('storage', event => {
    if (event.key === storageKey || event.key === null) {
      preference = readPreference();
      applyTheme();
    }
  });
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    const picker = target?.closest('.theme-picker');
    if (!picker) { closePickers(); return; }
    const choice = target.closest('[data-theme-choice]');
    if (choice) {
      preference = choice.dataset.themeChoice;
      try {
        if (preference === 'system') localStorage.removeItem(storageKey);
        else localStorage.setItem(storageKey, preference);
      } catch { /* Private browsing may block storage; this page still switches. */ }
      applyTheme();
      picker.open = false;
      picker.querySelector('summary').focus();
    } else if (target.closest('summary')) {
      closePickers(picker);
      updateOptions(picker);
      document.dispatchEvent(new Event('osteon:appearance-open'));
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const picker = document.querySelector('.theme-picker[open]');
    if (picker) {
      picker.open = false;
      picker.querySelector('summary').focus();
    }
  });
})();
