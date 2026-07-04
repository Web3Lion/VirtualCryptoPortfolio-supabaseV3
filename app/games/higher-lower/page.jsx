"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import { applyTheme, getTheme } from "@/lib/theme";

const COINS = [
  { id: "BTC",  label: "Bitcoin",  symbol: "₿",  color: "#F7931A" },
  { id: "ETH",  label: "Ethereum", symbol: "Ξ",  color: "#627EEA" },
  { id: "HBAR", label: "Hedera",   symbol: "ℏ",  color: "#5F5F5F" },
  { id: "SUI",  label: "Sui",      symbol: "◎",  color: "#4DA2FF" },
];

function fmtPrice(p) {
  if (!p && p !== 0) return "—";
  if (p >= 1000) return "$" + p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 1)    return "$" + p.toFixed(4);
  return "$" + p.toFixed(6);
}

function timeUntilResolution(predictedAt) {
  const pred = new Date(predictedAt).getTime();
  const resolveAt = pred + 24 * 60 * 60 * 1000;
  const diff = resolveAt - Date.now();
  if (diff <= 0) return "Resolving soon…";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m remaining`;
}

export default function HigherLowerGame() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [classId, setClassId] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tableNotReady, setTableNotReady] = useState(false);
  const [submitting, setSubmitting] = useState(null); // coinId being submitted
  const [toast, setToast] = useState(null);
  const [hlLb, setHlLb] = useState([]);

  useEffect(() => {
    if (!classId) return;
    fetch(`/api/games/leaderboard?classId=${classId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d?.higherLower && setHlLb(d.higherLower))
      .catch(() => {});
  }, [classId]);

  useEffect(() => { applyTheme(getTheme()); }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  // Resolve classId from student membership
  useEffect(() => {
    if (!session) return;
    fetch("/api/portfolio")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.classId) setClassId(d.classId); })
      .catch(() => {});
  }, [session]);

  const loadGame = useCallback(() => {
    if (!classId) return;
    setLoading(true);
    fetch(`/api/games/higher-lower?classId=${classId}`)
      .then(r => r.json())
      .then(d => {
        if (d.tableNotReady) { setTableNotReady(true); return; }
        setGameState(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [classId]);

  useEffect(() => { loadGame(); }, [loadGame]);

  const predict = async (coinId, direction) => {
    if (!classId || submitting) return;
    setSubmitting(coinId);
    try {
      const res = await fetch("/api/games/higher-lower", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, coinId, direction }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to submit", "error");
        return;
      }
      showToast(`📈 Prediction locked in! Check back in 24 hours.`, "success");
      loadGame();
    } catch {
      showToast("Network error", "error");
    } finally {
      setSubmitting(null);
    }
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  if (status === "loading" || (loading && !gameState)) {
    return (
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>
        <Nav active="higher-lower" />
        <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}>Loading…</div>
      </main>
    );
  }

  if (tableNotReady) {
    return (
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>
        <Nav active="higher-lower" />
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚙️</div>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Setup Required</div>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>Ask your teacher to set up the Higher / Lower game in the teacher panel.</div>
        </div>
      </main>
    );
  }

  const { predictions = [], canPredict = {}, prices = {}, config = {} } = gameState || {};
  const today = new Date().toISOString().slice(0, 10);
  const todayPredictions = predictions.filter(p => p.predicted_at?.slice(0, 10) === today);
  const pastPredictions = predictions.filter(p => p.predicted_at?.slice(0, 10) !== today && p.resolved_at);
  const correctCount = predictions.filter(p => p.correct === true).length;
  const totalResolved = predictions.filter(p => p.resolved_at).length;

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>
      <Nav active="higher-lower" />

      <style dangerouslySetInnerHTML={{ __html: `
        .hl-header { text-align:center; margin-bottom:28px; }
        .hl-title { font-size:28px; font-weight:800; letter-spacing:-0.5px; margin-bottom:6px; }
        .hl-sub { color:var(--muted); font-size:13px; }
        .hl-stats { display:flex; gap:12px; justify-content:center; margin-bottom:28px; flex-wrap:wrap; }
        .hl-stat { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:12px 20px; text-align:center; min-width:100px; }
        .hl-stat-val { font-size:22px; font-weight:800; color:var(--accent); }
        .hl-stat-lbl { font-size:10px; color:var(--muted); text-transform:uppercase; letter-spacing:.6px; margin-top:2px; }
        .hl-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:32px; }
        @media(max-width:500px){ .hl-grid{ grid-template-columns:1fr; } }
        .hl-card { background:var(--surface); border:1px solid var(--border); border-radius:16px; padding:20px; position:relative; overflow:hidden; }
        .hl-card-accent { position:absolute; top:0; left:0; right:0; height:3px; border-radius:16px 16px 0 0; }
        .hl-coin-row { display:flex; align-items:center; gap:10px; margin-bottom:12px; }
        .hl-coin-symbol { width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:16px; font-weight:800; flex-shrink:0; }
        .hl-coin-name { font-weight:700; font-size:15px; }
        .hl-coin-ticker { color:var(--muted); font-size:11px; }
        .hl-price { font-size:20px; font-weight:800; margin-bottom:14px; font-variant-numeric:tabular-nums; }
        .hl-btns { display:flex; gap:8px; }
        .hl-btn { flex:1; padding:10px 0; border-radius:10px; border:none; cursor:pointer; font-size:13px; font-weight:700; transition:all .15s; }
        .hl-btn-up { background:rgba(0,229,160,.15); color:#00e5a0; border:1px solid rgba(0,229,160,.3); }
        .hl-btn-up:hover:not(:disabled) { background:rgba(0,229,160,.28); }
        .hl-btn-down { background:rgba(239,68,68,.12); color:#ef4444; border:1px solid rgba(239,68,68,.25); }
        .hl-btn-down:hover:not(:disabled) { background:rgba(239,68,68,.22); }
        .hl-btn:disabled { opacity:.5; cursor:not-allowed; }
        .hl-pending { background:rgba(251,191,36,.08); border:1px solid rgba(251,191,36,.2); border-radius:10px; padding:10px 12px; }
        .hl-pending-dir { font-size:13px; font-weight:700; margin-bottom:3px; }
        .hl-pending-time { font-size:11px; color:var(--muted); }
        .hl-resolved-correct { background:rgba(0,229,160,.08); border:1px solid rgba(0,229,160,.2); border-radius:10px; padding:10px 12px; }
        .hl-resolved-wrong  { background:rgba(239,68,68,.06); border:1px solid rgba(239,68,68,.18); border-radius:10px; padding:10px 12px; }
        .hl-resolved-label  { font-size:13px; font-weight:700; margin-bottom:3px; }
        .hl-resolved-sub    { font-size:11px; color:var(--muted); }
        .hl-history { background:var(--surface); border:1px solid var(--border); border-radius:16px; padding:20px; }
        .hl-history-title { font-size:13px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:.6px; margin-bottom:14px; }
        .hl-row { display:flex; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1px solid var(--border); }
        .hl-row:last-child { border-bottom:none; }
        .hl-row-left { display:flex; align-items:center; gap:10px; }
        .hl-row-coin { width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; flex-shrink:0; }
        .hl-row-info { font-size:13px; }
        .hl-row-date { font-size:11px; color:var(--muted); }
        .hl-pill { padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; }
        .hl-pill-correct { background:rgba(0,229,160,.15); color:#00e5a0; }
        .hl-pill-wrong   { background:rgba(239,68,68,.12); color:#ef4444; }
        .hl-pill-pending { background:rgba(251,191,36,.12); color:#fbbf24; }
        .hl-empty { text-align:center; padding:24px; color:var(--muted); font-size:13px; }
        .hl-toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%); z-index:999; padding:12px 24px; border-radius:12px; font-size:13px; font-weight:600; white-space:nowrap; box-shadow:0 4px 24px rgba(0,0,0,.4); }
        .hl-toast-success { background:var(--surface); border:1px solid rgba(0,229,160,.4); color:var(--accent); }
        .hl-toast-error   { background:var(--surface); border:1px solid rgba(239,68,68,.4); color:#ef4444; }
        .hl-reward-note { font-size:11px; color:var(--muted); text-align:center; margin-top:-16px; margin-bottom:24px; }
      ` }} />

      <div className="hl-header">
        <div className="hl-title">📈 Higher or Lower?</div>
        <div className="hl-sub">Predict tomorrow's price for each coin — earn {config.tokensPerCorrect ?? 10} tokens per correct call</div>
      </div>

      <div className="hl-stats">
        <div className="hl-stat">
          <div className="hl-stat-val">{todayPredictions.length}/4</div>
          <div className="hl-stat-lbl">Today's Picks</div>
        </div>
        <div className="hl-stat">
          <div className="hl-stat-val">{correctCount}</div>
          <div className="hl-stat-lbl">Correct (7d)</div>
        </div>
        <div className="hl-stat">
          <div className="hl-stat-val">{totalResolved > 0 ? Math.round(correctCount / totalResolved * 100) : "—"}{totalResolved > 0 ? "%" : ""}</div>
          <div className="hl-stat-lbl">Accuracy</div>
        </div>
      </div>

      {!config.rewardsEnabled && (
        <div style={{ background: "rgba(251,191,36,.08)", border: "1px solid rgba(251,191,36,.2)", borderRadius: 12, padding: "10px 16px", fontSize: 12, color: "#fbbf24", textAlign: "center", marginBottom: 20 }}>
          ⚠ ClassReward tokens are currently disabled — predictions are tracked but tokens won&apos;t be awarded
        </div>
      )}

      <div className="hl-grid">
        {COINS.map(coin => {
          const todayPred = todayPredictions.find(p => p.coin_id === coin.id);
          const isSubmitting = submitting === coin.id;
          const price = prices[coin.id];

          return (
            <div className="hl-card" key={coin.id}>
              <div className="hl-card-accent" style={{ background: coin.color }} />
              <div className="hl-coin-row">
                <div className="hl-coin-symbol" style={{ background: coin.color + "22", color: coin.color }}>
                  {coin.symbol}
                </div>
                <div>
                  <div className="hl-coin-name">{coin.label}</div>
                  <div className="hl-coin-ticker">{coin.id}</div>
                </div>
              </div>
              <div className="hl-price">{fmtPrice(price)}</div>

              {!todayPred && canPredict[coin.id] ? (
                <div className="hl-btns">
                  <button
                    className="hl-btn hl-btn-up"
                    disabled={isSubmitting}
                    onClick={() => predict(coin.id, "higher")}
                  >
                    {isSubmitting ? "…" : "📈 Higher"}
                  </button>
                  <button
                    className="hl-btn hl-btn-down"
                    disabled={isSubmitting}
                    onClick={() => predict(coin.id, "lower")}
                  >
                    {isSubmitting ? "…" : "📉 Lower"}
                  </button>
                </div>
              ) : todayPred && !todayPred.resolved_at ? (
                <div className="hl-pending">
                  <div className="hl-pending-dir">
                    {todayPred.direction === "higher" ? "📈 You said Higher" : "📉 You said Lower"}
                    <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 11, marginLeft: 6 }}>
                      @ {fmtPrice(todayPred.price_at_prediction)}
                    </span>
                  </div>
                  <div className="hl-pending-time">⏳ {timeUntilResolution(todayPred.predicted_at)}</div>
                </div>
              ) : todayPred?.resolved_at ? (
                <div className={todayPred.correct ? "hl-resolved-correct" : "hl-resolved-wrong"}>
                  <div className="hl-resolved-label">
                    {todayPred.correct
                      ? `✅ Correct! +${todayPred.tokens_awarded} tokens`
                      : "❌ Incorrect"}
                  </div>
                  <div className="hl-resolved-sub">
                    {todayPred.direction === "higher" ? "📈 Higher" : "📉 Lower"} @{" "}
                    {fmtPrice(todayPred.price_at_prediction)} → {fmtPrice(todayPred.resolution_price)}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {pastPredictions.length > 0 && (
        <div className="hl-history">
          <div className="hl-history-title">Recent Results</div>
          {pastPredictions.slice(0, 10).map(p => {
            const coin = COINS.find(c => c.id === p.coin_id) || { symbol: p.coin_id, color: "#888", label: p.coin_id };
            const date = new Date(p.predicted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            return (
              <div className="hl-row" key={p.id}>
                <div className="hl-row-left">
                  <div className="hl-row-coin" style={{ background: coin.color + "22", color: coin.color }}>
                    {coin.symbol}
                  </div>
                  <div>
                    <div className="hl-row-info">
                      {coin.label} — {p.direction === "higher" ? "📈 Higher" : "📉 Lower"}
                    </div>
                    <div className="hl-row-date">
                      {date} · {fmtPrice(p.price_at_prediction)} → {fmtPrice(p.resolution_price)}
                    </div>
                  </div>
                </div>
                <span className={`hl-pill ${p.correct ? "hl-pill-correct" : "hl-pill-wrong"}`}>
                  {p.correct ? `+${p.tokens_awarded}` : "✗"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {pastPredictions.length === 0 && todayPredictions.length === 0 && (
        <div className="hl-empty">Make your first prediction above — results appear here after 24 hours.</div>
      )}

      {hlLb.length > 0 && (
        <div className="hl-history">
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"var(--muted)", textTransform:"uppercase", letterSpacing:1.5, marginBottom:10 }}>🏆 Class Leaderboard</div>
          {hlLb.map((s, i) => (
            <div key={s.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom: i < hlLb.length-1 ? "1px solid var(--border)" : "none" }}>
              <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:13, color: i===0?"var(--gold)":i===1?"var(--muted)":i===2?"#cd7c2f":"var(--muted)", width:20, textAlign:"center" }}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}</span>
              <span style={{ flex:1, fontSize:12, fontWeight:600 }}>{s.name}</span>
              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, fontWeight:700, color:"var(--accent)" }}>{s.correct} correct</span>
              <span style={{ fontSize:10, color:"var(--muted)", width:48, textAlign:"right" }}>{s.accuracy != null ? `${s.accuracy}%` : "—"}</span>
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div className={`hl-toast hl-toast-${toast.type}`}>{toast.msg}</div>
      )}
    </main>
  );
}
