// /api/advisor-data.js

import pdf from 'pdf-parse';
import https from 'https';
import httpsRequest from 'https';

module.exports = async (req, res) => {
  const firmCRD = '120562'; // Known working CRD with brochure link on public page

  try {
    const summaryUrl = `https://adviserinfo.sec.gov/firm/summary/${firmCRD}`;
    const html = await new Promise((resolve, reject) => {
      httpsRequest.get(summaryUrl, (response) => {
        let data = '';
        response.on('data', chunk => (data += chunk));
        response.on('end', () => resolve(data));
      }).on('error', reject);
    });

    const brochureMatch = html.match(/\/IAPD\/Content\/Common\/crd_iapd_Brochure\.aspx\?BRCHR_VRSN_ID=\d+/);
    if (!brochureMatch || brochureMatch.length === 0) {
      return res.status(404).json({ error: 'ADV brochure link not found on summary page' });
    }

    const brochurePath = brochureMatch[0];
    const brochureUrl = `https://adviserinfo.sec.gov${brochurePath}`;

    const buffer = await new Promise((resolve, reject) => {
      httpsRequest.get(brochureUrl, (response) => {
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
      totalPages: parsed.numpages
    });
  } catch (err) {
    console.error('Brochure fetch or parse error:', err);
    res.status(500).json({ error: 'Failed to download or parse brochure', message: err.message });
  }
};
