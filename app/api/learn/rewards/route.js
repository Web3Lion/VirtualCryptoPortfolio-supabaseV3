import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('classId');
  if (!classId) return Response.json({ error: 'classId required' }, { status: 400 });

  const email = session.user.email.toLowerCase();
  const { data: student } = await db.from('students').select('id').eq('email', email).single();
  if (!student) return Response.json({ error: 'Student not found' }, { status: 404 });

  const [ledgerRes, modulesRes] = await Promise.all([
    db.from('class_reward_ledger')
      .select('*')
      .eq('student_id', student.id)
      .eq('class_id', classId)
      .order('created_at', { ascending: false }),
    db.from('learn_modules')
      .select('id, title, emoji')
      .or(`class_id.is.null,class_id.eq.${classId}`)
      .eq('is_published', true)
      .order('order_index'),
  ]);

  const moduleIds = (modulesRes.data || []).map(m => m.id);
  const { data: lessons } = moduleIds.length
    ? await db.from('learn_lessons')
        .select('id, title, tokens_reward, module_id')
        .in('module_id', moduleIds)
        .eq('is_published', true)
        .order('order_index')
    : { data: [] };

  return Response.json({
    ledger: ledgerRes.data || [],
    lessons: lessons || [],
    modules: modulesRes.data || [],
  });
}
