// Vercel Serverless Function — AI прокси
// Поддерживает Google Gemini (бесплатно) и Anthropic Claude (платно)
// Ключ хранится в переменных окружения Vercel — не виден посетителям

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { question, kb } = req.body || {};
  if (!question || typeof question !== 'string' || question.length > 500)
    return res.status(400).json({ error: 'Invalid question' });

  const geminiKey    = process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  try {
    // ── Вариант 1: Google Gemini (бесплатно) ──────────────────
    if (geminiKey) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiKey}`;
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: kb || 'Отвечай кратко.' }] },
          contents: [{ role: 'user', parts: [{ text: question }] }],
          generationConfig: { maxOutputTokens: 300 }
        })
      });
      const d = await r.json();
      if (!r.ok) return res.status(502).json({ error: 'Gemini error', detail: d });
      const answer = d.candidates?.[0]?.content?.parts?.[0]?.text || 'Нет ответа';
      return res.status(200).json({ answer });
    }

    // ── Вариант 2: Anthropic Claude (платно) ──────────────────
    if (anthropicKey) {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 280, system: kb, messages: [{ role: 'user', content: question }] })
      });
      const d = await r.json();
      if (!r.ok) return res.status(502).json({ error: 'Anthropic error', detail: d });
      const answer = d.content?.[0]?.text || 'Нет ответа';
      return res.status(200).json({ answer });
    }

    // ── Ключ не настроен ──────────────────────────────────────
    return res.status(500).json({ error: 'No API key configured' });

  } catch (err) {
    return res.status(500).json({ error: 'Server error', detail: err.message });
  }
};
