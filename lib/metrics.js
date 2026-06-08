const MIN_SNAPSHOTS = 5;

// Deduplicate snapshots to one value per calendar day (latest wins)
function dailyValues(snapshots) {
  if (!snapshots?.length) return [];
  const sorted = [...snapshots].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const byDay = {};
  sorted.forEach(s => { byDay[s.created_at.slice(0, 10)] = parseFloat(s.total_value); });
  return Object.values(byDay);
}

function dailyReturns(values) {
  const returns = [];
  for (let i = 1; i < values.length; i++) {
    if (values[i - 1] > 0) returns.push((values[i] - values[i - 1]) / values[i - 1]);
  }
  return returns;
}

export function calculateSharpe(snapshots) {
  const values = dailyValues(snapshots);
  if (values.length < MIN_SNAPSHOTS) return null;
  const returns = dailyReturns(values);
  if (returns.length < MIN_SNAPSHOTS - 1) return null;
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  if (stdDev === 0) return null;
  return parseFloat(((mean / stdDev) * Math.sqrt(252)).toFixed(2));
}

export function calculateSortino(snapshots) {
  const values = dailyValues(snapshots);
  if (values.length < MIN_SNAPSHOTS) return null;
  const returns = dailyReturns(values);
  if (returns.length < MIN_SNAPSHOTS - 1) return null;
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const downsideVariance = returns.reduce((s, r) => s + Math.pow(Math.min(r, 0), 2), 0) / returns.length;
  const downsideDev = Math.sqrt(downsideVariance);
  if (downsideDev === 0) return null;
  return parseFloat(((mean / downsideDev) * Math.sqrt(252)).toFixed(2));
}

export function calculateMaxDrawdown(snapshots) {
  const values = dailyValues(snapshots);
  if (values.length < 2) return null;
  let peak = values[0];
  let maxDD = 0;
  for (const v of values) {
    if (v > peak) peak = v;
    const dd = peak > 0 ? (peak - v) / peak : 0;
    if (dd > maxDD) maxDD = dd;
  }
  return parseFloat((maxDD * 100).toFixed(2)); // as percentage
}

export function calculateVolatility(snapshots) {
  const values = dailyValues(snapshots);
  if (values.length < MIN_SNAPSHOTS) return null;
  const returns = dailyReturns(values);
  if (returns.length < MIN_SNAPSHOTS - 1) return null;
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / returns.length;
  return parseFloat((Math.sqrt(variance) * Math.sqrt(252) * 100).toFixed(1)); // annualized %
}

export function calculateCalmar(snapshots) {
  const values = dailyValues(snapshots);
  if (values.length < MIN_SNAPSHOTS) return null;
  const totalReturn = values[0] > 0 ? ((values[values.length - 1] / values[0]) - 1) * 100 : 0;
  const maxDD = calculateMaxDrawdown(snapshots);
  if (!maxDD || maxDD === 0) return null;
  return parseFloat((totalReturn / maxDD).toFixed(2));
}

// btcDailyPrices: [[timestamp_ms, price], ...] from CoinGecko market_chart
export function calculateBeta(snapshots, btcDailyPrices) {
  if (!btcDailyPrices?.length) return null;
  const sorted = [...snapshots].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const byDay = {};
  sorted.forEach(s => { byDay[s.created_at.slice(0, 10)] = parseFloat(s.total_value); });
  const days = Object.keys(byDay).sort();
  if (days.length < MIN_SNAPSHOTS) return null;

  const btcByDay = {};
  btcDailyPrices.forEach(([ts, price]) => {
    btcByDay[new Date(ts).toISOString().slice(0, 10)] = price;
  });

  const portReturns = [], btcReturns = [];
  for (let i = 1; i < days.length; i++) {
    const prev = days[i - 1], cur = days[i];
    if (!btcByDay[prev] || !btcByDay[cur] || byDay[prev] <= 0) continue;
    portReturns.push((byDay[cur] - byDay[prev]) / byDay[prev]);
    btcReturns.push((btcByDay[cur] - btcByDay[prev]) / btcByDay[prev]);
  }
  if (portReturns.length < MIN_SNAPSHOTS - 1) return null;

  const n = portReturns.length;
  const pm = portReturns.reduce((s, r) => s + r, 0) / n;
  const bm = btcReturns.reduce((s, r) => s + r, 0) / n;
  let cov = 0, btcVar = 0;
  for (let i = 0; i < n; i++) {
    cov    += (portReturns[i] - pm) * (btcReturns[i] - bm);
    btcVar += Math.pow(btcReturns[i] - bm, 2);
  }
  if (btcVar === 0) return null;
  return parseFloat((cov / btcVar).toFixed(2));
}

// Win rate: % of fully-closed coin positions that were profitable
// trades: [{ action, coin, grossValue, fee }, ...]
export function calculateWinRate(trades) {
  if (!trades?.length) return null;
  const cost = {}, proceeds = {};
  trades.forEach(t => {
    const coin = t.coin;
    const gv = parseFloat(t.grossValue || t.gross_value || 0);
    const fee = parseFloat(t.fee || 0);
    if (t.action === 'BUY') {
      cost[coin] = (cost[coin] || 0) + gv + fee;
    } else if (t.action === 'SELL' || t.action === 'SELL_ALL') {
      proceeds[coin] = (proceeds[coin] || 0) + gv - fee;
    }
  });
  const closedCoins = Object.keys(proceeds);
  if (!closedCoins.length) return null;
  const wins = closedCoins.filter(c => (proceeds[c] || 0) > (cost[c] || 0)).length;
  return parseFloat(((wins / closedCoins.length) * 100).toFixed(1));
}
