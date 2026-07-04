"use client";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { applyTheme, getTheme } from "@/lib/theme";

// ─────────────────────────────────────────────────────────
// DESIGN SANDBOX — mock data only, isolated from the real /learn
// page. Compares the current flat, identical module cards against
// a version where each module gets a fixed-order accent color, so
// the list is scannable by subject at a glance instead of reading
// as one long wall of same-looking boxes.
// ─────────────────────────────────────────────────────────

// Fixed order — same idea as a categorical chart palette: assigned by
// position, never re-picked per render, so a module's color is stable.
const ACCENTS = ["#00e5a0", "#3b82f6", "#a78bfa", "#f59e0b", "#06b6d4", "#f43f5e"];

const MODULES = [
  { emoji: "⛓️", title: "Blockchain Deep Dives", lessons: 9, done: 9 },
  { emoji: "🏦", title: "DeFi Deep Dive", lessons: 8, done: 5 },
  { emoji: "🖼️", title: "NFTs & Digital Ownership", lessons: 8, done: 0 },
  { emoji: "🕯️", title: "Technical Analysis & Chart Patterns", lessons: 8, done: 3 },
  { emoji: "🔐", title: "Crypto Security & Self-Custody", lessons: 8, done: 0 },
  { emoji: "💸", title: "Crypto & Taxes", lessons: 8, done: 0 },
];

function CurrentCard({ mod }) {
  const isComplete = mod.done === mod.lessons;
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, marginBottom: 10, padding: "20px 24px", display: "flex", alignItems: "center", gap: 14 }}>
      <span style={{ fontSize: 26 }}>{mod.emoji}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, color: "var(--text)" }}>{mod.title}</div>
      </div>
      <span style={{
        fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20,
        background: isComplete ? "rgba(0,229,160,.15)" : "var(--surface2)",
        color: isComplete ? "#00e5a0" : "var(--muted)",
      }}>
        {isComplete ? "✓ Complete" : `${mod.done}/${mod.lessons}`}
      </span>
    </div>
  );
}

function ProposedCard({ mod, color }) {
  const isComplete = mod.done === mod.lessons;
  return (
    <div style={{
      position: "relative", background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 20, marginBottom: 10, padding: "20px 24px 20px 26px", display: "flex", alignItems: "center", gap: 14,
      overflow: "hidden",
    }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: color }} />
      <div style={{
        width: 44, height: 44, borderRadius: 14, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, background: `${color}1c`, boxShadow: `0 0 0 1px ${color}40`,
      }}>
        {mod.emoji}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, color: "var(--text)" }}>{mod.title}</div>
        <div style={{ display: "flex", gap: 3, marginTop: 6 }}>
          {Array.from({ length: mod.lessons }).map((_, i) => (
            <div key={i} style={{
              width: 14, height: 4, borderRadius: 2,
              background: i < mod.done ? color : "var(--border)",
            }} />
          ))}
        </div>
      </div>
      <span style={{
        fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20,
        background: isComplete ? `${color}22` : "var(--surface2)",
        color: isComplete ? color : "var(--muted)",
      }}>
        {isComplete ? "✓ Complete" : `${mod.done}/${mod.lessons}`}
      </span>
    </div>
  );
}

export default function LearnSandbox() {
  useEffect(() => { applyTheme(getTheme()); }, []);

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px 60px" }}>
      <Nav />

      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "10px 16px",
        background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.3)",
        borderRadius: 12, marginBottom: 20, fontSize: 12, color: "var(--gold)",
      }}>
        🧪 <strong>Design sandbox</strong> — mock modules, not connected to your real course content or progress.
      </div>

      <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13, marginBottom: 8, color: "var(--muted)" }}>
        CURRENT — every module looks identical regardless of subject
      </div>
      {MODULES.map(mod => <CurrentCard key={mod.title} mod={mod} />)}

      <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13, margin: "28px 0 8px", color: "var(--text)" }}>
        PROPOSED — fixed-order accent color per module, progress as a bar not dots
      </div>
      {MODULES.map((mod, i) => <ProposedCard key={mod.title} mod={mod} color={ACCENTS[i % ACCENTS.length]} />)}

      <div style={{
        marginTop: 18, padding: 20, borderRadius: 16, background: "var(--surface2)", border: "1px solid var(--border)",
        fontSize: 12.5, color: "var(--muted)", lineHeight: 1.8,
      }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13, color: "var(--text)", marginBottom: 8 }}>
          What's different
        </div>
        <div>Each module is assigned a color <strong style={{ color: "var(--text)" }}>by fixed position</strong> (same idea as a categorical chart palette — never re-picked per render, so "DeFi" is always blue, not a random color each visit). That color shows up as a left accent bar, a tinted icon badge instead of a plain emoji floating in whitespace, and the progress indicator switches from a row of small dots to a single bar so the eye reads "how far along" as one shape instead of counting pips.</div>
      </div>
    </main>
  );
}
