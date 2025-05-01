// /api/upload-adv.js

import pdf from 'pdf-parse';
import multiparty from 'multiparty';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST with a PDF file.' });
  }

  const form = new multiparty.Form();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Form parse error:', err);
      return res.status(500).json({ error: 'Failed to parse upload form' });
    }

    try {
      const file = files?.file?.[0];
      if (!file || file.headers['content-type'] !== 'application/pdf') {
        return res.status(400).json({ error: 'No valid PDF file uploaded' });
      }

      const buffer = fs.readFileSync(file.path);
      const parsed = await pdf(buffer);

      res.status(200).json({
        filename: file.originalFilename,
        pdfTextPreview: parsed.text.slice(0, 1000),
        totalPages: parsed.numpages
      });
    } catch (err) {
      console.error('PDF upload parse error:', err);
      res.status(500).json({ error: 'Failed to parse uploaded PDF', message: err.message });
    }
  });
};
