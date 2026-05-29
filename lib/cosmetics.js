export const COSMETIC_THEMES = {
  theme_gold: {
    name: 'Gold Rush',
    emoji: '🪙',
    vars: {
      '--bg':      '#0c0800',
      '--surface': '#1a1100',
      '--surface2':'#251900',
      '--border':  '#4a3200',
      '--accent':  '#f59e0b',
      '--up':      '#f59e0b',
      '--down':    '#ef4444',
      '--text':    '#fef3c7',
      '--muted':   '#92660a',
      '--gold':    '#fbbf24',
    },
  },
  theme_arcade: {
    name: '80s Arcade',
    emoji: '👾',
    vars: {
      '--bg':      '#06000f',
      '--surface': '#110028',
      '--surface2':'#1a003e',
      '--border':  '#7700cc',
      '--accent':  '#ff00ff',
      '--up':      '#00ffcc',
      '--down':    '#ff0055',
      '--text':    '#ffffff',
      '--muted':   '#9900cc',
      '--gold':    '#ffff00',
    },
  },
  theme_dino: {
    name: 'Dino Trader',
    emoji: '🦕',
    vars: {
      '--bg':      '#030c03',
      '--surface': '#071507',
      '--surface2':'#0b1f0b',
      '--border':  '#174a20',
      '--accent':  '#4ade80',
      '--up':      '#4ade80',
      '--down':    '#f87171',
      '--text':    '#dcfce7',
      '--muted':   '#166534',
      '--gold':    '#fbbf24',
    },
  },
};

export function getCosmetic() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('cc-cosmetic') || null;
}

export function applyCosmetic(themeId) {
  if (typeof window === 'undefined') return;
  const theme = COSMETIC_THEMES[themeId];
  let el = document.getElementById('cc-cosmetic-style');
  if (!theme) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('style');
    el.id = 'cc-cosmetic-style';
    document.head.appendChild(el);
  }
  const vars = Object.entries(theme.vars).map(([k, v]) => `${k}:${v}`).join(';');
  el.textContent = `:root{${vars}}`;
}

export function setCosmetic(themeId) {
  if (typeof window === 'undefined') return;
  if (themeId) localStorage.setItem('cc-cosmetic', themeId);
  else localStorage.removeItem('cc-cosmetic');
  applyCosmetic(themeId);
}
