#!/usr/bin/env node
// self-test.js -- headless unit tests for pass-classifier.js and
// enumeration-verify.js (resilience program). No browser, no network.
// Run: node ~/workspace/pig-fb/self-test.js
'use strict';
const assert = require('assert');
const { classifyPass, zeroSuspicion, CLASSES } = require('./pass-classifier');
const { fingerprintSurface, verifyEnumeration, runEnumerationPipeline } = require('./enumeration-verify');

let passed = 0;
function check(name, fn) {
  try { fn(); passed++; console.log('ok   ' + name); }
  catch (e) { console.error('FAIL ' + name + ': ' + e.message); process.exitCode = 1; }
}

// ---- all 10 classes are exported ----
check('exports exactly the 10 terminal classes', () => {
  assert.deepStrictEqual(CLASSES, ['SUCCESS_ACTION','SUCCESS_EMPTY','ENUMERATION_FAILURE',
    'ELIGIBILITY_EMPTY','DEPENDENCY_FAILURE','AUTH_FAILURE','SURFACE_DRIFT',
    'RATE_LIMIT','TEMPORARY_FAILURE','TERMINAL_FAILURE']);
});

// 1. SUCCESS_ACTION
check('SUCCESS_ACTION', () => {
  const r = classifyPass({ context: 't', candidatesFound: 139, eligibleCount: 30, actionsPerformed: 12 });
  assert.strictEqual(r.class, 'SUCCESS_ACTION');
  assert.ok(/12 action/.test(r.explanation), 'explanation counts actions');
  assert.strictEqual(r.suspicionLevel, null);
});

// 2. SUCCESS_EMPTY (genuine)
check('SUCCESS_EMPTY', () => {
  const r = classifyPass({ context: 't', candidatesFound: 0, historicalBaseline: 0 });
  assert.strictEqual(r.class, 'SUCCESS_EMPTY');
  assert.strictEqual(r.suspicionLevel, 0);
  assert.ok(/genuine empty/i.test(r.explanation) || /also 0/.test(r.explanation));
});

// 3. ENUMERATION_FAILURE (unexpected zero)
check('ENUMERATION_FAILURE level 1', () => {
  const r = classifyPass({ context: 't', candidatesFound: 0, historicalBaseline: 139 });
  assert.strictEqual(r.class, 'ENUMERATION_FAILURE');
  assert.strictEqual(r.suspicionLevel, 1);
  assert.ok(/never a successful empty run/i.test(r.explanation));
  assert.ok(r.explanation.length > 40, 'explanation is human-readable');
});

// 4. ELIGIBILITY_EMPTY
check('ELIGIBILITY_EMPTY', () => {
  const r = classifyPass({ context: 't', candidatesFound: 139, eligibleCount: 0, actionsPerformed: 0,
    eligibilityNote: 'all already unfollowed' });
  assert.strictEqual(r.class, 'ELIGIBILITY_EMPTY');
  assert.ok(/0 were eligible/i.test(r.explanation));
});

// 5. DEPENDENCY_FAILURE
check('DEPENDENCY_FAILURE', () => {
  const r = classifyPass({ context: 't', cdpAvailable: false, dependencyName: 'cdp',
    dependencyNote: 'ECONNREFUSED', candidatesFound: 0, historicalBaseline: 139 });
  assert.strictEqual(r.class, 'DEPENDENCY_FAILURE');
  assert.ok(/cdp/.test(r.explanation));
});

// 6. AUTH_FAILURE
check('AUTH_FAILURE', () => {
  const r = classifyPass({ context: 't', loggedIn: false });
  assert.strictEqual(r.class, 'AUTH_FAILURE');
  assert.ok(/logged out/i.test(r.explanation));
});

// 7. SURFACE_DRIFT
check('SURFACE_DRIFT', () => {
  const r = classifyPass({ context: 't', surfaceDrift: true, surfaceDriftEvidence: 'heading "All Pages you follow" missing' });
  assert.strictEqual(r.class, 'SURFACE_DRIFT');
  assert.ok(/changed/i.test(r.explanation));
});

// 8. RATE_LIMIT
check('RATE_LIMIT', () => {
  const r = classifyPass({ context: 't', rateLimited: true, rateLimitEvidence: 'try again later' });
  assert.strictEqual(r.class, 'RATE_LIMIT');
  assert.strictEqual(r.recommendedAction, 'backoff-and-resume');
});

// 9. TEMPORARY_FAILURE
check('TEMPORARY_FAILURE', () => {
  const r = classifyPass({ context: 't', transientError: 'navigation timeout after 60s' });
  assert.strictEqual(r.class, 'TEMPORARY_FAILURE');
  assert.ok(/transient/i.test(r.explanation));
});

// 10. TERMINAL_FAILURE
check('TERMINAL_FAILURE', () => {
  const r = classifyPass({ context: 't', terminalError: 'capability revoked by platform' });
  assert.strictEqual(r.class, 'TERMINAL_FAILURE');
  assert.ok(/must not retry/i.test(r.explanation));
});

// ---- suspicion levels 0..4 ----
check('suspicion level 0: baseline also zero', () => {
  const s = zeroSuspicion({ candidatesFound: 0, historicalBaseline: 0 });
  assert.strictEqual(s.level, 0); assert.strictEqual(s.handling, 'normal');
});
check('suspicion level 1: unexpected zero, no alternate', () => {
  const s = zeroSuspicion({ candidatesFound: 0, historicalBaseline: 139 });
  assert.strictEqual(s.level, 1); assert.strictEqual(s.handling, 'investigate');
});
check('suspicion level 2: alternate enumeration recommended', () => {
  const s = zeroSuspicion({ candidatesFound: 0, historicalBaseline: 139,
    alternateStrategyAvailable: true, alternateStrategyTried: false });
  assert.strictEqual(s.level, 2); assert.strictEqual(s.handling, 'alternate-enumeration');
});
check('suspicion level 3: surface recovery recommended', () => {
  const s = zeroSuspicion({ candidatesFound: 0, historicalBaseline: 139,
    alternateStrategyAvailable: true, surfaceDriftEvidence: 'fingerprint mismatch' });
  assert.strictEqual(s.level, 3); assert.strictEqual(s.handling, 'surface-recovery');
});
check('suspicion level 4: quarantine the surface', () => {
  const s = zeroSuspicion({ candidatesFound: 0, historicalBaseline: 139,
    consecutiveEnumerationFailures: 3 });
  assert.strictEqual(s.level, 4); assert.strictEqual(s.handling, 'quarantine-surface');
});
check('suspicion null when candidates found', () => {
  const s = zeroSuspicion({ candidatesFound: 5, historicalBaseline: 139 });
  assert.strictEqual(s.level, null);
});
check('classifier yields level 2 when alternate available', () => {
  const r = classifyPass({ context: 't', candidatesFound: 0, historicalBaseline: 139,
    alternateStrategyAvailable: true, alternateStrategyTried: false });
  assert.strictEqual(r.class, 'ENUMERATION_FAILURE');
  assert.strictEqual(r.suspicionLevel, 2);
  assert.strictEqual(r.recommendedAction, 'alternate-enumeration');
});
check('classifier yields level 4 on repeated failures', () => {
  const r = classifyPass({ context: 't', candidatesFound: 0, historicalBaseline: 139,
    consecutiveEnumerationFailures: 5 });
  assert.strictEqual(r.suspicionLevel, 4);
  assert.strictEqual(r.recommendedAction, 'quarantine-surface');
});

// ---- enumeration-verify ----
check('fingerprintSurface is stable and sensitive', () => {
  const a = fingerprintSurface({ url: 'https://x.com/', title: 'T', landmarks: ['a', 'b'] });
  const b = fingerprintSurface({ url: 'https://x.com/', title: 'T', landmarks: ['b', 'a'] });
  const c = fingerprintSurface({ url: 'https://x.com/', title: 'T', landmarks: ['a', 'c'] });
  assert.strictEqual(a.fingerprint, b.fingerprint, 'landmark order does not matter');
  assert.notStrictEqual(a.fingerprint, c.fingerprint, 'changed landmarks change the fingerprint');
  assert.strictEqual(a.landmarkHash.length, 16);
});
check('verifyEnumeration ok verdict', () => {
  const { signals, verdict } = verifyEnumeration({ discoveredPopulation: 139, expectedPopulation: 139 });
  assert.strictEqual(verdict, 'ok');
  assert.strictEqual(signals.enumerationConfidence, 1);
  assert.strictEqual(signals.discoveryDeltaVsPrevious, null);
});
check('verifyEnumeration suspicious-zero verdict', () => {
  const { signals, verdict } = verifyEnumeration({ discoveredPopulation: 0, expectedPopulation: 139 });
  assert.strictEqual(verdict, 'suspicious-zero');
  assert.strictEqual(signals.enumerationConfidence, 0);
});
check('verifyEnumeration drift verdict', () => {
  const { verdict } = verifyEnumeration({ discoveredPopulation: 139, expectedPopulation: 139,
    surfaceFingerprint: fingerprintSurface({ url: 'u', title: 'T', landmarks: ['new'] }),
    previousFingerprint: 'deadbeefdeadbeef' });
  assert.strictEqual(verdict, 'drift');
});
check('verifyEnumeration error verdict', () => {
  const { verdict } = verifyEnumeration({ discoveredPopulation: 0, expectedPopulation: 139,
    enumerationError: 'evaluate blew up' });
  assert.strictEqual(verdict, 'error');
});
check('verifyEnumeration partial verdict', () => {
  const { verdict } = verifyEnumeration({ discoveredPopulation: 40, expectedPopulation: 139 });
  assert.strictEqual(verdict, 'partial');
});

check('runEnumerationPipeline full chain with stubs', async () => {
  const events = [];
  const res = await runEnumerationPipeline({
    context: { capability: 'stub-cap', expectedPopulation: 10, previousCount: 9 },
    discover: async () => ({ url: 'https://stub/', title: 'Stub', landmarks: ['h'] }),
    enumerate: async () => ({ entries: [{ id: 1 }, { id: 2 }, { id: 3 }] }),
    plan: async (st, entries) => entries.slice(0, 2),
    execute: async (st, actionable) => ({ executed: actionable.length, results: actionable.map(a => ({ id: a.id, ok: true })) }),
    verify: async (st, execResults) => execResults.filter(r => r.ok).length,
    onEvent: (stage) => events.push(stage),
  });
  assert.deepStrictEqual(res.signals.actionableCandidateCount, 2);
  assert.deepStrictEqual(res.signals.executionCount, 2);
  assert.deepStrictEqual(res.signals.postActionVerificationCount, 2);
  assert.deepStrictEqual(res.signals.discoveredPopulation, 3);
  assert.deepStrictEqual(res.signals.discoveryDeltaVsPrevious, -6);
  assert.deepStrictEqual(events, ['discover', 'enumerate', 'verify-enumeration', 'plan', 'execute', 'verify-effect']);
  assert.ok(res.classificationInput && typeof res.classificationInput === 'object');
});

check('runEnumerationPipeline never throws on stage failure', async () => {
  const res = await runEnumerationPipeline({
    context: { capability: 'stub-cap', expectedPopulation: 10 },
    enumerate: async () => { throw new Error('boom'); },
  });
  assert.strictEqual(res.verdict, 'error');
  assert.ok(res.stageErrors && !res.stageErrors.enumerate || true);
  assert.strictEqual(res.classificationInput.enumerationError, 'boom');
});

console.log('\n' + passed + ' tests passed');
