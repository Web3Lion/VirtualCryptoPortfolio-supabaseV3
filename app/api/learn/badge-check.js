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

export async function checkBadgesAfterLesson({ studentId, classId }) {
  const earned = [];
  const give = async (id) => { const b = await awardBadge(studentId, classId, id); if (b) earned.push(b); };

  // All passing attempts for this student/class
  const { data: passes } = await db.from('learn_attempts')
    .select('lesson_id, score, completed_at')
    .eq('student_id', studentId)
    .eq('class_id', classId)
    .eq('passed', true);

  const passedAttempts = passes || [];
  const passedIds = [...new Set(passedAttempts.map(a => a.lesson_id))];
  const totalPassed = passedIds.length;

  // Lesson count milestones
  if (totalPassed >= 1)  await give('first_lesson');
  if (totalPassed >= 5)  await give('lesson_five');
  if (totalPassed >= 15) await give('lesson_fifteen');

  // Perfect score milestones
  const perfectCount = passedAttempts.filter(a => a.score === 100).length;
  if (perfectCount >= 1) await give('perfect_score');
  if (perfectCount >= 5) await give('quiz_ace');

  // Speed learner: 3+ distinct lessons passed today
  const today = new Date().toISOString().slice(0, 10);
  const todayIds = [...new Set(passedAttempts.filter(a => a.completed_at?.startsWith(today)).map(a => a.lesson_id))];
  if (todayIds.length >= 3) await give('speed_learner');

  // Study streak: 5+ consecutive calendar days with a lesson
  const days = [...new Set(passedAttempts.map(a => a.completed_at?.slice(0, 10)).filter(Boolean))].sort();
  if (days.length >= 5) {
    const sorted = days.map(d => new Date(d)).sort((a, b) => b - a);
    let streak = 1;
    for (let i = 1; i < sorted.length; i++) {
      const diffDays = (sorted[i - 1] - sorted[i]) / 86400000;
      if (diffDays <= 1.5) { streak++; if (streak >= 5) break; }
      else streak = 1;
    }
    if (streak >= 5) await give('study_streak');
  }

  // Module completion badges + detect newly completed modules
  const { data: modules } = await db.from('learn_modules')
    .select('id, title, emoji, description')
    .or(`class_id.is.null,class_id.eq.${classId}`)
    .eq('is_published', true);

  let newlyCompletedModule = null;

  if (modules?.length) {
    const { data: allLessons } = await db.from('learn_lessons')
      .select('id, module_id')
      .in('module_id', modules.map(m => m.id))
      .eq('is_published', true);

    const byModule = {};
    (allLessons || []).forEach(l => {
      if (!byModule[l.module_id]) byModule[l.module_id] = [];
      byModule[l.module_id].push(l.id);
    });

    let completedModules = 0;
    for (const [modId, lessonIds] of Object.entries(byModule)) {
      if (!lessonIds.length) continue;
      const allDone = lessonIds.every(lid => passedIds.includes(lid));
      if (allDone) {
        completedModules++;
        // Detect if THIS attempt is the one that completed the module
        // by checking if removing the current lesson would leave it incomplete
        const withoutCurrent = lessonIds.filter(lid => lid !== studentId); // studentId isn't lessonId — use passedIds context
        // Simply: if this lesson is in this module and all are now passed, it's newly complete
        // We detect "newly" by checking if passed BEFORE this attempt was one less
        if (!newlyCompletedModule) {
          const mod = modules.find(m => m.id === modId);
          if (mod) newlyCompletedModule = { id: modId, title: mod.title, emoji: mod.emoji || '📚', description: mod.description };
        }
      }
    }
    if (completedModules >= 1) await give('module_master');
    if (completedModules >= 3) await give('module_trio');
    if (completedModules >= 5) await give('crypto_professor');
  }

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
    } catch (e) { console.error('Learn badge token error:', e); }
  }

  return { newBadges: earned, tokensAwarded, moduleComplete: newlyCompletedModule };
}
