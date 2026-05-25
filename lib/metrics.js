// Minimum snapshots needed before Sharpe is meaningful
const MIN_SNAPSHOTS = 5;

/**
 * Calculate annualized Sharpe ratio from an array of portfolio snapshots.
 * snapshots: [{ total_value: number, created_at: string }, ...]
 * Returns null if not enough data.
 */
export function calculateSharpe(snapshots) {
  if (!snapshots || snapshots.length < MIN_SNAPSHOTS) return null;

  // Sort oldest → newest, deduplicate to one value per calendar day
  const sorted = [...snapshots].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const byDay = {};
  sorted.forEach(s => {
    const day = s.created_at.slice(0, 10);
    byDay[day] = parseFloat(s.total_value);
  });
  const values = Object.values(byDay);
  if (values.length < MIN_SNAPSHOTS) return null;

  // Daily returns
  const returns = [];
  for (let i = 1; i < values.length; i++) {
    if (values[i - 1] > 0) returns.push((values[i] - values[i - 1]) / values[i - 1]);
  }
  if (returns.length < MIN_SNAPSHOTS - 1) return null;

  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  if (stdDev === 0) return null;

  // Annualize: multiply by sqrt(252) trading days
  return parseFloat(((mean / stdDev) * Math.sqrt(252)).toFixed(2));
}
