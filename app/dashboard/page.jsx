"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import BadgeToast from "@/components/BadgeToast";
import { applyTheme, getTheme } from "@/lib/theme";

const fmtUSD = (n) => {
  const x = parseFloat(n);
  return isNaN(x)
    ? "$0.00"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(x);
};
const fmtPct = (n) => {
  const x = parseFloat(n);
  return isNaN(x) ? "0.00%" : (x >= 0 ? "+" : "") + x.toFixed(2) + "%";
};
const fmtNum = (n) => {
  const x = parseFloat(n);
  if (isNaN(x)) return "0";
  if (x >= 1000) return x.toLocaleString("en-US", { maximumFractionDigits: 4 });
  return x.toFixed(6).replace(/\.?0+$/, "");
};
const clean = (s) => parseFloat(String(s || "").replace(/[$,%]/g, "")) || 0;

const COIN_COLORS = {
  BTC: "#f7931a",
  ETH: "#627eea",
  SOL: "#9945ff",
  ADA: "#0033ad",
  DOGE: "#c2a633",
  AVAX: "#e84142",
  DOT: "#e6007a",
  LINK: "#2a5ada",
  MATIC: "#8247e5",
  XRP: "#00aae4",
  BNB: "#f3ba2f",
  SHIB: "#ff0000",
  LTC: "#bfbbbb",
  UNI: "#ff007a",
  ATOM: "#6f7390",
  DEFAULT: "#00e5a0",
};
const getCoinColor = (t) =>
  COIN_COLORS[t?.toUpperCase()] || COIN_COLORS.DEFAULT;

const BADGE_NAMES = {
  first_watch: "👀 First Watch",
  serious_watch: "🎯 Serious Watchman",
  veteran_watch: "🔭 Veteran Watchman",
  analyst: "📝 Analyst",
  researcher: "📖 Researcher",
  due_diligence: "🔍 Due Diligence",
  signal_found: "📡 Signal Found",
  data_chef: "🍳 Data Chef",
  market_pulse: "💓 Market Pulse",
  price_oracle: "🔮 Price Oracle",
  omniscient: "🌐 Omniscient",
};

function LineChart({ data, benchmarkData, height = 160 }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c || !data || data.length < 2) return;
    const ctx = c.getContext("2d"),
      W = c.offsetWidth || 600,
      H = height;
    c.width = W;
    c.height = H;
    ctx.clearRect(0, 0, W, H);

    const hasBench = benchmarkData && benchmarkData.length >= 2;
    const allVals = [...data.map(d => d.v), ...(hasBench ? benchmarkData.map(d => d.v) : [])];
    const mn = Math.min(...allVals),
      mx = Math.max(...allVals),
      rng = mx - mn || 1;
    const pad = { t: 10, b: 24, l: 8, r: 8 },
      iW = W - pad.l - pad.r,
      iH = H - pad.t - pad.b;
    const xS = (i, len) => pad.l + (i / (len - 1)) * iW,
      yS = (v) => pad.t + iH - ((v - mn) / rng) * iH;

    // Benchmark line (dashed, muted)
    if (hasBench) {
      ctx.beginPath();
      benchmarkData.forEach((d, i) => i === 0 ? ctx.moveTo(xS(i, benchmarkData.length), yS(d.v)) : ctx.lineTo(xS(i, benchmarkData.length), yS(d.v)));
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Portfolio fill
    const g = ctx.createLinearGradient(0, pad.t, 0, H - pad.b);
    g.addColorStop(0, "rgba(0,229,160,.2)");
    g.addColorStop(1, "rgba(0,229,160,0)");
    ctx.beginPath();
    data.forEach((d, i) => i === 0 ? ctx.moveTo(xS(i, data.length), yS(d.v)) : ctx.lineTo(xS(i, data.length), yS(d.v)));
    ctx.lineTo(xS(data.length - 1, data.length), H - pad.b);
    ctx.lineTo(xS(0, data.length), H - pad.b);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();

    // Portfolio line
    ctx.beginPath();
    data.forEach((d, i) => i === 0 ? ctx.moveTo(xS(i, data.length), yS(d.v)) : ctx.lineTo(xS(i, data.length), yS(d.v)));
    ctx.strokeStyle = "var(--accent,#00e5a0)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // X-axis labels
    ctx.fillStyle = "#475569";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    [
      [0, data[0].t],
      [Math.floor(data.length / 2), data[Math.floor(data.length / 2)]?.t],
      [data.length - 1, data[data.length - 1].t],
    ].forEach(([i, l]) => {
      if (l) ctx.fillText(String(l).substring(0, 10), xS(i, data.length), H - 6);
    });
  }, [data, benchmarkData, height]);
  if (!data || data.length < 2)
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 12, textAlign: "center", padding: "0 16px" }}>
        No chart data yet — make 2+ trades to see your portfolio value over time
      </div>
    );
  return (
    <canvas ref={ref} style={{ width: "100%", height, display: "block" }} />
  );
}

function DonutChart({ slices, total, size = 160 }) {
  const cx = size / 2,
    cy = size / 2,
    r = size * 0.38,
    inn = size * 0.24;
  let cum = -Math.PI / 2;
  const paths = slices.map((s, i) => {
    const sw = (s.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cum),
      y1 = cy + r * Math.sin(cum);
    const x2 = cx + r * Math.cos(cum + sw),
      y2 = cy + r * Math.sin(cum + sw);
    const xi1 = cx + inn * Math.cos(cum + sw),
      yi1 = cy + inn * Math.sin(cum + sw);
    const xi2 = cx + inn * Math.cos(cum),
      yi2 = cy + inn * Math.sin(cum);
    const lg = sw > Math.PI ? 1 : 0;
    const d = `M${x1},${y1} A${r},${r} 0 ${lg},1 ${x2},${y2} L${xi1},${yi1} A${inn},${inn} 0 ${lg},0 ${xi2},${yi2} Z`;
    cum += sw;
    return <path key={i} d={d} fill={s.color} opacity={0.9} />;
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths}
      <circle cx={cx} cy={cy} r={inn - 2} fill="var(--surface,#0f172a)" />
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        fill="var(--muted,#94a3b8)"
        fontSize="10"
      >
        {slices.length}
      </text>
      <text
        x={cx}
        y={cy + 10}
        textAnchor="middle"
        fill="var(--text,#e2e8f0)"
        fontSize="9"
      >
        assets
      </text>
    </svg>
  );
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [portfolio, setPortfolio] = useState(null);
  const [portfolioError, setPortfolioError] = useState(null);
  const [prices, setPrices] = useState({});
  const [history, setHistory] = useState({ intraday: [], daily: [], intradayAvg: [], dailyAvg: [] });
  const [showBenchmark, setShowBenchmark] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("holdings");
  const [chartRange, setChartRange] = useState("1W");
  const [tradeForm, setTradeForm] = useState({
    action: "BUY",
    coin: "",
    amountType: "Dollar Amount",
    amount: "",
    reasoning: "",
    leverageMultiplier: 1,
  });
  const [tradeStatus, setTradeStatus] = useState(null);
  const [executing, setExecuting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [marketStatus, setMarketStatus] = useState(null);
  const [activeMarketEvent, setActiveMarketEvent] = useState(null);
  const [classId, setClassId] = useState(null);
  const [dailyChallenge, setDailyChallenge] = useState(null);
  const [weeklyChallenge, setWeeklyChallenge] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [pieView, setPieView] = useState('coin');
  const [watchlist, setWatchlist] = useState([]);
  const [watchForm, setWatchForm] = useState({
    coin: "",
    targetPrice: "",
    direction: "above",
  });
  const [watchStatus, setWatchStatus] = useState(null);
  const [earnedBadge, setEarnedBadge] = useState(null);
  const [milestoneToast, setMilestoneToast] = useState(null);
  const [postMortem, setPostMortem] = useState(null);
  const [tokensAwarded, setTokensAwarded] = useState(0);
  const [redeemingTokens, setRedeemingTokens] = useState(false);
  const [historyLimit, setHistoryLimit] = useState(50);
  const [historyFilter, setHistoryFilter] = useState("ALL");
  const [historySearch, setHistorySearch] = useState("");
  const [orderMode, setOrderMode] = useState("market");
  const [limitPrice, setLimitPrice] = useState("");
  const [pendingOrders, setPendingOrders] = useState([]);
  const [ordersTableReady, setOrdersTableReady] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshCooldown, setRefreshCooldown] = useState(null);
  const [refreshCountdown, setRefreshCountdown] = useState("");
  const [refreshResult, setRefreshResult] = useState(null);
  const [executedOrders, setExecutedOrders] = useState([]);
  const [dismissedOrderAlerts, setDismissedOrderAlerts] = useState(false);
  const [showRewardDetail, setShowRewardDetail] = useState(false);
  const [rewardLedger, setRewardLedger] = useState(null);
  const [rewardLessons, setRewardLessons] = useState([]);
  const [rewardModules, setRewardModules] = useState([]);
  const [stakingData, setStakingData] = useState(null);
  const [dcaOrders, setDcaOrders] = useState([]);
  const [dcaForm, setDcaForm] = useState({ coin: '', amountUsd: '', frequency: 'daily' });
  const [dcaStatus, setDcaStatus] = useState(null);
  const [feedItems, setFeedItems] = useState([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedReactions, setFeedReactions] = useState({});
  const [activeTournament, setActiveTournament] = useState(null);
  const [activeAssignments, setActiveAssignments] = useState([]);
  const [optionsPositions, setOptionsPositions] = useState([]);
  const [expiringOptions, setExpiringOptions] = useState([]);
  const [optionsForm, setOptionsForm] = useState({ coin: '', type: 'call', strikeMode: 'atm', customStrike: '', expiryDays: 7 });
  const [optionsStatus, setOptionsStatus] = useState(null);
  const [optionsTableReady, setOptionsTableReady] = useState(true);

  useEffect(() => {
    applyTheme(getTheme());
  }, []);

  // Check for options expiring within 48 hours on mount
  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/options')
      .then(r => r.ok ? r.json() : [])
      .then(opts => {
        if (!Array.isArray(opts)) return;
        setOptionsPositions(opts);
        const cutoff = Date.now() + 48 * 3600 * 1000;
        setExpiringOptions(opts.filter(o => o.status === 'open' && new Date(o.expires_at).getTime() <= cutoff));
      })
      .catch(() => {});
  }, [status]);

  const fetchData = useCallback(async () => {
    try {
      const [pRes, prRes, hRes, mRes, meRes, stRes] = await Promise.all([
        fetch("/api/portfolio"),
        fetch("/api/prices"),
        fetch(`/api/history?range=${chartRange}`),
        fetch("/api/market"),
        fetch("/api/me"),
        fetch("/api/staking"),
      ]);
      if (pRes.ok) {
        const pData = await pRes.json();
        setPortfolio(pData);
        setPortfolioError(null);
        setLastUpdated(new Date());
        if (pData.newMilestone) {
          setMilestoneToast(pData.newMilestone);
          setTimeout(() => setMilestoneToast(null), 6000);
        }
      } else {
        const errBody = await pRes.json().catch(() => ({}));
        console.error('[portfolio] API error:', pRes.status, errBody);
        setPortfolioError({ status: pRes.status, message: errBody.error || 'Unknown error' });
      }
      if (prRes.ok) {
        const prData = await prRes.json();
        setActiveMarketEvent(prData.__marketEvent || null);
        setPrices(prData);
      }
      if (hRes.ok) setHistory(await hRes.json());
      if (mRes.ok) setMarketStatus(await mRes.json());
      if (meRes.ok) {
        const me = await meRes.json();
        setClassId(me?.classes?.[0]?.id);
        if (me?.classes?.[0]?.id) {
        fetchDailyChallenge(me.classes[0].id);
        fetchWeeklyChallenge(me.classes[0].id);
      }
      }
      if (stRes.ok) setStakingData(await stRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [chartRange]);

  const fetchWatchlist = useCallback(async () => {
    const res = await fetch("/api/watchlist");
    if (res.ok) setWatchlist(await res.json());
  }, []);

  const fetchOrders = useCallback(async () => {
    const res = await fetch("/api/orders?includeRecent=true");
    if (res.ok) {
      const data = await res.json();
      if (data.tableNotReady) { setOrdersTableReady(false); return; }
      const all = Array.isArray(data) ? data : [];
      setPendingOrders(all.filter(o => o.status === 'pending'));
      const recent = all.filter(o => o.status === 'executed' && o.executed_at && Date.now() - new Date(o.executed_at).getTime() < 24 * 60 * 60 * 1000);
      if (recent.length) setExecutedOrders(recent);
    }
  }, []);

  const fetchRewardLedger = useCallback(async (cid) => {
    const id = cid || classId;
    if (!id) return;
    const res = await fetch(`/api/learn/rewards?classId=${id}`);
    if (res.ok) {
      const data = await res.json();
      setRewardLedger(data.ledger || []);
      setRewardLessons(data.lessons || []);
      setRewardModules(data.modules || []);
    }
  }, [classId]);

  const fetchDailyChallenge = useCallback(async (cid) => {
    const id = cid || classId;
    if (!id) return;
    const res = await fetch(`/api/daily-challenge?classId=${id}`);
    if (res.ok) setDailyChallenge(await res.json());
  }, [classId]);

  const fetchWeeklyChallenge = useCallback(async (cid) => {
    const id = cid || classId;
    if (!id) return;
    const res = await fetch(`/api/weekly-challenge?classId=${id}`);
    if (res.ok) setWeeklyChallenge(await res.json());
  }, [classId]);

  const fetchRefreshStatus = useCallback(async () => {
    const res = await fetch("/api/refresh");
    if (res.ok) {
      const data = await res.json();
      setRefreshCooldown(data.canRefresh ? null : new Date(data.nextRefreshAt));
    }
  }, []);

  const handlePriceRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshResult(null);
    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      const data = await res.json();
      if (res.status === 429 || data.blocked) {
        setRefreshCooldown(new Date(data.nextRefreshAt));
        setRefreshResult({ blocked: true });
      } else if (data.success) {
        setRefreshCooldown(new Date(data.nextRefreshAt));
        if (data.newBadge) setEarnedBadge(data.newBadge);
        setRefreshResult({
          pricesUpdated: data.pricesUpdated || 0,
          snapshots: data.intradaySnapshots || 0,
          errors: data.errors || [],
          at: new Date(),
        });
        await fetchData();
      }
    } catch (e) {
      console.error(e);
      setRefreshResult({ error: e.message });
    } finally {
      setRefreshing(false);
    }
  }, [fetchData]);

  // Countdown ticker
  useEffect(() => {
    if (!refreshCooldown) { setRefreshCountdown(""); return; }
    const tick = () => {
      const diff = refreshCooldown.getTime() - Date.now();
      if (diff <= 0) { setRefreshCooldown(null); setRefreshCountdown(""); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRefreshCountdown(`${m}:${s.toString().padStart(2, "0")}`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [refreshCooldown]);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchData();
      fetchWatchlist();
      fetchOrders();
      fetchRefreshStatus();
      fetch('/api/dca').then(r => r.ok ? r.json() : []).then(d => { if (Array.isArray(d)) setDcaOrders(d); });
      fetch('/api/tournament').then(r => r.ok ? r.json() : []).then(d => { if (Array.isArray(d)) { const active = d.find(t => t.status === 'active'); setActiveTournament(active || null); } }).catch(() => {});
      fetch('/api/assignments').then(r => r.ok ? r.json() : []).then(d => { if (Array.isArray(d)) setActiveAssignments(d.filter(a => !a.completed && !a.tableNotReady)); }).catch(() => {});
      const iv = setInterval(fetchData, 60000);
      return () => clearInterval(iv);
    }
  }, [status, fetchData, fetchWatchlist, fetchOrders, fetchRefreshStatus]);

  // Refetch history when range changes
  useEffect(() => {
    if (status === "authenticated") fetchData();
  }, [chartRange]);

  if (status === "loading" || status === "unauthenticated")
    return (
      <div
        style={{
          background: "var(--bg,#080c14)",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--muted,#475569)",
        }}
      >
        Loading...
      </div>
    );

  const executeTrade = async () => {
    if (!tradeForm.coin || !tradeForm.amount) {
      setTradeStatus({ type: "error", msg: "Fill in all fields." });
      return;
    }
    setExecuting(true);
    setTradeStatus({ type: "pending", msg: "Executing..." });
    try {
      const res = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tradeForm),
      });
      const data = await res.json();
      if (res.ok) {
        setTradeStatus({
          type: "success",
          msg: `✓ ${tradeForm.action} ${tradeForm.coin} executed`,
        });
        if (data.newBadge) setEarnedBadge(data.newBadge);
        if (data.tokensAwarded > 0) setTokensAwarded(data.tokensAwarded);
        if (data.postMortem) { setPostMortem(data.postMortem); }
        fetchDailyChallenge();
        setTradeForm((f) => ({ ...f, amount: "", reasoning: "" }));
        setTimeout(() => {
          fetchData();
          setTradeStatus(null);
        }, 2000);
      } else
        setTradeStatus({ type: "error", msg: data.error || "Trade failed" });
    } catch {
      setTradeStatus({ type: "error", msg: "Network error" });
    } finally {
      setExecuting(false);
    }
  };

  const placeOrder = async () => {
    const isStop = orderMode === 'stop';
    if (!tradeForm.coin || !tradeForm.amount || !limitPrice) {
      setTradeStatus({ type: "error", msg: `Fill in coin, amount, and ${isStop ? 'stop' : 'limit'} price.` });
      return;
    }
    const orderAction = isStop ? 'SELL_STOP' : tradeForm.action;
    setPlacingOrder(true);
    setTradeStatus({ type: "pending", msg: isStop ? "Setting stop-loss..." : "Placing limit order..." });
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...tradeForm, action: orderAction, limitPrice: parseFloat(limitPrice), classId }),
      });
      const data = await res.json();
      if (res.ok) {
        setTradeStatus({ type: "success", msg: isStop
          ? `🛑 Stop-loss set — sell ${tradeForm.coin} @ $${parseFloat(limitPrice).toLocaleString()}`
          : `✓ Limit order placed — ${tradeForm.action} ${tradeForm.coin} @ $${parseFloat(limitPrice).toLocaleString()}` });
        setTradeForm((f) => ({ ...f, amount: "", reasoning: "" }));
        setLimitPrice("");
        fetchOrders();
        setTimeout(() => setTradeStatus(null), 3000);
      } else {
        setTradeStatus({ type: "error", msg: data.error || "Failed to place order" });
      }
    } catch {
      setTradeStatus({ type: "error", msg: "Network error" });
    } finally {
      setPlacingOrder(false);
    }
  };

  const cancelOrder = async (id) => {
    await fetch("/api/orders", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    fetchOrders();
  };

  const sellAll = async () => {
    if (!confirm("Sell ALL holdings? Cannot be undone.")) return;
    setExecuting(true);
    setTradeStatus({ type: "pending", msg: "Liquidating..." });
    try {
      const res = await fetch("/api/trade/sellall", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setTradeStatus({ type: "success", msg: "✓ All positions sold" });
        setTimeout(() => {
          fetchData();
          setTradeStatus(null);
        }, 2000);
      } else setTradeStatus({ type: "error", msg: data.error || "Failed" });
    } catch {
      setTradeStatus({ type: "error", msg: "Network error" });
    } finally {
      setExecuting(false);
    }
  };

  const redeemTokens = async () => {
    if (redeemingTokens) return;
    setRedeemingTokens(true);
    try {
      const tokens = portfolio?.classRewardTokens || 0;
      const res = await fetch("/api/rewards/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: portfolio?.classId, tokens }),
      });
      const data = await res.json();
      if (res.ok) {
        setTradeStatus({
          type: "success",
          msg: `🎁 Redeemed ${data.tokensRedeemed} tokens for ${fmtUSD(
            data.cashAdded
          )}!`,
        });
        setTimeout(() => {
          fetchData();
          setTradeStatus(null);
        }, 2500);
      } else
        setTradeStatus({
          type: "error",
          msg: data.error || "Redemption failed",
        });
    } catch {
      setTradeStatus({ type: "error", msg: "Network error" });
    } finally {
      setRedeemingTokens(false);
    }
  };

  const addWatch = async () => {
    if (!watchForm.coin || !watchForm.targetPrice) {
      setWatchStatus({ type: "error", msg: "Fill in all fields" });
      return;
    }
    const res = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...watchForm, classId }),
    });
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
    await fetch("/api/watchlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchWatchlist();
  };

  const {
    summary,
    holdings = [],
    history: tradeHistory = [],
  } = portfolio || {};
  const cash = clean(summary?.cash);
  const totalVal = clean(summary?.totalVal);
  const pl = clean(summary?.pl);
  const returnPct = clean(summary?.returnPct);
  const fees = clean(summary?.fees);
  const isProfitable = pl >= 0;

  const holdingsArr = Array.isArray(holdings) ? holdings : [];
  const holdingsWithVal = holdingsArr.map((h) => ({
    ticker: h.coin || h[0],
    qty: h.qty || clean(h[1]),
    avgBuy: h.avgBuy || clean(h[2]),
    curPrice: h.curPrice || clean(h[3]),
    curVal: h.curVal || (h.qty || clean(h[1])) * (h.curPrice || clean(h[3])),
    plPct: h.plPct || clean(h[7]),
    isShort: h.isShort || false,
    marginBorrowed: h.marginBorrowed || 0,
  }));
  const totalBorrowed = holdingsWithVal.reduce((s, h) => s + (h.marginBorrowed || 0), 0);
  const totalPortVal = holdingsWithVal.reduce((s, h) => s + h.curVal, 0) + cash - totalBorrowed;
  const allSlices = [
    ...holdingsWithVal.filter(h => !h.isShort && h.curVal > 0).map((h) => ({
      label: h.ticker, value: h.curVal, color: getCoinColor(h.ticker),
    })),
    { label: "Cash", value: cash, color: "#334155" },
  ].filter((s) => s.value > 0);

  const SECTOR_COLORS_MAP = {'Layer 1':'#3b82f6','Layer 2':'#8b5cf6','DeFi':'#06b6d4','AI / Data':'#00e5a0','Gaming/NFT':'#f59e0b','Memecoin':'#f43f5e','Stablecoin':'#94a3b8','Exchange':'#f97316','Other':'#475569','Cash':'#334155'};
  const getSectorLocal = sym => { const M={'Layer 1':['BTC','ETH','SOL','ADA','AVAX','DOT','ATOM','NEAR','ALGO','XRP','LTC','BCH','TON','APT','SUI','TRX','VET','HBAR','ICP','FIL','XLM'],'Layer 2':['MATIC','ARB','OP','IMX','STX'],'DeFi':['UNI','AAVE','MKR','CRV','LINK','COMP','GRT','INJ'],'AI / Data':['FET','RNDR','WLD','TAO'],'Gaming/NFT':['SAND','MANA','AXS'],'Memecoin':['DOGE','SHIB','PEPE','BONK','FLOKI','WIF'],'Stablecoin':['USDT','USDC','DAI'],'Exchange':['BNB','OKB']}; for(const[s,c] of Object.entries(M)) if(c.includes(sym?.toUpperCase())) return s; return 'Other'; };
  const sectorSlicesRaw = {};
  holdingsWithVal.filter(h => !h.isShort && h.curVal > 0).forEach(h => { const s = getSectorLocal(h.ticker); sectorSlicesRaw[s] = (sectorSlicesRaw[s] || 0) + h.curVal; });
  if (cash > 0) sectorSlicesRaw['Cash'] = cash;
  const sectorSlices = Object.entries(sectorSlicesRaw).filter(([,v]) => v > 0).sort((a,b) => b[1]-a[1]).map(([label, value]) => ({ label, value, color: SECTOR_COLORS_MAP[label] || '#475569' }));
  const availableCoins =
    Object.keys(prices).length > 0
      ? Object.keys(prices)
      : holdingsWithVal.map((h) => h.ticker);

  // Use intraday for short ranges, daily for longer
  const chartData = ["1D", "3D", "1W"].includes(chartRange) ? history.intraday : history.daily;
  const benchmarkData = ["1D", "3D", "1W"].includes(chartRange) ? history.intradayAvg : history.dailyAvg;

  const watchlistWithStatus = watchlist.map((w) => {
    const currentPrice = prices[w.coin]?.price
      ? parseFloat(prices[w.coin].price)
      : null;
    const triggered =
      currentPrice !== null &&
      ((w.direction === "above" &&
        currentPrice >= parseFloat(w.target_price)) ||
        (w.direction === "below" &&
          currentPrice <= parseFloat(w.target_price)));
    return { ...w, currentPrice, triggered };
  });
  const triggeredCount = watchlistWithStatus.filter((w) => w.triggered).length;
  const noteCharCount = tradeForm.reasoning?.length || 0;
  const noteHelpsBadge = noteCharCount >= 50;
  const TABS = [
    "holdings",
    "charts",
    "analytics",
    "allocation",
    "trade",
    "options",
    "orders",
    "history",
    "watchlist",
    "feed",
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:var(--bg);color:var(--text);font-family:'DM Mono',monospace;min-height:100vh}
        .page{max-width:1100px;margin:0 auto;padding:24px 16px}
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
        .btn-primary{background:var(--accent);color:var(--accent-text,#fff)}.btn-primary:hover{opacity:.9;transform:translateY(-1px)}.btn-primary:disabled{opacity:.5;cursor:not-allowed}
        .btn-secondary{background:var(--surface2);color:var(--text);border:1px solid var(--border)}.btn-secondary:hover{border-color:var(--accent);color:var(--accent)}
        .btn-danger{background:transparent;color:var(--down);border:1px solid rgba(220,38,38,.3)}.btn-danger:hover{background:rgba(220,38,38,.08)}
        .tabs{display:flex;gap:4px;margin-bottom:20px;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:4px;flex-wrap:wrap}
        .tab{flex:1;padding:9px;text-align:center;border-radius:10px;border:none;background:transparent;font-family:'DM Mono',monospace;font-size:11px;color:var(--muted);cursor:pointer;transition:all .2s;min-width:60px;position:relative}
        .tab.active{background:var(--surface2);color:var(--accent);border:1px solid var(--border)}
        .tab-badge{position:absolute;top:4px;right:4px;width:14px;height:14px;border-radius:50%;background:var(--down);color:#fff;font-size:8px;display:flex;align-items:center;justify-content:center;font-weight:700}
        .tab-badge.alert{background:var(--gold);color:#000;animation:badgePulse 1.5s infinite}
        @keyframes badgePulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.3);opacity:.8}}
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
        @keyframes spin{to{transform:rotate(360deg)}}
        .watch-row{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:14px 16px;display:grid;grid-template-columns:1fr auto auto auto;align-items:center;gap:12px;margin-bottom:8px;transition:all .2s}
        .watch-row.triggered{border-color:var(--gold);background:rgba(245,158,11,.05)}
        .watch-triggered-badge{font-size:9px;font-weight:700;padding:3px 8px;border-radius:6px;background:rgba(245,158,11,.15);color:var(--gold);letter-spacing:1px}
        .badge-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--surface);border:2px solid var(--gold);border-radius:16px;padding:14px 24px;font-size:14px;z-index:9999;text-align:center;animation:slideUp .4s ease}
        @keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        .watch-form{background:var(--surface2);border:1px solid var(--border);border-radius:16px;padding:18px;margin-bottom:16px}
        .watch-form-grid{display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:10px;align-items:end}
        .options-form-grid{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:12px}
        .options-preview-grid{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px}
        .dca-form-grid{display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:8px;align-items:end;margin-bottom:10px}
        .tax-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
        @media(max-width:640px){
          .hero-value{font-size:32px}
          .hero-stats{grid-template-columns:1fr 1fr}
          .trade-grid{grid-template-columns:1fr}
          .watch-form-grid{grid-template-columns:1fr 1fr}
          .range-btns{flex-wrap:wrap}
          .tabs{flex-wrap:nowrap;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding-bottom:2px}
          .tabs::-webkit-scrollbar{display:none}
          .tab{flex:0 0 auto;min-width:0;padding:8px 10px;font-size:10px}
          .options-form-grid{grid-template-columns:1fr 1fr}
          .options-preview-grid{grid-template-columns:1fr 1fr}
          .dca-form-grid{grid-template-columns:1fr 1fr}
          .tax-grid{grid-template-columns:1fr}
          .holding-row{grid-template-columns:32px 1fr auto;gap:10px}
          .history-row{grid-template-columns:28px 1fr auto}
          .watch-row{grid-template-columns:1fr auto;flex-wrap:wrap}
          .page{padding:16px 12px}
        }
      `}</style>

      <div className="page">
        <Nav active="wallet" right={
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <div className="nav-dot" />
            <span style={{fontSize:10,color:'var(--muted)',letterSpacing:1}}>LIVE</span>
          </div>
        } />

        {marketStatus?.announcement && (() => {
          const colors = {
            blue:   { bg:'rgba(96,165,250,.12)',  border:'rgba(96,165,250,.4)',  text:'#93c5fd' },
            green:  { bg:'rgba(0,229,160,.12)',   border:'rgba(0,229,160,.4)',   text:'#00e5a0' },
            yellow: { bg:'rgba(245,158,11,.12)',  border:'rgba(245,158,11,.4)',  text:'#fbbf24' },
            red:    { bg:'rgba(244,63,94,.12)',   border:'rgba(244,63,94,.4)',   text:'#f87171' },
          };
          const c = colors[marketStatus.announcementColor] || colors.blue;
          return (
            <div style={{background:c.bg,border:`1px solid ${c.border}`,borderRadius:12,padding:'12px 18px',marginBottom:14,display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:16,flexShrink:0}}>📢</span>
              <span style={{fontSize:13,color:c.text,fontWeight:600}}>{marketStatus.announcement}</span>
            </div>
          );
        })()}
        {marketStatus?.frozen && (
          <div className="freeze-banner">🚫 {marketStatus.freezeReason}</div>
        )}
        {activeMarketEvent?.type === 'flash_crash' && (
          <div style={{background:'rgba(220,38,38,.12)',border:'1px solid rgba(220,38,38,.4)',borderRadius:12,padding:'12px 18px',marginBottom:16,display:'flex',alignItems:'center',gap:12}}>
            <span style={{fontSize:22}}>📉</span>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:'#f87171',letterSpacing:.3}}>FLASH CRASH — Market in freefall!</div>
              <div style={{fontSize:11,color:'rgba(248,113,113,.8)',marginTop:2}}>All prices are down {Math.round((1-(activeMarketEvent.mult||0.5))*100)}% · Buy the dip or wait it out</div>
            </div>
          </div>
        )}
        {activeMarketEvent?.type === 'bull_run' && (
          <div style={{background:'rgba(245,158,11,.12)',border:'1px solid rgba(245,158,11,.4)',borderRadius:12,padding:'10px 16px',marginBottom:12,display:'flex',alignItems:'center',gap:10,boxShadow:'0 0 20px rgba(245,158,11,.1)'}}>
            <span style={{fontSize:18}}>🐂</span>
            <div>
              <span style={{fontSize:13,fontWeight:700,color:'#f59e0b'}}>BULL RUN ACTIVE</span>
              <span style={{fontSize:12,color:'#fbbf24',marginLeft:8}}>All prices are {activeMarketEvent.mult}× — trades execute at boosted prices!</span>
            </div>
          </div>
        )}
        {activeMarketEvent?.type === 'flash_sale' && (
          <div style={{background:'rgba(251,146,60,.12)',border:'1px solid rgba(251,146,60,.4)',borderRadius:12,padding:'10px 16px',marginBottom:12,display:'flex',alignItems:'center',gap:10,boxShadow:'0 0 20px rgba(251,146,60,.1)'}}>
            <span style={{fontSize:18}}>⚡</span>
            <div>
              <span style={{fontSize:13,fontWeight:700,color:'#fb923c'}}>FLASH SALE — {activeMarketEvent.coin}</span>
              <span style={{fontSize:12,color:'#fdba74',marginLeft:8}}>{Math.round((1-activeMarketEvent.factor)*100)}% off! Limited time discount price.</span>
            </div>
          </div>
        )}
        {marketStatus?.marginCallEnabled && holdingsWithVal.some(h => {
          if (!(h.marginBorrowed > 0)) return false;
          const equity = h.curVal - h.marginBorrowed;
          const originalEquity = h.qty * h.avgBuy - h.marginBorrowed;
          return originalEquity > 0 && equity / originalEquity < (marketStatus.marginCallThreshold || 0.25) + 0.15;
        }) && (
          <div style={{background:'rgba(251,146,60,.12)',border:'1px solid rgba(251,146,60,.5)',borderRadius:12,padding:'10px 16px',marginBottom:12,display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:18}}>⚠️</span>
            <div>
              <span style={{fontSize:13,fontWeight:700,color:'#fb923c'}}>MARGIN WARNING</span>
              <span style={{fontSize:12,color:'#fdba74',marginLeft:8}}>One or more leveraged positions are near the margin call threshold. Consider reducing exposure.</span>
            </div>
          </div>
        )}
        {marketStatus?.scenarioActive && (
          <div style={{background:'rgba(167,139,250,.12)',border:'1px solid rgba(167,139,250,.4)',borderRadius:12,padding:'10px 16px',marginBottom:12,display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:18}}>📅</span>
            <div>
              <span style={{fontSize:13,fontWeight:700,color:'#a78bfa'}}>HISTORICAL SCENARIO</span>
              <span style={{fontSize:12,color:'#c4b5fd',marginLeft:8}}>Trading on historical prices — {marketStatus.scenarioLabel}</span>
            </div>
          </div>
        )}
        {expiringOptions.length > 0 && (
          <div style={{background:'rgba(251,191,36,.08)',border:'1px solid rgba(251,191,36,.3)',borderRadius:12,padding:'10px 16px',marginBottom:12,display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
            <span style={{fontSize:18}}>⏰</span>
            <div style={{flex:1,minWidth:0}}>
              <span style={{fontSize:13,fontWeight:700,color:'#fbbf24'}}>Options expiring soon: </span>
              <span style={{fontSize:12,color:'var(--text)'}}>
                {expiringOptions.map(o => {
                  const daysLeft = Math.ceil((new Date(o.expires_at) - new Date()) / (1000 * 86400));
                  return `${o.option_type?.toUpperCase()} ${o.coin} (${daysLeft <= 0 ? 'today' : daysLeft === 1 ? 'tomorrow' : `${daysLeft}d`})`;
                }).join(' · ')}
              </span>
            </div>
            <button onClick={() => setActiveTab('options')} style={{padding:'4px 12px',borderRadius:8,border:'1px solid rgba(251,191,36,.4)',background:'transparent',color:'#fbbf24',cursor:'pointer',fontSize:11,whiteSpace:'nowrap',flexShrink:0}}>
              View →
            </button>
          </div>
        )}
        {refreshResult && !refreshResult.blocked && !refreshResult.error && (
          <div style={{background:'rgba(0,229,160,.08)',border:'1px solid rgba(0,229,160,.3)',borderRadius:12,padding:'10px 16px',marginBottom:12,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,animation:'fadeIn .3s ease'}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:16}}>✅</span>
              <div>
                <span style={{fontSize:13,fontWeight:600,color:'var(--accent)'}}>Prices refreshed</span>
                <span style={{fontSize:12,color:'#94a3b8',marginLeft:10}}>
                  {refreshResult.pricesUpdated} coin{refreshResult.pricesUpdated!==1?'s':''} updated
                  {refreshResult.snapshots > 0 ? ` · ${refreshResult.snapshots} portfolio snapshot${refreshResult.snapshots!==1?'s':''} saved` : ''}
                  {refreshResult.at ? ` · ${refreshResult.at.toLocaleTimeString()}` : ''}
                </span>
                {refreshResult.errors?.length > 0 && <span style={{fontSize:11,color:'#f59e0b',marginLeft:8}}>⚠ {refreshResult.errors[0]}</span>}
              </div>
            </div>
            <button onClick={()=>setRefreshResult(null)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:16,lineHeight:1}}>✕</button>
          </div>
        )}
        {executedOrders.length > 0 && !dismissedOrderAlerts && (
          <div style={{background:'rgba(0,229,160,.1)',border:'1px solid rgba(0,229,160,.3)',borderRadius:12,padding:'12px 16px',marginBottom:16,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
            <div style={{fontSize:13,color:'var(--accent)'}}>
              🎯 <strong>{executedOrders.length} limit order{executedOrders.length>1?'s':''} executed</strong> in the last 24h:{' '}
              {executedOrders.map(o=>`${o.action} ${o.coin} @ $${parseFloat(o.executed_price||o.limit_price).toLocaleString()}`).join(' · ')}
            </div>
            <button style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:16}} onClick={()=>setDismissedOrderAlerts(true)}>✕</button>
          </div>
        )}
        {lastUpdated && (
          <div
            style={{
              fontSize: 10,
              color: "var(--muted)",
              textAlign: "right",
              marginBottom: 8,
            }}
          >
            Updated {lastUpdated.toLocaleTimeString()}
          </div>
        )}
        {(() => {
          const updatedAt = portfolio?.priceUpdatedAt;
          if (!updatedAt) return null;
          const ageMin = (Date.now() - new Date(updatedAt).getTime()) / 60000;
          if (ageMin < 30) return null;
          return (
            <div style={{ background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.35)', borderRadius: 10, padding: '8px 14px', marginBottom: 16, fontSize: 11, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 8 }}>
              ⚠ Price data is {Math.floor(ageMin)} minutes old — live quotes may be unavailable
            </div>
          );
        })()}

        {loading ? (
          <>
            <div
              className="skeleton"
              style={{ height: 220, marginBottom: 20 }}
            />
            <div
              className="skeleton"
              style={{ height: 44, marginBottom: 20 }}
            />
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="skeleton"
                style={{ height: 70, marginBottom: 10 }}
              />
            ))}
          </>
        ) : (
          <>
            {/* Daily Challenge */}
            {dailyChallenge?.challenge && (
              <div style={{
                background: dailyChallenge.claimed ? 'rgba(0,229,160,.07)' : 'var(--surface)',
                border: `1px solid ${dailyChallenge.claimed ? 'rgba(0,229,160,.35)' : 'var(--border)'}`,
                borderRadius: 16, padding: '14px 20px', marginBottom: 16,
                display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
              }}>
                <span style={{ fontSize: 28, flexShrink: 0 }}>{dailyChallenge.challenge.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 9, color: 'var(--accent)', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>Daily Challenge</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{dailyChallenge.challenge.name}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>{dailyChallenge.challenge.detail}</div>
                  {!dailyChallenge.claimed && dailyChallenge.completion && (
                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 80, height: 4, background: 'var(--surface2)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(dailyChallenge.completion.progress / dailyChallenge.completion.target, 1) * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: 2, transition: 'width .5s' }} />
                      </div>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>{dailyChallenge.completion.progress}/{dailyChallenge.completion.target}</span>
                    </div>
                  )}
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  {dailyChallenge.streak > 0 && (
                    <div style={{ fontSize: 11, color: '#f97316', fontWeight: 700, marginBottom: 4 }}>
                      🔥 {dailyChallenge.streak} day streak
                    </div>
                  )}
                  {dailyChallenge.claimed ? (
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>✓ Complete!</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>+{dailyChallenge.challenge.tokens} tokens</div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, background: 'rgba(0,229,160,.1)', padding: '4px 12px', borderRadius: 8, border: '1px solid rgba(0,229,160,.2)' }}>
                      +{dailyChallenge.challenge.tokens} tokens
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Weekly Challenge */}
            {weeklyChallenge?.challenge && (
              <div style={{
                background: weeklyChallenge.claimed ? 'rgba(251,191,36,.07)' : 'var(--surface)',
                border: `1px solid ${weeklyChallenge.claimed ? 'rgba(251,191,36,.4)' : 'rgba(251,191,36,.25)'}`,
                borderRadius: 16, padding: '14px 20px', marginBottom: 16,
                display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
              }}>
                <span style={{ fontSize: 28, flexShrink: 0 }}>🏆</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 9, color: '#f59e0b', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>Weekly Challenge</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{weeklyChallenge.challenge.title}</span>
                  </div>
                  {weeklyChallenge.challenge.description && (
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{weeklyChallenge.challenge.description}</div>
                  )}
                  {!weeklyChallenge.claimed && weeklyChallenge.completion && (
                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 80, height: 4, background: 'var(--surface2)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(weeklyChallenge.completion.progress / weeklyChallenge.completion.target, 1) * 100}%`, height: '100%', background: '#f59e0b', borderRadius: 2, transition: 'width .5s' }} />
                      </div>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>
                        {weeklyChallenge.challenge.challenge_type === 'profit'
                          ? `${weeklyChallenge.completion.progress}% / +${weeklyChallenge.completion.target}%`
                          : `${weeklyChallenge.completion.progress}/${weeklyChallenge.completion.target}`}
                      </span>
                    </div>
                  )}
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>
                    {weeklyChallenge.daysLeft > 0 ? `${weeklyChallenge.daysLeft}d ${weeklyChallenge.hoursLeft}h left` : `${weeklyChallenge.hoursLeft}h left`}
                  </div>
                  {weeklyChallenge.claimed ? (
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>✓ Complete!</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>+{weeklyChallenge.challenge.tokens_reward} tokens</div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600, background: 'rgba(245,158,11,.1)', padding: '4px 12px', borderRadius: 8, border: '1px solid rgba(245,158,11,.25)' }}>
                      +{weeklyChallenge.challenge.tokens_reward} tokens
                    </div>
                  )}
                </div>
              </div>
            )}

            {(portfolio?.tradingStreak || 0) >= 3 && (
              <div style={{background:'rgba(249,115,22,.08)',border:'1px solid rgba(249,115,22,.3)',borderRadius:12,padding:'10px 18px',marginBottom:12,display:'flex',alignItems:'center',gap:12}}>
                <span style={{fontSize:28}}>🔥</span>
                <div>
                  <span style={{fontSize:13,fontWeight:700,color:'#f97316'}}>{portfolio.tradingStreak}-Day Trading Streak!</span>
                  <span style={{fontSize:12,color:'#fdba74',marginLeft:8}}>
                    {portfolio.tradingStreak >= 25 ? "Legendary consistency 🏆" : portfolio.tradingStreak >= 10 ? "Keep the momentum going!" : "You're on a roll — trade today to keep it alive."}
                  </span>
                </div>
              </div>
            )}

            {activeAssignments.length > 0 && (
              <div style={{background:'rgba(96,165,250,.08)',border:'1px solid rgba(96,165,250,.3)',borderRadius:12,padding:'12px 18px',marginBottom:12}}>
                <div style={{fontSize:9,color:'#60a5fa',letterSpacing:2,textTransform:'uppercase',fontWeight:700,marginBottom:8}}>📋 Active Assignments</div>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {activeAssignments.map(a => {
                    const overdue = a.due_at && new Date(a.due_at) < new Date();
                    return (
                      <div key={a.id} style={{display:'flex',alignItems:'center',gap:10,justifyContent:'space-between',flexWrap:'wrap'}}>
                        <div>
                          <span style={{fontSize:12,fontWeight:600,color:'var(--text)'}}>{a.title}</span>
                          {a.description && <span style={{fontSize:11,color:'var(--muted)',marginLeft:8}}>{a.description}</span>}
                        </div>
                        {a.due_at && (
                          <span style={{fontSize:10,fontWeight:600,color:overdue?'var(--down)':'#f59e0b',flexShrink:0}}>
                            {overdue ? '⚠ Overdue' : `Due ${new Date(a.due_at).toLocaleDateString()}`}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTournament && (() => {
              const my = activeTournament.standings?.find(s => s.name === session?.user?.name);
              const top3 = activeTournament.standings?.slice(0, 3) || [];
              const daysLeft = Math.max(0, Math.ceil((new Date(activeTournament.ends_at) - new Date()) / (1000 * 86400)));
              return (
                <div style={{background:'rgba(245,158,11,.08)',border:'1px solid rgba(245,158,11,.3)',borderRadius:16,padding:'14px 20px',marginBottom:16,display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
                  <span style={{fontSize:28,flexShrink:0}}>🏆</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2,flexWrap:'wrap'}}>
                      <span style={{fontSize:9,color:'var(--gold)',letterSpacing:2,textTransform:'uppercase',fontWeight:700}}>Tournament Active</span>
                      <span style={{fontSize:12,fontWeight:700,color:'var(--text)'}}>{activeTournament.name}</span>
                      <span style={{fontSize:10,color:'var(--muted)'}}>{daysLeft}d remaining</span>
                    </div>
                    <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
                      {top3.map((s,i)=>(
                        <span key={s.studentId} style={{fontSize:11,color:i===0?'#f59e0b':i===1?'#94a3b8':'#a16207'}}>
                          {i===0?'🥇':i===1?'🥈':'🥉'} {s.name} {s.returnPct>=0?'+':''}{s.returnPct.toFixed(1)}%
                        </span>
                      ))}
                    </div>
                  </div>
                  {my && (
                    <div style={{textAlign:'right',flexShrink:0}}>
                      <div style={{fontSize:10,color:'var(--muted)'}}>Your rank</div>
                      <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:22,color:'var(--gold)'}}>#{my.rank}</div>
                      <div style={{fontSize:11,color:my.returnPct>=0?'var(--up)':'var(--down)'}}>{my.returnPct>=0?'+':''}{my.returnPct.toFixed(1)}%</div>
                    </div>
                  )}
                  {activeTournament.prize_tokens > 0 && <div style={{fontSize:10,color:'var(--muted)',flexShrink:0}}>🎁 {activeTournament.prize_tokens} token prize</div>}
                </div>
              );
            })()}

            <div className="hero">
              <div className="hero-label">Total Portfolio Value</div>
              <div
                className="hero-value"
                style={{ color: isProfitable ? "var(--up)" : "var(--down)" }}
              >
                ${Math.floor(totalVal).toLocaleString()}
                <span style={{ fontSize: 30, opacity: 0.6 }}>
                  .{totalVal.toFixed(2).split(".")[1]}
                </span>
              </div>
              <div className={`hero-change ${isProfitable ? "up" : "down"}`}>
                <span>{isProfitable ? "▲" : "▼"}</span>
                <span>
                  {isProfitable ? "+" : ""}
                  {fmtUSD(pl)} ({fmtPct(returnPct)})
                </span>
              </div>
              <div className="hero-stats">
                <div className="stat">
                  <div className="stat-label">Cash</div>
                  <div className="stat-value">{fmtUSD(cash)}</div>
                </div>
                <div className="stat">
                  <div className="stat-label">Holdings</div>
                  <div className="stat-value">
                    {fmtUSD(clean(summary?.holdingsVal))}
                  </div>
                </div>
                <div className="stat">
                  <div className="stat-label">Return</div>
                  <div className={`stat-value ${isProfitable ? "up" : "down"}`}>
                    {fmtPct(returnPct)}
                  </div>
                </div>
                <div className="stat">
                  <div className="stat-label">Fees Paid</div>
                  <div className="stat-value" style={{ color: "var(--muted)" }}>
                    {fmtUSD(fees)}
                  </div>
                </div>
                {portfolio?.sharpeRatio != null && (
                  <div className="stat" title="Annualized Sharpe Ratio — risk-adjusted return (>1 is good, >2 is great, <0 means losses outweigh gains)">
                    <div className="stat-label">Sharpe</div>
                    <div className={`stat-value ${portfolio.sharpeRatio >= 1 ? "up" : portfolio.sharpeRatio >= 0 ? "" : "down"}`}>
                      {portfolio.sharpeRatio.toFixed(2)}
                    </div>
                  </div>
                )}
                {portfolio?.sortinoRatio != null && (
                  <div className="stat" title="Sortino Ratio — like Sharpe but only penalizes downside volatility (>1 is good)">
                    <div className="stat-label">Sortino</div>
                    <div className={`stat-value ${portfolio.sortinoRatio >= 1 ? "up" : portfolio.sortinoRatio >= 0 ? "" : "down"}`}>
                      {portfolio.sortinoRatio.toFixed(2)}
                    </div>
                  </div>
                )}
                {portfolio?.maxDrawdown != null && (
                  <div className="stat" title="Max Drawdown — largest peak-to-trough drop in your portfolio value">
                    <div className="stat-label">Max DD</div>
                    <div className={`stat-value ${portfolio.maxDrawdown > 20 ? "down" : portfolio.maxDrawdown > 10 ? "" : "up"}`}>
                      -{portfolio.maxDrawdown.toFixed(1)}%
                    </div>
                  </div>
                )}
                {portfolio?.winRate != null && (
                  <div className="stat" title="Win Rate — % of fully-closed coin positions that were profitable">
                    <div className="stat-label">Win Rate</div>
                    <div className={`stat-value ${portfolio.winRate >= 50 ? "up" : "down"}`}>
                      {portfolio.winRate.toFixed(1)}%
                    </div>
                  </div>
                )}
                {analyticsData?.volatility != null && (
                  <div className="stat" title="Annualized Volatility — how wildly your portfolio swings (lower is more stable)">
                    <div className="stat-label">Volatility</div>
                    <div className={`stat-value ${analyticsData.volatility > 80 ? "down" : analyticsData.volatility > 40 ? "" : "up"}`}>
                      {analyticsData.volatility.toFixed(1)}%
                    </div>
                  </div>
                )}
                {analyticsData?.beta != null && (
                  <div className="stat" title="Beta vs BTC — how your portfolio moves relative to Bitcoin (1 = moves with BTC, >1 = amplified, <1 = less sensitive)">
                    <div className="stat-label">Beta</div>
                    <div className={`stat-value ${Math.abs(analyticsData.beta) > 1.5 ? "down" : Math.abs(analyticsData.beta) < 0.5 ? "up" : ""}`}>
                      {analyticsData.beta.toFixed(2)}
                    </div>
                  </div>
                )}
                {(portfolio?.tradingStreak || 0) > 0 && (
                  <div className="stat" title="Trading Streak — consecutive days with at least one trade">
                    <div className="stat-label">Streak</div>
                    <div className="stat-value" style={{color:'#f97316'}}>
                      🔥 {portfolio.tradingStreak}d
                    </div>
                  </div>
                )}
              </div>
              <div className="hero-actions">
                <button
                  className="btn btn-primary"
                  onClick={() => setActiveTab("trade")}
                >
                  + New Trade
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={refreshCooldown ? fetchData : handlePriceRefresh}
                  disabled={refreshing}
                  title={refreshCooldown ? `Next price refresh available in ${refreshCountdown}` : "Refresh prices & save a portfolio snapshot"}
                  style={{position:'relative',minWidth:140,transition:'all .2s'}}
                >
                  {refreshing ? (
                    <span style={{display:'flex',alignItems:'center',gap:6,justifyContent:'center'}}>
                      <span style={{display:'inline-block',width:11,height:11,border:'2px solid currentColor',borderTopColor:'transparent',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
                      Refreshing…
                    </span>
                  ) : refreshCooldown ? `↻ ${refreshCountdown}` : "↻ Refresh Prices"}
                </button>
                <Link href="/leaderboard" className="btn btn-secondary">
                  🏆 Leaderboard
                </Link>
                <button className="btn btn-secondary" onClick={async () => {
                  const res = await fetch('/api/share');
                  if (res.ok) {
                    const { url } = await res.json();
                    await navigator.clipboard.writeText(url).catch(() => {});
                    setTradeStatus({ type: 'success', msg: '🔗 Share link copied to clipboard!' });
                    setTimeout(() => setTradeStatus(null), 3000);
                  }
                }}>
                  🔗 Share
                </button>
              </div>
            </div>

            <div className="tabs">
              {TABS.map((t) => (
                <button
                  key={t}
                  className={`tab${activeTab === t ? " active" : ""}`}
                  onClick={() => {
                    setActiveTab(t);
                    if (t === 'feed' && feedItems.length === 0) {
                      setFeedLoading(true);
                      fetch(`/api/feed${classId ? `?classId=${classId}` : ''}`)
                        .then(r=>r.ok?r.json():[])
                        .then(d=>{
                          const items = Array.isArray(d) ? d : [];
                          setFeedItems(items);
                          setFeedLoading(false);
                          const tradeIds = items.filter(i=>i.type==='trade'&&i.id).map(i=>i.id);
                          if (tradeIds.length) fetch(`/api/feed/react?tradeIds=${tradeIds.join(',')}`).then(r=>r.ok?r.json():{}).then(setFeedReactions).catch(()=>{});
                        }).catch(()=>setFeedLoading(false));
                    }
                    if (t === 'options') { fetch('/api/options').then(r=>r.ok?r.json():r.json().then(d=>{if(d.tableNotReady)setOptionsTableReady(false);return[];})).then(d=>Array.isArray(d)&&setOptionsPositions(d)).catch(()=>{}); }
                    if (t === 'analytics') { fetch(`/api/analytics${classId ? `?classId=${classId}` : ''}`).then(r=>r.ok?r.json():null).then(d=>d&&setAnalyticsData(d)).catch(()=>{}); }
                  }}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                  {t === "watchlist" && triggeredCount > 0 && (
                    <span className={`tab-badge${triggeredCount > 0 ? ' alert' : ''}`}>{triggeredCount}</span>
                  )}
                  {t === "orders" && pendingOrders.length > 0 && (
                    <span className="tab-badge" style={{background:'var(--accent)',color:'#000'}}>{pendingOrders.length}</span>
                  )}
                </button>
              ))}
            </div>

            {activeTab === "holdings" && (
              <div className="panel">
                {portfolioError && (
                  <div style={{background:'rgba(244,63,94,.1)',border:'1px solid rgba(244,63,94,.4)',borderRadius:12,padding:'14px 18px',marginBottom:12}}>
                    <div style={{fontSize:12,fontWeight:700,color:'#f43f5e',marginBottom:4}}>⚠ Portfolio failed to load (HTTP {portfolioError.status})</div>
                    <div style={{fontSize:11,color:'#fca5a5'}}>{portfolioError.message}</div>
                    <div style={{fontSize:10,color:'var(--muted)',marginTop:6}}>Check the browser console for details, or contact your teacher if this persists.</div>
                  </div>
                )}
                {holdingsWithVal.length === 0 && !portfolioError ? (
                  <div className="empty">
                    No holdings yet — make a trade to get started!
                  </div>
                ) : holdingsWithVal.length === 0 ? null : (
                  <>
                    {holdingsWithVal.map((h, i) => (
                      <div className="holding-row" key={i} style={h.isShort ? {borderLeft:'2px solid rgba(251,146,60,.4)',background:'rgba(251,146,60,.04)'} : h.marginBorrowed>0 ? {borderLeft:'2px solid rgba(96,165,250,.4)',background:'rgba(96,165,250,.04)'} : {}}>
                        <div
                          className="coin-icon"
                          style={{
                            background: h.isShort ? 'rgba(251,146,60,.15)' : `${getCoinColor(h.ticker)}22`,
                            color: h.isShort ? '#fb923c' : getCoinColor(h.ticker),
                          }}
                        >
                          {h.ticker.slice(0, 3)}
                        </div>
                        <div>
                          <div style={{display:'flex',alignItems:'center',gap:6}}>
                            <div
                              style={{
                                fontFamily: "'Syne',sans-serif",
                                fontWeight: 700,
                                fontSize: 13,
                              }}
                            >
                              {h.ticker}
                            </div>
                            {h.isShort && <span style={{fontSize:9,background:'rgba(251,146,60,.2)',color:'#fb923c',borderRadius:4,padding:'1px 5px',letterSpacing:'1px'}}>SHORT</span>}
                            {!h.isShort && h.marginBorrowed>0 && <span style={{fontSize:9,background:'rgba(96,165,250,.2)',color:'#60a5fa',borderRadius:4,padding:'1px 5px',letterSpacing:'1px'}}>LEVERAGED</span>}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--muted)",
                              marginTop: 2,
                            }}
                          >
                            {h.isShort
                              ? `Entry $${h.avgBuy.toFixed(2)} · ${fmtNum(Math.abs(h.qty))} short`
                              : prices[h.ticker]
                              ? `$${parseFloat(prices[h.ticker].price).toLocaleString()}`
                              : `Avg $${h.avgBuy.toFixed(4)}`}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div
                            style={{
                              fontFamily: "'Syne',sans-serif",
                              fontWeight: 700,
                              fontSize: 13,
                              color: h.isShort ? (h.plPct >= 0 ? 'var(--up)' : 'var(--down)') : undefined,
                            }}
                          >
                            {h.isShort ? (h.plPct >= 0 ? '+' : '') + fmtUSD((h.plPct / 100) * h.avgBuy * Math.abs(h.qty)) : fmtUSD(h.curVal)}
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              color: "var(--muted)",
                              marginTop: 2,
                            }}
                          >
                            {h.isShort ? `liability ${fmtUSD(Math.abs(h.curVal))}` : `${fmtNum(h.qty)} ${h.ticker}`}
                          </div>
                        </div>
                        <div
                          className={`pct-badge ${
                            h.plPct >= 0 ? "up" : "down"
                          }`}
                        >
                          {h.plPct >= 0 ? "▲" : "▼"}{" "}
                          {Math.abs(h.plPct).toFixed(2)}%
                        </div>
                      </div>
                    ))}
                    <div className="cash-row">
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            background: "rgba(71,85,105,.3)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 18,
                          }}
                        >
                          💵
                        </div>
                        <div>
                          <div
                            style={{
                              fontFamily: "'Syne',sans-serif",
                              fontWeight: 700,
                              fontSize: 13,
                            }}
                          >
                            Cash
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--muted)",
                              marginTop: 2,
                            }}
                          >
                            Available
                          </div>
                        </div>
                      </div>
                      <div
                        style={{
                          fontFamily: "'Syne',sans-serif",
                          fontWeight: 700,
                          fontSize: 15,
                        }}
                      >
                        {fmtUSD(cash)}
                      </div>
                    </div>
                    {portfolio?.classRewardEnabled &&
                      (portfolio?.classRewardTokens || 0) > 0 && (
                        <>
                        <div
                          className="cash-row"
                          onClick={() => {
                            const next = !showRewardDetail;
                            setShowRewardDetail(next);
                            if (next && rewardLedger === null) fetchRewardLedger();
                          }}
                          style={{
                            marginTop: 8,
                            background: "rgba(0,229,160,.05)",
                            borderColor: "rgba(0,229,160,.2)",
                            cursor: "pointer",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                            }}
                          >
                            <div
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 10,
                                background: "rgba(0,229,160,.15)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 18,
                              }}
                            >
                              🎁
                            </div>
                            <div>
                              <div
                                style={{
                                  fontFamily: "'Syne',sans-serif",
                                  fontWeight: 700,
                                  fontSize: 13,
                                  color: "var(--accent)",
                                }}
                              >
                                ClassReward <span style={{fontSize:10,opacity:.6}}>{showRewardDetail ? "▲" : "▼"}</span>
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "var(--muted)",
                                  marginTop: 2,
                                }}
                              >
                                {portfolio.classRewardTokens} tokens · $1.00
                                each
                              </div>
                            </div>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                            }}
                          >
                            <div
                              style={{
                                fontFamily: "'Syne',sans-serif",
                                fontWeight: 700,
                                fontSize: 15,
                                color: "var(--accent)",
                              }}
                            >
                              {fmtUSD(portfolio.classRewardTokens)}
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); redeemTokens(); }}
                              disabled={redeemingTokens}
                              style={{
                                padding: "6px 12px",
                                borderRadius: 8,
                                border: "1px solid rgba(0,229,160,.4)",
                                background: "rgba(0,229,160,.1)",
                                color: "var(--accent)",
                                cursor: "pointer",
                                fontSize: 11,
                                fontFamily: "'DM Mono',monospace",
                                fontWeight: 500,
                              }}
                            >
                              {redeemingTokens ? "..." : "Redeem →"}
                            </button>
                          </div>
                        </div>
                        {showRewardDetail && (
                          <div style={{marginTop:6,border:"1px solid rgba(0,229,160,.15)",borderRadius:12,background:"rgba(0,229,160,.03)",padding:"12px 14px"}}>
                            <div style={{fontSize:11,color:"var(--muted)",fontFamily:"'Syne',sans-serif",fontWeight:700,marginBottom:10,letterSpacing:"0.06em"}}>TOKEN HISTORY</div>
                            {rewardLedger === null ? (
                              <div style={{fontSize:11,color:"var(--muted)"}}>Loading...</div>
                            ) : rewardLedger.length === 0 ? (
                              <div style={{fontSize:11,color:"var(--muted)"}}>No tokens earned yet.</div>
                            ) : (() => {
                              // Label helper
                              const label = (e) => {
                                const r = e.reason || '';
                                if (r.startsWith('lesson:')) {
                                  const l = rewardLessons.find(x => x.id === r.replace('lesson:',''));
                                  return ['📚', l ? l.title : 'Lesson completed'];
                                }
                                if (r.startsWith('badge:'))         return ['🏅', `Badge: ${r.replace('badge:','')}`];
                                if (r.startsWith('teacher_grant:')) return ['🎓', `Teacher award: ${r.replace('teacher_grant:','')}`];
                                if (r.startsWith('store_refund:'))  return ['🔄', `Refund: ${r.replace('store_refund:','')}`];
                                if (r.startsWith('store:'))         return ['🛒', `Store: ${r.replace('store:','')}`];
                                if (r.startsWith('crush:'))         return ['🎮', `Crypto Crush (${r.replace('crush:','')})`];
                                if (r.startsWith('daily_challenge:'))   return ['📅', `Daily challenge: ${r.replace('daily_challenge:','')}`];
                                if (r.startsWith('weekly_challenge:')) return ['🏆', 'Weekly challenge completed'];
                                if (r === 'redeemed')               return ['💵', 'Redeemed for cash'];
                                return ['🎁', r || 'Reward'];
                              };
                              return rewardLedger.map((e, i) => {
                                const [icon, text] = label(e);
                                const isPositive = e.tokens > 0;
                                return (
                                  <div key={i} style={{
                                    display:"flex",alignItems:"center",justifyContent:"space-between",
                                    padding:"6px 8px",borderRadius:8,marginBottom:4,
                                    background: isPositive ? "rgba(0,229,160,.06)" : "rgba(244,63,94,.05)",
                                    border: `1px solid ${isPositive ? "rgba(0,229,160,.15)" : "rgba(244,63,94,.15)"}`,
                                  }}>
                                    <div style={{display:"flex",alignItems:"center",gap:7,minWidth:0}}>
                                      <span style={{fontSize:13,flexShrink:0}}>{icon}</span>
                                      <span style={{fontSize:11,color:"var(--text)",fontFamily:"'DM Mono',monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{text}</span>
                                    </div>
                                    <span style={{fontSize:11,fontWeight:700,color:isPositive?"var(--accent)":"var(--down)",fontFamily:"'Syne',sans-serif",flexShrink:0,marginLeft:8}}>
                                      {isPositive?"+":""}{e.tokens} tkn
                                    </span>
                                  </div>
                                );
                              });
                            })()}
                            {/* Lesson completion checklist */}
                            {rewardLessons.length > 0 && (
                              <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid rgba(0,229,160,.1)"}}>
                                <div style={{fontSize:10,color:"var(--muted)",marginBottom:6,letterSpacing:"0.08em"}}>LESSON PROGRESS</div>
                                {rewardModules.map(mod => {
                                  const modLessons = rewardLessons.filter(l => l.module_id === mod.id);
                                  if (!modLessons.length) return null;
                                  return (
                                    <div key={mod.id} style={{marginBottom:8}}>
                                      <div style={{fontSize:10,color:"var(--muted)",marginBottom:4}}>{mod.emoji||"📚"} {mod.title}</div>
                                      {modLessons.map(lesson => {
                                        const earned = (rewardLedger||[]).some(e => e.reason === `lesson:${lesson.id}`);
                                        return (
                                          <div key={lesson.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"4px 8px",borderRadius:6,marginBottom:3,background:earned?"rgba(0,229,160,.06)":"rgba(255,255,255,.02)",opacity:earned?1:0.55}}>
                                            <span style={{fontSize:11,color:earned?"var(--text)":"var(--muted)"}}>{earned?"✅":"⬜"} {lesson.title}</span>
                                            <span style={{fontSize:10,color:earned?"var(--accent)":"var(--muted)",fontWeight:700}}>{earned?"+":""}{lesson.tokens_reward} tkn</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                        </>
                      )}
                  </>
                )}

                {/* ── Staking summary ─────────────────────────────── */}
                {(() => {
                  const positions = stakingData?.positions || [];
                  if (!positions.length) return null;
                  const active    = positions.filter(p => p.status === 'active');
                  const claimable = positions.filter(p => p.status === 'claimable');
                  const restaked  = positions.filter(p => p.status === 'restaked' && parseFloat(p.claimable_rewards||0) > 0);
                  const totalLocked   = [...active, ...claimable].reduce((s,p) => s + (p.currentValue||0), 0);
                  const totalAccruing = active.reduce((s,p) => s + parseFloat(p.total_rewards_earned||0) + (p.accruedRewards||0), 0);
                  const totalClaimable = [...claimable, ...restaked].reduce((s,p) => s + parseFloat(p.claimable_rewards||0), 0);
                  const hasClaimable = totalClaimable > 0;
                  return (
                    <div className="cash-row" style={{ marginTop:8, cursor:'pointer', background: hasClaimable ? 'rgba(245,158,11,.06)' : 'rgba(96,165,250,.04)', borderColor: hasClaimable ? 'rgba(245,158,11,.3)' : 'rgba(96,165,250,.2)' }}
                      onClick={() => window.location.href='/stake'}>
                      <div style={{display:'flex',alignItems:'center',gap:12}}>
                        <div style={{width:40,height:40,borderRadius:10,background: hasClaimable ? 'rgba(245,158,11,.15)' : 'rgba(96,165,250,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>
                          ⛏️
                        </div>
                        <div>
                          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color: hasClaimable ? '#f59e0b' : '#60a5fa',display:'flex',alignItems:'center',gap:6}}>
                            Staking
                            {hasClaimable && <span style={{fontSize:9,fontWeight:800,padding:'2px 6px',borderRadius:6,background:'rgba(245,158,11,.2)',color:'#f59e0b',letterSpacing:1}}>⚡ CLAIM READY</span>}
                          </div>
                          <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>
                            {active.length + claimable.length} position{active.length+claimable.length!==1?'s':''} · {fmtUSD(totalAccruing)} earned
                          </div>
                        </div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <div style={{textAlign:'right'}}>
                          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,color:'#60a5fa'}}>{fmtUSD(totalLocked)}</div>
                          {hasClaimable && <div style={{fontSize:10,color:'#f59e0b',fontWeight:600}}>{fmtUSD(totalClaimable)} claimable</div>}
                        </div>
                        <span style={{color:'var(--muted)',fontSize:12}}>→</span>
                      </div>
                    </div>
                  );
                })()}

              </div>
            )}

            {activeTab === "charts" && (
              <div className="panel">
                <div className="chart-card">
                  <div className="chart-header">
                    <div
                      style={{
                        fontFamily: "'Syne',sans-serif",
                        fontWeight: 700,
                        fontSize: 14,
                        color: "var(--text)",
                      }}
                    >
                      Portfolio Value Over Time
                    </div>
                    <div className="range-btns">
                      {["1D", "3D", "1W", "1M", "3M", "ALL"].map((r) => (
                        <button
                          key={r}
                          className={`range-btn${
                            chartRange === r ? " active" : ""
                          }`}
                          onClick={() => setChartRange(r)}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                  <LineChart data={chartData} benchmarkData={showBenchmark ? benchmarkData : null} height={200} />
                  {benchmarkData && benchmarkData.length >= 2 && (
                    <div style={{display:'flex',alignItems:'center',gap:16,marginTop:10,fontSize:11,flexWrap:'wrap'}}>
                      <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',color:'var(--muted)'}}>
                        <input type="checkbox" checked={showBenchmark} onChange={e=>setShowBenchmark(e.target.checked)} style={{accentColor:'#475569'}} />
                        <span style={{display:'flex',alignItems:'center',gap:5}}>
                          <span style={{display:'inline-block',width:16,height:2,background:'#475569',borderTop:'1px dashed #475569'}} />
                          Class avg
                        </span>
                      </label>
                      {showBenchmark && benchmarkData.length >= 2 && (() => {
                        const start = benchmarkData[0].v, end = benchmarkData[benchmarkData.length - 1].v;
                        const myStart = chartData[0]?.v, myEnd = chartData[chartData.length - 1]?.v;
                        const avgRet = ((end - start) / start * 100).toFixed(2);
                        const myRet  = myStart ? ((myEnd - myStart) / myStart * 100).toFixed(2) : null;
                        const beating = myRet !== null && parseFloat(myRet) > parseFloat(avgRet);
                        return (
                          <span style={{color: beating ? 'var(--up)' : 'var(--down)', fontWeight:600}}>
                            {beating ? '▲' : '▼'} You're {beating ? '+' : ''}{(parseFloat(myRet) - parseFloat(avgRet)).toFixed(2)}% vs class avg
                          </span>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "analytics" && (
              <div className="panel">
                <div className="card">
                  <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,marginBottom:20}}>Portfolio Analytics</div>
                  {analyticsData === null && <div className="empty" style={{padding:'20px 0'}}>Loading analytics…</div>}
                  {analyticsData !== null && (() => {
                    const combined = { ...portfolio, ...analyticsData };
                    const metrics = [
                      { key:'sharpeRatio',  label:'Sharpe Ratio',       fmt: v=>v.toFixed(2),       good: v=>v>=1,              bad: v=>v<0,        desc:'Annualized risk-adjusted return. >1 is good, >2 is great.' },
                      { key:'sortinoRatio', label:'Sortino Ratio',      fmt: v=>v.toFixed(2),       good: v=>v>=1,              bad: v=>v<0,        desc:'Like Sharpe but only penalizes downside volatility.' },
                      { key:'maxDrawdown',  label:'Max Drawdown',       fmt: v=>`-${v.toFixed(1)}%`, good: v=>v<10,             bad: v=>v>20,       desc:'Largest peak-to-trough drop in portfolio value.' },
                      { key:'winRate',      label:'Win Rate',           fmt: v=>`${v.toFixed(1)}%`,  good: v=>v>=50,            bad: v=>v<40,       desc:'% of fully-closed coin positions that were profitable.' },
                      { key:'volatility',   label:'Volatility (ann.)',  fmt: v=>`${v.toFixed(1)}%`,  good: v=>v<30,             bad: v=>v>80,       desc:'Annualized standard deviation of daily returns. Lower = more stable.' },
                      { key:'calmarRatio',  label:'Calmar Ratio',       fmt: v=>v.toFixed(2),       good: v=>v>1,               bad: v=>v<0,        desc:'Total return divided by max drawdown. Higher = better risk efficiency.' },
                      { key:'beta',         label:'Beta vs BTC',        fmt: v=>v.toFixed(2),       good: v=>Math.abs(v)<0.8,   bad: v=>Math.abs(v)>2, desc:'Sensitivity to BTC moves. 1 = moves with BTC, >1 = amplified, <0 = inverse.' },
                    ].filter(m => combined[m.key] != null);
                    if (!metrics.length) return <div className="empty">Need at least 5 days of portfolio history to compute analytics.</div>;
                    return metrics.map(m => {
                      const val = combined[m.key];
                      const color = m.good(val) ? 'var(--up)' : m.bad(val) ? 'var(--down)' : 'var(--text)';
                      return (
                        <div key={m.key} style={{display:'flex',alignItems:'center',gap:16,padding:'14px 0',borderBottom:'1px solid var(--border)'}}>
                          <div style={{flex:1}}>
                            <div style={{fontSize:13,fontWeight:700,color:'var(--text)',marginBottom:3}}>{m.label}</div>
                            <div style={{fontSize:11,color:'#94a3b8',lineHeight:1.5}}>{m.desc}</div>
                          </div>
                          <div style={{fontSize:22,fontWeight:800,color,fontFamily:"'Syne',sans-serif",minWidth:70,textAlign:'right'}}>{m.fmt(val)}</div>
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Sector breakdown from analytics API */}
                {analyticsData?.sectorTotals && (() => {
                  const entries = Object.entries(analyticsData.sectorTotals).sort((a,b)=>b[1]-a[1]);
                  const total = entries.reduce((s,[,v])=>s+v,0);
                  if (!entries.length || total === 0) return null;
                  const colors = ['#00e5a0','#6366f1','#f59e0b','#f43f5e','#3b82f6','#8b5cf6','#ec4899','#14b8a6'];
                  return (
                    <div className="card" style={{marginTop:16}}>
                      <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,marginBottom:14}}>Sector Exposure</div>
                      {entries.map(([sector, val], i) => (
                        <div key={sector} style={{marginBottom:10}}>
                          <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}>
                            <span style={{color:'var(--text)',fontWeight:600}}>{sector}</span>
                            <span style={{color:'#94a3b8'}}>{((val/total)*100).toFixed(1)}%</span>
                          </div>
                          <div style={{height:6,background:'var(--surface2)',borderRadius:3,overflow:'hidden'}}>
                            <div style={{height:'100%',width:`${(val/total)*100}%`,background:colors[i%colors.length],borderRadius:3,transition:'width .5s'}} />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {activeTab === "allocation" && (
              <div className="panel">
                <div className="card">
                  {allSlices.length === 0 ? (
                    <div className="empty">No allocation data yet.</div>
                  ) : (
                    <>
                      <div style={{display:'flex',gap:4,marginBottom:16}}>
                        {['coin','sector'].map(v => (
                          <button key={v} onClick={() => setPieView(v)} style={{padding:'5px 14px',borderRadius:8,border:'1px solid var(--border)',background:pieView===v?'var(--accent)':'transparent',color:pieView===v?'#000':'var(--muted)',fontSize:11,fontFamily:"'DM Mono',monospace",cursor:'pointer',fontWeight:pieView===v?700:400,transition:'all .2s',textTransform:'uppercase',letterSpacing:1}}>
                            {v === 'coin' ? 'By Coin' : 'By Sector'}
                          </button>
                        ))}
                      </div>
                      <div className="alloc-inner">
                        <DonutChart slices={pieView === 'sector' ? sectorSlices : allSlices} total={totalPortVal} />
                        <div className="legend">
                          {(pieView === 'sector' ? sectorSlices : allSlices).map((s, i) => (
                            <div className="legend-row" key={i}>
                              <div className="legend-dot" style={{ background: s.color }} />
                              <div style={{ flex: 1, fontSize: 11, color: "var(--text)" }}>{s.label}</div>
                              <div style={{ fontSize: 11, color: "var(--muted)" }}>
                                {((s.value / totalPortVal) * 100).toFixed(1)}%
                              </div>
                              <div style={{ fontSize: 11, color: "var(--muted)", marginLeft: 4 }}>
                                {fmtUSD(s.value)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {activeTab === "trade" && (
              <div className="panel">
                <div className="trade-grid">
                  <div className="trade-card">
                    <h3
                      style={{
                        fontFamily: "'Syne',sans-serif",
                        fontWeight: 700,
                        fontSize: 15,
                        marginBottom: 16,
                      }}
                    >
                      Execute Trade
                    </h3>
                    {/* Market / Limit toggle */}
                    <div style={{display:'flex',gap:6,marginBottom:10}}>
                      {[['market','⚡ Market'],['limit','🎯 Limit'],['stop','🛑 Stop-Loss']].map(([m,label]) => (
                        <button key={m} onClick={()=>setOrderMode(m)} style={{flex:1,padding:'6px',borderRadius:8,border:`1px solid ${orderMode===m?(m==='stop'?'rgba(244,63,94,.5)':'var(--accent)'):'var(--border)'}`,background:orderMode===m?(m==='stop'?'rgba(244,63,94,.12)':'rgba(0,229,160,.12)'):'transparent',color:orderMode===m?(m==='stop'?'var(--down)':'var(--accent)'):'var(--muted)',fontFamily:"'DM Mono',monospace",fontSize:11,cursor:'pointer',transition:'all .15s'}}>
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="action-toggle" style={{gridTemplateColumns: marketStatus?.shortEnabled ? '1fr 1fr 1fr' : '1fr 1fr'}}>
                      <button
                        className={`action-btn${
                          tradeForm.action === "BUY" ? " active-buy" : ""
                        }`}
                        onClick={() =>
                          setTradeForm((f) => ({ ...f, action: "BUY", leverageMultiplier: 1 }))
                        }
                      >
                        ▲ BUY
                      </button>
                      <button
                        className={`action-btn${
                          tradeForm.action === "SELL" ? " active-sell" : ""
                        }`}
                        onClick={() =>
                          setTradeForm((f) => ({ ...f, action: "SELL", leverageMultiplier: 1 }))
                        }
                      >
                        ▼ SELL
                      </button>
                      {marketStatus?.shortEnabled && (
                        <button
                          className={`action-btn${
                            tradeForm.action === "SHORT" ? " active-sell" : ""
                          }`}
                          onClick={() =>
                            setTradeForm((f) => ({ ...f, action: "SHORT", leverageMultiplier: 1 }))
                          }
                          style={tradeForm.action === "SHORT" ? {background:'rgba(251,146,60,.12)',color:'#fb923c',borderColor:'rgba(251,146,60,.3)'} : {}}
                        >
                          ⬇ SHORT
                        </button>
                      )}
                    </div>
                    {/* Leverage selector — shown when teacher enables margin and action is BUY */}
                    {marketStatus?.marginEnabled && tradeForm.action === "BUY" && (
                      <div style={{marginBottom:12}}>
                        <div style={{fontSize:10,color:'var(--muted)',letterSpacing:'2px',textTransform:'uppercase',marginBottom:6}}>Leverage</div>
                        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                          {[1,2,3,5,marketStatus.marginMult].filter((v,i,a)=>a.indexOf(v)===i).sort((a,b)=>a-b).filter(v=>v<=marketStatus.marginMult).map(m=>(
                            <button key={m}
                              onClick={()=>setTradeForm(f=>({...f,leverageMultiplier:m}))}
                              style={{padding:'4px 12px',borderRadius:8,border:`1px solid ${tradeForm.leverageMultiplier===m?'var(--accent)':'var(--border)'}`,background:tradeForm.leverageMultiplier===m?'rgba(0,229,160,.15)':'var(--surface2)',color:tradeForm.leverageMultiplier===m?'var(--accent)':'var(--muted)',cursor:'pointer',fontSize:11,fontFamily:"'DM Mono',monospace"}}>
                              {m}×{m===1?' (no leverage)':''}
                            </button>
                          ))}
                        </div>
                        {tradeForm.leverageMultiplier > 1 && (
                          <div style={{fontSize:10,color:'#fb923c',marginTop:5}}>
                            ⚠ {tradeForm.leverageMultiplier}× leverage — gains and losses are amplified
                          </div>
                        )}
                      </div>
                    )}
                    <div className="form-group">
                      <label className="form-label">Coin</label>
                      <select
                        className="form-select"
                        value={tradeForm.coin}
                        onChange={(e) =>
                          setTradeForm((f) => ({ ...f, coin: e.target.value }))
                        }
                      >
                        <option value="">Select a coin...</option>
                        {availableCoins.map((c) => (
                          <option key={c} value={c}>
                            {c}
                            {prices[c]
                              ? ` — $${parseFloat(
                                  prices[c].price
                                ).toLocaleString()}`
                              : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* Holdings summary for selected coin */}
                    {tradeForm.coin &&
                      (() => {
                        const h = holdingsWithVal.find(
                          (x) => x.ticker === tradeForm.coin
                        );
                        if (!h)
                          return (
                            <div
                              style={{
                                background: "var(--surface2)",
                                border: "1px solid var(--border)",
                                borderRadius: 10,
                                padding: "10px 14px",
                                marginBottom: 12,
                                fontSize: 11,
                                color: "var(--muted)",
                              }}
                            >
                              You don't hold any {tradeForm.coin} yet
                            </div>
                          );
                        const isUp = h.plPct >= 0;
                        return (
                          <div
                            style={{
                              background: h.isShort
                                ? "rgba(251,146,60,.08)"
                                : isUp
                                ? "rgba(0,180,100,.08)"
                                : "rgba(220,38,38,.06)",
                              border: `1px solid ${
                                h.isShort
                                  ? "rgba(251,146,60,.3)"
                                  : isUp
                                  ? "rgba(0,180,100,.25)"
                                  : "rgba(220,38,38,.25)"
                              }`,
                              borderRadius: 10,
                              padding: "12px 14px",
                              marginBottom: 12,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 8,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 11,
                                  color: h.isShort ? "#fb923c" : "var(--muted)",
                                  letterSpacing: 1,
                                  textTransform: "uppercase",
                                }}
                              >
                                {h.isShort ? `⬇ Short ${tradeForm.coin}` : `Your ${tradeForm.coin} Position`}
                              </span>
                              <span
                                style={{
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: isUp ? "var(--up)" : "var(--down)",
                                }}
                              >
                                {isUp ? "▲" : "▼"}{" "}
                                {Math.abs(h.plPct).toFixed(2)}%
                              </span>
                            </div>
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr 1fr",
                                gap: 8,
                              }}
                            >
                              <div>
                                <div
                                  style={{
                                    fontSize: 9,
                                    color: "var(--muted)",
                                    letterSpacing: 1,
                                    textTransform: "uppercase",
                                    marginBottom: 2,
                                  }}
                                >
                                  {h.isShort ? "Short Qty" : "Quantity"}
                                </div>
                                <div
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: "var(--text)",
                                  }}
                                >
                                  {Math.abs(h.qty).toFixed(6)}
                                </div>
                              </div>
                              <div>
                                <div
                                  style={{
                                    fontSize: 9,
                                    color: "var(--muted)",
                                    letterSpacing: 1,
                                    textTransform: "uppercase",
                                    marginBottom: 2,
                                  }}
                                >
                                  {h.isShort ? "Entry Price" : "Avg Buy"}
                                </div>
                                <div
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: "var(--text)",
                                  }}
                                >
                                  ${h.avgBuy.toFixed(4)}
                                </div>
                              </div>
                              <div>
                                <div
                                  style={{
                                    fontSize: 9,
                                    color: "var(--muted)",
                                    letterSpacing: 1,
                                    textTransform: "uppercase",
                                    marginBottom: 2,
                                  }}
                                >
                                  Cur Price
                                </div>
                                <div
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: "var(--text)",
                                  }}
                                >
                                  {prices[tradeForm.coin]
                                    ? `$${parseFloat(
                                        prices[tradeForm.coin].price
                                      ).toLocaleString()}`
                                    : `$${h.curPrice.toFixed(4)}`}
                                </div>
                              </div>
                              <div>
                                <div
                                  style={{
                                    fontSize: 9,
                                    color: "var(--muted)",
                                    letterSpacing: 1,
                                    textTransform: "uppercase",
                                    marginBottom: 2,
                                  }}
                                >
                                  Total Value
                                </div>
                                <div
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: "var(--text)",
                                  }}
                                >
                                  {fmtUSD(h.curVal)}
                                </div>
                              </div>
                              <div>
                                <div
                                  style={{
                                    fontSize: 9,
                                    color: "var(--muted)",
                                    letterSpacing: 1,
                                    textTransform: "uppercase",
                                    marginBottom: 2,
                                  }}
                                >
                                  P/L
                                </div>
                                <div
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: isUp ? "var(--up)" : "var(--down)",
                                  }}
                                >
                                  {isUp ? "+" : ""}
                                  {fmtUSD(h.plTotal)}
                                </div>
                              </div>
                              <div>
                                <div
                                  style={{
                                    fontSize: 9,
                                    color: "var(--muted)",
                                    letterSpacing: 1,
                                    textTransform: "uppercase",
                                    marginBottom: 2,
                                  }}
                                >
                                  {h.isShort ? "Cover All" : "Sell All"}
                                </div>
                                <button
                                  onClick={() =>
                                    setTradeForm((f) => ({
                                      ...f,
                                      action: h.isShort ? "BUY" : "SELL",
                                      amountType: "# of Coins",
                                      amount: Math.abs(h.qty).toFixed(6),
                                      leverageMultiplier: 1,
                                    }))
                                  }
                                  style={{
                                    fontSize: 10,
                                    padding: "3px 10px",
                                    borderRadius: 6,
                                    border: h.isShort ? "1px solid rgba(251,146,60,.3)" : "1px solid rgba(220,38,38,.3)",
                                    background: h.isShort ? "rgba(251,146,60,.08)" : "rgba(220,38,38,.08)",
                                    color: h.isShort ? "#fb923c" : "var(--down)",
                                    cursor: "pointer",
                                    fontFamily: "'DM Mono',monospace",
                                  }}
                                >
                                  {h.isShort ? "Cover All" : "Sell All"}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    <div className="form-group">
                      <label className="form-label">Amount Type</label>
                      <select
                        className="form-select"
                        value={tradeForm.amountType}
                        onChange={(e) =>
                          setTradeForm((f) => ({
                            ...f,
                            amountType: e.target.value,
                          }))
                        }
                      >
                        <option value="Dollar Amount">Dollar Amount ($)</option>
                        <option value="# of Coins"># of Coins</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        {tradeForm.amountType === "Dollar Amount"
                          ? "Amount (USD)"
                          : "Quantity"}
                      </label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="0.00"
                        min="0"
                        step="any"
                        value={tradeForm.amount}
                        onChange={(e) =>
                          setTradeForm((f) => ({
                            ...f,
                            amount: e.target.value,
                          }))
                        }
                      />
                    </div>
                    {orderMode === 'limit' && (
                      <div className="form-group">
                        <label className="form-label">
                          {tradeForm.action === 'BUY' ? '🎯 Buy when price drops to' : tradeForm.action === 'SELL' ? '🎯 Sell when price rises to' : '🎯 Short when price reaches'}
                        </label>
                        <div style={{display:'flex',gap:8,alignItems:'center'}}>
                          <input type="number" className="form-input" placeholder="0.00" min="0" step="any" value={limitPrice} onChange={e => setLimitPrice(e.target.value)} style={{flex:1}} />
                          {tradeForm.coin && prices[tradeForm.coin] && (
                            <button onClick={() => setLimitPrice(parseFloat(prices[tradeForm.coin].price).toFixed(2))} style={{padding:'8px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--surface2)',color:'var(--muted)',fontSize:10,cursor:'pointer',fontFamily:"'DM Mono',monospace",whiteSpace:'nowrap'}}>Use current</button>
                          )}
                        </div>
                        {tradeForm.coin && prices[tradeForm.coin] && limitPrice && (
                          <div style={{fontSize:10,color:'var(--muted)',marginTop:5}}>
                            Current: ${parseFloat(prices[tradeForm.coin].price).toLocaleString()} · Limit: ${parseFloat(limitPrice).toLocaleString()}
                            {tradeForm.action === 'BUY' && parseFloat(limitPrice) >= parseFloat(prices[tradeForm.coin].price) && <span style={{color:'#fb923c'}}> · ⚠ At/above market — fills immediately</span>}
                            {(tradeForm.action === 'SELL' || tradeForm.action === 'SHORT') && parseFloat(limitPrice) <= parseFloat(prices[tradeForm.coin].price) && <span style={{color:'#fb923c'}}> · ⚠ At/below market — fills immediately</span>}
                          </div>
                        )}
                      </div>
                    )}
                    {orderMode === 'stop' && (
                      <div className="form-group">
                        <div style={{background:'rgba(244,63,94,.07)',border:'1px solid rgba(244,63,94,.2)',borderRadius:10,padding:'10px 14px',marginBottom:10,fontSize:11,color:'#f87171',lineHeight:1.5}}>
                          🛑 Auto-sells your position if price drops to your stop price — protects against large losses.
                        </div>
                        <label className="form-label">🛑 Sell {tradeForm.coin || 'coin'} if price drops to</label>
                        <div style={{display:'flex',gap:8,alignItems:'center'}}>
                          <input type="number" className="form-input" placeholder="0.00" min="0" step="any" value={limitPrice} onChange={e => setLimitPrice(e.target.value)} style={{flex:1,borderColor:'rgba(244,63,94,.4)'}} />
                          {tradeForm.coin && prices[tradeForm.coin] && (
                            <button onClick={() => setLimitPrice((parseFloat(prices[tradeForm.coin].price) * 0.95).toFixed(2))} style={{padding:'8px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--surface2)',color:'var(--muted)',fontSize:10,cursor:'pointer',fontFamily:"'DM Mono',monospace",whiteSpace:'nowrap'}}>-5%</button>
                          )}
                        </div>
                        {tradeForm.coin && prices[tradeForm.coin] && limitPrice && (
                          <div style={{fontSize:10,color:'var(--muted)',marginTop:5}}>
                            Current: ${parseFloat(prices[tradeForm.coin].price).toLocaleString()} · Stop: ${parseFloat(limitPrice).toLocaleString()}
                            {parseFloat(limitPrice) >= parseFloat(prices[tradeForm.coin].price) && <span style={{color:'#fb923c'}}> · ⚠ Stop is above current price — will trigger immediately</span>}
                            {parseFloat(limitPrice) > 0 && parseFloat(limitPrice) < parseFloat(prices[tradeForm.coin].price) && (
                              <span style={{color:'var(--down)'}}> · Loss capped at ~{(((parseFloat(prices[tradeForm.coin].price) - parseFloat(limitPrice)) / parseFloat(prices[tradeForm.coin].price)) * 100).toFixed(1)}%</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="form-group">
                      <label
                        className="form-label"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span>💭 Trade Reasoning</span>
                        <span
                          style={{
                            color: noteHelpsBadge
                              ? "var(--up)"
                              : "var(--muted)",
                            fontSize: 9,
                          }}
                        >
                          {noteHelpsBadge
                            ? "✓ Counts toward Due Diligence badge"
                            : "Badges: 5 notes = Analyst, 15 = Researcher"}
                        </span>
                      </label>
                      <textarea
                        className="form-textarea"
                        placeholder="Why are you making this trade? What's your strategy? (optional but earns badges!)"
                        value={tradeForm.reasoning}
                        onChange={(e) =>
                          setTradeForm((f) => ({
                            ...f,
                            reasoning: e.target.value,
                          }))
                        }
                      />
                      <div className="note-helper">
                        <span
                          style={{
                            color: noteHelpsBadge
                              ? "var(--up)"
                              : "var(--muted)",
                          }}
                        >
                          {noteCharCount >= 50
                            ? "✓ 50+ chars"
                            : `${noteCharCount}/50 for Due Diligence`}
                        </span>
                        <span style={{ color: "var(--muted)" }}>
                          {noteCharCount} chars
                        </span>
                      </div>
                    </div>
                    {tradeForm.coin &&
                      tradeForm.amount &&
                      prices[tradeForm.coin] && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--muted)",
                            marginBottom: 10,
                            padding: "7px 11px",
                            background: "var(--surface2)",
                            borderRadius: 8,
                          }}
                        >
                          Est:{" "}
                          {tradeForm.amountType === "Dollar Amount"
                            ? `${(
                                parseFloat(tradeForm.amount) /
                                parseFloat(prices[tradeForm.coin].price)
                              ).toFixed(6)} ${tradeForm.coin}`
                            : fmtUSD(
                                parseFloat(tradeForm.amount) *
                                  parseFloat(prices[tradeForm.coin].price)
                              )}
                          &nbsp;·&nbsp;Fee:{" "}
                          {fmtUSD((parseFloat(tradeForm.amount) || 0) * 0.005)}
                        </div>
                      )}
                    <button
                      className="btn btn-primary"
                      style={{ width: "100%", background: orderMode === 'limit' ? 'rgba(0,229,160,.85)' : orderMode === 'stop' ? 'rgba(244,63,94,.8)' : undefined }}
                      onClick={orderMode === 'market' ? executeTrade : placeOrder}
                      disabled={executing || placingOrder || (orderMode === 'market' && marketStatus?.frozen)}
                    >
                      {executing || placingOrder
                        ? "Processing..."
                        : orderMode === 'limit'
                        ? `🎯 Place Limit Order — ${tradeForm.action} ${tradeForm.coin || "—"}`
                        : orderMode === 'stop'
                        ? `🛑 Set Stop-Loss — ${tradeForm.coin || "—"}`
                        : marketStatus?.frozen
                        ? "Market Frozen"
                        : `${tradeForm.action} ${tradeForm.coin || "—"}`}
                    </button>
                    {tradeStatus && (
                      <div className={`trade-status ${tradeStatus.type}`}>
                        {tradeStatus.msg}
                      </div>
                    )}
                  </div>
                  <div className="trade-card">
                    <h3
                      style={{
                        fontFamily: "'Syne',sans-serif",
                        fontWeight: 700,
                        fontSize: 15,
                        marginBottom: 16,
                      }}
                    >
                      Portfolio Summary
                    </h3>
                    {[
                      ["Starting Cash", fmtUSD(10000), ""],
                      ["Cash Remaining", fmtUSD(cash), ""],
                      [
                        "Holdings Value",
                        fmtUSD(clean(summary?.holdingsVal)),
                        "",
                      ],
                      ["Total Value", fmtUSD(totalVal), ""],
                      [
                        "Profit / Loss",
                        fmtUSD(pl),
                        isProfitable ? "up" : "down",
                      ],
                      [
                        "Return %",
                        fmtPct(returnPct),
                        isProfitable ? "up" : "down",
                      ],
                      ["Total Fees", fmtUSD(fees), ""],
                    ].map(([label, val, cls]) => (
                      <div
                        key={label}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "8px 0",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>
                          {label}
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 500,
                            color:
                              cls === "up"
                                ? "var(--up)"
                                : cls === "down"
                                ? "var(--down)"
                                : "var(--text)",
                          }}
                        >
                          {val}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="sell-all-card">
                  <div>
                    <strong
                      style={{
                        color: "var(--down)",
                        display: "block",
                        marginBottom: 3,
                        fontFamily: "'Syne',sans-serif",
                      }}
                    >
                      ⚠ Sell All Holdings
                    </strong>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>
                      Liquidates every position at market price. Cannot be
                      undone.
                    </span>
                  </div>
                  <button
                    className="btn btn-danger"
                    onClick={sellAll}
                    disabled={executing || holdingsWithVal.length === 0}
                  >
                    Sell All
                  </button>
                </div>

                {/* DCA */}
                <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:20,padding:22,marginTop:16}}>
                  <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,marginBottom:4}}>🔄 Dollar-Cost Averaging</div>
                  <div style={{fontSize:11,color:'var(--muted)',marginBottom:14}}>Auto-buy a fixed $ amount on a schedule. Executes daily at 4pm UTC.</div>
                  <div className="dca-form-grid">
                    <div>
                      <div className="form-label">Coin</div>
                      <select className="form-select" value={dcaForm.coin} onChange={e=>setDcaForm(f=>({...f,coin:e.target.value}))}>
                        <option value="">Select…</option>
                        {availableCoins.map(c=><option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <div className="form-label">$ per run</div>
                      <input type="number" className="form-input" placeholder="100" min="1" value={dcaForm.amountUsd} onChange={e=>setDcaForm(f=>({...f,amountUsd:e.target.value}))} />
                    </div>
                    <div>
                      <div className="form-label">Frequency</div>
                      <select className="form-select" value={dcaForm.frequency} onChange={e=>setDcaForm(f=>({...f,frequency:e.target.value}))}>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </div>
                    <button className="btn btn-primary" style={{marginBottom:1}} onClick={async()=>{
                      if(!dcaForm.coin||!dcaForm.amountUsd){setDcaStatus({type:'error',msg:'Fill all fields'});return;}
                      const res=await fetch('/api/dca',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...dcaForm,classId})});
                      const d=await res.json();
                      if(res.ok){setDcaStatus({type:'success',msg:`✓ DCA set — buy ${dcaForm.coin} ${dcaForm.frequency}`});setDcaForm(f=>({...f,coin:'',amountUsd:''}));fetch('/api/dca').then(r=>r.json()).then(d=>Array.isArray(d)&&setDcaOrders(d));}
                      else setDcaStatus({type:'error',msg:d.error||'Failed'});
                      setTimeout(()=>setDcaStatus(null),3000);
                    }}>+ Add</button>
                  </div>
                  {dcaStatus && <div className={`trade-status ${dcaStatus.type}`} style={{marginBottom:10}}>{dcaStatus.msg}</div>}
                  {dcaOrders.length > 0 && (
                    <div style={{display:'flex',flexDirection:'column',gap:6}}>
                      {dcaOrders.map(o=>(
                        <div key={o.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:10,padding:'8px 14px'}}>
                          <div>
                            <span style={{fontWeight:600,fontSize:12}}>{o.coin}</span>
                            <span style={{fontSize:11,color:'var(--muted)',marginLeft:8}}>${parseFloat(o.amount_usd).toLocaleString()} · {o.frequency}</span>
                            <span style={{fontSize:10,color:'var(--muted)',marginLeft:8}}>{o.runs_count} runs · next {new Date(o.next_run_at).toLocaleDateString()}</span>
                          </div>
                          <button onClick={async()=>{await fetch('/api/dca',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:o.id})});setDcaOrders(p=>p.filter(x=>x.id!==o.id));}} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:16,lineHeight:1}}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "options" && (
              <div className="panel">
                {!optionsTableReady ? (
                  <div className="empty">Options not enabled — ask your teacher to run the migration.</div>
                ) : (
                  <>
                    <div className="card" style={{marginBottom:16}}>
                      <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,marginBottom:4}}>📊 Buy Option Contract</div>
                      <div style={{fontSize:11,color:'var(--muted)',marginBottom:12}}>
                        <strong>Call</strong> = right to BUY at strike price (profit if price rises) ·
                        <strong> Put</strong> = right to SELL at strike price (profit if price falls).
                        You pay a premium upfront. Auto-exercises at expiry if in-the-money.
                      </div>
                      <div style={{fontSize:11,color:'var(--gold)',background:'rgba(245,158,11,.08)',border:'1px solid rgba(245,158,11,.2)',borderRadius:8,padding:'7px 12px',marginBottom:16}}>
                        ⏰ Expired contracts are settled the following morning. You can also close any open position early at its current market value.
                      </div>
                      <div className="options-form-grid">
                        <div>
                          <div className="form-label">Coin</div>
                          <select className="form-select" value={optionsForm.coin} onChange={e=>setOptionsForm(f=>({...f,coin:e.target.value}))}>
                            <option value="">Select…</option>
                            {availableCoins.map(c=><option key={c} value={c}>{c}{prices[c]?` — $${parseFloat(prices[c].price).toLocaleString()}`:''}</option>)}
                          </select>
                        </div>
                        <div>
                          <div className="form-label">Type</div>
                          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
                            {['call','put'].map(t=>(
                              <button key={t} onClick={()=>setOptionsForm(f=>({...f,type:t}))} style={{padding:'9px',borderRadius:8,border:`1px solid ${optionsForm.type===t?(t==='call'?'rgba(0,229,160,.5)':'rgba(244,63,94,.5)'):'var(--border)'}`,background:optionsForm.type===t?(t==='call'?'rgba(0,229,160,.12)':'rgba(244,63,94,.1)'):'transparent',color:optionsForm.type===t?(t==='call'?'var(--up)':'var(--down)'):'var(--muted)',fontSize:11,cursor:'pointer',fontFamily:"'DM Mono',monospace",fontWeight:600}}>
                                {t === 'call' ? '▲ Call' : '▼ Put'}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="form-label">Strike Price</div>
                          <div style={{display:'flex',flexDirection:'column',gap:4}}>
                            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:3}}>
                              {['itm','atm','otm'].map(m=>(
                                <button key={m} onClick={()=>setOptionsForm(f=>({...f,strikeMode:m}))} style={{padding:'5px 4px',borderRadius:6,border:`1px solid ${optionsForm.strikeMode===m?'var(--accent)':'var(--border)'}`,background:optionsForm.strikeMode===m?'rgba(0,229,160,.12)':'transparent',color:optionsForm.strikeMode===m?'var(--accent)':'var(--muted)',fontSize:10,cursor:'pointer',fontFamily:"'DM Mono',monospace"}}>
                                  {m.toUpperCase()}
                                </button>
                              ))}
                            </div>
                            {optionsForm.strikeMode === 'custom' || (()=>{
                              if (!optionsForm.coin || !prices[optionsForm.coin]) return null;
                              const p = parseFloat(prices[optionsForm.coin].price);
                              const strike = optionsForm.strikeMode === 'itm'
                                ? (optionsForm.type === 'call' ? p * 0.95 : p * 1.05)
                                : optionsForm.strikeMode === 'otm'
                                ? (optionsForm.type === 'call' ? p * 1.05 : p * 0.95)
                                : p;
                              return <div style={{fontSize:10,color:'var(--muted)',textAlign:'center'}}>Strike: ${strike.toLocaleString('en-US',{maximumFractionDigits:2})}</div>;
                            })()}
                          </div>
                        </div>
                        <div>
                          <div className="form-label">Expiry</div>
                          <select className="form-select" value={optionsForm.expiryDays} onChange={e=>setOptionsForm(f=>({...f,expiryDays:parseInt(e.target.value)}))}>
                            <option value={7}>7 days</option>
                            <option value={14}>14 days</option>
                            <option value={30}>30 days</option>
                          </select>
                        </div>
                      </div>
                      {(() => {
                        if (!optionsForm.coin || !prices[optionsForm.coin]) return null;
                        const p = parseFloat(prices[optionsForm.coin].price);
                        const strike = optionsForm.strikeMode === 'itm'
                          ? (optionsForm.type === 'call' ? p * 0.95 : p * 1.05)
                          : optionsForm.strikeMode === 'otm'
                          ? (optionsForm.type === 'call' ? p * 1.05 : p * 0.95)
                          : p;
                        const intrinsic = optionsForm.type === 'call' ? Math.max(0, p - strike) : Math.max(0, strike - p);
                        const vol = 0.30;
                        const timeVal = strike * vol * Math.sqrt(Math.max(0, optionsForm.expiryDays) / 365);
                        const premiumPer = intrinsic + timeVal;
                        return (
                          <div className="options-preview-grid" style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:10,padding:'12px 16px',marginBottom:12}}>
                            <div><div style={{fontSize:9,color:'var(--muted)',letterSpacing:2,textTransform:'uppercase',marginBottom:2}}>Strike</div><div style={{fontSize:13,fontWeight:600}}>${strike.toLocaleString('en-US',{maximumFractionDigits:2})}</div></div>
                            <div><div style={{fontSize:9,color:'var(--muted)',letterSpacing:2,textTransform:'uppercase',marginBottom:2}}>Premium / contract</div><div style={{fontSize:13,fontWeight:600,color:'var(--gold)'}}>${premiumPer.toLocaleString('en-US',{maximumFractionDigits:2})}</div></div>
                            <div><div style={{fontSize:9,color:'var(--muted)',letterSpacing:2,textTransform:'uppercase',marginBottom:2}}>Break-even</div><div style={{fontSize:13,fontWeight:600}}>${(optionsForm.type==='call'?strike+premiumPer:strike-premiumPer).toLocaleString('en-US',{maximumFractionDigits:2})}</div></div>
                            <div><div style={{fontSize:9,color:'var(--muted)',letterSpacing:2,textTransform:'uppercase',marginBottom:2}}>Max loss</div><div style={{fontSize:13,fontWeight:600,color:'var(--down)'}}>Premium paid</div></div>
                          </div>
                        );
                      })()}
                      <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:10}}>
                        <div>
                          <div className="form-label">Contracts</div>
                          <input type="number" className="form-input" placeholder="1" min="0.01" step="0.01"
                            value={optionsForm.contracts || ''}
                            onChange={e=>setOptionsForm(f=>({...f,contracts:e.target.value}))} />
                        </div>
                        <button className="btn btn-primary" style={{alignSelf:'flex-end',background:optionsForm.type==='call'?undefined:'rgba(244,63,94,.8)'}} onClick={async()=>{
                          if(!optionsForm.coin||!optionsForm.contracts){setOptionsStatus({type:'error',msg:'Fill coin and contracts'});return;}
                          const p = prices[optionsForm.coin] ? parseFloat(prices[optionsForm.coin].price) : 0;
                          const strike = optionsForm.strikeMode==='itm'?(optionsForm.type==='call'?p*0.95:p*1.05):optionsForm.strikeMode==='otm'?(optionsForm.type==='call'?p*1.05:p*0.95):p;
                          const res = await fetch('/api/options',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'buy',coin:optionsForm.coin,optionType:optionsForm.type,strikePrice:strike,contracts:parseFloat(optionsForm.contracts),expiryDays:optionsForm.expiryDays,classId})});
                          const d = await res.json();
                          if(res.ok){
                            setOptionsStatus({type:'success',msg:`✓ ${optionsForm.type.toUpperCase()} on ${optionsForm.coin} — $${d.premiumPaid?.toFixed(2)} premium paid`});
                            setOptionsForm(f=>({...f,contracts:''}));
                            fetch('/api/options').then(r=>r.ok?r.json():[]).then(d=>Array.isArray(d)&&setOptionsPositions(d));
                            setTimeout(()=>fetchData(),1500);
                          } else if(d.tableNotReady){
                            setOptionsTableReady(false);
                          } else {
                            setOptionsStatus({type:'error',msg:d.error||'Failed'});
                          }
                          setTimeout(()=>setOptionsStatus(null),4000);
                        }}>Buy {optionsForm.type==='call'?'▲ Call':'▼ Put'}</button>
                      </div>
                      {optionsStatus && <div className={`trade-status ${optionsStatus.type}`} style={{marginTop:10}}>{optionsStatus.msg}</div>}
                    </div>

                    {/* Open positions */}
                    {optionsPositions.filter(p=>p.status==='open').length > 0 && (
                      <div className="card" style={{marginBottom:16}}>
                        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,marginBottom:12}}>Open Positions</div>
                        {optionsPositions.filter(p=>p.status==='open').map(pos=>{
                          const currentPrice = pos.coin && prices[pos.coin] ? parseFloat(prices[pos.coin].price) : 0;
                          const strike = parseFloat(pos.strike_price);
                          const contracts = parseFloat(pos.contracts);
                          const intrinsic = pos.option_type==='call'?Math.max(0,currentPrice-strike):Math.max(0,strike-currentPrice);
                          const itm = intrinsic > 0;
                          const daysLeft = Math.max(0, Math.ceil((new Date(pos.expires_at)-new Date())/(1000*86400)));
                          const timeVal = strike * 0.30 * Math.sqrt(daysLeft/365);
                          const currentVal = (intrinsic + timeVal) * contracts;
                          const pnl = currentVal - parseFloat(pos.premium_paid);
                          return (
                            <div key={pos.id} style={{background:'var(--surface2)',border:`1px solid ${itm?'rgba(0,229,160,.25)':'var(--border)'}`,borderRadius:12,padding:'12px 16px',marginBottom:8,display:'grid',gridTemplateColumns:'auto 1fr auto auto',alignItems:'center',gap:12}}>
                              <div style={{width:36,height:36,borderRadius:9,background:pos.option_type==='call'?'rgba(0,229,160,.15)':'rgba(244,63,94,.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>
                                {pos.option_type==='call'?'▲':'▼'}
                              </div>
                              <div>
                                <div style={{fontSize:12,fontWeight:600}}>{pos.coin} {pos.option_type.toUpperCase()} @ ${parseFloat(pos.strike_price).toLocaleString()}</div>
                                <div style={{fontSize:10,color:'var(--muted)',marginTop:2}}>
                                  {contracts} contracts · expires {new Date(pos.expires_at).toLocaleDateString()} ({daysLeft}d)
                                  {itm && <span style={{color:'var(--accent)',marginLeft:6,fontWeight:700}}>ITM</span>}
                                </div>
                              </div>
                              <div style={{textAlign:'right'}}>
                                <div style={{fontSize:12,fontWeight:700,color:pnl>=0?'var(--up)':'var(--down)'}}>{pnl>=0?'+':''}{fmtUSD(pnl)}</div>
                                <div style={{fontSize:10,color:'var(--muted)'}}>paid {fmtUSD(pos.premium_paid)}</div>
                              </div>
                              <button onClick={async()=>{
                                const res=await fetch('/api/options',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'close',positionId:pos.id,classId})});
                                const d=await res.json();
                                if(res.ok){setOptionsStatus({type:'success',msg:`Closed for ${fmtUSD(d.closeValue)} · P&L ${d.pnl>=0?'+':''}${fmtUSD(d.pnl)}`});fetch('/api/options').then(r=>r.ok?r.json():[]).then(d=>Array.isArray(d)&&setOptionsPositions(d));setTimeout(()=>fetchData(),1000);}
                                else setOptionsStatus({type:'error',msg:d.error||'Failed'});
                                setTimeout(()=>setOptionsStatus(null),4000);
                              }} style={{padding:'6px 12px',borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontSize:11,fontFamily:"'DM Mono',monospace"}}>Close</button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Settled positions */}
                    {optionsPositions.filter(p=>p.status!=='open').length > 0 && (
                      <div className="card">
                        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,marginBottom:12}}>History</div>
                        {optionsPositions.filter(p=>p.status!=='open').slice(0,10).map(pos=>{
                          const pnl = (parseFloat(pos.payout)||0) - parseFloat(pos.premium_paid);
                          return (
                            <div key={pos.id} style={{display:'flex',alignItems:'center',gap:12,padding:'8px 14px',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:10,marginBottom:6,fontSize:11}}>
                              <span style={{opacity:.6}}>{pos.option_type==='call'?'▲':'▼'} {pos.coin} {pos.option_type.toUpperCase()}</span>
                              <span style={{color:'var(--muted)',flex:1}}>@ ${parseFloat(pos.strike_price).toLocaleString()}</span>
                              <span style={{padding:'2px 8px',borderRadius:6,background:pos.status==='exercised'?'rgba(0,229,160,.12)':'rgba(71,85,105,.2)',color:pos.status==='exercised'?'var(--accent)':'var(--muted)',fontWeight:700,fontSize:10}}>{pos.status.toUpperCase()}</span>
                              <span style={{fontWeight:700,color:pnl>=0?'var(--up)':'var(--down)'}}>{pnl>=0?'+':''}{fmtUSD(pnl)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === "orders" && (
              <div className="panel">
                <div className="card">
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                    <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15}}>Pending Limit Orders</div>
                    <button className="btn btn-secondary" style={{fontSize:11,padding:'6px 14px'}} onClick={() => { setActiveTab('trade'); setOrderMode('limit'); }}>+ New Limit Order</button>
                  </div>
                  {!ordersTableReady ? (
                    <div style={{background:'rgba(251,146,60,.08)',border:'1px solid rgba(251,146,60,.3)',borderRadius:12,padding:16,fontSize:12,color:'#fb923c'}}>
                      ⚠ Limit orders table not set up yet. Ask your teacher to run the migration from the teacher settings page.
                    </div>
                  ) : pendingOrders.length === 0 ? (
                    <div className="empty">No pending limit orders.<br/><span style={{fontSize:11}}>Go to Trade tab → select 🎯 Limit to place one.</span></div>
                  ) : (
                    pendingOrders.map(order => {
                      const currentPrice = prices[order.coin]?.price ? parseFloat(prices[order.coin].price) : null;
                      const pctAway = currentPrice ? ((parseFloat(order.limit_price) - currentPrice) / currentPrice * 100) : null;
                      const isBuy = order.action === 'BUY';
                      return (
                        <div key={order.id} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:'14px 16px',marginBottom:8,display:'grid',gridTemplateColumns:'1fr auto',gap:12,alignItems:'center'}}>
                          <div>
                            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                              <span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13}}>{order.coin}</span>
                              <span style={{fontSize:9,padding:'2px 7px',borderRadius:5,background:isBuy?'rgba(0,180,100,.15)':order.action==='SHORT'?'rgba(251,146,60,.15)':'rgba(220,38,38,.12)',color:isBuy?'var(--up)':order.action==='SHORT'?'#fb923c':'var(--down)',letterSpacing:1}}>{order.action}</span>
                              {order.leverage_multiplier > 1 && <span style={{fontSize:9,padding:'2px 6px',borderRadius:5,background:'rgba(96,165,250,.15)',color:'#60a5fa'}}>{order.leverage_multiplier}×</span>}
                            </div>
                            <div style={{fontSize:11,color:'var(--muted)',marginBottom:2}}>
                              {order.amount_type === 'Dollar Amount' ? fmtUSD(order.amount) : `${order.amount} coins`} when price {isBuy ? '≤' : '≥'} <span style={{color:'var(--text)',fontWeight:600}}>${parseFloat(order.limit_price).toLocaleString()}</span>
                            </div>
                            {currentPrice && pctAway !== null && (
                              <div style={{fontSize:10,color:'var(--muted)'}}>
                                Current: ${currentPrice.toLocaleString()} · <span style={{color: Math.abs(pctAway) < 5 ? '#fb923c' : 'var(--muted)'}}>{pctAway > 0 ? '+' : ''}{pctAway.toFixed(2)}% away</span>
                              </div>
                            )}
                            <div style={{fontSize:10,color:'var(--muted)',marginTop:2}}>{new Date(order.created_at).toLocaleString()}</div>
                          </div>
                          <button onClick={() => cancelOrder(order.id)} style={{padding:'6px 12px',borderRadius:8,border:'1px solid rgba(220,38,38,.3)',background:'rgba(220,38,38,.06)',color:'var(--down)',fontSize:11,cursor:'pointer',fontFamily:"'DM Mono',monospace"}}>Cancel</button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {activeTab === "history" && (() => {
              if (rewardLedger === null && classId) fetchRewardLedger();
              const rewardEntries = (rewardLedger || []).map(e => ({
                _isReward: true,
                action: 'REWARD',
                reason: e.reason,
                tokens: e.tokens,
                createdAt: e.created_at,
              }));
              const combined = [...(tradeHistory || []), ...rewardEntries];

              // ── Tax simulation ────────────────────────────────────────
              const ST_RATE = 0.22, LT_RATE = 0.15; // US federal approximations
              const taxYearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
              let stGains = 0, ltGains = 0;
              const sellTrades = (tradeHistory || []).filter(t => t.action === 'SELL' && t.createdAt >= taxYearStart);
              sellTrades.forEach(sell => {
                const buysBefore = (tradeHistory || []).filter(t => t.action === 'BUY' && t.coin === sell.coin && t.createdAt < sell.createdAt);
                const firstBuy = buysBefore[buysBefore.length - 1]; // oldest
                const gain = (sell.price - (firstBuy?.price || sell.price)) * sell.quantity;
                if (gain <= 0) return;
                const daysHeld = firstBuy ? (new Date(sell.createdAt) - new Date(firstBuy.createdAt)) / (1000 * 86400) : 0;
                if (daysHeld >= 365) ltGains += gain; else stGains += gain;
              });
              const totalTax = stGains * ST_RATE + ltGains * LT_RATE;
              return (
              <div className="panel">
                {/* Tax summary card */}
                {totalTax > 0 && (
                  <div style={{background:'rgba(245,158,11,.07)',border:'1px solid rgba(245,158,11,.3)',borderRadius:14,padding:'14px 18px',marginBottom:14}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                      <span style={{fontSize:16}}>🧾</span>
                      <span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:'var(--gold)'}}>Estimated Tax — {new Date().getFullYear()}</span>
                      <span style={{fontSize:10,color:'var(--muted)'}}>US federal approximation · educational only</span>
                    </div>
                    <div className="tax-grid">
                      {[
                        ['Short-term gains', stGains, `${(ST_RATE*100).toFixed(0)}% rate`, stGains * ST_RATE],
                        ['Long-term gains',  ltGains, `${(LT_RATE*100).toFixed(0)}% rate`, ltGains * LT_RATE],
                        ['Est. total tax',   null,     'owed this year',                    totalTax],
                      ].map(([label, gains, note, tax]) => (
                        <div key={label} style={{background:'rgba(245,158,11,.06)',border:'1px solid rgba(245,158,11,.15)',borderRadius:10,padding:'10px 14px'}}>
                          <div style={{fontSize:9,color:'var(--muted)',letterSpacing:2,textTransform:'uppercase',marginBottom:4}}>{label}</div>
                          {gains !== null && <div style={{fontSize:11,color:'var(--text)',marginBottom:2}}>{fmtUSD(gains)} gains</div>}
                          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,color:'#f59e0b'}}>{fmtUSD(tax)}</div>
                          <div style={{fontSize:10,color:'var(--muted)',marginTop:2}}>{note}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{fontSize:10,color:'var(--muted)',marginTop:8}}>Based on realized gains from BUY→SELL pairs this calendar year. Short-term = held &lt;1 year (22%). Long-term = held ≥1 year (15%). This is a simulation — not tax advice.</div>
                  </div>
                )}
                {combined.length === 0 ? (
                  <div className="empty">No trades yet.</div>
                ) : (
                  <>
                    {(() => {
                      const filtered = [...combined]
                        .filter(
                          (t) =>
                            historyFilter === "ALL" ||
                            t.action === historyFilter
                        )
                        .filter(
                          (t) =>
                            !historySearch ||
                            (t.coin || t.reason || '')
                              ?.toLowerCase()
                              .includes(historySearch.toLowerCase())
                        )
                        .sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at));
                      const limited =
                        historyLimit === "ALL"
                          ? filtered
                          : filtered.slice(0, historyLimit);
                      return (
                        <>
                          <div
                            style={{
                              display: "flex",
                              gap: 6,
                              marginBottom: 14,
                              flexWrap: "wrap",
                              alignItems: "center",
                            }}
                          >
                            <span
                              style={{ fontSize: 11, color: "var(--muted)" }}
                            >
                              Show:
                            </span>
                            {[25, 50, 100, 200, "ALL"].map((n) => (
                              <button
                                key={n}
                                onClick={() => setHistoryLimit(n)}
                                style={{
                                  padding: "3px 9px",
                                  borderRadius: 7,
                                  border: "1px solid var(--border)",
                                  background:
                                    historyLimit === n
                                      ? "var(--accent)"
                                      : "transparent",
                                  color:
                                    historyLimit === n
                                      ? "#000"
                                      : "var(--muted)",
                                  fontFamily: "'DM Mono',monospace",
                                  fontSize: 10,
                                  cursor: "pointer",
                                }}
                              >
                                {n}
                              </button>
                            ))}
                            <span
                              style={{
                                marginLeft: 8,
                                fontSize: 11,
                                color: "var(--muted)",
                              }}
                            >
                              Filter:
                            </span>
                            {["ALL", "BUY", "SELL", "REWARD"].map((f) => (
                              <button
                                key={f}
                                onClick={() => setHistoryFilter(f)}
                                style={{
                                  padding: "3px 9px",
                                  borderRadius: 7,
                                  border: "1px solid var(--border)",
                                  background:
                                    historyFilter === f
                                      ? "var(--surface2)"
                                      : "transparent",
                                  color:
                                    historyFilter === f
                                      ? "var(--accent)"
                                      : "var(--muted)",
                                  fontFamily: "'DM Mono',monospace",
                                  fontSize: 10,
                                  cursor: "pointer",
                                }}
                              >
                                {f}
                              </button>
                            ))}
                            <input
                              placeholder="Coin..."
                              value={historySearch}
                              onChange={(e) => setHistorySearch(e.target.value)}
                              style={{
                                padding: "3px 9px",
                                borderRadius: 7,
                                border: "1px solid var(--border)",
                                background: "var(--surface2)",
                                color: "var(--text)",
                                fontFamily: "'DM Mono',monospace",
                                fontSize: 10,
                                outline: "none",
                                width: 80,
                              }}
                            />
                            <span
                              style={{
                                fontSize: 10,
                                color: "var(--muted)",
                                marginLeft: "auto",
                              }}
                            >
                              Showing {limited.length} of {combined.length}
                            </span>
                          </div>
                          {limited.map((t, i) => {
                            if (t._isReward) {
                              const isLesson = t.reason?.startsWith('lesson:');
                              const label = isLesson
                                ? (rewardLessons.find(l => `lesson:${l.id}` === t.reason)?.title || t.reason)
                                : t.reason;
                              return (
                                <div className="history-row" key={i} style={{border:'1px solid rgba(0,229,160,.25)',background:'rgba(0,229,160,.04)'}}>
                                  <div style={{marginTop:2,width:34,height:34,borderRadius:8,background:'rgba(0,229,160,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>🎁</div>
                                  <div>
                                    <div style={{fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:13,color:'var(--accent)'}}>ClassReward</div>
                                    <div style={{fontSize:10,color:'var(--muted)',marginTop:2}}>
                                      {new Date(t.createdAt).toLocaleString()} · {isLesson ? 'Lesson' : 'Badge'}: {label}
                                    </div>
                                  </div>
                                  <div style={{fontSize:13,fontWeight:700,color:'var(--accent)',textAlign:'right',fontFamily:"'Syne',sans-serif"}}>+{t.tokens} tkn</div>
                                </div>
                              );
                            }
                            const isBuy = t.action === "BUY";
                            const isShortTx = t.action === "SHORT";
                            const isCover = t.action === "COVER";
                            // Parse optional market event tag: [EVENT:type:...] prefix
                            const rawReasoning = t.reasoning || t.reasoning_text || '';
                            const eventMatch = rawReasoning.match(/^\[EVENT:(bull_run|flash_sale):([^\]]*)\]/);
                            const eventTag = eventMatch ? { type: eventMatch[1], detail: eventMatch[2] } : null;
                            const userReasoning = eventTag ? rawReasoning.slice(eventMatch[0].length) : rawReasoning;
                            const isBullRun = eventTag?.type === 'bull_run';
                            const isFlashSale = eventTag?.type === 'flash_sale';
                            const rowBorderColor = isBullRun ? 'rgba(245,158,11,.45)' : isFlashSale ? 'rgba(251,146,60,.45)' : 'var(--border)';
                            const rowBg = isBullRun ? 'rgba(245,158,11,.04)' : isFlashSale ? 'rgba(251,146,60,.04)' : undefined;
                            return (
                              <div className="history-row" key={i} style={{border:`1px solid ${rowBorderColor}`,background:rowBg}}>
                                <div
                                  className={`tx-icon ${
                                    isBuy || isCover ? "tx-buy" : "tx-sell"
                                  }`}
                                  style={{ marginTop: 2, background: isShortTx ? 'rgba(251,146,60,.15)' : isCover ? 'rgba(0,180,100,.15)' : undefined, color: isShortTx ? '#fb923c' : isCover ? 'var(--up)' : undefined }}
                                >
                                  {isBuy ? "💰" : isShortTx ? "⬇" : isCover ? "↩" : "📤"}
                                </div>
                                <div>
                                  <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                                    <div
                                      style={{
                                        fontFamily: "'Syne',sans-serif",
                                        fontWeight: 600,
                                        fontSize: 13,
                                      }}
                                    >
                                      {t.action} {t.coin}
                                    </div>
                                    {isBullRun && (
                                      <span style={{fontSize:9,fontWeight:700,background:'rgba(245,158,11,.18)',color:'#f59e0b',border:'1px solid rgba(245,158,11,.4)',borderRadius:5,padding:'1px 6px',letterSpacing:'0.08em'}}>
                                        🐂 BULL RUN ×{eventTag.detail}
                                      </span>
                                    )}
                                    {isFlashSale && (
                                      <span style={{fontSize:9,fontWeight:700,background:'rgba(251,146,60,.18)',color:'#fb923c',border:'1px solid rgba(251,146,60,.4)',borderRadius:5,padding:'1px 6px',letterSpacing:'0.08em'}}>
                                        ⚡ FLASH SALE {eventTag.detail.split(':')[1]}% OFF
                                      </span>
                                    )}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 10,
                                      color: "var(--muted)",
                                      marginTop: 2,
                                    }}
                                  >
                                    {new Date(
                                      t.createdAt || t.created_at
                                    ).toLocaleString()}{" "}
                                    · {(t.quantity || 0).toFixed(4)} {t.coin} @
                                    ${(t.price || 0).toLocaleString()}
                                  </div>
                                  {userReasoning && (
                                    <div className="trade-note">
                                      💭 {userReasoning}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div
                                    style={{
                                      fontSize: 12,
                                      fontWeight: 500,
                                      color: isBuy
                                        ? "var(--down)"
                                        : "var(--up)",
                                      textAlign: "right",
                                    }}
                                  >
                                    {isBuy ? "-" : "+"}
                                    {fmtUSD(t.grossValue || t.gross_value || 0)}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 10,
                                      color: "var(--muted)",
                                      marginTop: 2,
                                      textAlign: "right",
                                    }}
                                  >
                                    Fee: {fmtUSD(t.fee || 0)}
                                  </div>
                                  {/* Tax estimate on SELL trades */}
                                  {!isBuy && !isShortTx && (() => {
                                    const buysBefore = (tradeHistory || []).filter(b => b.action === 'BUY' && b.coin === t.coin && b.createdAt < t.createdAt);
                                    const firstBuy = buysBefore[buysBefore.length - 1];
                                    if (!firstBuy) return null;
                                    const gain = (t.price - firstBuy.price) * t.quantity;
                                    if (gain <= 0) return null;
                                    const daysHeld = (new Date(t.createdAt) - new Date(firstBuy.createdAt)) / (1000 * 86400);
                                    const rate = daysHeld >= 365 ? LT_RATE : ST_RATE;
                                    const tax = gain * rate;
                                    return (
                                      <div style={{fontSize:10,marginTop:3,color:'#f59e0b'}} title={`Estimated ${daysHeld >= 365 ? 'long-term' : 'short-term'} capital gains tax`}>
                                        🧾 Est. tax: {fmtUSD(tax)} ({daysHeld >= 365 ? 'LT' : 'ST'} · {Math.round(daysHeld)}d held)
                                      </div>
                                    );
                                  })()}
                                  {/* "Since sold" hint for SELL trades on coins no longer held */}
                                  {!isBuy && !isShortTx && prices[t.coin] && !holdingsArr.find(h => h.coin === t.coin) && (() => {
                                    const soldAt = t.price || 0;
                                    const now = parseFloat(prices[t.coin].price);
                                    const pct = soldAt > 0 ? ((now - soldAt) / soldAt) * 100 : 0;
                                    const up = pct >= 0;
                                    return (
                                      <div style={{fontSize:10,marginTop:4,textAlign:'right',color:up?'var(--down)':'var(--up)',fontWeight:600}} title={`${t.coin} is now $${now.toLocaleString()} — ${up?'up':'down'} ${Math.abs(pct).toFixed(1)}% since you sold`}>
                                        {up ? '↑' : '↓'} {Math.abs(pct).toFixed(1)}% since sold
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            );
                          })}
                        </>
                      );
                    })()}
                  </>
                )}
              </div>
              );
            })()}

            {activeTab === "watchlist" && (
              <div className="panel">
                <div className="watch-form">
                  <div
                    style={{
                      fontFamily: "'Syne',sans-serif",
                      fontWeight: 700,
                      fontSize: 14,
                      marginBottom: 12,
                    }}
                  >
                    👁 Add Price Alert
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--muted)",
                        fontFamily: "'DM Mono',monospace",
                        fontWeight: 400,
                        marginLeft: 8,
                      }}
                    >
                      You'll get an email when triggered · Earns badges at 1, 10, and 20 alerts
                    </span>
                  </div>
                  <div className="watch-form-grid">
                    <div>
                      <label className="form-label">Coin</label>
                      <select
                        className="form-select"
                        value={watchForm.coin}
                        onChange={(e) =>
                          setWatchForm((f) => ({ ...f, coin: e.target.value }))
                        }
                      >
                        <option value="">Select...</option>
                        {availableCoins.map((c) => (
                          <option key={c} value={c}>
                            {c}
                            {prices[c]
                              ? ` $${parseFloat(
                                  prices[c].price
                                ).toLocaleString()}`
                              : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Direction</label>
                      <select
                        className="form-select"
                        value={watchForm.direction}
                        onChange={(e) =>
                          setWatchForm((f) => ({
                            ...f,
                            direction: e.target.value,
                          }))
                        }
                      >
                        <option value="above">Goes Above</option>
                        <option value="below">Goes Below</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Target Price ($)</label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="0.00"
                        step="any"
                        value={watchForm.targetPrice}
                        onChange={(e) =>
                          setWatchForm((f) => ({
                            ...f,
                            targetPrice: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={addWatch}
                      style={{ marginTop: 18 }}
                    >
                      + Add
                    </button>
                  </div>
                  {watchStatus && (
                    <div
                      className={`trade-status ${watchStatus.type}`}
                      style={{ marginTop: 10 }}
                    >
                      {watchStatus.msg}
                    </div>
                  )}
                </div>
                {watchlistWithStatus.length === 0 ? (
                  <div className="empty">
                    <div style={{ fontSize: 36, marginBottom: 12 }}>👁</div>
                    <div style={{ marginBottom: 8 }}>No price alerts yet.</div>
                    <div style={{ fontSize: 11 }}>
                      Add your first alert above to earn the First Watch badge!
                    </div>
                  </div>
                ) : (
                  <>
                    {triggeredCount > 0 && (
                      <div
                        style={{
                          background: "rgba(245,158,11,.1)",
                          border: "1px solid rgba(245,158,11,.3)",
                          borderRadius: 12,
                          padding: "10px 16px",
                          marginBottom: 16,
                          fontSize: 12,
                          color: "var(--gold)",
                        }}
                      >
                        🔔 {triggeredCount} alert{triggeredCount > 1 ? "s" : ""}{" "}
                        triggered!
                      </div>
                    )}
                    {watchlistWithStatus.map((w, i) => {
                      const currentPrice = w.currentPrice;
                      const pctAway =
                        currentPrice && parseFloat(w.target_price)
                          ? ((parseFloat(w.target_price) - currentPrice) /
                              currentPrice) *
                            100
                          : null;
                      return (
                        <div
                          key={i}
                          className={`watch-row${
                            w.triggered ? " triggered" : ""
                          }`}
                        >
                          <div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              <div
                                className="coin-icon"
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 8,
                                  background: `${getCoinColor(w.coin)}22`,
                                  color: getCoinColor(w.coin),
                                  fontSize: 10,
                                }}
                              >
                                {w.coin.slice(0, 3)}
                              </div>
                              <div>
                                <div
                                  style={{
                                    fontFamily: "'Syne',sans-serif",
                                    fontWeight: 700,
                                    fontSize: 13,
                                  }}
                                >
                                  {w.coin}
                                </div>
                                <div
                                  style={{
                                    fontSize: 10,
                                    color: "var(--muted)",
                                    marginTop: 1,
                                  }}
                                >
                                  Alert when {w.direction} $
                                  {parseFloat(w.target_price).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            {currentPrice && (
                              <div
                                style={{
                                  fontSize: 12,
                                  color: "var(--text)",
                                  fontWeight: 500,
                                }}
                              >
                                ${currentPrice.toLocaleString()}
                              </div>
                            )}
                            {pctAway !== null && (
                              <div
                                style={{
                                  fontSize: 10,
                                  color: w.triggered
                                    ? "var(--gold)"
                                    : "var(--muted)",
                                  marginTop: 2,
                                }}
                              >
                                {w.triggered
                                  ? "🎯 Triggered!"
                                  : `${Math.abs(pctAway).toFixed(1)}% away`}
                              </div>
                            )}
                          </div>
                          {w.triggered && (
                            <span className="watch-triggered-badge">
                              TRIGGERED
                            </span>
                          )}
                          <button
                            onClick={() => removeWatch(w.id)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--muted)",
                              cursor: "pointer",
                              fontSize: 16,
                              padding: 4,
                              borderRadius: 6,
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--muted)",
                        textAlign: "center",
                        marginTop: 12,
                      }}
                    >
                      {watchlist.length} alert
                      {watchlist.length !== 1 ? "s" : ""} ·{" "}
                      {watchlist.length >= 20
                        ? "🔭 Veteran Watchman badge earned!"
                        : watchlist.length >= 10
                        ? "🎯 Serious Watchman badge earned!"
                        : `${
                            10 - watchlist.length
                          } more for Serious Watchman badge`}
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === "feed" && (
              <div className="panel">
                {feedLoading ? (
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {[1,2,3,4,5].map(i=><div key={i} className="skeleton" style={{height:52}}/>)}
                  </div>
                ) : feedItems.length === 0 ? (
                  <div className="empty">No activity in the last 48 hours</div>
                ) : (
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {feedItems.map((item, i) => {
                      const ago = (() => {
                        const diff = Date.now() - new Date(item.ts).getTime();
                        const m = Math.floor(diff / 60000);
                        if (m < 1) return 'just now';
                        if (m < 60) return `${m}m ago`;
                        const h = Math.floor(m / 60);
                        if (h < 24) return `${h}h ago`;
                        return `${Math.floor(h/24)}d ago`;
                      })();
                      const borderColor = item.type === 'trade' ? (item.emoji === '📈' ? 'rgba(0,229,160,.15)' : 'rgba(244,63,94,.15)') : item.type === 'badge' ? 'rgba(245,158,11,.15)' : 'rgba(96,165,250,.15)';
                      const rxns = item.id ? (feedReactions[item.id] || {}) : {};
                      const myReaction = rxns.__mine;
                      const EMOJIS = ['👀','💎','🚀','🔥','📉','🤝'];
                      const react = async (emoji) => {
                        if (!item.id) return;
                        const res = await fetch('/api/feed/react', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ tradeId: item.id, emoji }) });
                        if (res.ok) {
                          const tradeIds = feedItems.filter(x=>x.type==='trade'&&x.id).map(x=>x.id);
                          fetch(`/api/feed/react?tradeIds=${tradeIds.join(',')}`).then(r=>r.ok?r.json():{}).then(setFeedReactions).catch(()=>{});
                        }
                      };
                      return (
                        <div key={i} style={{background:'var(--surface)',border:`1px solid ${borderColor}`,borderRadius:12,padding:'10px 14px'}}>
                          <div style={{display:'flex',alignItems:'center',gap:12}}>
                            <span style={{fontSize:18,flexShrink:0}}>{item.emoji}</span>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:12,color:'var(--text)'}}>{item.text}</div>
                              {item.sub && <div style={{fontSize:11,color:'var(--muted)',marginTop:1}}>{item.sub}</div>}
                            </div>
                            <span style={{fontSize:10,color:'var(--muted)',flexShrink:0}}>{ago}</span>
                          </div>
                          {item.type === 'trade' && item.id && (
                            <div style={{display:'flex',alignItems:'center',gap:4,marginTop:8,paddingTop:8,borderTop:'1px solid rgba(30,41,59,.4)',flexWrap:'wrap'}}>
                              {EMOJIS.map(e => {
                                const count = rxns[e] || 0;
                                const mine = myReaction === e;
                                return (
                                  <button key={e} onClick={()=>react(e)} style={{padding:'3px 8px',borderRadius:20,border:`1px solid ${mine?'var(--accent)':'rgba(30,41,59,.6)'}`,background:mine?'rgba(0,229,160,.12)':'transparent',cursor:'pointer',fontSize:13,display:'flex',alignItems:'center',gap:4,transition:'all .15s'}}>
                                    {e}{count > 0 && <span style={{fontSize:10,color:mine?'var(--accent)':'var(--muted)',fontFamily:"'DM Mono',monospace"}}>{count}</span>}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {postMortem && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:9998,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setPostMortem(null)}>
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:24,padding:28,width:'100%',maxWidth:420,animation:'milestoneIn .4s cubic-bezier(.175,.885,.32,1.275)'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
              <div style={{width:48,height:48,borderRadius:14,background:postMortem.pnl>=0?'rgba(0,229,160,.15)':'rgba(244,63,94,.12)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>
                {postMortem.pnl>=0?'🏆':'📖'}
              </div>
              <div>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18}}>Position Closed</div>
                <div style={{fontSize:11,color:'var(--muted)'}}>
                  {postMortem.coin} · held {postMortem.holdingDays} day{postMortem.holdingDays!==1?'s':''}
                </div>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
              {[
                ['Avg Entry', `$${postMortem.avgEntry?.toLocaleString('en-US',{maximumFractionDigits:4})}`, 'var(--muted)'],
                ['Exit Price', `$${postMortem.exitPrice?.toLocaleString('en-US',{maximumFractionDigits:4})}`, 'var(--text)'],
                ['Total Cost', fmtUSD(postMortem.totalCost), 'var(--muted)'],
                ['Proceeds', fmtUSD(postMortem.proceeds), 'var(--text)'],
              ].map(([label,val,color])=>(
                <div key={label} style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:10,padding:'10px 14px'}}>
                  <div style={{fontSize:9,color:'var(--muted)',letterSpacing:2,textTransform:'uppercase',marginBottom:3}}>{label}</div>
                  <div style={{fontSize:13,fontWeight:600,color}}>{val}</div>
                </div>
              ))}
            </div>
            <div style={{background:postMortem.pnl>=0?'rgba(0,229,160,.1)':'rgba(244,63,94,.1)',border:`1px solid ${postMortem.pnl>=0?'rgba(0,229,160,.3)':'rgba(244,63,94,.3)'}`,borderRadius:14,padding:'14px 18px',textAlign:'center',marginBottom:16}}>
              <div style={{fontSize:10,color:'var(--muted)',letterSpacing:2,textTransform:'uppercase',marginBottom:4}}>Realized P&L</div>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:28,color:postMortem.pnl>=0?'var(--up)':'var(--down)',letterSpacing:-1}}>
                {postMortem.pnl>=0?'+':''}{fmtUSD(postMortem.pnl)}
              </div>
              <div style={{fontSize:13,color:postMortem.pnl>=0?'var(--up)':'var(--down)',fontWeight:600}}>
                {postMortem.pnlPct>=0?'+':''}{postMortem.pnlPct?.toFixed(2)}% return
              </div>
            </div>
            <div style={{fontSize:11,color:'var(--muted)',textAlign:'center',marginBottom:16}}>
              {postMortem.pnl>=0
                ? `Nice trade! Check if ${postMortem.coin} kept rising after you sold.`
                : `Tough one. Every loss is a lesson — what would you do differently?`}
            </div>
            <button onClick={()=>setPostMortem(null)} style={{width:'100%',padding:'10px',borderRadius:12,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',cursor:'pointer',fontFamily:"'DM Mono',monospace",fontSize:12}}>
              Got it
            </button>
          </div>
        </div>
      )}
      {milestoneToast && (
        <div style={{position:'fixed',inset:0,display:'flex',alignItems:'center',justifyContent:'center',zIndex:10000,pointerEvents:'none'}}>
          <div style={{background:'var(--surface)',border:`2px solid ${milestoneToast.milestone?.color||'#00e5a0'}`,borderRadius:24,padding:'32px 48px',textAlign:'center',boxShadow:`0 0 60px ${milestoneToast.milestone?.color||'#00e5a0'}44`,animation:'milestoneIn .5s cubic-bezier(.175,.885,.32,1.275)',maxWidth:360,pointerEvents:'auto'}}>
            <style>{`@keyframes milestoneIn{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:scale(1)}}`}</style>
            <div style={{fontSize:64,marginBottom:12,lineHeight:1}}>{milestoneToast.milestone?.emoji||'🏆'}</div>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:28,color:milestoneToast.milestone?.color||'#00e5a0',letterSpacing:-1,marginBottom:6}}>{milestoneToast.milestone?.label||'Milestone!'}</div>
            <div style={{fontSize:13,color:'var(--muted)',marginBottom:4}}>Portfolio milestone reached</div>
            <div style={{fontSize:11,color:'var(--muted)',opacity:.6}}>Badge earned 🏅</div>
          </div>
        </div>
      )}
      <BadgeToast badgeIds={earnedBadge ? [earnedBadge] : []} />
    </>
  );
}
