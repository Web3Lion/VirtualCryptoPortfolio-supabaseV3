"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import BadgeToast from "@/components/BadgeToast";
import { applyTheme, getTheme } from "@/lib/theme";

// ─── Constants ────────────────────────────────────────────────────────────────
const COLS = 8;
const ROWS = 8;
const GAME_SECONDS = 90;
const PTS_PER_TILE = 10;

const COINS = [
  { id: "btc",  label: "BTC",  symbol: "₿",  bg: "#F7931A", fg: "#fff" },
  { id: "eth",  label: "ETH",  symbol: "Ξ",  bg: "#627EEA", fg: "#fff" },
  { id: "xrp",  label: "XRP",  symbol: "✕",  bg: "#23292F", fg: "#fff" },
  { id: "hbar", label: "HBAR", symbol: "ℏ",  bg: "#5F5F5F", fg: "#fff" },
  { id: "usdc", label: "USDC", symbol: "$",  bg: "#2775CA", fg: "#fff" },
  { id: "sol",  label: "SOL",  symbol: "◎",  bg: "#9945FF", fg: "#fff" },
  { id: "ada",  label: "ADA",  symbol: "₳",  bg: "#0033AD", fg: "#fff" },
  { id: "voi",  label: "VOI",  symbol: "V",  bg: "#00A651", fg: "#fff" },
];
const COIN_MAP = Object.fromEntries(COINS.map(c => [c.id, c]));
const COIN_IDS = COINS.map(c => c.id);

// ─── Pure game logic (no React) ───────────────────────────────────────────────
const randCoin = () => COIN_IDS[Math.floor(Math.random() * COIN_IDS.length)];

function makeBoard() {
  const b = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, randCoin));
  // Eliminate starting matches
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      while (
        (c >= 2 && b[r][c] === b[r][c-1] && b[r][c] === b[r][c-2]) ||
        (r >= 2 && b[r][c] === b[r-1][c] && b[r][c] === b[r-2][c])
      ) b[r][c] = randCoin();
    }
  }
  return b;
}

function cloneBoard(b) { return b.map(row => [...row]); }

function findMatches(b) {
  const hits = new Set();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 2; c++) {
      const v = b[r][c];
      if (!v || v !== b[r][c+1] || v !== b[r][c+2]) continue;
      let e = c + 2;
      while (e + 1 < COLS && b[r][e+1] === v) e++;
      for (let k = c; k <= e; k++) hits.add(`${r},${k}`);
    }
  }
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS - 2; r++) {
      const v = b[r][c];
      if (!v || v !== b[r+1][c] || v !== b[r+2][c]) continue;
      let e = r + 2;
      while (e + 1 < ROWS && b[e+1][c] === v) e++;
      for (let k = r; k <= e; k++) hits.add(`${k},${c}`);
    }
  }
  return hits;
}

function applyGravity(b) {
  for (let c = 0; c < COLS; c++) {
    let empty = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (b[r][c] !== null) { b[empty][c] = b[r][c]; if (empty !== r) b[r][c] = null; empty--; }
    }
    for (let r = empty; r >= 0; r--) b[r][c] = randCoin();
  }
}

const isAdjacent = (a, b) =>
  (a.r === b.r && Math.abs(a.c - b.c) === 1) || (a.c === b.c && Math.abs(a.r - b.r) === 1);

const delay = ms => new Promise(res => setTimeout(res, ms));

// ─── Component ────────────────────────────────────────────────────────────────
export default function CryptoCrush() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // ── Class / rewards state ──────────────────────────────────────────────────
  const [classes, setClasses]         = useState([]);
  const [classId, setClassId]         = useState(null);
  const [tokensToday, setTokensToday] = useState(0);
  const [maxTokens, setMaxTokens]     = useState(50);
  const [pointsPerToken, setPPT]      = useState(100);
  const [claiming, setClaiming]       = useState(false);
  const [claimResult, setClaimResult] = useState(null);
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [crushLb, setCrushLb] = useState([]);

  useEffect(() => {
    if (!classId) return;
    fetch(`/api/games/leaderboard?classId=${classId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d?.crush && setCrushLb(d.crush))
      .catch(() => {});
  }, [classId]);

  // ── Game render state ──────────────────────────────────────────────────────
  const [cells, setCells]           = useState(() => makeBoard());   // 2-D array for rendering
  const [popping, setPopping]       = useState(new Set());            // keys being popped
  const [swapping, setSwapping]     = useState([]);                   // [{r,c}, {r,c}] swap pair
  const [selectedCell, setSelectedCell] = useState(null);
  const [score, setScore]           = useState(0);
  const [timeLeft, setTimeLeft]     = useState(GAME_SECONDS);
  const [gameState, setGameState]   = useState("idle");               // idle|playing|over|claimed
  const [comboText, setComboText]   = useState(null);                 // e.g. "+30"

  // ── Game-logic refs (no stale closures) ──────────────────────────────────
  const boardRef    = useRef(null);   // authoritative board
  const animating   = useRef(false);  // blocks clicks during animation
  const sel         = useRef(null);   // first-click position
  const scoreRef    = useRef(0);      // latest score (needed inside async chain)
  const timerRef    = useRef(null);

  useEffect(() => { applyTheme(getTheme()); }, []);
  useEffect(() => { if (status === "unauthenticated") router.replace("/"); }, [status, router]);

  // Load classes
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/classes").then(r => r.json()).then(d => {
      const list = Array.isArray(d) ? d : (d.classes || []);
      setClasses(list);
      if (list.length > 0) setClassId(list[0].id);
    }).catch(() => {});
  }, [status]);

  const fetchDailyStatus = useCallback((cId) => {
    if (!cId) return;
    fetch(`/api/games/crypto-crush?classId=${cId}`).then(r => r.json()).then(d => {
      setTokensToday(d.tokensToday ?? 0);
      setMaxTokens(d.maxTokens ?? 50);
      setPPT(d.pointsPerToken ?? 100);
    }).catch(() => {});
  }, []);
  useEffect(() => { fetchDailyStatus(classId); }, [classId, fetchDailyStatus]);

  // Timer
  useEffect(() => {
    if (gameState !== "playing") { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); setGameState("over"); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [gameState]);

  // Push boardRef → render
  const sync = () => setCells(cloneBoard(boardRef.current));

  // ── Core async game loop ───────────────────────────────────────────────────
  const resolveAllMatches = useCallback(async () => {
    while (true) {
      const matches = findMatches(boardRef.current);
      if (matches.size === 0) break;

      // Award points
      const pts = matches.size * PTS_PER_TILE;
      scoreRef.current += pts;
      setScore(scoreRef.current);

      // Show combo text
      setComboText(`+${pts}`);
      setTimeout(() => setComboText(null), 700);

      // Highlight matching tiles
      setPopping(new Set(matches));
      await delay(380);

      // Remove matched tiles from board
      matches.forEach(key => {
        const [r, c] = key.split(",").map(Number);
        boardRef.current[r][c] = null;
      });
      setPopping(new Set());
      sync();
      await delay(120);

      // Apply gravity + fill
      applyGravity(boardRef.current);
      sync();
      await delay(280); // wait for fall CSS transition
    }
  }, []);

  const handleTile = useCallback(async (r, c) => {
    if (gameState !== "playing" || animating.current) return;

    // First click — select
    if (!sel.current) {
      sel.current = { r, c };
      setSelectedCell({ r, c });
      return;
    }

    const first = sel.current;

    // Deselect same tile
    if (first.r === r && first.c === c) {
      sel.current = null;
      setSelectedCell(null);
      return;
    }

    // Non-adjacent — reselect
    if (!isAdjacent(first, { r, c })) {
      sel.current = { r, c };
      setSelectedCell({ r, c });
      return;
    }

    // Adjacent — attempt swap
    sel.current = null;
    setSelectedCell(null);
    animating.current = true;

    // Show swap animation (highlight both tiles)
    setSwapping([first, { r, c }]);

    // Perform swap on the board
    const tmp = boardRef.current[first.r][first.c];
    boardRef.current[first.r][first.c] = boardRef.current[r][c];
    boardRef.current[r][c] = tmp;
    sync();

    await delay(220); // let the player see the swap
    setSwapping([]);

    // Check for matches
    const matches = findMatches(boardRef.current);

    if (matches.size === 0) {
      // No match — swap back
      setSwapping([first, { r, c }]);
      await delay(60);
      const back = boardRef.current[first.r][first.c];
      boardRef.current[first.r][first.c] = boardRef.current[r][c];
      boardRef.current[r][c] = back;
      sync();
      await delay(220);
      setSwapping([]);
      animating.current = false;
      return;
    }

    // Resolve all matches (including cascades)
    await resolveAllMatches();
    animating.current = false;
  }, [gameState, resolveAllMatches]);

  // ── Game controls ─────────────────────────────────────────────────────────
  const startGame = () => {
    boardRef.current = makeBoard();
    scoreRef.current = 0;
    animating.current = false;
    sel.current = null;
    setScore(0);
    setTimeLeft(GAME_SECONDS);
    setSelectedCell(null);
    setPopping(new Set());
    setSwapping([]);
    setClaimResult(null);
    setComboText(null);
    sync();
    setGameState("playing");
  };

  const claimTokens = async () => {
    if (!classId || claiming) return;
    setClaiming(true);
    const res = await fetch("/api/games/crypto-crush", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId, score }),
    });
    const d = await res.json();
    setClaimResult(d);
    if (d.tokensAwarded > 0) setTokensToday(d.tokensToday ?? tokensToday);
    if (d.newBadges?.length) setEarnedBadges(d.newBadges);
    setGameState("claimed");
    setClaiming(false);
    fetchDailyStatus(classId);
  };

  // ── Derived display values ────────────────────────────────────────────────
  const tokensPreview = Math.min(Math.floor(score / pointsPerToken), Math.max(0, maxTokens - tokensToday));
  const pct           = Math.round((timeLeft / GAME_SECONDS) * 100);
  const timerColor    = timeLeft > 30 ? "#00e5a0" : timeLeft > 10 ? "#f59e0b" : "#ef4444";

  if (status === "loading" || status === "unauthenticated") {
    return <div style={{ background: "#080c14", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>Loading…</div>;
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--bg:#080c14;--surface:#0f172a;--surface2:#1a2235;--border:#1e293b;--accent:#00e5a0;--text:#e2e8f0;--muted:#475569}
        body{background:var(--bg);color:var(--text);font-family:'DM Mono',monospace;min-height:100vh}
        .page{max-width:820px;margin:0 auto;padding:24px 16px}

        /* ── Header ── */
        .crush-header{
          display:flex;align-items:center;justify-content:space-between;
          background:var(--surface);border:1px solid var(--border);border-radius:16px;
          padding:18px 24px;margin-bottom:14px;gap:16px;flex-wrap:wrap;
        }
        .crush-title{font-family:'Syne',sans-serif;font-weight:800;font-size:28px;letter-spacing:-1px;line-height:1}
        .crush-title span{color:var(--accent)}
        .crush-sub{font-size:11px;color:var(--muted);margin-top:4px}

        /* ── Stats bar ── */
        .stats-bar{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px}
        .stat-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:14px 16px;text-align:center}
        .stat-val{font-family:'Syne',sans-serif;font-weight:800;font-size:24px;line-height:1}
        .stat-lbl{font-size:9px;color:var(--muted);margin-top:4px;letter-spacing:1.5px;text-transform:uppercase}
        .timer-bar{height:5px;border-radius:3px;background:var(--surface2);overflow:hidden;margin-top:6px}
        .timer-fill{height:100%;border-radius:3px;transition:width .9s linear,background .5s}

        /* ── Board ── */
        .board-wrap{position:relative}
        .board{
          display:grid;grid-template-columns:repeat(8,1fr);gap:5px;
          background:var(--surface);border:1px solid var(--border);border-radius:16px;
          padding:10px;user-select:none;
        }
        .board-idle-overlay{
          position:absolute;inset:0;border-radius:16px;
          background:rgba(8,12,20,.75);backdrop-filter:blur(2px);
          display:flex;align-items:center;justify-content:center;
          font-family:'Syne',sans-serif;font-weight:700;font-size:15px;
          color:var(--muted);pointer-events:none;letter-spacing:.5px;
        }
        .tile{
          aspect-ratio:1;border-radius:10px;display:flex;flex-direction:column;
          align-items:center;justify-content:center;cursor:pointer;
          transition:transform .15s ease,filter .15s,box-shadow .15s;
          border:2px solid transparent;position:relative;overflow:hidden;
        }
        .tile:hover{transform:scale(1.08);filter:brightness(1.2)}
        .tile.selected{border-color:#fff;transform:scale(1.1);box-shadow:0 0 0 3px rgba(255,255,255,.5);filter:brightness(1.25)}
        .tile.swapping{transform:scale(1.15);filter:brightness(1.3);box-shadow:0 0 12px rgba(255,255,255,.4)}
        .tile.popping{animation:pop .38s ease forwards}
        .sym{font-size:clamp(12px,2vw,20px);font-weight:800;line-height:1;pointer-events:none}
        .lbl{font-size:clamp(6px,.9vw,9px);font-weight:700;opacity:.8;line-height:1;margin-top:1px;pointer-events:none}

        /* ── Combo text ── */
        .combo{
          position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
          font-family:'Syne',sans-serif;font-weight:800;font-size:32px;
          color:#f59e0b;text-shadow:0 2px 8px rgba(0,0,0,.8);
          animation:comboPop .7s ease forwards;pointer-events:none;z-index:10;white-space:nowrap;
        }
        @keyframes comboPop{
          0%{opacity:0;transform:translate(-50%,-50%) scale(.5)}
          25%{opacity:1;transform:translate(-50%,-60%) scale(1.2)}
          70%{opacity:1;transform:translate(-50%,-70%) scale(1)}
          100%{opacity:0;transform:translate(-50%,-80%) scale(.9)}
        }
        @keyframes pop{
          0%{transform:scale(1.2);opacity:1}
          40%{transform:scale(1.5) rotate(10deg);opacity:.8}
          100%{transform:scale(0);opacity:0}
        }

        /* ── Buttons ── */
        .btn{padding:11px 26px;border-radius:12px;font-family:'DM Mono',monospace;font-size:13px;font-weight:700;cursor:pointer;border:none;transition:all .2s;letter-spacing:.5px}
        .btn-primary{background:var(--accent);color:#000}.btn-primary:hover{background:#00c98e}.btn-primary:disabled{opacity:.5;cursor:not-allowed}
        .btn-ghost{background:transparent;border:1px solid var(--border);color:var(--muted)}.btn-ghost:hover{border-color:var(--accent);color:var(--accent)}
        .btn-lg{padding:13px 32px;font-size:14px;border-radius:14px}

        /* ── Result card ── */
        .result-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:24px;margin-top:12px;text-align:center}

        /* ── Hint strip ── */
        .hint-strip{text-align:center;font-size:11px;color:var(--muted);padding:8px 0;margin-top:6px}
      `}</style>

      <div className="page">
        <Nav active="crush" />

        {/* ── Header: title left, action right ── */}
        <div className="crush-header">
          <div>
            <div className="crush-title">🎮 <span>Crypto Crush</span></div>
            <div className="crush-sub">
              Match 3+ coins in a row or column · {PTS_PER_TILE} pts/tile · {pointsPerToken} pts = 1 Token · max {maxTokens}/day
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
            {classes.length > 1 && (
              <select value={classId || ""} onChange={e => setClassId(e.target.value)}
                style={{ background:"var(--surface2)", border:"1px solid var(--border)", color:"var(--text)", borderRadius:10, padding:"8px 12px", fontFamily:"'DM Mono',monospace", fontSize:11 }}>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name || c.id}</option>)}
              </select>
            )}
            {(gameState === "idle" || gameState === "claimed") && (
              <button className="btn btn-primary btn-lg" onClick={startGame} disabled={tokensToday >= maxTokens}>
                {tokensToday >= maxTokens ? "🚫 Daily Limit Reached" : gameState === "claimed" ? "▶ Play Again" : "▶ Start Game"}
              </button>
            )}
            {gameState === "over" && (
              <button className="btn btn-ghost btn-lg" onClick={startGame}>↺ Play Again</button>
            )}
            {gameState === "playing" && (
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14, color:"#f59e0b" }}>
                🎁 {tokensToday}<span style={{ fontSize:11, color:"var(--muted)", fontWeight:400 }}>/{maxTokens} today</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Stats bar ── */}
        <div className="stats-bar">
          <div className="stat-card">
            <div className="stat-val" style={{ color:"var(--accent)" }}>{score}</div>
            <div className="stat-lbl">Score</div>
          </div>
          <div className="stat-card">
            <div className="stat-val" style={{ color:timerColor }}>
              {gameState === "idle" ? `${GAME_SECONDS}s` : gameState === "over" || gameState === "claimed" ? "0s" : `${timeLeft}s`}
            </div>
            <div className="timer-bar">
              <div className="timer-fill" style={{ width: gameState === "idle" ? "100%" : `${pct}%`, background: timerColor }} />
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-val" style={{ color:"#f59e0b" }}>
              {tokensToday}<span style={{ fontSize:14, color:"var(--muted)" }}>/{maxTokens}</span>
            </div>
            <div className="stat-lbl">Tokens Today</div>
          </div>
        </div>

        {/* ── Board ── */}
        <div className="board-wrap">
          <div className="board">
            {cells.map((row, r) => row.map((coinId, c) => {
              const coin   = COIN_MAP[coinId] || COINS[0];
              const key    = `${r},${c}`;
              const isSel  = selectedCell?.r === r && selectedCell?.c === c;
              const isSwap = swapping.some(p => p.r === r && p.c === c);
              const isPop  = popping.has(key);
              return (
                <div
                  key={key}
                  className={`tile${isSel ? " selected" : ""}${isSwap ? " swapping" : ""}${isPop ? " popping" : ""}`}
                  style={{ background: coin.bg }}
                  onClick={() => handleTile(r, c)}
                >
                  <span className="sym" style={{ color: coin.fg }}>{coin.symbol}</span>
                  <span className="lbl" style={{ color: coin.fg }}>{coin.label}</span>
                </div>
              );
            }))}
          </div>
          {comboText && <div className="combo">{comboText}</div>}
          {gameState === "idle" && (
            <div className="board-idle-overlay">Press ▶ Start Game to play</div>
          )}
        </div>

        {/* ── Playing hint ── */}
        {gameState === "playing" && (
          <div className="hint-strip">
            {selectedCell ? "Click an adjacent coin to swap ↔" : "Click any coin to select it"}
          </div>
        )}

        {/* ── Game Over panel ── */}
        {gameState === "over" && (
          <div className="result-card">
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22, marginBottom:8 }}>⏱ Time's Up!</div>
            <div style={{ fontSize:15, color:"var(--muted)", marginBottom:14 }}>
              Final score: <strong style={{ color:"var(--accent)", fontSize:26 }}>{score}</strong>
            </div>
            {tokensPreview > 0 ? (
              <div style={{ background:"rgba(245,158,11,.1)", border:"1px solid rgba(245,158,11,.3)", borderRadius:12, padding:"12px 20px", marginBottom:18, fontSize:14 }}>
                🎉 You earned <strong style={{ color:"#f59e0b", fontSize:20 }}>{tokensPreview}</strong> Class Reward Token{tokensPreview !== 1 ? "s" : ""}!
              </div>
            ) : (
              <div style={{ color:"var(--muted)", fontSize:12, marginBottom:18 }}>
                {tokensToday >= maxTokens ? "Daily limit already reached." : `Need ${pointsPerToken} pts per token. Keep going!`}
              </div>
            )}
            <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
              {tokensPreview > 0 && (
                <button className="btn btn-primary" onClick={claimTokens} disabled={claiming}>
                  {claiming ? "Claiming…" : `Claim ${tokensPreview} Token${tokensPreview !== 1 ? "s" : ""}`}
                </button>
              )}
              <button className="btn btn-ghost" onClick={startGame}>↺ Play Again</button>
            </div>
          </div>
        )}

        {/* ── Claimed panel ── */}
        {gameState === "claimed" && (
          <div className="result-card">
            {claimResult?.tokensAwarded > 0 ? (
              <>
                <div style={{ fontSize:40, marginBottom:8 }}>🏆</div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22, marginBottom:6, color:"#f59e0b" }}>
                  +{claimResult.tokensAwarded} Token{claimResult.tokensAwarded !== 1 ? "s" : ""} Claimed!
                </div>
                <div style={{ fontSize:12, color:"var(--muted)", marginBottom:4 }}>Today: {claimResult.tokensToday}/{maxTokens}</div>
              </>
            ) : (
              <>
                <div style={{ fontSize:36, marginBottom:8 }}>😅</div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:16, marginBottom:6 }}>No tokens this time</div>
                <div style={{ fontSize:12, color:"var(--muted)" }}>{claimResult?.reason}</div>
              </>
            )}
          </div>
        )}

        {/* ── Class Leaderboard ── */}
        {crushLb.length > 0 && (
          <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:14, padding:"14px 16px", marginTop:14 }}>
            <div style={{ fontSize:11, color:"var(--muted)", marginBottom:10, textTransform:"uppercase", letterSpacing:1.5, fontFamily:"'DM Mono',monospace" }}>🏆 Class Leaderboard</div>
            {crushLb.map((s, i) => (
              <div key={s.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 0", borderBottom: i < crushLb.length-1 ? "1px solid var(--border)" : "none" }}>
                <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:13, color: i===0?"var(--gold)":i===1?"var(--muted)":i===2?"#cd7c2f":"var(--muted)", width:20, textAlign:"center" }}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}</span>
                <span style={{ flex:1, fontSize:12, fontWeight:600 }}>{s.name}</span>
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"var(--gold)", fontWeight:700 }}>{s.total.toLocaleString()} pts</span>
                <span style={{ fontSize:10, color:"var(--muted)", width:60, textAlign:"right" }}>best {s.best.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Coin legend ── */}
        <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:14, padding:"12px 16px", marginTop:14 }}>
          <div style={{ fontSize:9, color:"var(--muted)", marginBottom:8, textTransform:"uppercase", letterSpacing:1.5 }}>Coins in play</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {COINS.map(c => (
              <div key={c.id} style={{ display:"flex", alignItems:"center", gap:5, background:"var(--surface2)", borderRadius:8, padding:"4px 10px" }}>
                <div style={{ width:20, height:20, borderRadius:"50%", background:c.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, color:c.fg }}>{c.symbol}</div>
                <span style={{ fontSize:11, color:"var(--muted)" }}>{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <BadgeToast badgeIds={earnedBadges} />
    </>
  );
}
