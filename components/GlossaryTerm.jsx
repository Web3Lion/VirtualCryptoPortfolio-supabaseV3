"use client";
import { useState, useRef, useEffect } from "react";

export const GLOSSARY = {
  // ── Trading basics ──────────────────────────────────────────────
  "P/L":             "Profit & Loss — the dollar gain or loss on a position. Positive means you made money; negative means you lost it.",
  "P&L":             "Profit & Loss — the dollar gain or loss on a position. Positive means you made money; negative means you lost it.",
  "Return":          "The percentage gain or loss on an investment, relative to how much you started with. A +10% return on $1,000 = +$100.",
  "Portfolio":       "The full collection of all your investments — cash, coins, and any other assets you hold.",
  "Holdings":        "The specific coins or assets you currently own. Your portfolio minus cash.",
  "Cash":            "The portion of your portfolio not invested in any coin — ready to deploy whenever you want to buy.",
  "Seed Money":      "The starting cash your teacher gave you to begin trading. Usually $10,000.",
  "Market Cap":      "Market Capitalization — the total value of all coins in circulation. Price × total supply. Bigger = more established.",
  "Volume":          "The total dollar value of a coin traded in a given period (usually 24h). High volume = lots of trading activity.",
  "24h Change":      "How much a coin's price moved up or down over the last 24 hours, shown as a percentage.",
  "Fee":             "A small transaction cost charged when you buy or sell. Represents broker/exchange costs in a real market.",
  "Liquidity":       "How easily an asset can be bought or sold without moving the price. Bitcoin is highly liquid; obscure coins are not.",
  "Diversification": "Spreading investments across multiple assets to reduce risk. 'Don't put all your eggs in one basket.'",
  "Buy":             "Purchasing a coin expecting its price to rise. You profit if the price goes up after you buy.",
  "Sell":            "Closing a position by exchanging your coin back to cash. You lock in any profit or loss at this point.",

  // ── Order types ─────────────────────────────────────────────────
  "Limit Order":     "An order to buy or sell at a specific price (or better). It won't fill until the market reaches your target price.",
  "Market Order":    "An order that executes immediately at the current market price. Fast, but you get whatever price is available.",
  "Stop Loss":       "An automatic sell order triggered when a price falls to a set level — used to limit losses on a position.",
  "DCA":             "Dollar-Cost Averaging — investing a fixed dollar amount on a regular schedule regardless of price. Reduces the impact of volatility over time.",

  // ── Short selling ────────────────────────────────────────────────
  "Short":           "Borrowing a coin and selling it, hoping to buy it back cheaper later. You profit if the price goes DOWN.",
  "Short Selling":   "Borrowing a coin and selling it, hoping to buy it back cheaper later. You profit if the price goes DOWN.",
  "Short Position":  "An active bet that a coin's price will fall. You borrowed and sold the coin; you owe it back at the buyback price.",
  "Cover":           "Buying back a coin you previously shorted to close the position. 'Covering your short.'",
  "Long":            "A standard buy-and-hold position. You own the coin and profit if the price goes UP.",

  // ── Leverage / Margin ────────────────────────────────────────────
  "Margin":          "Borrowed money used to increase the size of your trade. 2× margin means you're trading with twice your cash — amplifies both gains AND losses.",
  "Leverage":        "Using borrowed capital to multiply your position size. 2× leverage on a $500 trade means you control $1,000 worth of crypto.",
  "Leveraged":       "A position opened using borrowed funds. Higher potential returns, but losses are also magnified.",
  "Margin Borrowed": "The dollar amount you borrowed from the platform to fund a leveraged trade. Must be repaid when the position closes.",
  "Liquidation":     "When losses on a leveraged position reach the borrowed amount, the position is automatically closed to prevent further loss.",

  // ── Options ─────────────────────────────────────────────────────
  "Call":            "A Call option gives you the RIGHT to BUY a coin at the strike price before expiry. Profitable if the price rises above the strike.",
  "Put":             "A Put option gives you the RIGHT to SELL a coin at the strike price before expiry. Profitable if the price falls below the strike.",
  "Strike Price":    "The locked-in price at which an option can be exercised. For a Call: you profit if market price > strike. For a Put: market price < strike.",
  "Expiry":          "The date an option contract expires. After expiry, the option is worthless if it hasn't been exercised.",
  "Premium":         "The cost to buy an options contract. It's what you pay upfront for the right (but not obligation) to buy/sell at the strike price.",
  "In the Money":    "When an option has intrinsic value — i.e., exercising it right now would be profitable.",
  "Out of the Money":"When an option has no intrinsic value — exercising it would not be profitable at the current price.",
  "ATM":             "At-The-Money — when the strike price equals (or is very close to) the current market price.",

  // ── Staking / Yield ─────────────────────────────────────────────
  "Staking":         "Locking up a coin to support a blockchain network in exchange for a reward, similar to earning interest in a savings account.",
  "APY":             "Annual Percentage Yield — the yearly return on a staked or invested asset, accounting for compounding. Higher = more earnings.",
  "Yield":           "The income generated by an investment over time, usually expressed as a percentage per year.",
  "Claimable":       "Staking rewards that have been earned and are ready to be withdrawn to your portfolio.",

  // ── Analytics / Risk ────────────────────────────────────────────
  "Volatility":      "How much a coin's price swings up and down. High volatility = big moves in either direction. Measured as annualized standard deviation.",
  "Sharpe Ratio":    "A measure of return per unit of risk. Higher = better risk-adjusted performance. Above 1.0 is generally considered good.",
  "Beta":            "How much your portfolio moves relative to Bitcoin. Beta > 1 means more volatile than BTC; Beta < 1 means more stable.",
  "Max Drawdown":    "The largest peak-to-trough drop in your portfolio's value. Measures the worst loss you experienced before recovering.",
  "Win Rate":        "The percentage of your trades that closed at a profit. 60% win rate means 6 out of every 10 trades were profitable.",
  "Alpha":           "The return your portfolio earned above a benchmark (usually Bitcoin). Positive alpha = you outperformed the market.",

  // ── Tokens / Rewards ────────────────────────────────────────────
  "Tokens":          "ClassReward tokens earned through trading activities, badges, lessons, and games. Each token = $1 real-world credit to redeem in the store.",
  "Badge":           "An achievement unlocked by reaching certain milestones — like your first trade, a big win, or a learning streak.",
  "Streak":          "The number of consecutive days you've logged into the app. Lose a day = streak resets (unless you have a streak freeze).",
  "Streak Freeze":   "A shield that protects your login streak for one missed day. Win it from the daily spin wheel.",
};

export default function GlossaryTerm({ term, children, placement = "above" }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);
  const definition = GLOSSARY[term] || GLOSSARY[children];

  useEffect(() => {
    if (!visible) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setVisible(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [visible]);

  if (!definition) return <>{children || term}</>;

  const tipStyle = {
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
    background: "var(--surface,#0f172a)",
    border: "1px solid var(--border,#1e293b)",
    borderRadius: 10,
    padding: "9px 13px",
    fontSize: 11,
    lineHeight: 1.55,
    color: "var(--text,#e2e8f0)",
    width: 230,
    zIndex: 9999,
    boxShadow: "0 8px 24px rgba(0,0,0,.5)",
    pointerEvents: "none",
    textAlign: "left",
    fontWeight: 400,
    fontFamily: "inherit",
    whiteSpace: "normal",
    ...(placement === "above"
      ? { bottom: "calc(100% + 7px)" }
      : { top: "calc(100% + 7px)" }),
  };

  return (
    <span ref={ref} style={{ position: "relative", display: "inline" }}>
      <span
        style={{
          borderBottom: "1px dotted var(--accent,#00e5a0)",
          cursor: "help",
          color: "inherit",
        }}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onClick={(e) => { e.stopPropagation(); setVisible((v) => !v); }}
      >
        {children || term}
      </span>
      {visible && (
        <span style={tipStyle}>
          <span style={{ display: "block", fontWeight: 700, marginBottom: 4, color: "var(--accent,#00e5a0)", fontSize: 11 }}>
            {term}
          </span>
          {definition}
        </span>
      )}
    </span>
  );
}
