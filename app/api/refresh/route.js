import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, getMarketStatus, setConfig } from '@/lib/db';
import { refreshPricesIfStale } from '@/lib/prices';
import { sendWatchlistAlertEmail } from '@/lib/email';

const REFRESH_MILESTONES = [
  { count: 1,   id: 'signal_found' },
  { count: 5,   id: 'data_chef' },
  { count: 25,  id: 'market_pulse' },
  { count: 50,  id: 'price_oracle' },
  { count: 100, id: 'omniscient' },
];

async function awardBadge(studentId, classId, badgeId) {
  const { data: existing } = await db.from('badges').select('id')
    .eq('student_id', studentId).eq('class_id', classId).eq('badge_id', badgeId).single();
  if (existing) return null;
  const { error } = await db.from('badges').insert({ student_id: studentId, class_id: classId, badge_id: badgeId, earned_at: new Date().toISOString() });
  return error ? null : badgeId;
}

async function checkRefreshBadges(studentId, classId, newCount) {
  const earned = [];
  for (const { count, id } of REFRESH_MILESTONES) {
    if (newCount >= count) {
      const b = await awardBadge(studentId, classId, id);
      if (b) earned.push(b);
    }
  }
  // Grant ClassReward tokens if configured
  let tokensAwarded = 0;
  if (earned.length) {
    try {
      const { data: rewardCfg } = await db.from('class_reward_config').select('enabled, badge_reward_tokens').eq('class_id', classId).single();
      if (rewardCfg?.enabled && rewardCfg.badge_reward_tokens > 0) {
        await db.from('class_reward_ledger').insert(earned.map(badgeId => ({ student_id: studentId, class_id: classId, tokens: rewardCfg.badge_reward_tokens, reason: `badge:${badgeId}` })));
        tokensAwarded = earned.length * rewardCfg.badge_reward_tokens;
      }
    } catch {}
  }
  return { badge: earned[0] || null, tokensAwarded };
}

const COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

async function getLastRefreshAt() {
  const { data } = await db.from('price_cache').select('updated_at').order('updated_at', { ascending: false }).limit(1).single();
  return data?.updated_at ? new Date(data.updated_at) : null;
}

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const lastRefresh = await getLastRefreshAt();
  if (!lastRefresh) return Response.json({ canRefresh: true, nextRefreshAt: null });

  const nextRefreshAt = new Date(lastRefresh.getTime() + COOLDOWN_MS);
  const canRefresh = Date.now() >= nextRefreshAt.getTime();
  return Response.json({ canRefresh, nextRefreshAt: nextRefreshAt.toISOString(), lastRefreshAt: lastRefresh.toISOString() });
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  // Check cooldown
  const lastRefresh = await getLastRefreshAt();
  if (lastRefresh) {
    const nextRefreshAt = new Date(lastRefresh.getTime() + COOLDOWN_MS);
    if (Date.now() < nextRefreshAt.getTime()) {
      return Response.json({ blocked: true, nextRefreshAt: nextRefreshAt.toISOString() }, { status: 429 });
    }
  }

  const report = { pricesUpdated: 0, intradaySnapshots: 0, errors: [] };

  // ── 1. Update price cache — shares the same bulk gate as the cron and
  // trades, so this call gets counted in the cockpit's real usage numbers
  // instead of being a third untracked CoinGecko call site. The cooldown
  // check above already confirmed the cache is stale, so this always does
  // a genuine live fetch here.
  let freshPriceMap = {};
  try {
    const result = await refreshPricesIfStale();
    report.pricesUpdated = result.count;
    freshPriceMap = result.priceMap;
  } catch (e) {
    report.errors.push(`prices: ${e.message}`);
  }

  // ── 2. Snapshots for all classes ──────────────────────────────
  try {
    const { data: classes } = await db.from('classes').select('id');

    for (const cls of classes || []) {
      try {
        const { data: classStudents } = await db.from('class_students').select('student_id').eq('class_id', cls.id);
        if (!classStudents?.length) continue;
        const studentIds = classStudents.map(r => r.student_id);

        const [portfoliosRes, holdingsRes, stakingRes] = await Promise.all([
          db.from('portfolios').select('student_id, cash').in('student_id', studentIds).eq('class_id', cls.id),
          db.from('holdings').select('student_id, coin, quantity, margin_borrowed').in('student_id', studentIds).eq('class_id', cls.id),
          db.from('staking_positions').select('student_id, coin, quantity').in('student_id', studentIds).eq('class_id', cls.id).in('status', ['active', 'claimable']).catch(() => ({ data: null })),
        ]);

        const allCoins = [...new Set([
          ...(holdingsRes.data || []).map(h => h.coin),
          ...(stakingRes.data || []).map(p => p.coin),
        ])];
        const missingCoins = allCoins.filter(c => !freshPriceMap[c]);
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
        const stakingByStudent = {};
        (stakingRes.data || []).forEach(p => {
          if (!stakingByStudent[p.student_id]) stakingByStudent[p.student_id] = [];
          stakingByStudent[p.student_id].push(p);
        });

        const rows = studentIds.map(studentId => {
          const cash = portfolioMap[studentId] ?? 0;
          const holdings = holdingsByStudent[studentId] || [];
          let holdingsVal = 0, borrowed = 0;
          holdings.forEach(h => {
            const price = freshPriceMap[h.coin] || parseFloat(h.avg_buy_price) || 0;
            holdingsVal += parseFloat(h.quantity) * price;
            borrowed    += parseFloat(h.margin_borrowed || 0);
          });
          const stakingVal = (stakingByStudent[studentId] || []).reduce((s, p) => s + parseFloat(p.quantity) * (freshPriceMap[p.coin] || 0), 0);
          return { student_id: studentId, class_id: cls.id, total_value: cash + holdingsVal + stakingVal - borrowed, cash, snapshot_type: 'intraday' };
        });

        if (rows.length) {
          await db.from('snapshots').insert(rows);
          report.intradaySnapshots += rows.length;
        }
      } catch (e) {
        report.errors.push(`snapshots[${cls.id}]: ${e.message}`);
      }
    }
  } catch (e) {
    report.errors.push(`snapshots: ${e.message}`);
  }

  // ── 3. Watchlist email alerts ──────────────────────────────────
  try {
    const { data: alerts } = await db.from('watchlist')
      .select('id, coin, target_price, direction, students(email, name)');
    const triggered = (alerts || []).filter(a => {
      const price = freshPriceMap[a.coin];
      if (!price || !a.students?.email) return false;
      return (a.direction === 'above' && price >= parseFloat(a.target_price)) ||
             (a.direction === 'below' && price <= parseFloat(a.target_price));
    });
    const notifiedIds = [];
    for (const alert of triggered) {
      try {
        await sendWatchlistAlertEmail({
          to:           alert.students.email,
          name:         alert.students.name || 'Student',
          coin:         alert.coin,
          targetPrice:  parseFloat(alert.target_price),
          currentPrice: freshPriceMap[alert.coin],
          direction:    alert.direction,
        });
        notifiedIds.push(alert.id);
      } catch (_) {}
    }
    if (notifiedIds.length) {
      await db.from('watchlist').delete().in('id', notifiedIds);
      report.alertsNotified = notifiedIds.length;
    }
  } catch (e) {
    report.errors.push(`watchlist alerts: ${e.message}`);
  }

  // ── 4. Settle expired options ─────────────────────────────────
  try {
    const now = new Date();
    const { data: expired } = await db.from('options_positions')
      .select('*').eq('status', 'open').lte('expires_at', now.toISOString());

    report.optionsSettled = 0;
    for (const opt of expired || []) {
      try {
        const currentPrice = freshPriceMap[opt.coin]
          || (await db.from('price_cache').select('price').eq('symbol', opt.coin).single()).data?.price;
        if (!currentPrice) continue;
        const price = parseFloat(currentPrice);
        const strike = parseFloat(opt.strike_price);
        const contracts = parseFloat(opt.contracts);
        const intrinsic = opt.option_type === 'call'
          ? Math.max(0, price - strike)
          : Math.max(0, strike - price);
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
        report.optionsSettled++;
      } catch (_) {}
    }
  } catch (_) {
    // options table may not exist yet — skip silently
  }

  // ── 5. Refresh badge tracking ──────────────────────────────────
  let newBadge = null;
  let tokensAwarded = 0;
  try {
    const email = session.user.email.toLowerCase();
    const { data: studentRow } = await db.from('students').select('id').eq('email', email).single();
    if (studentRow) {
      // Increment per-student refresh counter stored in config table
      const configKey = `REFRESH_COUNT_${studentRow.id}`;
      const { data: cfgRow } = await db.from('config').select('value').eq('key', configKey).single();
      const newCount = (parseInt(cfgRow?.value || '0', 10) || 0) + 1;
      await setConfig(configKey, String(newCount));

      // Find the student's active class for badge awarding
      const { data: cs } = await db.from('class_students').select('class_id').eq('student_id', studentRow.id).order('joined_at', { ascending: false }).limit(1).single();
      if (cs?.class_id) {
        const result = await checkRefreshBadges(studentRow.id, cs.class_id, newCount);
        newBadge = result.badge;
        tokensAwarded = result.tokensAwarded;
      }
    }
  } catch (e) {
    report.errors.push(`badges: ${e.message}`);
  }

  const nextRefreshAt = new Date(Date.now() + COOLDOWN_MS).toISOString();
  return Response.json({ success: true, ...report, nextRefreshAt, newBadge, tokensAwarded });
}
