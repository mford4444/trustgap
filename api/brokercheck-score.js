// /api/brokercheck-score.js
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  const { crdText, advisorName, crdNumber } = req.body;

  if (!crdText || crdText.length < 300) {
    return res.status(400).json({ error: 'Missing or insufficient BrokerCheck data.' });
  }

  const prompt = `
You are evaluating a financial advisor using public BrokerCheck profile data.

Based on the following text, classify the advisor into one of the following tiers:
- T1: RIA-only fiduciary, no broker-dealer affiliation
- T2-A: Hybrid advisor with fiduciary alignment and transparent conflicts
- T3: Broker-dealer affiliated, product-driven or unclear fiduciary alignment
- DQ: Disqualified due to major disciplinary history or misleading practices

Return your answer in this JSON format:

{
  "tier": "T1 | T2-A | T3 | DQ",
  "reason": "Short explanation of why they qualified or not",
  "hasDisclosures": true | false,
  "isDualRegistered": true | false,
  "usesInsuranceOrBDProducts": true | false
}

Advisor Profile:
"""
Name: ${advisorName}
CRD: ${crdNumber}

${crdText.slice(0, 6000)}
"""
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2
    });

    const response = completion.choices[0].message.content;

    let parsed;
    try {
      parsed = JSON.parse(response);
    } catch (err) {
      return res.status(500).json({ error: 'GPT returned non-JSON format', raw: response });
    }

    res.status(200).json({ ...parsed });
  } catch (err) {
    console.error('GPT error:', err);
    res.status(500).json({ error: 'OpenAI request failed', message: err.message });
  }
}
