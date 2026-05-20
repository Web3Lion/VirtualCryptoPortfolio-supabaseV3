import { db } from '@/lib/db';

async function awardBadge(studentId, classId, badgeId) {
  const { data: existing } = await db.from('badges').select('id')
    .eq('student_id', studentId).eq('class_id', classId).eq('badge_id', badgeId).single();
  if (existing) return null;
  const { error } = await db.from('badges').insert({
    student_id: studentId, class_id: classId,
    badge_id: badgeId, earned_at: new Date().toISOString(),
  });
  if (error) return null;
  return badgeId;
}

export async function checkBadgesAfterTrade({ studentId, classId, action, coin, price, reasoning }) {
  const earned = [];
  const give = async (id) => { const b = await awardBadge(studentId, classId, id); if (b) earned.push(b); };

  // ── Fetch all data we need ────────────────────────────────
  const [tradesRes, holdingsRes, portfolioRes, clsRes] = await Promise.all([
    db.from('trades').select('*').eq('student_id', studentId).eq('class_id', classId).order('created_at', { ascending: false }),
    db.from('holdings').select('*').eq('student_id', studentId).eq('class_id', classId).gt('quantity', 0),
    db.from('portfolios').select('cash, fees_paid').eq('student_id', studentId).eq('class_id', classId).single(),
    db.from('classes').select('seed_money').eq('id', classId).single(),
  ]);

  const trades    = tradesRes.data   || [];
  const holdings  = holdingsRes.data || [];
  const portfolio = portfolioRes.data || { cash: 0, fees_paid: 0 };
  const seedMoney = parseFloat(clsRes.data?.seed_money || 10000);
  const totalTrades = trades.length;

  // Get current prices for holdings
  const holdingSymbols = holdings.map(h => h.coin);
  let priceMap = {};
  if (holdingSymbols.length > 0) {
    const { data: prices } = await db.from('price_cache').select('symbol, price').in('symbol', holdingSymbols);
    (prices || []).forEach(p => { priceMap[p.symbol] = parseFloat(p.price); });
  }

  // Calculate portfolio value
  const holdingsVal = holdings.reduce((sum, h) => sum + parseFloat(h.quantity) * (priceMap[h.coin] || parseFloat(h.avg_buy_price)), 0);
  const totalVal    = parseFloat(portfolio.cash) + holdingsVal;
  const returnPct   = ((totalVal / seedMoney) - 1) * 100;
  const totalFees   = trades.reduce((sum, t) => sum + parseFloat(t.fee || 0), 0);

  // ── Trade count badges ────────────────────────────────────
  if (totalTrades >= 1)  await give('first_trade');
  if (totalTrades >= 10) await give('active_trader');
  if (totalTrades >= 25) await give('power_trader');

  // ── Note badges ───────────────────────────────────────────
  const notedTrades = trades.filter(t => t.reasoning?.trim().length > 0);
  const longNotes   = trades.filter(t => t.reasoning?.trim().length >= 50);
  if (notedTrades.length >= 5)  await give('analyst');
  if (notedTrades.length >= 15) await give('researcher');
  if (longNotes.length >= 1)    await give('due_diligence');

  // ── Portfolio return badges ───────────────────────────────
  if (returnPct >= 10)  await give('ten_pct');
  if (returnPct >= 25)  await give('diamond_hands');
  if (returnPct >= 50)  await give('to_the_moon');
  if (returnPct >= 100) await give('portfolio_x2');

  // ── Sell-specific badges ──────────────────────────────────
  if (action === 'SELL') {
    // Find the holding BEFORE this sell (use avg_buy_price from trade history)
    const buyTrades = trades.filter(t => t.action === 'BUY' && t.coin === coin);
    const avgBuy    = buyTrades.length > 0
      ? buyTrades.reduce((sum, t) => sum + parseFloat(t.price) * parseFloat(t.quantity), 0) /
        buyTrades.reduce((sum, t) => sum + parseFloat(t.quantity), 0)
      : 0;

    if (price > avgBuy && avgBuy > 0) {
      // First profit
      await give('first_profit');

      // Doubled up: sold at 2x+ avg buy
      if (price >= avgBuy * 2) await give('doubled_up');

      // Triple threat: sold at 3x+ avg buy
      if (price >= avgBuy * 3) await give('triple_threat');

      // Whale: net gain >= $2000 on this sell
      const thisTrade = trades[0]; // most recent = this trade
      const grossGain = (price - avgBuy) * parseFloat(thisTrade?.quantity || 0);
      if (grossGain >= 2000) await give('whale');

      // HODLer: held 7+ days and sold profitably
      const firstBuy = [...buyTrades].sort((a,b) => new Date(a.created_at) - new Date(b.created_at))[0];
      if (firstBuy) {
        const daysDiff = (Date.now() - new Date(firstBuy.created_at).getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff >= 7) await give('hodler');
      }

      // Stop loss pro: sell at a loss but before -15% drop
      if (price < avgBuy && price >= avgBuy * 0.85) await give('stop_loss_pro');

      // Sharpshooter: last 3 sells all profitable
      const last3Sells = trades.filter(t => t.action === 'SELL').slice(0, 3);
      if (last3Sells.length >= 3) {
        const allProfit = last3Sells.every(t => {
          const buys = trades.filter(b => b.action === 'BUY' && b.coin === t.coin);
          const avg  = buys.length > 0 ? buys.reduce((s,b) => s + parseFloat(b.price), 0) / buys.length : 0;
          return parseFloat(t.price) > avg;
        });
        if (allProfit) await give('sharpshooter');
      }

      // Sniper: last 5 sells all profitable
      const last5Sells = trades.filter(t => t.action === 'SELL').slice(0, 5);
      if (last5Sells.length >= 5) {
        const allProfit = last5Sells.every(t => {
          const buys = trades.filter(b => b.action === 'BUY' && b.coin === t.coin);
          const avg  = buys.length > 0 ? buys.reduce((s,b) => s + parseFloat(b.price), 0) / buys.length : 0;
          return parseFloat(t.price) > avg;
        });
        if (allProfit) await give('sniper');
      }
    }

    // Bought the dip: bought after -10% drop, now selling profitably
    if (price > avgBuy) {
      const sortedBuys = [...buyTrades].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
      if (sortedBuys.length >= 2) {
        const prevBuyPrice = parseFloat(sortedBuys[1].price);
        const latestBuyPrice = parseFloat(sortedBuys[0].price);
        if (latestBuyPrice <= prevBuyPrice * 0.9) await give('bought_dip');
      }
    }

    // Crash survivor: portfolio was down 15%+ at some point, now recovering
    const { data: snapshots } = await db.from('snapshots')
      .select('total_value').eq('student_id', studentId).eq('class_id', classId)
      .eq('snapshot_type', 'daily').order('total_value', { ascending: true }).limit(1);
    const lowestVal = parseFloat(snapshots?.[0]?.total_value || seedMoney);
    const lowestDrop = ((lowestVal - seedMoney) / seedMoney) * 100;
    if (lowestDrop <= -15 && returnPct > -5) await give('crash_survivor');
  }

  // ── Buy-specific badges ───────────────────────────────────
  if (action === 'BUY') {
    // Patient investor: 3+ days since last trade, and portfolio is profitable
    if (trades.length >= 2 && returnPct > 0) {
      const lastTrade    = trades[1]; // index 0 is current trade
      const daysSinceLast = (Date.now() - new Date(lastTrade.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLast >= 3) await give('patient_investor');
    }
  }

  // ── Holdings-based badges ─────────────────────────────────
  // Diversified: 4+ different coins
  if (holdings.length >= 4) await give('diversified');

  // Sector pro: 3+ different sectors
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
  const getSector = sym => { for (const [s, coins] of Object.entries(SECTORS)) if (coins.includes(sym?.toUpperCase())) return s; return 'Other'; };
  const heldSectors = [...new Set(holdings.map(h => getSector(h.coin)))];
  if (heldSectors.length >= 3) await give('sector_pro');

  // Sector specialist: 3+ coins in same sector, all profitable
  const sectorCounts = {};
  holdings.forEach(h => {
    const s = getSector(h.coin);
    if (!sectorCounts[s]) sectorCounts[s] = [];
    sectorCounts[s].push(h);
  });
  for (const [sector, sHoldings] of Object.entries(sectorCounts)) {
    if (sHoldings.length >= 3) {
      const allProfitable = sHoldings.every(h => {
        const curP = priceMap[h.coin] || parseFloat(h.avg_buy_price);
        return curP > parseFloat(h.avg_buy_price);
      });
      if (allProfitable) { await give('sector_specialist'); break; }
    }
  }

  // ── Streak badges ─────────────────────────────────────────
  // Eager investor: traded every day for 5 days straight
  const tradeDays = [...new Set(trades.map(t => new Date(t.created_at).toDateString()))];
  if (tradeDays.length >= 5) {
    let streak = 1;
    const sorted = tradeDays.map(d => new Date(d)).sort((a,b) => b-a);
    for (let i = 1; i < sorted.length; i++) {
      const diff = (sorted[i-1] - sorted[i]) / (1000*60*60*24);
      if (diff <= 1.5) streak++; else break;
    }
    if (streak >= 5)  await give('eager_investor');
    if (streak >= 10) await give('fomo_investor');
  }

  // ── Fee badges ────────────────────────────────────────────
  if (totalTrades >= 10 && totalFees < 50) await give('fee_conscious');

  // ── Grant ClassReward tokens for each newly earned badge ─────
  let tokensAwarded = 0;
  if (earned.length > 0) {
    try {
      const { data: rewardCfg } = await db.from('class_reward_config')
        .select('enabled, badge_reward_tokens').eq('class_id', classId).single();
      if (rewardCfg?.enabled && rewardCfg.badge_reward_tokens > 0) {
        await db.from('class_reward_ledger').insert(
          earned.map(badgeId => ({
            student_id: studentId, class_id: classId,
            tokens: rewardCfg.badge_reward_tokens,
            reason: `badge:${badgeId}`,
          }))
        );
        tokensAwarded = earned.length * rewardCfg.badge_reward_tokens;
      }
    } catch (e) { console.error('ClassReward grant error:', e); }
  }

  return { badge: earned[0] || null, tokensAwarded };
}
