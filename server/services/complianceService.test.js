import test from 'node:test';
import assert from 'node:assert/strict';

import { evaluateCompliance, retrieveRelevantPolicies } from './complianceService.js';

test('retrieves relevant compliance policies for site onboarding queries', () => {
  const results = retrieveRelevantPolicies('site investigator training nda cv expiry');
  assert.ok(results.length > 0);
  assert.ok(results.some((item) => item.title.toLowerCase().includes('clinical compliance')));
});

test('uses retrieved policy context to support a compliance exception decision', () => {
  const result = evaluateCompliance({
    siteCode: 'US-2047',
    investigator: 'Dr. Emily Ng',
    region: 'Western Europe',
    documents: ['cv', 'nda'],
    trainingComplete: false,
    ndaSigned: false,
    licenseExpiryDays: 12
  });

  assert.equal(result.status, 'exception_required');
  assert.ok(Array.isArray(result.policyEvidence));
  assert.ok(result.policyEvidence.length > 0);
  assert.match(result.summary, /policy|retrieval|compliance/i);
});
