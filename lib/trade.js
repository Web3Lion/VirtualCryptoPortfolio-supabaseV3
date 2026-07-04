import { db, getMarketStatus } from './db';
import { getLivePrice } from './prices';

function fmtUSD(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

// Computes the student's true equity: cash + all holdings at market price - borrowed capital.
// Pass recentPrice / recentCoin so newly bought coins (not yet in price_cache) resolve correctly.
async function computePortfolioTotal(studentId, classId, cash, recentCoin = null, recentPrice = null) {
  const { data: allHoldings } = await db.from('holdings')
    .select('coin, quantity, margin_borrowed')
    .eq('student_id', studentId)
    .eq('class_id', classId);

  if (!allHoldings?.length) return cash;

  const symbols = [...new Set(allHoldings.map(h => h.coin))];
  const { data: cached } = await db.from('price_cache').select('symbol, price').in('symbol', symbols);
  const pm = {};
  (cached || []).forEach(r => { pm[r.symbol] = parseFloat(r.price); });
  if (recentCoin && recentPrice) pm[recentCoin] = recentPrice;

  let holdingsVal = 0, totalBorrowed = 0;
  allHoldings.forEach(h => {
    holdingsVal   += parseFloat(h.quantity) * (pm[h.coin] || 0);
    totalBorrowed += parseFloat(h.margin_borrowed || 0);
  });

  return cash + holdingsVal - totalBorrowed;
}

async function checkRestrictions(market, studentId, classId) {
  if (market.frozen) return `🚫 ${market.freezeReason}`;
  if (market.paused) return '⏸ Simulation is paused';
  if (market.tradingHoursOn) {
    const now = new Date().toLocaleTimeString('en-US', { hour12: false, timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit' });
    if (now < market.tradingHoursStart || now > market.tradingHoursEnd)
      return `⏰ Trading hours are ${market.tradingHoursStart}–${market.tradingHoursEnd} ET.`;
  }
  if (market.dailyLimitOn) {
    const today = new Date(); today.setHours(0,0,0,0);
    const { count } = await db.from('trades').select('*', { count: 'exact', head: true }).eq('student_id', studentId).eq('class_id', classId).gte('created_at', today.toISOString());
    if ((count || 0) >= market.dailyLimitN) return `📵 Daily trade limit reached (${market.dailyLimitN}/day).`;
  }
  return null;
}

// Pass knownPrice for automated executions (bot/DCA/orders/margin calls) that
// already run right after the cron's own bulk refresh — skips re-fetching a
// price that's only moments old. Omit it (the default) for student-initiated
// trades, which always get a genuine live price at that exact instant so a
// trade can never be filled off a stale displayed price.
export async function executeTrade({ studentId, classId, action, coin, amountType, amount, reasoning = '', leverageMultiplier = 1, knownPrice = null }) {
  const market = await getMarketStatus(classId);

  if (leverageMultiplier > 1 && !market.marginEnabled)
    return { success: false, error: '❌ Leverage trading is not enabled by your teacher.' };
  if (action === 'SHORT' && !market.shortEnabled)
    return { success: false, error: '❌ Short selling is not enabled by your teacher.' };

  // Clamp leverage to teacher-configured max
  const leverage = (market.marginEnabled && leverageMultiplier >= 1)
    ? Math.min(Math.max(leverageMultiplier, 1), market.marginMult)
    : 1;

  const restricted = await checkRestrictions(market, studentId, classId);
  if (restricted) return { success: false, error: restricted };

  let rawPrice = knownPrice || await getLivePrice(coin);
  if (!rawPrice) {
    // Fall back to price_cache so bot/limit-order trades still execute when API is rate-limited
    const { data: cached } = await db.from('price_cache').select('price').eq('symbol', coin).single();
    rawPrice = cached ? parseFloat(cached.price) : null;
  }
  if (!rawPrice) return { success: false, error: `❌ Could not fetch price for ${coin}.` };

  // Apply active market events to execution price
  let price = rawPrice;
  let marketEventTag = '';
  if (market.bullRun) {
    price *= market.bullMult;
    marketEventTag = `[EVENT:bull_run:${market.bullMult}]`;
  }
  if (market.flashCrash) {
    price *= market.flashCrashMult;
    marketEventTag = `[EVENT:flash_crash:${market.flashCrashMult}]`;
  }
  if (market.flashSale?.coin === coin) {
    price *= market.flashSale.factor;
    marketEventTag = `[EVENT:flash_sale:${coin}:${Math.round((1 - market.flashSale.factor) * 100)}]`;
  }

  const [portfolioRes, holdingRes] = await Promise.all([
    db.from('portfolios').select('cash, fees_paid').eq('student_id', studentId).eq('class_id', classId).single(),
    db.from('holdings').select('*').eq('student_id', studentId).eq('class_id', classId).eq('coin', coin).single(),
  ]);

  const portfolio = portfolioRes.data;
  if (!portfolio) return { success: false, error: 'Portfolio not found.' };
  const cash        = parseFloat(portfolio.cash);
  const feesPaid    = parseFloat(portfolio.fees_paid);
  const holding     = holdingRes.data;
  const currentQty  = holding ? parseFloat(holding.quantity) : 0;
  const { feeRate } = market;

  let quantity, grossValue, fee, newCash, newFees, recordedAction, postMortem = null;

  if (action === 'BUY') {
    quantity   = amountType === 'Dollar Amount' ? amount / price : amount;
    grossValue = price * quantity;
    fee        = grossValue * feeRate;

    if (currentQty < -0.000001) {
      // ── COVER a short position ──────────────────────────────
      const maxCover = Math.abs(currentQty);
      quantity   = Math.min(quantity, maxCover);
      grossValue = price * quantity;
      fee        = grossValue * feeRate;
      if (grossValue + fee > cash)
        return { success: false, error: `❌ Not enough cash. Need ${fmtUSD(grossValue + fee)}, have ${fmtUSD(cash)}.` };
      newCash = cash - grossValue - fee;
      newFees = feesPaid + fee;
      recordedAction = 'COVER';

      const remaining = currentQty + quantity;
      if (Math.abs(remaining) < 0.000001) {
        await db.from('holdings').delete().eq('student_id', studentId).eq('class_id', classId).eq('coin', coin);
      } else {
        await db.from('holdings').update({ quantity: remaining, updated_at: new Date().toISOString() }).eq('student_id', studentId).eq('class_id', classId).eq('coin', coin);
      }
    } else {
      // ── Regular / leveraged long buy ────────────────────────
      // borrowed = the portion paid by the broker (not the student)
      const borrowed    = grossValue * (1 - 1 / leverage);
      const cashRequired = grossValue / leverage + fee;
      if (cashRequired > cash)
        return { success: false, error: `❌ Not enough cash. Need ${fmtUSD(cashRequired)} (${leverage}× leverage), have ${fmtUSD(cash)}.` };
      newCash = cash - grossValue / leverage - fee;
      newFees = feesPaid + fee;
      recordedAction = 'BUY';

      if (holding && currentQty > 0) {
        const newQty        = currentQty + quantity;
        const newAvg        = (currentQty * parseFloat(holding.avg_buy_price) + quantity * price) / newQty;
        const newBorrowed   = parseFloat(holding.margin_borrowed || 0) + borrowed;
        await db.from('holdings').update({ quantity: newQty, avg_buy_price: newAvg, margin_borrowed: newBorrowed, updated_at: new Date().toISOString() }).eq('student_id', studentId).eq('class_id', classId).eq('coin', coin);
      } else {
        await db.from('holdings').insert({ student_id: studentId, class_id: classId, coin, quantity, avg_buy_price: price, margin_borrowed: borrowed });
      }
    }
  } else if (action === 'SELL') {
    if (!holding || currentQty <= 0.000001)
      return { success: false, error: `❌ You don't own any ${coin}.` };
    quantity = amountType === 'Dollar Amount' ? amount / price : amount;
    if (quantity > currentQty + 0.000001)
      return { success: false, error: `❌ You only own ${currentQty.toFixed(6)} ${coin}.` };

    grossValue = price * quantity;
    fee        = grossValue * feeRate;

    // Repay proportional borrowed amount for leveraged positions
    const totalBorrowed = parseFloat(holding.margin_borrowed || 0);
    const repay         = totalBorrowed > 0 ? totalBorrowed * (quantity / currentQty) : 0;
    newCash = cash + grossValue - repay - fee;
    newFees = feesPaid + fee;
    recordedAction = 'SELL';

    const remaining         = currentQty - quantity;
    const remainingBorrowed = Math.max(0, totalBorrowed - repay);
    if (remaining <= 0.000001) {
      await db.from('holdings').delete().eq('student_id', studentId).eq('class_id', classId).eq('coin', coin);
      // Compute post-mortem for fully closed position
      const avgEntry   = parseFloat(holding.avg_buy_price);
      const totalCost  = avgEntry * currentQty;
      const proceeds   = grossValue - fee;
      const pnl        = proceeds - totalCost;
      const pnlPct     = totalCost > 0 ? (pnl / totalCost) * 100 : 0;
      const { data: firstBuy } = await db.from('trades')
        .select('created_at').eq('student_id', studentId).eq('class_id', classId)
        .eq('coin', coin).eq('action', 'BUY').order('created_at', { ascending: true }).limit(1).single();
      postMortem = {
        coin, avgEntry, exitPrice: price,
        totalCost, proceeds, pnl, pnlPct,
        holdingDays: firstBuy ? Math.round((Date.now() - new Date(firstBuy.created_at).getTime()) / (1000 * 86400)) : 0,
      };
    } else {
      await db.from('holdings').update({ quantity: remaining, margin_borrowed: remainingBorrowed, updated_at: new Date().toISOString() }).eq('student_id', studentId).eq('class_id', classId).eq('coin', coin);
    }
  } else if (action === 'SHORT') {
    if (currentQty > 0.000001)
      return { success: false, error: `❌ You already hold ${coin}. Sell your long position before shorting.` };

    quantity   = amountType === 'Dollar Amount' ? amount / price : amount;
    grossValue = price * quantity;
    fee        = grossValue * feeRate;
    // Student receives the proceeds from selling borrowed coins
    newCash = cash + grossValue - fee;
    newFees = feesPaid + fee;
    recordedAction = 'SHORT';

    if (holding && currentQty < -0.000001) {
      // Add to existing short position (weighted avg entry price)
      const absQty = Math.abs(currentQty);
      const newQty = currentQty - quantity;
      const newAvg = (absQty * parseFloat(holding.avg_buy_price) + quantity * price) / (absQty + quantity);
      await db.from('holdings').update({ quantity: newQty, avg_buy_price: newAvg, updated_at: new Date().toISOString() }).eq('student_id', studentId).eq('class_id', classId).eq('coin', coin);
    } else {
      await db.from('holdings').insert({ student_id: studentId, class_id: classId, coin, quantity: -quantity, avg_buy_price: price, margin_borrowed: 0 });
    }
  } else {
    return { success: false, error: 'Invalid action' };
  }

  // Update portfolio + record trade (holdings already updated above)
  const storedReasoning = marketEventTag ? `${marketEventTag}${reasoning}` : reasoning;
  await Promise.all([
    db.from('portfolios').update({ cash: newCash, fees_paid: newFees, updated_at: new Date().toISOString() }).eq('student_id', studentId).eq('class_id', classId),
    db.from('trades').insert({ student_id: studentId, class_id: classId, action: recordedAction, coin, quantity, price, gross_value: grossValue, fee, cash_after: newCash, reasoning: storedReasoning }),
  ]);

  // Compute true portfolio value (cash + all holdings at current prices) for the snapshot
  const trueTotal = await computePortfolioTotal(studentId, classId, newCash, coin, price);
  await db.from('snapshots').insert({ student_id: studentId, class_id: classId, total_value: trueTotal, cash: newCash, snapshot_type: 'intraday' });

  return { success: true, message: `✅ ${recordedAction} ${quantity.toFixed(6)} ${coin} @ ${fmtUSD(price)}`, price, quantity, fee, newCash, action: recordedAction, postMortem };
}

export async function executeSellAll({ studentId, classId }) {
  const market = await getMarketStatus(classId);
  const restricted = await checkRestrictions(market, studentId, classId);
  if (restricted) return { success: false, error: restricted };

  const [portfolioRes, holdingsRes] = await Promise.all([
    db.from('portfolios').select('cash, fees_paid').eq('student_id', studentId).eq('class_id', classId).single(),
    db.from('holdings').select('*').eq('student_id', studentId).eq('class_id', classId).gt('quantity', 0),
  ]);

  const holdings = holdingsRes.data || [];
  if (!holdings.length) return { success: false, error: 'No holdings to sell.' };

  const prices = await Promise.all(holdings.map(h => getLivePrice(h.coin)));
  let runningCash = parseFloat(portfolioRes.data.cash);
  let runningFees = parseFloat(portfolioRes.data.fees_paid);
  const tradeRows = [];

  holdings.forEach((h, i) => {
    const price = prices[i]; if (!price) return;
    const qty      = parseFloat(h.quantity);
    const gross    = price * qty;
    const fee      = gross * market.feeRate;
    const borrowed = parseFloat(h.margin_borrowed || 0);
    runningCash += gross - borrowed - fee;
    runningFees += fee;
    tradeRows.push({ student_id: studentId, class_id: classId, action: 'SELL', coin: h.coin, quantity: qty, price, gross_value: gross, fee, cash_after: runningCash, reasoning: '💥 SELL ALL' });
  });

  await Promise.all([
    db.from('portfolios').update({ cash: runningCash, fees_paid: runningFees, updated_at: new Date().toISOString() }).eq('student_id', studentId).eq('class_id', classId),
    db.from('holdings').delete().eq('student_id', studentId).eq('class_id', classId).gt('quantity', 0),
    db.from('trades').insert(tradeRows),
    db.from('snapshots').insert({ student_id: studentId, class_id: classId, total_value: runningCash, cash: runningCash, snapshot_type: 'intraday' }),
  ]);

  return { success: true, message: `✅ Sold all ${holdings.length} positions.` };
}
