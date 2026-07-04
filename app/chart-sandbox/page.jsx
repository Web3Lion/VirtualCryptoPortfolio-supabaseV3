"use client";
import { useEffect, useRef } from "react";
import Nav from "@/components/Nav";
import { applyTheme, getTheme } from "@/lib/theme";

// ─────────────────────────────────────────────────────────
// DESIGN SANDBOX — mock data only. Compares the current flat
// chart-card treatment against a depth-matched version (same
// glow language as the redesigned dashboard hero) plus recessive
// gridlines and a glowing "current value" marker.
// ─────────────────────────────────────────────────────────

// Mock 30-day portfolio value series, gently trending up with noise
const DATA = (() => {
  let v = 90000;
  const out = [];
  for (let i = 0; i < 30; i++) {
    v += (Math.random() - 0.35) * 2200;
    out.push({ t: `Day ${i + 1}`, v: Math.round(v) });
  }
  return out;
})();

function drawChart(canvas, data, { grid, glow }) {
  const ctx = canvas.getContext("2d");
  const W = canvas.offsetWidth || 600, H = 220;
  canvas.width = W; canvas.height = H;
  ctx.clearRect(0, 0, W, H);

  const vals = data.map(d => d.v);
  const mn = Math.min(...vals), mx = Math.max(...vals), rng = mx - mn || 1;
  const pad = { t: 16, b: 24, l: 8, r: 8 };
  const iW = W - pad.l - pad.r, iH = H - pad.t - pad.b;
  const xS = (i) => pad.l + (i / (data.length - 1)) * iW;
  const yS = (v) => pad.t + iH - ((v - mn) / rng) * iH;

  if (grid) {
    ctx.strokeStyle = "rgba(148,163,184,.12)";
    ctx.lineWidth = 1;
    [0.25, 0.5, 0.75].forEach(f => {
      const y = pad.t + iH * f;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
    });
  }

  const g = ctx.createLinearGradient(0, pad.t, 0, H - pad.b);
  g.addColorStop(0, "rgba(0,229,160,.22)");
  g.addColorStop(1, "rgba(0,229,160,0)");
  ctx.beginPath();
  data.forEach((d, i) => i === 0 ? ctx.moveTo(xS(i), yS(d.v)) : ctx.lineTo(xS(i), yS(d.v)));
  ctx.lineTo(xS(data.length - 1), H - pad.b);
  ctx.lineTo(xS(0), H - pad.b);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();

  ctx.beginPath();
  data.forEach((d, i) => i === 0 ? ctx.moveTo(xS(i), yS(d.v)) : ctx.lineTo(xS(i), yS(d.v)));
  ctx.strokeStyle = "#00e5a0";
  ctx.lineWidth = glow ? 2.5 : 2;
  if (glow) { ctx.shadowColor = "rgba(0,229,160,.6)"; ctx.shadowBlur = 8; }
  ctx.stroke();
  ctx.shadowBlur = 0;

  if (glow) {
    const lastX = xS(data.length - 1), lastY = yS(data[data.length - 1].v);
    const pulse = ctx.createRadialGradient(lastX, lastY, 0, lastX, lastY, 10);
    pulse.addColorStop(0, "rgba(0,229,160,.9)");
    pulse.addColorStop(1, "rgba(0,229,160,0)");
    ctx.beginPath(); ctx.arc(lastX, lastY, 10, 0, Math.PI * 2); ctx.fillStyle = pulse; ctx.fill();
    ctx.beginPath(); ctx.arc(lastX, lastY, 3, 0, Math.PI * 2); ctx.fillStyle = "#00e5a0"; ctx.fill();
  }
}

function Chart({ grid, glow }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) drawChart(ref.current, DATA, { grid, glow }); }, [grid, glow]);
  return <canvas ref={ref} style={{ width: "100%", height: 220, display: "block" }} />;
}

export default function ChartSandbox() {
  useEffect(() => { applyTheme(getTheme()); }, []);

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px 60px" }}>
      <Nav />

      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "10px 16px",
        background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.3)",
        borderRadius: 12, marginBottom: 20, fontSize: 12, color: "var(--gold)",
      }}>
        🧪 <strong>Design sandbox</strong> — mock data, not connected to your real portfolio history.
      </div>

      <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13, marginBottom: 8, color: "var(--muted)" }}>
        CURRENT — flat chart-card
      </div>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: 22, marginBottom: 28 }}>
        <Chart grid={false} glow={false} />
      </div>

      <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13, marginBottom: 8, color: "var(--text)" }}>
        PROPOSED — depth-matched to the hero, recessive gridlines, glowing current-value marker
      </div>
      <div style={{
        position: "relative", overflow: "hidden", borderRadius: 20, padding: 22, marginBottom: 28,
        border: "1px solid var(--border)",
        background: "radial-gradient(circle at 90% 0%, rgba(0,229,160,.10), transparent 60%), var(--surface)",
      }}>
        <Chart grid glow />
      </div>

      <div style={{
        padding: 20, borderRadius: 16, background: "var(--surface2)", border: "1px solid var(--border)",
        fontSize: 12.5, color: "var(--muted)", lineHeight: 1.8,
      }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13, color: "var(--text)", marginBottom: 8 }}>
          What's different
        </div>
        <div>The area-fill gradient under the line already existed in the real chart — that part's untouched. What's new: <strong style={{ color: "var(--text)" }}>three faint horizontal gridlines</strong> (25/50/75%) so you can actually gauge magnitude at a glance instead of eyeballing it; a <strong style={{ color: "var(--text)" }}>soft glow on the line itself</strong> and a <strong style={{ color: "var(--text)" }}>pulsing dot at the current value</strong>, so the chart ends on something alive instead of just stopping; and the <strong style={{ color: "var(--text)" }}>card background</strong> picks up the same subtle radial glow language as the hero, instead of being the one flat surface left on the page.</div>
      </div>
    </main>
  );
}
