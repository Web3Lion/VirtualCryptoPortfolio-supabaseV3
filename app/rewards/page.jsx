"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { applyTheme, getTheme } from "@/lib/theme";

const CAT_LABELS = { cash: '💸 Cash Drops', flair: '✨ Leaderboard Flair', title: '🏷️ Profile Titles' };
const CAT_ORDER = ['cash', 'flair', 'title'];

export default function RewardsStore() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(null);
  const [flash, setFlash] = useState(null);

  useEffect(() => { applyTheme(getTheme()); }, []);
  useEffect(() => { if (status === 'unauthenticated') router.replace('/'); }, [status, router]);

  const load = () => {
    if (status !== 'authenticated') return;
    fetch('/api/rewards/store')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(load, [status]);

  const buy = async (item) => {
    if (!data?.classId || buying) return;
    setBuying(item.id);
    const res = await fetch('/api/rewards/store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classId: data.classId, itemId: item.id }),
    }).then(r => r.json()).catch(() => ({ error: 'Network error' }));
    setBuying(null);
    if (res.error) { setFlash({ type: 'error', msg: res.error }); }
    else {
      setFlash({ type: 'success', msg: item.category === 'cash'
        ? `+$${item.cashValue} added to your portfolio!`
        : `${item.emoji} ${item.name} unlocked!` });
      load();
    }
    setTimeout(() => setFlash(null), 3500);
  };

  if (status === 'loading' || status === 'unauthenticated') {
    return <div style={{ background: 'var(--bg,#080c14)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>Loading...</div>;
  }

  const items = data?.items || [];
  const owned = data?.owned || [];
  const balance = data?.balance || 0;
  const byCategory = CAT_ORDER.map(cat => ({ cat, items: items.filter(i => i.category === cat) })).filter(g => g.items.length);
  const activeFlair = owned.find(id => id.startsWith('flair_'));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--bg:#080c14;--surface:#0f172a;--surface2:#1a2235;--border:#1e293b;--accent:#00e5a0;--text:#e2e8f0;--muted:#475569}
        body{background:var(--bg);color:var(--text);font-family:'DM Mono',monospace;min-height:100vh}
        .page{max-width:960px;margin:0 auto;padding:24px 16px}
        .balance-card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:24px 28px;margin-bottom:28px;display:flex;align-items:center;gap:24px}
        .balance-num{font-family:'Syne',sans-serif;font-weight:800;font-size:52px;color:var(--accent);line-height:1}
        .cat-title{font-family:'Syne',sans-serif;font-weight:700;font-size:15px;margin-bottom:14px;color:var(--text)}
        .store-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;margin-bottom:32px}
        .store-card{background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:20px;display:flex;flex-direction:column;gap:10px;transition:all .2s;position:relative}
        .store-card:hover{border-color:rgba(0,229,160,.3);box-shadow:0 0 20px rgba(0,229,160,.06)}
        .store-card.owned{border-color:rgba(0,229,160,.4);background:rgba(0,229,160,.05)}
        .store-card.active-flair{border-color:#f59e0b;background:rgba(245,158,11,.06)}
        .store-emoji{font-size:36px;line-height:1}
        .store-name{font-family:'Syne',sans-serif;font-weight:700;font-size:14px}
        .store-desc{font-size:11px;color:#94a3b8;line-height:1.5}
        .store-price{font-size:13px;color:var(--accent);font-weight:600;margin-top:auto}
        .buy-btn{padding:9px 0;border-radius:10px;border:none;cursor:pointer;font-family:'DM Mono',monospace;font-size:12px;font-weight:600;letter-spacing:.5px;transition:all .2s;width:100%}
        .buy-btn.primary{background:rgba(0,229,160,.15);color:var(--accent);border:1px solid rgba(0,229,160,.3)}
        .buy-btn.primary:hover:not(:disabled){background:rgba(0,229,160,.25)}
        .buy-btn.disabled{background:var(--surface2);color:#475569;cursor:not-allowed;border:1px solid var(--border)}
        .owned-badge{position:absolute;top:12px;right:12px;font-size:11px;padding:2px 8px;border-radius:20px;background:rgba(0,229,160,.15);color:#00e5a0;font-weight:600}
        .active-badge{position:absolute;top:12px;right:12px;font-size:11px;padding:2px 8px;border-radius:20px;background:rgba(245,158,11,.2);color:#f59e0b;font-weight:600}
        .flash{position:fixed;top:24px;right:24px;z-index:9999;padding:14px 20px;border-radius:14px;font-size:13px;font-weight:600;animation:toastIn .3s ease}
        .flash.success{background:rgba(0,229,160,.15);border:1px solid rgba(0,229,160,.4);color:#00e5a0}
        .flash.error{background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.4);color:#ef4444}
        @keyframes toastIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:none}}
        .skeleton{background:linear-gradient(90deg,var(--surface) 25%,var(--surface2) 50%,var(--surface) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:12px}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
      `}</style>
      <div className="page">
        <Nav active="store" />

        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 32, letterSpacing: -1, marginBottom: 4 }}>
          🏪 <span style={{ color: 'var(--accent)' }}>Store</span>
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 24 }}>Spend your tokens on cash drops, flair, and profile titles</div>

        {flash && <div className={`flash ${flash.type}`}>{flash.msg}</div>}

        {loading ? (
          <div className="skeleton" style={{ height: 100, marginBottom: 24 }} />
        ) : (
          <div className="balance-card">
            <div className="balance-num">{balance.toLocaleString()}</div>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>tokens available</div>
              {activeFlair && (
                <div style={{ fontSize: 12, color: '#f59e0b', marginTop: 4 }}>
                  Active flair: {items.find(i => i.id === activeFlair)?.emoji} {items.find(i => i.id === activeFlair)?.name}
                </div>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 14 }}>
            {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height: 180 }} />)}
          </div>
        ) : byCategory.map(({ cat, items: catItems }) => (
          <div key={cat}>
            <div className="cat-title">{CAT_LABELS[cat] || cat}</div>
            <div className="store-grid">
              {catItems.map(item => {
                const isOwned = owned.includes(item.id);
                const isActiveFlair = item.category === 'flair' && activeFlair === item.id;
                const canAfford = balance >= item.price;
                const isBuying = buying === item.id;
                return (
                  <div key={item.id} className={`store-card${isActiveFlair ? ' active-flair' : isOwned ? ' owned' : ''}`}>
                    {isActiveFlair && <span className="active-badge">Active</span>}
                    {isOwned && !isActiveFlair && <span className="owned-badge">Owned</span>}
                    <div className="store-emoji">{item.emoji}</div>
                    <div className="store-name">{item.name}</div>
                    <div className="store-desc">{item.desc}</div>
                    <div className="store-price">{item.price.toLocaleString()} tokens</div>
                    <button
                      className={`buy-btn ${!canAfford || isBuying ? 'disabled' : 'primary'}`}
                      disabled={!canAfford || isBuying}
                      onClick={() => buy(item)}
                    >
                      {isBuying ? 'Buying...' : isActiveFlair ? 'Active' : isOwned && item.category !== 'cash' ? 'Buy Again' : !canAfford ? 'Not enough tokens' : 'Buy'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
