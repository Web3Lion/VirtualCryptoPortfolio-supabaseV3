import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, getMarketStatus } from '@/lib/db';

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
async function fetchFromCoinGecko(symbols, extraIds = {}) {
  const combined = { ...COINGECKO_IDS, ...extraIds };
  const ids = symbols.map(s => combined[s.toUpperCase()]).filter(Boolean).join(',');
  if (!ids) return {};

  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=250&sparkline=false&price_change_percentage=1h,24h,7d`;
  const headers = { 'Accept': 'application/json' };
  if (process.env.COINGECKO_API_KEY) headers['x-cg-demo-api-key'] = process.env.COINGECKO_API_KEY;

  const res = await fetch(url, { headers, next: { revalidate: 0 } });
  if (!res.ok) return {};
  const data = await res.json();

  // Build reverse map: gecko_id → symbol
  const reverseMap = {};
  Object.entries(combined).forEach(([sym, id]) => { reverseMap[id] = sym; });

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

  // Get coins for this class (include gecko_id for manually-added coins not in COINGECKO_IDS)
  let symbols = [];
  let extraIds = {};
  if (classId) {
    const email = session.user.email.toLowerCase();
    const isTeacher = email === process.env.TEACHER_EMAIL?.toLowerCase();

    // Active class coins
    const { data: classCoins } = await db.from('class_coins').select('symbol,gecko_id').eq('class_id', classId).eq('active', true);
    symbols = (classCoins || []).map(c => c.symbol);
    (classCoins || []).forEach(c => {
      if (c.gecko_id && !COINGECKO_IDS[c.symbol.toUpperCase()]) extraIds[c.symbol.toUpperCase()] = c.gecko_id;
    });

    // Also include any coins the student currently holds (even if deactivated)
    if (!isTeacher) {
      const { data: studentRow } = await db.from('students').select('id').eq('email', email).single();
      if (studentRow) {
        const { data: heldCoins } = await db.from('holdings').select('coin').eq('student_id', studentRow.id).eq('class_id', classId);
        const heldSymbols = (heldCoins || []).map(h => h.coin).filter(c => !symbols.includes(c));
        if (heldSymbols.length) {
          symbols = [...symbols, ...heldSymbols];
          // Get gecko_ids for these deactivated coins so we can fetch live prices
          const { data: inactiveCoins } = await db.from('class_coins').select('symbol,gecko_id').eq('class_id', classId).in('symbol', heldSymbols);
          (inactiveCoins || []).forEach(c => {
            if (c.gecko_id && !COINGECKO_IDS[c.symbol.toUpperCase()]) extraIds[c.symbol.toUpperCase()] = c.gecko_id;
          });
        }
      }
    }
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
  let didRefresh = false;
  const freshPriceMap = {};
  if (staleSymbols.length > 0) {
    const fresh = await fetchFromCoinGecko(staleSymbols, extraIds);
    if (Object.keys(fresh).length > 0) {
      const upserts = Object.values(fresh).map(p => ({
        symbol:    p.symbol,
        price:     p.price,
        change_1h:  p.change1h,
        change_24h: p.change24h,
        change_7d:  p.change7d,
        market_cap: p.marketCap,
        volume_24h: p.volume24h,
        updated_at: p.updatedAt,
      }));
      await db.from('price_cache').upsert(upserts, { onConflict: 'symbol' });
      upserts.forEach(p => { cacheMap[p.symbol] = { ...p, updated_at: p.updated_at }; freshPriceMap[p.symbol] = p.price; });
      didRefresh = true;
    }
  }

  // When prices refresh, save an intraday snapshot for this student (non-blocking)
  if (didRefresh && classId) {
    const email = session.user.email.toLowerCase();
    const isTeacher = email === process.env.TEACHER_EMAIL?.toLowerCase();
    if (!isTeacher) {
      db.from('students').select('id').eq('email', email).single().then(async ({ data: student }) => {
        if (!student) return;
        const [portRes, holdRes] = await Promise.all([
          db.from('portfolios').select('cash').eq('student_id', student.id).eq('class_id', classId).single(),
          db.from('holdings').select('coin, quantity, margin_borrowed').eq('student_id', student.id).eq('class_id', classId),
        ]);
        if (!portRes.data) return;
        const pm = {};
        Object.entries(cacheMap).forEach(([sym, c]) => { pm[sym] = parseFloat(c.price || 0); });
        // Fill any holding coins missing from the class price map
        const holdingCoins = [...new Set((holdRes.data || []).map(h => h.coin))];
        const missingCoins = holdingCoins.filter(c => !pm[c]);
        if (missingCoins.length) {
          const { data: extraPrices } = await db.from('price_cache').select('symbol, price').in('symbol', missingCoins);
          (extraPrices || []).forEach(r => { pm[r.symbol] = parseFloat(r.price); });
        }
        let holdVal = 0, borrowed = 0;
        (holdRes.data || []).forEach(h => {
          const price = pm[h.coin] || parseFloat(h.avg_buy_price) || 0;
          holdVal  += parseFloat(h.quantity) * price;
          borrowed += parseFloat(h.margin_borrowed || 0);
        });
        const total = parseFloat(portRes.data.cash) + holdVal - borrowed;
        await db.from('snapshots').insert({ student_id: student.id, class_id: classId, total_value: total, cash: parseFloat(portRes.data.cash), snapshot_type: 'intraday' });
      }).catch(() => {});
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
      change1h:  parseFloat(c.change_1h) || 0,
      change24h: parseFloat(c.change_24h) || 0,
      change7d:  parseFloat(c.change_7d) || 0,
      marketCap: parseFloat(c.market_cap) || 0,
      volume24h: parseFloat(c.volume_24h) || 0,
      sector:    getSector(sym),
    };
  });

  // Apply active market events to displayed prices (cache always stores real prices)
  const market = await getMarketStatus(classId).catch(() => null);
  let marketEvent = null;
  if (market) {
    const bullActive  = market.bullRun;
    const crashActive = market.flashCrash;
    const saleActive  = !!market.flashSale;
    if (bullActive || crashActive || saleActive) {
      Object.keys(result).forEach(sym => {
        if (bullActive)  result[sym].price *= market.bullMult;
        if (crashActive) result[sym].price *= market.flashCrashMult;
        if (saleActive && market.flashSale.coin === sym) result[sym].price *= market.flashSale.factor;
      });
    }
    if (bullActive)       marketEvent = { type: 'bull_run',    mult: market.bullMult };
    else if (crashActive) marketEvent = { type: 'flash_crash', mult: market.flashCrashMult };
    else if (saleActive)  marketEvent = { type: 'flash_sale',  coin: market.flashSale.coin, factor: market.flashSale.factor };
  }

  const updatedTimes = Object.values(cacheMap).map(c => c.updated_at).filter(Boolean);
  const lastUpdated = updatedTimes.length
    ? new Date(Math.max(...updatedTimes.map(t => new Date(t).getTime()))).toISOString()
    : null;

  // ?full=true returns array format for compatibility
  if (full) {
    return Response.json(Object.values(result));
  }

  return Response.json({ ...result, __marketEvent: marketEvent, __lastUpdated: lastUpdated });
}