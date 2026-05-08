"use client";
import { useState, useEffect } from "react";
import { applyTheme, getTheme } from "@/lib/theme";

const THEMES = [
  { key: 'dark',  label: 'DARK'  },
  { key: 'light', label: 'LIGHT' },
  { key: 'sf',    label: 'SF'    },
];

export default function ThemeToggle() {
  const [active, setActive] = useState('dark');

  useEffect(() => {
    const saved = getTheme();
    setActive(saved);
    applyTheme(saved);
  }, []);

  const toggle = (key) => {
    setActive(key);
    applyTheme(key);
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
      {THEMES.map(t => (
        <button
          key={t.key}
          onClick={() => toggle(t.key)}
          style={{
            padding: '4px 10px',
            borderRadius: 16,
            border: 'none',
            background: active === t.key ? 'var(--accent)' : 'transparent',
            color: active === t.key ? (t.key === 'dark' ? '#000' : '#fff') : 'var(--muted)',
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
    </div>
  );
}
