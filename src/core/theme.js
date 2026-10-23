/**
 * Rankea2 Theme Manager
 * Unifies Dark Mode state and DOM synchronization across all views.
 */

const STORAGE_KEY = 'rankea2_theme';

export function getPreferredTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return saved;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function initTheme() {
  const theme = getPreferredTheme();
  document.documentElement.classList.toggle('dark', theme === 'dark');
  return theme;
}

export function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  const next = isDark ? 'dark' : 'light';
  localStorage.setItem(STORAGE_KEY, next);
  return next;
}

export function bindThemeButton({ buttonId, labelId, darkIconId, lightIconId }) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;

  const lbl = labelId ? document.getElementById(labelId) : null;
  const icDark = darkIconId ? document.getElementById(darkIconId) : null;
  const icLight = lightIconId ? document.getElementById(lightIconId) : null;

  function update() {
    const isDark = document.documentElement.classList.contains('dark');
    if (lbl) lbl.textContent = isDark ? 'Claro' : 'Oscuro';
    if (icDark && icLight) {
      icDark.classList.toggle('hidden', isDark);
      icLight.classList.toggle('hidden', !isDark);
    }
  }

  update();
  btn.addEventListener('click', () => {
    toggleTheme();
    update();
  });
}
