import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export const PRIZES = [
  { id: 'tokens_5',    label: '5 Tokens',      emoji: '🪙', color: '#475569', tokens: 5,   cash: 0,   weight: 25 },
  { id: 'tokens_10',   label: '10 Tokens',     emoji: '🪙', color: '#3b82f6', tokens: 10,  cash: 0,   weight: 20 },
  { id: 'cash_50',     label: '+$50 Cash',     emoji: '💵', color: '#00e5a0', tokens: 0,   cash: 50,  weight: 15 },
  { id: 'tokens_25',   label: '25 Tokens',     emoji: '🪙', color: '#8b5cf6', tokens: 25,  cash: 0,   weight: 12 },
  { id: 'freeze',      label: 'Streak Freeze', emoji: '🧊', color: '#06b6d4', tokens: 0,   cash: 0,   weight: 10 },
  { id: 'tokens_50',   label: '50 Tokens',     emoji: '🪙', color: '#f59e0b', tokens: 50,  cash: 0,   weight: 8  },
  { id: 'cash_200',    label: '+$200 Cash',    emoji: '💵', color: '#f43f5e', tokens: 0,   cash: 200, weight: 6  },
  { id: 'nothing',     label: 'Try Tomorrow',  emoji: '😬', color: '#334155', tokens: 0,   cash: 0,   weight: 4  },
];

function pickPrize(seed) {
  const total = PRIZES.reduce((s, p) => s + p.weight, 0);
  let r = seed % total;
  for (const p of PRIZES) {
    r -= p.weight;
    if (r < 0) return p;
  }
  return PRIZES[0];
}

async function getStudentAndClass(email) {
  const { data: student } = await db.from('students').select('id').eq('email', email.toLowerCase()).single();
  if (!student) return {};
  const { data: cs } = await db.from('class_students').select('class_id')
    .eq('student_id', student.id).order('joined_at', { ascending: false }).limit(1).single();
  return { studentId: student.id, classId: cs?.class_id };
}

// GET — check if already spun today
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const { studentId, classId } = await getStudentAndClass(session.user.email);
  if (!studentId || !classId) return Response.json({ canSpin: false, spunToday: false });

  const today = new Date().toISOString().slice(0, 10);
  const { data: existing } = await db.from('class_reward_ledger')
    .select('tokens, reason, created_at')
    .eq('student_id', studentId).eq('class_id', classId)
    .like('reason', 'spin:%')
    .gte('created_at', `${today}T00:00:00Z`)
    .lt('created_at',  `${today}T23:59:59Z`)
    .single();

  const { data: cfg } = await db.from('class_reward_config').select('enabled, spin_enabled').eq('class_id', classId).single();
  const spinActive = !!cfg?.enabled && cfg?.spin_enabled !== false;

  return Response.json({
    canSpin: spinActive && !existing,
    spunToday: !!existing,
    rewardsEnabled: spinActive,
    prizes: PRIZES,
  });
}

// POST — execute the spin
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const { studentId, classId } = await getStudentAndClass(session.user.email);
  if (!studentId || !classId) return Response.json({ error: 'Not in a class' }, { status: 400 });

  const { data: cfg } = await db.from('class_reward_config').select('enabled, spin_enabled').eq('class_id', classId).single();
  if (!cfg?.enabled || cfg?.spin_enabled === false) return Response.json({ error: 'Spin wheel not enabled for this class' }, { status: 403 });

  const today = new Date().toISOString().slice(0, 10);
  const { data: existing } = await db.from('class_reward_ledger')
    .select('id').eq('student_id', studentId).eq('class_id', classId)
    .like('reason', 'spin:%')
    .gte('created_at', `${today}T00:00:00Z`)
    .lt('created_at',  `${today}T23:59:59Z`)
    .single();
  if (existing) return Response.json({ error: 'Already spun today', spunToday: true }, { status: 409 });

  // Deterministic seed from studentId + date (avoids Date.random-style issues)
  const seed = studentId.split('').reduce((s, c) => s + c.charCodeAt(0), 0) + parseInt(today.replace(/-/g, ''), 10);
  const prize = pickPrize(seed);
  const prizeIndex = PRIZES.findIndex(p => p.id === prize.id);

  // Record in ledger (even for nothing — prevents re-spin)
  await db.from('class_reward_ledger').insert({
    student_id: studentId, class_id: classId,
    tokens: prize.tokens,
    reason: `spin:${today}:${prize.id}`,
  });

  // Apply cash bonus if applicable
  if (prize.cash > 0) {
    await db.from('portfolios')
      .update({ cash: db.raw(`cash + ${prize.cash}`) })
      .eq('student_id', studentId).eq('class_id', classId);
  }

  // Apply streak freeze if applicable
  if (prize.id === 'freeze') {
    const { data: streakRow } = await db.from('login_streaks')
      .select('freeze_count').eq('student_id', studentId).single();
    const current = streakRow?.freeze_count ?? 0;
    await db.from('login_streaks')
      .upsert({ student_id: studentId, freeze_count: current + 1 }, { onConflict: 'student_id' });
  }

  return Response.json({ prize, prizeIndex, prizes: PRIZES });
}
