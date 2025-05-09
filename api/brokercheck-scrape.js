// /api/brokercheck-scrape.js

import https from 'https';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Use POST with { crdNumber } in body.' });
    }

    const { crdNumber } = req.body;
    if (!crdNumber) {
      return res.status(400).json({ error: 'Missing CRD number' });
    }

    const url = `https://brokercheck.finra.org/individual/summary/${crdNumber}`;

    const html = await new Promise((resolve, reject) => {
      https.get(url, (resp) => {
        let data = '';
        resp.on('data', (chunk) => (data += chunk));
        resp.on('end', () => resolve(data));
      }).on('error', reject);
    });

    const summaryMatch = html.match(/"description":"([^"]+)"/);
    const summary = summaryMatch ? decodeURIComponent(summaryMatch[1]) : 'No summary found.';

    res.status(200).json({
      crdNumber,
      summary
    });
  } catch (err) {
    console.error('Scrape error:', err);
    res.status(500).json({ error: 'Failed to scrape BrokerCheck', message: err.message });
  }
}
