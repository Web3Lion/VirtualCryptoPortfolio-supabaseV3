"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { applyTheme, getTheme } from "@/lib/theme";

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

function randCoin() { return COIN_IDS[Math.floor(Math.random() * COIN_IDS.length)]; }

function makeBoard() {
  const board = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => randCoin()));
  // Clear initial matches so board starts clean
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      let coin = board[r][c];
      while (
        (c >= 2 && board[r][c-1] === coin && board[r][c-2] === coin) ||
        (r >= 2 && board[r-1][c] === coin && board[r-2][c] === coin)
      ) {
        coin = randCoin();
        board[r][c] = coin;
      }
    }
  }
  return board;
}

function findMatches(board) {
  const matched = new Set();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 2; c++) {
      const v = board[r][c];
      if (v && v === board[r][c+1] && v === board[r][c+2]) {
        let e = c + 2;
        while (e + 1 < COLS && board[r][e+1] === v) e++;
        for (let k = c; k <= e; k++) matched.add(`${r},${k}`);
      }
    }
  }
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS - 2; r++) {
      const v = board[r][c];
      if (v && v === board[r+1][c] && v === board[r+2][c]) {
        let e = r + 2;
        while (e + 1 < ROWS && board[e+1][c] === v) e++;
        for (let k = r; k <= e; k++) matched.add(`${k},${c}`);
      }
    }
  }
  return matched;
}

function applyGravityAndFill(board, matched) {
  const next = board.map(row => [...row]);
  matched.forEach(key => {
    const [r, c] = key.split(",").map(Number);
    next[r][c] = null;
  });
  for (let c = 0; c < COLS; c++) {
    let fill = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (next[r][c] !== null) { next[fill][c] = next[r][c]; if (fill !== r) next[r][c] = null; fill--; }
    }
    for (let r = fill; r >= 0; r--) next[r][c] = randCoin();
  }
  return next;
}

function isAdjacent(a, b) {
  return (a.r === b.r && Math.abs(a.c - b.c) === 1) || (a.c === b.c && Math.abs(a.r - b.r) === 1);
}

export default function CryptoCrush() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState(null);
  const [board, setBoard] = useState(() => makeBoard());
  const [selected, setSelected] = useState(null);
  const [matched, setMatched] = useState(new Set());
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_SECONDS);
  const [gameState, setGameState] = useState("idle"); // idle | playing | over | claimed
  const [tokensToday, setTokensToday] = useState(0);
  const [maxTokens, setMaxTokens] = useState(50);
  const [pointsPerToken, setPointsPerToken] = useState(100);
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => { applyTheme(getTheme()); }, []);
  useEffect(() => { if (status === "unauthenticated") router.replace("/"); }, [status, router]);

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
      setPointsPerToken(d.pointsPerToken ?? 100);
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

  const resolveBoard = useCallback((b, pts = 0) => {
    const m = findMatches(b);
    if (m.size === 0) {
      setBoard(b);
      setMatched(new Set());
      setBusy(false);
      if (pts > 0) setScore(s => s + pts);
      return;
    }
    const newPts = pts + m.size * PTS_PER_TILE;
    setMatched(m);
    setBoard(b);
    setTimeout(() => {
      const next = applyGravityAndFill(b, m);
      setMatched(new Set());
      setTimeout(() => resolveBoard(next, newPts), 150);
    }, 400);
  }, []);

  const handleTile = useCallback((r, c) => {
    if (gameState !== "playing" || busy) return;
    if (!selected) { setSelected({ r, c }); return; }
    if (selected.r === r && selected.c === c) { setSelected(null); return; }
    if (!isAdjacent(selected, { r, c })) { setSelected({ r, c }); return; }

    // Attempt swap
    const next = board.map(row => [...row]);
    [next[selected.r][selected.c], next[r][c]] = [next[r][c], next[selected.r][selected.c]];
    const m = findMatches(next);
    setSelected(null);
    if (m.size === 0) {
      // Invalid — flash swap back
      setBoard(next);
      setTimeout(() => setBoard(board), 200);
      return;
    }
    setBusy(true);
    resolveBoard(next, 0);
  }, [gameState, busy, selected, board, resolveBoard]);

  const startGame = () => {
    setBoard(makeBoard());
    setScore(0);
    setTimeLeft(GAME_SECONDS);
    setSelected(null);
    setMatched(new Set());
    setClaimResult(null);
    setBusy(false);
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

  const tokensPreview = Math.min(Math.floor(score / pointsPerToken), Math.max(0, maxTokens - tokensToday));
  const pct = Math.round((timeLeft / GAME_SECONDS) * 100);
  const timerColor = timeLeft > 30 ? "#00e5a0" : timeLeft > 10 ? "#f59e0b" : "#ef4444";

  if (status === "loading" || status === "unauthenticated") {
    return <div style={{ background: "#080c14", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569" }}>Loading...</div>;
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--bg:#080c14;--surface:#0f172a;--surface2:#1a2235;--border:#1e293b;--accent:#00e5a0;--text:#e2e8f0;--muted:#475569}
        body{background:var(--bg);color:var(--text);font-family:'DM Mono',monospace;min-height:100vh}
        .page{max-width:700px;margin:0 auto;padding:24px 16px}
        .nav{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;margin-bottom:28px;background:var(--surface);border:1px solid var(--border);border-radius:16px;flex-wrap:wrap;gap:10px}
        .logo{font-family:'Syne',sans-serif;font-weight:800;font-size:16px}.logo span{color:var(--accent)}
        .nav-links{display:flex;gap:8px;flex-wrap:wrap}
        .nav-link{padding:6px 14px;border-radius:8px;font-size:11px;text-decoration:none;color:var(--muted);letter-spacing:1px;transition:all .2s;text-transform:uppercase}
        .nav-link:hover{color:var(--accent)}.nav-link.active{background:rgba(0,229,160,.12);color:var(--accent);border:1px solid rgba(0,229,160,.2)}
        .board{display:grid;grid-template-columns:repeat(8,1fr);gap:4px;background:var(--surface);border:2px solid var(--border);border-radius:16px;padding:10px;user-select:none}
        .tile{aspect-ratio:1;border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:transform .12s,opacity .3s,box-shadow .12s;position:relative;border:2px solid transparent}
        .tile:hover{transform:scale(1.08);filter:brightness(1.15)}
        .tile.selected{border-color:#fff;transform:scale(1.12);box-shadow:0 0 0 3px rgba(255,255,255,.4)}
        .tile.matched{animation:pop .35s ease forwards}
        .tile.hint{animation:pulse 0.6s ease infinite}
        .sym{font-size:clamp(12px,2.2vw,20px);font-weight:800;line-height:1}
        .lbl{font-size:clamp(7px,1.1vw,10px);font-weight:700;opacity:.85;line-height:1;margin-top:2px}
        @keyframes pop{0%{transform:scale(1.2);opacity:1}50%{transform:scale(1.4);opacity:.5}100%{transform:scale(0);opacity:0}}
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
        .btn{padding:10px 20px;border-radius:12px;font-family:'DM Mono',monospace;font-size:12px;font-weight:700;cursor:pointer;border:none;transition:all .2s;letter-spacing:.5px}
        .btn-primary{background:var(--accent);color:#000}.btn-primary:hover{background:#00c98e}.btn-primary:disabled{opacity:.5;cursor:not-allowed}
        .btn-ghost{background:transparent;border:1px solid var(--border);color:var(--muted)}.btn-ghost:hover{border-color:var(--accent);color:var(--accent)}
        .card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:20px}
        .timer-bar{height:6px;border-radius:3px;background:var(--surface2);overflow:hidden;margin-top:6px}
        .timer-fill{height:100%;border-radius:3px;transition:width .9s linear,background .5s}
      `}</style>

      <div className="page">
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 28, letterSpacing: -1 }}>
              🎮 <span style={{ color: "var(--accent)" }}>Crypto Crush</span>
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Match crypto coins to earn Class Reward Tokens</div>
          </div>
          {classes.length > 1 && (
            <select value={classId || ""} onChange={e => setClassId(e.target.value)}
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 10, padding: "6px 10px", fontFamily: "'DM Mono',monospace", fontSize: 11 }}>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name || c.id}</option>)}
            </select>
          )}
        </div>

        {/* Stats bar */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          <div className="card" style={{ textAlign: "center", padding: 14 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--accent)", fontFamily: "'Syne',sans-serif" }}>{score}</div>
            <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>SCORE</div>
          </div>
          <div className="card" style={{ textAlign: "center", padding: 14 }}>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Syne',sans-serif", color: timerColor }}>{timeLeft}s</div>
            <div className="timer-bar"><div className="timer-fill" style={{ width: `${pct}%`, background: timerColor }} /></div>
          </div>
          <div className="card" style={{ textAlign: "center", padding: 14 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#f59e0b", fontFamily: "'Syne',sans-serif" }}>
              {tokensToday}<span style={{ fontSize: 14, color: "#475569" }}>/{maxTokens}</span>
            </div>
            <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>TOKENS TODAY</div>
          </div>
        </div>

        {/* Board */}
        <div className="board" style={{ marginBottom: 16 }}>
          {board.map((row, r) => row.map((coinId, c) => {
            const coin = COIN_MAP[coinId];
            const key = `${r},${c}`;
            const isSel = selected?.r === r && selected?.c === c;
            const isMatch = matched.has(key);
            return (
              <div
                key={key}
                className={`tile${isSel ? " selected" : ""}${isMatch ? " matched" : ""}`}
                style={{ background: coin?.bg || "#222", opacity: isMatch ? 0 : 1 }}
                onClick={() => handleTile(r, c)}
              >
                <span className="sym" style={{ color: coin?.fg || "#fff" }}>{coin?.symbol}</span>
                <span className="lbl" style={{ color: coin?.fg || "#fff" }}>{coin?.label}</span>
              </div>
            );
          }))}
        </div>

        {/* Controls / game state */}
        {gameState === "idle" && (
          <div className="card" style={{ textAlign: "center", padding: 32 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎮</div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Ready to Play?</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 20, lineHeight: 1.7 }}>
              Match 3 or more coins in a row or column.<br />
              Each matched tile = <strong style={{ color: "var(--accent)" }}>{PTS_PER_TILE} pts</strong> &nbsp;·&nbsp;
              {pointsPerToken} pts = <strong style={{ color: "#f59e0b" }}>1 token</strong> &nbsp;·&nbsp;
              Max <strong style={{ color: "#f59e0b" }}>{maxTokens} tokens/day</strong>
              {tokensToday > 0 && <><br /><span style={{ color: "#f59e0b" }}>You've earned {tokensToday} tokens today.</span></>}
            </div>
            <button className="btn btn-primary" onClick={startGame} disabled={tokensToday >= maxTokens}>
              {tokensToday >= maxTokens ? "Daily limit reached" : "Start Game"}
            </button>
          </div>
        )}

        {gameState === "playing" && (
          <div style={{ textAlign: "center", fontSize: 11, color: "#475569" }}>
            Click a tile to select, then click an adjacent tile to swap. Match 3 or more!
          </div>
        )}

        {gameState === "over" && (
          <div className="card" style={{ textAlign: "center", padding: 28 }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22, marginBottom: 6 }}>
              ⏱ Time's Up!
            </div>
            <div style={{ fontSize: 14, color: "#94a3b8", marginBottom: 16 }}>
              Final score: <strong style={{ color: "var(--accent)", fontSize: 24 }}>{score}</strong>
            </div>
            {tokensPreview > 0 ? (
              <div style={{ background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.3)", borderRadius: 12, padding: "12px 20px", marginBottom: 20, fontSize: 13 }}>
                🎉 You earned <strong style={{ color: "#f59e0b", fontSize: 18 }}>{tokensPreview}</strong> Class Reward Token{tokensPreview !== 1 ? "s" : ""}!
              </div>
            ) : (
              <div style={{ color: "#475569", fontSize: 12, marginBottom: 20 }}>
                {tokensToday >= maxTokens ? "Daily token limit already reached." : `Need ${pointsPerToken} pts for 1 token. Keep playing!`}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              {tokensPreview > 0 && (
                <button className="btn btn-primary" onClick={claimTokens} disabled={claiming}>
                  {claiming ? "Claiming..." : `Claim ${tokensPreview} Token${tokensPreview !== 1 ? "s" : ""}`}
                </button>
              )}
              <button className="btn btn-ghost" onClick={startGame}>Play Again</button>
            </div>
          </div>
        )}

        {gameState === "claimed" && (
          <div className="card" style={{ textAlign: "center", padding: 28 }}>
            {claimResult?.tokensAwarded > 0 ? (
              <>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🏆</div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 20, marginBottom: 8, color: "#f59e0b" }}>
                  +{claimResult.tokensAwarded} Token{claimResult.tokensAwarded !== 1 ? "s" : ""} Claimed!
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 20 }}>
                  Total today: {claimResult.tokensToday}/{maxTokens}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 32, marginBottom: 8 }}>😅</div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>No tokens this time</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 20 }}>{claimResult?.reason}</div>
              </>
            )}
            <button className="btn btn-ghost" onClick={startGame}>Play Again</button>
          </div>
        )}

        {/* Coin legend */}
        <div className="card" style={{ marginTop: 16, padding: 14 }}>
          <div style={{ fontSize: 10, color: "#475569", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Coins in play</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {COINS.map(c => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--surface2)", borderRadius: 8, padding: "4px 10px" }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: c.fg }}>{c.symbol}</div>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
