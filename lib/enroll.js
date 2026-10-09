import { randomInt } from 'crypto';
import { db } from './db';

// No 0/O/1/I/L so codes survive being read aloud or copied off a board.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

export function isTeacherEmail(email) {
  const teacher = process.env.TEACHER_EMAIL?.toLowerCase();
  return !!teacher && email?.toLowerCase() === teacher;
}

export function normalizeJoinCode(code) {
  return String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function randomCode() {
  return Array.from({ length: CODE_LENGTH }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
}

// Gives the class a fresh join code (or its first one). Retries on the rare
// unique-constraint collision.
export async function assignJoinCode(classId) {
  for (let i = 0; i < 5; i++) {
    const code = randomCode();
    const { data, error } = await db.from('classes').update({ join_code: code }).eq('id', classId).select('join_code').single();
    if (!error) return data.join_code;
    if (error.code !== '23505') throw new Error(error.message);
  }
  throw new Error('Could not generate a unique join code');
}

// Find-or-create the student, enroll them in the class, and give them a
// starting portfolio. An existing portfolio is left untouched so re-adding a
// student never wipes their cash.
export async function enrollStudent({ name, email, classId }) {
  const cleanEmail = email.toLowerCase().trim();

  const { data: cls } = await db.from('classes').select('id, name, seed_money').eq('id', classId).single();
  if (!cls) throw new Error('Class not found');

  let studentId;
  const { data: existing } = await db.from('students').select('id').eq('email', cleanEmail).single();
  if (existing?.id) {
    studentId = existing.id;
  } else {
    const { data: newStudent, error } = await db
      .from('students')
      .insert({ name, email: cleanEmail, is_bot: false })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    studentId = newStudent.id;
  }

  const { data: membership } = await db.from('class_students').select('student_id')
    .eq('student_id', studentId).eq('class_id', classId).maybeSingle();
  if (!membership) {
    await db.from('class_students').insert({ student_id: studentId, class_id: classId, joined_at: new Date().toISOString() });
  }

  const { data: existingPortfolio } = await db.from('portfolios').select('id')
    .eq('student_id', studentId).eq('class_id', classId).maybeSingle();
  if (!existingPortfolio) {
    await db.from('portfolios').insert({
      student_id: studentId, class_id: classId, cash: parseFloat(cls.seed_money || 10000), fees_paid: 0,
    });
  }

  return { studentId, classId, className: cls.name, alreadyMember: !!membership };
}
