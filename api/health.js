export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    status: 'ok',
    openai: !!process.env.OPENAI_API_KEY,
    groq: !!process.env.GROQ_API_KEY,
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    groqModel: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
  });
}
