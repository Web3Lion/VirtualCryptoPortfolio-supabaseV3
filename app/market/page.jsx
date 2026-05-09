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
const fmtChg = n => { const x = parseFloat(n); return isNaN(x) ? '—' : (x >= 0 ? '+' : '') + x.toFixed(2) + '%'; };
const fmtMcap = n => { const x = parseFloat(n); if (!x) return '—'; if (x >= 1e9) return '$' + (x/1e9).toFixed(1) + 'B'; if (x >= 1e6) return '$' + (x/1e6).toFixed(0) + 'M'; return '$' + x.toLocaleString(); };
const chgColor = n => { const x = parseFloat(n); return isNaN(x) ? 'var(--muted)' : x >= 0 ? 'var(--up)' : 'var(--down)'; };

function heatColor(pct) {
  const x = Math.max(-10, Math.min(10, parseFloat(pct) || 0));
  if (x > 0) { const g = Math.round(50 + x * 20); return `rgba(0,${g},80,0.85)`; }
  if (x < 0) { const r = Math.round(120 + Math.abs(x) * 13); return `rgba(${r},20,40,0.85)`; }
  return 'rgba(30,41,59,0.85)';
}

export default function Market() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [prices, setPrices]     = useState({});
  const [coins, setCoins]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [search, setSearch]     = useState('');
  const [tfKey, setTfKey]       = useState('change24h');
  const [sortBy, setSortBy]     = useState('marketCap');
  const [sortDir, setSortDir]   = useState('desc');
  const [classId, setClassId]   = useState(null);

  useEffect(() => { applyTheme(getTheme()); }, []);
  useEffect(() => { if (status === 'unauthenticated') router.replace('/'); }, [status, router]);

  const fetchData = useCallback(async (cid) => {
    try {
      const meRes = await fetch('/api/me');
      if (meRes.ok) {
        const me = await meRes.json();
        const id = cid || me?.classes?.[0]?.id;
        setClassId(id);
        const [priceRes, coinRes] = await Promise.all([
          fetch(`/api/prices${id ? `?classId=${id}` : ''}`),
          id ? fetch(`/api/coins?classId=${id}`) : Promise.resolve(null),
        ]);
        if (priceRes.ok) {
          const p = await priceRes.json();
          // Handle both object {BTC:{...}} and array [{symbol,price,...}] formats
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
      }
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
    return <div style={{background:'var(--bg,#080c14)',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--muted)'}}>Loading...</div>;

  const priceKeys = Object.keys(prices);
  const heatCoins = coins.length > 0 ? coins.filter(c => prices[c]) : priceKeys;

  const filtered = (coins.length > 0 ? coins : priceKeys)
    .filter(c => !search || c.toLowerCase().includes(search.toLowerCase()))
    .filter(c => prices[c])
    .map(sym => ({ sym, ...prices[sym] }))
    .sort((a, b) => {
      const av = parseFloat(a[sortBy] || 0), bv = parseFloat(b[sortBy] || 0);
      if (sortBy === 'symbol') return sortDir === 'asc' ? a.sym.localeCompare(b.sym) : b.sym.localeCompare(a.sym);
      return sortDir === 'asc' ? av - bv : bv - av;
    });

  const toggleSort = col => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  };
  const S = ({ col }) => <span style={{opacity:.5,fontSize:9}}>{sortBy===col?(sortDir==='asc'?'↑':'↓'):'↕'}</span>;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--bg:#080c14;--surface:#0f172a;--surface2:#1a2235;--border:#1e293b;--accent:#00e5a0;--up:#00e5a0;--down:#f43f5e;--text:#e2e8f0;--muted:#475569;--gold:#f59e0b}
        body{background:var(--bg);color:var(--text);font-family:'DM Mono',monospace;min-height:100vh}
        .page{max-width:1300px;margin:0 auto;padding:24px 16px}
        .nav{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;margin-bottom:28px;background:var(--surface);border:1px solid var(--border);border-radius:16px;flex-wrap:wrap;gap:10px}
        .logo{font-family:'Syne',sans-serif;font-weight:800;font-size:16px}.logo span{color:var(--accent)}
        .nav-links{display:flex;gap:8px;flex-wrap:wrap}
        .nav-link{padding:6px 14px;border-radius:8px;font-size:11px;text-decoration:none;color:var(--muted);letter-spacing:1px;transition:all .2s;text-transform:uppercase}
        .nav-link:hover{color:var(--accent)}.nav-link.active{background:rgba(128,200,128,.12);color:var(--accent);border:1px solid rgba(128,200,128,.2)}
        .section-title{font-family:'Syne',sans-serif;font-weight:700;font-size:16px;margin-bottom:14px;color:var(--text)}
        .heat-card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:20px;margin-bottom:20px}
        .heat-controls{display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;align-items:center}
        .tf-btn{padding:5px 12px;border-radius:8px;border:1px solid var(--border);background:transparent;font-family:'DM Mono',monospace;font-size:11px;color:var(--muted);cursor:pointer;transition:all .2s}
        .tf-btn.active{background:var(--accent);color:#000;border-color:var(--accent)}
        .heat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px}
        .heat-tile{border-radius:12px;padding:14px 12px;cursor:default;transition:transform .15s;text-align:center}
        .heat-tile:hover{transform:scale(1.04)}
        .heat-sym{font-family:'Syne',sans-serif;font-weight:800;font-size:15px;color:#fff;margin-bottom:4px}
        .heat-pct{font-size:12px;color:rgba(255,255,255,.85);font-weight:500}
        .heat-price{font-size:10px;color:rgba(255,255,255,.6);margin-top:2px}
        .table-card{background:var(--surface);border:1px solid var(--border);border-radius:20px;overflow:hidden;margin-bottom:20px}
        .search-bar{width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:11px 16px;color:var(--text);font-family:'DM Mono',monospace;font-size:13px;outline:none;margin-bottom:14px;transition:border-color .2s}
        .search-bar:focus{border-color:var(--accent)}
        .mkt-table{width:100%;border-collapse:collapse}
        .mkt-table th{font-size:9px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;padding:12px 16px;text-align:left;border-bottom:1px solid var(--border);background:var(--surface2);cursor:pointer;user-select:none;white-space:nowrap}
        .mkt-table th:hover{color:var(--text)}
        .mkt-row{border-bottom:1px solid rgba(30,41,59,.4);transition:background .15s}
        .mkt-row:hover{background:rgba(0,229,160,.03)}
        .mkt-row td{padding:13px 16px;font-size:12px;color:var(--text)}
        .coin-sym{font-family:'Syne',sans-serif;font-weight:700;font-size:14px;color:var(--text)}
        .sector-tag{font-size:9px;color:var(--muted);background:var(--surface2);padding:2px 7px;border-radius:5px;margin-left:6px;vertical-align:middle}
        .skeleton{background:linear-gradient(90deg,var(--surface) 25%,var(--surface2) 50%,var(--surface) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:8px}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .update-badge{font-size:10px;color:var(--muted);background:var(--surface2);padding:3px 10px;border-radius:8px;border:1px solid var(--border)}
        @media(max-width:640px){.heat-grid{grid-template-columns:repeat(auto-fill,minmax(90px,1fr))}}
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
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <ThemeToggle/>
            {lastUpdated && <span className="update-badge">Updated {lastUpdated.toLocaleTimeString()}</span>}
          </div>
        </nav>

        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:32,letterSpacing:-1,marginBottom:4,color:'var(--text)'}}>
          📈 <span style={{color:'var(--accent)'}}>Market</span>
        </div>
        <div style={{fontSize:11,color:'var(--muted)',marginBottom:24}}>
          Live prices for your class coins · Updates every 30 minutes
        </div>

        {loading ? (
          <>
            <div className="skeleton" style={{height:220,marginBottom:20}}/>
            <div className="skeleton" style={{height:400}}/>
          </>
        ) : heatCoins.length === 0 ? (
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:20,padding:48,textAlign:'center',color:'var(--muted)'}}>
            <div style={{fontSize:48,marginBottom:16}}>📊</div>
            <div style={{fontSize:14,marginBottom:8,color:'var(--text)'}}>No price data yet</div>
            <div style={{fontSize:12}}>Prices update every 30 minutes via CoinGecko</div>
          </div>
        ) : (
          <>
            {/* ── HEATMAP ── */}
            <div className="heat-card">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:8}}>
                <div className="section-title" style={{marginBottom:0}}>🔥 Market Heatmap</div>
                <div className="heat-controls" style={{marginBottom:0}}>
                  {[['change1h','1H'],['change24h','24H'],['change7d','7D']].map(([k,l])=>(
                    <button key={k} className={`tf-btn${tfKey===k?' active':''}`} onClick={()=>setTfKey(k)}>{l}</button>
                  ))}
                </div>
              </div>
              <div className="heat-grid">
                {heatCoins.map(sym => {
                  const p = prices[sym];
                  if (!p) return null;
                  const pct = parseFloat(p[tfKey]) || 0;
                  return (
                    <div key={sym} className="heat-tile" style={{background:heatColor(pct)}}>
                      <div className="heat-sym">{sym}</div>
                      <div className="heat-pct">{pct >= 0 ? '+' : ''}{pct.toFixed(2)}%</div>
                      <div className="heat-price">{fmtPrice(p.price)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── PRICE TABLE ── */}
            <div className="heat-card">
              <div className="section-title">💹 Price Table</div>
              <input
                className="search-bar"
                placeholder="Search coins..."
                value={search}
                onChange={e=>setSearch(e.target.value)}
              />
              <div style={{overflowX:'auto'}}>
                <table className="mkt-table">
                  <thead>
                    <tr>
                      <th onClick={()=>toggleSort('symbol')}>Coin <S col="symbol"/></th>
                      <th onClick={()=>toggleSort('price')}>Price <S col="price"/></th>
                      <th onClick={()=>toggleSort('change1h')}>1H <S col="change1h"/></th>
                      <th onClick={()=>toggleSort('change24h')}>24H <S col="change24h"/></th>
                      <th onClick={()=>toggleSort('change7d')}>7D <S col="change7d"/></th>
                      <th onClick={()=>toggleSort('marketCap')}>Mkt Cap <S col="marketCap"/></th>
                      <th onClick={()=>toggleSort('volume24h')}>Volume <S col="volume24h"/></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => (
                      <tr className="mkt-row" key={p.sym}>
                        <td>
                          <span className="coin-sym">{p.sym}</span>
                          <span className="sector-tag">{p.sector || getSector(p.sym)}</span>
                        </td>
                        <td style={{fontFamily:"'Syne',sans-serif",fontWeight:700}}>{fmtPrice(p.price)}</td>
                        <td style={{color:chgColor(p.change1h),fontWeight:500}}>{fmtChg(p.change1h)}</td>
                        <td style={{color:chgColor(p.change24h),fontWeight:500}}>{fmtChg(p.change24h)}</td>
                        <td style={{color:chgColor(p.change7d),fontWeight:500}}>{fmtChg(p.change7d)}</td>
                        <td style={{color:'var(--muted)'}}>{fmtMcap(p.marketCap)}</td>
                        <td style={{color:'var(--muted)'}}>{fmtMcap(p.volume24h)}</td>
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
