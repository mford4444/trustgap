// /api/advisor-data.js

import pdf from 'pdf-parse';
import https from 'https';

module.exports = async (req, res) => {
  const { crd } = req.query;

  if (!crd || typeof crd !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid CRD number' });
  }

  try {
    const pdfUrl = `https://files.adviserinfo.sec.gov/IAPD/Reports/ADV/${crd}/PDF/${crd}.pdf`;

    const fetchPdfBuffer = (url) => new Promise((resolve, reject) => {
      https.get(url, (response) => {
        if (response.statusCode !== 200) {
          return reject(new Error(`Failed to download PDF. Status code: ${response.statusCode}`));
        }
        const data = [];
        response.on('data', chunk => data.push(chunk));
        response.on('end', () => resolve(Buffer.concat(data)));
      }).on('error', reject);
    });

    const buffer = await fetchPdfBuffer(pdfUrl);
    const parsed = await pdf(buffer);

    res.status(200).json({
      advisorCRD: crd,
      pdfTextPreview: parsed.text.slice(0, 1000),
      totalPages: parsed.numpages
    });
  } catch (err) {
    console.error('PDF fetch or parse error:', err);
    res.status(500).json({ error: 'Failed to download or parse ADV PDF', message: err.message });
  }
};
