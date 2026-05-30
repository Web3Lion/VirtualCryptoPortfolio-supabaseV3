"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { STAKEABLE_COINS, TIER_META } from "@/lib/staking";

const fmt = (n, dec = 2) => isNaN(+n) ? '0' : (+n).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtUSD = n => '$' + fmt(n);
const fmtPct = n => (+(n * 100)).toFixed(1) + '%';

function timeLeft(unlocks_at) {
  if (!unlocks_at) return null;
  const ms = new Date(unlocks_at) - Date.now();
  if (ms <= 0) return null;
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  return d > 0 ? `${d}d ${h}h` : `${h}h`;
}

function TierBadge({ tier }) {
  const m = TIER_META[tier] || TIER_META.flexible;
  return (
    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, padding: '2px 7px', borderRadius: 6, background: m.bg, color: m.color, textTransform: 'uppercase' }}>
      {m.label}
    </span>
  );
}

function PositionCard({ pos, onUnstake, unstaking }) {
  const info = STAKEABLE_COINS[pos.coin] || {};
  const tier = TIER_META[info.tier || 'flexible'];
  const remaining = timeLeft(pos.unlocks_at);
  const isEarly = !pos.isMature && pos.lock_days > 0;

  return (
    <div style={{ background: 'var(--surface)', border: `1px solid ${pos.isMature ? tier.color : 'var(--border)'}`, borderRadius: 20, padding: 20, display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', transition: 'all .2s', boxShadow: pos.isMature ? `0 0 18px ${tier.color}33` : 'none' }}>
      {pos.isMature && <span style={{ position: 'absolute', top: 12, right: 12, fontSize: 9, fontWeight: 700, letterSpacing: 1, padding: '2px 8px', borderRadius: 6, background: 'rgba(0,229,160,.2)', color: '#00e5a0' }}>READY</span>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 28 }}>{info.emoji || '🪙'}</span>
        <div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16 }}>{pos.coin}</div>
          <TierBadge tier={info.tier || 'flexible'} />
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18, color: tier.color }}>{fmtPct(pos.apy)} APY</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '10px 12px' }}>
          <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 3 }}>Staked</div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14 }}>{fmt(pos.quantity, 6)} {pos.coin}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{fmtUSD(pos.currentValue)}</div>
        </div>
        <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '10px 12px' }}>
          <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 3 }}>Earned</div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, color: '#00e5a0' }}>{fmtUSD(parseFloat(pos.total_rewards_earned) + pos.pendingReward)}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{fmtUSD(pos.pendingReward)} pending</div>
        </div>
      </div>

      <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
        {pos.lock_days === 0
          ? '🔓 Flexible — unstake anytime'
          : pos.isMature
          ? '✅ Lock expired — ready to claim'
          : remaining
          ? `🔒 Unlocks in ${remaining}`
          : '🔒 Calculating...'}
      </div>

      <button
        onClick={() => onUnstake(pos)}
        disabled={unstaking === pos.id}
        style={{
          padding: '9px 0', borderRadius: 10, border: `1px solid ${isEarly ? 'rgba(244,63,94,.4)' : 'rgba(0,229,160,.4)'}`,
          background: isEarly ? 'rgba(244,63,94,.1)' : 'rgba(0,229,160,.1)',
          color: isEarly ? '#f43f5e' : '#00e5a0',
          fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .2s',
          opacity: unstaking === pos.id ? 0.6 : 1,
        }}
      >
        {unstaking === pos.id ? 'Processing…' : isEarly ? '⚠ Early Unstake (forfeit pending rewards)' : '✓ Unstake & Claim Rewards'}
      </button>

      {isEarly && (
        <div style={{ fontSize: 10, color: '#f43f5e', textAlign: 'center', marginTop: -6 }}>
          You'll forfeit {fmtUSD(pos.pendingReward)} in uncredited rewards. Previously distributed rewards stay in your wallet.
        </div>
      )}
    </div>
  );
}

function StakeCard({ item, onStake, staking }) {
  const [qty, setQty] = useState('');
  const tier = TIER_META[item.tier] || TIER_META.flexible;
  const qtyNum = parseFloat(qty) || 0;
  const usdVal = qtyNum * item.price;
  const isValid = qtyNum > 0 && qtyNum <= item.quantity;

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 20, display: 'flex', flexDirection: 'column', gap: 10, transition: 'border-color .2s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = tier.color + '66'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 28 }}>{item.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15 }}>{item.name}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 3, alignItems: 'center', flexWrap: 'wrap' }}>
            <TierBadge tier={item.tier} />
            <span style={{ fontSize: 11, color: tier.color, fontWeight: 700 }}>{fmtPct(item.apy)} APY</span>
          </div>
        </div>
      </div>

      <div style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.5 }}>{item.note}</div>

      <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '8px 12px', fontSize: 11 }}>
        <span style={{ color: 'var(--muted)' }}>Available: </span>
        <span style={{ fontWeight: 600 }}>{fmt(item.quantity, 6)} {item.coin}</span>
        <span style={{ color: 'var(--muted)' }}> ≈ {fmtUSD(item.value)}</span>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="number" min={0} max={item.quantity} step="any"
            placeholder="0.00"
            value={qty}
            onChange={e => setQty(e.target.value)}
            style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 50px 9px 12px', color: 'var(--text)', fontFamily: "'DM Mono',monospace", fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
          />
          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>{item.coin}</span>
        </div>
        <button
          onClick={() => setQty(String(item.quantity))}
          style={{ padding: '9px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--muted)', fontFamily: "'DM Mono',monospace", fontSize: 10, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >MAX</button>
      </div>

      {qtyNum > 0 && (
        <div style={{ fontSize: 10, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
          <span>≈ {fmtUSD(usdVal)}</span>
          <span style={{ color: tier.color }}>Est. annual: {fmtUSD(usdVal * item.apy)}</span>
        </div>
      )}

      <button
        onClick={() => { if (isValid) onStake(item.coin, qtyNum).then(() => setQty('')); }}
        disabled={!isValid || staking === item.coin}
        style={{
          padding: '10px 0', borderRadius: 10, border: 'none',
          background: isValid ? tier.color : 'var(--surface2)',
          color: isValid ? '#000' : 'var(--muted)',
          fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, cursor: isValid ? 'pointer' : 'not-allowed', transition: 'all .2s',
        }}
      >
        {staking === item.coin ? 'Staking…' : item.lockDays > 0 ? `Stake (${item.lockDays}-day lock)` : 'Stake (flexible)'}
      </button>
    </div>
  );
}

export default function StakePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [staking, setStaking] = useState(null);
  const [unstaking, setUnstaking] = useState(null);
  const [flash, setFlash] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => { if (status === 'unauthenticated') router.replace('/'); }, [status, router]);

  const load = () => {
    if (status !== 'authenticated') return;
    fetch('/api/staking').then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(load, [status]);

  const showFlash = (type, msg) => { setFlash({ type, msg }); setTimeout(() => setFlash(null), 3500); };

  const handleStake = async (coin, quantity) => {
    if (!data?.classId) return;
    setStaking(coin);
    const res = await fetch('/api/staking', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stake', coin, quantity, classId: data.classId }),
    }).then(r => r.json()).catch(() => ({ error: 'Network error' }));
    setStaking(null);
    if (res.error) showFlash('error', res.error);
    else { showFlash('success', `✅ ${quantity} ${coin} staked!`); load(); }
  };

  const handleUnstake = async (pos) => {
    const isEarly = !pos.isMature && pos.lock_days > 0;
    if (isEarly && !confirm(`Unstake early? You'll forfeit ${fmtUSD(pos.pendingReward)} in uncredited rewards. Your coins will be returned immediately.`)) return;
    setUnstaking(pos.id);
    const res = await fetch('/api/staking', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'unstake', positionId: pos.id, classId: data.classId }),
    }).then(r => r.json()).catch(() => ({ error: 'Network error' }));
    setUnstaking(null);
    if (res.error) showFlash('error', res.error);
    else {
      const msg = res.isMature
        ? `✅ Unstaked! ${fmtUSD(res.finalReward)} final reward added to wallet.`
        : `↩ Unstaked early. Coins returned to your wallet.`;
      showFlash('success', msg);
      load();
    }
  };

  const positions = data?.positions || [];
  const stakeable = data?.stakeable || [];
  const enabled = data?.config?.enabled;

  const TIERS = ['all', 'flexible', 'short', 'standard', 'long'];
  const filteredStakeable = activeTab === 'all' ? stakeable : stakeable.filter(s => s.tier === activeTab);

  const totalStaked = positions.reduce((s, p) => s + p.currentValue, 0);
  const totalEarned = positions.reduce((s, p) => s + parseFloat(p.total_rewards_earned) + p.pendingReward, 0);

  if (status === 'loading' || status === 'unauthenticated') {
    return <div style={{ background: 'var(--bg,#080c14)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>Loading...</div>;
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--bg:#080c14;--surface:#0f172a;--surface2:#1a2235;--border:#1e293b;--accent:#00e5a0;--text:#e2e8f0;--muted:#475569}
        body{background:var(--bg);color:var(--text);font-family:'DM Mono',monospace;min-height:100vh}
        .page{max-width:1100px;margin:0 auto;padding:24px 16px}
        .stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:28px}
        .stat{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:16px 20px}
        .stat-label{font-size:9px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;margin-bottom:6px}
        .stat-value{font-family:'Syne',sans-serif;font-weight:800;font-size:22px}
        .section-title{font-family:'Syne',sans-serif;font-weight:700;font-size:16px;margin-bottom:14px;color:var(--text)}
        .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;margin-bottom:32px}
        .flash{position:fixed;top:24px;right:24px;z-index:9999;padding:14px 20px;border-radius:14px;font-size:13px;font-weight:600;max-width:340px;animation:slideIn .3s ease}
        .flash.success{background:rgba(0,229,160,.15);border:1px solid rgba(0,229,160,.4);color:#00e5a0}
        .flash.error{background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.4);color:#ef4444}
        .tab-row{display:flex;gap:4px;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:3px;margin-bottom:16px;width:fit-content}
        .tab{padding:6px 14px;border-radius:8px;border:none;background:transparent;color:var(--muted);font-family:'DM Mono',monospace;font-size:11px;cursor:pointer;transition:all .2s;text-transform:capitalize}
        .tab.active{background:var(--surface2);color:var(--accent);border:1px solid var(--border)}
        .skeleton{background:linear-gradient(90deg,var(--surface) 25%,var(--surface2) 50%,var(--surface) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:16px}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes slideIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:none}}
        @media(max-width:600px){.stats-row{grid-template-columns:1fr 1fr}}
      `}</style>

      <div className="page">
        <Nav active="stake" />

        <div style={{ marginBottom: 6 }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 32, letterSpacing: -1 }}>
            ⛏️ <span style={{ color: 'var(--accent)' }}>Staking</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
            Lock your coins to earn simulated yield — rewards are credited to your cash balance daily
          </div>
        </div>

        {flash && <div className={`flash ${flash.type}`} style={{ marginTop: 12 }}>{flash.msg}</div>}

        {!loading && !enabled && (
          <div style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.3)', borderRadius: 16, padding: '16px 20px', margin: '20px 0', fontSize: 13, color: '#f59e0b' }}>
            ⏸ Staking is not enabled for your class yet. Ask your teacher to enable it in the Controls tab.
          </div>
        )}

        {loading ? (
          <div className="stats-row" style={{ marginTop: 20 }}>
            {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 80 }} />)}
          </div>
        ) : (
          <div className="stats-row" style={{ marginTop: 20 }}>
            <div className="stat"><div className="stat-label">Total Staked</div><div className="stat-value" style={{ color: 'var(--accent)' }}>{fmtUSD(totalStaked)}</div></div>
            <div className="stat"><div className="stat-label">Total Earned</div><div className="stat-value" style={{ color: '#00e5a0' }}>{fmtUSD(totalEarned)}</div></div>
            <div className="stat"><div className="stat-label">Active Positions</div><div className="stat-value" style={{ color: 'var(--gold,#f59e0b)' }}>{positions.length}</div></div>
            <div className="stat"><div className="stat-label">Stakeable Coins</div><div className="stat-value">{stakeable.length}</div></div>
          </div>
        )}

        {/* Active positions */}
        {positions.length > 0 && (
          <>
            <div className="section-title">Active Positions</div>
            <div className="grid">
              {positions.map(pos => (
                <PositionCard key={pos.id} pos={pos} onUnstake={handleUnstake} unstaking={unstaking} />
              ))}
            </div>
          </>
        )}

        {/* Available to stake */}
        {enabled && (
          <>
            <div className="section-title" style={{ marginBottom: 10 }}>Stake a Coin</div>
            {stakeable.length === 0 && !loading ? (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13, marginBottom: 24 }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>🏦</div>
                You don't hold any stakeable coins yet. Buy ETH, SOL, ADA, DOT, ATOM, or other PoS coins to get started.
                <div style={{ marginTop: 16, fontSize: 11 }}>
                  Stakeable coins: {Object.keys(STAKEABLE_COINS).join(', ')}
                </div>
              </div>
            ) : (
              <>
                <div className="tab-row">
                  {TIERS.map(t => (
                    <button key={t} className={`tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>
                      {t === 'all' ? 'All' : TIER_META[t]?.label || t}
                    </button>
                  ))}
                </div>
                {loading ? (
                  <div className="grid">
                    {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 260 }} />)}
                  </div>
                ) : (
                  <div className="grid">
                    {filteredStakeable.map(item => (
                      <StakeCard key={item.coin} item={item} onStake={handleStake} staking={staking} />
                    ))}
                    {filteredStakeable.length === 0 && (
                      <div style={{ color: 'var(--muted)', fontSize: 13, padding: 20 }}>
                        No {activeTab} tier coins in your portfolio.
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Educational callout */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 22px', marginTop: 8 }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13, marginBottom: 10 }}>📚 How Staking Works</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14, fontSize: 11, color: 'var(--muted)', lineHeight: 1.7 }}>
            <div><span style={{ color: '#00e5a0', fontWeight: 700 }}>Flexible</span> — Stake and unstake anytime. Lowest yield (~3–5% APY). Good for coins like ETH, ADA, ALGO.</div>
            <div><span style={{ color: '#60a5fa', fontWeight: 700 }}>7-Day Lock</span> — Moderate yield (~5–7% APY). Coins are locked for 7 days. Models SOL, MATIC unbonding.</div>
            <div><span style={{ color: '#f59e0b', fontWeight: 700 }}>30-Day Lock</span> — Higher yield (~8–11% APY). 30-day commitment. Models AVAX, NEAR, APT.</div>
            <div><span style={{ color: '#f43f5e', fontWeight: 700 }}>90-Day Lock</span> — Maximum yield (~12–17% APY). Mirrors DOT's 28-day and ATOM's 21-day unbonding. Can't sell if price crashes.</div>
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: '#475569' }}>
            ⚠ Early unstaking forfeits any rewards not yet credited. Rewards distributed when your teacher refreshes prices or runs the daily snapshot.
          </div>
        </div>
      </div>
    </>
  );
}
