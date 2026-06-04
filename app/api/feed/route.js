import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStudentByEmail } from '@/lib/students';
import { db } from '@/lib/db';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  const student = await getStudentByEmail(session.user.email);
  if (!student) return Response.json([]);

  const { searchParams } = new URL(request.url);
  let classId = searchParams.get('classId');
  if (!classId) {
    const { data: cs } = await db.from('class_students').select('class_id')
      .eq('student_id', student.id).order('joined_at', { ascending: false }).limit(1).single();
    classId = cs?.class_id;
  }
  if (!classId) return Response.json([]);

  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const [tradesRes, badgesRes, challengesRes] = await Promise.all([
    db.from('trades')
      .select('id, action, coin, gross_value, created_at, students(name, is_bot)')
      .eq('class_id', classId).gte('created_at', cutoff)
      .order('created_at', { ascending: false }).limit(30),
    db.from('badges')
      .select('badge_id, earned_at, students(name)')
      .eq('class_id', classId).gte('earned_at', cutoff)
      .order('earned_at', { ascending: false }).limit(15),
    db.from('class_reward_ledger')
      .select('tokens, reason, created_at, students(name)')
      .eq('class_id', classId).gte('created_at', cutoff)
      .like('reason', 'daily_challenge:%')
      .order('created_at', { ascending: false }).limit(10),
  ]);

  const items = [];

  (tradesRes.data || []).forEach(t => {
    if (t.students?.is_bot) return;
    const name = t.students?.name || 'Someone';
    const val = parseFloat(t.gross_value || 0);
    const emoji = t.action === 'BUY' ? '📈' : t.action === 'SELL' ? '📉' : '⬇';
    items.push({
      type: 'trade',
      ts: t.created_at,
      emoji,
      text: `${name} ${t.action.toLowerCase()}${t.action === 'SHORT' ? 'ed' : 't'} ${t.coin}`,
      sub: val > 0 ? `$${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : null,
    });
  });

  const BADGE_NAMES = {
    first_trade:'First Trade',active_trader:'Active Trader',power_trader:'Power Trader',
    whale:'Whale',doubled_up:'Doubled Up',first_profit:'First Profit',ten_pct:'+10%',
    to_the_moon:'To the Moon',diamond_hands:'Diamond Hands',diversified:'Diversified',
    sharpshooter:'Sharpshooter',analyst:'Analyst',researcher:'Researcher',
    crush_500:'Crush 500',crush_1000:'Crush 1000',first_lesson:'First Lesson',
  };
  (badgesRes.data || []).forEach(b => {
    const name = b.students?.name || 'Someone';
    items.push({
      type: 'badge',
      ts: b.earned_at,
      emoji: '🏅',
      text: `${name} earned a badge`,
      sub: BADGE_NAMES[b.badge_id] || b.badge_id,
    });
  });

  (challengesRes.data || []).forEach(r => {
    const name = r.students?.name || 'Someone';
    items.push({
      type: 'challenge',
      ts: r.created_at,
      emoji: '🎯',
      text: `${name} completed the daily challenge`,
      sub: `+${r.tokens} tokens`,
    });
  });

  // Sort all by timestamp desc, cap at 25
  items.sort((a, b) => b.ts.localeCompare(a.ts));
  return Response.json(items.slice(0, 25));
}
