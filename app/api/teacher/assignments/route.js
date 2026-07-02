import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/teacher/assignments?classId=... — list active assignments
export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('classId');
  if (!classId) return Response.json({ error: 'Missing classId' }, { status: 400 });

  const { data: assignments, error } = await db.from('assignments')
    .select('id, lesson_id, title, description, due_at, active, created_at')
    .eq('class_id', classId)
    .order('created_at', { ascending: false });

  if (error?.code === '42703') {
    // lesson_id column missing — run migration
    return Response.json({ error: 'Run migration: ALTER TABLE assignments ADD COLUMN IF NOT EXISTS lesson_id uuid;', needsMigration: true }, { status: 503 });
  }

  // Fetch lesson titles for assignments that have lesson_id
  const lessonIds = [...new Set((assignments || []).map(a => a.lesson_id).filter(Boolean))];
  let lessonMap = {};
  if (lessonIds.length) {
    const { data: lessons } = await db.from('learn_lessons').select('id, title').in('id', lessonIds);
    (lessons || []).forEach(l => { lessonMap[l.id] = l.title; });
  }

  // Fetch completion counts
  const assignmentIds = (assignments || []).map(a => a.id);
  let completionCounts = {};
  if (assignmentIds.length) {
    const { data: completions } = await db.from('assignment_completions').select('assignment_id').in('assignment_id', assignmentIds);
    (completions || []).forEach(c => { completionCounts[c.assignment_id] = (completionCounts[c.assignment_id] || 0) + 1; });
  }

  return Response.json({
    assignments: (assignments || []).map(a => ({
      ...a,
      lessonTitle: a.lesson_id ? lessonMap[a.lesson_id] : null,
      completions: completionCounts[a.id] || 0,
    })),
  });
}

// POST /api/teacher/assignments — create assignment
export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const { classId, lessonId, title, description, dueAt } = await request.json();
  if (!classId || !title?.trim()) return Response.json({ error: 'Missing classId or title' }, { status: 400 });

  const { data, error } = await db.from('assignments').insert({
    class_id: classId,
    lesson_id: lessonId || null,
    title: title.trim(),
    description: description?.trim() || null,
    due_at: dueAt || null,
    active: true,
  }).select().single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ assignment: data });
}

// PATCH /api/teacher/assignments — update or close assignment
export async function PATCH(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const { id, active, title, description, dueAt } = await request.json();
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  const updates = {};
  if (typeof active === 'boolean') updates.active = active;
  if (title !== undefined) updates.title = title.trim();
  if (description !== undefined) updates.description = description?.trim() || null;
  if (dueAt !== undefined) updates.due_at = dueAt || null;

  const { error } = await db.from('assignments').update(updates).eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
