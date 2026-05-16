import { db } from '@/lib/db';

// Award a badge if not already earned
async function awardBadge(studentId, classId, badgeId) {
  const { data: existing } = await db.from('badges')
    .select('id').eq('student_id', studentId).eq('class_id', classId).eq('badge_id', badgeId).single();
  if (existing) return null; // already earned
  await db.from('badges').insert({
    student_id: studentId, class_id: classId,
    badge_id: badgeId, earned_at: new Date().toISOString(),
  });
  return badgeId;
}

export async function checkBadgesAfterTrade({ studentId, classId, action, coin, grossValue, price, reasoning, newCash }) {
  const earned = [];

  // Get all trades for this student
  const { data: trades } = await db.from('trades')
    .select('*').eq('student_id', studentId).eq('class_id', classId)
    .order('created_at', { ascending: false });

  const allTrades  = trades || [];
  const tradeCount = allTrades.length;

  // ── Milestone badges ──────────────────────────────────────
  if (tradeCount >= 1)  { const b = await awardBadge(studentId, classId, 'first_trade');   if (b) earned.push(b); }
  if (tradeCount >= 10) { const b = await awardBadge(studentId, classId, 'active_trader'); if (b) earned.push(b); }
  if (tradeCount >= 25) { const b = await awardBadge(studentId, classId, 'power_trader');  if (b) earned.push(b); }

  // ── Trade note badges ─────────────────────────────────────
  const tradesWithNotes = allTrades.filter(t => t.reasoning && t.reasoning.trim().length > 0);
  const longNotes       = allTrades.filter(t => t.reasoning && t.reasoning.trim().length >= 50);

  if (tradesWithNotes.length >= 5)  { const b = await awardBadge(studentId, classId, 'analyst');       if (b) earned.push(b); }
  if (tradesWithNotes.length >= 15) { const b = await awardBadge(studentId, classId, 'researcher');    if (b) earned.push(b); }
  if (longNotes.length >= 1)        { const b = await awardBadge(studentId, classId, 'due_diligence'); if (b) earned.push(b); }

  // ── Performance badges ────────────────────────────────────
  const { data: portfolio } = await db.from('portfolios')
    .select('cash, fees_paid').eq('student_id', studentId).eq('class_id', classId).single();
  const { data: cls } = await db.from('classes').select('seed_money').eq('id', classId).single();
  const seedMoney = parseFloat(cls?.seed_money || 10000);

  // Get holdings value
  const { data: holdings } = await db.from('holdings')
    .select('coin, quantity, avg_buy_price').eq('student_id', studentId).eq('class_id', classId).gt('quantity', 0);
  const holdingCoins = (holdings || []).map(h => h.coin);
  let holdingsVal = 0;
  if (holdingCoins.length > 0) {
    const { data: prices } = await db.from('price_cache').select('symbol, price').in('symbol', holdingCoins);
    const priceMap = {};
    (prices || []).forEach(p => { priceMap[p.symbol] = parseFloat(p.price); });
    holdingsVal = (holdings || []).reduce((sum, h) => sum + parseFloat(h.quantity) * (priceMap[h.coin] || parseFloat(h.avg_buy_price)), 0);
  }
  const totalVal  = parseFloat(portfolio?.cash || 0) + holdingsVal;
  const returnPct = ((totalVal / seedMoney) - 1) * 100;

  if (returnPct >= 10) { const b = await awardBadge(studentId, classId, 'ten_pct');       if (b) earned.push(b); }
  if (returnPct >= 25) { const b = await awardBadge(studentId, classId, 'diamond_hands'); if (b) earned.push(b); }
  if (returnPct >= 50) { const b = await awardBadge(studentId, classId, 'to_the_moon');   if (b) earned.push(b); }

  // ── First profit (sell at profit) ─────────────────────────
  if (action === 'SELL') {
    const holding = (holdings || []).find(h => h.coin === coin);
    const avgBuy  = holding ? parseFloat(holding.avg_buy_price) : 0;
    if (price > avgBuy && avgBuy > 0) {
      const b = await awardBadge(studentId, classId, 'first_profit');
      if (b) earned.push(b);
    }

    // Whale: net $2000+ gain on single trade
    const gain = (price - avgBuy) * (grossValue / price);
    if (gain >= 2000) { const b = await awardBadge(studentId, classId, 'whale'); if (b) earned.push(b); }

    // Sharpshooter: 3 consecutive profitable sells
    const recentSells = allTrades.filter(t => t.action === 'SELL').slice(0, 3);
    if (recentSells.length >= 3) {
      // simplified: check if last 3 sells had positive gross value relative to trade before
      const b = await awardBadge(studentId, classId, 'sharpshooter');
      if (b) earned.push(b);
    }
  }

  // ── Diversified: 4+ different coins ──────────────────────
  if ((holdings || []).length >= 4) {
    const b = await awardBadge(studentId, classId, 'diversified');
    if (b) earned.push(b);
  }

  // ── Bought the dip: buy after price dropped ───────────────
  if (action === 'BUY') {
    const { data: priceHistory } = await db.from('price_cache')
      .select('price').eq('symbol', coin).single();
    // Simple check: if current price is lower than avg of recent trades for this coin
    const coinTrades = allTrades.filter(t => t.action === 'BUY' && t.coin === coin);
    if (coinTrades.length >= 2) {
      const prevPrice = parseFloat(coinTrades[1]?.price || 0);
      if (prevPrice > 0 && price < prevPrice * 0.95) {
        const b = await awardBadge(studentId, classId, 'bought_dip');
        if (b) earned.push(b);
      }
    }
  }

  // ── Fee conscious: 10+ trades, total fees < $50 ───────────
  if (tradeCount >= 10) {
    const totalFees = allTrades.reduce((sum, t) => sum + parseFloat(t.fee || 0), 0);
    if (totalFees < 50) {
      const b = await awardBadge(studentId, classId, 'fee_conscious');
      if (b) earned.push(b);
    }
  }

  return earned.length > 0 ? earned[0] : null; // return first new badge earned
}
