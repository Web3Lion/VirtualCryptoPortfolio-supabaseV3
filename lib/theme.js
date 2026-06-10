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
    "--bg": "#00a651",
    "--surface": "#007a3d",
    "--surface2": "#005c2e",
    "--border": "rgba(255,255,255,.18)",
    "--accent": "#ffffff",
    "--accent-text": "#00622f", // ← ADD THIS
    "--up": "#a3f4c7",
    "--down": "#ff8a9a",
    "--text": "#ffffff",
    "--muted": "rgba(255,255,255,.6)",
    "--gold": "#fde68a",
  },
};

export function applyTheme(theme) {
  const vars = THEMES[theme] || THEMES.dark;
  const root = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  localStorage.setItem("cc-theme", theme);
}

export function getTheme() {
  if (typeof window === "undefined") return "dark";
  return localStorage.getItem("cc-theme") || "dark";
}
