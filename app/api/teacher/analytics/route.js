import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  if (TEACHER_EMAIL && session.user?.email?.toLowerCase() !== TEACHER_EMAIL.toLowerCase())
    return Response.json({ error: 'Teacher only' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('classId');
  if (!classId) return Response.json({ error: 'classId required' }, { status: 400 });

  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  // Build array of last 7 day-start timestamps for heatmap
  const dayStarts = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(todayStart); d.setDate(d.getDate() - (6 - i)); return d;
  });

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
  const sevenISO = sevenDaysAgo.toISOString();
  const lastTradeMap = {};
  const tradesTodayMap = {};
  const tradeTotalMap = {};
  const tradesByDayMap = {}; // sid -> array of 7 counts

  (allTradesRes.data || []).forEach(t => {
    const sid = t.student_id;
    tradeTotalMap[sid] = (tradeTotalMap[sid] || 0) + 1;
    if (!lastTradeMap[sid] || t.created_at > lastTradeMap[sid]) lastTradeMap[sid] = t.created_at;
    if (t.created_at >= todayISO) tradesTodayMap[sid] = (tradesTodayMap[sid] || 0) + 1;
    if (t.created_at >= sevenISO) {
      if (!tradesByDayMap[sid]) tradesByDayMap[sid] = Array(7).fill(0);
      const tradeDate = new Date(t.created_at); tradeDate.setHours(0, 0, 0, 0);
      const dayIdx = dayStarts.findIndex(d => d.getTime() === tradeDate.getTime());
      if (dayIdx !== -1) tradesByDayMap[sid][dayIdx]++;
    }
  });

  const badgesCountMap = {};
  (badgesRes.data || []).forEach(b => { badgesCountMap[b.student_id] = (badgesCountMap[b.student_id] || 0) + 1; });

  const analytics = students.map(s => ({
    studentId:    s.id,
    name:         s.name,
    email:        s.email,
    tradeCount:   tradeTotalMap[s.id] || 0,
    tradesToday:  tradesTodayMap[s.id] || 0,
    lastTradeAt:  lastTradeMap[s.id] || null,
    badgesCount:  badgesCountMap[s.id] || 0,
    isInactive:   !lastTradeMap[s.id] || new Date(lastTradeMap[s.id]) < threeDaysAgo,
    tradesByDay:  tradesByDayMap[s.id] || Array(7).fill(0),
    dayLabels:    dayStarts.map(d => d.toLocaleDateString('en-US', { weekday: 'short' })),
  }));

  return Response.json(analytics);
}
