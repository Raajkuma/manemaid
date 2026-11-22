const KEY = 'manemaid-portal-theme';

function stored(): 'light' | 'dark' | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

export function currentTheme(): 'light' | 'dark' {
  return stored() ?? (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}

export function applyStoredTheme() {
  document.documentElement.classList.toggle('dark', currentTheme() === 'dark');
}

export function setTheme(t: 'light' | 'dark') {
  try {
    localStorage.setItem(KEY, t);
  } catch {
    // Private mode: the choice just isn't remembered.
  }
  document.documentElement.classList.toggle('dark', t === 'dark');
}
