"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { applyTheme, getTheme } from "@/lib/theme";
import { COSMETIC_THEMES, setCosmetic, getCosmetic, applyCosmetic, saveOwnedThemes } from "@/lib/cosmetics";

const CAT_LABELS = { flair: '✨ Leaderboard Flair', title: '🏷️ Profile Titles', theme: '🎨 Portfolio Themes', freeze: '🧊 Streak Protection' };
const CAT_ORDER  = ['theme', 'flair', 'title', 'freeze'];

const THEME_SWATCHES = {
  theme_gold:   ['#0c0800','#f59e0b','#fef3c7','#f59e0b','#ef4444'],
  theme_arcade: ['#06000f','#ff00ff','#ffffff','#00ffcc','#ff0055'],
  theme_dino:   ['#030c03','#4ade80','#dcfce7','#4ade80','#f87171'],
};

function ThemeSwatch({ id }) {
  const [bg, accent, text, up, down] = THEME_SWATCHES[id] || [];
  if (!bg) return null;
  return (
    <div style={{ display:'flex', gap:4, marginTop:8, alignItems:'center' }}>
      <div style={{ width:28, height:28, borderRadius:6, background:bg, border:`2px solid ${accent}`, boxShadow:`0 0 8px ${accent}66`, flexShrink:0 }} />
      <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
        <div style={{ display:'flex', gap:3 }}>
          {[accent, text, up, down].map((c, i) => (
            <div key={i} style={{ width:14, height:14, borderRadius:3, background:c }} />
          ))}
        </div>
        <div style={{ height:4, borderRadius:2, background:`linear-gradient(90deg,${accent},${up})`, width:60 }} />
      </div>
    </div>
  );
}

export default function RewardsStore() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(null);
  const [flash, setFlash] = useState(null);
  const [localTheme, setLocalTheme] = useState(null);

  useEffect(() => {
    const c = getCosmetic();
    setLocalTheme(c);
    if (c) applyCosmetic(c);
    else applyTheme(getTheme());
  }, []);
  useEffect(() => { if (status === 'unauthenticated') router.replace('/'); }, [status, router]);

  const load = () => {
    if (status !== 'authenticated') return;
    fetch('/api/rewards/store')
      .then(r => r.json())
      .then(d => {
        setData(d);
        setLoading(false);
        const ownedThemeIds = (d.owned || []).filter(id => id.startsWith('theme_'));
        saveOwnedThemes(ownedThemeIds);
      })
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
    if (res.error) {
      setFlash({ type: 'error', msg: res.error });
    } else {
      if (item.category === 'theme') {
        setCosmetic(item.id);
        setLocalTheme(item.id);
        setFlash({ type: 'success', msg: `${item.emoji} ${item.name} theme applied!` });
      } else {
        setFlash({ type: 'success', msg: `${item.emoji} ${item.name} unlocked!` });
      }
      load();
    }
    setTimeout(() => setFlash(null), 3500);
  };

  const removeTheme = () => {
    setCosmetic(null);
    setLocalTheme(null);
    applyTheme(getTheme());
    setFlash({ type: 'success', msg: 'Theme removed — back to default.' });
    setTimeout(() => setFlash(null), 2500);
  };

  if (status === 'loading' || status === 'unauthenticated') {
    return <div style={{ background:'var(--bg,#080c14)', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--muted)' }}>Loading...</div>;
  }

  const items     = data?.items || [];
  const owned     = data?.owned || [];
  const balance   = data?.balance || 0;
  const activeFlair = data?.activeFlair || null;
  const serverTheme = data?.activeTheme || null;
  const activeTheme = localTheme || serverTheme;

  const byCategory = CAT_ORDER.map(cat => ({ cat, items: items.filter(i => i.category === cat) })).filter(g => g.items.length);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:var(--bg);color:var(--text);font-family:'DM Mono',monospace;min-height:100vh}
        .page{max-width:960px;margin:0 auto;padding:24px 16px}
        .balance-card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:22px 28px;margin-bottom:28px;display:flex;align-items:center;gap:24px;flex-wrap:wrap}
        .balance-num{font-family:'Syne',sans-serif;font-weight:800;font-size:48px;color:var(--accent);line-height:1}
        .cat-title{font-family:'Syne',sans-serif;font-weight:700;font-size:15px;margin-bottom:14px;color:var(--text)}
        .store-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px;margin-bottom:32px}
        .store-card{background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:20px;display:flex;flex-direction:column;gap:8px;transition:all .2s;position:relative}
        .store-card:hover{border-color:rgba(0,229,160,.3);box-shadow:0 0 20px rgba(0,229,160,.06)}
        .store-card.active-item{border-color:var(--accent);background:rgba(0,229,160,.06);box-shadow:0 0 18px rgba(0,229,160,.1)}
        .store-emoji{font-size:34px;line-height:1}
        .store-name{font-family:'Syne',sans-serif;font-weight:700;font-size:14px}
        .store-desc{font-size:11px;color:#94a3b8;line-height:1.55;flex:1}
        .store-price{font-size:12px;color:var(--accent);font-weight:600;margin-top:4px}
        .buy-btn{padding:9px 0;border-radius:10px;border:none;cursor:pointer;font-family:'DM Mono',monospace;font-size:12px;font-weight:600;letter-spacing:.5px;transition:all .2s;width:100%}
        .buy-btn.primary{background:rgba(0,229,160,.15);color:var(--accent);border:1px solid rgba(0,229,160,.3)}
        .buy-btn.primary:hover:not(:disabled){background:rgba(0,229,160,.28)}
        .buy-btn.muted{background:var(--surface2);color:#94a3b8;border:1px solid var(--border)}
        .buy-btn.muted:hover:not(:disabled){border-color:var(--accent);color:var(--accent)}
        .buy-btn.disabled{background:var(--surface2);color:#334155;cursor:not-allowed;border:1px solid var(--border)}
        .active-pill{position:absolute;top:12px;right:12px;font-size:10px;padding:2px 8px;border-radius:20px;background:rgba(0,229,160,.2);color:#00e5a0;font-weight:700;letter-spacing:.5px}
        .flash{position:fixed;top:24px;right:24px;z-index:9999;padding:14px 20px;border-radius:14px;font-size:13px;font-weight:600;animation:slideIn .3s ease;max-width:300px}
        .flash.success{background:rgba(0,229,160,.15);border:1px solid rgba(0,229,160,.4);color:#00e5a0}
        .flash.error{background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.4);color:#ef4444}
        @keyframes slideIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:none}}
        .skeleton{background:linear-gradient(90deg,var(--surface) 25%,var(--surface2) 50%,var(--surface) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:12px}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
      `}</style>
      <div className="page">
        <Nav active="store" />

        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:32, letterSpacing:-1, marginBottom:4 }}>
          🏪 <span style={{ color:'var(--accent)' }}>Store</span>
        </div>
        <div style={{ fontSize:11, color:'#94a3b8', marginBottom:24 }}>Spend your ClassReward Tokens on themes, flair, and titles — themes switch instantly across the whole app</div>

        {flash && <div className={`flash ${flash.type}`}>{flash.msg}</div>}

        {loading ? (
          <div className="skeleton" style={{ height:90, marginBottom:24 }} />
        ) : (
          <div className="balance-card">
            <div className="balance-num">{balance.toLocaleString()}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11, color:'#94a3b8', marginBottom:6 }}>ClassReward Tokens available</div>
              {activeTheme && COSMETIC_THEMES[activeTheme] && (
                <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:4 }}>
                  <span style={{ fontSize:13 }}>{COSMETIC_THEMES[activeTheme].emoji} {COSMETIC_THEMES[activeTheme].name} theme active</span>
                  <button onClick={removeTheme} style={{ fontSize:10, color:'#475569', background:'none', border:'1px solid #1e293b', borderRadius:6, padding:'2px 8px', cursor:'pointer' }}>Remove</button>
                </div>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(210px,1fr))', gap:14 }}>
            {[1,2,3,4,5,6,7].map(i => <div key={i} className="skeleton" style={{ height:200 }} />)}
          </div>
        ) : byCategory.map(({ cat, items: catItems }) => (
          <div key={cat}>
            <div className="cat-title">{CAT_LABELS[cat] || cat}</div>
            <div className="store-grid">
              {catItems.map(item => {
                const isActiveTheme  = item.category === 'theme'  && activeTheme  === item.id;
                const isActiveFlair  = item.category === 'flair'  && activeFlair  === item.id;
                const isAnyActive    = isActiveTheme || isActiveFlair;
                const canAfford      = balance >= item.price;
                const isBuying       = buying === item.id;
                const btnLabel       = isBuying ? 'Applying...' : isAnyActive ? 'Active' : !canAfford ? 'Not enough ClassReward Tokens' : item.category === 'theme' ? 'Apply Theme' : item.category === 'flair' ? (activeFlair ? 'Switch Flair' : 'Equip Flair') : item.category === 'freeze' ? 'Buy Freeze' : 'Unlock';
                return (
                  <div key={item.id} className={`store-card${isAnyActive ? ' active-item' : ''}`}>
                    {isAnyActive && <span className="active-pill">ACTIVE</span>}
                    <span className="store-emoji">{item.emoji}</span>
                    <div className="store-name">{item.name}</div>
                    <div className="store-desc">{item.desc}</div>
                    {item.category === 'theme' && <ThemeSwatch id={item.id} />}
                    {item.category === 'freeze' && (data?.freezesAvailable || 0) > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--accent)' }}>You own {data.freezesAvailable} 🧊</div>
                    )}
                    <div className="store-price">{item.price.toLocaleString()} ClassReward Tokens{(item.category === 'flair' && activeFlair && !isActiveFlair) || (item.category === 'theme' && activeTheme && !isActiveTheme) ? ' (swap — old refunded)' : ''}</div>
                    <button
                      className={`buy-btn ${isAnyActive ? 'muted' : !canAfford || isBuying ? 'disabled' : 'primary'}`}
                      disabled={isAnyActive || !canAfford || isBuying}
                      onClick={() => buy(item)}
                    >
                      {btnLabel}
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
