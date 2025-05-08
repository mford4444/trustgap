// /api/score-adv-text.js
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST' });
  }

  const { text, url } = req.body;

  if (!text || text.length < 500) {
    return res.status(400).json({ error: 'Missing or insufficient ADV text for scoring.' });
  }

  try {
    const prompt = `
You are an expert compliance analyst.

Based on the following SEC Form ADV excerpt, analyze and return the following as a JSON object:

{
  "scores": {
    "feeTransparency": [score 1–10],
    "conflictsDisclosure": [score 1–10],
    "custodyClarity": [score 1–10],
    "thirdPartyUse": [score 1–10],
    "disciplinaryDisclosure": [score 1–10]
  },
  "fiduciaryGapScore": [average score],
  "letterGrade": "A | B | C | D | F",
  "summary": "1-2 sentence summary of strengths and weaknesses."
}

ADV Text:
"""
${text.slice(0, 5000)}
"""
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2
    });

const content = completion.choices[0].message.content;

let parsed;
try {
  parsed = JSON.parse(content);
} catch (err) {
  return res.status(500).json({ error: 'Failed to parse GPT JSON output', raw: content });
}

res.status(200).json({
  sourceUrl: url || null,
  ...parsed
});
  } catch (err) {
    console.error('GPT scoring error:', err);
    res.status(500).json({ error: 'OpenAI request failed', message: err.message });
  }
}
