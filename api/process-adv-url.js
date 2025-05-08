// /api/process-adv-url.js
import pdf from 'pdf-parse';
import https from 'https';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST with { url } payload.' });
  }

  try {
    const body = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => data += chunk);
      req.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error('Invalid JSON payload'));
        }
      });
      req.on('error', reject);
    });

    const { url } = body;

    if (!url || !url.startsWith('http')) {
      return res.status(400).json({ error: 'Missing or invalid PDF URL' });
    }

    const buffer = await new Promise((resolve, reject) => {
      https.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Node.js)' }
      }, (response) => {
        if (response.statusCode !== 200) {
          return reject(new Error(`Failed to download PDF. Status code: ${response.statusCode}`));
        }
        const chunks = [];
        response.on('data', chunk => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
      }).on('error', reject);
    });

    const parsed = await pdf(buffer);

    res.status(200).json({
      sourceUrl: url,
      pdfTextPreview: parsed.text.slice(0, 1000),
      totalPages: parsed.numpages || null
    });
  } catch (err) {
    console.error('PDF download or parse error:', err);
    res.status(500).json({ error: 'Failed to process ADV PDF from URL', message: err.message });
  }
}
