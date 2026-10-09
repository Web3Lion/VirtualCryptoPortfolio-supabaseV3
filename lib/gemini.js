// "-latest" alias tracks Google's newest Flash model, so a model retirement
// (like gemini-2.0-flash) doesn't break AI features. Set GEMINI_MODEL in the
// environment to pin a specific model instead.
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';

export function geminiUrl(apiKey) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
}
