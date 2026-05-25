import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, getMarketStatus, setConfig } from '@/lib/db';
import { fetchBulkPrices, GECKO_ID_MAP } from '@/lib/prices';

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

  // ── 1. Update price cache ─────────────────────────────────────
  let freshPriceMap = {};
  try {
    const [{ data: activeCoins }, { data: heldCoins }] = await Promise.all([
      db.from('class_coins').select('symbol,gecko_id').eq('active', true),
      db.from('holdings').select('coin'),
    ]);
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

  // ── 2. Snapshots for all classes ──────────────────────────────
  try {
    const { data: classes } = await db.from('classes').select('id');

    for (const cls of classes || []) {
      try {
        const { data: classStudents } = await db.from('class_students').select('student_id').eq('class_id', cls.id);
        if (!classStudents?.length) continue;
        const studentIds = classStudents.map(r => r.student_id);

        const [portfoliosRes, holdingsRes] = await Promise.all([
          db.from('portfolios').select('student_id, cash').in('student_id', studentIds).eq('class_id', cls.id),
          db.from('holdings').select('student_id, coin, quantity, margin_borrowed').in('student_id', studentIds).eq('class_id', cls.id),
        ]);

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

        const rows = studentIds.map(studentId => {
          const cash = portfolioMap[studentId] ?? 0;
          const holdings = holdingsByStudent[studentId] || [];
          let holdingsVal = 0, borrowed = 0;
          holdings.forEach(h => {
            const price = freshPriceMap[h.coin] || parseFloat(h.avg_buy_price) || 0;
            holdingsVal += parseFloat(h.quantity) * price;
            borrowed    += parseFloat(h.margin_borrowed || 0);
          });
          return { student_id: studentId, class_id: cls.id, total_value: cash + holdingsVal - borrowed, cash, snapshot_type: 'intraday' };
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

  // ── 3. Refresh badge tracking ──────────────────────────────────
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
