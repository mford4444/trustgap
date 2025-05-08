// /api/advisor-data.js

import pdf from 'pdf-parse';
import https from 'https';

export default async function handler(req, res) {
  const brochureUrl = 'https://files.adviserinfo.sec.gov/IAPD/Content/Common/crd_iapd_Brochure.aspx?BRCHR_VRSN_ID=822410'; // Direct working PDF link
  const firmCRD = '287966'; // Creative Planning LLC

  try {
    const buffer = await new Promise((resolve, reject) => {
      https.get(brochureUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Node.js)' }
      }, (response) => {
        if (response.statusCode !== 200) {
          return reject(new Error(`Failed to download brochure. Status code: ${response.statusCode}`));
        }
        const chunks = [];
        response.on('data', chunk => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
      }).on('error', reject);
    });

    const parsed = await pdf(buffer);

    res.status(200).json({
      advisorCRD: firmCRD,
      brochureUrl,
      pdfTextPreview: parsed.text.slice(0, 1000),
      totalPages: parsed.numpages || null
    });
  } catch (err) {
    console.error('Brochure fetch or parse error:', err);
    res.status(500).json({ error: 'Failed to download or parse brochure', message: err.message });
  }
}
