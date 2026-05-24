import { db } from '@/lib/db';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

// Creates a daily snapshot for every student in every class RIGHT NOW.
// Can be called by the teacher from the dashboard to backfill missing history.
// Also accepts ?force=1 to overwrite any existing snapshot from today.
export async function POST(request) {
  const session_header = request.headers.get('x-teacher-email');
  // Auth: accept cron secret OR teacher email header
  const authHeader = request.headers.get('authorization');
  const cronOk  = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const teacherOk = session_header === TEACHER_EMAIL;
  if (!cronOk && !teacherOk) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const force = searchParams.get('force') === '1';

  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    const { data: allCached } = await db.from('price_cache').select('symbol, price');
    const priceMap = {};
    (allCached || []).forEach(r => { priceMap[r.symbol] = parseFloat(r.price); });

    const { data: classes } = await db.from('classes').select('id');
    let total = 0;

    for (const cls of classes || []) {
      const { data: classStudents } = await db.from('class_students')
        .select('student_id').eq('class_id', cls.id);
      if (!classStudents?.length) continue;

      const studentIds = classStudents.map(r => r.student_id);
      let targets = studentIds;

      if (!force) {
        const { data: existing } = await db.from('snapshots')
          .select('student_id')
          .eq('class_id', cls.id)
          .eq('snapshot_type', 'daily')
          .gte('created_at', todayIso)
          .in('student_id', studentIds);
        const done = new Set((existing || []).map(s => s.student_id));
        targets = studentIds.filter(id => !done.has(id));
      }
      if (!targets.length) continue;

      const [portfoliosRes, holdingsRes] = await Promise.all([
        db.from('portfolios').select('student_id, cash').in('student_id', targets).eq('class_id', cls.id),
        db.from('holdings').select('student_id, coin, quantity, margin_borrowed').in('student_id', targets).eq('class_id', cls.id),
      ]);

      const pMap = {};
      (portfoliosRes.data || []).forEach(p => { pMap[p.student_id] = parseFloat(p.cash); });

      const hMap = {};
      (holdingsRes.data || []).forEach(h => {
        if (!hMap[h.student_id]) hMap[h.student_id] = [];
        hMap[h.student_id].push(h);
      });

      const rows = targets.map(sid => {
        const cash = pMap[sid] ?? 0;
        let holdingsVal = 0, borrowed = 0;
        (hMap[sid] || []).forEach(h => {
          holdingsVal += parseFloat(h.quantity) * (priceMap[h.coin] || 0);
          borrowed    += parseFloat(h.margin_borrowed || 0);
        });
        return { student_id: sid, class_id: cls.id, total_value: cash + holdingsVal - borrowed, cash, snapshot_type: 'daily' };
      });

      if (rows.length) {
        await db.from('snapshots').insert(rows);
        total += rows.length;
      }
    }

    return Response.json({ success: true, snapshotsCreated: total });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
