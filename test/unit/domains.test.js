import { test } from 'node:test';
import assert from 'node:assert/strict';

import { matchesExcludedDomain } from '../../extension/shared/domains.js';

test('matchesExcludedDomain returns true for exact domain match', () => {
  const result = matchesExcludedDomain('example.com', ['example.com']);
  assert.equal(result, true);
});

test('matchesExcludedDomain returns true for subdomain match', () => {
  const result = matchesExcludedDomain('media.example.com', ['example.com']);
  assert.equal(result, true);
});

test('matchesExcludedDomain returns false when domain not excluded', () => {
  const result = matchesExcludedDomain('example.com', ['other.com']);
  assert.equal(result, false);
});

test('matchesExcludedDomain ignores empty or malformed entries', () => {
  const result = matchesExcludedDomain('example.com', [' ', '', null, 'Example.COM ']);
  assert.equal(result, true);
});
