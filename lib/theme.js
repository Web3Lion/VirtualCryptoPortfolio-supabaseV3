export const THEMES = {
  dark: {
    "--bg": "#080c14",
    "--surface": "#0f172a",
    "--surface2": "#1a2235",
    "--border": "#1e293b",
    "--accent": "#00e5a0",
    "--up": "#00e5a0",
    "--down": "#f43f5e",
    "--text": "#e2e8f0",
    "--muted": "#475569",
    "--gold": "#f59e0b",
  },
  light: {
    "--bg": "#f0faf4",
    "--surface": "#ffffff",
    "--surface2": "#f1f5f9",
    "--border": "#e2e8f0",
    "--accent": "#059669",
    "--up": "#059669",
    "--down": "#e11d48",
    "--text": "#0f172a",
    "--muted": "#475569",
    "--gold": "#d97706",
  },
  sf: {
    "--bg": "#009A44", // Pantone 347 C
    "--surface": "#ffffff",
    "--surface2": "#f1f5f9",
    "--border": "#e2e8f0",
    "--accent": "#009A44", // same as --bg for brand consistency; buttons default to white text via .btn-primary's built-in #fff fallback
    "--up": "#059669",
    "--down": "#e11d48",
    "--text": "#0f172a",
    "--muted": "#475569",
    "--gold": "#d97706",
  },
};

export function applyTheme(theme) {
  const t = THEMES[theme] ? theme : "dark";
  document.documentElement.setAttribute("data-theme", t);
  localStorage.setItem("cc-theme", t);
}

export function getTheme() {
  if (typeof window === "undefined") return "dark";
  return localStorage.getItem("cc-theme") || "dark";
}
