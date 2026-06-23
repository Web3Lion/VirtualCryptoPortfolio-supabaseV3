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
const SPEED_INCREMENT = 0.0008;

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

  useEffect(() => {
    applyTheme(getTheme());
    const stored = parseInt(localStorage.getItem("miner_runner_hs") || "0");
    setHighScore(stored);
  }, []);

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

      // Spawn coins
      g.nextCoinIn--;
      if (g.nextCoinIn <= 0) {
        // Sometimes spawn 2 coins stacked or side by side
        const pattern = Math.random();
        if (pattern < 0.15 && g.score > 300) {
          // Double coin (jump over both)
          g.coins.push({ x: W + 20, y: GROUND_Y + MINER_H - COIN_H, frame: 0 });
          g.coins.push({ x: W + 20 + COIN_W + 10, y: GROUND_Y + MINER_H - COIN_H, frame: 0 });
        } else if (pattern < 0.3 && g.score > 500) {
          // Stacked coin (need to jump higher)
          g.coins.push({ x: W + 20, y: GROUND_Y + MINER_H - COIN_H, frame: 0 });
          g.coins.push({ x: W + 20, y: GROUND_Y + MINER_H - COIN_H * 2 - 8, frame: 0 });
        } else {
          g.coins.push({ x: W + 20, y: GROUND_Y + MINER_H - COIN_H, frame: 0 });
        }
        const minGap = Math.max(40, 100 - g.score * 0.05);
        g.nextCoinIn = minGap + Math.random() * 80;
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
          setScore(finalScore);
          setHighScore(prev => {
            const next = Math.max(prev, finalScore);
            localStorage.setItem("miner_runner_hs", String(next));
            return next;
          });
          setGameState("dead");
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

      // Score HUD
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.roundRect(W - 180, 12, 165, 38, 8);
      ctx.fill();
      ctx.fillStyle = "#f59e0b";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "right";
      ctx.textBaseline = "top";
      ctx.fillText(`SCORE  ${Math.floor(g.score).toString().padStart(6, "0")}`, W - 20, 20);

      // Speed badge
      if (g.speed > INITIAL_SPEED + 2) {
        const lvl = Math.floor((g.speed - INITIAL_SPEED) / 2);
        ctx.fillStyle = "rgba(239,68,68,0.85)";
        ctx.roundRect(W - 180, 56, 80, 24, 6);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px monospace";
        ctx.fillText(`LVL ${lvl}`, W - 110, 60);
      }

      setScore(Math.floor(g.score));
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [gameState, spawnParticles]);

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
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <Nav />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              ⛏ Miner Runner
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              Dodge the BTC coins — double jump to survive!
            </p>
          </div>
          <Link
            href="/games"
            className="text-sm px-4 py-2 rounded-lg font-medium transition-colors"
            style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}
          >
            ← Games
          </Link>
        </div>

        {/* Score bar */}
        <div className="flex gap-4 mb-4">
          <div
            className="flex-1 rounded-xl px-5 py-3 flex items-center justify-between"
            style={{ background: "var(--bg-secondary)" }}
          >
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Score</span>
            <span className="text-xl font-bold font-mono" style={{ color: "var(--text-primary)" }}>
              {score.toString().padStart(6, "0")}
            </span>
          </div>
          <div
            className="flex-1 rounded-xl px-5 py-3 flex items-center justify-between"
            style={{ background: "var(--bg-secondary)" }}
          >
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Best</span>
            <span className="text-xl font-bold font-mono" style={{ color: "#f59e0b" }}>
              {highScore.toString().padStart(6, "0")}
            </span>
          </div>
        </div>

        {/* Canvas */}
        <div className="relative rounded-2xl overflow-hidden shadow-2xl flex justify-center" style={{ border: "2px solid var(--border-color)" }}>
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            onClick={handleCanvasClick}
            className="cursor-pointer block"
            style={{ imageRendering: "pixelated", width: "100%", maxWidth: W, aspectRatio: `${W} / ${H}`, height: "auto" }}
          />
        </div>

        {/* Controls hint */}
        <p className="text-center text-xs mt-3" style={{ color: "var(--text-secondary)" }}>
          Press <kbd className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: "var(--bg-secondary)" }}>Space</kbd> or{" "}
          <kbd className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: "var(--bg-secondary)" }}>↑</kbd> to jump &nbsp;·&nbsp; tap/click the canvas on mobile
        </p>
      </div>
    </div>
  );
}
