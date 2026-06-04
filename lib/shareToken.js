import crypto from 'crypto';

const SECRET = process.env.NEXTAUTH_SECRET || 'cryptoclass-share-secret';

export function generateShareToken(studentId, classId) {
  const payload = `${studentId}:${classId}`;
  const encoded = Buffer.from(payload).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(encoded).digest('base64url').slice(0, 16);
  return `${encoded}.${sig}`;
}

export function verifyShareToken(token) {
  try {
    const dot = token.lastIndexOf('.');
    if (dot < 0) return null;
    const encoded = token.slice(0, dot);
    const sig     = token.slice(dot + 1);
    const expected = crypto.createHmac('sha256', SECRET).update(encoded).digest('base64url').slice(0, 16);
    if (sig !== expected) return null;
    const payload = Buffer.from(encoded, 'base64url').toString('utf8');
    const [studentId, classId] = payload.split(':');
    if (!studentId || !classId) return null;
    return { studentId, classId };
  } catch { return null; }
}
