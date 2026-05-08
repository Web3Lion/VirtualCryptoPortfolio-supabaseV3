import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const view = searchParams.get('view');
  if (view === 'pushed') {
    const { data } = await db.from('pushed_articles').select('*').order('pushed_at', { ascending: false }).limit(6);
    return Response.json(data || []);
  }
  const { data } = await db.from('news_articles').select('*').order('published_at', { ascending: false }).limit(60);
  return Response.json(data || []);
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== TEACHER_EMAIL) return Response.json({ error: 'Teacher only' }, { status: 403 });
  const body = await request.json();
  if (body.manual) {
    if (!body.title || !body.url) return Response.json({ error: 'Title and URL required' }, { status: 400 });
    const { data: allPushed } = await db.from('pushed_articles').select('id').order('pushed_at', { ascending: true });
    if (allPushed && allPushed.length >= 6)
      await db.from('pushed_articles').delete().eq('id', allPushed[0].id);
    await db.from('pushed_articles').insert({
      title: body.title, url: body.url, source: body.source || 'Manual',
      image_url: body.image_url || '', summary: body.summary || '',
      pushed_by: session.user.email, is_manual: true,
    });
    return Response.json({ success: true, message: '📰 Article pushed to students' });
  }
  if (!body.articleId) return Response.json({ error: 'articleId required' }, { status: 400 });
  const { data: article } = await db.from('news_articles').select('*').eq('id', body.articleId).single();
  if (!article) return Response.json({ error: 'Article not found' }, { status: 404 });
  const { data: existing } = await db.from('pushed_articles').select('id').eq('url', article.url).single();
  if (existing) return Response.json({ error: 'Already pushed' }, { status: 400 });
  const { data: allPushed } = await db.from('pushed_articles').select('id').order('pushed_at', { ascending: true });
  if (allPushed && allPushed.length >= 6)
    await db.from('pushed_articles').delete().eq('id', allPushed[0].id);
  await db.from('pushed_articles').insert({
    article_id: article.id, title: article.title, url: article.url,
    source: article.source, image_url: article.image_url || '',
    summary: article.summary || '', pushed_by: session.user.email, is_manual: false,
  });
  return Response.json({ success: true, message: '📰 Article pushed to students' });
}

export async function DELETE(request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== TEACHER_EMAIL) return Response.json({ error: 'Teacher only' }, { status: 403 });
  const { pushedId } = await request.json();
  await db.from('pushed_articles').delete().eq('id', pushedId);
  return Response.json({ success: true, message: '🗑 Article removed' });
}
