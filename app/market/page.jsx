"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import CoinLogo from "@/components/CoinLogo";
import GlossaryTerm from "@/components/GlossaryTerm";
import { applyTheme, getTheme } from "@/lib/theme";

// ── Technical indicator calculations ────────────────────────────
function calcSMA(prices, period) {
  return prices.map((_, i) => i < period - 1 ? null : prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period);
}
function calcRSI(prices, period = 14) {
  if (prices.length < period + 1) return prices.map(() => null);
  const rsi = new Array(period).fill(null);
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const d = prices[i] - prices[i - 1];
    if (d > 0) avgGain += d; else avgLoss += Math.abs(d);
  }
  avgGain /= period; avgLoss /= period;
  for (let i = period; i < prices.length; i++) {
    if (i > period) {
      const d = prices[i] - prices[i - 1];
      avgGain = (avgGain * (period - 1) + Math.max(0, d)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.max(0, -d)) / period;
    }
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi.push(100 - 100 / (1 + rs));
  }
  return rsi;
}

// ── Indicator chart component ────────────────────────────────────
function IndicatorChart({ priceData, symbol }) {
  const priceRef = useRef(null);
  const rsiRef   = useRef(null);
  const [showMA7, setShowMA7]   = useState(true);
  const [showMA21, setShowMA21] = useState(true);
  const [showRSI, setShowRSI]   = useState(true);

  const prices = priceData.map(d => d.v);
  const labels = priceData.map(d => new Date(d.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  const ma7  = calcSMA(prices, 7);
  const ma21 = calcSMA(prices, 21);
  const rsi  = calcRSI(prices, 14);

  useEffect(() => {
    const drawLine = (ctx, vals, color, dash = []) => {
      const valid = vals.map((v, i) => v != null ? i : null).filter(i => i !== null);
      if (!valid.length) return;
      ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.setLineDash(dash);
      valid.forEach((i, j) => j === 0 ? ctx.moveTo(xs(i), ys(vals[i], mn, rng, pH, pad)) : ctx.lineTo(xs(i), ys(vals[i], mn, rng, pH, pad)));
      ctx.stroke(); ctx.setLineDash([]);
    };

    const c = priceRef.current;
    if (!c || prices.length < 2) return;
    const W = c.offsetWidth || 600, pH = 200;
    c.width = W; c.height = pH;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, W, pH);
    const pad = { t: 10, b: 20, l: 8, r: 8 };
    const allVals = [...prices, ...(showMA7 ? ma7.filter(Boolean) : []), ...(showMA21 ? ma21.filter(Boolean) : [])];
    const mn = Math.min(...allVals), mx = Math.max(...allVals), rng = mx - mn || 1;
    const iW = W - pad.l - pad.r, iH = pH - pad.t - pad.b;
    const xs = i => pad.l + (i / (prices.length - 1)) * iW;
    const ys = (v, mn, rng, H, pad) => pad.t + (H - pad.t - pad.b) - ((v - mn) / rng) * (H - pad.t - pad.b);

    // Price fill
    const up = prices[prices.length - 1] >= prices[0];
    const g = ctx.createLinearGradient(0, pad.t, 0, pH - pad.b);
    g.addColorStop(0, up ? 'rgba(0,229,160,.2)' : 'rgba(244,63,94,.15)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    prices.forEach((v, i) => i === 0 ? ctx.moveTo(xs(i), ys(v, mn, rng, pH, pad)) : ctx.lineTo(xs(i), ys(v, mn, rng, pH, pad)));
    ctx.lineTo(xs(prices.length - 1), pH - pad.b); ctx.lineTo(xs(0), pH - pad.b); ctx.closePath();
    ctx.fillStyle = g; ctx.fill();

    // Price line
    ctx.beginPath(); ctx.strokeStyle = up ? '#00e5a0' : '#f43f5e'; ctx.lineWidth = 2;
    prices.forEach((v, i) => i === 0 ? ctx.moveTo(xs(i), ys(v, mn, rng, pH, pad)) : ctx.lineTo(xs(i), ys(v, mn, rng, pH, pad)));
    ctx.stroke();

    if (showMA7)  drawLine(ctx, ma7,  '#60a5fa', [4, 3]);
    if (showMA21) drawLine(ctx, ma21, '#f59e0b', [6, 3]);

    // X labels
    ctx.fillStyle = '#475569'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
    [0, Math.floor(prices.length / 2), prices.length - 1].forEach(i => {
      ctx.fillText(labels[i], xs(i), pH - 5);
    });
  }, [priceData, showMA7, showMA21]);

  useEffect(() => {
    const c = rsiRef.current;
    if (!c || !showRSI || rsi.filter(Boolean).length < 2) return;
    const W = c.offsetWidth || 600, H = 80;
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    const pad = { t: 4, b: 4, l: 8, r: 8 };
    const iW = W - pad.l - pad.r, iH = H - pad.t - pad.b;
    const xs = i => pad.l + (i / (rsi.length - 1)) * iW;
    const ys = v => pad.t + iH - ((v - 0) / 100) * iH;

    // Zones
    ctx.fillStyle = 'rgba(244,63,94,.07)'; ctx.fillRect(pad.l, pad.t, iW, iH * 0.30);
    ctx.fillStyle = 'rgba(0,229,160,.07)'; ctx.fillRect(pad.l, pad.t + iH * 0.70, iW, iH * 0.30);

    // Lines at 70 and 30
    [30, 70].forEach(v => {
      ctx.beginPath(); ctx.strokeStyle = v === 70 ? 'rgba(244,63,94,.4)' : 'rgba(0,229,160,.4)';
      ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.moveTo(pad.l, ys(v)); ctx.lineTo(W - pad.r, ys(v)); ctx.stroke(); ctx.setLineDash([]);
    });

    // RSI line
    const valid = rsi.map((v, i) => ({ v, i })).filter(d => d.v != null);
    if (valid.length >= 2) {
      ctx.beginPath(); ctx.lineWidth = 1.5;
      valid.forEach((d, j) => {
        const col = d.v >= 70 ? '#f43f5e' : d.v <= 30 ? '#00e5a0' : '#a78bfa';
        if (j === 0) { ctx.strokeStyle = col; ctx.moveTo(xs(d.i), ys(d.v)); }
        else { ctx.strokeStyle = col; ctx.lineTo(xs(d.i), ys(d.v)); ctx.stroke(); ctx.beginPath(); ctx.moveTo(xs(d.i), ys(d.v)); }
      });
      ctx.stroke();
    }

    ctx.fillStyle = '#475569'; ctx.font = '8px monospace'; ctx.textAlign = 'right';
    ctx.fillText('70', pad.l + 20, ys(70) - 2);
    ctx.fillText('30', pad.l + 20, ys(30) - 2);
    const lastRSI = rsi.filter(Boolean).slice(-1)[0];
    if (lastRSI != null) {
      ctx.fillStyle = lastRSI >= 70 ? '#f43f5e' : lastRSI <= 30 ? '#00e5a0' : '#a78bfa';
      ctx.textAlign = 'right';
      ctx.fillText(`RSI ${lastRSI.toFixed(0)}`, W - pad.r, 12);
    }
  }, [priceData, showRSI]);

  const lastRSI = rsi.filter(Boolean).slice(-1)[0];
  const sentiment = lastRSI >= 70 ? { label: 'Overbought', color: '#f43f5e' } : lastRSI <= 30 ? { label: 'Oversold', color: '#00e5a0' } : { label: 'Neutral', color: '#a78bfa' };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        {[['MA 7d', showMA7, setShowMA7, '#60a5fa'], ['MA 21d', showMA21, setShowMA21, '#f59e0b'], ['RSI 14', showRSI, setShowRSI, '#a78bfa']].map(([label, on, set, color]) => (
          <button key={label} onClick={() => set(v => !v)} style={{ fontSize: 10, padding: '3px 10px', borderRadius: 6, border: `1px solid ${on ? color : 'var(--border)'}`, background: on ? `${color}22` : 'transparent', color: on ? color : 'var(--muted)', cursor: 'pointer', fontFamily: "'DM Mono',monospace" }}>
            {label}
          </button>
        ))}
        {lastRSI != null && <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 6, background: `${sentiment.color}15`, color: sentiment.color, border: `1px solid ${sentiment.color}40` }}>RSI: {lastRSI.toFixed(0)} — {sentiment.label}</span>}
      </div>
      <canvas ref={priceRef} style={{ width: '100%', height: 200, display: 'block' }} />
      {showRSI && <canvas ref={rsiRef} style={{ width: '100%', height: 80, display: 'block', marginTop: 4 }} />}
    </div>
  );
}

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
  const [fearGreed, setFearGreed] = useState(null);
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [coinHistory, setCoinHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

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
      // Fetch Fear & Greed index once (updates once daily)
      fetch('https://api.alternative.me/fng/?limit=1')
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.data?.[0]) setFearGreed(d.data[0]); })
        .catch(() => {});
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
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:var(--bg);color:var(--text);font-family:'DM Mono',monospace;min-height:100vh}
        .page{max-width:1400px;margin:0 auto;padding:24px 16px}
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
        .mkt-row{border-bottom:1px solid rgba(30,41,59,.4);transition:background .15s;cursor:pointer}
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
        @media(max-width:600px){
          .page{padding:16px 10px}
          .mkt-hide-mobile{display:none}
          .mkt-row td{padding:10px 10px}
          .mkt-table th{padding:10px 10px}
          .coin-sym{font-size:12px}
          .sector-tag{display:none}
        }
      ` }} />

      <div className="page">
        <Nav active="market" right={lastUpdated && <span style={{fontSize:10,color:'var(--muted)',fontSize:10}}>Updated {lastUpdated.toLocaleTimeString()}</span>} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 32, letterSpacing: -1, marginBottom: 4, color: 'var(--text)' }}>
              📈 <span style={{ color: 'var(--accent)' }}>Market</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              Live prices · Tile size = market cap · Updates every 30 minutes
            </div>
          </div>
          {fearGreed && (() => {
            const val = parseInt(fearGreed.value);
            const label = fearGreed.value_classification;
            const color = val <= 25 ? '#ef4444' : val <= 45 ? '#f97316' : val <= 55 ? '#f59e0b' : val <= 75 ? '#84cc16' : '#22c55e';
            const bgColor = val <= 25 ? 'rgba(239,68,68,.1)' : val <= 45 ? 'rgba(249,115,22,.1)' : val <= 55 ? 'rgba(245,158,11,.1)' : val <= 75 ? 'rgba(132,204,18,.1)' : 'rgba(34,197,94,.1)';
            const borderColor = val <= 25 ? 'rgba(239,68,68,.3)' : val <= 45 ? 'rgba(249,115,22,.3)' : val <= 55 ? 'rgba(245,158,11,.3)' : val <= 75 ? 'rgba(132,204,18,.3)' : 'rgba(34,197,94,.3)';
            // Arc gauge
            const radius = 32, cx = 44, cy = 44;
            const startAngle = Math.PI; // 180°
            const endAngle = startAngle + (val / 100) * Math.PI;
            const x1 = cx + radius * Math.cos(startAngle), y1 = cy + radius * Math.sin(startAngle);
            const x2 = cx + radius * Math.cos(endAngle),   y2 = cy + radius * Math.sin(endAngle);
            return (
              <div style={{ background: bgColor, border: `1px solid ${borderColor}`, borderRadius: 16, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, minWidth: 220 }}>
                <svg width={88} height={52} viewBox="0 0 88 52" style={{ flexShrink: 0 }}>
                  <path d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`} fill="none" stroke="#1e293b" strokeWidth={7} strokeLinecap="round" />
                  <path d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${val >= 50 ? 1 : 0} 1 ${x2} ${y2}`} fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 6px ${color}88)` }} />
                  <text x={cx} y={cy + 2} textAnchor="middle" fill={color} fontSize={14} fontWeight={700} fontFamily="'DM Mono',monospace">{val}</text>
                </svg>
                <div>
                  <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 3 }}>Fear & Greed</div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, color }}>{label}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>crypto sentiment index</div>
                </div>
              </div>
            );
          })()}
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
            {/* ── SECTOR ROTATION ─────────────────────────────── */}
            {Object.keys(sectorGroups).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 }}>Sector Performance</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {Object.entries(sectorGroups)
                    .filter(([, syms]) => syms.length > 0)
                    .map(([sector, syms]) => {
                      const avg24h = syms.map(s => parseFloat(prices[s]?.change24h) || 0).reduce((a,b)=>a+b,0) / syms.length;
                      const avg7d  = syms.map(s => parseFloat(prices[s]?.change7d)  || 0).reduce((a,b)=>a+b,0) / syms.length;
                      const color  = avg24h > 2 ? '#00e5a0' : avg24h > 0 ? '#4ade80' : avg24h > -2 ? '#f43f5e' : '#dc2626';
                      const bg     = avg24h > 2 ? 'rgba(0,229,160,.12)' : avg24h > 0 ? 'rgba(74,222,128,.08)' : avg24h > -2 ? 'rgba(244,63,94,.1)' : 'rgba(220,38,38,.15)';
                      const border = avg24h > 2 ? 'rgba(0,229,160,.3)' : avg24h > 0 ? 'rgba(74,222,128,.2)' : avg24h > -2 ? 'rgba(244,63,94,.25)' : 'rgba(220,38,38,.3)';
                      return (
                        <div key={sector} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: '10px 14px', minWidth: 110, cursor: 'pointer' }}
                          onClick={() => { setHeatView('sector'); setSortBy('change24h'); }}>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
                            {SECTOR_ICONS[sector] || '🔷'} {sector}
                          </div>
                          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16, color, marginBottom: 2 }}>
                            {avg24h >= 0 ? '+' : ''}{avg24h.toFixed(1)}%
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                            7d: <span style={{ color: avg7d >= 0 ? '#4ade80' : '#f43f5e' }}>{avg7d >= 0 ? '+' : ''}{avg7d.toFixed(1)}%</span>
                            <span style={{ marginLeft: 6, opacity: .6 }}>{syms.length} coins</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

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
                      <th className="mkt-hide-mobile" onClick={() => toggleSort('change1h')}>1H <SI col="change1h"/></th>
                      <th onClick={() => toggleSort('change24h')}>24H <SI col="change24h"/></th>
                      <th className="mkt-hide-mobile" onClick={() => toggleSort('change7d')}>7D <SI col="change7d"/></th>
                      <th className="mkt-hide-mobile" onClick={() => toggleSort('marketCap')}><GlossaryTerm term="Market Cap">Mkt Cap</GlossaryTerm> <SI col="marketCap"/></th>
                      <th className="mkt-hide-mobile" onClick={() => toggleSort('volume24h')}><GlossaryTerm term="Volume">Volume</GlossaryTerm> <SI col="volume24h"/></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => (
                      <tr className="mkt-row" key={p.sym} onClick={() => {
                        setSelectedCoin(p); setCoinHistory(null);
                        setHistoryLoading(true);
                        fetch(`/api/market/history?symbol=${p.sym}`)
                          .then(r => r.ok ? r.json() : null)
                          .then(d => { if (d?.prices) setCoinHistory(d.prices.map(pt => ({ ts: pt.ts, v: pt.v }))); })
                          .catch(() => {})
                          .finally(() => setHistoryLoading(false));
                      }}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <CoinLogo symbol={p.sym} size={22} />
                            <div>
                              <span className="coin-sym">{p.sym}</span>
                              <span className="sector-tag">{p.sector || getSector(p.sym)}</span>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700 }}>{fmtPrice(p.price)}</td>
                        <td className="mkt-hide-mobile" style={{ color: chgColor(p.change1h), fontWeight: 500 }}>{fmtChg(p.change1h)}</td>
                        <td style={{ color: chgColor(p.change24h), fontWeight: 500 }}>{fmtChg(p.change24h)}</td>
                        <td className="mkt-hide-mobile" style={{ color: chgColor(p.change7d), fontWeight: 500 }}>{fmtChg(p.change7d)}</td>
                        <td className="mkt-hide-mobile" style={{ color: 'var(--muted)' }}>{fmtMcap(p.marketCap)}</td>
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

      {/* Coin detail modal with technical indicators */}
      {selectedCoin && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.7)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16 }} onClick={() => setSelectedCoin(null)}>
          <div style={{ background:`radial-gradient(circle at 90% 0%, ${(selectedCoin.change24h||0) >= 0 ? "rgba(0,229,160,.10)" : "rgba(244,63,94,.10)"}, transparent 60%), var(--surface,#0f172a)`,border:'1px solid var(--border,#1e293b)',borderRadius:24,padding:24,width:'100%',maxWidth:680,maxHeight:'90vh',overflowY:'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
              <div>
                <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:22,letterSpacing:-0.5 }}>{selectedCoin.sym}</div>
                <div style={{ fontSize:11,color:'var(--muted)' }}>{selectedCoin.name || selectedCoin.sym} · {getSector(selectedCoin.sym)}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:20 }}>{fmtPrice(selectedCoin.price)}</div>
                <div style={{ fontSize:12,color:chgColor(selectedCoin.change24h),fontWeight:600 }}>{fmtChg(selectedCoin.change24h)} 24h</div>
              </div>
            </div>

            <div style={{ display:'flex',gap:24,borderTop:'1px solid var(--border)',borderBottom:'1px solid var(--border)',padding:'12px 0',marginBottom:16 }}>
              {[['1H', selectedCoin.change1h], ['24H', selectedCoin.change24h], ['7D', selectedCoin.change7d]].map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontSize:9,color:'var(--muted)',letterSpacing:2,textTransform:'uppercase',marginBottom:3 }}>{l}</div>
                  <div style={{ fontFamily:"'Syne',sans-serif",fontSize:15,fontWeight:700,color:chgColor(v) }}>{fmtChg(v)}</div>
                </div>
              ))}
            </div>

            {historyLoading && <div style={{ textAlign:'center',padding:40,color:'var(--muted)',fontSize:12 }}>Loading 60-day history...</div>}
            {!historyLoading && !coinHistory && <div style={{ textAlign:'center',padding:40,color:'var(--muted)',fontSize:12 }}>Could not load chart data</div>}
            {!historyLoading && coinHistory && coinHistory.length >= 14 && (
              <>
                <div style={{ fontSize:11,color:'var(--muted)',marginBottom:8 }}>60-day price · MA 7d (blue) · MA 21d (orange) · RSI 14</div>
                <IndicatorChart priceData={coinHistory} symbol={selectedCoin.sym} />
              </>
            )}

            <button onClick={() => setSelectedCoin(null)} style={{ marginTop:16,width:'100%',padding:'10px',borderRadius:12,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:"'DM Mono',monospace",fontSize:12 }}>
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}