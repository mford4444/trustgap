// /api/advisor-data.js

module.exports = async (req, res) => {
  const { crd } = req.query;

  if (!crd || typeof crd !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid CRD number' });
  }

  try {
    const secUrl = `https://adviserinfo.sec.gov/IAPD/IAPDIndividualSummary.aspx?INDIVIDUAL_CRD_NUM=${crd}`;
    const response = await fetch(secUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SEC fetch failed:', response.status, errorText);
      return res.status(500).json({ error: 'Failed to fetch SEC data', status: response.status, body: errorText });
    }

    const data = await response.json();

    const advisorName = data?.Individual?.Name || 'N/A';
    const firmName = data?.CurrentEmployers?.[0]?.FirmName || 'N/A';
    const firmCRD = data?.CurrentEmployers?.[0]?.CRDNumber || 'N/A';
    const licenses = data?.RegistrationHistory?.map(r => r.LicenseType) || [];
    const disclosures = data?.Disclosures?.DisclosureCount || 0;
    const bdAffiliated = data?.RegistrationHistory?.some(r => r.FirmType === 'Broker-Dealer');

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
