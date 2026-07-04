"use client";
import { useState } from "react";

export const SOURCE_COLORS = {
  CoinDesk: "#f7931a",
  CoinTelegraph: "#2b6cb0",
  Decrypt: "#805ad5",
  Investopedia: "#1a73e8",
  Coinbase: "#0052ff",
  "Bitcoin.com": "#f59e0b",
  CryptoNews: "#e53e3e",
  "The Block": "#2d3748",
  Manual: "#00a651",
};

// Best-effort source name from a URL's domain, for links that don't
// carry an explicit `source` field (e.g. curated article blocks).
export function sourceFromUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.includes("coindesk")) return "CoinDesk";
    if (host.includes("cointelegraph")) return "CoinTelegraph";
    if (host.includes("decrypt")) return "Decrypt";
    if (host.includes("investopedia")) return "Investopedia";
    if (host.includes("coinbase")) return "Coinbase";
    if (host.includes("bitcoin.com")) return "Bitcoin.com";
    if (host.includes("theblock")) return "The Block";
    return host.split(".")[0].replace(/^\w/, c => c.toUpperCase());
  } catch {
    return "Article";
  }
}

export default function ArticleThumbnail({ imageUrl, source, height = 150 }) {
  const [imgFailed, setImgFailed] = useState(false);
  const color = SOURCE_COLORS[source] || "#00a651";
  const initial = (source || "A")[0].toUpperCase();
  const pts = [[0,72],[20,58],[40,65],[60,40],[80,48],[100,28],[120,36],[140,16],[160,10]];
  const linePath = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const fillPath = `${linePath} L160,80 L0,80 Z`;
  const gradId = `at-${initial}-${color.slice(1)}`;

  if (imageUrl && !imgFailed) {
    return (
      <div style={{ width: "100%", height, overflow: "hidden", flexShrink: 0 }}>
        <img src={imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onError={() => setImgFailed(true)} />
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height, background: "linear-gradient(160deg,#0a0f1a,#0f172a)", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: .07 }} preserveAspectRatio="xMidYMid slice">
        {[25, 50, 75].map(p => <line key={`h${p}`} x1="0" y1={`${p}%`} x2="100%" y2={`${p}%`} stroke="#94a3b8" strokeWidth="1" />)}
        {[20, 40, 60, 80].map(p => <line key={`v${p}`} x1={`${p}%`} y1="0" x2={`${p}%`} y2="100%" stroke="#94a3b8" strokeWidth="1" />)}
      </svg>
      <svg viewBox="0 0 160 80" preserveAspectRatio="none" style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "60%", opacity: .55 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity=".35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fillPath} fill={`url(#${gradId})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div style={{ position: "relative", zIndex: 1, width: 50, height: 50, borderRadius: "50%", background: `${color}18`, border: `2px solid ${color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22, color }}>
        {initial}
      </div>
      <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, textAlign: "center", fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: `${color}70`, fontFamily: "'DM Mono',monospace" }}>
        {source || "Article"}
      </div>
    </div>
  );
}
