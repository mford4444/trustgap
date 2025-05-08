// /api/score-adv-text.js

import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { text, url } = req.body;

  if (!text || text.length < 500) {
    return res.status(400).json({ error: 'Missing or insufficient ADV text for scoring.' });
  }

  try {
    const prompt = `
You are an expert compliance analyst. Based on the following SEC Form ADV text, evaluate the quality of fiduciary care provided by the advisory firm. Score each of the following on a scale from 1 (very poor) to 10 (excellent):

1. Fee Transparency
2. Conflicts of Interest Disclosure
3. Custody Clarity
4. Use of Third-Party Products
5. Disciplinary History Disclosure

Provide:
- A score for each category
- A brief explanation for each
- An overall Fiduciary Gap Score (average of above)
- A suggested letter grade (A, B, C)

ADV Text (excerpt):

""" 
${text.slice(0, 5000)}
"""
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    });

    const responseText = completion.choices[0].message.content;

    res.status(200).json({
      sourceUrl: url || null,
      scoringOutput: responseText,
    });
  } catch (err) {
    console.error('Scoring error:', err);
    res.status(500).json({ error: 'Failed to score ADV text', message: err.message });
  }
};
