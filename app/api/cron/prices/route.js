import { db, getMarketStatus, getAllConfig } from '@/lib/db';
import { refreshPricesIfStale } from '@/lib/prices';
import { executeTrade } from '@/lib/trade';
import { checkBadgesAfterOrderExecution } from '@/app/api/orders/badge-check';
import { checkMilestones } from '@/app/api/trade/badge-check';
import { runBot } from '@/lib/bot';
import { sendWatchlistAlertEmail } from '@/lib/email';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const report = { pricesUpdated: 0, intradaySnapshots: 0, dailySnapshots: 0, ordersExecuted: 0, ordersFailed: 0, errors: [] };

  // ── 1. Update price cache — shared staleness gate with trade execution.
  // Skips the CoinGecko call entirely if a trade already refreshed within
  // the last 30 min; freshPriceMap is always fully populated either way.
  let freshPriceMap = {};
  try {
    const result = await refreshPricesIfStale();
    report.pricesUpdated = result.count;
    freshPriceMap = result.priceMap;
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

        const { data: clsInfo } = await db.from('classes').select('seed_money').eq('id', cls.id).single();
        const seedMoney = parseFloat(clsInfo?.seed_money || 10000);

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
          const returnPct  = ((totalValue / seedMoney) - 1) * 100;
          intradayRows.push({ student_id: studentId, class_id: cls.id, total_value: totalValue, cash, snapshot_type: 'intraday' });
          if (!alreadyHaveDaily.has(studentId)) {
            dailyRows.push({ student_id: studentId, class_id: cls.id, total_value: totalValue, cash, snapshot_type: 'daily' });
          }
          // Check portfolio milestones silently — badges awarded if newly crossed
          checkMilestones({ studentId, classId: cls.id, returnPct }).catch(() => {});
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

  // ── 3. Margin call liquidations ──────────────────────────────
  try {
    const mktGlobal = await getMarketStatus(null);
    if (mktGlobal.marginCallEnabled && !mktGlobal.frozen && !mktGlobal.paused) {
      const threshold = mktGlobal.marginCallThreshold;

      // Get all leveraged holdings (margin_borrowed > 0)
      const { data: leveraged } = await db.from('holdings')
        .select('student_id, class_id, coin, quantity, avg_buy_price, margin_borrowed')
        .gt('margin_borrowed', 0).gt('quantity', 0);

      report.marginCalls = 0;
      for (const h of leveraged || []) {
        const currentPrice = freshPriceMap[h.coin]
          || (await db.from('price_cache').select('price').eq('symbol', h.coin).single()).data?.price;
        if (!currentPrice) continue;

        const price = parseFloat(currentPrice);
        const qty   = parseFloat(h.quantity);
        const borrowed = parseFloat(h.margin_borrowed);
        const equity = qty * price - borrowed;
        const originalEquity = qty * parseFloat(h.avg_buy_price) - borrowed;

        // Trigger if equity has fallen below threshold % of original
        if (originalEquity > 0 && equity / originalEquity < threshold) {
          try {
            const result = await executeTrade({
              studentId: h.student_id, classId: h.class_id,
              action: 'SELL', coin: h.coin,
              amountType: 'Coin Amount', amount: qty,
              leverageMultiplier: 1,
              knownPrice: price,
              reasoning: `⚠️ Margin call — position auto-liquidated (equity < ${Math.round(threshold * 100)}% of original)`,
            });
            if (result.success) report.marginCalls++;
          } catch {}
        }
      }
    }
  } catch (e) {
    report.errors.push(`margin calls: ${e.message}`);
  }

  // ── 4. Execute pending limit orders ──────────────────────────
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
            knownPrice:         price,
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

  // ── 5. Settle expired options ────────────────────────────────
  try {
    const now = new Date();
    const { data: expired } = await db.from('options_positions')
      .select('*').eq('status', 'open').lte('expires_at', now.toISOString());

    for (const opt of expired || []) {
      try {
        const price = freshPriceMap[opt.coin]
          || (await db.from('price_cache').select('price').eq('symbol', opt.coin).single()).data?.price;
        const currentPrice = parseFloat(price || 0);
        const strike = parseFloat(opt.strike_price);
        const contracts = parseFloat(opt.contracts);

        const intrinsic = opt.option_type === 'call'
          ? Math.max(0, currentPrice - strike)
          : Math.max(0, strike - currentPrice);
        const payout = parseFloat((intrinsic * contracts).toFixed(2));

        if (payout > 0) {
          const { data: portfolio } = await db.from('portfolios').select('cash')
            .eq('student_id', opt.student_id).eq('class_id', opt.class_id).single();
          if (portfolio) {
            await db.from('portfolios').update({ cash: parseFloat(portfolio.cash) + payout })
              .eq('student_id', opt.student_id).eq('class_id', opt.class_id);
          }
          await db.from('options_positions').update({ status: 'exercised', payout }).eq('id', opt.id);
        } else {
          await db.from('options_positions').update({ status: 'expired', payout: 0 }).eq('id', opt.id);
        }
      } catch (e) {
        report.errors.push(`options[${opt.id}]: ${e.message}`);
      }
    }
  } catch (_) {
    // options table may not exist yet
  }

  // ── 6. Execute due DCA orders ─────────────────────────────────
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
          const dcaPrice = freshPriceMap[dca.coin]
            || (await db.from('price_cache').select('price').eq('symbol', dca.coin).single()).data?.price;
          const result = await executeTrade({
            studentId: dca.student_id, classId: dca.class_id,
            action: 'BUY', coin: dca.coin,
            amountType: 'Dollar Amount', amount: parseFloat(dca.amount_usd),
            leverageMultiplier: 1,
            knownPrice: dcaPrice ? parseFloat(dcaPrice) : null,
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

  // ── 7. Watchlist price alerts ─────────────────────────────────
  try {
    const { data: alerts } = await db.from('watchlist')
      .select('id, student_id, coin, target_price, direction')
      .not('target_price', 'is', null);

    if (alerts?.length) {
      const triggered = [];
      for (const alert of alerts) {
        const price = freshPriceMap[alert.coin];
        if (!price) continue;
        const target = parseFloat(alert.target_price);
        const dir = alert.direction || 'above';
        const hit = dir === 'above' ? price >= target : price <= target;
        if (hit) triggered.push(alert);
      }

      if (triggered.length) {
        const studentIds = [...new Set(triggered.map(a => a.student_id))];
        const { data: studentRows } = await db.from('students')
          .select('id, name, email').in('id', studentIds);
        const studentMap = {};
        (studentRows || []).forEach(s => { studentMap[s.id] = s; });

        for (const alert of triggered) {
          const student = studentMap[alert.student_id];
          if (!student?.email) continue;
          try {
            await sendWatchlistAlertEmail({
              to:           student.email,
              name:         student.name,
              coin:         alert.coin,
              targetPrice:  parseFloat(alert.target_price),
              currentPrice: freshPriceMap[alert.coin],
              direction:    alert.direction || 'above',
            });
            await db.from('watchlist').delete().eq('id', alert.id);
            report.watchlistAlerts = (report.watchlistAlerts || 0) + 1;
          } catch (e) {
            report.errors.push(`watchlist[${alert.id}]: ${e.message}`);
          }
        }
      }
    }
  } catch (e) {
    report.errors.push(`watchlist alerts: ${e.message}`);
  }

  return Response.json({ success: true, ...report });
}
