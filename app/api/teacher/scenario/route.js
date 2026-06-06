import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, setConfigs } from '@/lib/db';
import { GECKO_ID_MAP } from '@/lib/prices';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;
const COINGECKO_KEY = process.env.COINGECKO_API_KEY;

// Fetch historical price for a single coin on a specific date (dd-mm-yyyy)
async function fetchHistoricalPrice(geckoId, ddmmyyyy) {
  const url = `https://api.coingecko.com/api/v3/coins/${geckoId}/history?date=${ddmmyyyy}&localization=false`;
  const res = await fetch(url, {
    headers: COINGECKO_KEY ? { 'x-cg-demo-api-key': COINGECKO_KEY } : {},
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.market_data?.current_price?.usd ?? null;
}

function toDDMMYYYY(isoDate) {
  const [y, m, d] = isoDate.split('-');
  return `${d}-${m}-${y}`;
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (TEACHER_EMAIL && session?.user?.email?.toLowerCase() !== TEACHER_EMAIL.toLowerCase())
    return Response.json({ error: 'Teacher only' }, { status: 403 });

  const { action, date, label } = await request.json();

  if (action === 'end') {
    await setConfigs({ SCENARIO_ACTIVE: '0', SCENARIO_DATE: '', SCENARIO_LABEL: '' });
    return Response.json({ success: true, message: '✅ Scenario ended — live prices restored on next refresh' });
  }

  // action === 'load' — fetch historical prices for the given ISO date (YYYY-MM-DD)
  if (!date) return Response.json({ error: 'date required (YYYY-MM-DD)' }, { status: 400 });

  const isoDate = date; // e.g. "2022-01-01"
  const ddmmyyyy = toDDMMYYYY(isoDate);

  // Get all active coins for any class
  const { data: activeCoins } = await db.from('class_coins').select('symbol, gecko_id').eq('active', true);
  const symbols = [...new Set((activeCoins || []).map(c => c.symbol))];

  const results = { loaded: 0, failed: [] };
  const rows = [];

  // Rate limit: fetch sequentially with small delays to stay under free tier limits
  for (const symbol of symbols) {
    const geckoId = (activeCoins.find(c => c.symbol === symbol)?.gecko_id) || GECKO_ID_MAP[symbol.toUpperCase()];
    if (!geckoId) { results.failed.push(symbol); continue; }
    try {
      const price = await fetchHistoricalPrice(geckoId, ddmmyyyy);
      if (price) {
        rows.push({ symbol, price, change_1h: 0, change_24h: 0, change_7d: 0, updated_at: new Date().toISOString() });
        results.loaded++;
      } else {
        results.failed.push(symbol);
      }
    } catch {
      results.failed.push(symbol);
    }
    // Small delay to avoid rate limits on free tier
    await new Promise(r => setTimeout(r, 200));
  }

  if (rows.length) {
    await db.from('price_cache').upsert(rows, { onConflict: 'symbol' });
    await setConfigs({
      SCENARIO_ACTIVE: '1',
      SCENARIO_DATE:   isoDate,
      SCENARIO_LABEL:  label || isoDate,
    });
  }

  return Response.json({
    success: rows.length > 0,
    loaded:  results.loaded,
    failed:  results.failed,
    date:    isoDate,
    message: rows.length > 0
      ? `📅 Loaded ${results.loaded} historical prices for ${label || isoDate}`
      : 'Failed to load prices — check date and try again',
  });
}
