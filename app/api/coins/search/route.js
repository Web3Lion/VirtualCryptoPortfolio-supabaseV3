import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const COINGECKO_KEY = process.env.COINGECKO_API_KEY;

const SECTORS = {
  'Layer 1':    ['BTC','ETH','SOL','ADA','AVAX','DOT','ATOM','NEAR','ALGO','XRP','LTC','BCH','TON','APT','SUI','TRX','VET','HBAR','ICP','FIL','XLM'],
  'Layer 2':    ['MATIC','ARB','OP','IMX','STX'],
  'DeFi':       ['UNI','AAVE','MKR','CRV','LINK','COMP','GRT','INJ'],
  'AI / Data':  ['FET','RNDR','WLD','TAO'],
  'Gaming/NFT': ['SAND','MANA','AXS'],
  'Memecoin':   ['DOGE','SHIB','PEPE','BONK','FLOKI','WIF'],
  'Stablecoin': ['USDT','USDC','DAI'],
  'Exchange':   ['BNB','OKB','NEXO'],
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
  const query = searchParams.get('q')?.trim();
  if (!query || query.length < 2) return Response.json([]);

  const headers = COINGECKO_KEY ? { 'x-cg-demo-api-key': COINGECKO_KEY } : {};

  // Step 1: search CoinGecko for matching coins
  const searchRes = await fetch(
    `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`,
    { headers, cache: 'no-store' }
  );
  if (!searchRes.ok) return Response.json({ error: 'CoinGecko search failed' }, { status: 502 });

  const searchData = await searchRes.json();
  const hits = (searchData.coins || []).slice(0, 20);
  if (!hits.length) return Response.json([]);

  // Step 2: fetch prices for those coins
  const ids = hits.map(c => c.id).join(',');
  const marketsRes = await fetch(
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=20&price_change_percentage=24h`,
    { headers, cache: 'no-store' }
  );

  const priceMap = {};
  if (marketsRes.ok) {
    const markets = await marketsRes.json();
    markets.forEach(c => { priceMap[c.id] = { price: c.current_price, change24h: c.price_change_percentage_24h, marketCap: c.market_cap }; });
  }

  const results = hits.map(c => {
    const p = priceMap[c.id] || {};
    return {
      symbol:    c.symbol.toUpperCase(),
      geckoId:   c.id,
      name:      c.name,
      price:     p.price || 0,
      change24h: p.change24h?.toFixed(2) || '0.00',
      marketCap: p.marketCap || 0,
      sector:    getSector(c.symbol.toUpperCase()),
    };
  });

  return Response.json(results);
}
