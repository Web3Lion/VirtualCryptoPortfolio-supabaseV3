// Coins with real-world staking capability and their simulated parameters.
// Coins on Proof-of-Work (BTC, LTC, DOGE, BCH etc.) are intentionally excluded.
export const STAKEABLE_COINS = {
  // ── Flexible (no lock) ──────────────────────────────────────────────────
  ETH:  { name: 'Ethereum',      emoji: '🔷', lockDays: 0,  apy: 0.040, tier: 'flexible', note: 'Proof of Stake since The Merge (2022)' },
  ADA:  { name: 'Cardano',       emoji: '🔵', lockDays: 0,  apy: 0.040, tier: 'flexible', note: 'Delegation-based staking, no hard lock' },
  ALGO: { name: 'Algorand',      emoji: '⬛', lockDays: 0,  apy: 0.050, tier: 'flexible', note: 'Pure PoS — instant participation, no minimum' },
  LINK: { name: 'Chainlink',     emoji: '🔗', lockDays: 0,  apy: 0.045, tier: 'flexible', note: 'Oracle staking v0.2 — no unbonding period' },
  HBAR: { name: 'Hedera',        emoji: '🔹', lockDays: 0,  apy: 0.040, tier: 'flexible', note: 'Hashgraph consensus, flexible staking' },
  XTZ:  { name: 'Tezos',         emoji: '🌙', lockDays: 0,  apy: 0.055, tier: 'flexible', note: 'Baking/delegating, no minimum stake' },
  // ── Short lock (7 days) ──────────────────────────────────────────────────
  SOL:  { name: 'Solana',        emoji: '🟣', lockDays: 7,  apy: 0.070, tier: 'short',    note: '~2-3 day unbonding in reality — fast PoS' },
  MATIC:{ name: 'Polygon',       emoji: '💜', lockDays: 7,  apy: 0.065, tier: 'short',    note: 'Delegate to Polygon validators' },
  POL:  { name: 'Polygon',       emoji: '💜', lockDays: 7,  apy: 0.065, tier: 'short',    note: 'Delegate to Polygon validators' },
  SUI:  { name: 'Sui',           emoji: '🌊', lockDays: 7,  apy: 0.035, tier: 'short',    note: 'New L1 — ~24hr unbonding in practice' },
  // ── Standard lock (30 days) ───────────────────────────────────────────────
  AVAX: { name: 'Avalanche',     emoji: '🔺', lockDays: 30, apy: 0.090, tier: 'standard', note: '2-week minimum stake in reality' },
  NEAR: { name: 'NEAR Protocol', emoji: '🌿', lockDays: 30, apy: 0.110, tier: 'standard', note: '52–65 hr unbonding period' },
  APT:  { name: 'Aptos',         emoji: '⚡', lockDays: 30, apy: 0.075, tier: 'standard', note: 'Delegated staking on Aptos L1' },
  TRX:  { name: 'TRON',          emoji: '🔴', lockDays: 30, apy: 0.060, tier: 'standard', note: '3-day freeze period on TRON network' },
  // ── Long lock (90 days) ───────────────────────────────────────────────────
  DOT:  { name: 'Polkadot',      emoji: '⚫', lockDays: 90, apy: 0.140, tier: 'long',     note: '28-day unbonding — highest yield, highest lock-in risk' },
  ATOM: { name: 'Cosmos',        emoji: '⚛️', lockDays: 90, apy: 0.170, tier: 'long',     note: '21-day unbonding on Cosmos Hub' },
  INJ:  { name: 'Injective',     emoji: '🟦', lockDays: 90, apy: 0.120, tier: 'long',     note: '21-day unbonding period' },
};

export const TIER_META = {
  flexible: { label: 'Flexible', color: '#00e5a0', bg: 'rgba(0,229,160,.15)',  desc: 'No lock — unstake anytime' },
  short:    { label: '7-Day',    color: '#60a5fa', bg: 'rgba(96,165,250,.15)', desc: '7-day lock period' },
  standard: { label: '30-Day',   color: '#f59e0b', bg: 'rgba(245,158,11,.15)', desc: '30-day lock period' },
  long:     { label: '90-Day',   color: '#f43f5e', bg: 'rgba(244,63,94,.15)',  desc: '90-day lock — maximum yield' },
};

export function isCoinStakeable(symbol) {
  return symbol?.toUpperCase() in STAKEABLE_COINS;
}

export function getStakeInfo(symbol) {
  return STAKEABLE_COINS[symbol?.toUpperCase()] || null;
}

// Daily reward in USD for a given position
export function calcDailyReward(quantity, price, apy) {
  return quantity * price * (apy / 365);
}
