// /api/advisor-data.js

module.exports = async (req, res) => {
  const { crd } = req.query;

  if (!crd || typeof crd !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid CRD number' });
  }

  try {
    // Dummy data (can be replaced with real ADV/FINRA scraping later)
    const secJson = {
      name: "Test Advisor",
      firm: {
        crd: "304390",
        name: "Alyphyn Capital Management"
      },
      aum: "$50M+"
    };

    const finraSummary = {
      disclosures: 0,
      licenses: ['Series 65'],
      bdAffiliated: false,
    };

    const responsePayload = {
      advisorCRD: crd,
      advisorName: secJson.name,
      firmCRD: secJson.firm.crd,
      firmName: secJson.firm.name,
      aum: secJson.aum,
      advPart2Url: `https://adviserinfo.sec.gov/individual/${crd}`,
      finra: finraSummary
    };

    res.status(200).json(responsePayload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch advisor data' });
  }
};
