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
      const options = {
        headers: {
          'user-agent': 'Mozilla/5.0',
          'accept': 'text/html',
        },
      };

      https.get(url, options, (resp) => {
        let data = '';
        resp.on('data', (chunk) => (data += chunk));
        resp.on('end', () => resolve(data));
        resp.on('error', reject);
      }).on('error', reject);
    });

    // Try to extract JSON blob from embedded script
    const jsonMatch = html.match(/window\.__REACT_QUERY_INITIAL_QUERIES__\s*=\s*(\[.*?\]);/s);
    if (!jsonMatch) {
      throw new Error('Could not find embedded BrokerCheck data');
    }

    const embedded = JSON.parse(jsonMatch[1]);
    const dataObj = embedded[0]?.state?.data;
    const summary = dataObj?.bio || 'No summary available';

    res.status(200).json({
      crdNumber,
      summary
    });
  } catch (err) {
    console.error('Scrape error:', err);
    res.status(500).json({ error: 'Failed to scrape BrokerCheck', message: err.message });
  }
}
