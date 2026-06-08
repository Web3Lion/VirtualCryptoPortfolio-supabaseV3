import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStudentByEmail } from '@/lib/students';
import { db } from '@/lib/db';

const weekStart = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay()); // Sunday
  return d.toISOString();
};

async function checkCompletion(challenge, studentId, classId) {
  const start = weekStart();
  const now = new Date().toISOString();
  const target = parseFloat(challenge.target_value || 1);

  if (challenge.challenge_type === 'min_trades') {
    const { count } = await db.from('trades').select('id', { count: 'exact', head: true })
      .eq('student_id', studentId).eq('class_id', classId)
      .gte('created_at', start).lte('created_at', now);
    return { progress: count || 0, target, met: (count || 0) >= target };
  }

  if (challenge.challenge_type === 'hold_coins') {
    const { count } = await db.from('holdings').select('id', { count: 'exact', head: true })
      .eq('student_id', studentId).eq('class_id', classId).gt('quantity', 0);
    return { progress: count || 0, target, met: (count || 0) >= target };
  }

  if (challenge.challenge_type === 'learn') {
    const { count } = await db.from('learn_attempts').select('id', { count: 'exact', head: true })
      .eq('student_id', studentId).eq('class_id', classId).eq('passed', true)
      .gte('completed_at', start).lte('completed_at', now);
    return { progress: count || 0, target, met: (count || 0) >= target };
  }

  if (challenge.challenge_type === 'write_notes') {
    const { data } = await db.from('trades').select('reasoning')
      .eq('student_id', studentId).eq('class_id', classId)
      .gte('created_at', start).lte('created_at', now);
    const noted = (data || []).filter(t => (t.reasoning || '').trim().length >= 50).length;
    return { progress: noted, target, met: noted >= target };
  }

  if (challenge.challenge_type === 'profit') {
    const { data: port } = await db.from('portfolios').select('cash')
      .eq('student_id', studentId).eq('class_id', classId).single();
    const { data: holdings } = await db.from('holdings').select('coin, quantity, avg_buy_price')
      .eq('student_id', studentId).eq('class_id', classId).gt('quantity', 0);
    const { data: prices } = await db.from('price_cache').select('symbol, price');
    const pm = {};
    (prices || []).forEach(p => { pm[p.symbol] = parseFloat(p.price); });
    const { data: cls } = await db.from('classes').select('seed_money').eq('id', classId).single();
    const seed = parseFloat(cls?.seed_money || 10000);
    const cash = parseFloat(port?.cash || 0);
    const hVal = (holdings || []).reduce((s, h) => s + parseFloat(h.quantity) * (pm[h.coin] || parseFloat(h.avg_buy_price)), 0);
    const returnPct = ((cash + hVal) / seed - 1) * 100;
    const progress = parseFloat(returnPct.toFixed(2));
    return { progress, target, met: progress >= target };
  }

  return { progress: 0, target, met: false };
}

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const student = await getStudentByEmail(session.user.email);
  if (!student) return Response.json({ error: 'Not registered' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  let classId = searchParams.get('classId');
  if (!classId) {
    const { data: cs } = await db.from('class_students').select('class_id')
      .eq('student_id', student.id).order('joined_at', { ascending: false }).limit(1).single();
    classId = cs?.class_id;
  }
  if (!classId) return Response.json({ error: 'No class' }, { status: 404 });

  const now = new Date().toISOString();

  // Get active weekly challenge for this class
  const { data: challenge, error } = await db.from('weekly_challenges')
    .select('*').eq('class_id', classId).eq('active', true)
    .lte('starts_at', now).gte('ends_at', now)
    .order('created_at', { ascending: false }).limit(1).single();

  if (error?.code === '42P01') return Response.json({ tableNotReady: true });
  if (!challenge) return Response.json({ challenge: null });

  // Check if already claimed
  const { data: existing } = await db.from('weekly_challenge_completions')
    .select('id').eq('challenge_id', challenge.id).eq('student_id', student.id).limit(1);
  const alreadyClaimed = (existing || []).length > 0;

  const completion = await checkCompletion(challenge, student.id, classId);

  // Auto-award tokens when met and not yet claimed
  let justEarned = false;
  if (completion.met && !alreadyClaimed) {
    try {
      const { data: cfg } = await db.from('class_reward_config').select('enabled').eq('class_id', classId).single();
      if (cfg?.enabled && challenge.tokens_reward > 0) {
        await db.from('weekly_challenge_completions').insert({
          challenge_id: challenge.id, student_id: student.id, class_id: classId,
        });
        await db.from('class_reward_ledger').insert({
          student_id: student.id, class_id: classId,
          tokens: challenge.tokens_reward,
          reason: `weekly_challenge:${challenge.id}`,
        });
        justEarned = true;
      } else if (!cfg?.enabled) {
        // Still record completion even without tokens
        await db.from('weekly_challenge_completions').insert({
          challenge_id: challenge.id, student_id: student.id, class_id: classId,
        }).catch(() => {});
        justEarned = true;
      }
    } catch {}
  }

  const claimed = alreadyClaimed || justEarned;
  const endsAt = new Date(challenge.ends_at);
  const msLeft = endsAt - Date.now();
  const daysLeft = Math.max(0, Math.floor(msLeft / (1000 * 60 * 60 * 24)));
  const hoursLeft = Math.max(0, Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));

  return Response.json({ challenge, completion, claimed, justEarned, daysLeft, hoursLeft });
}
