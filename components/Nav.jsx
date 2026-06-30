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
];

const ROW2 = [
  { href: '/feed',    label: 'Feed',   key: 'feed' },
  { href: '/learn',   label: 'Learn',  key: 'learn' },
  { href: '/badges',  label: 'Badges', key: 'badges' },
  { href: '/news',    label: 'News',   key: 'news' },
  { href: '/rewards', label: 'Store',  key: 'store' },
];

const ALL = [...ROW1, ...ROW2, ...GAMES.map((g, i) => ({ ...g, key: `game-${i}` }))];

export default function Nav({ active, right }) {
  const [open, setOpen] = useState(false);
  const [gamesOpen, setGamesOpen] = useState(false);
  const [announcement, setAnnouncement] = useState(null);
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

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .ccnav{
          display:flex;flex-direction:column;
          padding:14px 20px 12px;margin-bottom:28px;
          background:var(--surface,#0f172a);border:1px solid var(--border,#1e293b);
          border-radius:16px;position:relative;z-index:50;gap:0;
        }
        /* ── Row 1 ── */
        .ccnav-row1{display:flex;align-items:center;justify-content:space-between;gap:12px}
        .ccnav-logo{font-family:'Syne',sans-serif;font-weight:800;font-size:16px;text-decoration:none;color:var(--text,#e2e8f0);flex-shrink:0;letter-spacing:-.3px}
        .ccnav-logo span{color:var(--accent,#00e5a0)}
        .ccnav-primary{display:flex;gap:4px;flex:1}
        .ccnav-right{display:flex;align-items:center;gap:10px;flex-shrink:0}
        /* ── Row 2 ── */
        .ccnav-row2{
          display:flex;gap:4px;flex-wrap:wrap;
          margin-top:10px;padding-top:10px;
          border-top:1px solid var(--border,#1e293b);
        }
        /* ── Links shared ── */
        .ccnav-link{
          padding:5px 12px;border-radius:8px;font-size:11px;text-decoration:none;
          color:var(--muted,#475569);letter-spacing:.6px;transition:all .2s;
          text-transform:uppercase;white-space:nowrap;
        }
        .ccnav-link:hover{color:var(--accent,#00e5a0)}
        .ccnav-link.active{background:rgba(0,229,160,.12);color:var(--accent,#00e5a0);border:1px solid rgba(0,229,160,.2)}
        /* row-2 links slightly smaller */
        .ccnav-row2 .ccnav-link{font-size:10px;padding:4px 10px}
        /* ── Games dropdown ── */
        .ccnav-games{position:relative}
        .ccnav-games-btn{
          padding:4px 10px;border-radius:8px;font-size:10px;
          color:var(--muted,#475569);letter-spacing:.6px;transition:all .2s;
          text-transform:uppercase;white-space:nowrap;background:none;border:none;cursor:pointer;
          font-family:inherit;
        }
        .ccnav-games-btn:hover,.ccnav-games-btn.active{color:var(--accent,#00e5a0)}
        .ccnav-games-btn.active{background:rgba(0,229,160,.12);border:1px solid rgba(0,229,160,.2)}
        .ccnav-games-drop{
          position:absolute;top:calc(100% + 6px);left:0;min-width:170px;
          background:var(--surface,#0f172a);border:1px solid var(--border,#1e293b);
          border-radius:12px;padding:6px;z-index:300;box-shadow:0 8px 24px rgba(0,0,0,.5);
        }
        .ccnav-games-drop a{
          display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;
          font-size:11px;text-decoration:none;color:var(--muted,#475569);
          letter-spacing:.4px;transition:all .15s;white-space:nowrap;
        }
        .ccnav-games-drop a:hover{background:rgba(0,229,160,.08);color:var(--accent,#00e5a0)}
        .ccnav-games-drop a.active{background:rgba(0,229,160,.12);color:var(--accent,#00e5a0)}
        .ccnav-games-drop-label{
          font-size:9px;letter-spacing:1px;text-transform:uppercase;
          color:var(--muted,#475569);padding:4px 12px 2px;opacity:.5;
        }
        /* ── Burger & drawer ── */
        .ccnav-burger{display:none;background:none;border:1px solid var(--border,#1e293b);border-radius:8px;padding:6px 11px;cursor:pointer;color:var(--text,#e2e8f0);font-size:16px;line-height:1;transition:all .2s}
        .ccnav-burger:hover{border-color:var(--accent,#00e5a0);color:var(--accent,#00e5a0)}
        .ccnav-drawer{position:absolute;top:calc(100% + 8px);left:0;right:0;background:var(--surface,#0f172a);border:1px solid var(--border,#1e293b);border-radius:14px;padding:10px;z-index:200;box-shadow:0 8px 32px rgba(0,0,0,.5);display:grid;grid-template-columns:1fr 1fr;gap:4px}
        .ccnav-drawer .ccnav-link{padding:10px 14px;border-radius:10px;font-size:12px;letter-spacing:.6px}
        .ccnav-drawer .ccnav-link:hover{background:rgba(0,229,160,.08)}
        .ccnav-drawer-divider{grid-column:1/-1;height:1px;background:var(--border,#1e293b);margin:4px 0}
        /* ── Mobile ── */
        @media(max-width:700px){
          .ccnav-primary{display:none}
          .ccnav-row2{display:none}
          .ccnav-burger{display:flex;align-items:center}
        }
        @media(min-width:701px){.ccnav-drawer{display:none!important}}
      ` }} />

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
