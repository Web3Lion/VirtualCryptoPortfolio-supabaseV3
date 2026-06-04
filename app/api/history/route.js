import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStudentByEmail, getPortfolioHistory } from '@/lib/students';
import { db } from '@/lib/db';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  const student = await getStudentByEmail(session.user.email);
  if (!student) return Response.json({ intraday: [], daily: [] });
  const { searchParams } = new URL(request.url);
  let classId = searchParams.get('classId');
  const range  = searchParams.get('range') || '1W';
  if (!classId) {
    const { data: cs } = await db.from('class_students').select('class_id').eq('student_id', student.id).order('joined_at', { ascending: false }).limit(1).single();
    classId = cs?.class_id;
  }
  if (!classId) return Response.json({ intraday: [], daily: [] });

  const history = await getPortfolioHistory(student.id, classId, range);

  // Build class average benchmark from the same snapshot window
  const buildAvg = async (type) => {
    const cutoff = history[type]?.[0]?.ts;
    if (!cutoff) return [];
    const { data: classStudents } = await db.from('class_students').select('student_id').eq('class_id', classId);
    const studentIds = (classStudents || []).map(r => r.student_id);
    if (studentIds.length < 2) return [];

    const { data: snaps } = await db.from('snapshots')
      .select('student_id, total_value, created_at')
      .in('student_id', studentIds).eq('class_id', classId)
      .eq('snapshot_type', type).gte('created_at', cutoff)
      .order('created_at').limit(2000);

    // Group by minute (intraday) or day (daily), compute average
    const buckets = {};
    const fmt = type === 'intraday'
      ? ts => ts.slice(0, 16)   // YYYY-MM-DDTHH:MM
      : ts => ts.slice(0, 10);  // YYYY-MM-DD
    (snaps || []).forEach(s => {
      const key = fmt(s.created_at);
      if (!buckets[key]) buckets[key] = { sum: 0, count: 0, ts: s.created_at };
      buckets[key].sum   += parseFloat(s.total_value);
      buckets[key].count += 1;
    });
    return Object.values(buckets).sort((a, b) => a.ts.localeCompare(b.ts)).map(b => ({
      v: b.sum / b.count,
      t: type === 'intraday'
        ? new Date(b.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : new Date(b.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      ts: b.ts,
    }));
  };

  const [intradayAvg, dailyAvg] = await Promise.all([
    buildAvg('intraday').catch(() => []),
    buildAvg('daily').catch(() => []),
  ]);

  return Response.json({ ...history, intradayAvg, dailyAvg });
}
