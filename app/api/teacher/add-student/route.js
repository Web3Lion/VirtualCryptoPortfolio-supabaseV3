import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { name, email, classId } = await request.json();
  if (!name || !email || !classId)
    return Response.json({ error: "name, email, classId required" }, { status: 400 });

  const cleanEmail = email.toLowerCase().trim();

  // 1. Find or create student record
  let studentId;
  const { data: existing } = await db.from("students").select("id").eq("email", cleanEmail).single();
  if (existing?.id) {
    studentId = existing.id;
    await db.from("students").update({ name }).eq("id", studentId);
  } else {
    const { data: newStudent, error } = await db
      .from("students")
      .insert({ name, email: cleanEmail, is_bot: false })
      .select("id")
      .single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    studentId = newStudent.id;
  }

  // 2. Enroll in class
  await db.from("class_students").upsert(
    { student_id: studentId, class_id: classId, joined_at: new Date().toISOString() },
    { onConflict: "student_id,class_id" }
  );

  // 3. Create portfolio if missing
  const { data: cls } = await db.from("classes").select("seed_money").eq("id", classId).single();
  const seedMoney = parseFloat(cls?.seed_money || 10000);
  const { data: existingPortfolio } = await db.from("portfolios").select("id")
    .eq("student_id", studentId).eq("class_id", classId).single();
  if (!existingPortfolio) {
    await db.from("portfolios").insert({
      student_id: studentId, class_id: classId, cash: seedMoney, fees_paid: 0,
    });
  }

  return Response.json({
    success: true, studentId,
    message: `${name} added — they can now sign in with ${cleanEmail}`,
  });
}
