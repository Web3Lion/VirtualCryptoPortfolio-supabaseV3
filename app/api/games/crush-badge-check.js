import { db } from '@/lib/db';

async function awardBadge(studentId, classId, badgeId) {
  const { data: existing } = await db.from('badges').select('id')
    .eq('student_id', studentId).eq('class_id', classId).eq('badge_id', badgeId).single();
  if (existing) return null;
  const { error } = await db.from('badges').insert({
    student_id: studentId, class_id: classId,
    badge_id: badgeId, earned_at: new Date().toISOString(),
  });
  return error ? null : badgeId;
}

export async function checkBadgesAfterCrush({ studentId, classId, score, tokensToday, maxTokens }) {
  const earned = [];
  const give = async (id) => { const b = await awardBadge(studentId, classId, id); if (b) earned.push(b); };

  // All crush ledger entries for this student
  const { data: crushEntries } = await db.from('class_reward_ledger')
    .select('created_at, tokens')
    .eq('student_id', studentId)
    .eq('class_id', classId)
    .like('reason', 'crush:%');

  const sessions = crushEntries || [];

  // First game
  if (sessions.length >= 1) await give('crush_rookie');

  // Score thresholds for this session
  if (score >= 500)  await give('crush_500');
  if (score >= 1000) await give('crush_1000');
  if (score >= 3000) await give('crush_3000');

  // Veteran: 10+ sessions
  if (sessions.length >= 10) await give('crush_veteran');

  // Daily maxer: hit the daily token cap
  if (maxTokens > 0 && tokensToday >= maxTokens) await give('crush_daily_max');

  // Grinder: played on 3+ different calendar days
  const playDays = [...new Set(sessions.map(s => s.created_at?.slice(0, 10)).filter(Boolean))];
  if (playDays.length >= 3) await give('crush_grinder');

  // Grant tokens for newly earned badges
  let tokensAwarded = 0;
  if (earned.length > 0) {
    try {
      const { data: cfg } = await db.from('class_reward_config')
        .select('enabled, badge_reward_tokens').eq('class_id', classId).single();
      if (cfg?.enabled && cfg.badge_reward_tokens > 0) {
        await db.from('class_reward_ledger').insert(
          earned.map(id => ({ student_id: studentId, class_id: classId, tokens: cfg.badge_reward_tokens, reason: `badge:${id}` }))
        );
        tokensAwarded = earned.length * cfg.badge_reward_tokens;
      }
    } catch (e) { console.error('Crush badge token error:', e); }
  }

  return { newBadges: earned, tokensAwarded };
}
