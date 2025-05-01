// /api/advisor-data.js

module.exports = async (req, res) => {
  const { crd } = req.query;

  if (!crd || typeof crd !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid CRD number' });
  }

  try {
    const summaryUrl = `https://adviserinfo.sec.gov/individual/summary/${crd}`;
    const response = await fetch(summaryUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SEC summary fetch failed:', response.status, errorText);
      return res.status(500).json({ error: 'Failed to fetch SEC summary HTML', status: response.status });
    }

    const html = await response.text();
    const jsonMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);

    if (!jsonMatch || jsonMatch.length < 2) {
      return res.status(500).json({ error: 'Failed to extract SEC embedded JSON' });
    }

    const nextData = JSON.parse(jsonMatch[1]);
    const data = nextData?.props?.pageProps?.dehydratedState?.queries?.[0]?.state?.data;

    if (!data) {
      return res.status(500).json({ error: 'SEC profile data missing from parsed JSON' });
    }

    const advisorName = data?.individual?.firstName + ' ' + data?.individual?.lastName || 'N/A';
    const firmName = data?.employment?.firm?.name || 'N/A';
    const firmCRD = data?.employment?.firm?.crdNumber || 'N/A';
    const licenses = data?.registrations?.map(r => r.registrationType) || [];
    const disclosures = data?.disclosures?.disclosureCount || 0;
    const bdAffiliated = data?.registrations?.some(r => r.firmType === 'BD');

    const result = {
      advisorCRD: crd,
      advisorName,
      firmCRD,
      firmName,
      advPart2Url: `https://adviserinfo.sec.gov/individual/${crd}`,
      finra: {
        disclosures,
        licenses,
        bdAffiliated,
      },
    };

    res.status(200).json(result);
  } catch (err) {
    console.error('Unexpected error:', err);
    res.status(500).json({ error: 'Unexpected server error', message: err.message });
  }
};
