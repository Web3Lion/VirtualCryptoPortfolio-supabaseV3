"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { applyTheme, getTheme } from "@/lib/theme";

const PRIZES = [
  { id: 'tokens_5',  label: '5 Tokens',      emoji: '🪙', color: '#475569' },
  { id: 'tokens_10', label: '10 Tokens',     emoji: '🪙', color: '#3b82f6' },
  { id: 'cash_50',   label: '+$50 Cash',     emoji: '💵', color: '#00e5a0' },
  { id: 'tokens_25', label: '25 Tokens',     emoji: '🪙', color: '#8b5cf6' },
  { id: 'freeze',    label: 'Streak Freeze', emoji: '🧊', color: '#06b6d4' },
  { id: 'tokens_50', label: '50 Tokens',     emoji: '🪙', color: '#f59e0b' },
  { id: 'cash_200',  label: '+$200 Cash',    emoji: '💵', color: '#f43f5e' },
  { id: 'nothing',   label: 'Try Tomorrow',  emoji: '😬', color: '#334155' },
];

const N = PRIZES.length;
const SLICE = (2 * Math.PI) / N;

function drawWheel(canvas, rotation) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2, r = Math.min(cx, cy) - 6;
  ctx.clearRect(0, 0, W, H);

  PRIZES.forEach((p, i) => {
    const start = rotation + i * SLICE - Math.PI / 2;
    const end   = start + SLICE;
    const mid   = start + SLICE / 2;

    // Slice fill
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, end);
    ctx.closePath();
    ctx.fillStyle = p.color;
    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.globalAlpha = 1;

    // Slice border
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Emoji + label
    const textR = r * 0.68;
    const tx = cx + textR * Math.cos(mid);
    const ty = cy + textR * Math.sin(mid);
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(mid + Math.PI / 2);
    ctx.font = '18px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.emoji, 0, -10);
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText(p.label, 0, 6);
    ctx.restore();
  });

  // Center circle
  ctx.beginPath();
  ctx.arc(cx, cy, 22, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = '#00e5a0';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⛏', cx, cy);

  // Pointer (top)
  ctx.beginPath();
  ctx.moveTo(cx - 12, cy - r - 10);
  ctx.lineTo(cx + 12, cy - r - 10);
  ctx.lineTo(cx, cy - r + 14);
  ctx.closePath();
  ctx.fillStyle = '#f59e0b';
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

export default function SpinPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const [spinning, setSpinning]   = useState(false);
  const [canSpin, setCanSpin]     = useState(false);
  const [spunToday, setSpunToday] = useState(false);
  const [rewardsEnabled, setRewardsEnabled] = useState(true);
  const [result, setResult]       = useState(null); // prize object
  const [rotation, setRotation]   = useState(0);
  const rotRef = useRef(0);

  useEffect(() => { applyTheme(getTheme()); }, []);
  useEffect(() => { if (status === 'unauthenticated') router.replace('/'); }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/spin').then(r => r.ok ? r.json() : null).then(d => {
      if (!d) return;
      setCanSpin(d.canSpin);
      setSpunToday(d.spunToday);
      setRewardsEnabled(d.rewardsEnabled);
    });
  }, [status]);

  // Draw wheel on canvas whenever rotation changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawWheel(canvas, rotRef.current);
  }, [rotation]);

  async function handleSpin() {
    if (!canSpin || spinning) return;
    setSpinning(true);
    setResult(null);

    const res = await fetch('/api/spin', { method: 'POST' });
    const data = await res.json();

    if (!res.ok) {
      if (data.spunToday) { setSpunToday(true); setCanSpin(false); }
      setSpinning(false);
      return;
    }

    const prizeIndex = data.prizeIndex ?? 0;
    // Target angle: land on the winning slice (pointer is at top = 0)
    // Slice i starts at i * SLICE - PI/2 from rotation
    // We want slice center under the pointer (top = -PI/2 from center)
    // So target rotation = -(prizeIndex * SLICE + SLICE/2) + extra full spins
    const targetAngle = -(prizeIndex * SLICE + SLICE / 2);
    const extraSpins  = (5 + Math.floor(Math.random() * 3)) * 2 * Math.PI;
    const finalAngle  = targetAngle + extraSpins;

    const startAngle = rotRef.current;
    const duration   = 4000;
    const startTime  = performance.now();

    function ease(t) {
      // Ease out cubic
      return 1 - Math.pow(1 - t, 3);
    }

    function frame(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const current = startAngle + (finalAngle - startAngle) * ease(t);
      rotRef.current = current;
      setRotation(current); // triggers redraw

      if (t < 1) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        rotRef.current = finalAngle;
        setSpinning(false);
        setCanSpin(false);
        setSpunToday(true);
        setResult(data.prize);
      }
    }

    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const PRIZE_BG = result ? `${result.color}18` : 'var(--surface)';
  const PRIZE_BORDER = result ? `${result.color}50` : 'var(--border)';

  return (
    <main style={{ maxWidth: 520, margin: '0 auto', padding: '24px 16px' }}>
      <Nav />
      <style>{`
        @keyframes prizeReveal{0%{transform:scale(.8) translateY(10px);opacity:0}100%{transform:scale(1) translateY(0);opacity:1}}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .spin-btn{width:100%;padding:16px;border-radius:14px;border:none;font-family:'Syne',sans-serif;font-weight:800;font-size:18px;cursor:pointer;transition:all .2s;letter-spacing:.5px}
        .spin-btn:disabled{opacity:.5;cursor:not-allowed}
      `}</style>

      <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 28, letterSpacing: -1, marginBottom: 4 }}>
        🎡 Daily <span style={{ color: 'var(--accent)' }}>Spin</span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 24 }}>
        One spin per day — tokens, cash, or streak protection
      </div>

      {/* Wheel */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        <div style={{ position: 'relative', filter: spinning ? 'drop-shadow(0 0 24px rgba(0,229,160,.4))' : 'none', transition: 'filter .3s' }}>
          <canvas ref={canvasRef} width={320} height={320} style={{ display: 'block', borderRadius: '50%' }} />
        </div>
      </div>

      {/* Spin button */}
      {!spunToday && rewardsEnabled && (
        <button
          className="spin-btn"
          onClick={handleSpin}
          disabled={spinning || !canSpin}
          style={{ background: spinning ? 'var(--surface)' : 'var(--accent)', color: spinning ? 'var(--muted)' : '#000' }}
        >
          {spinning ? '🌀 Spinning…' : '🎰 SPIN'}
        </button>
      )}

      {/* Already spun */}
      {spunToday && !spinning && (
        <div style={{ textAlign: 'center', padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, fontSize: 13, color: 'var(--muted)' }}>
          ✓ You've spun today — come back tomorrow!
        </div>
      )}

      {/* Rewards disabled */}
      {!rewardsEnabled && (
        <div style={{ textAlign: 'center', padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, fontSize: 13, color: 'var(--muted)' }}>
          🔒 Your teacher hasn't enabled rewards yet
        </div>
      )}

      {/* Prize reveal */}
      {result && (
        <div style={{ marginTop: 16, background: PRIZE_BG, border: `1px solid ${PRIZE_BORDER}`, borderRadius: 16, padding: '20px 24px', textAlign: 'center', animation: 'prizeReveal .4s ease both' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>{result.emoji}</div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22, color: result.color, marginBottom: 4 }}>{result.label}</div>
          {result.tokens > 0 && <div style={{ fontSize: 13, color: 'var(--muted)' }}>Added to your token balance</div>}
          {result.cash > 0   && <div style={{ fontSize: 13, color: 'var(--muted)' }}>Added to your portfolio cash</div>}
          {result.id === 'freeze' && <div style={{ fontSize: 13, color: 'var(--muted)' }}>Your login streak is protected for one missed day</div>}
          {result.id === 'nothing' && <div style={{ fontSize: 13, color: 'var(--muted)' }}>Better luck next time — see you tomorrow!</div>}
        </div>
      )}

      {/* Prize table */}
      <div style={{ marginTop: 24, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
        <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>Possible prizes</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {PRIZES.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--surface2)', borderRadius: 10, border: `1px solid ${result?.id === p.id ? p.color : 'transparent'}` }}>
              <span style={{ fontSize: 18 }}>{p.emoji}</span>
              <span style={{ fontSize: 12, fontWeight: result?.id === p.id ? 700 : 400, color: result?.id === p.id ? p.color : 'var(--text)' }}>{p.label}</span>
              {result?.id === p.id && <span style={{ fontSize: 10, marginLeft: 'auto', color: p.color }}>◀ won</span>}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
