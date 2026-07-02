import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return Response.json({ error: 'Not authenticated' }, { status: 401 });

    const { lessonId, count = 5 } = await request.json();
    if (!lessonId) return Response.json({ error: 'Missing lessonId' }, { status: 400 });

    // Fetch lesson + all text blocks
    const [{ data: lesson }, { data: blocks }] = await Promise.all([
      db.from('learn_lessons').select('title, pass_threshold').eq('id', lessonId).single(),
      db.from('learn_blocks').select('block_type, content, order_index').eq('lesson_id', lessonId).order('order_index'),
    ]);

    if (!lesson) return Response.json({ error: 'Lesson not found' }, { status: 404 });

    const lessonContext = (blocks || [])
      .map(b => {
        if (b.block_type === 'heading' || b.block_type === 'subheading') return `## ${b.content?.text || ''}`;
        if (b.block_type === 'text') return b.content?.text || '';
        if (b.block_type === 'video') return `[Video: ${b.content?.title || b.content?.url || ''}] ${b.content?.description || ''}`;
        if (b.block_type === 'article') return `[Article: ${b.content?.title || ''}: ${b.content?.description || ''}]`;
        return '';
      })
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 4000);

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) return Response.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 });

    const numQ = Math.min(Math.max(parseInt(count) || 5, 1), 10);

    const prompt = `You are an expert curriculum designer creating quiz questions for a high school cryptocurrency and blockchain class.

Lesson title: "${lesson.title}"

Lesson content:
${lessonContext || '(No text content — generate general questions about the lesson topic based on its title)'}

Generate exactly ${numQ} multiple choice questions that test comprehension of this lesson.

Return a JSON array — no markdown, no code fences, ONLY the raw JSON array. Each item must be:
{
  "question": "Question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctIndex": 0,
  "explanation": "Brief explanation of why this answer is correct"
}

Rules:
- correctIndex is 0–3 (index into options array)
- All 4 options must be plausible and distinct
- Questions should range from factual recall to applied understanding
- Language must be appropriate for high school students
- Vary correctIndex — don't always make it 0`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 2000, temperature: 0.7 },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      return Response.json({ error: `Gemini error ${res.status}: ${err.slice(0, 100)}` }, { status: 502 });
    }

    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    // Strip markdown code fences if present
    const clean = raw.replace(/^```json?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    let questions;
    try {
      questions = JSON.parse(clean);
    } catch {
      return Response.json({ error: 'Failed to parse AI response. Try again.', raw: clean.slice(0, 200) }, { status: 502 });
    }

    if (!Array.isArray(questions)) {
      return Response.json({ error: 'AI returned unexpected format', raw: clean.slice(0, 200) }, { status: 502 });
    }

    // Normalise into the lesson editor shape
    const normalised = questions.slice(0, numQ).map(q => ({
      id: 'new_' + Math.random().toString(36).slice(2),
      question_text: q.question || '',
      explanation: q.explanation || '',
      options: (q.options || []).map((opt, idx) => ({
        id: 'new_' + Math.random().toString(36).slice(2),
        option_text: opt,
        is_correct: idx === (q.correctIndex ?? 0),
      })),
    }));

    return Response.json({ questions: normalised });
  } catch (err) {
    return Response.json({ error: `Unexpected error: ${err.message}` }, { status: 500 });
  }
}
