"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { STAKEABLE_COINS, TIER_META } from "@/lib/staking";

const fmt = (n, dec = 2) => isNaN(+n) ? '0' : (+n).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtUSD = n => '$' + fmt(n);
const fmtPct = n => (+(n * 100)).toFixed(1) + '%';

function timeLeft(date) {
  if (!date) return null;
  const ms = new Date(date) - Date.now();
  if (ms <= 0) return null;
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function TierBadge({ tier }) {
  const m = TIER_META[tier] || TIER_META.flexible;
  return (
    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, padding: '2px 7px', borderRadius: 6, background: m.bg, color: m.color, textTransform: 'uppercase' }}>
      {m.label}
    </span>
  );
}

// ── Claimable position card ──────────────────────────────────────────────────
function ClaimableCard({ pos, onClaim, claiming }) {
  const info = STAKEABLE_COINS[pos.coin] || {};
  const tier = TIER_META[info.tier || 'flexible'];
  const autoRestakeIn = pos.autoRestakeAt ? timeLeft(pos.autoRestakeAt) : null;
  const rewards = parseFloat(pos.claimable_rewards || 0);

  return (
    <div style={{ background: 'var(--surface)', border: `2px solid ${tier.color}`, borderRadius: 20, padding: 20, display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', boxShadow: `0 0 24px ${tier.color}33` }}>
      <div style={{ position: 'absolute', top: -1, right: 16, background: tier.color, color: '#000', fontSize: 9, fontWeight: 800, letterSpacing: 1, padding: '3px 10px', borderRadius: '0 0 8px 8px', textTransform: 'uppercase' }}>
        Ready to Claim
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
        <span style={{ fontSize: 28 }}>{info.emoji || '🪙'}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16 }}>{pos.coin}</div>
          <TierBadge tier={info.tier || 'flexible'} />
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase' }}>APY</div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18, color: tier.color }}>{fmtPct(pos.apy)}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '10px 12px' }}>
          <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 }}>Staked</div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700 }}>{fmt(pos.quantity, 6)} {pos.coin}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{fmtUSD(pos.currentValue)}</div>
        </div>
        <div style={{ background: 'rgba(0,229,160,.08)', borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(0,229,160,.2)' }}>
          <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 }}>Rewards Earned</div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16, color: '#00e5a0' }}>{fmt(rewards, 6)} {pos.coin}</div>
        </div>
      </div>

      <button
        onClick={() => onClaim(pos)}
        disabled={claiming === pos.id}
        style={{ padding: '12px 0', borderRadius: 12, border: 'none', background: tier.color, color: '#000', fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 800, cursor: 'pointer', letterSpacing: 0.5, opacity: claiming === pos.id ? 0.7 : 1, transition: 'all .2s' }}
      >
        {claiming === pos.id ? 'Claiming…' : `⚡ Claim ${fmt(pos.quantity, 4)} ${pos.coin} + ${fmt(rewards, 6)} rewards`}
      </button>

      {autoRestakeIn && (
        <div style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'center', marginTop: -6 }}>
          Auto-restakes in <strong style={{ color: tier.color }}>{autoRestakeIn}</strong> if not claimed
        </div>
      )}
    </div>
  );
}

// ── Active position card ─────────────────────────────────────────────────────
function ActiveCard({ pos, onUnstake, unstaking }) {
  const info = STAKEABLE_COINS[pos.coin] || {};
  const tier = TIER_META[info.tier || 'flexible'];
  const isFlexible = pos.lock_days === 0;
  const remaining = timeLeft(pos.unlocks_at);
  const totalShown = parseFloat(pos.total_rewards_earned) + pos.accruedRewards; // in coins
  const totalShownUsd = totalShown * (pos.price || 0);

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 28 }}>{info.emoji || '🪙'}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15 }}>{pos.coin}</div>
          <TierBadge tier={info.tier || 'flexible'} />
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 17, color: tier.color }}>{fmtPct(pos.apy)}</div>
          <div style={{ fontSize: 9, color: 'var(--muted)' }}>APY</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '9px 12px' }}>
          <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 }}>Staked</div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{fmt(pos.quantity, 6)} {pos.coin}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{fmtUSD(pos.currentValue)}</div>
        </div>
        <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '9px 12px' }}>
          <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 }}>Accruing</div>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#00e5a0' }}>{fmt(totalShown, 6)} {pos.coin}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>≈ {fmtUSD(totalShownUsd)}</div>
        </div>
      </div>

      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
        {isFlexible
          ? '🔓 Flexible — unstake anytime, keeps all rewards'
          : remaining
          ? `🔒 Unlocks in ${remaining}`
          : '🔒 Locked'}
      </div>

      <button
        onClick={() => onUnstake(pos)}
        disabled={unstaking === pos.id}
        style={{
          padding: '9px 0', borderRadius: 10, border: `1px solid ${!isFlexible ? 'rgba(244,63,94,.4)' : 'rgba(0,229,160,.3)'}`,
          background: !isFlexible ? 'rgba(244,63,94,.08)' : 'rgba(0,229,160,.08)',
          color: !isFlexible ? '#f43f5e' : '#00e5a0',
          fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .2s',
          opacity: unstaking === pos.id ? 0.6 : 1,
        }}
      >
        {unstaking === pos.id ? 'Processing…' : isFlexible ? 'Unstake & Collect Rewards' : '⚠ Early Unstake (forfeits rewards)'}
      </button>

      {!isFlexible && (
        <div style={{ fontSize: 10, color: '#f43f5e', textAlign: 'center', marginTop: -6 }}>
          Early unstaking forfeits {fmt(totalShown, 6)} {pos.coin} in accumulated rewards
        </div>
      )}
    </div>
  );
}

// ── Unclaimed rewards card (auto-restaked positions) ─────────────────────────
function UnclaimedRewardCard({ pos, onClaim, claiming }) {
  const info = STAKEABLE_COINS[pos.coin] || {};
  const tier = TIER_META[info.tier || 'flexible'];
  const rewards = parseFloat(pos.claimable_rewards || 0);

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid rgba(0,229,160,.3)', borderRadius: 16, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 24 }}>{info.emoji || '🪙'}</span>
      <div style={{ flex: 1, minWidth: 120 }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13 }}>{pos.coin} Staking Rewards</div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
          Period ending {new Date(pos.unlocks_at || pos.staked_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · auto-restaked
        </div>
      </div>
      <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18, color: '#00e5a0' }}>{fmt(rewards, 6)} {pos.coin}</div>
      <button
        onClick={() => onClaim(pos)}
        disabled={claiming === pos.id}
        style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: 'rgba(0,229,160,.2)', color: '#00e5a0', fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', opacity: claiming === pos.id ? 0.6 : 1 }}
      >
        {claiming === pos.id ? 'Claiming…' : 'Claim Rewards'}
      </button>
    </div>
  );
}

// ── Stake form card ──────────────────────────────────────────────────────────
function StakeCard({ item, onStake, staking }) {
  const [qty, setQty] = useState('');
  const tier = TIER_META[item.tier] || TIER_META.flexible;
  const qtyNum = parseFloat(qty) || 0;
  const isValid = qtyNum > 0 && qtyNum <= item.quantity;

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 20, display: 'flex', flexDirection: 'column', gap: 10, transition: 'border-color .2s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = tier.color + '55'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 28 }}>{item.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15 }}>{item.name}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 3, alignItems: 'center' }}>
            <TierBadge tier={item.tier} />
            <span style={{ fontSize: 11, color: tier.color, fontWeight: 700 }}>{fmtPct(item.apy)} APY</span>
          </div>
        </div>
      </div>
      <div style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.5 }}>{item.note}</div>
      <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '8px 12px', fontSize: 11 }}>
        <span style={{ color: 'var(--muted)' }}>You hold: </span>
        <span style={{ fontWeight: 600 }}>{fmt(item.quantity, 6)} {item.coin}</span>
        <span style={{ color: 'var(--muted)' }}> ≈ {fmtUSD(item.value)}</span>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input type="number" min={0} max={item.quantity} step="any" placeholder="0.00" value={qty}
            onChange={e => setQty(e.target.value)}
            style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 52px 9px 12px', color: 'var(--text)', fontFamily: "'DM Mono',monospace", fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>{item.coin}</span>
        </div>
        <button onClick={() => setQty(String(item.quantity))}
          style={{ padding: '9px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--muted)', fontFamily: "'DM Mono',monospace", fontSize: 10, cursor: 'pointer' }}>
          MAX
        </button>
      </div>
      {qtyNum > 0 && (
        <div style={{ fontSize: 10, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
          <span>≈ {fmtUSD(qtyNum * item.price)}</span>
          <span style={{ color: tier.color }}>Est. annual: {fmt(qtyNum * item.apy, 6)} {item.coin}</span>
        </div>
      )}
      <button
        onClick={() => { if (isValid) onStake(item.coin, qtyNum).then(() => setQty('')); }}
        disabled={!isValid || staking === item.coin}
        style={{ padding: '10px 0', borderRadius: 10, border: 'none', background: isValid ? tier.color : 'var(--surface2)', color: isValid ? '#000' : 'var(--muted)', fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, cursor: isValid ? 'pointer' : 'not-allowed', transition: 'all .2s' }}>
        {staking === item.coin ? 'Staking…' : item.lockDays > 0 ? `Stake (${item.lockDays}-day lock)` : 'Stake (flexible)'}
      </button>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function StakePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [staking, setStaking] = useState(null);
  const [unstaking, setUnstaking] = useState(null);
  const [claiming, setClaiming] = useState(null);
  const [claimingAll, setClaimingAll] = useState(false);
  const [flash, setFlash] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => { if (status === 'unauthenticated') router.replace('/'); }, [status, router]);

  const load = () => {
    if (status !== 'authenticated') return;
    fetch('/api/staking').then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(load, [status]);

  const showFlash = (type, msg) => { setFlash({ type, msg }); setTimeout(() => setFlash(null), 4000); };

  const handleStake = async (coin, quantity) => {
    setStaking(coin);
    const res = await fetch('/api/staking', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stake', coin, quantity, classId: data?.classId }),
    }).then(r => r.json()).catch(() => ({ error: 'Network error' }));
    setStaking(null);
    if (res.error) showFlash('error', res.error);
    else { showFlash('success', `✅ ${quantity} ${coin} staked!`); load(); }
    return res;
  };

  const handleClaim = async (pos) => {
    setClaiming(pos.id);
    const res = await fetch('/api/staking', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'claim', positionId: pos.id, classId: data?.classId }),
    }).then(r => r.json()).catch(() => ({ error: 'Network error' }));
    setClaiming(null);
    if (res.error) showFlash('error', res.error);
    else {
      const parts = [];
      if (res.coinsReturned) parts.push(`${fmt(pos.quantity, 4)} ${pos.coin} returned`);
      if (res.rewardCredited > 0) parts.push(`+${fmt(res.rewardCredited, 6)} ${res.rewardCoin || pos.coin} rewards`);
      showFlash('success', `⚡ Claimed! ${parts.join(' · ')}`);
      load();
    }
  };

  const handleClaimAll = async () => {
    setClaimingAll(true);
    const res = await fetch('/api/staking', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'claim-all', classId: data?.classId }),
    }).then(r => r.json()).catch(() => ({ error: 'Network error' }));
    setClaimingAll(false);
    if (res.error) showFlash('error', res.error);
    else {
      const parts = [];
      if (res.coinsReturned?.length) parts.push(res.coinsReturned.map(c => `${fmt(c.quantity, 4)} ${c.coin}`).join(', ') + ' returned');
      if (res.rewardSummary?.length) parts.push(res.rewardSummary.map(r => `+${fmt(r.quantity, 6)} ${r.coin}`).join(', ') + ' rewards');
      showFlash('success', `⚡ Claimed all! ${parts.join(' · ')}`);
      load();
    }
  };

  const handleUnstake = async (pos) => {
    const isFlexible = pos.lock_days === 0;
    const totalShown = parseFloat(pos.total_rewards_earned) + pos.accruedRewards;
    if (!isFlexible && !confirm(`Early unstake? You'll forfeit ${fmt(totalShown, 6)} ${pos.coin} in accumulated rewards. Your ${fmt(pos.quantity, 4)} ${pos.coin} will be returned.`)) return;
    setUnstaking(pos.id);
    const res = await fetch('/api/staking', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'unstake', positionId: pos.id, classId: data?.classId }),
    }).then(r => r.json()).catch(() => ({ error: 'Network error' }));
    setUnstaking(null);
    if (res.error) showFlash('error', res.error);
    else {
      const msg = isFlexible
        ? `✅ Unstaked! +${fmt(res.paidOut, 6)} ${pos.coin} rewards added to your wallet.`
        : `↩ Unstaked early. ${fmt(pos.quantity, 4)} ${pos.coin} returned.`;
      showFlash('success', msg);
      load();
    }
  };

  if (status === 'loading' || status === 'unauthenticated') {
    return <div style={{ background: 'var(--bg,#080c14)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>Loading...</div>;
  }

  const allPositions  = data?.positions || [];
  const claimable     = allPositions.filter(p => p.status === 'claimable');
  const active        = allPositions.filter(p => p.status === 'active');
  const restaked      = allPositions.filter(p => p.status === 'restaked');
  const stakeable     = data?.stakeable || [];
  const enabled       = data?.config?.enabled;

  const totalStaked   = active.reduce((s, p) => s + p.currentValue, 0)
                      + claimable.reduce((s, p) => s + p.currentValue, 0);
  // Rewards are now in native coin tokens — convert to USD for aggregate display
  const totalAccruing = active.reduce((s, p) => s + (parseFloat(p.total_rewards_earned) + p.accruedRewards) * (p.price || 0), 0);
  const totalClaimable = [...claimable, ...restaked].reduce((s, p) => s + parseFloat(p.claimable_rewards || 0) * (p.price || 0), 0);

  const TIERS = ['all', 'flexible', 'short', 'standard', 'long'];
  const filteredStakeable = activeTab === 'all' ? stakeable : stakeable.filter(s => s.tier === activeTab);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:var(--bg);color:var(--text);font-family:'DM Mono',monospace;min-height:100vh}
        .page{max-width:1100px;margin:0 auto;padding:24px 16px}
        .stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:28px}
        .stat{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:16px 20px}
        .stat-label{font-size:9px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;margin-bottom:6px}
        .stat-value{font-family:'Syne',sans-serif;font-weight:800;font-size:22px}
        .section-title{font-family:'Syne',sans-serif;font-weight:700;font-size:15px;margin-bottom:12px;color:var(--text);display:flex;align-items:center;gap:8px}
        .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;margin-bottom:32px}
        .tab-row{display:flex;gap:4px;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:3px;margin-bottom:14px;width:fit-content}
        .tab{padding:6px 14px;border-radius:8px;border:none;background:transparent;color:var(--muted);font-family:'DM Mono',monospace;font-size:11px;cursor:pointer;transition:all .2s;text-transform:capitalize}
        .tab.active{background:var(--surface2);color:var(--accent);border:1px solid var(--border)}
        .flash{position:fixed;top:24px;right:24px;z-index:9999;padding:14px 20px;border-radius:14px;font-size:13px;font-weight:600;max-width:360px;animation:slideIn .3s ease}
        .flash.success{background:rgba(0,229,160,.15);border:1px solid rgba(0,229,160,.4);color:#00e5a0}
        .flash.error{background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.4);color:#ef4444}
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
            Lock PoS coins to earn yield · claim rewards when ready · unclaimed positions auto-restake after 24 hours
          </div>
        </div>

        {flash && <div className={`flash ${flash.type}`} style={{ marginTop: 12 }}>{flash.msg}</div>}

        {!loading && !enabled && (
          <div style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.3)', borderRadius: 16, padding: '16px 20px', margin: '20px 0', fontSize: 13, color: '#f59e0b' }}>
            ⏸ Staking is not enabled for your class yet. Ask your teacher to enable it in Controls.
          </div>
        )}

        {/* Stats */}
        {loading ? (
          <div className="stats-row" style={{ marginTop: 20 }}>{[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 80 }} />)}</div>
        ) : (
          <div className="stats-row" style={{ marginTop: 20 }}>
            <div className="stat"><div className="stat-label">Total Locked</div><div className="stat-value" style={{ color: 'var(--accent)' }}>{fmtUSD(totalStaked)}</div></div>
            <div className="stat"><div className="stat-label">Accruing</div><div className="stat-value" style={{ color: '#00e5a0', fontSize: 18 }}>{fmtUSD(totalAccruing)}</div></div>
            <div className="stat"><div className="stat-label">Ready to Claim</div><div className="stat-value" style={{ color: totalClaimable > 0 ? '#f59e0b' : 'var(--muted)' }}>{fmtUSD(totalClaimable)}</div></div>
            <div className="stat"><div className="stat-label">Active Positions</div><div className="stat-value">{active.length + claimable.length}</div></div>
          </div>
        )}

        {/* Claim All banner — shown whenever there are 2+ claimable/restaked items */}
        {(claimable.length + restaked.length) >= 2 && (
          <div style={{ background: 'rgba(0,229,160,.08)', border: '1px solid rgba(0,229,160,.35)', borderRadius: 16, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, color: '#00e5a0' }}>
                ⚡ {claimable.length + restaked.length} pending claims · {fmtUSD(totalClaimable)} total
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                Claim all at once, or pick individual periods below
              </div>
            </div>
            <button
              onClick={handleClaimAll}
              disabled={claimingAll}
              style={{ padding: '10px 24px', borderRadius: 12, border: 'none', background: '#00e5a0', color: '#000', fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap', opacity: claimingAll ? 0.7 : 1 }}
            >
              {claimingAll ? 'Claiming…' : `Claim All ${fmtUSD(totalClaimable)}`}
            </button>
          </div>
        )}

        {/* 1. Ready to claim (most urgent, top of page) */}
        {claimable.length > 0 && (
          <>
            <div className="section-title">
              <span style={{ background: 'rgba(245,158,11,.15)', color: '#f59e0b', borderRadius: 8, padding: '2px 8px', fontSize: 11 }}>⚡ {claimable.length}</span>
              Ready to Claim
            </div>
            <div className="grid">
              {claimable.map(pos => (
                <ClaimableCard key={pos.id} pos={pos} onClaim={handleClaim} claiming={claiming} />
              ))}
            </div>
          </>
        )}

        {/* 2. Unclaimed rewards from auto-restaked positions */}
        {restaked.length > 0 && (
          <>
            <div className="section-title">
              💰 Unclaimed Rewards
              {restaked.length > 1 && <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 400 }}> — {restaked.length} periods</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
              {restaked.map(pos => (
                <UnclaimedRewardCard key={pos.id} pos={pos} onClaim={handleClaim} claiming={claiming} />
              ))}
            </div>
          </>
        )}

        {/* 3. Active positions */}
        {active.length > 0 && (
          <>
            <div className="section-title">Active Stakes</div>
            <div className="grid">
              {active.map(pos => (
                <ActiveCard key={pos.id} pos={pos} onUnstake={handleUnstake} unstaking={unstaking} />
              ))}
            </div>
          </>
        )}

        {/* 4. Stake more */}
        {enabled && (
          <>
            <div className="section-title" style={{ marginBottom: 10 }}>Stake a Coin</div>
            {stakeable.length === 0 && !loading ? (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13, marginBottom: 24 }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>🏦</div>
                You don't hold any stakeable coins. Buy ETH, SOL, ADA, DOT, ATOM, or other PoS coins to get started.
                <div style={{ marginTop: 12, fontSize: 10 }}>Stakeable: {Object.keys(STAKEABLE_COINS).join(', ')}</div>
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
                  <div className="grid">{[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 260 }} />)}</div>
                ) : (
                  <div className="grid">
                    {filteredStakeable.map(item => (
                      <StakeCard key={item.coin} item={item} onStake={handleStake} staking={staking} />
                    ))}
                    {filteredStakeable.length === 0 && (
                      <div style={{ color: 'var(--muted)', fontSize: 13, padding: 20 }}>No {activeTab} tier coins in your portfolio.</div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Educational footer */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 22px', marginTop: 8 }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13, marginBottom: 10 }}>📚 How Staking Works</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14, fontSize: 11, color: 'var(--muted)', lineHeight: 1.7 }}>
            <div><span style={{ color: '#00e5a0', fontWeight: 700 }}>Earning</span> — Rewards accrue daily but stay locked until you claim. Flexible positions pay out on unstake.</div>
            <div><span style={{ color: '#f59e0b', fontWeight: 700 }}>Claiming</span> — When a lock expires, hit Claim to receive your coins + rewards. You have 24 hours before auto-restake kicks in.</div>
            <div><span style={{ color: '#60a5fa', fontWeight: 700 }}>Auto-Restake</span> — If you don't claim in time, your original coins automatically re-stake for another cycle. Rewards stay claimable separately.</div>
            <div><span style={{ color: '#f43f5e', fontWeight: 700 }}>Early Exit</span> — Flexible positions can be unstaked anytime (keeps all rewards). Breaking a lock forfeits all accumulated rewards — coins always return.</div>
          </div>
        </div>
      </div>
    </>
  );
}
