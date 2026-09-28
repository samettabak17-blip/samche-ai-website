import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInventory } from '../scripts/build-help-center-inventory.mjs';

test('builds a complete mandatory coverage inventory from verified evidence', () => {
  const result = buildInventory({ dashboardRoot: 'C:/Users/smttb/Documents/samche-api-service/dashboard' });
  assert.equal(result.coverage.length, 18);
  assert.ok(result.coverage.every((row) => row.category && row.auditStatus && 'remainingDocumentationGaps' in row));
  assert.ok(result.candidates.some((item) => item.category === 'WhatsApp AI'));
  assert.ok(result.candidates.some((item) => item.category === 'Knowledge Intelligence'));
  const instagram = result.coverage.find((row) => row.category === 'Instagram DM AI');
  assert.equal(instagram?.auditStatus, 'VERIFIED CUSTOMER-ACCESSIBLE');
  assert.equal(instagram?.publishedArticleCount, 3);
  assert.ok(instagram?.sourceEvidence.includes('dashboard/src/features/channels/instagram-connection-card.tsx'));
  assert.equal(result.dashboardRoot, 'dashboard/');
});

test('keeps implementation-managed and unverified areas out of customer route claims', () => {
  const result = buildInventory({ dashboardRoot: 'C:/Users/smttb/Documents/samche-api-service/dashboard' });
  const implementation = result.candidates.filter((item) => ['Integrations', 'AI Visual', 'AI Voice'].includes(item.category));
  assert.ok(implementation.length > 0);
  assert.ok(implementation.every((item) => item.auditStatus === 'IMPLEMENTATION-MANAGED' && item.sourceRoutes.length === 0));
  assert.ok(result.coverage.some((row) => row.category === 'Security / Privacy' && row.auditStatus === 'NO VERIFIED CONTENT'));
});
