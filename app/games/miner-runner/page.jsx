"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import { applyTheme, getTheme } from "@/lib/theme";

// ─── Game constants ────────────────────────────────────────────────────────────
const W = 800;
const H = 300;
const GROUND_Y = 240;
const GRAVITY = 0.6;
const JUMP_FORCE = -13;
const MINER_W = 48;
const MINER_H = 56;
const MINER_X = 90;
const COIN_W = 40;
const COIN_H = 40;
const INITIAL_SPEED = 5;
const SPEED_INCREMENT = 0.0004; // gentle continuous ramp
const LEVEL_UP_EVERY = 20 * 60; // frames (20 s × 60 fps)
const LEVEL_SPEED_BUMP = 0.45;  // added to speed on each level-up

// ─── Draw helpers ──────────────────────────────────────────────────────────────
function drawMiner(ctx, x, y, frame, isDead) {
  const t = x; // use fixed x
  // Pixel-art style miner

  // Hard hat
  ctx.fillStyle = isDead ? "#888" : "#f59e0b";
  ctx.beginPath();
  ctx.ellipse(x + MINER_W / 2, y + 10, 18, 10, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(x + 10, y + 8, 28, 8); // brim
  // Lamp on hat
  ctx.fillStyle = isDead ? "#555" : "#fef3c7";
  ctx.beginPath();
  ctx.arc(x + MINER_W / 2, y + 7, 5, 0, Math.PI * 2);
  ctx.fill();
  if (!isDead) {
    ctx.fillStyle = "rgba(254,243,199,0.25)";
    ctx.beginPath();
    ctx.arc(x + MINER_W / 2, y + 7, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  // Head
  ctx.fillStyle = isDead ? "#aaa" : "#fcd34d";
  ctx.fillRect(x + 13, y + 14, 22, 20);

  // Eyes
  if (isDead) {
    ctx.fillStyle = "#555";
    ctx.fillRect(x + 17, y + 19, 4, 4);
    ctx.fillRect(x + 27, y + 19, 4, 4);
    // X eyes
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x + 17, y + 19); ctx.lineTo(x + 21, y + 23); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 21, y + 19); ctx.lineTo(x + 17, y + 23); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 27, y + 19); ctx.lineTo(x + 31, y + 23); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 31, y + 19); ctx.lineTo(x + 27, y + 23); ctx.stroke();
  } else {
    ctx.fillStyle = "#1e3a5f";
    ctx.fillRect(x + 17, y + 19, 4, 5);
    ctx.fillRect(x + 27, y + 19, 4, 5);
  }

  // Body (overalls)
  ctx.fillStyle = isDead ? "#666" : "#1d4ed8";
  ctx.fillRect(x + 11, y + 34, 26, 18);

  // Suspenders
  ctx.fillStyle = isDead ? "#888" : "#2563eb";
  ctx.fillRect(x + 14, y + 34, 5, 18);
  ctx.fillRect(x + 29, y + 34, 5, 18);

  // Legs (animated)
  const legSwing = Math.sin(frame * 0.3) * 6;
  ctx.fillStyle = isDead ? "#555" : "#1e3a8a";
  ctx.fillRect(x + 12, y + 50, 10, 6 + (isDead ? 0 : legSwing > 0 ? legSwing : 0));
  ctx.fillRect(x + 26, y + 50, 10, 6 + (isDead ? 0 : legSwing < 0 ? -legSwing : 0));

  // Boots
  ctx.fillStyle = isDead ? "#333" : "#7c2d12";
  ctx.fillRect(x + 10, y + 53 + Math.max(0, legSwing), 14, 5);
  ctx.fillRect(x + 24, y + 53 + Math.max(0, -legSwing), 14, 5);

  // Pickaxe arm
  const armSwing = Math.sin(frame * 0.3) * 4;
  ctx.strokeStyle = isDead ? "#666" : "#92400e";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x + 37, y + 36 + armSwing);
  ctx.lineTo(x + 52, y + 28 + armSwing);
  ctx.stroke();

  // Pickaxe head
  ctx.fillStyle = isDead ? "#555" : "#6b7280";
  ctx.beginPath();
  ctx.moveTo(x + 52, y + 22 + armSwing);
  ctx.lineTo(x + 60, y + 28 + armSwing);
  ctx.lineTo(x + 52, y + 34 + armSwing);
  ctx.closePath();
  ctx.fill();
}

function drawBTCCoin(ctx, x, y, frame) {
  const cx = x + COIN_W / 2;
  const cy = y + COIN_H / 2;
  const r = COIN_W / 2;
  const spin = Math.cos(frame * 0.08);
  const rx = Math.abs(spin) * r;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(cx, y + COIN_H + 4, rx * 0.8, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Coin body
  const grad = ctx.createRadialGradient(cx - 5, cy - 5, 2, cx, cy, r);
  grad.addColorStop(0, "#fde68a");
  grad.addColorStop(0.4, "#f59e0b");
  grad.addColorStop(1, "#b45309");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, r, 0, 0, Math.PI * 2);
  ctx.fill();

  // Coin edge highlight
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, r, 0, 0, Math.PI * 2);
  ctx.stroke();

  if (rx > 8) {
    // ₿ symbol
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${Math.floor(rx * 0.7)}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("₿", cx, cy + 1);
  }
}

function drawGround(ctx, offset) {
  // Ground base
  ctx.fillStyle = "#78350f";
  ctx.fillRect(0, GROUND_Y + MINER_H - 2, W, H - GROUND_Y - MINER_H + 2);

  // Top soil layer
  ctx.fillStyle = "#92400e";
  ctx.fillRect(0, GROUND_Y + MINER_H - 2, W, 8);

  // Grass/dirt texture strips
  ctx.fillStyle = "#a16207";
  for (let i = 0; i < 20; i++) {
    const tx = ((i * 60 - offset) % (W + 60) + W + 60) % (W + 60) - 60;
    ctx.fillRect(tx, GROUND_Y + MINER_H + 4, 30, 4);
  }

  // Rock/ore details
  ctx.fillStyle = "#6b7280";
  for (let i = 0; i < 8; i++) {
    const tx = ((i * 130 + 40 - offset * 0.5) % (W + 130) + W + 130) % (W + 130) - 130;
    ctx.beginPath();
    ctx.ellipse(tx, GROUND_Y + MINER_H + 15, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBackground(ctx, offset) {
  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y + MINER_H);
  sky.addColorStop(0, "#0f172a");
  sky.addColorStop(1, "#1e3a5f");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, GROUND_Y + MINER_H);

  // Stars
  ctx.fillStyle = "#fff";
  const stars = [
    [50, 20], [120, 45], [200, 15], [310, 60], [430, 25],
    [520, 50], [640, 18], [720, 42], [780, 30], [170, 70],
    [380, 40], [600, 65], [750, 12], [90, 60], [460, 10],
  ];
  for (const [sx, sy] of stars) {
    ctx.beginPath();
    ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Moon
  ctx.fillStyle = "#fef3c7";
  ctx.beginPath();
  ctx.arc(700, 55, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1e3a5f";
  ctx.beginPath();
  ctx.arc(710, 48, 18, 0, Math.PI * 2);
  ctx.fill();

  // Distant mountains
  ctx.fillStyle = "#1e3a5f";
  const mtnOffset = (offset * 0.15) % W;
  for (let m = -1; m < 3; m++) {
    const mx = m * 300 - mtnOffset;
    ctx.beginPath();
    ctx.moveTo(mx, GROUND_Y + MINER_H - 2);
    ctx.lineTo(mx + 80, GROUND_Y - 80);
    ctx.lineTo(mx + 160, GROUND_Y + MINER_H - 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(mx + 120, GROUND_Y + MINER_H - 2);
    ctx.lineTo(mx + 200, GROUND_Y - 50);
    ctx.lineTo(mx + 280, GROUND_Y + MINER_H - 2);
    ctx.closePath();
    ctx.fill();
  }

  // Mine entrance hint on left
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, GROUND_Y - 60, 30, 62);
  ctx.fillStyle = "#1e3a5f";
  ctx.beginPath();
  ctx.arc(30, GROUND_Y - 30, 30, Math.PI * 0.5, Math.PI * 1.5);
  ctx.fill();
}

function drawParticles(ctx, particles) {
  for (const p of particles) {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function MinerRunner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const animRef = useRef(null);
  const [gameState, setGameState] = useState("idle"); // idle | running | dead
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [classId, setClassId] = useState(null);
  const [reward, setReward] = useState(null); // { tokensAwarded, newBadges }
  const [levelReached, setLevelReached] = useState(1);

  useEffect(() => {
    applyTheme(getTheme());
    const stored = parseInt(localStorage.getItem("miner_runner_hs") || "0");
    setHighScore(stored);
  }, []);

  // Fetch classId once authenticated
  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/me').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.classes?.[0]?.id) setClassId(d.classes[0].id);
    }).catch(() => {});
  }, [status]);

  const initGame = useCallback(() => {
    gameRef.current = {
      miner: { x: MINER_X, y: GROUND_Y, vy: 0, onGround: true, jumpsLeft: 2 },
      coins: [],
      particles: [],
      frame: 0,
      score: 0,
      speed: INITIAL_SPEED,
      groundOffset: 0,
      nextCoinIn: 80,
      dead: false,
      difficultyLevel: 1,
      nextLevelFrame: LEVEL_UP_EVERY,
      levelUpFlash: 0,
    };
  }, []);

  const spawnParticles = useCallback((x, y, color) => {
    const g = gameRef.current;
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.3;
      const speed = 2 + Math.random() * 3;
      g.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        r: 3 + Math.random() * 3,
        color,
        life: 40,
        maxLife: 40,
      });
    }
  }, []);

  const jump = useCallback(() => {
    const g = gameRef.current;
    if (!g || g.dead) return;
    if (g.miner.jumpsLeft > 0) {
      g.miner.vy = JUMP_FORCE;
      g.miner.onGround = false;
      g.miner.jumpsLeft--;
    }
  }, []);

  const startGame = useCallback(() => {
    initGame();
    setScore(0);
    setGameState("running");
  }, [initGame]);

  // Input handling
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        if (gameState === "idle" || gameState === "dead") {
          startGame();
        } else {
          jump();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gameState, jump, startGame]);

  const handleCanvasClick = useCallback(() => {
    if (gameState === "idle" || gameState === "dead") {
      startGame();
    } else {
      jump();
    }
  }, [gameState, jump, startGame]);

  // Game loop
  useEffect(() => {
    if (gameState !== "running") {
      cancelAnimationFrame(animRef.current);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const loop = () => {
      const g = gameRef.current;
      if (!g || g.dead) return;

      g.frame++;
      g.score += g.speed * 0.1;
      g.speed += SPEED_INCREMENT;
      g.groundOffset += g.speed;

      // ── Step difficulty every 20 s ──────────────────────────────────────────
      if (g.frame >= g.nextLevelFrame) {
        g.difficultyLevel++;
        g.speed += LEVEL_SPEED_BUMP;
        g.nextLevelFrame += LEVEL_UP_EVERY;
        g.levelUpFlash = 100; // show "LEVEL UP!" for ~1.7 s
        spawnParticles(W / 2, H / 2, "#00e5a0");
      }
      if (g.levelUpFlash > 0) g.levelUpFlash--;

      // Miner physics
      const m = g.miner;
      m.vy += GRAVITY;
      m.y += m.vy;
      if (m.y >= GROUND_Y) {
        m.y = GROUND_Y;
        m.vy = 0;
        m.onGround = true;
        m.jumpsLeft = 2;
      }

      // Spawn coins — gap and pattern difficulty scale with difficultyLevel
      g.nextCoinIn--;
      if (g.nextCoinIn <= 0) {
        const lvl = g.difficultyLevel;
        const pattern = Math.random();
        const hardChance = Math.min(0.5, 0.05 + lvl * 0.06); // up to 50% hard at lvl ~8
        if (pattern < hardChance * 0.5 && lvl >= 2) {
          // Side-by-side (need to time two jumps)
          g.coins.push({ x: W + 20, y: GROUND_Y + MINER_H - COIN_H, frame: 0 });
          g.coins.push({ x: W + 20 + COIN_W + 10, y: GROUND_Y + MINER_H - COIN_H, frame: 0 });
        } else if (pattern < hardChance && lvl >= 3) {
          // Stacked (need a well-timed high jump)
          g.coins.push({ x: W + 20, y: GROUND_Y + MINER_H - COIN_H, frame: 0 });
          g.coins.push({ x: W + 20, y: GROUND_Y + MINER_H - COIN_H * 2 - 8, frame: 0 });
        } else {
          g.coins.push({ x: W + 20, y: GROUND_Y + MINER_H - COIN_H, frame: 0 });
        }
        const minGap = Math.max(28, 90 - lvl * 7);
        const randGap = Math.max(15, 65 - lvl * 5);
        g.nextCoinIn = minGap + Math.random() * randGap;
      }

      // Move coins
      for (const c of g.coins) {
        c.x -= g.speed;
        c.frame++;
      }
      g.coins = g.coins.filter(c => c.x > -COIN_W - 20);

      // Collision detection
      const mx1 = m.x + 10, mx2 = m.x + MINER_W - 10;
      const my1 = m.y + 8, my2 = m.y + MINER_H - 2;
      for (const c of g.coins) {
        const cx1 = c.x + 4, cx2 = c.x + COIN_W - 4;
        const cy1 = c.y + 4, cy2 = c.y + COIN_H - 4;
        if (mx1 < cx2 && mx2 > cx1 && my1 < cy2 && my2 > cy1) {
          g.dead = true;
          spawnParticles(m.x + MINER_W / 2, m.y + MINER_H / 2, "#f59e0b");
          spawnParticles(c.x + COIN_W / 2, c.y + COIN_H / 2, "#fbbf24");
          const finalScore = Math.floor(g.score);
          const finalLevel = g.difficultyLevel;
          setScore(finalScore);
          setLevelReached(finalLevel);
          setHighScore(prev => {
            const next = Math.max(prev, finalScore);
            localStorage.setItem("miner_runner_hs", String(next));
            return next;
          });
          setReward(null);
          setGameState("dead");
          // Submit score for tokens + badges
          if (classId && finalScore > 0) {
            fetch('/api/games/miner-runner', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ classId, score: finalScore, level: finalLevel }),
            }).then(r => r.ok ? r.json() : null).then(d => {
              if (d && (d.tokensAwarded > 0 || d.newBadges?.length > 0)) setReward(d);
            }).catch(() => {});
          }
          return;
        }
      }

      // Update particles
      for (const p of g.particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2;
        p.life--;
      }
      g.particles = g.particles.filter(p => p.life > 0);

      // ── Draw ──
      drawBackground(ctx, g.groundOffset);
      drawGround(ctx, g.groundOffset);

      for (const c of g.coins) {
        drawBTCCoin(ctx, c.x, c.y, c.frame);
      }

      drawMiner(ctx, m.x, m.y, g.frame, false);
      drawParticles(ctx, g.particles);

      // ── HUD ────────────────────────────────────────────────────────────────
      // Score panel
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.roundRect(W - 185, 12, 170, 38, 8);
      ctx.fill();
      ctx.fillStyle = "#f59e0b";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "right";
      ctx.textBaseline = "top";
      ctx.fillText(`SCORE  ${Math.floor(g.score).toString().padStart(6, "0")}`, W - 22, 20);

      // Level badge (top-left)
      const lvlColor = g.difficultyLevel <= 2 ? "#22d3ee"
                     : g.difficultyLevel <= 4 ? "#00e5a0"
                     : g.difficultyLevel <= 6 ? "#f59e0b"
                     : "#ef4444";
      ctx.fillStyle = `${lvlColor}cc`;
      ctx.roundRect(14, 12, 78, 28, 6);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`LVL  ${g.difficultyLevel}`, 22, 26);

      // 20-second countdown bar (below level badge)
      const barW = 78;
      const framesLeft = g.nextLevelFrame - g.frame;
      const barFill = 1 - framesLeft / LEVEL_UP_EVERY;
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.roundRect(14, 44, barW, 6, 3);
      ctx.fill();
      ctx.fillStyle = lvlColor;
      ctx.roundRect(14, 44, Math.max(4, barW * barFill), 6, 3);
      ctx.fill();

      // "LEVEL UP!" flash
      if (g.levelUpFlash > 0) {
        const alpha = Math.min(1, g.levelUpFlash / 30);
        const scale = 1 + (1 - alpha) * 0.4;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(W / 2, H / 2 - 40);
        ctx.scale(scale, scale);
        ctx.font = "bold 36px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#00e5a0";
        ctx.fillText(`LEVEL ${g.difficultyLevel}!`, 0, 0);
        ctx.restore();
        ctx.globalAlpha = 1;
      }

      setScore(Math.floor(g.score));
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [gameState, spawnParticles, classId]);

  // Draw idle/dead screen
  useEffect(() => {
    if (gameState !== "idle" && gameState !== "dead") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    drawBackground(ctx, 0);
    drawGround(ctx, 0);
    drawMiner(ctx, MINER_X, GROUND_Y, 0, gameState === "dead");

    // Overlay
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, W, H);

    if (gameState === "idle") {
      // Title
      ctx.fillStyle = "#f59e0b";
      ctx.font = "bold 36px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("⛏  MINER RUNNER  ₿", W / 2, H / 2 - 50);

      ctx.fillStyle = "#fde68a";
      ctx.font = "18px monospace";
      ctx.fillText("Jump over the BTC coins!", W / 2, H / 2 - 10);

      ctx.fillStyle = "#fff";
      ctx.font = "14px monospace";
      ctx.fillText("SPACE / ↑ / TAP to jump  •  Double jump allowed", W / 2, H / 2 + 25);

      // Start button hint
      ctx.fillStyle = "#f59e0b";
      ctx.roundRect(W / 2 - 90, H / 2 + 55, 180, 44, 10);
      ctx.fill();
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 18px monospace";
      ctx.fillText("PLAY", W / 2, H / 2 + 77);
    } else {
      // Game Over
      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 40px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("GAME OVER", W / 2, H / 2 - 55);

      ctx.fillStyle = "#f59e0b";
      ctx.font = "bold 22px monospace";
      ctx.fillText(`Score: ${score.toString().padStart(6, "0")}`, W / 2, H / 2 - 15);

      ctx.fillStyle = "#fde68a";
      ctx.font = "16px monospace";
      ctx.fillText(`Best:  ${highScore.toString().padStart(6, "0")}`, W / 2, H / 2 + 18);

      if (score >= highScore && score > 0) {
        ctx.fillStyle = "#4ade80";
        ctx.font = "bold 15px monospace";
        ctx.fillText("🏆  New High Score!", W / 2, H / 2 + 44);
      }

      ctx.fillStyle = "#f59e0b";
      ctx.roundRect(W / 2 - 100, H / 2 + 60, 200, 44, 10);
      ctx.fill();
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 18px monospace";
      ctx.fillText("PLAY AGAIN", W / 2, H / 2 + 82);
    }
  }, [gameState, score, highScore]);

  return (
    <div style={{ minHeight: '100vh', background: "var(--bg)" }}>
      <Nav />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 16px' }}>
        {/* Header */}
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)" }}>
              ⛏ Miner Runner
            </h1>
            <p style={{ fontSize: 14, marginTop: 4, color: "var(--muted)" }}>
              Dodge the BTC coins — double jump to survive!
            </p>
          </div>
          <Link
            href="/dashboard"
            style={{ fontSize: 14, padding: '8px 16px', borderRadius: 8, fontWeight: 500, transition: 'color .2s', background: "var(--surface)", color: "var(--muted)" }}
          >
            ← Dashboard
          </Link>
        </div>

        {/* Score bar */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <div style={{ flex: 1, borderRadius: 12, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: "var(--surface)" }}>
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: "var(--muted)" }}>Score</span>
            <span style={{ fontSize: 20, fontWeight: 700, fontFamily: 'monospace', color: "var(--text)" }}>
              {score.toString().padStart(6, "0")}
            </span>
          </div>
          <div style={{ flex: 1, borderRadius: 12, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: "var(--surface)" }}>
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: "var(--muted)" }}>Best</span>
            <span style={{ fontSize: 20, fontWeight: 700, fontFamily: 'monospace', color: "#f59e0b" }}>
              {highScore.toString().padStart(6, "0")}
            </span>
          </div>
          {gameState === 'running' && (
            <div style={{ flex: 1, borderRadius: 12, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: "var(--surface)" }}>
              <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: "var(--muted)" }}>Level</span>
              <span style={{ fontSize: 20, fontWeight: 700, fontFamily: 'monospace', color: "#00e5a0" }}>
                {gameRef.current?.difficultyLevel ?? 1}
              </span>
            </div>
          )}
        </div>

        {/* Reward banner — shown after death */}
        {gameState === 'dead' && reward && (
          <div style={{ marginBottom: 16, background: 'rgba(0,229,160,.08)', border: '1px solid rgba(0,229,160,.3)', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 24 }}>⛏</span>
            <div style={{ flex: 1 }}>
              {reward.tokensAwarded > 0 && (
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, color: '#00e5a0' }}>
                  +{reward.tokensAwarded} tokens earned
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400, marginLeft: 8 }}>Reached Level {levelReached}</span>
                </div>
              )}
              {reward.newBadges?.length > 0 && (
                <div style={{ fontSize: 12, color: '#f59e0b', marginTop: 2 }}>
                  🏅 New badge{reward.newBadges.length > 1 ? 's' : ''}: {reward.newBadges.map(b => b.replace('miner_', '').replace(/_/g, ' ')).join(', ')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Canvas */}
        <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,.5)', display: 'flex', justifyContent: 'center', border: '2px solid var(--border, #1e293b)' }}>
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            onClick={handleCanvasClick}
            style={{ imageRendering: "pixelated", width: "100%", maxWidth: W, aspectRatio: `${W} / ${H}`, height: "auto", cursor: 'pointer', display: 'block' }}
          />
        </div>

        {/* Controls hint */}
        <p style={{ textAlign: 'center', fontSize: 12, marginTop: 12, color: "var(--muted)" }}>
          Press <kbd style={{ padding: '2px 6px', borderRadius: 4, fontSize: 12, fontFamily: 'monospace', background: "var(--surface)" }}>Space</kbd> or{" "}
          <kbd style={{ padding: '2px 6px', borderRadius: 4, fontSize: 12, fontFamily: 'monospace', background: "var(--surface)" }}>↑</kbd> to jump &nbsp;·&nbsp; tap/click the canvas on mobile
        </p>
      </div>
    </div>
  );
}
