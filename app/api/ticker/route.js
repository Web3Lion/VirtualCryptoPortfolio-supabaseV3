import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// Lightweight endpoint — reads price_cache directly, no CoinGecko call
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json([], { status: 401 });

  const { data } = await db
    .from('price_cache')
    .select('symbol, price, change_24h')
    .order('symbol');

  if (!data?.length) return Response.json([]);

  // Sort by a rough market-cap priority list then alphabetically
  const ORDER = ['BTC','ETH','SOL','BNB','XRP','ADA','DOGE','AVAX','DOT','LINK','MATIC','UNI','ATOM','NEAR','ARB','OP','FET','PEPE','SHIB','LTC'];
  const sorted = [...data].sort((a, b) => {
    const ai = ORDER.indexOf(a.symbol), bi = ORDER.indexOf(b.symbol);
    if (ai === -1 && bi === -1) return a.symbol.localeCompare(b.symbol);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return Response.json(sorted.map(c => ({
    symbol: c.symbol,
    price: parseFloat(c.price) || 0,
    change24h: parseFloat(c.change_24h) || 0,
  })));
}
