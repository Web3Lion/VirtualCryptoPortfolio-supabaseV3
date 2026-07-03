"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import CoinLogo from "@/components/CoinLogo";
import { applyTheme, getTheme } from "@/lib/theme";

const ROUNDS = 10;
const COIN_COLORS = { BTC:'#f7931a',ETH:'#627eea',SOL:'#9945ff',ADA:'#0033ad',XRP:'#00aae4',DOGE:'#c2a633',AVAX:'#e84142',DOT:'#e6007a',LINK:'#2a5ada',MATIC:'#8247e5',BNB:'#f3ba2f',DEFAULT:'#00e5a0' };
const coinColor = s => COIN_COLORS[s?.toUpperCase()] || COIN_COLORS.DEFAULT;

const fmtPrice = p => {
  if (p >= 1000) return '$' + p.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (p >= 1)    return '$' + p.toFixed(2);
  return '$' + p.toFixed(4);
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getRating(score) {
  if (score === ROUNDS) return { label: '🏆 Perfect!',    color: '#f59e0b' };
  if (score >= 8)       return { label: '🔥 Hot Streak',  color: '#00e5a0' };
  if (score >= 6)       return { label: '📈 Not Bad',     color: '#3b82f6' };
  if (score >= 4)       return { label: '😐 50/50',       color: '#94a3b8' };
  return                       { label: '🐻 Bear Market', color: '#f43f5e' };
}

export default function BullBearGame() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [phase, setPhase]       = useState('loading');
  const [coins, setCoins]       = useState([]);
  const [deck, setDeck]         = useState([]);
  const [cardIdx, setCardIdx]   = useState(0);
  const [guess, setGuess]       = useState(null);
  const [score, setScore]       = useState(0);
  const [results, setResults]   = useState([]);
  const [classId, setClassId]   = useState(null);
  const [gameConfig, setGameConfig] = useState({ enabled: true, tokensPerCorrect: 5, maxPerDay: 50, tokensToday: 0 });
  const [reward, setReward]     = useState(null);

  useEffect(() => { applyTheme(getTheme()); }, []);
  useEffect(() => { if (status === 'unauthenticated') router.replace('/'); }, [status, router]);

  const loadCoins = useCallback(async () => {
    setPhase('loading');
    try {
      const [tickerRes, meRes] = await Promise.all([
        fetch('/api/ticker').then(r => r.ok ? r.json() : []),
        fetch('/api/me').then(r => r.ok ? r.json() : null),
      ]);
      const cid = meRes?.classId || meRes?.classes?.[0]?.id;
      if (cid) {
        setClassId(cid);
        const cfg = await fetch(`/api/games/bull-bear?classId=${cid}`).then(r => r.ok ? r.json() : null);
        if (cfg) setGameConfig(cfg);
      }
      const valid = (tickerRes || []).filter(c => c.change24h !== 0 && c.price > 0);
      setCoins(valid);
      setPhase('idle');
    } catch { setPhase('idle'); }
  }, []);

  useEffect(() => { if (status === 'authenticated') loadCoins(); }, [status, loadCoins]);

  function startGame() {
    const picked = shuffle(coins).slice(0, ROUNDS);
    setDeck(picked);
    setCardIdx(0);
    setGuess(null);
    setScore(0);
    setResults([]);
    setReward(null);
    setPhase('playing');
  }

  function makeGuess(g) {
    if (phase !== 'playing') return;
    const card = deck[cardIdx];
    const correct = g === 'bull' ? card.change24h > 0 : card.change24h < 0;
    setGuess(g);
    setResults(r => [...r, { ...card, guess: g, correct }]);
    if (correct) setScore(s => s + 1);
    setPhase('reveal');
  }

  async function next() {
    if (cardIdx + 1 >= ROUNDS) {
      // Submit results for tokens
      if (classId && gameConfig.enabled) {
        const finalScore = results.filter(r => r.correct).length + (results[results.length - 1]?.correct ? 0 : 0);
        // score state may lag — count from results array directly
        const correctCount = results.filter(r => r.correct).length;
        try {
          const res = await fetch('/api/games/bull-bear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ classId, score: correctCount, total: ROUNDS }),
          });
          if (res.ok) {
            const d = await res.json();
            if (d.tokensAwarded > 0) setReward(d);
          }
        } catch {}
      }
      setPhase('done');
    } else {
      setCardIdx(i => i + 1);
      setGuess(null);
      setPhase('playing');
    }
  }

  const card = deck[cardIdx];
  const rating = getRating(score);

  if (phase === 'loading') return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px' }}>
      <Nav />
      <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)', fontSize: 13 }}>Loading prices…</div>
    </main>
  );

  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px' }}>
      <Nav active="games" />
      <style>{`
        @keyframes cardIn{0%{transform:translateY(20px) scale(.96);opacity:0}100%{transform:translateY(0) scale(1);opacity:1}}
        @keyframes revealPop{0%{transform:scale(.7);opacity:0}60%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}
        @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}
        .guess-btn{flex:1;padding:18px;border-radius:16px;border:2px solid;font-family:'Syne',sans-serif;font-weight:800;font-size:20px;cursor:pointer;transition:all .15s;display:flex;align-items:center;justify-content:center;gap:8px}
        .guess-btn:hover{transform:translateY(-2px)}
        .guess-btn:disabled{opacity:.4;cursor:not-allowed;transform:none}
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22 }}>
            🐂 Bull or <span style={{ color: 'var(--accent)' }}>Bear</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Guess the 24h price direction</div>
        </div>
        <Link href="/dashboard" style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)', textDecoration: 'none' }}>← Dashboard</Link>
      </div>

      {/* IDLE — start screen */}
      {phase === 'idle' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '40px 24px', marginBottom: 20 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🐂🐻</div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Test your market intuition</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 24 }}>
              {ROUNDS} coins. For each one, guess whether it went <span style={{ color: '#00e5a0' }}>UP ▲</span> or <span style={{ color: '#f43f5e' }}>DOWN ▼</span> in the last 24 hours.
            </div>
            <button onClick={startGame} disabled={coins.length < ROUNDS}
              style={{ background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 12, padding: '14px 40px', fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>
              {coins.length < ROUNDS ? 'Loading…' : 'START GAME'}
            </button>
          </div>
        </div>
      )}

      {/* PLAYING / REVEAL — card */}
      {(phase === 'playing' || phase === 'reveal') && card && (
        <>
          {/* Progress */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 6, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(cardIdx / ROUNDS) * 100}%`, background: 'var(--accent)', borderRadius: 3, transition: 'width .3s' }} />
            </div>
            <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{cardIdx + 1} / {ROUNDS}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: score > 0 ? 'var(--up)' : 'var(--muted)', flexShrink: 0 }}>Score: {score}</span>
          </div>

          {/* Card */}
          <div key={cardIdx} style={{
            background: 'var(--surface)', border: `2px solid ${phase === 'reveal'
              ? (results[results.length - 1]?.correct ? 'rgba(0,229,160,.5)' : 'rgba(244,63,94,.5)')
              : 'var(--border)'}`,
            borderRadius: 20, padding: '32px 24px', textAlign: 'center', marginBottom: 20,
            animation: 'cardIn .3s ease both',
            transition: 'border-color .3s',
          }}>
            <CoinLogo symbol={card.symbol} size={72} style={{ margin: '0 auto 16px' }} />
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 28, letterSpacing: -1, marginBottom: 4 }}>{card.symbol}</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'DM Mono',monospace", color: 'var(--text)', marginBottom: 20 }}>{fmtPrice(card.price)}</div>

            {/* Hidden until reveal */}
            {phase === 'reveal' ? (
              <div style={{ animation: 'revealPop .4s ease both' }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: card.change24h > 0 ? 'rgba(0,229,160,.15)' : 'rgba(244,63,94,.12)',
                  border: `1px solid ${card.change24h > 0 ? 'rgba(0,229,160,.4)' : 'rgba(244,63,94,.3)'}`,
                  borderRadius: 12, padding: '10px 20px',
                }}>
                  <span style={{ fontSize: 24 }}>{card.change24h > 0 ? '▲' : '▼'}</span>
                  <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22, color: card.change24h > 0 ? '#00e5a0' : '#f43f5e' }}>
                    {card.change24h > 0 ? '+' : ''}{card.change24h.toFixed(2)}%
                  </span>
                </div>
                <div style={{ marginTop: 12, fontSize: 16, fontWeight: 700, color: results[results.length - 1]?.correct ? '#00e5a0' : '#f43f5e' }}>
                  {results[results.length - 1]?.correct ? '✓ Correct!' : '✗ Wrong'}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase' }}>24h change hidden — make your guess</div>
            )}
          </div>

          {/* Buttons */}
          {phase === 'playing' && (
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="guess-btn" onClick={() => makeGuess('bull')}
                style={{ background: 'rgba(0,229,160,.12)', borderColor: 'rgba(0,229,160,.4)', color: '#00e5a0' }}>
                <span>▲</span> BULL
              </button>
              <button className="guess-btn" onClick={() => makeGuess('bear')}
                style={{ background: 'rgba(244,63,94,.1)', borderColor: 'rgba(244,63,94,.35)', color: '#f43f5e' }}>
                <span>▼</span> BEAR
              </button>
            </div>
          )}
          {phase === 'reveal' && (
            <button onClick={next}
              style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: 'var(--accent)', color: '#000', fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>
              {cardIdx + 1 >= ROUNDS ? 'See Results →' : 'Next Coin →'}
            </button>
          )}
        </>
      )}

      {/* DONE — results */}
      {phase === 'done' && (
        <div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '32px 24px', textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 48, color: rating.color, marginBottom: 4 }}>{score}/{ROUNDS}</div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 20, color: rating.color, marginBottom: 4 }}>{rating.label}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: reward ? 12 : 24 }}>{Math.round((score / ROUNDS) * 100)}% accuracy</div>
            {reward && (
              <div style={{ background: 'rgba(0,229,160,.1)', border: '1px solid rgba(0,229,160,.3)', borderRadius: 12, padding: '10px 16px', marginBottom: 16, animation: 'revealPop .4s ease both' }}>
                <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16, color: '#00e5a0' }}>+{reward.tokensAwarded} tokens</span>
                <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8 }}>({gameConfig.tokensPerCorrect}/correct)</span>
              </div>
            )}
            <button onClick={startGame}
              style={{ background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 12, padding: '12px 32px', fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
              Play Again
            </button>
          </div>

          {/* Per-card recap */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
            {results.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <CoinLogo symbol={r.symbol} size={28} />
                <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13, flex: 1 }}>{r.symbol}</span>
                <span style={{ fontSize: 12, color: r.change24h > 0 ? '#00e5a0' : '#f43f5e', fontWeight: 600 }}>
                  {r.change24h > 0 ? '▲' : '▼'} {Math.abs(r.change24h).toFixed(2)}%
                </span>
                <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: 60, textAlign: 'right' }}>
                  You: {r.guess === 'bull' ? '▲ Bull' : '▼ Bear'}
                </span>
                <span style={{ fontSize: 14 }}>{r.correct ? '✓' : '✗'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
