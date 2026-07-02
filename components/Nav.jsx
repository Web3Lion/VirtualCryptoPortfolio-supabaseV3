'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';
import { getCosmetic, applyCosmetic } from '@/lib/cosmetics';

const ANNOUNCE_COLORS = {
  blue:   { bg:'rgba(96,165,250,.12)',  border:'rgba(96,165,250,.4)',  text:'#93c5fd' },
  green:  { bg:'rgba(0,229,160,.12)',   border:'rgba(0,229,160,.4)',   text:'#00e5a0' },
  yellow: { bg:'rgba(245,158,11,.12)',  border:'rgba(245,158,11,.4)',  text:'#fbbf24' },
  red:    { bg:'rgba(244,63,94,.12)',   border:'rgba(244,63,94,.4)',   text:'#f87171' },
};

const ROW1 = [
  { href: '/dashboard',  label: 'Wallet',      key: 'wallet' },
  { href: '/market',     label: 'Market',      key: 'market' },
  { href: '/leaderboard',label: 'Leaderboard', key: 'leaderboard' },
  { href: '/stake',      label: 'Stake',       key: 'stake' },
];

const GAMES = [
  { href: '/games/crypto-crush',  label: 'Crypto Crush',  icon: '💎' },
  { href: '/games/higher-lower',  label: 'Higher / Lower', icon: '📈' },
  { href: '/games/miner-runner',  label: 'Miner Runner',  icon: '⛏' },
  { href: '/games/bull-bear',     label: 'Bull or Bear',  icon: '🐂' },
];

const ROW2 = [
  { href: '/feed',    label: 'Feed',   key: 'feed' },
  { href: '/learn',   label: 'Learn',  key: 'learn' },
  { href: '/badges',  label: 'Badges', key: 'badges' },
  { href: '/news',    label: 'News',   key: 'news' },
  { href: '/rewards', label: 'Store',  key: 'store' },
  { href: '/spin',    label: '🎡 Spin', key: 'spin' },
];

const ALL = [...ROW1, ...ROW2, ...GAMES.map((g, i) => ({ ...g, key: `game-${i}` }))];

const fmtTickerPrice = (p) => {
  if (p >= 1000) return '$' + p.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (p >= 1)    return '$' + p.toFixed(2);
  if (p >= 0.01) return '$' + p.toFixed(4);
  return '$' + p.toFixed(6);
};

export default function Nav({ active, right }) {
  const [open, setOpen] = useState(false);
  const [gamesOpen, setGamesOpen] = useState(false);
  const [announcement, setAnnouncement] = useState(null);
  const [ticker, setTicker] = useState([]);
  const gamesRef = useRef(null);
  const pathname = usePathname();
  const isGameActive = GAMES.some(g => g.href === pathname);
  useEffect(() => { applyCosmetic(getCosmetic()); }, []);
  useEffect(() => {
    const handler = (e) => { if (gamesRef.current && !gamesRef.current.contains(e.target)) setGamesOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  useEffect(() => {
    fetch('/api/market').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.announcement) setAnnouncement({ text: d.announcement, color: d.announcementColor || 'blue' });
    }).catch(() => {});
  }, [pathname]);
  useEffect(() => {
    const load = () => fetch('/api/ticker').then(r => r.ok ? r.json() : null).then(d => { if (Array.isArray(d) && d.length) setTicker(d); }).catch(() => {});
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, []);

  return (
    <>
      <nav className="ccnav">
        {/* ── Row 1: Logo · Trading links · Controls ── */}
        <div className="ccnav-row1">
          <Link href="/dashboard" className="ccnav-logo">CRYPTO<span>CLASS</span></Link>
          <div className="ccnav-primary">
            {ROW1.map(l => (
              <Link key={l.key} href={l.href} className={`ccnav-link${active === l.key ? ' active' : ''}`}>
                {l.label}
              </Link>
            ))}
          </div>
          <div className="ccnav-right">
            {right}
            <ThemeToggle />
            <button className="ccnav-burger" onClick={() => setOpen(o => !o)} aria-label="Toggle menu">
              {open ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* ── Row 2: Content links ── */}
        <div className="ccnav-row2">
          {ROW2.map(l => (
            <Link key={l.key} href={l.href} className={`ccnav-link${active === l.key ? ' active' : ''}`}>
              {l.label}
            </Link>
          ))}
          {/* Games dropdown */}
          <div className="ccnav-games" ref={gamesRef}>
            <button
              className={`ccnav-games-btn${isGameActive ? ' active' : ''}`}
              onClick={() => setGamesOpen(o => !o)}
            >
              Games ▾
            </button>
            {gamesOpen && (
              <div className="ccnav-games-drop">
                <div className="ccnav-games-drop-label">Select a game</div>
                {GAMES.map(g => (
                  <Link key={g.href} href={g.href} onClick={() => setGamesOpen(false)}
                    className={pathname === g.href ? 'active' : ''}>
                    <span>{g.icon}</span>{g.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Mobile drawer ── */}
        {open && (
          <div className="ccnav-drawer">
            {ROW1.map(l => (
              <Link key={l.key} href={l.href} className={`ccnav-link${active === l.key ? ' active' : ''}`} onClick={() => setOpen(false)}>{l.label}</Link>
            ))}
            <div className="ccnav-drawer-divider" />
            {ROW2.map(l => (
              <Link key={l.key} href={l.href} className={`ccnav-link${active === l.key ? ' active' : ''}`} onClick={() => setOpen(false)}>{l.label}</Link>
            ))}
            <div className="ccnav-drawer-divider" />
            {GAMES.map(g => (
              <Link key={g.href} href={g.href} className={`ccnav-link${pathname === g.href ? ' active' : ''}`} onClick={() => setOpen(false)}>
                {g.icon} {g.label}
              </Link>
            ))}
          </div>
        )}
      </nav>

      {ticker.length > 0 && (() => {
        // Duplicate items for seamless infinite scroll
        const items = [...ticker, ...ticker];
        return (
          <div className="ccticker">
            <div className="ccticker-track">
              {items.map((c, i) => {
                const up = c.change24h >= 0;
                return (
                  <span key={i} className="ccticker-item">
                    <span className="ccticker-sym">{c.symbol}</span>
                    <span className="ccticker-price">{fmtTickerPrice(c.price)}</span>
                    <span className={up ? 'ccticker-up' : 'ccticker-down'}>
                      {up ? '▲' : '▼'}{Math.abs(c.change24h).toFixed(2)}%
                    </span>
                    <span className="ccticker-dot">·</span>
                  </span>
                );
              })}
            </div>
          </div>
        );
      })()}

      {announcement && (() => {
        const c = ANNOUNCE_COLORS[announcement.color] || ANNOUNCE_COLORS.blue;
        return (
          <div style={{
            background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12,
            padding: '10px 18px', marginBottom: 14,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>📢</span>
            <span style={{ fontSize: 13, color: c.text, fontWeight: 600 }}>{announcement.text}</span>
          </div>
        );
      })()}
    </>
  );
}
