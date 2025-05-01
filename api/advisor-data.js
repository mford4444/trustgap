// /api/advisor-data.js

module.exports = async (req, res) => {
  const { crd } = req.query;

  if (!crd || typeof crd !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid CRD number' });
  }

  try {
    const secUrl = `https://files.adviserinfo.sec.gov/IAPD/CRD/${crd}.json`;
    const response = await fetch(secUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SEC JSON fetch failed:', response.status, errorText);
      return res.status(500).json({ error: 'Failed to fetch SEC CRD JSON', status: response.status });
    }

    const data = await response.json();

    const advisorName = data?.individual?.name || 'N/A';
    const firmName = data?.currentFirm?.name || 'N/A';
    const firmCRD = data?.currentFirm?.crdNum || 'N/A';
    const licenses = data?.registrations?.map(r => r.regTypeDesc) || [];
    const disclosures = data?.disclosureCount || 0;
    const bdAffiliated = data?.registrations?.some(r => r.orgTypeDesc?.toLowerCase().includes('broker-dealer'));

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
