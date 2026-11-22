import assert from 'node:assert/strict';
import test from 'node:test';
import { isLeadConversionRequest } from '../../../packages/contracts/src/leads';

test('conversion contract accepts only explicit targets, a UUID lead ID and a scoped idempotency key', () => {
  const valid = {
    leadId: '3f3a2b34-2b5b-4d08-9f54-8d6ad3a05f6a',
    target: 'CUSTOMER',
    idempotencyKey: 'org-8b7257e2-lead-2123',
  };
  assert.equal(isLeadConversionRequest(valid), true);
  assert.equal(isLeadConversionRequest({ ...valid, target: 'BOOKING' }), false);
  assert.equal(isLeadConversionRequest({ ...valid, leadId: 'not-a-uuid' }), false);
  assert.equal(isLeadConversionRequest({ ...valid, idempotencyKey: 'short' }), false);
  assert.equal(isLeadConversionRequest(null), false);
});
