/**
 * run_tests.js — unit tests for the ORCA P0 effect-class adapter layer.
 * No dependencies; run with: node --test tests/run_tests.js
 * (run from the effect_adapters/ directory).
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const createCore = require('../adapter_core.js');
const class08 = require('../class_08_message_execution.js');
const class05c = require('../class_05c_threads.js');
const class05d = require('../class_05d_instagram.js');
const class09 = require('../class_09_campaign_publication.js');

const core = createCore(); // no foundation injected -> shim source
const D = core.DECISIONS;

// ---------------------------------------------------------------- core
test('foundation seam: resolves to shim when the A6 module is absent', () => {
  assert.equal(core.foundationSource, 'shim');
  assert.equal(core.foundation, null);
});

test('op key determinism: same logical op, same attempt -> same key', () => {
  const a = core.deriveOpKey({ missionId: 'm1', effectName: 'e1', input: { b: 2, a: 1 } });
  const b = core.deriveOpKey({ missionId: 'm1', effectName: 'e1', input: { a: 1, b: 2 } });
  assert.equal(a, b);
});

test('op key: key insertion order does not matter (canonicalization)', () => {
  const a = core.canonicalize({ z: [3, 2, 1], a: { y: 1, x: 2 } });
  const b = core.canonicalize({ a: { x: 2, y: 1 }, z: [3, 2, 1] });
  assert.equal(a, b);
});

test('op key: no wall-clock or randomness in identity (derived twice, separated in time)', async () => {
  const input = { missionId: 'm1', effectName: 'e1', input: { x: 'y' } };
  const a = core.deriveOpKey(input);
  await new Promise((r) => setTimeout(r, 25));
  const b = core.deriveOpKey(input);
  assert.equal(a, b);
  assert.match(a, /^[0-9a-f]{64}$/);
});

test('attempt key: new attempt -> different key via attempt derivation, never via timestamp', () => {
  const op = core.deriveOpKey({ missionId: 'm1', effectName: 'e1', input: { x: 1 } });
  const a0 = core.deriveAttemptKey(op, 0);
  const a1 = core.deriveAttemptKey(op, 1);
  const a0b = core.deriveAttemptKey(op, 0);
  assert.notEqual(a0, a1);
  assert.equal(a0, a0b);
  assert.throws(() => core.deriveAttemptKey(op, -1));
  assert.throws(() => core.deriveAttemptKey(op, 1.5));
  assert.throws(() => core.deriveAttemptKey('notakey', 0));
});

test('assertProbeEvidence: placeholder success without evidence is no-evidence', () => {
  assert.equal(core.assertProbeEvidence({ success: true, evidence: {} }), false);
  assert.equal(core.assertProbeEvidence({ outcome: 'delivered', evidence: {} }), false);
  assert.equal(core.assertProbeEvidence({ outcome: 'delivered', evidence: { messageId: 'abc' } }), true);
  assert.equal(core.assertProbeEvidence(null), false);
});

test('probeWithTimeout: timeout is an observation, never an effect outcome', async () => {
  const r = await core.probeWithTimeout({
    opKey: 'k',
    attemptWindow: { after: '2026-09-24' },
    probeFn: () => new Promise(() => {}), // never resolves
    timeoutMs: 50,
  });
  assert.equal(r.outcome, 'inconclusive');
  assert.match(r.observation, /timeout is an observation, not an effect outcome/);
  assert.equal(r.evidence.timeoutObserved, true);
});

test('evaluatePredicate: missing probe fails closed to HOLD_UNKNOWN', () => {
  const r = core.evaluatePredicate({ classModule: class08, classId: '08', probeResult: null, context: {} });
  assert.equal(r.decision, D.HOLD_UNKNOWN);
});

test('evaluatePredicate: invalid decision fails closed to HOLD_UNKNOWN', () => {
  const bad = { ...class08, retryPredicate: () => ({ decision: 'MAYBE', evidence: {} }) };
  const probe = core.makeProbeResult({ opKey: 'k', outcome: 'not-delivered', observation: 'x', evidence: { a: 1 } });
  const r = core.evaluatePredicate({ classModule: bad, classId: '08', probeResult: probe, context: {} });
  assert.equal(r.decision, D.HOLD_UNKNOWN);
});

test('escalateHold: writes HELD record and emits UNKNOWN + HELD on the shim', () => {
  core._shim.ledgerClear();
  const rec = core.escalateHold({
    opKey: 'deadbeef', effectName: 'e', effectClass: '08',
    holdReason: 'test hold', evidence: { x: 1 }, missionId: 'm',
  });
  assert.equal(rec.state, 'HELD');
  assert.equal(rec.holdReason, 'test hold');
  const rows = core._shim.ledgerRead();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].shim, true);
});

// ---------------------------------------------------------------- class 08
const msgInput = {
  missionId: 'campaign-1', channel: 'email', recipient: 'Owner@Example.COM',
  actionType: 'cold', touchSeq: 1, contentHash: 'hash-abc',
};

test('class08: op key normalizes recipient email case', () => {
  const a = class08.deriveOpKey(msgInput);
  const b = class08.deriveOpKey({ ...msgInput, recipient: 'owner@example.com' });
  assert.equal(a, b);
  assert.equal(class08.effectNameOf(msgInput), 'msg:v1:email:owner@example.com:cold:t1');
});

test('class08: op key binds content snapshot (reword = different op)', () => {
  const a = class08.deriveOpKey(msgInput);
  const b = class08.deriveOpKey({ ...msgInput, contentHash: 'hash-different' });
  assert.notEqual(a, b);
});

test('class08: probe email delivered when Sent search hits with message id', async () => {
  const deps = {
    channel: 'email', recipient: 'a@b.com',
    exec: async () => ({ stdout: JSON.stringify({ messages: [{ id: '1a0b25022d3383cc' }] }) }),
  };
  const r = await class08.probe('k', { after: '2026-09-24' }, deps);
  assert.equal(r.outcome, 'delivered');
  assert.equal(r.evidence.messageId, '1a0b25022d3383cc');
});

test('class08: probe email not-delivered on zero healthy hits', async () => {
  const deps = {
    channel: 'email', recipient: 'a@b.com',
    exec: async () => ({ stdout: JSON.stringify({ messages: [] }) }),
  };
  const r = await class08.probe('k', {}, deps);
  assert.equal(r.outcome, 'not-delivered');
});

test('class08: probe email inconclusive when the search errors (never a false negative)', async () => {
  const deps = {
    channel: 'email', recipient: 'a@b.com',
    exec: async () => { throw new Error('rate limited'); },
  };
  const r = await class08.probe('k', {}, deps);
  assert.equal(r.outcome, 'inconclusive');
});

test('class08: probe form without confirmed local state is inconclusive', async () => {
  const r = await class08.probe('k', {}, { channel: 'form', recipient: 'https://x.test/f', readFormLocalState: async () => null });
  assert.equal(r.outcome, 'inconclusive');
});

test('class08: predicate truth table', () => {
  const delivered = core.makeProbeResult({ opKey: 'k', outcome: 'delivered', observation: 'x', evidence: { messageId: 'm' } });
  const absent = core.makeProbeResult({ opKey: 'k', outcome: 'not-delivered', observation: 'x', evidence: { hitCount: 0 } });
  const unknown = core.makeProbeResult({ opKey: 'k', outcome: 'inconclusive', observation: 'x', evidence: {} });
  const green = { eligibilityExitCode: 0, openIntent: false, touchCount: 1, actionType: 'cold' };

  assert.equal(class08.retryPredicate(delivered, green).decision, D.RECOVER_SUCCEEDED);
  assert.equal(class08.retryPredicate(unknown, green).decision, D.HOLD_UNKNOWN);
  assert.equal(class08.retryPredicate(absent, green).decision, D.SAFE_TO_RETRY);

  for (const code of [1, 2, 3]) {
    const r = class08.retryPredicate(absent, { ...green, eligibilityExitCode: code });
    assert.equal(r.decision, D.HOLD_UNKNOWN, `exit ${code}`);
  }
  const r2 = class08.retryPredicate(absent, { ...green, eligibilityExitCode: 2 });
  assert.match(r2.holdReason, /reconciliation/);

  assert.equal(class08.retryPredicate(absent, { ...green, openIntent: true }).decision, D.HOLD_UNKNOWN);
  assert.equal(class08.retryPredicate(absent, { ...green, touchCount: 3 }).decision, D.HOLD_UNKNOWN); // 4th touch never authorized
  const cap = class08.retryPredicate(absent, { ...green, touchCount: 3 });
  assert.match(cap.holdReason, /4th touch/);
  assert.equal(
    class08.retryPredicate(absent, { ...green, actionType: 'review-triggered', followupLadderActive: true }).decision,
    D.HOLD_UNKNOWN
  );
});

// ---------------------------------------------------------------- class 05c
const threadsInput = {
  missionId: 'm', account: 'acct1', text: 'Hello Threads',
  mediaManifest: [], approvalWindow: '2026-09-24T10:00/2026-09-24T11:00',
};

test('class05c: op key binds text byte-for-byte and approval window', () => {
  const a = class05c.deriveOpKey(threadsInput);
  const b = class05c.deriveOpKey({ ...threadsInput, text: 'Hello Threads ' });
  const c = class05c.deriveOpKey({ ...threadsInput, approvalWindow: 'other-window' });
  assert.notEqual(a, b);
  assert.notEqual(a, c);
});

test('class05c: probe exact byte match -> delivered', async () => {
  const deps = {
    account: 'acct1',
    approvedSnapshot: { text: 'Hello Threads', mediaManifest: [] },
    exec: async () => ({ stdout: JSON.stringify({ posts: [{ post_id: 'p1', text: 'Hello Threads' }] }) }),
  };
  const r = await class05c.probe('k', {}, deps);
  assert.equal(r.outcome, 'delivered');
});

test('class05c: probe healthy list, no match -> not-delivered', async () => {
  const deps = {
    account: 'acct1',
    approvedSnapshot: { text: 'Hello Threads', mediaManifest: [] },
    exec: async () => ({ stdout: JSON.stringify({ posts: [{ post_id: 'p1', text: 'Something else' }] }) }),
  };
  const r = await class05c.probe('k', {}, deps);
  assert.equal(r.outcome, 'not-delivered');
});

test('class05c: predicate truth table (zero transport retries)', () => {
  const delivered = core.makeProbeResult({ opKey: 'k', outcome: 'delivered', observation: 'x', evidence: { matchedText: true } });
  const absent = core.makeProbeResult({ opKey: 'k', outcome: 'not-delivered', observation: 'x', evidence: { listHealthy: true } });
  const unknown = core.makeProbeResult({ opKey: 'k', outcome: 'inconclusive', observation: 'x', evidence: {} });
  const approved = { newApproval: true, newApprovalWindow: 'w2', frozenSnapshotMatches: true };

  assert.equal(class05c.retryPredicate(delivered, approved).decision, D.RECOVER_SUCCEEDED);
  assert.equal(class05c.retryPredicate(unknown, approved).decision, D.HOLD_UNKNOWN);
  assert.equal(class05c.retryPredicate(absent, approved).decision, D.SAFE_TO_RETRY);
  // No new explicit approval = transport retry = HOLD
  const noApproval = class05c.retryPredicate(absent, { ...approved, newApproval: false });
  assert.equal(noApproval.decision, D.HOLD_UNKNOWN);
  assert.match(noApproval.holdReason, /new explicit approval/);
  // Provider error before the probe = HOLD
  assert.equal(class05c.retryPredicate(absent, { ...approved, providerErrorBeforeProbe: true }).decision, D.HOLD_UNKNOWN);
  // Snapshot drift = HOLD
  assert.equal(class05c.retryPredicate(absent, { ...approved, frozenSnapshotMatches: false }).decision, D.HOLD_UNKNOWN);
});

// ---------------------------------------------------------------- class 05d
const igInput = {
  missionId: 'm', account: 'somebiz', kind: 'feed',
  mediaManifest: ['mediahash1'], caption: 'Grand opening!',
};

test('class05d: probe rejects the degraded CDP path outright', async () => {
  const r = await class05d.probe('k', {}, { probeSource: 'cdp', approvedSnapshot: { caption: 'x', mediaManifest: [] } });
  assert.equal(r.outcome, 'inconclusive');
  assert.equal(r.evidence.degradedPathRejected, true);
});

test('class05d: probe CLI healthy absence -> not-delivered', async () => {
  const deps = {
    probeSource: 'cli', accountId: '1', username: 'somebiz',
    approvedSnapshot: { caption: 'Grand opening!', mediaManifest: ['mediahash1'] },
    exec: async () => ({ stdout: JSON.stringify({ posts: [{ caption: 'Other post', mediaManifest: [] }] }) }),
  };
  const r = await class05d.probe('k', {}, deps);
  assert.equal(r.outcome, 'not-delivered');
  assert.equal(r.evidence.cliPathHealthy, true);
});

test('class05d: predicate truth table (budget-gated)', () => {
  const delivered = core.makeProbeResult({ opKey: 'k', outcome: 'delivered', observation: 'x', evidence: { matchedFingerprint: true } });
  const absent = core.makeProbeResult({ opKey: 'k', outcome: 'not-delivered', observation: 'x', evidence: { cliPathHealthy: true } });
  const unknown = core.makeProbeResult({ opKey: 'k', outcome: 'inconclusive', observation: 'x', evidence: {} });
  const ok = { dailyLimit: { remaining: 5, limit: 25 }, snapshotMatches: true };

  assert.equal(class05d.retryPredicate(delivered, ok).decision, D.RECOVER_SUCCEEDED);
  assert.equal(class05d.retryPredicate(unknown, ok).decision, D.HOLD_UNKNOWN);
  assert.equal(class05d.retryPredicate(absent, ok).decision, D.SAFE_TO_RETRY);
  // Near the daily limit -> HOLD
  const near = class05d.retryPredicate(absent, { ...ok, dailyLimit: { remaining: 1, limit: 25 } });
  assert.equal(near.decision, D.HOLD_UNKNOWN);
  assert.match(near.holdReason, /daily publish limit/);
  // Unknown budget -> HOLD
  assert.equal(class05d.retryPredicate(absent, { snapshotMatches: true }).decision, D.HOLD_UNKNOWN);
  // Snapshot drift -> HOLD
  assert.equal(class05d.retryPredicate(absent, { ...ok, snapshotMatches: false }).decision, D.HOLD_UNKNOWN);
});

// ---------------------------------------------------------------- class 09
const likeInput = {
  missionId: 'm', platform: 'facebook', action: 'like', account: 'SomeBiz',
  postRef: 'https://www.facebook.com/123/posts/456', passId: 'fb-20260924-060000',
  intentId: 'intent-1', pageDescriptor: 'SomeBiz (grand-opening photo post)',
};

test('class09: FB page descriptors must be unique per job', () => {
  const ok = class09.validateUniquePageDescriptors([
    { page: 'Biz A (photo post abc)' },
    { page: 'Biz B (photo post def)' },
  ]);
  assert.equal(ok.ok, true);
  const bad = class09.validateUniquePageDescriptors([
    { page: 'Group (photo post)' },
    { page: 'Group (photo post)' },
  ]);
  assert.equal(bad.ok, false);
  assert.equal(bad.duplicates.length, 1);
});

test('class09: probe like liked -> delivered (retry would UNLIKE)', async () => {
  const r = await class09.probe('k', {}, {
    action: 'like', platform: 'facebook', account: 'SomeBiz', postRef: 'u',
    probeLikeState: async () => ({ liked: true }),
  });
  assert.equal(r.outcome, 'delivered');
  assert.match(r.observation, /UNLIKE/);
});

test('class09: probe like not-liked -> not-delivered', async () => {
  const r = await class09.probe('k', {}, {
    action: 'like',
    probeLikeState: async () => ({ liked: false }),
  });
  assert.equal(r.outcome, 'not-delivered');
});

test('class09: probe with no reader is inconclusive, never a retry green light', async () => {
  const r = await class09.probe('k', {}, { action: 'like' });
  assert.equal(r.outcome, 'inconclusive');
});

test('class09: predicate truth table (toggle-aware)', () => {
  const delivered = core.makeProbeResult({ opKey: 'k', outcome: 'delivered', observation: 'x', evidence: { liked: true } });
  const absent = core.makeProbeResult({ opKey: 'k', outcome: 'not-delivered', observation: 'x', evidence: { liked: false } });
  const unknown = core.makeProbeResult({ opKey: 'k', outcome: 'inconclusive', observation: 'x', evidence: {} });
  const green = { action: 'like', guardDecision: 'ELIGIBLE', guardExitCode: 0, intentState: 'resolved', platformWarning: null };

  assert.equal(class09.retryPredicate(delivered, green).decision, D.RECOVER_SUCCEEDED);
  assert.equal(class09.retryPredicate(unknown, green).decision, D.HOLD_UNKNOWN);
  assert.match(class09.retryPredicate(unknown, green).holdReason, /UNLIKE/);
  assert.equal(class09.retryPredicate(absent, green).decision, D.SAFE_TO_RETRY);

  assert.equal(class09.retryPredicate(absent, { ...green, intentState: 'UNKNOWN_EXECUTION' }).decision, D.HOLD_UNKNOWN);
  assert.equal(class09.retryPredicate(absent, { ...green, guardDecision: 'UNKNOWN-UNCHECKABLE', guardExitCode: 3 }).decision, D.HOLD_UNKNOWN);
  assert.equal(class09.retryPredicate(absent, { ...green, guardDecision: 'ALREADY_ENGAGED' }).decision, D.HOLD_UNKNOWN);
  assert.equal(class09.retryPredicate(absent, { ...green, guardDecision: 'BLOCKED' }).decision, D.HOLD_UNKNOWN);
  const warn = class09.retryPredicate(absent, { ...green, platformWarning: { type: 'action_block' } });
  assert.equal(warn.decision, D.HOLD_UNKNOWN);
  assert.match(warn.holdReason, /14-day hold/);
  // Page publishing is PAUSED: adapters never unpause it
  const pub = class09.retryPredicate(absent, { ...green, action: 'page-publish' });
  assert.equal(pub.decision, D.HOLD_UNKNOWN);
  assert.match(pub.holdReason, /NEVER unpause/);
});

test('class09: op key binds pass and intent ids', () => {
  const a = class09.deriveOpKey(likeInput);
  const b = class09.deriveOpKey({ ...likeInput, passId: 'fb-20260924-070000' });
  assert.notEqual(a, b);
  assert.equal(class09.effectNameOf(likeInput), 'engage:v1:facebook:like:SomeBiz');
});

// ---------------------------------------------------------------- full loop via core
test('full loop: probe -> predicate -> hold escalation on the shim ledger', async () => {
  core._shim.ledgerClear();
  const opKey = class08.deriveOpKey(msgInput);
  const probe = await class08.probe(opKey, {}, {
    channel: 'email', recipient: 'owner@example.com',
    exec: async () => { throw new Error('pig unreachable'); },
  });
  assert.equal(probe.outcome, 'inconclusive');
  const evaled = core.evaluatePredicate({ classModule: class08, classId: '08', probeResult: probe, context: { eligibilityExitCode: 0 } });
  assert.equal(evaled.decision, D.HOLD_UNKNOWN);
  const hold = core.escalateHold({
    opKey, effectName: class08.effectNameOf(msgInput), effectClass: '08',
    holdReason: evaled.holdReason, evidence: evaled.evidence, missionId: 'campaign-1',
  });
  assert.equal(hold.state, 'HELD');
  assert.equal(core._shim.ledgerRead().length, 1);
});
