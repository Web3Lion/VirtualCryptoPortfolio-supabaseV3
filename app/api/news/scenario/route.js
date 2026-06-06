import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, getAllConfig, setConfig } from '@/lib/db';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

// GET — return cached scenario headlines (or empty if none)
export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const cfg = await getAllConfig();
  if (cfg.SCENARIO_ACTIVE !== '1' || !cfg.SCENARIO_DATE) return Response.json({ headlines: [], active: false });

  let headlines = [];
  try { headlines = JSON.parse(cfg.SCENARIO_HEADLINES || '[]'); } catch {}
  return Response.json({ headlines, active: true, date: cfg.SCENARIO_DATE, label: cfg.SCENARIO_LABEL });
}

// POST — generate headlines via Anthropic API (teacher only)
export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (TEACHER_EMAIL && session?.user?.email?.toLowerCase() !== TEACHER_EMAIL.toLowerCase())
    return Response.json({ error: 'Teacher only' }, { status: 403 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 });

  const cfg = await getAllConfig();
  if (cfg.SCENARIO_ACTIVE !== '1' || !cfg.SCENARIO_DATE)
    return Response.json({ error: 'No active scenario' }, { status: 400 });

  const scenarioDate  = cfg.SCENARIO_DATE;
  const scenarioLabel = cfg.SCENARIO_LABEL || scenarioDate;

  const prompt = `You are a crypto news writer. Generate exactly 5 realistic, educational crypto news headlines from around ${scenarioDate} (${scenarioLabel}).

These should reflect what was actually happening in cryptocurrency markets around that specific date. Be accurate to real historical events if you know them.

Return ONLY a valid JSON array with no other text. Each element must have:
- "title": a punchy news headline (max 12 words)
- "summary": one sentence of context (max 25 words)
- "emoji": one relevant emoji
- "sentiment": either "bullish", "bearish", or "neutral"

Example format:
[{"title":"Bitcoin Hits New ATH Above $69,000","summary":"BTC reaches record high as institutional adoption accelerates heading into Q4.","emoji":"🚀","sentiment":"bullish"}]`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-api-key':       apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 800,
        messages:   [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);
    const data = await res.json();
    const text = data.content?.[0]?.text || '[]';

    let headlines;
    try {
      // Extract JSON array from response (handle any surrounding text)
      const match = text.match(/\[[\s\S]*\]/);
      headlines = JSON.parse(match ? match[0] : text);
    } catch {
      return Response.json({ error: 'Could not parse Claude response', raw: text }, { status: 500 });
    }

    await setConfig('SCENARIO_HEADLINES', JSON.stringify(headlines));
    return Response.json({ success: true, headlines });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
