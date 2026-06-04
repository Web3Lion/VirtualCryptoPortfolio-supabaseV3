import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (TEACHER_EMAIL && session?.user?.email?.toLowerCase() !== TEACHER_EMAIL.toLowerCase())
    return Response.json({ error: 'Teacher only' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('classId');
  if (!classId) return Response.json({ error: 'classId required' }, { status: 400 });

  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  const { data: classStudents } = await db.from('class_students')
    .select('student_id, students(id, name, email, is_bot)')
    .eq('class_id', classId);

  const students = (classStudents || []).map(r => r.students).filter(s => s && !s.is_bot);
  const studentIds = students.map(s => s.id);
  if (!studentIds.length) return Response.json([]);

  const [allTradesRes, badgesRes] = await Promise.all([
    db.from('trades').select('student_id, created_at')
      .in('student_id', studentIds).eq('class_id', classId),
    db.from('badges').select('student_id')
      .in('student_id', studentIds).eq('class_id', classId).catch(() => ({ data: null })),
  ]);

  const todayISO = todayStart.toISOString();
  const lastTradeMap = {};
  const tradesTodayMap = {};
  const tradeTotalMap = {};

  (allTradesRes.data || []).forEach(t => {
    const sid = t.student_id;
    tradeTotalMap[sid] = (tradeTotalMap[sid] || 0) + 1;
    if (!lastTradeMap[sid] || t.created_at > lastTradeMap[sid]) lastTradeMap[sid] = t.created_at;
    if (t.created_at >= todayISO) tradesTodayMap[sid] = (tradesTodayMap[sid] || 0) + 1;
  });

  const badgesCountMap = {};
  (badgesRes.data || []).forEach(b => { badgesCountMap[b.student_id] = (badgesCountMap[b.student_id] || 0) + 1; });

  const analytics = students.map(s => ({
    studentId:   s.id,
    name:        s.name,
    email:       s.email,
    tradeCount:  tradeTotalMap[s.id] || 0,
    tradesToday: tradesTodayMap[s.id] || 0,
    lastTradeAt: lastTradeMap[s.id] || null,
    badgesCount: badgesCountMap[s.id] || 0,
    isInactive:  !lastTradeMap[s.id] || new Date(lastTradeMap[s.id]) < threeDaysAgo,
  }));

  return Response.json(analytics);
}
