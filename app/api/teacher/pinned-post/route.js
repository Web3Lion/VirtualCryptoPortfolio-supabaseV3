import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET — fetch current pinned post for a class (used by feed)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('classId');
  if (!classId) return Response.json({ pinned: null });

  const { data } = await db.from('class_reward_config')
    .select('pinned_message, pinned_updated_at')
    .eq('class_id', classId).single();

  if (!data?.pinned_message) return Response.json({ pinned: null });
  return Response.json({ pinned: { message: data.pinned_message, updatedAt: data.pinned_updated_at } });
}

// POST — teacher saves or clears pinned post
export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const { classId, message } = await request.json();
  if (!classId) return Response.json({ error: 'classId required' }, { status: 400 });

  const { data: cls } = await db.from('classes').select('teacher_email').eq('id', classId).single();
  if (cls?.teacher_email?.toLowerCase() !== session.user.email.toLowerCase()) {
    return Response.json({ error: 'Not your class' }, { status: 403 });
  }

  const update = message?.trim()
    ? { pinned_message: message.trim(), pinned_updated_at: new Date().toISOString() }
    : { pinned_message: null, pinned_updated_at: null };

  const { error } = await db.from('class_reward_config')
    .update(update).eq('class_id', classId);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true, cleared: !message?.trim() });
}
