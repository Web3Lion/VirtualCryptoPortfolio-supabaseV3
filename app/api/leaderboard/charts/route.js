import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const SECTORS = {
  'Layer 1':    ['BTC','ETH','SOL','ADA','AVAX','DOT','ATOM','NEAR','ALGO','XRP','LTC','BCH','TON','APT','SUI','TRX','VET','HBAR','ICP','FIL'],
  'Layer 2':    ['MATIC','ARB','OP','IMX','STX'],
  'DeFi':       ['UNI','AAVE','MKR','CRV','LINK','COMP','GRT','INJ'],
  'AI / Data':  ['FET','RNDR','WLD','TAO'],
  'Gaming/NFT': ['SAND','MANA','AXS'],
  'Memecoin':   ['DOGE','SHIB','PEPE','BONK','FLOKI','WIF'],
  'Stablecoin': ['USDT','USDC','DAI'],
  'Exchange':   ['BNB','OKB'],
};

const RANGE_CONFIG = {
  '1D':  { hours: 24,  type: 'intraday' },
  '3D':  { hours: 72,  type: 'intraday' },
  '1W':  { hours: 168, type: 'intraday' },
  '1M':  { days: 30,   type: 'daily' },
  '3M':  { days: 90,   type: 'daily' },
  'ALL': { days: null,  type: 'daily' },
};

function getSector(symbol) {
  for (const [sector, syms] of Object.entries(SECTORS)) {
    if (syms.includes(symbol?.toUpperCase())) return sector;
  }
  return 'Other';
}

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  let classId = searchParams.get('classId');
  const range = searchParams.get('range') || '1W';
  const cfg   = RANGE_CONFIG[range] || RANGE_CONFIG['1W'];

  if (!classId) {
    const { data } = await db.from('classes').select('id').eq('teacher_email', process.env.TEACHER_EMAIL).order('created_at', { ascending: false }).limit(1).single();
    classId = data?.id;
  }
  if (!classId) return Response.json({ portfolioHistory: [], coinAllocation: [], sectorAllocation: [] });

  // Get all students in class
  const { data: classStudents } = await db.from('class_students').select('student_id, students(id, name, is_bot)').eq('class_id', classId);
  const students   = (classStudents || []).map(r => r.students).filter(Boolean);
  const studentIds = students.map(s => s.id);
  if (!studentIds.length) return Response.json({ portfolioHistory: [], coinAllocation: [], sectorAllocation: [] });

  // ── Portfolio history with range ───────────────────────────
  const cutoff = cfg.days != null
    ? new Date(Date.now() - cfg.days * 24 * 60 * 60 * 1000).toISOString()
    : cfg.hours != null
    ? new Date(Date.now() - cfg.hours * 60 * 60 * 1000).toISOString()
    : null;

  let snapQ = db.from('snapshots')
    .select('student_id, total_value, created_at')
    .eq('class_id', classId)
    .eq('snapshot_type', cfg.type)
    .order('created_at', { ascending: true });
  if (cutoff) snapQ = snapQ.gte('created_at', cutoff);

  const { data: snapshots } = await snapQ;

  // Group by date/time bucket
  const dateStudentMap = {};
  (snapshots || []).forEach(snap => {
    const d = new Date(snap.created_at);
    const key = cfg.type === 'intraday'
      ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!dateStudentMap[key]) dateStudentMap[key] = { _ts: snap.created_at };
    dateStudentMap[key][snap.student_id] = parseFloat(snap.total_value);
  });

  // Build BTC benchmark: seed_money * (btcPrice_at_each_point / btcPrice_at_start)
  // We use BTC's price_change data from price_cache to approximate the benchmark
  let btcBenchmark = null;
  try {
    const { data: cls } = await db.from('classes').select('seed_money').eq('id', classId).single();
    const seedMoney = parseFloat(cls?.seed_money || 10000);
    const days = cfg.days ?? (cfg.hours ? cfg.hours / 24 : 365);
    const geckoUrl = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${Math.ceil(days)}&interval=${cfg.type === 'intraday' ? 'hourly' : 'daily'}`;
    const headers = {};
    if (process.env.COINGECKO_API_KEY) headers['x-cg-demo-api-key'] = process.env.COINGECKO_API_KEY;
    const gRes = await fetch(geckoUrl, { headers, next: { revalidate: 3600 } });
    if (gRes.ok) {
      const gData = await gRes.json();
      const prices = gData.prices || [];
      if (prices.length > 1) {
        const startPrice = prices[0][1];
        btcBenchmark = prices.map(([ts, price]) => ({
          ts: new Date(ts).toISOString(),
          value: parseFloat(((price / startPrice) * seedMoney).toFixed(2)),
        }));
      }
    }
  } catch {}

  const sortedEntries = Object.entries(dateStudentMap).sort(([,a],[,b]) => a._ts.localeCompare(b._ts));

  const portfolioHistory = sortedEntries.map(([date, values]) => {
    const entry = { date };
    students.forEach(s => { if (values[s.id]) entry[s.name] = parseFloat(values[s.id].toFixed(2)); });
    // Attach nearest BTC benchmark value to each time bucket
    if (btcBenchmark?.length) {
      const ts = new Date(values._ts).getTime();
      let closest = btcBenchmark[0];
      for (const b of btcBenchmark) {
        if (Math.abs(new Date(b.ts).getTime() - ts) < Math.abs(new Date(closest.ts).getTime() - ts)) closest = b;
      }
      entry['BTC Benchmark'] = closest.value;
    }
    return entry;
  });

  // ── Coin + sector allocation ───────────────────────────────
  const { data: holdings } = await db.from('holdings').select('coin, quantity, avg_buy_price').in('student_id', studentIds).eq('class_id', classId).gt('quantity', 0);
  const coins = [...new Set((holdings || []).map(h => h.coin))];
  const priceMap = {};
  if (coins.length > 0) {
    const { data: prices } = await db.from('price_cache').select('symbol, price').in('symbol', coins);
    (prices || []).forEach(p => { priceMap[p.symbol] = parseFloat(p.price); });
  }
  const coinValueMap = {};
  (holdings || []).forEach(h => {
    const price = priceMap[h.coin] || parseFloat(h.avg_buy_price);
    const value = parseFloat(h.quantity) * price;
    coinValueMap[h.coin] = (coinValueMap[h.coin] || 0) + value;
  });
  const coinAllocation = Object.entries(coinValueMap).map(([coin, value]) => ({ coin, value: parseFloat(value.toFixed(2)) })).sort((a,b) => b.value-a.value).slice(0, 12);

  const sectorValueMap = {};
  Object.entries(coinValueMap).forEach(([coin, value]) => {
    const sector = getSector(coin);
    sectorValueMap[sector] = (sectorValueMap[sector] || 0) + value;
  });
  const { data: portfolios } = await db.from('portfolios').select('cash').in('student_id', studentIds).eq('class_id', classId);
  const totalCash = (portfolios || []).reduce((sum, p) => sum + parseFloat(p.cash), 0);
  if (totalCash > 0) sectorValueMap['Cash'] = totalCash;
  const sectorAllocation = Object.entries(sectorValueMap).map(([sector, value]) => ({ sector, value: parseFloat(value.toFixed(2)) })).sort((a,b) => b.value-a.value);

  return Response.json({ portfolioHistory, coinAllocation, sectorAllocation, studentNames: students.filter(s=>!s.is_bot).map(s=>s.name), classId, range });
}
