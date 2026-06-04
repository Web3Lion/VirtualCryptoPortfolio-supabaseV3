import { db, getMarketStatus, getAllConfig } from '@/lib/db';
import { fetchBulkPrices, GECKO_ID_MAP } from '@/lib/prices';
import { executeTrade } from '@/lib/trade';
import { checkBadgesAfterOrderExecution } from '@/app/api/orders/badge-check';
import { runBot } from '@/lib/bot';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const report = { pricesUpdated: 0, intradaySnapshots: 0, dailySnapshots: 0, ordersExecuted: 0, ordersFailed: 0, errors: [] };

  // ── 1. Update price cache ─────────────────────────────────────
  let freshPriceMap = {};
  try {
    const [{ data: activeCoins }, { data: heldCoins }] = await Promise.all([
      db.from('class_coins').select('symbol,gecko_id').eq('active', true),
      db.from('holdings').select('coin'),
    ]);

    // Union of active class coins + all coins currently held by any student
    const symbolSet = new Set([
      ...(activeCoins || []).map(c => c.symbol),
      ...(heldCoins  || []).map(h => h.coin),
    ]);
    const symbols = [...symbolSet];

    if (symbols.length) {
      const extraIds = {};
      (activeCoins || []).forEach(c => {
        if (c.gecko_id && !GECKO_ID_MAP[c.symbol?.toUpperCase()]) extraIds[c.symbol.toUpperCase()] = c.gecko_id;
      });
      // Also get gecko_ids for held-but-inactive coins
      const inactiveHeld = symbols.filter(s => !(activeCoins || []).find(c => c.symbol === s));
      if (inactiveHeld.length) {
        const { data: inactiveCoins } = await db.from('class_coins').select('symbol,gecko_id').in('symbol', inactiveHeld);
        (inactiveCoins || []).forEach(c => {
          if (c.gecko_id && !GECKO_ID_MAP[c.symbol?.toUpperCase()]) extraIds[c.symbol.toUpperCase()] = c.gecko_id;
        });
      }

      const priceMap = await fetchBulkPrices(symbols, extraIds);
      const rows = Object.entries(priceMap).map(([symbol, data]) => ({
        symbol,
        price:      data.price,
        change_1h:  data.change1h,
        change_24h: data.change24h,
        change_7d:  data.change7d,
        updated_at: new Date().toISOString(),
      }));
      if (rows.length > 0) {
        await db.from('price_cache').upsert(rows, { onConflict: 'symbol' });
        report.pricesUpdated = rows.length;
      }
      Object.entries(priceMap).forEach(([symbol, data]) => { freshPriceMap[symbol] = data.price; });
    }
  } catch (e) {
    report.errors.push(`prices: ${e.message}`);
  }

  // ── 2. Snapshots: intraday every run, daily once per day ──────
  try {
    const now = new Date();
    const todayMidnight = new Date(now);
    todayMidnight.setUTCHours(0, 0, 0, 0);
    const todayIso = todayMidnight.toISOString();

    const { data: classes } = await db.from('classes').select('id');

    for (const cls of classes || []) {
      try {
        const { data: classStudents } = await db.from('class_students').select('student_id').eq('class_id', cls.id);
        if (!classStudents?.length) continue;
        const studentIds = classStudents.map(r => r.student_id);

        const { data: existingDaily } = await db.from('snapshots')
          .select('student_id').eq('class_id', cls.id).eq('snapshot_type', 'daily')
          .gte('created_at', todayIso).in('student_id', studentIds);
        const alreadyHaveDaily = new Set((existingDaily || []).map(s => s.student_id));

        const [portfoliosRes, holdingsRes] = await Promise.all([
          db.from('portfolios').select('student_id, cash').in('student_id', studentIds).eq('class_id', cls.id),
          db.from('holdings').select('student_id, coin, quantity, margin_borrowed').in('student_id', studentIds).eq('class_id', cls.id),
        ]);

        // Fill missing prices from cache
        const holdingCoins = [...new Set((holdingsRes.data || []).map(h => h.coin))];
        const missingCoins = holdingCoins.filter(c => !freshPriceMap[c]);
        if (missingCoins.length) {
          const { data: cached } = await db.from('price_cache').select('symbol, price').in('symbol', missingCoins);
          (cached || []).forEach(r => { freshPriceMap[r.symbol] = parseFloat(r.price); });
        }

        const portfolioMap = {};
        (portfoliosRes.data || []).forEach(p => { portfolioMap[p.student_id] = parseFloat(p.cash); });
        const holdingsByStudent = {};
        (holdingsRes.data || []).forEach(h => {
          if (!holdingsByStudent[h.student_id]) holdingsByStudent[h.student_id] = [];
          holdingsByStudent[h.student_id].push(h);
        });

        const intradayRows = [], dailyRows = [];
        for (const studentId of studentIds) {
          const cash     = portfolioMap[studentId] ?? 0;
          const holdings = holdingsByStudent[studentId] || [];
          let holdingsVal = 0, borrowed = 0;
          holdings.forEach(h => {
            const price = freshPriceMap[h.coin] || parseFloat(h.avg_buy_price) || 0;
            holdingsVal += parseFloat(h.quantity) * price;
            borrowed    += parseFloat(h.margin_borrowed || 0);
          });
          const totalValue = cash + holdingsVal - borrowed;
          intradayRows.push({ student_id: studentId, class_id: cls.id, total_value: totalValue, cash, snapshot_type: 'intraday' });
          if (!alreadyHaveDaily.has(studentId)) {
            dailyRows.push({ student_id: studentId, class_id: cls.id, total_value: totalValue, cash, snapshot_type: 'daily' });
          }
        }

        if (intradayRows.length) {
          await db.from('snapshots').insert(intradayRows);
          report.intradaySnapshots += intradayRows.length;
        }
        if (dailyRows.length) {
          await db.from('snapshots').insert(dailyRows);
          report.dailySnapshots += dailyRows.length;
        }
      } catch (e) {
        report.errors.push(`snapshots[${cls.id}]: ${e.message}`);
      }
    }
  } catch (e) {
    report.errors.push(`snapshots: ${e.message}`);
  }

  // ── 3. Execute pending limit orders ──────────────────────────
  try {
    const { data: pendingOrders, error: ordersErr } = await db.from('pending_orders')
      .select('*').eq('status', 'pending');

    if (ordersErr?.code === '42P01') {
      // Table not created yet — skip silently
    } else {
      for (const order of pendingOrders || []) {
        try {
          const currentPrice = freshPriceMap[order.coin]
            || (await db.from('price_cache').select('price').eq('symbol', order.coin).single()).data?.price;
          if (!currentPrice) continue;

          const price = parseFloat(currentPrice), limitPrice = parseFloat(order.limit_price);
          const isStop = order.action === 'SELL_STOP' || order.action === 'BUY_STOP';
          const shouldFire =
            (order.action === 'BUY'       && price <= limitPrice) ||
            (order.action === 'SELL'      && price >= limitPrice) ||
            (order.action === 'SHORT'     && price >= limitPrice) ||
            (order.action === 'SELL_STOP' && price <= limitPrice) ||
            (order.action === 'BUY_STOP'  && price >= limitPrice);
          if (!shouldFire) continue;

          const mkt = await getMarketStatus(order.class_id);
          if (mkt.frozen || mkt.paused) continue;

          const tradeAction = order.action === 'SELL_STOP' ? 'SELL' : order.action === 'BUY_STOP' ? 'BUY' : order.action;
          const result = await executeTrade({
            studentId:          order.student_id,
            classId:            order.class_id,
            action:             tradeAction,
            coin:               order.coin,
            amountType:         order.amount_type,
            amount:             parseFloat(order.amount),
            leverageMultiplier: parseFloat(order.leverage_multiplier) || 1,
            reasoning:          order.reasoning || (isStop ? `🛑 Stop-loss triggered @ $${limitPrice.toLocaleString()}` : `📋 Limit order triggered @ $${limitPrice.toLocaleString()}`),
          });

          if (result.success) {
            const executedAt = new Date().toISOString();
            await db.from('pending_orders').update({ status: 'executed', executed_at: executedAt, executed_price: result.price }).eq('id', order.id);
            report.ordersExecuted++;
            checkBadgesAfterOrderExecution({
              studentId: order.student_id, classId: order.class_id,
              order: { ...order, executed_at: executedAt },
            }).catch(() => {});
          } else {
            await db.from('pending_orders').update({ status: 'failed', fail_reason: result.error }).eq('id', order.id);
            report.ordersFailed++;
          }
        } catch (e) {
          report.errors.push(`order[${order.id}]: ${e.message}`);
        }
      }
    }
  } catch (e) {
    report.errors.push(`orders: ${e.message}`);
  }

  // ── 4. Run Satoshi Botomoto for each class where bot is enabled ──
  try {
    const { data: classes } = await db.from('classes').select('id, seed_money');
    const cfg = await getAllConfig();
    const mktStatus = await getMarketStatus(null).catch(() => ({ frozen: false, paused: false }));
    if (!mktStatus?.frozen && !mktStatus?.paused) {
      for (const cls of (classes || [])) {
        const enabled = cfg[`BOT_ENABLED_${cls.id}`] === '1';
        if (!enabled) continue;
        const config = {
          strategy:     cfg[`BOT_STRATEGY_${cls.id}`]     || 'momentum',
          risk:         cfg[`BOT_RISK_${cls.id}`]          || 'moderate',
          maxPositions: parseInt(cfg[`BOT_MAX_POS_${cls.id}`]) || 5,
          buyThreshold: parseFloat(cfg[`BOT_BUY_THR_${cls.id}`]) || 2,
          takeProfit:   parseFloat(cfg[`BOT_TAKE_PROFIT_${cls.id}`]) || 15,
          stopLoss:     parseFloat(cfg[`BOT_STOP_LOSS_${cls.id}`]) || 10,
          seedMoney:    cls.seed_money || 10000,
        };
        const botMkt = await getMarketStatus(cls.id).catch(() => ({ frozen: false, paused: false }));
        if (botMkt?.frozen || botMkt?.paused) continue;
        const result = await runBot({ classId: cls.id, config });
        if (result?.tradesExecuted?.length) report.errors.push(`bot[${cls.id}]: ${result.tradesExecuted.length} trades`);
      }
    }
  } catch (e) {
    report.errors.push(`bot: ${e.message}`);
  }

  // ── 5. Execute due DCA orders ─────────────────────────────────
  try {
    const now = new Date();
    const { data: dueDca, error: dcaErr } = await db.from('dca_orders')
      .select('*').eq('active', true).lte('next_run_at', now.toISOString());

    if (!dcaErr && dueDca?.length) {
      report.dcaExecuted = 0;
      for (const dca of dueDca) {
        try {
          const mkt = await getMarketStatus(dca.class_id);
          if (mkt.frozen || mkt.paused) continue;
          const result = await executeTrade({
            studentId: dca.student_id, classId: dca.class_id,
            action: 'BUY', coin: dca.coin,
            amountType: 'Dollar Amount', amount: parseFloat(dca.amount_usd),
            leverageMultiplier: 1,
            reasoning: `🔄 DCA — automatic ${dca.frequency} buy`,
          });
          if (result.success) {
            const nextRun = new Date(dca.next_run_at);
            if (dca.frequency === 'daily') nextRun.setDate(nextRun.getDate() + 1);
            else nextRun.setDate(nextRun.getDate() + 7);
            await db.from('dca_orders').update({
              last_run_at: now.toISOString(),
              next_run_at: nextRun.toISOString(),
              runs_count: (dca.runs_count || 0) + 1,
            }).eq('id', dca.id);
            report.dcaExecuted++;
          }
        } catch (e) {
          report.errors.push(`dca[${dca.id}]: ${e.message}`);
        }
      }
    }
  } catch (e) {
    // DCA table may not exist yet — skip silently
  }

  return Response.json({ success: true, ...report });
}
