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
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 180, temperature: 0.7 },
      }),
    }
  );
  if (!res.ok) {
    if (res.status === 429) throw new Error('Rate limited — the free Gemini tier allows ~15 requests/min. Wait a moment and try again.');
    const errText = await res.text().catch(() => '');
    throw new Error(`Gemini ${res.status}: ${errText.slice(0, 120)}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

function buildPrompt({ action, symbol, price, qty, total, pl, plPct, holdDays, change24h }) {
  const parts = [
    `You are a friendly crypto trading coach for a high school classroom.`,
    `A student just made this trade:`,
    `- Action: ${action}`,
    `- Coin: ${symbol}`,
    `- Price: $${parseFloat(price).toLocaleString()}`,
    `- Quantity: ${qty}`,
    `- Total value: $${parseFloat(total).toLocaleString()}`,
  ];
  if (pl !== undefined && pl !== null) {
    const dir = parseFloat(plPct) >= 0 ? 'gain' : 'loss';
    parts.push(`- P/L: ${parseFloat(plPct) >= 0 ? '+' : ''}${parseFloat(plPct).toFixed(2)}% (${dir} of $${Math.abs(parseFloat(pl)).toFixed(2)})`);
  }
  if (holdDays !== undefined) parts.push(`- Hold duration: ${holdDays} day${holdDays === 1 ? '' : 's'}`);
  if (change24h !== undefined) parts.push(`- ${symbol} 24h change: ${change24h >= 0 ? '+' : ''}${parseFloat(change24h).toFixed(2)}%`);
  parts.push(`\nWrite 2-3 sentences of educational insight about this specific trade. Be encouraging, concrete, and use the actual numbers. No jargon. No lists — just a short paragraph.`);
  return parts.join('\n');
}

export async function POST(request) {
  try {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const { classId: bodyClassId, trade } = body;

  const { studentId, classId } = await getStudentAndClass(session.user.email);
  const effectiveClassId = bodyClassId || classId;
  if (!studentId || !effectiveClassId) return Response.json({ error: 'Not in a class' }, { status: 400 });

  const { data: cfg } = await db.from('class_reward_config')
    .select('ai_coach_enabled, ai_coach_daily_quota, ai_allow_student_key, ai_student_key_limit')
    .eq('class_id', effectiveClassId).single();

  if (!cfg?.ai_coach_enabled) return Response.json({ error: 'AI Coach is not enabled for this class' }, { status: 403 });

  // Prefer student's own key if teacher allows it
  let geminiKey = null;
  let useStudentKey = false;
  if (cfg.ai_allow_student_key) {
    const { data: aiSettings } = await db.from('student_ai_settings')
      .select('gemini_api_key').eq('student_id', studentId).single();
    if (aiSettings?.gemini_api_key) {
      geminiKey = aiSettings.gemini_api_key;
      useStudentKey = true;
    }
  }
  // Fall back to class Gemini key
  if (!geminiKey) geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return Response.json({ error: 'No Gemini API key configured. Ask your teacher to add GEMINI_API_KEY to the server environment.' }, { status: 503 });

  // Quota check
  const todayUsage = await getTodayUsage(studentId, effectiveClassId);
  if (useStudentKey) {
    const limit = cfg.ai_student_key_limit || 0;
    if (limit > 0 && todayUsage >= limit) return Response.json({ busy: true, message: BUSY_MESSAGE });
  } else {
    const quota = cfg.ai_coach_daily_quota ?? 5;
    if (todayUsage >= quota) return Response.json({ busy: true, message: BUSY_MESSAGE });
  }

  const prompt = buildPrompt(trade);
  let insight;
  try {
    insight = await callGemini(prompt, geminiKey);
  } catch (err) {
    return Response.json({ error: 'AI service unavailable — try again shortly', detail: err.message }, { status: 503 });
  }

  const today = new Date().toISOString().slice(0, 10);
  await db.from('class_reward_ledger').insert({
    student_id: studentId,
    class_id: effectiveClassId,
    tokens: 0,
    reason: `aicoach:${today}:${trade.symbol}`,
  });

  return Response.json({
    insight,
    usedStudentKey: useStudentKey,
    usageToday: todayUsage + 1,
    quota: useStudentKey ? (cfg.ai_student_key_limit || null) : (cfg.ai_coach_daily_quota ?? 5),
  });
  } catch (err) {
    return Response.json({ error: `Unexpected error: ${err.message}` }, { status: 500 });
  }
}
