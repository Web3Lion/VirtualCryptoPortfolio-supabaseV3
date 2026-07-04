"use client";
import { useEffect } from "react";
import Nav from "@/components/Nav";
import CoinLogo from "@/components/CoinLogo";
import { applyTheme, getTheme } from "@/lib/theme";

// ─────────────────────────────────────────────────────────
// DESIGN SANDBOX — mock data only, does not touch the real dashboard
// or any API. Purely for visually comparing a hierarchy/depth-first
// redesign against the current flat-card layout before committing.
// ─────────────────────────────────────────────────────────

const HOLDINGS = [
  { ticker: "BTC",  qty: 0.842,   avgBuy: 58200,  price: 67340, value: 56698.28 },
  { ticker: "ETH",  qty: 6.15,    avgBuy: 3120,   price: 3480,  value: 21402.00 },
  { ticker: "SOL",  qty: 142,     avgBuy: 118,    price: 96,    value: 13632.00 },
  { ticker: "ADA",  qty: 8200,    avgBuy: 0.42,   price: 0.51,  value: 4182.00  },
  { ticker: "DOGE", qty: 21000,   avgBuy: 0.11,   price: 0.087, value: 1827.00  },
];

function fmtUSD(n) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}
function fmtPrice(n) {
  const digits = n < 1 ? 4 : n < 100 ? 2 : 0;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: digits }).format(n);
}

export default function DashboardSandbox() {
  useEffect(() => { applyTheme(getTheme()); }, []);

  const SEED_MONEY = 90000;
  const cash = 8340.12;
  const holdingsVal = HOLDINGS.reduce((s, h) => s + h.value, 0);
  const totalVal = cash + holdingsVal;
  const pl = totalVal - SEED_MONEY;
  const returnPct = (pl / SEED_MONEY) * 100;
  const isProfitable = pl >= 0;

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px 60px" }}>
      <Nav />

      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "10px 16px",
        background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.3)",
        borderRadius: 12, marginBottom: 20, fontSize: 12, color: "var(--gold)",
      }}>
        🧪 <strong>Design sandbox</strong> — mock data, not connected to your real portfolio. For visual comparison only.
      </div>

      {/* ── Redesigned hero ── */}
      <div style={{
        position: "relative", borderRadius: 28, padding: "36px 32px", marginBottom: 20,
        overflow: "hidden", border: "1px solid var(--border)",
        background: `radial-gradient(circle at 15% 0%, ${isProfitable ? "rgba(0,229,160,.16)" : "rgba(244,63,94,.14)"}, transparent 55%), var(--surface)`,
      }}>
        <div style={{
          position: "absolute", top: -80, right: -80, width: 260, height: 260, borderRadius: "50%",
          background: isProfitable ? "rgba(0,229,160,.10)" : "rgba(244,63,94,.10)", filter: "blur(10px)",
        }} />
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--muted)", marginBottom: 10 }}>
            Total Portfolio Value
          </div>
          <div style={{
            fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 56, letterSpacing: -1.5, lineHeight: 1,
            color: "var(--text)", marginBottom: 14,
          }}>
            {fmtUSD(totalVal)}
          </div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600,
            padding: "5px 12px", borderRadius: 999,
            color: isProfitable ? "var(--up)" : "var(--down)",
            background: isProfitable ? "rgba(0,229,160,.14)" : "rgba(244,63,94,.12)",
            marginBottom: 28,
          }}>
            <span>{isProfitable ? "▲" : "▼"}</span>
            <span>{isProfitable ? "+" : ""}{fmtUSD(pl)} ({returnPct >= 0 ? "+" : ""}{returnPct.toFixed(2)}%)</span>
          </div>

          {/* Quiet inline stat strip instead of a grid of equal-weight boxes */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0 28px", borderTop: "1px solid var(--border)", paddingTop: 18 }}>
            {[
              ["Cash", fmtUSD(cash)],
              ["Holdings", fmtUSD(holdingsVal)],
              ["Return", `${returnPct >= 0 ? "+" : ""}${returnPct.toFixed(2)}%`],
              ["Fees Paid", fmtUSD(142.30)],
            ].map(([label, value]) => (
              <div key={label} style={{ minWidth: 90 }}>
                <div style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: "var(--muted)", marginBottom: 3 }}>{label}</div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, color: "var(--text)" }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Redesigned holdings list ── */}
      <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, marginBottom: 12, color: "var(--text)" }}>
        Holdings
      </div>

      {HOLDINGS.map((h, i) => {
        const plPct = ((h.price - h.avgBuy) / h.avgBuy) * 100;
        const up = plPct >= 0;
        return (
          <div key={h.ticker} style={{
            display: "grid", gridTemplateColumns: "28px 44px 1fr auto auto", alignItems: "center", gap: 14,
            background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16,
            padding: "13px 18px", marginBottom: 8, transition: "border-color .15s",
          }}>
            <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{i + 1}</div>
            <div style={{
              width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 0 2px ${up ? "rgba(0,229,160,.35)" : "rgba(244,63,94,.3)"}`,
            }}>
              <CoinLogo symbol={h.ticker} size={30} />
            </div>
            <div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{h.ticker}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{fmtPrice(h.price)} · {h.qty.toLocaleString()} units</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{fmtUSD(h.value)}</div>
              <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>avg {fmtPrice(h.avgBuy)}</div>
            </div>
            <div style={{
              fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 8,
              color: up ? "var(--up)" : "var(--down)",
              background: up ? "rgba(0,229,160,.12)" : "rgba(244,63,94,.1)",
            }}>
              {up ? "▲" : "▼"} {Math.abs(plPct).toFixed(1)}%
            </div>
          </div>
        );
      })}

      {/* ── What changed, for review ── */}
      <div style={{
        marginTop: 32, padding: 20, borderRadius: 16, background: "var(--surface2)", border: "1px solid var(--border)",
        fontSize: 12.5, color: "var(--muted)", lineHeight: 1.8,
      }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13, color: "var(--text)", marginBottom: 8 }}>
          What's different from the real dashboard
        </div>
        <div>1. <strong style={{ color: "var(--text)" }}>Hero has depth</strong> — a soft radial glow (green/red depending on P/L) and a corner blur instead of a flat surface, so it visually recedes/advances less like every other box.</div>
        <div>2. <strong style={{ color: "var(--text)" }}>One real focal point</strong> — the portfolio number jumps from 40px to 56px and the four stats collapse from boxed tiles into a quiet inline strip below a divider, so they read as supporting detail, not competing headlines.</div>
        <div>3. <strong style={{ color: "var(--text)" }}>Holdings get identity</strong> — a colored glow ring around each coin icon (green/red by position) plus a rank number, instead of a neutral bordered box that looks identical whether the position is up 40% or down 40%.</div>
      </div>
    </main>
  );
}
