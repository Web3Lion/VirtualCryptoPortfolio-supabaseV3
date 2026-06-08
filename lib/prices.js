const COINGECKO_KEY  = process.env.COINGECKO_API_KEY;
const FREECRYPTO_KEY = process.env.FREECRYPTO_API_KEY;

// ── Live price for trade execution (always fresh) ────────────
export async function getLivePrice(symbol) {
  const geckoId = symbolToGeckoId(symbol);
  try {
    if (geckoId) {
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=usd`;
      const res = await fetch(url, {
        headers: COINGECKO_KEY ? { 'x-cg-demo-api-key': COINGECKO_KEY } : {},
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json();
        if (json[geckoId]?.usd) return parseFloat(json[geckoId].usd);
      }
    }
  } catch {}
  try {
    if (FREECRYPTO_KEY) {
      const res = await fetch(`https://api.freecryptoapi.com/v1/getData?symbol=${symbol}&token=${FREECRYPTO_KEY}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && json.symbols?.[0]?.last) return parseFloat(json.symbols[0].last);
      }
    }
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

export function symbolToGeckoId(symbol) {
  return GECKO_ID_MAP[symbol?.toUpperCase()] || null;
}

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
