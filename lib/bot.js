import { db } from './db';
import { executeTrade } from './trade';

export const BOT_EMAIL = 'satoshi-bot@cryptoclass.internal';
export const BOT_NAME  = 'Satoshi Botomoto';

export const STRATEGIES = {
  momentum:    { label: 'Momentum',        desc: 'Buys top 24h gainers, exits when trend reverses' },
  contrarian:  { label: 'Dip Hunter',      desc: 'Buys biggest 24h dippers hoping for a rebound' },
  trend:       { label: 'Trend Follower',  desc: 'Only buys when 1h + 24h + 7d are all positive' },
  hodl:        { label: 'Crypto Turtle',   desc: 'HODLs BTC/ETH/SOL, only cuts losses' },
  sector:      { label: 'Sector Rotator',  desc: 'Finds the best-performing sector and buys its top coin' },
};

const RISK = {
  conservative: { tradePct: 0.05, label: 'Conservative (5% per trade)' },
  moderate:     { tradePct: 0.15, label: 'Moderate (15% per trade)' },
  aggressive:   { tradePct: 0.30, label: 'Aggressive (30% per trade)' },
};

const SECTOR_MAP = {
  'Layer 1':    ['BTC','ETH','SOL','ADA','AVAX','DOT','ATOM','NEAR','ALGO','XRP','LTC','BCH','TON','APT','SUI','TRX','VET','HBAR','ICP','FIL','XLM'],
  'Layer 2':    ['MATIC','ARB','OP','IMX','STX'],
  'DeFi':       ['UNI','AAVE','MKR','CRV','LINK','COMP','GRT','INJ'],
  'AI / Data':  ['FET','RNDR','WLD','TAO'],
  'Gaming/NFT': ['SAND','MANA','AXS'],
  'Memecoin':   ['DOGE','SHIB','PEPE','BONK','FLOKI','WIF'],
};
const getSector = s => { for (const [sec, coins] of Object.entries(SECTOR_MAP)) if (coins.includes(s?.toUpperCase())) return sec; return 'Other'; };

// ── Ensure bot student + class membership + portfolio exist ───
export async function ensureBotStudent(classId, seedMoney = 10000) {
  let { data: student } = await db.from('students').select('id').eq('email', BOT_EMAIL).single();
  if (!student) {
    const { data: ns } = await db.from('students').insert({ name: BOT_NAME, email: BOT_EMAIL }).select('id').single();
    student = ns;
  }
  if (!student) return null;

  const { data: inClass } = await db.from('class_students').select('student_id')
    .eq('class_id', classId).eq('student_id', student.id).single();
  if (!inClass) await db.from('class_students').insert({ class_id: classId, student_id: student.id });

  const { data: portfolio } = await db.from('portfolios').select('id')
    .eq('class_id', classId).eq('student_id', student.id).single();
  if (!portfolio) {
    await db.from('portfolios').insert({ class_id: classId, student_id: student.id, cash: parseFloat(seedMoney), fees_paid: 0 });
  }

  return student.id;
}

// ── Reset bot: wipe holdings + set cash back to seed ─────────
export async function resetBot(classId, seedMoney = 10000) {
  let { data: student } = await db.from('students').select('id').eq('email', BOT_EMAIL).single();
  if (!student) return;
  await db.from('holdings').delete().eq('student_id', student.id).eq('class_id', classId);
  await db.from('portfolios').update({ cash: parseFloat(seedMoney), fees_paid: 0 })
    .eq('student_id', student.id).eq('class_id', classId);
  await db.from('trades').delete().eq('student_id', student.id).eq('class_id', classId);
}

// ── Main bot run (called from cron) ──────────────────────────
export async function runBot({ classId, config }) {
  const {
    strategy    = 'momentum',
    risk        = 'moderate',
    maxPositions = 5,
    buyThreshold = 2,
    takeProfit   = 15,
    stopLoss     = 10,
    seedMoney    = 10000,
  } = config;

  const { tradePct } = RISK[risk] || RISK.moderate;
  const maxPos  = parseInt(maxPositions);
  const buyThr  = parseFloat(buyThreshold);
  const tpFrac  = parseFloat(takeProfit) / 100;
  const slFrac  = parseFloat(stopLoss)   / 100;

  const botId = await ensureBotStudent(classId, seedMoney);
  if (!botId) return { error: 'Could not init bot student' };

  // Throttle: only run if bot hasn't traded in last 25 min
  const { data: lastTrade } = await db.from('trades').select('created_at')
    .eq('student_id', botId).eq('class_id', classId).order('created_at', { ascending: false }).limit(1).single();
  if (lastTrade) {
    const minsSince = (Date.now() - new Date(lastTrade.created_at).getTime()) / 60000;
    if (minsSince < 25) return { skipped: true, reason: `throttled (${Math.round(minsSince)}m ago)` };
  }

  // Fetch price data (includes 24h, 7d, 1h changes)
  const [priceRes, holdingsRes, portfolioRes, classCoinsRes] = await Promise.all([
    db.from('price_cache').select('symbol, price, change_1h, change_24h, change_7d'),
    db.from('holdings').select('*').eq('student_id', botId).eq('class_id', classId).gt('quantity', 0),
    db.from('portfolios').select('cash').eq('student_id', botId).eq('class_id', classId).single(),
    db.from('class_coins').select('symbol').eq('class_id', classId).eq('active', true),
  ]);

  const priceMap = {};
  (priceRes.data || []).forEach(p => { priceMap[p.symbol] = p; });
  const holdings = holdingsRes.data || [];
  const cash = parseFloat(portfolioRes.data?.cash || 0);
  const validSymbols = new Set((classCoinsRes.data || []).map(c => c.symbol));
  const tradesExecuted = [];

  // ── SELL PHASE ──────────────────────────────────────────────
  for (const h of holdings) {
    const px = priceMap[h.coin];
    if (!px) continue;
    const cur = parseFloat(px.price), avg = parseFloat(h.avg_buy_price);
    const pnl = (cur - avg) / avg;
    const ch24 = parseFloat(px.change_24h || 0);
    const ch7d  = parseFloat(px.change_7d  || 0);
    let sell = false, reason = '';

    if (pnl <= -slFrac)                                              { sell = true; reason = `stop_loss ${(pnl*100).toFixed(1)}%`; }
    else if (pnl >= tpFrac)                                          { sell = true; reason = `take_profit +${(pnl*100).toFixed(1)}%`; }
    else if (strategy === 'momentum'   && ch24 < -(buyThr + 1.5))   { sell = true; reason = `momentum_exit 24h=${ch24.toFixed(1)}%`; }
    else if (strategy === 'trend'      && ch7d < -1)                 { sell = true; reason = `trend_exit 7d=${ch7d.toFixed(1)}%`; }
    else if (strategy === 'contrarian' && pnl >= tpFrac * 0.5)      { sell = true; reason = `contrarian_exit +${(pnl*100).toFixed(1)}%`; }

    if (sell) {
      const r = await executeTrade({ studentId: botId, classId, action: 'SELL', coin: h.coin, amountType: 'Shares', amount: parseFloat(h.quantity), reasoning: `🤖 Bot (${strategy}): ${reason}` });
      if (r.success) tradesExecuted.push({ action: 'SELL', coin: h.coin, reason });
    }
  }

  // ── BUY PHASE ───────────────────────────────────────────────
  const { data: freshHoldings } = await db.from('holdings').select('coin')
    .eq('student_id', botId).eq('class_id', classId).gt('quantity', 0);
  const heldCoins = new Set((freshHoldings || []).map(h => h.coin));

  if (heldCoins.size < maxPos) {
    const { data: freshPortfolio } = await db.from('portfolios').select('cash')
      .eq('student_id', botId).eq('class_id', classId).single();
    const avail = parseFloat(freshPortfolio?.cash || 0);
    const tradeAmt = Math.min(avail * tradePct, avail);
    if (tradeAmt >= 10) {
      const candidates = (priceRes.data || []).filter(p => validSymbols.has(p.symbol) && !heldCoins.has(p.symbol) && parseFloat(p.price) > 0);
      let target = null;

      if (strategy === 'momentum') {
        target = candidates.filter(p => parseFloat(p.change_24h||0) > buyThr).sort((a,b) => parseFloat(b.change_24h) - parseFloat(a.change_24h))[0];
      } else if (strategy === 'contrarian') {
        target = candidates.filter(p => parseFloat(p.change_24h||0) < -buyThr).sort((a,b) => parseFloat(a.change_24h) - parseFloat(b.change_24h))[0];
      } else if (strategy === 'trend') {
        target = candidates.filter(p => parseFloat(p.change_1h||0)>0 && parseFloat(p.change_24h||0)>buyThr && parseFloat(p.change_7d||0)>0).sort((a,b) => parseFloat(b.change_24h)-parseFloat(a.change_24h))[0];
      } else if (strategy === 'hodl') {
        for (const coin of ['BTC','ETH','SOL']) { if (!heldCoins.has(coin) && validSymbols.has(coin)) { target = candidates.find(p => p.symbol === coin); if (target) break; } }
      } else if (strategy === 'sector') {
        const sectorAvg = {};
        candidates.forEach(p => { const s = getSector(p.symbol); sectorAvg[s] = (sectorAvg[s] || []); sectorAvg[s].push(parseFloat(p.change_24h||0)); });
        const best = Object.entries(sectorAvg).map(([s,v])=>({s, avg:v.reduce((a,b)=>a+b,0)/v.length})).filter(x=>x.avg>0).sort((a,b)=>b.avg-a.avg)[0]?.s;
        if (best) target = candidates.filter(p=>getSector(p.symbol)===best).sort((a,b)=>parseFloat(b.change_24h)-parseFloat(a.change_24h))[0];
      }

      if (target) {
        const r = await executeTrade({ studentId: botId, classId, action: 'BUY', coin: target.symbol, amountType: 'Dollar Amount', amount: tradeAmt, reasoning: `🤖 Bot (${strategy}): 24h=${parseFloat(target.change_24h||0).toFixed(1)}% 7d=${parseFloat(target.change_7d||0).toFixed(1)}%` });
        if (r.success) tradesExecuted.push({ action: 'BUY', coin: target.symbol, signal: `24h=${parseFloat(target.change_24h||0).toFixed(1)}%` });
        else {
          // Record a stub trade row so the throttle fires even on failed buys — prevents API hammering
          await db.from('trades').insert({ student_id: botId, class_id: classId, action: 'BUY_FAILED', coin: target.symbol, quantity: 0, price: 0, gross_value: 0, fee: 0, cash_after: avail, reasoning: `🤖 Bot: buy failed — ${r.error}` }).catch(() => {});
        }
      }
    }
  }

  return { tradesExecuted, botId };
}
