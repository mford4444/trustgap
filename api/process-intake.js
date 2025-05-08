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
    const advBuffer = await new Promise((resolve
