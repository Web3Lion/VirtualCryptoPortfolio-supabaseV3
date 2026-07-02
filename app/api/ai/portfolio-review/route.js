import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const BUSY_MESSAGE = "The AI assistant is busy assisting others and will be back tomorrow.";

async function getStudentAndClass(email) {
  const { data: student } = await db.from('students').select('id').eq('email', email.toLowerCase()).single();
  if (!student) return {};
  const { data: cs } = await db.from('class_students').select('class_id')
    .eq('student_id', student.id).order('joined_at', { ascending: false }).limit(1).single();
  return { studentId: student.id, classId: cs?.class_id };
}

async function getTodayUsage(studentId, classId) {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await db.from('class_reward_ledger')
    .select('id')
    .eq('student_id', studentId).eq('class_id', classId)
    .like('reason', 'aicoach:%')
    .gte('created_at', `${today}T00:00:00Z`)
    .lt('created_at', `${today}T23:59:59Z`);
  return (data || []).length;
}

async function callGemini(prompt, apiKey) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 400, temperature: 0.6 },
      }),
    }
  );
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Gemini ${res.status}: ${errText.slice(0, 120)}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

function parseJsonFromAI(text) {
  // Strip markdown code fences if present
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  return JSON.parse(cleaned);
}

function buildPrompt({ totalValue, seedMoney, returnPct, cash, cashPct, holdings, sectors, hasLeverage, hasShorts, hasDca, coinCount }) {
  return `You are a crypto trading coach evaluating a high school student's portfolio for educational purposes.

Portfolio snapshot:
- Starting capital: $${seedMoney.toLocaleString()}
- Current value: $${totalValue.toLocaleString()}
- Return: ${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(2)}%
- Cash on hand: $${cash.toLocaleString()} (${cashPct.toFixed(0)}% of portfolio)
- Number of unique coins held: ${coinCount}
- Sectors represented: ${sectors.length > 0 ? sectors.join(', ') : 'none yet'}
- Holdings: ${holdings.length > 0 ? holdings.map(h => `${h.symbol} ($${h.value.toLocaleString()}, ${h.pct.toFixed(0)}%)`).join(', ') : 'no holdings'}
- Uses leverage / margin: ${hasLeverage ? 'yes' : 'no'}
- Has short positions: ${hasShorts ? 'yes' : 'no'}
- Uses Dollar-Cost Averaging (DCA): ${hasDca ? 'yes' : 'no'}

Score this portfolio on each dimension from 1–10:
- diversification: how well spread across different coins and sectors (1 coin = low, 5+ different sectors = high)
- riskManagement: appropriate cash buffer, not over-leveraged, not 100% in meme coins
- strategy: evidence of deliberate thinking — DCA, sector balance, mix of large/small cap
- performance: return relative to starting capital (negative = low, >20% = high)

Also assign an overall letter grade (A+, A, A-, B+, B, B-, C+, C, C-, D, F).

Return ONLY valid JSON — no markdown, no explanation — in exactly this format:
{
  "overallScore": 7,
  "grade": "B+",
  "scores": {
    "diversification": 8,
    "riskManagement": 6,
    "strategy": 7,
    "performance": 7
  },
  "summary": "One encouraging sentence summarizing the portfolio.",
  "suggestions": [
    "Specific actionable suggestion 1",
    "Specific actionable suggestion 2",
    "Specific actionable suggestion 3"
  ]
}`;
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();
    const { classId: bodyClassId, portfolio } = body;

    const { studentId, classId } = await getStudentAndClass(session.user.email);
    const effectiveClassId = bodyClassId || classId;
    if (!studentId || !effectiveClassId) return Response.json({ error: 'Not in a class' }, { status: 400 });

    const { data: cfg, error: cfgErr } = await db.from('class_reward_config')
      .select('ai_coach_enabled, ai_coach_daily_quota, ai_allow_student_key, ai_student_key_limit')
      .eq('class_id', effectiveClassId).single();

    if (cfgErr) return Response.json({ error: `DB error: ${cfgErr.message}` }, { status: 500 });
    if (!cfg?.ai_coach_enabled) return Response.json({ error: 'AI Coach is not enabled for this class. Enable it in teacher Controls → AI Coach.' }, { status: 403 });

    // Key resolution: student key > class key
    let geminiKey = null;
    let useStudentKey = false;
    if (cfg.ai_allow_student_key) {
      const { data: aiSettings } = await db.from('student_ai_settings')
        .select('gemini_api_key').eq('student_id', studentId).single();
      if (aiSettings?.gemini_api_key) { geminiKey = aiSettings.gemini_api_key; useStudentKey = true; }
    }
    if (!geminiKey) geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) return Response.json({ error: 'No Gemini API key — add GEMINI_API_KEY to Vercel environment variables.' }, { status: 503 });

    // Quota check
    const todayUsage = await getTodayUsage(studentId, effectiveClassId);
    if (useStudentKey) {
      const limit = cfg.ai_student_key_limit || 0;
      if (limit > 0 && todayUsage >= limit) return Response.json({ busy: true, message: BUSY_MESSAGE });
    } else {
      const quota = cfg.ai_coach_daily_quota ?? 5;
      if (todayUsage >= quota) return Response.json({ busy: true, message: BUSY_MESSAGE });
    }

    const prompt = buildPrompt(portfolio);
    let rawText;
    try {
      rawText = await callGemini(prompt, geminiKey);
    } catch (err) {
      return Response.json({ error: `Gemini API error: ${err.message}` }, { status: 503 });
    }

    let review;
    try {
      review = parseJsonFromAI(rawText);
    } catch {
      return Response.json({ error: 'AI returned an unexpected format — try again.', raw: rawText }, { status: 502 });
    }

    if (!review.overallScore || !review.scores || !review.suggestions) {
      return Response.json({ error: 'AI response incomplete — try again.' }, { status: 502 });
    }

    const today = new Date().toISOString().slice(0, 10);
    await db.from('class_reward_ledger').insert({
      student_id: studentId,
      class_id: effectiveClassId,
      tokens: 0,
      reason: `aicoach:${today}:portfolio-review`,
    });

    return Response.json({ review, usedStudentKey: useStudentKey, usageToday: todayUsage + 1 });
  } catch (err) {
    return Response.json({ error: `Unexpected error: ${err.message}` }, { status: 500 });
  }
}
