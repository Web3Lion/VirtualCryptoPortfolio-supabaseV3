'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Nav from '@/components/Nav';
import { applyTheme, getTheme } from '@/lib/theme';

const BADGE_DEFS = {
  first_trade:     { label: 'First Trade',       emoji: '🎯' },
  ten_trades:      { label: '10 Trades',          emoji: '📈' },
  fifty_trades:    { label: '50 Trades',          emoji: '🔥' },
  portfolio_x2:    { label: 'Portfolio ×2',       emoji: '🔱' },
  to_the_moon:     { label: 'Up 50%',             emoji: '🚀' },
  diamond_hands:   { label: 'Diamond Hands',      emoji: '💎' },
  ten_pct:         { label: 'Up 10%',             emoji: '🎯' },
  diversified:     { label: 'Diversified',        emoji: '🌐' },
  streak_3:        { label: '3-Day Streak',       emoji: '🔥' },
  streak_7:        { label: '7-Day Streak',       emoji: '⚡' },
  lesson_complete: { label: 'Lesson Complete',    emoji: '🎓' },
  quiz_ace:        { label: 'Quiz Ace',           emoji: '🏅' },
  crush_master:    { label: 'Crush Master',       emoji: '🕹️' },
  options_trader:  { label: 'Options Trader',     emoji: '📋' },
  staker:          { label: 'Staker',             emoji: '🪙' },
};

const COIN_COLORS = { BTC:'#F7931A',ETH:'#627EEA',SOL:'#9945FF',ADA:'#0033AD',XRP:'#23292F',HBAR:'#5F5F5F',USDC:'#2775CA',VOI:'#00A651' };
const coinColor = c => COIN_COLORS[c] || '#475569';

function fmtUSD(v) {
  return new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', minimumFractionDigits:2, maximumFractionDigits:2 }).format(v || 0);
}
function fmtPct(v) {
  const n = parseFloat(v);
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

function MiniChart({ data, seedMoney }) {
  if (!data?.length) return null;
  const vals = data.map(d => d.v);
  const min = Math.min(...vals, seedMoney);
  const max = Math.max(...vals, seedMoney);
  const range = max - min || 1;
  const W = 400, H = 80, PAD = 4;
  const pts = data.map((d, i) => {
    const x = PAD + (i / (data.length - 1 || 1)) * (W - PAD * 2);
    const y = PAD + (1 - (d.v - min) / range) * (H - PAD * 2);
    return `${x},${y}`;
  }).join(' ');
  const last = parseFloat(data[data.length - 1]?.v || 0);
  const color = last >= seedMoney ? '#00e5a0' : '#f43f5e';
  const fillPts = `${PAD},${H} ${pts} ${W - PAD},${H}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:80, display:'block' }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPts} fill="url(#chartGrad)" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const studentId = params?.id;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => { applyTheme(getTheme()); }, []);
  useEffect(() => { if (status === 'unauthenticated') router.replace('/'); }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated' || !studentId) return;
    fetch(`/api/leaderboard/student?studentId=${studentId}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => setProfile(d))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [status, studentId]);

  if (status === 'loading' || loading) {
    return (
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
        <Nav />
        <div style={{ height: 200, borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--border)', animation: 'pulse 1.5s ease-in-out infinite', marginBottom: 16 }} />
        <div style={{ height: 300, borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      </main>
    );
  }

  if (notFound || !profile) {
    return (
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
        <Nav />
        <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Profile not found</div>
          <div style={{ fontSize: 12 }}>This student may not be in your class.</div>
          <Link href="/leaderboard" style={{ display: 'inline-block', marginTop: 16, fontSize: 12, color: 'var(--accent)' }}>← Back to Leaderboard</Link>
        </div>
      </main>
    );
  }

  const { student, summary, metrics, holdings, recentTrades, chartData, badges = [] } = profile;
  const ret = parseFloat(summary.returnPct);
  const isPos = ret >= 0;
  const totalVal = parseFloat(summary.totalVal);
  const seedMoney = parseFloat(summary.seedMoney);

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      <style>{`
        body{background:var(--bg);color:var(--text);font-family:'DM Mono',monospace}
        .card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:22px;margin-bottom:16px}
        .stat{background:var(--surface2);border-radius:12px;padding:10px 12px;text-align:center}
        .stat-lbl{font-size:10px;color:var(--muted);margin-bottom:4px}
        .stat-val{font-family:'Syne',sans-serif;font-weight:700;font-size:13px}
      `}</style>
      <Nav />

      <Link href="/leaderboard" style={{ fontSize: 11, color: 'var(--muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 20 }}>
        ← Leaderboard
      </Link>

      {/* Hero */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: isPos ? 'rgba(0,229,160,.15)' : 'rgba(244,63,94,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
            {student.isBot ? '🤖' : '👤'}
          </div>
          <div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22 }}>{student.name}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Portfolio Overview</div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 40, color: isPos ? 'var(--up)' : 'var(--down)', lineHeight: 1 }}>{fmtUSD(totalVal)}</div>
          <div style={{ fontSize: 14, color: isPos ? 'var(--up)' : 'var(--down)', marginTop: 6 }}>
            {isPos ? '▲' : '▼'} {fmtUSD(Math.abs(parseFloat(summary.pl)))} &nbsp;({fmtPct(ret)})
          </div>
        </div>

        {chartData?.length > 1 && (
          <div style={{ marginBottom: 20, borderRadius: 12, overflow: 'hidden', background: 'var(--surface2)', padding: '8px 0' }}>
            <MiniChart data={chartData} seedMoney={seedMoney} />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
          {[
            ['Cash', fmtUSD(summary.cash), 'var(--text)'],
            ['Holdings', fmtUSD(summary.holdingsVal), 'var(--text)'],
            ['Fees', fmtUSD(summary.fees), 'var(--muted)'],
            ['Started', fmtUSD(seedMoney), 'var(--muted)'],
          ].map(([lbl, val, color]) => (
            <div key={lbl} className="stat">
              <div className="stat-lbl">{lbl}</div>
              <div className="stat-val" style={{ color }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Metrics */}
      {[metrics.sharpe, metrics.sortino, metrics.maxDrawdown, metrics.winRate].some(v => v != null) && (
        <div className="card">
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Risk Metrics</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
            {[
              ['Sharpe', metrics.sharpe, v => v >= 1 ? 'var(--up)' : v >= 0 ? 'var(--text)' : 'var(--down)', v => v?.toFixed(2)],
              ['Sortino', metrics.sortino, v => v >= 1 ? 'var(--up)' : v >= 0 ? 'var(--text)' : 'var(--down)', v => v?.toFixed(2)],
              ['Max DD', metrics.maxDrawdown, v => v > 20 ? 'var(--down)' : v > 10 ? 'var(--text)' : 'var(--up)', v => v != null ? `-${v.toFixed(1)}%` : null],
              ['Win Rate', metrics.winRate, v => v >= 50 ? 'var(--up)' : 'var(--down)', v => v != null ? `${v.toFixed(1)}%` : null],
            ].filter(([, v]) => v != null).map(([lbl, val, colorFn, fmt]) => (
              <div key={lbl} className="stat">
                <div className="stat-lbl">{lbl}</div>
                <div className="stat-val" style={{ color: colorFn(val) }}>{fmt(val)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Holdings */}
      {holdings.length > 0 && (
        <div className="card">
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Holdings</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {holdings.filter(h => Math.abs(h.qty) > 0).map(h => {
              const hp = h.plPct >= 0;
              return (
                <div key={h.coin} style={{ display: 'grid', gridTemplateColumns: '10px 1fr auto auto', alignItems: 'center', gap: 12, background: 'var(--surface2)', borderRadius: 12, padding: '10px 14px' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: coinColor(h.coin) }} />
                  <div>
                    <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13 }}>{h.isShort ? '⬇ ' : ''}{h.coin}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>{Math.abs(h.qty).toFixed(4)} @ {fmtUSD(h.avgBuy)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{fmtUSD(h.curVal)}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>{fmtUSD(h.curPrice)}</div>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 56 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: hp ? 'var(--up)' : 'var(--down)' }}>{hp ? '+' : ''}{h.plPct.toFixed(1)}%</div>
                    <div style={{ fontSize: 10, color: hp ? 'var(--up)' : 'var(--down)' }}>{hp ? '+' : ''}{fmtUSD(h.plTotal)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Badges */}
      {badges.length > 0 && (
        <div className="card">
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Badges</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {badges.map(id => {
              const def = BADGE_DEFS[id] || { label: id, emoji: '🏅' };
              return (
                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.25)', borderRadius: 20, padding: '5px 12px', fontSize: 12 }}>
                  <span>{def.emoji}</span>
                  <span style={{ color: 'var(--text)', fontWeight: 600 }}>{def.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Trades */}
      {recentTrades.length > 0 && (
        <div className="card">
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Recent Trades</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {recentTrades.map((t, i) => {
              const actionColor = t.action === 'BUY' ? 'var(--up)' : ['SELL','SELL_ALL'].includes(t.action) ? 'var(--down)' : '#8b5cf6';
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'var(--surface2)', borderRadius: 10, fontSize: 12 }}>
                  <span style={{ color: actionColor, fontWeight: 700, minWidth: 56 }}>{t.action}</span>
                  <span style={{ fontWeight: 600, flex: 1 }}>{t.coin}</span>
                  <span style={{ color: 'var(--muted)', fontSize: 11 }}>{Math.abs(t.quantity).toFixed(4)}</span>
                  <span style={{ color: 'var(--text)' }}>{fmtUSD(t.price)}</span>
                  <span style={{ color: 'var(--muted)', fontSize: 10 }}>{new Date(t.createdAt).toLocaleDateString()}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
