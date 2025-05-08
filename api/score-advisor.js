// /api/score-advisor.js

import { OpenAI } from 'openai';
import { assignAdvisorTier } from '@/lib/assign-tier.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  const { advText, brokerText, advisorName, crdNumber } = req.body;

  if (!advText || !brokerText || !advisorName || !crdNumber) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    // === ADV GPT scoring ===
    const advPrompt = `
You are an expert compliance analyst.

Based on the following SEC Form ADV excerpt, return this JSON:

{
  "scores": {
    "feeTransparency": [1-10],
    "conflictsDisclosure": [1-10],
    "custodyClarity": [1-10],
    "thirdPartyUse": [1-10],
    "disciplinaryDisclosure": [1-10]
  },
  "fiduciaryGapScore": [average],
  "letterGrade": "A | B | C | D | F",
  "summary": "Short description of strengths/weaknesses"
}

ADV Text:
"""${advText.slice(0, 5000)}"""
`;

    const advResponse = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: advPrompt }],
      temperature: 0.2,
    });

    const advData = JSON.parse(advResponse.choices[0].message.content);

    // === BrokerCheck GPT scoring ===
    const brokerPrompt = `
You are evaluating a financial advisor using public BrokerCheck data.

Return this JSON:

{
  "hasDisclosures": true | false,
  "isDualRegistered": true | false,
  "usesInsuranceOrBDProducts": true | false
}

Advisor: ${advisorName}
CRD: ${crdNumber}

BrokerCheck Profile:
"""${brokerText.slice(0, 6000)}"""
`;

    const brokerResponse = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: brokerPrompt }],
      temperature: 0.2,
    });

    const brokerData = JSON.parse(brokerResponse.choices[0].message.content);

    // === Assign final tier ===
    const { tier, reason } = assignAdvisorTier({
      fiduciaryGapScore: advData.fiduciaryGapScore,
      ...brokerData,
    });

    // === Final response ===
    res.status(200).json({
      advisorName,
      crdNumber,
      tier,
      reason,
      fiduciaryGapScore: advData.fiduciaryGapScore,
      letterGrade: advData.letterGrade,
      summary: advData.summary,
      scores: advData.scores,
      ...brokerData,
    });
  } catch (err) {
    console.error('Error in score-advisor:', err);
    res.status(500).json({ error: 'Failed to generate advisor report', message: err.message });
  }
}
