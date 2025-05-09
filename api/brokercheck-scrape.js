// /api/brokercheck-scrape.js

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Use POST with { crdNumber } in body.' });
    }

    const { crdNumber } = req.body;
    if (!crdNumber) {
      return res.status(400).json({ error: 'Missing CRD number' });
    }

    const url = `https://brokercheck.finra.org/api/individual/summary/${crdNumber}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'user-agent': 'Mozilla/5.0',
        'referer': 'https://brokercheck.finra.org/'
      }
    });

    if (!response.ok) {
      throw new Error(`BrokerCheck API error: ${response.status}`);
    }

    const data = await response.json();
    const summary = data.individual?.bio || 'No summary available';

    res.status(200).json({
      crdNumber,
      summary
    });
  } catch (err) {
    console.error('Scrape error:', err);
    res.status(500).json({ error: 'Failed to scrape BrokerCheck', message: err.message });
  }
}
