import { db } from './db';

const COINGECKO_KEY  = process.env.COINGECKO_API_KEY;
const FREECRYPTO_KEY = process.env.FREECRYPTO_API_KEY;
const REFRESH_STALE_MS = 30 * 60 * 1000;

// Real (not estimated) monthly call counters for the teacher cockpit — keyed
// by calendar month so they naturally reset. Best-effort: a lost increment
// under a rare simultaneous race doesn't matter for a usage gauge like this.
async function bumpCallCounter(service) {
  const key = `API_CALLS_${service}_${new Date().toISOString().slice(0, 7)}`;
  try {
    const { data } = await db.from('config').select('value').eq('key', key).single();
    const next = (parseInt(data?.value || '0', 10) || 0) + 1;
    await db.from('config').upsert({ key, value: String(next), updated_at: new Date().toISOString() });
  } catch {}
}

// ── Live price for student-initiated trades (always fresh at that instant,
// so a trade can never be filled off a stale displayed price). FreeCryptoAPI
// first — a separate quota from the bulk CoinGecko cron, one symbol per call.
// If that fails, falls back to the shared bulk CoinGecko refresh rather than
// a single-coin CoinGecko call: once CoinGecko is being hit at all, a batch
// call for every coin costs the same as one, so it may as well refresh
// everyone. Not used by automated trade execution (bot/DCA/orders/margin
// calls) — those already run right after the cron's own bulk refresh and
// pass a knownPrice instead, since re-fetching there would be pure waste.
export async function getLivePrice(symbol) {
  try {
    if (FREECRYPTO_KEY) {
      const res = await fetch(`https://api.freecryptoapi.com/v1/getData?symbol=${symbol}&token=${FREECRYPTO_KEY}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && json.symbols?.[0]?.last) {
          bumpCallCounter('FREECRYPTO').catch(() => {});
          return parseFloat(json.symbols[0].last);
        }
      }
    }
  } catch {}
  try {
    const { priceMap } = await refreshPricesIfStale();
    if (priceMap[symbol]) return priceMap[symbol];
  } catch {}
  return null;
}

// ── Fetch top 100 coins from CoinGecko (used once at setup) ──
export async function fetchTop100Coins() {
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&price_change_percentage=24h`;
  const res = await fetch(url, {
    headers: COINGECKO_KEY ? { 'x-cg-demo-api-key': COINGECKO_KEY } : {},
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('CoinGecko fetch failed');
  const coins = await res.json();
  return coins.map(c => ({
    symbol:   c.symbol.toUpperCase(),
    geckoId:  c.id,
    name:     c.name,
    price:    c.current_price,
    change24h: c.price_change_percentage_24h?.toFixed(2),
    marketCap: c.market_cap,
    sector:   getSector(c.symbol.toUpperCase()),
  }));
}

// ── Bulk prices for cron job (saved to price_cache) ──────────
export async function fetchBulkPrices(symbols, extraIds = {}) {
  const priceMap = {};
  const combined = { ...GECKO_ID_MAP, ...extraIds };
  const pairs = symbols.map(s => ({ sym: s, id: combined[s?.toUpperCase()] || null })).filter(x => x.id);
  if (!pairs.length) return priceMap;
  const ids = pairs.map(x => x.id).join(',');
  try {
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&price_change_percentage=1h,24h,7d`;
    const res = await fetch(url, {
      headers: COINGECKO_KEY ? { 'x-cg-demo-api-key': COINGECKO_KEY } : {},
      cache: 'no-store',
    });
    if (res.ok) {
      const json = await res.json();
      pairs.forEach(({ sym, id }) => {
        const coin = json.find(c => c.id === id);
        if (coin) {
          priceMap[sym] = {
            price:     coin.current_price,
            change1h:  coin.price_change_percentage_1h_in_currency || 0,
            change24h: coin.price_change_percentage_24h_in_currency || 0,
            change7d:  coin.price_change_percentage_7d_in_currency || 0,
          };
        }
      });
    }
  } catch {}
  return priceMap;
}

// ── Shared staleness gate for both the 30-min cron and trade execution ──
// Whoever asks first in a given window pays for the CoinGecko call; everyone
// else (cron ticks or trades) rides on the cache until it's stale again.
// Always returns a complete symbol->price map, whether or not a live fetch
// actually happened, so callers never need to special-case a skipped refresh.
export async function refreshPricesIfStale(maxAgeMs = REFRESH_STALE_MS) {
  const { data: latest } = await db.from('price_cache')
    .select('updated_at').order('updated_at', { ascending: false }).limit(1).single();
  const isStale = !latest || (Date.now() - new Date(latest.updated_at).getTime()) > maxAgeMs;

  if (!isStale) {
    const { data: cached } = await db.from('price_cache').select('symbol, price');
    const priceMap = {};
    (cached || []).forEach(r => { priceMap[r.symbol] = parseFloat(r.price); });
    return { refreshed: false, count: 0, priceMap };
  }

  const [{ data: activeCoins }, { data: heldCoins }] = await Promise.all([
    db.from('class_coins').select('symbol,gecko_id').eq('active', true),
    db.from('holdings').select('coin'),
  ]);
  const symbolSet = new Set([
    ...(activeCoins || []).map(c => c.symbol),
    ...(heldCoins  || []).map(h => h.coin),
  ]);
  const symbols = [...symbolSet];
  if (!symbols.length) return { refreshed: false, count: 0, priceMap: {} };

  const extraIds = {};
  (activeCoins || []).forEach(c => {
    if (c.gecko_id && !GECKO_ID_MAP[c.symbol?.toUpperCase()]) extraIds[c.symbol.toUpperCase()] = c.gecko_id;
  });
  const inactiveHeld = symbols.filter(s => !(activeCoins || []).find(c => c.symbol === s));
  if (inactiveHeld.length) {
    const { data: inactiveCoins } = await db.from('class_coins').select('symbol,gecko_id').in('symbol', inactiveHeld);
    (inactiveCoins || []).forEach(c => {
      if (c.gecko_id && !GECKO_ID_MAP[c.symbol?.toUpperCase()]) extraIds[c.symbol.toUpperCase()] = c.gecko_id;
    });
  }

  const geckoMap = await fetchBulkPrices(symbols, extraIds);
  bumpCallCounter('COINGECKO').catch(() => {});
  const rows = Object.entries(geckoMap).map(([symbol, data]) => ({
    symbol,
    price:      data.price,
    change_1h:  data.change1h,
    change_24h: data.change24h,
    change_7d:  data.change7d,
    updated_at: new Date().toISOString(),
  }));
  if (rows.length) await db.from('price_cache').upsert(rows, { onConflict: 'symbol' });

  const priceMap = {};
  Object.entries(geckoMap).forEach(([symbol, data]) => { priceMap[symbol] = data.price; });
  return { refreshed: true, count: rows.length, priceMap };
}

// ── Sector classification ─────────────────────────────────────
export function getSector(symbol) {
  const map = {
    'Layer 1':    ['BTC','ETH','SOL','ADA','AVAX','DOT','ATOM','NEAR','ALGO','XRP','LTC','BCH','XLM','HBAR','ICP','TON','TRX','VET','EOS','XTZ','APT','SUI','SEI','TIA','EGLD','FTM','KAVA','THETA'],
    'Layer 2':    ['MATIC','ARB','OP','IMX','STX'],
    'DeFi':       ['UNI','AAVE','MKR','CRV','COMP','LINK','GRT','INJ'],
    'AI / Data':  ['FET','RNDR','WLD','TAO'],
    'Gaming/NFT': ['SAND','MANA','AXS'],
    'Memecoin':   ['DOGE','SHIB','PEPE','BONK','FLOKI','WIF'],
    'Stablecoin': ['USDT','USDC','DAI'],
    'Exchange':   ['BNB','OKB'],
  };
  for (const [sector, symbols] of Object.entries(map)) {
    if (symbols.includes(symbol)) return sector;
  }
  return 'Other';
}

// ── Symbol → CoinGecko ID ─────────────────────────────────────
export const GECKO_ID_MAP = {
  BTC:'bitcoin',ETH:'ethereum',SOL:'solana',ADA:'cardano',
  AVAX:'avalanche-2',DOT:'polkadot',ATOM:'cosmos',NEAR:'near',
  ALGO:'algorand',XRP:'ripple',LTC:'litecoin',BCH:'bitcoin-cash',
  XLM:'stellar',HBAR:'hedera-hashgraph',ICP:'internet-computer',
  FIL:'filecoin',TON:'the-open-network',TRX:'tron',VET:'vechain',
  EOS:'eos',XTZ:'tezos',MATIC:'matic-network',ARB:'arbitrum',
  OP:'optimism',IMX:'immutable-x',STX:'blockstack',
  DOGE:'dogecoin',SHIB:'shiba-inu',PEPE:'pepe',BONK:'bonk',
  FLOKI:'floki',WIF:'dogwifcoin',USDT:'tether',USDC:'usd-coin',
  DAI:'dai',UNI:'uniswap',AAVE:'aave',MKR:'maker',
  CRV:'curve-dao-token',LINK:'chainlink',GRT:'the-graph',
  RNDR:'render-token',FET:'fetch-ai',WLD:'worldcoin-wld',
  TAO:'bittensor',SAND:'the-sandbox',MANA:'decentraland',
  AXS:'axie-infinity',BNB:'binancecoin',OKB:'okb',
  APT:'aptos',SUI:'sui',SEI:'sei-network',TIA:'celestia',
  INJ:'injective-protocol',EGLD:'elrond-erd-2',FTM:'fantom',
  THETA:'theta-token',KAVA:'kava',COMP:'compound-governance-token',
};

// Fetch BTC daily market chart — cached in config table for 23h to avoid rate limits
// Returns [[timestamp_ms, price], ...] or null
export async function fetchBtcMarketChart(db, days = 90) {
  const CACHE_KEY = `BTC_MARKET_CHART_${days}`;
  try {
    const { data: cached } = await db.from('config').select('value, updated_at').eq('key', CACHE_KEY).single();
    if (cached?.updated_at) {
      const age = Date.now() - new Date(cached.updated_at).getTime();
      if (age < 23 * 60 * 60 * 1000) return JSON.parse(cached.value);
    }
  } catch {}

  try {
    const url = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}&interval=daily`;
    const res = await fetch(url, {
      headers: COINGECKO_KEY ? { 'x-cg-demo-api-key': COINGECKO_KEY } : {},
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    const prices = json.prices; // [[ts, price], ...]
    if (!prices?.length) return null;
    await db.from('config').upsert({ key: CACHE_KEY, value: JSON.stringify(prices), updated_at: new Date().toISOString() }, { onConflict: 'key' });
    return prices;
  } catch {
    return null;
  }
}
