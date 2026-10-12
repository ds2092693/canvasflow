export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, temperature = 0.7, maxTokens = 1000 } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages must be a non-empty array' });
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const openaiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const groqModel = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

  if (!openaiKey && !groqKey) {
    return res.status(503).json({
      error: 'No AI providers configured',
      message: 'Set OPENAI_API_KEY or GROQ_API_KEY in Vercel Environment Variables.',
    });
  }

  // Try OpenAI first if configured
  if (openaiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: openaiModel,
          messages,
          temperature: Math.min(Math.max(Number(temperature) || 0.7, 0), 2),
          max_tokens: Math.min(Math.max(Number(maxTokens) || 1000, 1), 4000),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return res.status(200).json({
          provider: 'openai',
          model: openaiModel,
          content: data.choices[0]?.message?.content || '',
          usage: data.usage,
        });
      }

      console.warn('OpenAI returned error status:', response.status);
    } catch (err) {
      console.warn('OpenAI request failed:', err);
    }
  }

  // Fallback to Groq if configured
  if (groqKey) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: groqModel,
          messages,
          temperature: Math.min(Math.max(Number(temperature) || 0.7, 0), 2),
          max_tokens: Math.min(Math.max(Number(maxTokens) || 1000, 1), 4000),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return res.status(200).json({
          provider: 'groq',
          model: groqModel,
          content: data.choices[0]?.message?.content || '',
        });
      }

      const errData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: 'Groq provider error',
        message: errData?.error?.message || response.statusText,
      });
    } catch (err) {
      return res.status(502).json({
        error: 'AI request failed',
        message: err.message || 'Unknown network error',
      });
    }
  }

  return res.status(502).json({
    error: 'All AI providers failed',
  });
}
