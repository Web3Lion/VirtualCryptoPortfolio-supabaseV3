export const dynamic = "force-dynamic";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const COINGECKO_IDS = {
  BTC:'bitcoin',ETH:'ethereum',SOL:'solana',XRP:'ripple',ADA:'cardano',
  DOGE:'dogecoin',AVAX:'avalanche-2',DOT:'polkadot',LINK:'chainlink',
  MATIC:'matic-network',BNB:'binancecoin',SHIB:'shiba-inu',LTC:'litecoin',
  UNI:'uniswap',ATOM:'cosmos',NEAR:'near',ALGO:'algorand',VET:'vechain',
  HBAR:'hedera-hashgraph',ICP:'internet-computer',FIL:'filecoin',
  ARB:'arbitrum',OP:'optimism',STX:'blockstack',IMX:'immutable-x',
  SAND:'the-sandbox',MANA:'decentraland',AXS:'axie-infinity',
  FET:'fetch-ai',RNDR:'render-token',WLD:'worldcoin-wld',TAO:'bittensor',
  PEPE:'pepe',BONK:'bonk',FLOKI:'floki',WIF:'dogwifcoin',
  USDT:'tether',USDC:'usd-coin',DAI:'dai',
  BCH:'bitcoin-cash',TON:'the-open-network',APT:'aptos',SUI:'sui',
  TRX:'tron',XLM:'stellar',NEXO:'nexo',HYPE:'hyperliquid',
};

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

// Fetch fresh prices from CoinGecko
async function fetchFromCoinGecko(symbols) {
  const ids = symbols.map(s => COINGECKO_IDS[s.toUpperCase()]).filter(Boolean).join(',');
  if (!ids) return {};

  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=250&sparkline=false&price_change_percentage=1h,24h,7d`;
  const headers = { 'Accept': 'application/json' };
  if (process.env.COINGECKO_API_KEY) headers['x-cg-demo-api-key'] = process.env.COINGECKO_API_KEY;

  const res = await fetch(url, { headers, next: { revalidate: 0 } });
  if (!res.ok) return {};
  const data = await res.json();

  // Build reverse map: gecko_id → symbol
  const reverseMap = {};
  Object.entries(COINGECKO_IDS).forEach(([sym, id]) => { reverseMap[id] = sym; });

  const result = {};
  data.forEach(coin => {
    const sym = reverseMap[coin.id];
    if (!sym) return;
    result[sym] = {
      symbol:    sym,
      price:     coin.current_price || 0,
      change1h:  coin.price_change_percentage_1h_in_currency || 0,
      change24h: coin.price_change_percentage_24h || 0,
      change7d:  coin.price_change_percentage_7d_in_currency || 0,
      marketCap: coin.market_cap || 0,
      volume24h: coin.total_volume || 0,
      sector:    getSector(sym),
      updatedAt: new Date().toISOString(),
    };
  });
  return result;
}

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  let classId = searchParams.get('classId');
  const full  = searchParams.get('full') === 'true';

  // Get classId if not provided
  if (!classId) {
    const email = session.user.email.toLowerCase();
    const isTeacher = email === process.env.TEACHER_EMAIL?.toLowerCase();
    if (isTeacher) {
      const { data } = await db.from('classes').select('id').eq('teacher_email', process.env.TEACHER_EMAIL).order('created_at', { ascending: false }).limit(1).single();
      classId = data?.id;
    } else {
      const { data: student } = await db.from('students').select('id').eq('email', email).single();
      if (student) {
        const { data: cs } = await db.from('class_students').select('class_id').eq('student_id', student.id).order('joined_at', { ascending: false }).limit(1).single();
        classId = cs?.class_id;
      }
    }
  }

  // Get coins for this class
  let symbols = [];
  if (classId) {
    const { data: classCoins } = await db.from('class_coins').select('symbol').eq('class_id', classId).eq('active', true);
    symbols = (classCoins || []).map(c => c.symbol);
  }
  if (!symbols.length) symbols = ['BTC','ETH','SOL','XRP','ADA','DOGE','AVAX','LINK','DOT','MATIC','BNB','SHIB'];

  // Check cache freshness (30 min)
  const CACHE_TTL = 30 * 60 * 1000;
  const { data: cached } = await db.from('price_cache').select('*').in('symbol', symbols);
  const cacheMap = {};
  (cached || []).forEach(c => { cacheMap[c.symbol] = c; });

  const staleSymbols = symbols.filter(s => {
    const c = cacheMap[s];
    if (!c) return true;
    return Date.now() - new Date(c.updated_at).getTime() > CACHE_TTL;
  });

  // Fetch stale prices from CoinGecko
  if (staleSymbols.length > 0) {
    const fresh = await fetchFromCoinGecko(staleSymbols);
    if (Object.keys(fresh).length > 0) {
      const upserts = Object.values(fresh).map(p => ({
        symbol:    p.symbol,
        price:     p.price,
        change1h:  p.change1h,
        change24h: p.change24h,
        change7d:  p.change7d,
        market_cap: p.marketCap,
        volume_24h: p.volume24h,
        updated_at: p.updatedAt,
      }));
      await db.from('price_cache').upsert(upserts, { onConflict: 'symbol' });
      upserts.forEach(p => { cacheMap[p.symbol] = { ...p, updated_at: p.updated_at }; });
    }
  }

  // Build response object: { BTC: { price, change1h, ... }, ... }
  const result = {};
  symbols.forEach(sym => {
    const c = cacheMap[sym];
    if (!c) return;
    result[sym] = {
      symbol:    sym,
      price:     parseFloat(c.price) || 0,
      change1h:  parseFloat(c.change1h) || 0,
      change24h: parseFloat(c.change24h) || 0,
      change7d:  parseFloat(c.change7d) || 0,
      marketCap: parseFloat(c.market_cap) || 0,
      volume24h: parseFloat(c.volume_24h) || 0,
      sector:    getSector(sym),
    };
  });

  // ?full=true returns array format for compatibility
  if (full) {
    return Response.json(Object.values(result));
  }

  return Response.json(result);
}