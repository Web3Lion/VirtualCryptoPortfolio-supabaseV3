"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
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
    setGameState("claimed");
    setClaiming(false);
    fetchDailyStatus(classId);
  };

  // ── Derived display values ────────────────────────────────────────────────
  const tokensPreview = Math.min(Math.floor(score / pointsPerToken), Math.max(0, maxTokens - tokensToday));
  const pct           = Math.round((timeLeft / GAME_SECONDS) * 100);
  const timerColor    = timeLeft > 30 ? "#00e5a0" : timeLeft > 10 ? "#f59e0b" : "#ef4444";

  if (status === "loading" || status === "unauthenticated") {
    return <div style={{ background: "#080c14", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569" }}>Loading…</div>;
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--bg:#080c14;--surface:#0f172a;--surface2:#1a2235;--border:#1e293b;--accent:#00e5a0;--text:#e2e8f0;--muted:#475569}
        body{background:var(--bg);color:var(--text);font-family:'DM Mono',monospace;min-height:100vh}
        .page{max-width:660px;margin:0 auto;padding:24px 16px}
        .nav{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;margin-bottom:24px;background:var(--surface);border:1px solid var(--border);border-radius:16px;flex-wrap:wrap;gap:10px}
        .logo{font-family:'Syne',sans-serif;font-weight:800;font-size:16px}.logo span{color:var(--accent)}
        .nav-links{display:flex;gap:8px;flex-wrap:wrap}
        .nav-link{padding:6px 14px;border-radius:8px;font-size:11px;text-decoration:none;color:var(--muted);letter-spacing:1px;transition:all .2s;text-transform:uppercase}
        .nav-link:hover{color:var(--accent)}.nav-link.active{background:rgba(0,229,160,.12);color:var(--accent);border:1px solid rgba(0,229,160,.2)}

        /* Board */
        .board-wrap{position:relative}
        .board{display:grid;grid-template-columns:repeat(8,1fr);gap:4px;background:rgba(15,23,42,.9);border:2px solid var(--border);border-radius:16px;padding:8px;user-select:none}
        .tile{
          aspect-ratio:1;border-radius:10px;display:flex;flex-direction:column;
          align-items:center;justify-content:center;cursor:pointer;
          transition:transform .15s ease, filter .15s, box-shadow .15s;
          border:2px solid transparent;position:relative;overflow:hidden;
        }
        .tile:hover{transform:scale(1.08);filter:brightness(1.2)}
        .tile.selected{border-color:#fff;transform:scale(1.1);box-shadow:0 0 0 3px rgba(255,255,255,.5);filter:brightness(1.25)}
        .tile.swapping{transform:scale(1.15);filter:brightness(1.3);box-shadow:0 0 12px rgba(255,255,255,.4)}
        .tile.popping{animation:pop .38s ease forwards}
        .sym{font-size:clamp(11px,2vw,19px);font-weight:800;line-height:1;pointer-events:none}
        .lbl{font-size:clamp(6px,.9vw,9px);font-weight:700;opacity:.8;line-height:1;margin-top:1px;pointer-events:none}

        /* Combo text */
        .combo{
          position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
          font-family:'Syne',sans-serif;font-weight:800;font-size:28px;
          color:#f59e0b;text-shadow:0 2px 8px rgba(0,0,0,.8);
          animation:comboPop .7s ease forwards;pointer-events:none;z-index:10;
          white-space:nowrap;
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

        /* UI */
        .btn{padding:10px 22px;border-radius:12px;font-family:'DM Mono',monospace;font-size:12px;font-weight:700;cursor:pointer;border:none;transition:all .2s;letter-spacing:.5px}
        .btn-primary{background:var(--accent);color:#000}.btn-primary:hover{background:#00c98e}.btn-primary:disabled{opacity:.5;cursor:not-allowed}
        .btn-ghost{background:transparent;border:1px solid var(--border);color:var(--muted)}.btn-ghost:hover{border-color:var(--accent);color:var(--accent)}
        .card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:20px}
        .timer-bar{height:6px;border-radius:3px;background:var(--surface2);overflow:hidden;margin-top:6px}
        .timer-fill{height:100%;border-radius:3px;transition:width .9s linear,background .5s}
      `}</style>

      <div className="page">
        {/* Nav */}
        <nav className="nav">
          <div className="logo">CRYPTO<span>CLASS</span></div>
          <div className="nav-links">
            <Link href="/dashboard" className="nav-link">Wallet</Link>
            <Link href="/leaderboard" className="nav-link">Leaderboard</Link>
            <Link href="/market" className="nav-link">Market</Link>
            <Link href="/news" className="nav-link">News</Link>
            <Link href="/badges" className="nav-link">Badges</Link>
            <Link href="/learn" className="nav-link">Learn</Link>
            <a href="/games/crypto-crush" className="nav-link active">Crush</a>
          </div>
          <ThemeToggle />
        </nav>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:10 }}>
          <div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:26, letterSpacing:-1 }}>
              🎮 <span style={{ color:"var(--accent)" }}>Crypto Crush</span>
            </div>
            <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>Match crypto coins • earn Class Reward Tokens</div>
          </div>
          {classes.length > 1 && (
            <select value={classId || ""} onChange={e => setClassId(e.target.value)}
              style={{ background:"var(--surface2)", border:"1px solid var(--border)", color:"var(--text)", borderRadius:10, padding:"6px 10px", fontFamily:"'DM Mono',monospace", fontSize:11 }}>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name || c.id}</option>)}
            </select>
          )}
        </div>

        {/* Stats bar */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:12 }}>
          <div className="card" style={{ textAlign:"center", padding:12 }}>
            <div style={{ fontSize:20, fontWeight:800, color:"var(--accent)", fontFamily:"'Syne',sans-serif" }}>{score}</div>
            <div style={{ fontSize:9, color:"#475569", marginTop:2 }}>SCORE</div>
          </div>
          <div className="card" style={{ textAlign:"center", padding:12 }}>
            <div style={{ fontSize:20, fontWeight:800, fontFamily:"'Syne',sans-serif", color:timerColor }}>{timeLeft}s</div>
            <div className="timer-bar"><div className="timer-fill" style={{ width:`${pct}%`, background:timerColor }} /></div>
          </div>
          <div className="card" style={{ textAlign:"center", padding:12 }}>
            <div style={{ fontSize:20, fontWeight:800, color:"#f59e0b", fontFamily:"'Syne',sans-serif" }}>
              {tokensToday}<span style={{ fontSize:12, color:"#475569" }}>/{maxTokens}</span>
            </div>
            <div style={{ fontSize:9, color:"#475569", marginTop:2 }}>TOKENS TODAY</div>
          </div>
        </div>

        {/* Board */}
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
        </div>

        {/* Game state panels */}
        <div style={{ marginTop:12 }}>
          {gameState === "idle" && (
            <div className="card" style={{ textAlign:"center", padding:28 }}>
              <div style={{ fontSize:36, marginBottom:10 }}>🎮</div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:17, marginBottom:8 }}>Ready to Play?</div>
              <div style={{ fontSize:12, color:"#94a3b8", marginBottom:20, lineHeight:1.8 }}>
                Select a coin, then click an adjacent coin to swap.<br/>
                Match <strong style={{ color:"var(--accent)" }}>3 or more</strong> in a row or column to score.<br/>
                <strong style={{ color:"var(--accent)" }}>{PTS_PER_TILE} pts</strong> per tile · {pointsPerToken} pts = <strong style={{ color:"#f59e0b" }}>1 Token</strong> · max <strong style={{ color:"#f59e0b" }}>{maxTokens}/day</strong>
                {tokensToday > 0 && <><br /><span style={{ color:"#f59e0b" }}>Today so far: {tokensToday} token{tokensToday !== 1 ? "s" : ""} earned.</span></>}
              </div>
              <button className="btn btn-primary" onClick={startGame} disabled={tokensToday >= maxTokens}>
                {tokensToday >= maxTokens ? "Daily limit reached" : "Start Game"}
              </button>
            </div>
          )}

          {gameState === "playing" && (
            <div style={{ textAlign:"center", fontSize:11, color:"#475569", padding:"4px 0" }}>
              {selectedCell ? "Now click an adjacent coin to swap ↔" : "Click any coin to select it"}
            </div>
          )}

          {gameState === "over" && (
            <div className="card" style={{ textAlign:"center", padding:26 }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:20, marginBottom:6 }}>⏱ Time's Up!</div>
              <div style={{ fontSize:14, color:"#94a3b8", marginBottom:14 }}>
                Final score: <strong style={{ color:"var(--accent)", fontSize:22 }}>{score}</strong>
              </div>
              {tokensPreview > 0 ? (
                <div style={{ background:"rgba(245,158,11,.1)", border:"1px solid rgba(245,158,11,.3)", borderRadius:12, padding:"10px 18px", marginBottom:18, fontSize:13 }}>
                  🎉 You earned <strong style={{ color:"#f59e0b", fontSize:18 }}>{tokensPreview}</strong> Class Reward Token{tokensPreview !== 1 ? "s" : ""}!
                </div>
              ) : (
                <div style={{ color:"#475569", fontSize:12, marginBottom:18 }}>
                  {tokensToday >= maxTokens ? "Daily limit already reached." : `Need ${pointsPerToken} pts per token. Keep going!`}
                </div>
              )}
              <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
                {tokensPreview > 0 && (
                  <button className="btn btn-primary" onClick={claimTokens} disabled={claiming}>
                    {claiming ? "Claiming…" : `Claim ${tokensPreview} Token${tokensPreview !== 1 ? "s" : ""}`}
                  </button>
                )}
                <button className="btn btn-ghost" onClick={startGame}>Play Again</button>
              </div>
            </div>
          )}

          {gameState === "claimed" && (
            <div className="card" style={{ textAlign:"center", padding:26 }}>
              {claimResult?.tokensAwarded > 0 ? (
                <>
                  <div style={{ fontSize:36, marginBottom:8 }}>🏆</div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:20, marginBottom:6, color:"#f59e0b" }}>
                    +{claimResult.tokensAwarded} Token{claimResult.tokensAwarded !== 1 ? "s" : ""} Claimed!
                  </div>
                  <div style={{ fontSize:12, color:"#94a3b8", marginBottom:18 }}>Today: {claimResult.tokensToday}/{maxTokens}</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize:32, marginBottom:8 }}>😅</div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15, marginBottom:6 }}>No tokens this time</div>
                  <div style={{ fontSize:12, color:"#94a3b8", marginBottom:18 }}>{claimResult?.reason}</div>
                </>
              )}
              <button className="btn btn-ghost" onClick={startGame}>Play Again</button>
            </div>
          )}
        </div>

        {/* Coin legend */}
        <div className="card" style={{ marginTop:14, padding:12 }}>
          <div style={{ fontSize:9, color:"#475569", marginBottom:8, textTransform:"uppercase", letterSpacing:1 }}>Coins in play</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {COINS.map(c => (
              <div key={c.id} style={{ display:"flex", alignItems:"center", gap:5, background:"var(--surface2)", borderRadius:8, padding:"3px 8px" }}>
                <div style={{ width:18, height:18, borderRadius:"50%", background:c.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:800, color:c.fg }}>{c.symbol}</div>
                <span style={{ fontSize:10, color:"#94a3b8" }}>{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
