import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStudentByEmail } from '@/lib/students';
import { db } from '@/lib/db';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return Response.json({ error: 'Not authenticated' }, { status: 401 });

    const student = await getStudentByEmail(session.user.email);
    if (!student) return Response.json({ error: 'Not registered' }, { status: 403 });

    const { lessonId, classId, question } = await request.json();
    if (!lessonId || !question?.trim()) return Response.json({ error: 'Missing lessonId or question' }, { status: 400 });

    // Resolve classId
    let resolvedClassId = classId;
    if (!resolvedClassId) {
      const { data: cs } = await db.from('class_students').select('class_id').eq('student_id', student.id).order('joined_at', { ascending: false }).limit(1).single();
      resolvedClassId = cs?.class_id;
    }
    if (!resolvedClassId) return Response.json({ error: 'Not in a class' }, { status: 400 });

    // Check AI coach is enabled
    const { data: cfg } = await db.from('class_reward_config')
      .select('ai_coach_enabled, ai_allow_student_key, ai_student_key_limit')
      .eq('class_id', resolvedClassId).single();
    if (!cfg?.ai_coach_enabled) return Response.json({ error: 'AI features are not enabled for this class' }, { status: 403 });

    // Pick API key
    let geminiKey = null;
    if (cfg.ai_allow_student_key) {
      const { data: aiSettings } = await db.from('student_ai_settings').select('gemini_api_key').eq('student_id', student.id).single();
      if (aiSettings?.gemini_api_key) geminiKey = aiSettings.gemini_api_key;
    }
    if (!geminiKey) geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) return Response.json({ error: 'No Gemini API key configured' }, { status: 503 });

    // Fetch lesson title + text blocks for context
    const [{ data: lesson }, { data: blocks }] = await Promise.all([
      db.from('learn_lessons').select('title').eq('id', lessonId).single(),
      db.from('learn_blocks').select('block_type, content').eq('lesson_id', lessonId).in('block_type', ['heading', 'subheading', 'text']).order('order_index'),
    ]);

    const lessonContext = (blocks || [])
      .map(b => b.content?.text || '')
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 3000); // keep prompt manageable

    const prompt = [
      `You are a friendly, encouraging tutor for a high school cryptocurrency and blockchain class.`,
      `The student is currently reading the lesson: "${lesson?.title || 'Crypto Lesson'}".`,
      ``,
      `Lesson content (for context):`,
      lessonContext || '(no text content available)',
      ``,
      `Student's question: ${question.trim()}`,
      ``,
      `Answer in 2-4 sentences. Be clear, use simple language appropriate for high school, and relate your answer to the lesson content where possible. Never mention the source text directly — just answer naturally.`,
    ].join('\n');

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 220, temperature: 0.5 },
        }),
      }
    );

    if (!res.ok) {
      if (res.status === 429) return Response.json({ error: 'Rate limited — wait a moment and try again.' }, { status: 429 });
      const err = await res.text().catch(() => '');
      return Response.json({ error: `AI error ${res.status}: ${err.slice(0, 100)}` }, { status: 502 });
    }

    const data = await res.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Sorry, I could not generate an answer.';
    return Response.json({ answer });
  } catch (err) {
    return Response.json({ error: `Unexpected error: ${err.message}` }, { status: 500 });
  }
}
