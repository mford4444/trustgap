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

    const json = await new Promise((resolve, reject) => {
      const options = {
        headers: {
          'accept': 'application/json',
          'user-agent': 'Mozilla/5.0',
          'referer': `https://brokercheck.finra.org/`,
        },
      };

      https.get(url, options, (resp) => {
        let data = '';
        resp.on('data', (chunk) => (data += chunk));
        resp.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (e) {
            reject(new Error('Failed to parse JSON from BrokerCheck'));
          }
        });
      }).on('error', reject);
    });

    const summary = json.individual?.bio || 'No summary available';

    res.status(200).json({
      crdNumber,
      summary
    });
  } catch (err) {
    console.error('Scrape error:', err);
    res.status(500).json({ error: 'Failed to scrape BrokerCheck', message: err.message });
  }
}
