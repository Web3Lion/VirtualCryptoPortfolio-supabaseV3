import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { GECKO_ID_MAP } from '@/lib/prices';

const COINGECKO_KEY = process.env.COINGECKO_API_KEY;

// Simple in-memory cache to avoid hammering CoinGecko on quick re-opens
const cache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol')?.toUpperCase();
  if (!symbol) return Response.json({ error: 'symbol required' }, { status: 400 });

  // Check cache
  const cached = cache.get(symbol);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return Response.json(cached.data);

  // Get gecko_id — first from class_coins, then from built-in map
  let geckoId = GECKO_ID_MAP[symbol];
  if (!geckoId) {
    const { data: coin } = await db.from('class_coins').select('gecko_id').eq('symbol', symbol).limit(1).single();
    geckoId = coin?.gecko_id;
  }
  if (!geckoId) return Response.json({ error: `No CoinGecko ID for ${symbol}` }, { status: 404 });

  try {
    const url = `https://api.coingecko.com/api/v3/coins/${geckoId}/market_chart?vs_currency=usd&days=60&interval=daily`;
    const res = await fetch(url, {
      headers: COINGECKO_KEY ? { 'x-cg-demo-api-key': COINGECKO_KEY } : {},
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
    const json = await res.json();

    const prices  = (json.prices  || []).map(([ts, v]) => ({ ts, v }));
    const volumes = (json.total_volumes || []).map(([ts, v]) => ({ ts, v }));

    const data = { symbol, prices, volumes, fetchedAt: Date.now() };
    cache.set(symbol, { ts: Date.now(), data });
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
