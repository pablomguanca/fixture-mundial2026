const KEY = "wc2026:theme";

function systemTheme() {
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function getTheme() {
  try {
    return localStorage.getItem(KEY) || systemTheme();
  } catch (e) {
    return systemTheme();
  }
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "light" ? "#F3F5F9" : "#0B1220");
}

export function setTheme(theme) {
  try { localStorage.setItem(KEY, theme); } catch (e) {}
  applyTheme(theme);
}

export function initTheme() {
  applyTheme(getTheme());
}

export function toggleTheme() {
  const next = getTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}
