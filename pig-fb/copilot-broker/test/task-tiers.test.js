'use strict';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, usesCopilot, TIERS } from '../src/task-tiers.js';

test('explicit tiers are respected', () => {
  for (const t of ['T0', 'T1', 'T2', 'T3', 'T4']) {
    assert.equal(classify({ tier: t, description: 'anything' }), t);
  }
});

test('deterministic work classifies T0 (never Copilot)', () => {
  assert.equal(classify({ description: 'format all js files' }), 'T0');
  assert.equal(classify({ description: 'sort the changelog entries' }), 'T0');
  assert.equal(classify({ kind: 'count lines in repo' }), 'T0');
  assert.ok(!usesCopilot('T0'));
});

test('uncertain tasks default to T1 (local first, no Copilot)', () => {
  assert.equal(classify({ description: 'refactor the billing module' }), 'T1');
  assert.equal(classify({}), 'T1');
  assert.equal(classify(null), 'T1');
  assert.ok(!usesCopilot('T1'));
});

test('T3/T4 are never auto-assigned', () => {
  const samples = [
    'design a distributed consensus protocol',
    'rewrite the entire authentication subsystem with formal proofs',
    'deeply reason about cache invalidation across regions',
  ];
  for (const description of samples) {
    const tier = classify({ description });
    assert.ok(tier === 'T0' || tier === 'T1', `expected local tier, got ${tier}`);
  }
});

test('T2/T3/T4 are Copilot eligible', () => {
  assert.ok(usesCopilot('T2'));
  assert.ok(usesCopilot('T3'));
  assert.ok(usesCopilot('T4'));
  assert.equal(TIERS.T4, 'T4');
});
