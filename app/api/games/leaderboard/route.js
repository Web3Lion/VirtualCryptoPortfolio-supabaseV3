import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('classId');
  if (!classId) return Response.json({ error: 'classId required' }, { status: 400 });

  const { data: classStudents } = await db.from('class_students')
    .select('student_id, students(id, name, is_bot)')
    .eq('class_id', classId);

  const students = (classStudents || []).map(r => r.students).filter(s => s && !s.is_bot);
  const studentIds = students.map(s => s.id);
  if (!studentIds.length) return Response.json({ crush: [], higherLower: [] });

  const [crushRes, hlRes] = await Promise.all([
    db.from('class_reward_ledger')
      .select('student_id, reason, created_at')
      .in('student_id', studentIds).eq('class_id', classId)
      .like('reason', 'crush:%'),
    db.from('higher_lower_predictions')
      .select('student_id, correct, coin_id, resolved_at')
      .in('student_id', studentIds).eq('class_id', classId)
      .not('resolved_at', 'is', null)
      .catch(() => ({ data: null })),
  ]);

  // ── Crush: sum all-time points per student ────────────────────
  const crushMap = {};
  (crushRes.data || []).forEach(r => {
    const m = r.reason.match(/^crush:(\d+)pts$/);
    if (!m) return;
    const pts = parseInt(m[1]);
    if (!crushMap[r.student_id]) crushMap[r.student_id] = { total: 0, sessions: 0, best: 0 };
    crushMap[r.student_id].total    += pts;
    crushMap[r.student_id].sessions += 1;
    crushMap[r.student_id].best      = Math.max(crushMap[r.student_id].best, pts);
  });

  const crush = students
    .map(s => ({ id: s.id, name: s.name, ...( crushMap[s.id] || { total: 0, sessions: 0, best: 0 }) }))
    .sort((a, b) => b.total - a.total);

  // ── Higher / Lower: correct count, total, accuracy ───────────
  const hlMap = {};
  (hlRes.data || []).forEach(r => {
    if (!hlMap[r.student_id]) hlMap[r.student_id] = { correct: 0, total: 0 };
    hlMap[r.student_id].total += 1;
    if (r.correct) hlMap[r.student_id].correct += 1;
  });

  const higherLower = students
    .map(s => {
      const d = hlMap[s.id] || { correct: 0, total: 0 };
      return { id: s.id, name: s.name, correct: d.correct, total: d.total, accuracy: d.total ? Math.round(d.correct / d.total * 100) : null };
    })
    .sort((a, b) => b.correct - a.correct || (b.accuracy ?? -1) - (a.accuracy ?? -1));

  return Response.json({ crush, higherLower });
}
