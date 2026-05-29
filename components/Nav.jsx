'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import ThemeToggle from './ThemeToggle';
import { getCosmetic, applyCosmetic } from '@/lib/cosmetics';

const LINKS = [
  { href: '/dashboard',          label: 'Wallet',      key: 'wallet' },
  { href: '/leaderboard',        label: 'Leaderboard', key: 'leaderboard' },
  { href: '/market',             label: 'Market',      key: 'market' },
  { href: '/news',               label: 'News',        key: 'news' },
  { href: '/badges',             label: 'Badges',      key: 'badges' },
  { href: '/learn',              label: 'Learn',       key: 'learn' },
  { href: '/games/crypto-crush', label: 'Crush',       key: 'crush' },
  { href: '/rewards',            label: 'Store',       key: 'store' },
];

export default function Nav({ active, right }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { applyCosmetic(getCosmetic()); }, []);
  return (
    <>
      <style>{`
        .ccnav{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;margin-bottom:28px;background:var(--surface,#0f172a);border:1px solid var(--border,#1e293b);border-radius:16px;gap:10px;position:relative;z-index:50}
        .ccnav-logo{font-family:'Syne',sans-serif;font-weight:800;font-size:16px;text-decoration:none;color:var(--text,#e2e8f0);flex-shrink:0}
        .ccnav-logo span{color:var(--accent,#00e5a0)}
        .ccnav-links{display:flex;gap:6px;flex-wrap:wrap}
        .ccnav-link{padding:6px 12px;border-radius:8px;font-size:11px;text-decoration:none;color:var(--muted,#475569);letter-spacing:.8px;transition:all .2s;text-transform:uppercase;white-space:nowrap}
        .ccnav-link:hover{color:var(--accent,#00e5a0)}
        .ccnav-link.active{background:rgba(0,229,160,.12);color:var(--accent,#00e5a0);border:1px solid rgba(0,229,160,.2)}
        .ccnav-right{display:flex;align-items:center;gap:10px;flex-shrink:0}
        .ccnav-burger{display:none;background:none;border:1px solid var(--border,#1e293b);border-radius:8px;padding:6px 11px;cursor:pointer;color:var(--text,#e2e8f0);font-size:16px;line-height:1;transition:all .2s}
        .ccnav-burger:hover{border-color:var(--accent,#00e5a0);color:var(--accent,#00e5a0)}
        .ccnav-drawer{position:absolute;top:calc(100% + 8px);left:0;right:0;background:var(--surface,#0f172a);border:1px solid var(--border,#1e293b);border-radius:14px;padding:10px;z-index:200;box-shadow:0 8px 32px rgba(0,0,0,.5);display:grid;grid-template-columns:1fr 1fr;gap:4px}
        .ccnav-drawer .ccnav-link{padding:10px 14px;border-radius:10px;font-size:12px}
        .ccnav-drawer .ccnav-link:hover{background:rgba(0,229,160,.08)}
        @media(max-width:700px){
          .ccnav-links{display:none}
          .ccnav-burger{display:flex;align-items:center}
        }
        @media(min-width:701px){.ccnav-drawer{display:none!important}}
      `}</style>
      <nav className="ccnav">
        <Link href="/dashboard" className="ccnav-logo">CRYPTO<span>CLASS</span></Link>
        <div className="ccnav-links">
          {LINKS.map(l => (
            <Link key={l.key} href={l.href} className={`ccnav-link${active === l.key ? ' active' : ''}`}>{l.label}</Link>
          ))}
        </div>
        <div className="ccnav-right">
          {right}
          <ThemeToggle />
          <button className="ccnav-burger" onClick={() => setOpen(o => !o)} aria-label="Toggle menu">
            {open ? '✕' : '☰'}
          </button>
        </div>
        {open && (
          <div className="ccnav-drawer">
            {LINKS.map(l => (
              <Link key={l.key} href={l.href} className={`ccnav-link${active === l.key ? ' active' : ''}`} onClick={() => setOpen(false)}>{l.label}</Link>
            ))}
          </div>
        )}
      </nav>
    </>
  );
}
