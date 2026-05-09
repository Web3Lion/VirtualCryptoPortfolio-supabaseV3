"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { applyTheme, getTheme } from "@/lib/theme";

const fmtUSD = (n) => { const x = parseFloat(n); return isNaN(x) ? "$0.00" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(x); };
const fmtPct = (n) => { const x = parseFloat(n); return isNaN(x) ? "0.00%" : (x >= 0 ? "+" : "") + x.toFixed(2) + "%"; };
const fmtNum = (n) => { const x = parseFloat(n); if (isNaN(x)) return "0"; if (x >= 1000) return x.toLocaleString("en-US", { maximumFractionDigits: 4 }); return x.toFixed(6).replace(/\.?0+$/, ""); };
const clean = (s) => parseFloat(String(s || "").replace(/[$,%]/g, "")) || 0;

const COIN_COLORS = { BTC:"#f7931a",ETH:"#627eea",SOL:"#9945ff",ADA:"#0033ad",DOGE:"#c2a633",AVAX:"#e84142",DOT:"#e6007a",LINK:"#2a5ada",MATIC:"#8247e5",XRP:"#00aae4",BNB:"#f3ba2f",SHIB:"#ff0000",LTC:"#bfbbbb",UNI:"#ff007a",ATOM:"#6f7390",DEFAULT:"#00e5a0" };
const getCoinColor = (t) => COIN_COLORS[t?.toUpperCase()] || COIN_COLORS.DEFAULT;

const BADGE_NAMES = { first_watch:"👀 First Watch",serious_watch:"🎯 Serious Watchman",veteran_watch:"🔭 Veteran Watchman",analyst:"📝 Analyst",researcher:"📖 Researcher",due_diligence:"🔍 Due Diligence" };

function LineChart({ data, height = 160 }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c || !data || data.length < 2) return;
    const ctx = c.getContext("2d"), W = c.offsetWidth || 600, H = height;
    c.width = W; c.height = H; ctx.clearRect(0, 0, W, H);
    const vals = data.map((d) => d.v), mn = Math.min(...vals), mx = Math.max(...vals), rng = mx - mn || 1;
    const pad = { t: 10, b: 24, l: 8, r: 8 }, iW = W - pad.l - pad.r, iH = H - pad.t - pad.b;
    const xS = (i) => pad.l + (i / (data.length - 1)) * iW, yS = (v) => pad.t + iH - ((v - mn) / rng) * iH;
    const g = ctx.createLinearGradient(0, pad.t, 0, H - pad.b);
    g.addColorStop(0, "rgba(0,229,160,.2)"); g.addColorStop(1, "rgba(0,229,160,0)");
    ctx.beginPath();
    data.forEach((d, i) => i === 0 ? ctx.moveTo(xS(i), yS(d.v)) : ctx.lineTo(xS(i), yS(d.v)));
    ctx.lineTo(xS(data.length - 1), H - pad.b); ctx.lineTo(xS(0), H - pad.b);
    ctx.closePath(); ctx.fillStyle = g; ctx.fill();
    ctx.beginPath();
    data.forEach((d, i) => i === 0 ? ctx.moveTo(xS(i), yS(d.v)) : ctx.lineTo(xS(i), yS(d.v)));
    ctx.strokeStyle = "var(--accent,#00e5a0)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "#475569"; ctx.font = "10px monospace"; ctx.textAlign = "center";
    [[0, data[0].t],[Math.floor(data.length / 2), data[Math.floor(data.length / 2)]?.t],[data.length - 1, data[data.length - 1].t]].forEach(([i, l]) => {
      if (l) ctx.fillText(String(l).substring(0, 10), xS(i), H - 6);
    });
  }, [data, height]);
  if (!data || data.length < 2) return <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 13 }}>No history yet</div>;
  return <canvas ref={ref} style={{ width: "100%", height, display: "block" }} />;
}

function DonutChart({ slices, total, size = 160 }) {
  const cx = size / 2, cy = size / 2, r = size * 0.38, inn = size * 0.24;
  let cum = -Math.PI / 2;
  const paths = slices.map((s, i) => {
    const sw = (s.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cum), y1 = cy + r * Math.sin(cum);
    const x2 = cx + r * Math.cos(cum + sw), y2 = cy + r * Math.sin(cum + sw);
    const xi1 = cx + inn * Math.cos(cum + sw), yi1 = cy + inn * Math.sin(cum + sw);
    const xi2 = cx + inn * Math.cos(cum), yi2 = cy + inn * Math.sin(cum);
    const lg = sw > Math.PI ? 1 : 0;
    const d = `M${x1},${y1} A${r},${r} 0 ${lg},1 ${x2},${y2} L${xi1},${yi1} A${inn},${inn} 0 ${lg},0 ${xi2},${yi2} Z`;
    cum += sw;
    return <path key={i} d={d} fill={s.color} opacity={0.9} />;
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths}
      <circle cx={cx} cy={cy} r={inn - 2} fill="var(--surface,#0f172a)" />
      <text x={cx} y={cy - 4} textAnchor="middle" fill="var(--muted,#94a3b8)" fontSize="10">{slices.length}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="var(--text,#e2e8f0)" fontSize="9">assets</text>
    </svg>
  );
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [portfolio, setPortfolio] = useState(null);
  const [prices, setPrices] = useState({});
  const [history, setHistory] = useState({ intraday: [], daily: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("holdings");
  const [chartRange, setChartRange] = useState("1W");
  const [tradeForm, setTradeForm] = useState({ action: "BUY", coin: "", amountType: "Dollar Amount", amount: "", reasoning: "" });
  const [tradeStatus, setTradeStatus] = useState(null);
  const [executing, setExecuting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [marketStatus, setMarketStatus] = useState(null);
  const [classId, setClassId] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [watchForm, setWatchForm] = useState({ coin: "", targetPrice: "", direction: "above" });
  const [watchStatus, setWatchStatus] = useState(null);
  const [earnedBadge, setEarnedBadge] = useState(null);

  useEffect(() => { applyTheme(getTheme()); }, []);

  const fetchData = useCallback(async () => {
    try {
      const [pRes, prRes, hRes, mRes, meRes] = await Promise.all([
        fetch("/api/portfolio"), fetch("/api/prices"),
        fetch(`/api/history?range=${chartRange}`),
        fetch("/api/market"), fetch("/api/me"),
      ]);
      if (pRes.ok) { setPortfolio(await pRes.json()); setLastUpdated(new Date()); }
      if (prRes.ok) setPrices(await prRes.json());
      if (hRes.ok) setHistory(await hRes.json());
      if (mRes.ok) setMarketStatus(await mRes.json());
      if (meRes.ok) { const me = await meRes.json(); setClassId(me?.classes?.[0]?.id); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [chartRange]);

  const fetchWatchlist = useCallback(async () => {
    const res = await fetch("/api/watchlist");
    if (res.ok) setWatchlist(await res.json());
  }, []);

  useEffect(() => { if (status === "unauthenticated") router.replace("/"); }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchData(); fetchWatchlist();
      const iv = setInterval(fetchData, 60000);
      return () => clearInterval(iv);
    }
  }, [status, fetchData, fetchWatchlist]);

  // Refetch history when range changes
  useEffect(() => {
    if (status === "authenticated") fetchData();
  }, [chartRange]);

  if (status === "loading" || status === "unauthenticated")
    return <div style={{ background: "var(--bg,#080c14)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted,#475569)" }}>Loading...</div>;

  const executeTrade = async () => {
    if (!tradeForm.coin || !tradeForm.amount) { setTradeStatus({ type: "error", msg: "Fill in all fields." }); return; }
    setExecuting(true); setTradeStatus({ type: "pending", msg: "Executing..." });
    try {
      const res = await fetch("/api/trade", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(tradeForm) });
      const data = await res.json();
      if (res.ok) {
        setTradeStatus({ type: "success", msg: `✓ ${tradeForm.action} ${tradeForm.coin} executed` });
        if (data.newBadge) setEarnedBadge(data.newBadge);
        setTradeForm((f) => ({ ...f, amount: "", reasoning: "" }));
        setTimeout(() => { fetchData(); setTradeStatus(null); }, 2000);
      } else setTradeStatus({ type: "error", msg: data.error || "Trade failed" });
    } catch { setTradeStatus({ type: "error", msg: "Network error" }); }
    finally { setExecuting(false); }
  };

  const sellAll = async () => {
    if (!confirm("Sell ALL holdings? Cannot be undone.")) return;
    setExecuting(true); setTradeStatus({ type: "pending", msg: "Liquidating..." });
    try {
      const res = await fetch("/api/trade/sellall", { method: "POST" });
      const data = await res.json();
      if (res.ok) { setTradeStatus({ type: "success", msg: "✓ All positions sold" }); setTimeout(() => { fetchData(); setTradeStatus(null); }, 2000); }
      else setTradeStatus({ type: "error", msg: data.error || "Failed" });
    } catch { setTradeStatus({ type: "error", msg: "Network error" }); }
    finally { setExecuting(false); }
  };

  const addWatch = async () => {
    if (!watchForm.coin || !watchForm.targetPrice) { setWatchStatus({ type: "error", msg: "Fill in all fields" }); return; }
    const res = await fetch("/api/watchlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...watchForm, classId }) });
    const data = await res.json();
    if (res.ok) {
      setWatchStatus({ type: "success", msg: "✅ Alert added" });
      if (data.newBadge) setEarnedBadge(data.newBadge);
      setWatchForm({ coin: "", targetPrice: "", direction: "above" });
      fetchWatchlist();
      setTimeout(() => setWatchStatus(null), 3000);
    } else setWatchStatus({ type: "error", msg: data.error || "Failed" });
  };

  const removeWatch = async (id) => {
    await fetch("/api/watchlist", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    fetchWatchlist();
  };

  const { summary, holdings = [], history: tradeHistory = [] } = portfolio || {};
  const cash = clean(summary?.cash);
  const totalVal = clean(summary?.totalVal);
  const pl = clean(summary?.pl);
  const returnPct = clean(summary?.returnPct);
  const fees = clean(summary?.fees);
  const isProfitable = pl >= 0;

  const holdingsArr = Array.isArray(holdings) ? holdings : [];
  const holdingsWithVal = holdingsArr.map((h) => ({
    ticker: h.coin || h[0], qty: h.qty || clean(h[1]),
    avgBuy: h.avgBuy || clean(h[2]), curPrice: h.curPrice || clean(h[3]),
    curVal: h.curVal || (h.qty || clean(h[1])) * (h.curPrice || clean(h[3])),
    plPct: h.plPct || clean(h[7]),
  }));
  const totalPortVal = holdingsWithVal.reduce((s, h) => s + h.curVal, 0) + cash;
  const allSlices = [...holdingsWithVal.map((h) => ({ label: h.ticker, value: h.curVal, color: getCoinColor(h.ticker) })), { label: "Cash", value: cash, color: "#334155" }].filter((s) => s.value > 0);
  const availableCoins = Object.keys(prices).length > 0 ? Object.keys(prices) : holdingsWithVal.map((h) => h.ticker);

  // Use intraday for short ranges, daily for longer
  const chartData = ["1D","3D","1W"].includes(chartRange) ? history.intraday : history.daily;

  const watchlistWithStatus = watchlist.map((w) => {
    const currentPrice = prices[w.coin]?.price ? parseFloat(prices[w.coin].price) : null;
    const triggered = currentPrice !== null && ((w.direction === "above" && currentPrice >= parseFloat(w.target_price)) || (w.direction === "below" && currentPrice <= parseFloat(w.target_price)));
    return { ...w, currentPrice, triggered };
  });
  const triggeredCount = watchlistWithStatus.filter((w) => w.triggered).length;
  const noteCharCount = tradeForm.reasoning?.length || 0;
  const noteHelpsBadge = noteCharCount >= 50;
  const TABS = ["holdings","charts","allocation","trade","history","watchlist"];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--bg:#080c14;--surface:#0f172a;--surface2:#1a2235;--border:#1e293b;--accent:#00e5a0;--up:#00e5a0;--down:#f43f5e;--text:#e2e8f0;--muted:#475569;--gold:#f59e0b}
        body{background:var(--bg);color:var(--text);font-family:'DM Mono',monospace;min-height:100vh}
        .page{max-width:1100px;margin:0 auto;padding:24px 16px}
        .nav{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;margin-bottom:28px;background:var(--surface);border:1px solid var(--border);border-radius:16px;}
        .logo{font-family:'Syne',sans-serif;font-weight:800;font-size:16px}.logo span{color:var(--accent)}
        .nav-links{display:flex;gap:8px}
        .nav-link{padding:6px 14px;border-radius:8px;font-size:11px;text-decoration:none;color:var(--muted);letter-spacing:1px;transition:all .2s;text-transform:uppercase}
        .nav-link:hover{color:var(--accent)}.nav-link.active{background:rgba(0,180,100,.12);color:var(--accent);border:1px solid rgba(0,180,100,.25)}
        .hero{background:var(--surface);border:1px solid var(--border);border-radius:24px;padding:32px;margin-bottom:20px}
        .hero-label{font-size:10px;color:var(--muted);letter-spacing:3px;text-transform:uppercase;margin-bottom:8px}
        .hero-value{font-family:'Syne',sans-serif;font-weight:800;font-size:52px;letter-spacing:-2px;line-height:1;margin-bottom:8px}
        .hero-change{display:inline-flex;align-items:center;gap:6px;font-size:13px;margin-bottom:28px;padding:4px 10px;border-radius:8px}
        .hero-change.up{color:var(--up);background:rgba(0,180,100,.12)}.hero-change.down{color:var(--down);background:rgba(220,38,38,.1)}
        .hero-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
        .stat{background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:14px}
        .stat-label{font-size:9px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;margin-bottom:4px}
        .stat-value{font-size:15px;font-weight:500;color:var(--text)}.stat-value.up{color:var(--up)}.stat-value.down{color:var(--down)}
        .hero-actions{display:flex;gap:10px;flex-wrap:wrap}
        .btn{padding:10px 20px;border-radius:12px;border:none;font-family:'DM Mono',monospace;font-size:11px;font-weight:500;cursor:pointer;transition:all .2s;letter-spacing:.5px;text-decoration:none;display:inline-block}
        .btn-primary{background:var(--accent);color:#fff}.btn-primary:hover{opacity:.9;transform:translateY(-1px)}.btn-primary:disabled{opacity:.5;cursor:not-allowed}
        .btn-secondary{background:var(--surface2);color:var(--text);border:1px solid var(--border)}.btn-secondary:hover{border-color:var(--accent);color:var(--accent)}
        .btn-danger{background:transparent;color:var(--down);border:1px solid rgba(220,38,38,.3)}.btn-danger:hover{background:rgba(220,38,38,.08)}
        .tabs{display:flex;gap:4px;margin-bottom:20px;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:4px;flex-wrap:wrap}
        .tab{flex:1;padding:9px;text-align:center;border-radius:10px;border:none;background:transparent;font-family:'DM Mono',monospace;font-size:11px;color:var(--muted);cursor:pointer;transition:all .2s;min-width:60px;position:relative}
        .tab.active{background:var(--surface2);color:var(--accent);border:1px solid var(--border)}
        .tab-badge{position:absolute;top:4px;right:4px;width:14px;height:14px;border-radius:50%;background:var(--down);color:#fff;font-size:8px;display:flex;align-items:center;justify-content:center;font-weight:700}
        .panel{animation:fadeIn .25s ease}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:22px}
        .holding-row{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:14px 18px;display:grid;grid-template-columns:40px 1fr auto auto;align-items:center;gap:14px;margin-bottom:10px;transition:all .2s}
        .holding-row:hover{border-color:rgba(0,180,100,.2)}
        .coin-icon{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-weight:800;font-size:12px}
        .pct-badge{font-size:11px;font-weight:500;padding:3px 8px;border-radius:7px;white-space:nowrap}
        .pct-badge.up{color:var(--up);background:rgba(0,180,100,.12)}.pct-badge.down{color:var(--down);background:rgba(220,38,38,.1)}
        .cash-row{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;margin-top:10px}
        .chart-card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:22px;margin-bottom:16px}
        .chart-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px}
        .range-btns{display:flex;gap:4px}
        .range-btn{padding:4px 10px;border-radius:8px;border:1px solid var(--border);background:transparent;font-family:'DM Mono',monospace;font-size:11px;color:var(--muted);cursor:pointer;transition:all .2s}
        .range-btn.active{background:var(--accent);color:#fff;border-color:var(--accent)}
        .trade-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .trade-card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:22px}
        .form-group{margin-bottom:12px}
        .form-label{font-size:10px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;display:block;margin-bottom:5px}
        .form-select,.form-input,.form-textarea{width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px 13px;color:var(--text);font-family:'DM Mono',monospace;font-size:12px;outline:none;transition:border-color .2s;appearance:none}
        .form-textarea{resize:vertical;min-height:80px;line-height:1.6}
        .form-select:focus,.form-input:focus,.form-textarea:focus{border-color:var(--accent)}
        .note-helper{font-size:10px;margin-top:4px;display:flex;justify-content:space-between}
        .action-toggle{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px}
        .action-btn{padding:9px;border-radius:10px;border:1px solid var(--border);background:transparent;font-family:'DM Mono',monospace;font-size:12px;color:var(--muted);cursor:pointer;transition:all .2s}
        .action-btn.active-buy{background:rgba(0,180,100,.12);color:var(--up);border-color:rgba(0,180,100,.3)}
        .action-btn.active-sell{background:rgba(220,38,38,.1);color:var(--down);border-color:rgba(220,38,38,.3)}
        .trade-status{padding:10px 14px;border-radius:10px;font-size:12px;margin-top:10px}
        .trade-status.success{background:rgba(0,180,100,.1);color:var(--up);border:1px solid rgba(0,180,100,.2)}
        .trade-status.error{background:rgba(220,38,38,.1);color:var(--down);border:1px solid rgba(220,38,38,.2)}
        .trade-status.pending{background:rgba(59,130,246,.1);color:#60a5fa;border:1px solid rgba(59,130,246,.2)}
        .sell-all-card{background:rgba(220,38,38,.04);border:1px solid rgba(220,38,38,.2);border-radius:20px;padding:18px;margin-top:16px;display:flex;align-items:center;justify-content:space-between;gap:16px}
        .history-row{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:13px 16px;display:grid;grid-template-columns:34px 1fr auto;align-items:start;gap:12px;margin-bottom:8px}
        .tx-icon{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
        .tx-buy{background:rgba(0,180,100,.1)}.tx-sell{background:rgba(220,38,38,.1)}
        .trade-note{font-size:10px;color:var(--muted);margin-top:3px;font-style:italic;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:280px}
        .freeze-banner{background:rgba(220,38,38,.1);border:1px solid rgba(220,38,38,.3);border-radius:12px;padding:12px 16px;margin-bottom:20px;font-size:12px;color:var(--down);text-align:center}
        .skeleton{background:linear-gradient(90deg,var(--surface) 25%,var(--surface2) 50%,var(--surface) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:8px}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .empty{text-align:center;padding:48px 0;color:var(--muted);font-size:13px}
        .alloc-inner{display:flex;align-items:center;gap:24px;flex-wrap:wrap}
        .legend{flex:1;display:flex;flex-direction:column;gap:8px;min-width:140px}
        .legend-row{display:flex;align-items:center;gap:8px}
        .legend-dot{width:10px;height:10px;border-radius:3px;flex-shrink:0}
        .nav-dot{width:7px;height:7px;border-radius:50%;background:var(--accent);animation:pulse 2s infinite}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        .watch-row{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:14px 16px;display:grid;grid-template-columns:1fr auto auto auto;align-items:center;gap:12px;margin-bottom:8px;transition:all .2s}
        .watch-row.triggered{border-color:var(--gold);background:rgba(245,158,11,.05)}
        .watch-triggered-badge{font-size:9px;font-weight:700;padding:3px 8px;border-radius:6px;background:rgba(245,158,11,.15);color:var(--gold);letter-spacing:1px}
        .badge-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--surface);border:2px solid var(--gold);border-radius:16px;padding:14px 24px;font-size:14px;z-index:9999;text-align:center;animation:slideUp .4s ease}
        @keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        .watch-form{background:var(--surface2);border:1px solid var(--border);border-radius:16px;padding:18px;margin-bottom:16px}
        .watch-form-grid{display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:10px;align-items:end}
        @media(max-width:640px){.hero-value{font-size:36px}.hero-stats{grid-template-columns:1fr 1fr}.trade-grid{grid-template-columns:1fr}.watch-form-grid{grid-template-columns:1fr 1fr}.range-btns{flex-wrap:wrap}}
      `}</style>

      <div className="page">
        <nav className="nav">
          <div className="logo">CRYPTO<span>CLASS</span></div>
          <div className="nav-links">
            <a href="/dashboard" className="nav-link active">Wallet</a>
            <Link href="/leaderboard" className="nav-link">Leaderboard</Link>
            <Link href="/market" className="nav-link">Market</Link>
            <Link href="/news" className="nav-link">News</Link>
            <Link href="/badges" className="nav-link">Badges</Link>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ThemeToggle />
            <div className="nav-dot" />
            <span style={{ fontSize: 10, color: "var(--muted)", letterSpacing: 1 }}>LIVE</span>
          </div>
        </nav>

        {marketStatus?.frozen && <div className="freeze-banner">🚫 {marketStatus.freezeReason}</div>}
        {lastUpdated && <div style={{ fontSize: 10, color: "var(--muted)", textAlign: "right", marginBottom: 16 }}>Updated {lastUpdated.toLocaleTimeString()}</div>}

        {loading ? (
          <>
            <div className="skeleton" style={{ height: 220, marginBottom: 20 }} />
            <div className="skeleton" style={{ height: 44, marginBottom: 20 }} />
            {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 70, marginBottom: 10 }} />)}
          </>
        ) : (
          <>
            <div className="hero">
              <div className="hero-label">Total Portfolio Value</div>
              <div className="hero-value" style={{ color: isProfitable ? "var(--up)" : "var(--down)" }}>
                ${Math.floor(totalVal).toLocaleString()}<span style={{ fontSize: 30, opacity: 0.6 }}>.{totalVal.toFixed(2).split(".")[1]}</span>
              </div>
              <div className={`hero-change ${isProfitable ? "up" : "down"}`}>
                <span>{isProfitable ? "▲" : "▼"}</span>
                <span>{isProfitable ? "+" : ""}{fmtUSD(pl)} ({fmtPct(returnPct)})</span>
              </div>
              <div className="hero-stats">
                <div className="stat"><div className="stat-label">Cash</div><div className="stat-value">{fmtUSD(cash)}</div></div>
                <div className="stat"><div className="stat-label">Holdings</div><div className="stat-value">{fmtUSD(clean(summary?.holdingsVal))}</div></div>
                <div className="stat"><div className="stat-label">Return</div><div className={`stat-value ${isProfitable ? "up" : "down"}`}>{fmtPct(returnPct)}</div></div>
                <div className="stat"><div className="stat-label">Fees Paid</div><div className="stat-value" style={{ color: "var(--muted)" }}>{fmtUSD(fees)}</div></div>
              </div>
              <div className="hero-actions">
                <button className="btn btn-primary" onClick={() => setActiveTab("trade")}>+ New Trade</button>
                <button className="btn btn-secondary" onClick={fetchData}>↻ Refresh</button>
                <Link href="/leaderboard" className="btn btn-secondary">🏆 Leaderboard</Link>
              </div>
            </div>

            <div className="tabs">
              {TABS.map((t) => (
                <button key={t} className={`tab${activeTab === t ? " active" : ""}`} onClick={() => setActiveTab(t)}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                  {t === "watchlist" && triggeredCount > 0 && <span className="tab-badge">{triggeredCount}</span>}
                </button>
              ))}
            </div>

            {activeTab === "holdings" && (
              <div className="panel">
                {holdingsWithVal.length === 0 ? (
                  <div className="empty">No holdings yet — make a trade to get started!</div>
                ) : (
                  <>
                    {holdingsWithVal.map((h, i) => (
                      <div className="holding-row" key={i}>
                        <div className="coin-icon" style={{ background: `${getCoinColor(h.ticker)}22`, color: getCoinColor(h.ticker) }}>{h.ticker.slice(0, 3)}</div>
                        <div>
                          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13 }}>{h.ticker}</div>
                          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{prices[h.ticker] ? `$${parseFloat(prices[h.ticker].price).toLocaleString()}` : `Avg $${h.avgBuy.toFixed(4)}`}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13 }}>{fmtUSD(h.curVal)}</div>
                          <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{fmtNum(h.qty)} {h.ticker}</div>
                        </div>
                        <div className={`pct-badge ${h.plPct >= 0 ? "up" : "down"}`}>{h.plPct >= 0 ? "▲" : "▼"} {Math.abs(h.plPct).toFixed(2)}%</div>
                      </div>
                    ))}
                    <div className="cash-row">
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(71,85,105,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>💵</div>
                        <div>
                          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13 }}>Cash</div>
                          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Available</div>
                        </div>
                      </div>
                      <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15 }}>{fmtUSD(cash)}</div>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === "charts" && (
              <div className="panel">
                <div className="chart-card">
                  <div className="chart-header">
                    <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, color: "var(--text)" }}>Portfolio Value Over Time</div>
                    <div className="range-btns">
                      {["1D","3D","1W","1M","3M","ALL"].map((r) => (
                        <button key={r} className={`range-btn${chartRange === r ? " active" : ""}`} onClick={() => setChartRange(r)}>{r}</button>
                      ))}
                    </div>
                  </div>
                  <LineChart data={chartData} height={200} />
                </div>
              </div>
            )}

            {activeTab === "allocation" && (
              <div className="panel">
                <div className="card">
                  {allSlices.length === 0 ? <div className="empty">No allocation data yet.</div> : (
                    <div className="alloc-inner">
                      <DonutChart slices={allSlices} total={totalPortVal} />
                      <div className="legend">
                        {allSlices.map((s, i) => (
                          <div className="legend-row" key={i}>
                            <div className="legend-dot" style={{ background: s.color }} />
                            <div style={{ flex: 1, fontSize: 11, color: "var(--text)" }}>{s.label}</div>
                            <div style={{ fontSize: 11, color: "var(--muted)" }}>{((s.value / totalPortVal) * 100).toFixed(1)}%</div>
                            <div style={{ fontSize: 11, color: "var(--muted)", marginLeft: 4 }}>{fmtUSD(s.value)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "trade" && (
              <div className="panel">
                <div className="trade-grid">
                  <div className="trade-card">
                    <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Execute Trade</h3>
                    <div className="action-toggle">
                      <button className={`action-btn${tradeForm.action === "BUY" ? " active-buy" : ""}`} onClick={() => setTradeForm((f) => ({ ...f, action: "BUY" }))}>▲ BUY</button>
                      <button className={`action-btn${tradeForm.action === "SELL" ? " active-sell" : ""}`} onClick={() => setTradeForm((f) => ({ ...f, action: "SELL" }))}>▼ SELL</button>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Coin</label>
                      <select className="form-select" value={tradeForm.coin} onChange={(e) => setTradeForm((f) => ({ ...f, coin: e.target.value }))}>
                        <option value="">Select a coin...</option>
                        {availableCoins.map((c) => <option key={c} value={c}>{c}{prices[c] ? ` — $${parseFloat(prices[c].price).toLocaleString()}` : ""}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Amount Type</label>
                      <select className="form-select" value={tradeForm.amountType} onChange={(e) => setTradeForm((f) => ({ ...f, amountType: e.target.value }))}>
                        <option value="Dollar Amount">Dollar Amount ($)</option>
                        <option value="# of Coins"># of Coins</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">{tradeForm.amountType === "Dollar Amount" ? "Amount (USD)" : "Quantity"}</label>
                      <input type="number" className="form-input" placeholder="0.00" min="0" step="any" value={tradeForm.amount} onChange={(e) => setTradeForm((f) => ({ ...f, amount: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>💭 Trade Reasoning</span>
                        <span style={{ color: noteHelpsBadge ? "var(--up)" : "var(--muted)", fontSize: 9 }}>
                          {noteHelpsBadge ? "✓ Counts toward Due Diligence badge" : "Badges: 5 notes = Analyst, 15 = Researcher"}
                        </span>
                      </label>
                      <textarea className="form-textarea" placeholder="Why are you making this trade? What's your strategy? (optional but earns badges!)" value={tradeForm.reasoning} onChange={(e) => setTradeForm((f) => ({ ...f, reasoning: e.target.value }))} />
                      <div className="note-helper">
                        <span style={{ color: noteHelpsBadge ? "var(--up)" : "var(--muted)" }}>{noteCharCount >= 50 ? "✓ 50+ chars" : `${noteCharCount}/50 for Due Diligence`}</span>
                        <span style={{ color: "var(--muted)" }}>{noteCharCount} chars</span>
                      </div>
                    </div>
                    {tradeForm.coin && tradeForm.amount && prices[tradeForm.coin] && (
                      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10, padding: "7px 11px", background: "var(--surface2)", borderRadius: 8 }}>
                        Est: {tradeForm.amountType === "Dollar Amount" ? `${(parseFloat(tradeForm.amount) / parseFloat(prices[tradeForm.coin].price)).toFixed(6)} ${tradeForm.coin}` : fmtUSD(parseFloat(tradeForm.amount) * parseFloat(prices[tradeForm.coin].price))}
                        &nbsp;·&nbsp;Fee: {fmtUSD((parseFloat(tradeForm.amount) || 0) * 0.005)}
                      </div>
                    )}
                    <button className="btn btn-primary" style={{ width: "100%" }} onClick={executeTrade} disabled={executing || marketStatus?.frozen}>
                      {executing ? "Processing..." : marketStatus?.frozen ? "Market Frozen" : `${tradeForm.action} ${tradeForm.coin || "—"}`}
                    </button>
                    {tradeStatus && <div className={`trade-status ${tradeStatus.type}`}>{tradeStatus.msg}</div>}
                  </div>
                  <div className="trade-card">
                    <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Portfolio Summary</h3>
                    {[["Starting Cash",fmtUSD(10000),""],["Cash Remaining",fmtUSD(cash),""],["Holdings Value",fmtUSD(clean(summary?.holdingsVal)),""],["Total Value",fmtUSD(totalVal),""],["Profit / Loss",fmtUSD(pl),isProfitable?"up":"down"],["Return %",fmtPct(returnPct),isProfitable?"up":"down"],["Total Fees",fmtUSD(fees),""]].map(([label,val,cls]) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>{label}</span>
                        <span style={{ fontSize: 12, fontWeight: 500, color: cls === "up" ? "var(--up)" : cls === "down" ? "var(--down)" : "var(--text)" }}>{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="sell-all-card">
                  <div>
                    <strong style={{ color: "var(--down)", display: "block", marginBottom: 3, fontFamily: "'Syne',sans-serif" }}>⚠ Sell All Holdings</strong>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>Liquidates every position at market price. Cannot be undone.</span>
                  </div>
                  <button className="btn btn-danger" onClick={sellAll} disabled={executing || holdingsWithVal.length === 0}>Sell All</button>
                </div>
              </div>
            )}

            {activeTab === "history" && (
              <div className="panel">
                {!tradeHistory || tradeHistory.length === 0 ? <div className="empty">No trades yet.</div> : (
                  [...tradeHistory].reverse().slice(0, 50).map((t, i) => {
                    const isBuy = t.action === "BUY";
                    return (
                      <div className="history-row" key={i}>
                        <div className={`tx-icon ${isBuy ? "tx-buy" : "tx-sell"}`} style={{ marginTop: 2 }}>{isBuy ? "💰" : "📤"}</div>
                        <div>
                          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 600, fontSize: 13 }}>{t.action} {t.coin}</div>
                          <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{new Date(t.createdAt || t.created_at).toLocaleString()} · {(t.quantity || 0).toFixed(4)} {t.coin} @ ${(t.price || 0).toLocaleString()}</div>
                          {(t.reasoning || t.reasoning_text) && <div className="trade-note">💭 {t.reasoning || t.reasoning_text}</div>}
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 500, color: isBuy ? "var(--down)" : "var(--up)", textAlign: "right" }}>{isBuy ? "-" : "+"}{fmtUSD(t.grossValue || t.gross_value || 0)}</div>
                          <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2, textAlign: "right" }}>Fee: {fmtUSD(t.fee || 0)}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === "watchlist" && (
              <div className="panel">
                <div className="watch-form">
                  <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
                    👁 Add Price Alert
                    <span style={{ fontSize: 10, color: "var(--muted)", fontFamily: "'DM Mono',monospace", fontWeight: 400, marginLeft: 8 }}>Earns badges at 1, 10, and 20 alerts</span>
                  </div>
                  <div className="watch-form-grid">
                    <div>
                      <label className="form-label">Coin</label>
                      <select className="form-select" value={watchForm.coin} onChange={(e) => setWatchForm((f) => ({ ...f, coin: e.target.value }))}>
                        <option value="">Select...</option>
                        {availableCoins.map((c) => <option key={c} value={c}>{c}{prices[c] ? ` $${parseFloat(prices[c].price).toLocaleString()}` : ""}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Direction</label>
                      <select className="form-select" value={watchForm.direction} onChange={(e) => setWatchForm((f) => ({ ...f, direction: e.target.value }))}>
                        <option value="above">Goes Above</option>
                        <option value="below">Goes Below</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Target Price ($)</label>
                      <input type="number" className="form-input" placeholder="0.00" step="any" value={watchForm.targetPrice} onChange={(e) => setWatchForm((f) => ({ ...f, targetPrice: e.target.value }))} />
                    </div>
                    <button className="btn btn-primary" onClick={addWatch} style={{ marginTop: 18 }}>+ Add</button>
                  </div>
                  {watchStatus && <div className={`trade-status ${watchStatus.type}`} style={{ marginTop: 10 }}>{watchStatus.msg}</div>}
                </div>
                {watchlistWithStatus.length === 0 ? (
                  <div className="empty">
                    <div style={{ fontSize: 36, marginBottom: 12 }}>👁</div>
                    <div style={{ marginBottom: 8 }}>No price alerts yet.</div>
                    <div style={{ fontSize: 11 }}>Add your first alert above to earn the First Watch badge!</div>
                  </div>
                ) : (
                  <>
                    {triggeredCount > 0 && (
                      <div style={{ background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.3)", borderRadius: 12, padding: "10px 16px", marginBottom: 16, fontSize: 12, color: "var(--gold)" }}>
                        🔔 {triggeredCount} alert{triggeredCount > 1 ? "s" : ""} triggered!
                      </div>
                    )}
                    {watchlistWithStatus.map((w, i) => {
                      const currentPrice = w.currentPrice;
                      const pctAway = currentPrice && parseFloat(w.target_price) ? ((parseFloat(w.target_price) - currentPrice) / currentPrice) * 100 : null;
                      return (
                        <div key={i} className={`watch-row${w.triggered ? " triggered" : ""}`}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div className="coin-icon" style={{ width: 32, height: 32, borderRadius: 8, background: `${getCoinColor(w.coin)}22`, color: getCoinColor(w.coin), fontSize: 10 }}>{w.coin.slice(0, 3)}</div>
                              <div>
                                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13 }}>{w.coin}</div>
                                <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 1 }}>Alert when {w.direction} ${parseFloat(w.target_price).toLocaleString()}</div>
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            {currentPrice && <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 500 }}>${currentPrice.toLocaleString()}</div>}
                            {pctAway !== null && <div style={{ fontSize: 10, color: w.triggered ? "var(--gold)" : "var(--muted)", marginTop: 2 }}>{w.triggered ? "🎯 Triggered!" : `${Math.abs(pctAway).toFixed(1)}% away`}</div>}
                          </div>
                          {w.triggered && <span className="watch-triggered-badge">TRIGGERED</span>}
                          <button onClick={() => removeWatch(w.id)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 16, padding: 4, borderRadius: 6 }}>✕</button>
                        </div>
                      );
                    })}
                    <div style={{ fontSize: 10, color: "var(--muted)", textAlign: "center", marginTop: 12 }}>
                      {watchlist.length} alert{watchlist.length !== 1 ? "s" : ""} · {watchlist.length >= 20 ? "🔭 Veteran Watchman badge earned!" : watchlist.length >= 10 ? "🎯 Serious Watchman badge earned!" : `${10 - watchlist.length} more for Serious Watchman badge`}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {earnedBadge && (
        <div className="badge-toast">
          <div style={{ fontSize: 24, marginBottom: 4 }}>🏅</div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, color: "var(--gold)" }}>Badge Earned!</div>
          <div style={{ fontSize: 12, color: "var(--text)", marginTop: 2 }}>{BADGE_NAMES[earnedBadge] || earnedBadge}</div>
          <button onClick={() => setEarnedBadge(null)} style={{ marginTop: 8, background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 11 }}>dismiss</button>
        </div>
      )}
    </>
  );
}