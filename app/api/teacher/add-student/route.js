import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { enrollStudent, isTeacherEmail } from "@/lib/enroll";

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Not authenticated" }, { status: 401 });
  if (!isTeacherEmail(session.user?.email)) return Response.json({ error: "Teacher only" }, { status: 403 });

  const { name, email, classId } = await request.json();
  if (!name || !email || !classId)
    return Response.json({ error: "name, email, classId required" }, { status: 400 });

  const cleanEmail = email.toLowerCase().trim();
  try {
    const { studentId } = await enrollStudent({ name, email: cleanEmail, classId });
    await db.from("students").update({ name }).eq("id", studentId);
    return Response.json({
      success: true, studentId,
      message: `${name} added — they can now sign in with ${cleanEmail}`,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
