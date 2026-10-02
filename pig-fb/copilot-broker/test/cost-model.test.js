'use strict';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COST_MODEL, estimateCost, safetyReserve, creditCeiling } from '../src/cost-model.js';

test('cost model is versioned, timestamped, and labeled estimate', () => {
  assert.match(COST_MODEL.version, /^\d{4}-\d{2}-\d{2}/);
  assert.match(COST_MODEL.generated_at, /^\d{4}-\d{2}-\d{2}/);
  assert.equal(COST_MODEL.source, 'ESTIMATE');
  assert.match(COST_MODEL.source_note, /no dynamic pricing API/i);
  assert.ok(Object.isFrozen(COST_MODEL));
});

test('estimates exist per Copilot tier only', () => {
  assert.ok(estimateCost('T2') > 0);
  assert.ok(estimateCost('T3') > estimateCost('T2'));
  assert.ok(estimateCost('T4') > estimateCost('T3'));
  assert.throws(() => estimateCost('T0'), /no cost estimate/);
  assert.throws(() => estimateCost('T9'), /no cost estimate/);
});

test('credit ceiling is estimate + reserve (soft, documented)', () => {
  assert.equal(creditCeiling('T2'), estimateCost('T2') + safetyReserve());
  assert.ok(safetyReserve() > 0);
});
