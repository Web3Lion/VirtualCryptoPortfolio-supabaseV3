'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import ThemeToggle from './ThemeToggle';
import { getCosmetic, applyCosmetic } from '@/lib/cosmetics';

const ROW1 = [
  { href: '/dashboard',  label: 'Wallet',      key: 'wallet' },
  { href: '/market',     label: 'Market',      key: 'market' },
  { href: '/leaderboard',label: 'Leaderboard', key: 'leaderboard' },
  { href: '/stake',      label: 'Stake',       key: 'stake' },
];

const ROW2 = [
  { href: '/learn',              label: 'Learn',   key: 'learn' },
  { href: '/badges',             label: 'Badges',  key: 'badges' },
  { href: '/news',               label: 'News',    key: 'news' },
  { href: '/games/crypto-crush',   label: 'Crush',   key: 'crush' },
  { href: '/games/higher-lower',   label: 'Predict', key: 'higher-lower' },
  { href: '/rewards',            label: 'Store',   key: 'store' },
];

const ALL = [...ROW1, ...ROW2];

export default function Nav({ active, right }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { applyCosmetic(getCosmetic()); }, []);

  return (
    <>
      <style>{`
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
      `}</style>

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
          </div>
        )}
      </nav>
    </>
  );
}
