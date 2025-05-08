// /api/process-intake.js

import { OpenAI } from 'openai';
import pdf from 'pdf-parse';
import Airtable from 'airtable';
import https from 'https';
import { assignAdvisorTier } from '../lib/assign-tier.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

export default async function handler(req, res) {
  try {
    const records = await base('Intake Submissions')
      .select({
        filterByFormula: "AND(Status = 'Pending', LEN({ADV Upload}) > 0)",
        maxRecords: 1
      })
      .firstPage();

    if (records.length === 0) {
      return res.status(200).json({ message: 'No pending submissions found.' });
    }

    const record = records[0];
    const id = record.id;
    const fields = record.fields;

    const advisorName = fields['Advisor Name'];
    const crdNumber = fields['CRD Number'];
    const brokerText = fields['BrokerCheck Text'];
    const advFileUrl = fields['ADV Upload'][0].url;

    // === Download and parse ADV PDF ===
    const advBuffer = await new Promise((resolve, reject) => {
      https.get(advFileUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      });
    });

    const parsed = await pdf(advBuffer);
    const advText = parsed.text.slice(0, 6000); // Trim to token limit

    // === GPT: ADV Scoring ===
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
"""${advText}"""
`;

    const advResponse = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: advPrompt }],
      temperature: 0.2,
    });

    const advData = JSON.parse(advResponse.choices[0].message.content);

    // === GPT: BrokerCheck classification ===
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
"""${brokerText}"""
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

    // === Write back to Airtable ===
    await base('Intake Submissions').update(id, {
      'Tier': tier,
      'Fiduciary Gap Score': advData.fiduciaryGapScore,
      'Grade (A–F)': advData.letterGrade,
      'Summary': advData.summary,
      'Status': 'Scored',
      'Raw Response': JSON.stringify({ advData, brokerData, reason })
    });

    res.status(200).json({
      advisorName,
      tier,
      score: advData.fiduciaryGapScore,
      reason
    });
  } catch (err) {
    console.error('Processing error:', err);
    res.status(500).json({ error: 'Failed to process intake', message: err.message });
  }
}
