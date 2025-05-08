// lib/assign-tier.js

export function assignAdvisorTier({
  fiduciaryGapScore,
  hasDisclosures,
  isDualRegistered,
  usesInsuranceOrBDProducts,
}) {
  // Auto-disqualify logic (if you add it later)
  if (hasDisclosures) return { tier: 'DQ', reason: 'Advisor has regulatory or client disclosures.' };

  // T1: RIA-only, high fiduciary score, no BD products
  if (!isDualRegistered && !usesInsuranceOrBDProducts && fiduciaryGapScore >= 7) {
    return { tier: 'T1', reason: 'RIA-only fiduciary with strong score and no BD product use.' };
  }

  // T2: Hybrid advisors who act in best interest and score decently
  if (fiduciaryGapScore >= 5) {
    return { tier: 'T2', reason: 'Dual-registered advisor with acceptable fiduciary alignment.' };
  }

  // T3: BD-first, lower score, or product-driven
  return {
    tier: 'T3',
    reason: 'Advisor appears product-driven, uses BD tools, and scores below fiduciary threshold.',
  };
}
