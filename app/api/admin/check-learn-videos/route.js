import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.email?.toLowerCase() !== TEACHER_EMAIL?.toLowerCase())
    return Response.json({ error: 'Teacher only' }, { status: 403 });

  const { data: modules } = await db.from('learn_modules').select('id, title, class_id').order('title');
  const results = [];

  for (const mod of (modules || [])) {
    const { data: lessons } = await db.from('learn_lessons').select('id, title').eq('module_id', mod.id).order('order_index');
    for (const lesson of (lessons || [])) {
      const { data: blocks } = await db.from('learn_blocks').select('id, content').eq('lesson_id', lesson.id).eq('block_type', 'video');
      for (const block of (blocks || [])) {
        const url = block.content?.url || '';
        const vid = url.includes('v=') ? url.split('v=')[1]?.split('&')[0] : url.split('/').pop();
        results.push({ module: mod.title, lesson: lesson.title, videoId: vid, url });
      }
    }
  }

  return Response.json(results);
}
