// Vercel Serverless Function — безопасный прокси для Anthropic API
// Ключ хранится в переменных окружения Vercel, не в коде

module.exports = async function handler(req, res) {
  // CORS — разрешаем запросы с любого источника
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight-запрос браузера
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const { question, kb } = req.body || {};
  if (!question || typeof question !== 'string' || question.length > 500) {
    return res.status(400).json({ error: 'Invalid question' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 280,
        system: kb || 'Ты помощник на портфолио. Отвечай кратко.',
        messages: [{ role: 'user', content: question }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({ error: 'Upstream error', detail: data });
    }

    const answer = data.content?.[0]?.text || 'Нет ответа';
    return res.status(200).json({ answer });

  } catch (err) {
    return res.status(500).json({ error: 'Server error', detail: err.message });
  }
};
