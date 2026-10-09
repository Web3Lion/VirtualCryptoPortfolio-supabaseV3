import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  if (!token) return Response.json({ error: 'Token required' }, { status: 400 });

  const { data: inv } = await db.from('invitations').select('*, classes(id, name, seed_money)').eq('token', token).single();
  if (!inv) return Response.json({ error: 'Invalid or expired invitation' }, { status: 404 });
  if (inv.accepted) return Response.json({ error: 'Invitation already used', alreadyAccepted: true });

  return Response.json({ valid: true, name: inv.name, email: inv.email, className: inv.classes?.name, classId: inv.class_id, token });
}

export async function POST(request) {
  // Trust only the signed-in account, never an email from the request body.
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return Response.json({ error: 'Sign in first' }, { status: 401 });
  const { token } = await request.json();
  if (!token) return Response.json({ error: 'Token required' }, { status: 400 });

  const { data: inv } = await db.from('invitations').select('*, classes(id, seed_money)').eq('token', token).single();
  if (!inv) return Response.json({ error: 'Invalid invitation' }, { status: 404 });
  if (inv.accepted) return Response.json({ error: 'Already accepted', alreadyAccepted: true });

  // Check email matches
  if (inv.email.toLowerCase() !== email.toLowerCase())
    return Response.json({ error: 'Email does not match invitation' }, { status: 403 });

  // Create or find student
  let student;
  const { data: existing } = await db.from('students').select('*').eq('email', email.toLowerCase()).single();
  if (existing) {
    student = existing;
  } else {
    const { data: newStudent } = await db.from('students').insert({ name: inv.name, email: email.toLowerCase() }).select().single();
    student = newStudent;
  }

  // Add to class if not already
  await db.from('class_students').upsert({ class_id: inv.class_id, student_id: student.id }, { onConflict: 'class_id,student_id' });

  // Create portfolio if not exists
  await db.from('portfolios').upsert({
    student_id: student.id,
    class_id:   inv.class_id,
    cash:       parseFloat(inv.classes?.seed_money || 10000),
    fees_paid:  0,
  }, { onConflict: 'student_id,class_id' });

  // Mark invitation as accepted
  await db.from('invitations').update({ accepted: true, accepted_at: new Date().toISOString() }).eq('token', token);

  return Response.json({ success: true, studentId: student.id, classId: inv.class_id });
}
