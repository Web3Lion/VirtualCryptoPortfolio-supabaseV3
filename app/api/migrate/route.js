import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

// Known badge IDs from the sheet
const BADGE_MAP = {
  'First Trade':          'first_trade',
  'Active Trader':        'active_trader',
  'Power Trader':         'power_trader',
  'Whale':                'whale',
  'Doubled Up':           'doubled_up',
  'Triple Threat':        'triple_threat',
  'First Profit':         'first_profit',
  '10% Club':             'ten_pct',
  'Diamond Hands':        'diamond_hands',
  'To The Moon':          'to_the_moon',
  'Portfolio Doubled':    'portfolio_x2',
  'Bought The Dip':       'bought_dip',
  'Diversified':          'diversified',
  'Sharpshooter':         'sharpshooter',
  'Sniper':               'sniper',
  'HODLer':               'hodler',
  'Stop Loss Pro':        'stop_loss_pro',
  'Bot Copycat':          'bot_copycat',
  'Analyst':              'analyst',
  'Researcher':           'researcher',
  'Due Diligence':        'due_diligence',
  'First Watch':          'first_watch',
  'Serious Watchman':     'serious_watch',
  'Experienced Watchman': 'veteran_watch',
  'Bull Rider':           'bull_rider',
  'Flash Deal':           'flash_deal',
  'News Trader':          'news_trader',
  'Crash Survivor':       'crash_survivor',
  'Sector Pro':           'sector_pro',
  'Sector Specialist':    'sector_specialist',
  'Comeback Kid':         'comeback_kid',
  'Patient Investor':     'patient_investor',
  'Eager Investor':       'eager_investor',
  'FOMO Investor':        'fomo_investor',
  'Class Champion':       'champion',
  'Most Improved':        'most_improved',
  'Beat The Bot':         'beat_the_bot',
  'Fee Conscious':        'fee_conscious',
};

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== TEACHER_EMAIL)
    return Response.json({ error: 'Teacher only' }, { status: 403 });

  const body = await request.json();
  const { action } = body;

  // ── Create class ────────────────────────────────────────────
  if (action === 'create_class') {
    const { data: existing } = await db.from('classes').select('id').eq('name', 'Pd 4_S2_2025-2026').single();
    if (existing) return Response.json({ success: true, classId: existing.id, message: 'Class already exists' });

    const { data: cls, error } = await db.from('classes').insert({
      name:          'Pd 4_S2_2025-2026',
      semester:      'S2 2025-2026',
      teacher_email: TEACHER_EMAIL,
      seed_money:    10000,
      trade_fee:     0.005,
    }).select().single();

    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ success: true, classId: cls.id, message: 'Class created!' });
  }

  // ── Migrate one student ──────────────────────────────────────
  if (action === 'migrate_student') {
    const { classId, student: s } = body;

    // 1. Create or find student
    let student;
    const { data: existing } = await db.from('students').select('*').eq('email', s.email.toLowerCase()).single();
    if (existing) {
      student = existing;
    } else {
      const { data: ns, error } = await db.from('students').insert({
        name:  s.name,
        email: s.email.toLowerCase(),
      }).select().single();
      if (error) return Response.json({ error: `Student insert failed: ${error.message}` }, { status: 400 });
      student = ns;
    }

    // 2. Add to class
    await db.from('class_students').upsert(
      { class_id: classId, student_id: student.id },
      { onConflict: 'class_id,student_id' }
    );

    // 3. Create portfolio with migrated cash
    await db.from('portfolios').upsert({
      student_id: student.id,
      class_id:   classId,
      cash:       parseFloat(s.cash) || 0,
      fees_paid:  parseFloat(s.feesPaid) || 0,
    }, { onConflict: 'student_id,class_id' });

    // 4. Insert holdings
    if (s.holdings?.length > 0) {
      await db.from('holdings').delete().eq('student_id', student.id).eq('class_id', classId);
      const holdingRows = s.holdings.map(h => ({
        student_id:    student.id,
        class_id:      classId,
        coin:          h.coin.toUpperCase(),
        quantity:      parseFloat(h.quantity) || 0,
        avg_buy_price: parseFloat(h.avgBuyPrice) || 0,
      })).filter(h => h.quantity > 0);
      if (holdingRows.length > 0)
        await db.from('holdings').upsert(holdingRows, { onConflict: 'student_id,class_id,coin' });
    }

    // 5. Insert trade history in batches
    if (s.trades?.length > 0) {
      await db.from('trades').delete().eq('student_id', student.id).eq('class_id', classId);
      const tradeRows = s.trades
        .filter(t => t.action && t.coin && t.quantity && t.price)
        .map(t => ({
          student_id:  student.id,
          class_id:    classId,
          action:      t.action.toUpperCase(),
          coin:        t.coin.toUpperCase(),
          quantity:    Math.abs(parseFloat(t.quantity)) || 0,
          price:       parseFloat(t.price) || 0,
          gross_value: parseFloat(t.grossValue) || 0,
          fee:         parseFloat(t.fee) || 0,
          cash_after:  parseFloat(t.cashAfter) || 0,
          reasoning:   t.reasoning || '',
          created_at:  t.date ? new Date(t.date).toISOString() : new Date().toISOString(),
        }));

      // Insert in batches of 100
      for (let i = 0; i < tradeRows.length; i += 100) {
        await db.from('trades').insert(tradeRows.slice(i, i + 100));
      }
    }

    // 6. Insert snapshots in batches
    if (s.snapshots?.length > 0) {
      await db.from('snapshots').delete().eq('student_id', student.id).eq('class_id', classId);
      const snapRows = s.snapshots.map(snap => ({
        student_id:    student.id,
        class_id:      classId,
        total_value:   parseFloat(snap.value) || 0,
        cash:          parseFloat(s.cash) || 0,
        snapshot_type: snap.type || 'intraday',
        created_at:    snap.timestamp ? new Date(snap.timestamp).toISOString() : new Date().toISOString(),
      })).filter(r => r.total_value > 0);

      for (let i = 0; i < snapRows.length; i += 100) {
        await db.from('snapshots').insert(snapRows.slice(i, i + 100));
      }
    }

    // 7. Insert badges
    if (s.badges?.length > 0) {
      for (const badge of s.badges) {
        const badgeId = BADGE_MAP[badge.name] || badge.name.toLowerCase().replace(/\s+/g, '_');
        await db.from('badges').upsert({
          student_id: student.id,
          class_id:   classId,
          badge_id:   badgeId,
          earned_at:  badge.earnedAt ? new Date(badge.earnedAt).toISOString() : new Date().toISOString(),
        }, { onConflict: 'student_id,class_id,badge_id' });
      }
    }

    return Response.json({ success: true, message: `✅ ${s.name} migrated successfully`, studentId: student.id });
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 });
}
