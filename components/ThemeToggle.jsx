"use client";
import { useState, useEffect } from "react";
import { applyTheme, getTheme } from "@/lib/theme";
import { COSMETIC_THEMES, applyCosmetic, getCosmetic, setCosmetic, getOwnedThemes } from "@/lib/cosmetics";

const BASE_THEMES = [
  { key: 'dark',  label: 'DARK'  },
  { key: 'light', label: 'LIGHT' },
  { key: 'sf',    label: 'SF'    },
];

export default function ThemeToggle() {
  const [active, setActive] = useState('dark');
  const [ownedCosmetics, setOwnedCosmetics] = useState([]);

  useEffect(() => {
    const cosmetic = getCosmetic();
    const owned = getOwnedThemes().filter(id => COSMETIC_THEMES[id]);
    setOwnedCosmetics(owned);
    if (cosmetic && COSMETIC_THEMES[cosmetic]) {
      setActive(cosmetic);
      applyCosmetic(cosmetic);
    } else {
      const saved = getTheme();
      setActive(saved);
      applyTheme(saved);
    }
  }, []);

  const selectBase = (key) => {
    setActive(key);
    setCosmetic(null);
    applyTheme(key);
  };

  const selectCosmetic = (id) => {
    setActive(id);
    setCosmetic(id);
  };

  return (
    <div style={{
      display: 'flex',
      background: 'var(--surface2)',
      border: '1px solid var(--border)',
      borderRadius: 20,
      padding: 3,
      gap: 2,
    }}>
      {BASE_THEMES.map(t => (
        <button
          key={t.key}
          onClick={() => selectBase(t.key)}
          style={{
            padding: '4px 10px',
            borderRadius: 16,
            border: 'none',
            background: active === t.key ? 'var(--accent)' : 'transparent',
            color: active === t.key ? '#000' : 'var(--muted)',
            fontFamily: "'DM Mono', monospace",
            fontSize: 10,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all .2s',
            letterSpacing: 1,
          }}
        >
          {t.label}
        </button>
      ))}
      {ownedCosmetics.map(id => (
        <button
          key={id}
          onClick={() => selectCosmetic(id)}
          title={COSMETIC_THEMES[id].name}
          style={{
            padding: '4px 8px',
            borderRadius: 16,
            border: 'none',
            background: active === id ? 'var(--accent)' : 'transparent',
            fontSize: 14,
            cursor: 'pointer',
            transition: 'all .2s',
            lineHeight: 1,
            outline: active === id ? '2px solid var(--accent)' : 'none',
            outlineOffset: 1,
          }}
        >
          {COSMETIC_THEMES[id].emoji}
        </button>
      ))}
    </div>
  );
}
