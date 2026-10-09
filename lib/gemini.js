// "-latest" aliases track Google's newest Flash models, so a model retirement
// (like gemini-2.0-flash) doesn't break AI features. Set GEMINI_MODEL in the
// environment to pin a specific primary model instead.
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';
// Used when the primary model is overloaded (503) or out of quota (429).
const FALLBACK_MODEL = 'gemini-flash-lite-latest';

// Newer models spend output tokens "thinking" before they answer, and those
// count against maxOutputTokens — with our small caps that can leave an empty
// reply. Keep thinking low and give it headroom on top of the answer budget.
const THINKING_HEADROOM = 1024;

const RETRYABLE = new Set([500, 502, 503, 504]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function requestBody(model, prompt, { maxOutputTokens = 400, temperature = 0.7 } = {}) {
  const generationConfig = { temperature, maxOutputTokens: maxOutputTokens + THINKING_HEADROOM };
  // Gemini 2.x models reject thinkingLevel (relevant only if GEMINI_MODEL pins one).
  if (!/gemini-2/.test(model)) generationConfig.thinkingConfig = { thinkingLevel: 'LOW' };
  return JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig });
}

// Calls Gemini, retrying once on a transient server error and then falling
// back to a lighter model. Throws an Error with a classroom-friendly message
// and a `status` property when every attempt fails.
export async function generateText(apiKey, prompt, config) {
  const models = [...new Set([GEMINI_MODEL, FALLBACK_MODEL])];
  let lastStatus = 0;
  let lastDetail = '';

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await sleep(1200);
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: requestBody(model, prompt, config) }
      );
      if (res.ok) {
        const data = await res.json();
        const parts = data.candidates?.[0]?.content?.parts || [];
        return parts.filter((p) => !p.thought).map((p) => p.text || '').join('').trim();
      }
      lastStatus = res.status;
      lastDetail = (await res.text().catch(() => '')).slice(0, 160);
      // Overload: retry the same model once. Quota or missing model: go
      // straight to the fallback. Anything else (bad key, bad request) won't
      // be fixed by retrying.
      if (RETRYABLE.has(res.status)) continue;
      if (res.status === 429 || res.status === 404) break;
      const err = new Error(`Gemini ${res.status}: ${lastDetail}`);
      err.status = res.status;
      throw err;
    }
  }

  const err = new Error(
    lastStatus === 429
      ? 'Rate limited — the Gemini free tier allows only a few requests per minute. Wait a moment and try again.'
      : RETRYABLE.has(lastStatus)
        ? 'The AI service is busy right now (Google reports high demand). Try again in a minute.'
        : `Gemini ${lastStatus}: ${lastDetail}`
  );
  err.status = lastStatus;
  throw err;
}
