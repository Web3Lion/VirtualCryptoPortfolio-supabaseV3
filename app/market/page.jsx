"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { applyTheme, getTheme } from "@/lib/theme";

const fmtPrice = p => {
  const n = parseFloat(p);
  if (isNaN(n) || n === 0) return '$—';
  if (n >= 1000) return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 1)    return '$' + n.toFixed(2);
  if (n >= 0.01) return '$' + n.toFixed(4);
  return '$' + n.toFixed(8);
};
const fmtChg  = n => { const x = parseFloat(n); return isNaN(x) ? '—' : (x >= 0 ? '+' : '') + x.toFixed(2) + '%'; };
const fmtMcap = n => { const x = parseFloat(n); if (!x) return '—'; if (x >= 1e9) return '$' + (x/1e9).toFixed(1) + 'B'; if (x >= 1e6) return '$' + (x/1e6).toFixed(0) + 'M'; return '$' + x.toLocaleString(); };
const chgColor = n => { const x = parseFloat(n); return isNaN(x) ? 'var(--muted)' : x >= 0 ? 'var(--up)' : 'var(--down)'; };

function heatBg(pct) {
  const x = Math.max(-15, Math.min(15, parseFloat(pct) || 0));
  if (x > 5)  return 'rgba(0,160,80,.95)';
  if (x > 2)  return 'rgba(0,130,65,.9)';
  if (x > 0)  return 'rgba(0,100,50,.85)';
  if (x === 0) return 'rgba(40,55,75,.85)';
  if (x > -2)  return 'rgba(140,30,50,.85)';
  if (x > -5)  return 'rgba(180,25,45,.9)';
  return 'rgba(210,20,40,.95)';
}

const SECTOR_ORDER = ['Layer 1','Layer 2','DeFi','AI / Data','Memecoin','Gaming/NFT','Exchange','Stablecoin','Other'];
const SECTOR_ICONS = { 'Layer 1':'⛓️','Layer 2':'🔵','DeFi':'🏦','AI / Data':'🤖','Memecoin':'🐸','Gaming/NFT':'🎮','Exchange':'💱','Stablecoin':'💵','Other':'🔷' };

function getSector(symbol) {
  const SECTORS = {
    'Layer 1':    ['BTC','ETH','SOL','ADA','AVAX','DOT','ATOM','NEAR','ALGO','XRP','LTC','BCH','TON','APT','SUI','TRX','VET','HBAR','ICP','FIL','XLM'],
    'Layer 2':    ['MATIC','ARB','OP','IMX','STX'],
    'DeFi':       ['UNI','AAVE','MKR','CRV','LINK','COMP','GRT','INJ'],
    'AI / Data':  ['FET','RNDR','WLD','TAO'],
    'Gaming/NFT': ['SAND','MANA','AXS'],
    'Memecoin':   ['DOGE','SHIB','PEPE','BONK','FLOKI','WIF'],
    'Stablecoin': ['USDT','USDC','DAI'],
    'Exchange':   ['BNB','OKB','NEXO'],
  };
  for (const [sector, syms] of Object.entries(SECTORS)) {
    if (syms.includes(symbol?.toUpperCase())) return sector;
  }
  return 'Other';
}

// Heatmap tile sized by market cap
function HeatTile({ sym, price, pct, mcap, maxMcap }) {
  const minSize = 80, maxSize = 160;
  const ratio = maxMcap > 0 ? Math.sqrt(mcap / maxMcap) : 0.3;
  const size = Math.round(minSize + ratio * (maxSize - minSize));
  return (
    <div style={{
      background: heatBg(pct),
      borderRadius: 12,
      width: size,
      height: size,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'default',
      transition: 'transform .15s',
      flexShrink: 0,
      padding: 6,
    }}
    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.06)'}
    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: Math.max(10, size * 0.13), color: '#fff', marginBottom: 2 }}>{sym}</div>
      <div style={{ fontSize: Math.max(9, size * 0.11), color: 'rgba(255,255,255,.9)', fontWeight: 600 }}>
        {parseFloat(pct) >= 0 ? '+' : ''}{parseFloat(pct).toFixed(2)}%
      </div>
      <div style={{ fontSize: Math.max(8, size * 0.09), color: 'rgba(255,255,255,.6)', marginTop: 1 }}>{fmtPrice(price)}</div>
    </div>
  );
}

export default function Market() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [prices, setPrices]   = useState({});
  const [coins, setCoins]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [search, setSearch]   = useState('');
  const [tfKey, setTfKey]     = useState('change24h');
  const [sortBy, setSortBy]   = useState('marketCap');
  const [sortDir, setSortDir] = useState('desc');
  const [heatView, setHeatView] = useState('all'); // 'all' or 'sector'

  useEffect(() => { applyTheme(getTheme()); }, []);
  useEffect(() => { if (status === 'unauthenticated') router.replace('/'); }, [status, router]);

  const fetchData = useCallback(async () => {
    try {
      const meRes = await fetch('/api/me');
      if (!meRes.ok) return;
      const me = await meRes.json();
      const classId = me?.classes?.[0]?.id;
      const [priceRes, coinRes] = await Promise.all([
        fetch(`/api/prices${classId ? `?classId=${classId}` : ''}`),
        classId ? fetch(`/api/coins?classId=${classId}`) : Promise.resolve(null),
      ]);
      if (priceRes.ok) {
        const p = await priceRes.json();
        if (Array.isArray(p)) {
          const obj = {};
          p.forEach(c => { obj[c.symbol || c.ticker] = c; });
          setPrices(obj);
        } else {
          setPrices(p || {});
        }
      }
      if (coinRes?.ok) {
        const c = await coinRes.json();
        setCoins(Array.isArray(c) ? c.map(x => x.symbol) : []);
      }
      setLastUpdated(new Date());
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
      const iv = setInterval(fetchData, 30000);
      return () => clearInterval(iv);
    }
  }, [status, fetchData]);

  if (status === 'loading' || status === 'unauthenticated')
    return <div style={{ background: 'var(--bg,#080c14)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>Loading...</div>;

  const activeCoins = (coins.length > 0 ? coins : Object.keys(prices)).filter(c => prices[c]);
  const maxMcap = Math.max(...activeCoins.map(c => parseFloat(prices[c]?.marketCap) || 0));

  // Build sector groups
  const sectorGroups = {};
  activeCoins.forEach(sym => {
    const sector = prices[sym]?.sector || getSector(sym);
    if (!sectorGroups[sector]) sectorGroups[sector] = [];
    sectorGroups[sector].push(sym);
  });

  const filtered = activeCoins
    .filter(c => !search || c.toLowerCase().includes(search.toLowerCase()))
    .map(sym => ({ sym, ...prices[sym] }))
    .sort((a, b) => {
      if (sortBy === 'sym') return sortDir === 'asc' ? a.sym.localeCompare(b.sym) : b.sym.localeCompare(a.sym);
      const av = parseFloat(a[sortBy] || 0), bv = parseFloat(b[sortBy] || 0);
      return sortDir === 'asc' ? av - bv : bv - av;
    });

  const toggleSort = col => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  };
  const SI = ({ col }) => <span style={{ opacity: .5, fontSize: 9 }}>{sortBy === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>;

  // Sector average change
  const sectorAvg = (syms) => {
    const vals = syms.map(s => parseFloat(prices[s]?.[tfKey]) || 0);
    return vals.length ? vals.reduce((a,b) => a+b, 0) / vals.length : 0;
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--bg:#080c14;--surface:#0f172a;--surface2:#1a2235;--border:#1e293b;--accent:#00e5a0;--up:#00e5a0;--down:#f43f5e;--text:#e2e8f0;--muted:#475569;--gold:#f59e0b}
        body{background:var(--bg);color:var(--text);font-family:'DM Mono',monospace;min-height:100vh}
        .page{max-width:1400px;margin:0 auto;padding:24px 16px}
        .nav{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;margin-bottom:28px;background:var(--surface);border:1px solid var(--border);border-radius:16px;flex-wrap:wrap;gap:10px}
        .logo{font-family:'Syne',sans-serif;font-weight:800;font-size:16px}.logo span{color:var(--accent)}
        .nav-links{display:flex;gap:8px;flex-wrap:wrap}
        .nav-link{padding:6px 14px;border-radius:8px;font-size:11px;text-decoration:none;color:var(--muted);letter-spacing:1px;transition:all .2s;text-transform:uppercase}
        .nav-link:hover{color:var(--accent)}.nav-link.active{background:rgba(128,200,128,.12);color:var(--accent);border:1px solid rgba(128,200,128,.2)}
        .card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:22px;margin-bottom:20px}
        .card-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px}
        .card-title{font-family:'Syne',sans-serif;font-weight:700;font-size:16px;color:var(--text);margin:0}
        .btn-group{display:flex;gap:4px}
        .tf-btn{padding:5px 12px;border-radius:8px;border:1px solid var(--border);background:transparent;font-family:'DM Mono',monospace;font-size:11px;color:var(--muted);cursor:pointer;transition:all .2s}
        .tf-btn.active{background:var(--accent);color:#000;border-color:var(--accent)}
        .heat-flow{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end}
        .sector-block{background:var(--surface2);border:1px solid var(--border);border-radius:16px;padding:14px;margin-bottom:12px}
        .sector-header{display:flex;align-items:center;gap:8px;margin-bottom:12px}
        .sector-name{font-family:'Syne',sans-serif;font-weight:700;font-size:13px;color:var(--text)}
        .sector-avg{font-size:11px;font-weight:600;padding:2px 8px;border-radius:6px}
        .sector-avg.up{color:var(--up);background:rgba(0,229,160,.12)}
        .sector-avg.down{color:var(--down);background:rgba(244,63,94,.1)}
        .search-bar{width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:11px 16px;color:var(--text);font-family:'DM Mono',monospace;font-size:13px;outline:none;margin-bottom:14px;transition:border-color .2s}
        .search-bar:focus{border-color:var(--accent)}
        .mkt-table{width:100%;border-collapse:collapse}
        .mkt-table th{font-size:9px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;padding:12px 16px;text-align:left;border-bottom:1px solid var(--border);background:var(--surface2);cursor:pointer;user-select:none;white-space:nowrap}
        .mkt-table th:hover{color:var(--text)}
        .mkt-row{border-bottom:1px solid rgba(30,41,59,.4);transition:background .15s}
        .mkt-row:hover{background:rgba(0,229,160,.03)}
        .mkt-row td{padding:13px 16px;font-size:12px;color:var(--text)}
        .coin-sym{font-family:'Syne',sans-serif;font-weight:700;font-size:14px}
        .sector-tag{font-size:9px;color:var(--muted);background:var(--surface2);padding:2px 7px;border-radius:5px;margin-left:6px}
        .update-badge{font-size:10px;color:var(--muted);background:var(--surface2);padding:3px 10px;border-radius:8px;border:1px solid var(--border)}
        .skeleton{background:linear-gradient(90deg,var(--surface) 25%,var(--surface2) 50%,var(--surface) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:8px}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .legend{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;font-size:10px}
        .legend-item{display:flex;align-items:center;gap:4px;color:var(--muted)}
        .legend-dot{width:10px;height:10px;border-radius:3px}
      `}</style>

      <div className="page">
        <nav className="nav">
          <div className="logo">CRYPTO<span>CLASS</span></div>
          <div className="nav-links">
            <Link href="/dashboard" className="nav-link">Wallet</Link>
            <Link href="/leaderboard" className="nav-link">Leaderboard</Link>
            <a href="/market" className="nav-link active">Market</a>
            <Link href="/news" className="nav-link">News</Link>
            <Link href="/badges" className="nav-link">Badges</Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ThemeToggle/>
            {lastUpdated && <span className="update-badge">Updated {lastUpdated.toLocaleTimeString()}</span>}
          </div>
        </nav>

        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 32, letterSpacing: -1, marginBottom: 4, color: 'var(--text)' }}>
          📈 <span style={{ color: 'var(--accent)' }}>Market</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 24 }}>
          Live prices · Tile size = market cap · Updates every 30 minutes
        </div>

        {loading ? (
          <>
            <div className="skeleton" style={{ height: 260, marginBottom: 20 }}/>
            <div className="skeleton" style={{ height: 400 }}/>
          </>
        ) : activeCoins.length === 0 ? (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
            <div style={{ fontSize: 14, color: 'var(--text)' }}>No price data yet</div>
          </div>
        ) : (
          <>
            {/* ── HEATMAP ─────────────────────────────────────── */}
            <div className="card">
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="card-title">🔥 Market Heatmap</div>
                  <div className="btn-group">
                    <button className={`tf-btn${heatView === 'all' ? ' active' : ''}`} onClick={() => setHeatView('all')}>All Coins</button>
                    <button className={`tf-btn${heatView === 'sector' ? ' active' : ''}`} onClick={() => setHeatView('sector')}>By Sector</button>
                  </div>
                </div>
                <div className="btn-group">
                  {[['change1h','1H'],['change24h','24H'],['change7d','7D']].map(([k,l]) => (
                    <button key={k} className={`tf-btn${tfKey === k ? ' active' : ''}`} onClick={() => setTfKey(k)}>{l}</button>
                  ))}
                </div>
              </div>

              {heatView === 'all' ? (
                <>
                  <div className="heat-flow">
                    {[...activeCoins]
                      .sort((a,b) => (parseFloat(prices[b]?.marketCap)||0) - (parseFloat(prices[a]?.marketCap)||0))
                      .map(sym => (
                        <HeatTile
                          key={sym}
                          sym={sym}
                          price={prices[sym]?.price}
                          pct={prices[sym]?.[tfKey] || 0}
                          mcap={parseFloat(prices[sym]?.marketCap) || 0}
                          maxMcap={maxMcap}
                        />
                      ))
                    }
                  </div>
                  <div className="legend">
                    {[['> +5%','rgba(0,160,80,.95)'],['+2 to +5%','rgba(0,130,65,.9)'],['0 to +2%','rgba(0,100,50,.85)'],['0%','rgba(40,55,75,.85)'],['0 to -2%','rgba(140,30,50,.85)'],['−2 to −5%','rgba(180,25,45,.9)'],['< −5%','rgba(210,20,40,.95)']].map(([l,c]) => (
                      <div key={l} className="legend-item"><div className="legend-dot" style={{ background: c }}/>{l}</div>
                    ))}
                    <div className="legend-item" style={{ marginLeft: 8 }}>· Tile size = market cap</div>
                  </div>
                </>
              ) : (
                <>
                  {SECTOR_ORDER.filter(s => sectorGroups[s]?.length > 0).map(sector => {
                    const syms = sectorGroups[sector] || [];
                    const avg = sectorAvg(syms);
                    const sMaxMcap = Math.max(...syms.map(s => parseFloat(prices[s]?.marketCap) || 0));
                    return (
                      <div key={sector} className="sector-block">
                        <div className="sector-header">
                          <span style={{ fontSize: 18 }}>{SECTOR_ICONS[sector] || '🔷'}</span>
                          <span className="sector-name">{sector}</span>
                          <span className={`sector-avg ${avg >= 0 ? 'up' : 'down'}`}>
                            {avg >= 0 ? '+' : ''}{avg.toFixed(2)}% avg
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--muted)' }}>{syms.length} coins</span>
                        </div>
                        <div className="heat-flow">
                          {[...syms]
                            .sort((a,b) => (parseFloat(prices[b]?.marketCap)||0) - (parseFloat(prices[a]?.marketCap)||0))
                            .map(sym => (
                              <HeatTile
                                key={sym}
                                sym={sym}
                                price={prices[sym]?.price}
                                pct={prices[sym]?.[tfKey] || 0}
                                mcap={parseFloat(prices[sym]?.marketCap) || 0}
                                maxMcap={sMaxMcap}
                              />
                            ))
                          }
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* ── PRICE TABLE ─────────────────────────────────── */}
            <div className="card">
              <div className="card-title" style={{ marginBottom: 14 }}>💹 Price Table</div>
              <input className="search-bar" placeholder="Search coins..." value={search} onChange={e => setSearch(e.target.value)} />
              <div style={{ overflowX: 'auto' }}>
                <table className="mkt-table">
                  <thead>
                    <tr>
                      <th onClick={() => toggleSort('sym')}>Coin <SI col="sym"/></th>
                      <th onClick={() => toggleSort('price')}>Price <SI col="price"/></th>
                      <th onClick={() => toggleSort('change1h')}>1H <SI col="change1h"/></th>
                      <th onClick={() => toggleSort('change24h')}>24H <SI col="change24h"/></th>
                      <th onClick={() => toggleSort('change7d')}>7D <SI col="change7d"/></th>
                      <th onClick={() => toggleSort('marketCap')}>Mkt Cap <SI col="marketCap"/></th>
                      <th onClick={() => toggleSort('volume24h')}>Volume <SI col="volume24h"/></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => (
                      <tr className="mkt-row" key={p.sym}>
                        <td>
                          <span className="coin-sym">{p.sym}</span>
                          <span className="sector-tag">{p.sector || getSector(p.sym)}</span>
                        </td>
                        <td style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700 }}>{fmtPrice(p.price)}</td>
                        <td style={{ color: chgColor(p.change1h), fontWeight: 500 }}>{fmtChg(p.change1h)}</td>
                        <td style={{ color: chgColor(p.change24h), fontWeight: 500 }}>{fmtChg(p.change24h)}</td>
                        <td style={{ color: chgColor(p.change7d), fontWeight: 500 }}>{fmtChg(p.change7d)}</td>
                        <td style={{ color: 'var(--muted)' }}>{fmtMcap(p.marketCap)}</td>
                        <td style={{ color: 'var(--muted)' }}>{fmtMcap(p.volume24h)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}