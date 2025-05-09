// puppeteer-brokercheck-scraper.js

import puppeteer from 'puppeteer';

export async function scrapeBrokerCheck(crdNumber) {
  const url = `https://brokercheck.finra.org/individual/summary/${crdNumber}`;
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Wait for React data to be defined
    await page.waitForFunction(() => window.__REACT_QUERY_INITIAL_QUERIES__, { timeout: 10000 });

    const data = await page.evaluate(() => {
      try {
        const raw = window.__REACT_QUERY_INITIAL_QUERIES__;
        const obj = raw?.[0]?.state?.data;
        return {
          summary: obj?.bio || 'No summary available',
          disclosuresCount: obj?.disclosures?.length || 0,
          yearsOfExperience: obj?.yearsOfExperience || null,
          isPreviouslyRegistered: obj?.isPreviouslyRegistered || false,
          affiliations: obj?.registrations?.map(r => r.firm?.name).filter(Boolean) || []
        };
      } catch (err) {
        return { error: 'Failed to extract data', details: err.toString() };
      }
    });

    await browser.close();
    return { crdNumber, ...data };
  } catch (err) {
    await browser.close();
    throw new Error(`Puppeteer scrape failed: ${err.message}`);
  }
}

// Example usage:
// (async () => {
//   const result = await scrapeBrokerCheck('4508063');
//   console.log(result);
// })();
