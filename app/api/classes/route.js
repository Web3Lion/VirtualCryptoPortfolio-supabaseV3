import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { assignJoinCode, isTeacherEmail } from '@/lib/enroll';
const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  const { data } = await db.from('classes').select('*').eq('teacher_email', TEACHER_EMAIL).order('created_at', { ascending: false });
  const classes = data || [];
  // Join codes are what let anyone enroll, so only the teacher sees them.
  if (!isTeacherEmail(session.user?.email)) return Response.json(classes.map(({ join_code, ...c }) => c));
  // Backfill a code for classes created before codes existed (skipped if the
  // column hasn't been migrated yet — those rows have no join_code key).
  for (const c of classes) {
    if ('join_code' in c && !c.join_code) c.join_code = await assignJoinCode(c.id).catch(() => null);
  }
  return Response.json(classes);
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== TEACHER_EMAIL) return Response.json({ error: 'Teacher only' }, { status: 403 });
  const body = await request.json();
  const { data, error } = await db.from('classes').insert({
    name:          body.name,
    semester:      body.semester || '',
    teacher_email: TEACHER_EMAIL,
    seed_money:    body.seedMoney || 10000,
    trade_fee:     body.tradeFee || 0.005,
  }).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  data.join_code = await assignJoinCode(data.id).catch(() => null);
  return Response.json(data);
}
