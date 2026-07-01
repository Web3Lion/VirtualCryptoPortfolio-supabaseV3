import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

async function getStudentId(email) {
  const { data } = await db.from('students').select('id').eq('email', email.toLowerCase()).single();
  return data?.id;
}

// GET — return whether student has a key saved (never expose the key itself)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const studentId = await getStudentId(session.user.email);
  if (!studentId) return Response.json({ hasKey: false });

  const { data } = await db.from('student_ai_settings').select('gemini_api_key').eq('student_id', studentId).single();
  return Response.json({ hasKey: !!(data?.gemini_api_key) });
}

// POST — save or clear the student's Gemini API key
export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const { key } = await request.json();
  const studentId = await getStudentId(session.user.email);
  if (!studentId) return Response.json({ error: 'Student not found' }, { status: 404 });

  await db.from('student_ai_settings').upsert({
    student_id: studentId,
    gemini_api_key: key || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'student_id' });

  return Response.json({ success: true, hasKey: !!key });
}
