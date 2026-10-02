'use strict';
/**
 * run_proof.js — executes the social/campaign retry-safety proof scenarios.
 * Node 22. No external deps. Run on the Pig from the proof dir:
 *   node run_proof.js
 * Writes evidence.json next to itself. Exit code 0 iff every scenario passes.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { makeWorld, makeInvocation, reconcileOp, checkNoUngroundedRetries } = require('./harness.js');
const { retry_safe, scanForGlobalRetryBoolean, DECISIONS,
        class05c, class05d, class09, deleteModule, updateModule } = require('./retry_predicates.js');

const DIR = __dirname;
const WINDOW = { after: '2026-09-24T00:00:00Z', before: '2026-09-24T23:59:59Z' };
const results = [];

function check(s, name, cond, detail) {
  s.checks.push({ name, pass: !!cond, detail: detail === undefined ? '' : String(detail) });
}
async function scenario(id, title, fn) {
  const s = { id, title, checks: [], pass: false, error: null };
  try { await fn(s); } catch (e) { s.error = String((e && e.message) || e); }
  s.pass = !s.error && s.checks.length > 0 && s.checks.every((c) => c.pass);
  results.push(s);
  console.log(`${s.pass ? 'PASS' : 'FAIL'}  ${id}  ${title}${s.error ? `  :: ${s.error}` : ''}`);
  for (const c of s.checks.filter((c) => !c.pass)) console.log(`        CHECK FAILED: ${c.name} ${c.detail}`);
}

// --- invocation builders (executor op key kept byte-identical to adapter key)
function threadsInvocation(world, input) {
  const effectName = `threads:v1:publish-post:${input.account}`;
  const snapshot = { account: input.account, text: input.text, mediaManifest: input.mediaManifest.slice(), approvalWindow: input.approvalWindow };
  const actionDef = { action: 'threads.publish-post', account: input.account, text: input.text, mediaManifest: input.mediaManifest.slice() };
  return { inv: makeInvocation(world, { missionId: input.missionId, effectName, snapshot, actionDef, adapterDeriveOpKey: class05c.deriveOpKey, adapterInput: input }), effectName, actionDef };
}
function igInvocation(world, input) {
  const effectName = `ig:v1:post-${input.kind}:${input.account}`;
  const snapshot = { account: input.account, kind: input.kind, mediaManifest: input.mediaManifest.slice(),
    captionHash: crypto.createHash('sha256').update(input.caption, 'utf8').digest('hex') };
  const actionDef = { action: 'instagram.post', account: input.account, kind: input.kind, caption: input.caption, mediaManifest: input.mediaManifest.slice() };
  return { inv: makeInvocation(world, { missionId: input.missionId, effectName, snapshot, actionDef, adapterDeriveOpKey: class05d.deriveOpKey, adapterInput: input }), effectName, actionDef };
}
function likeInvocation(world, input) {
  const effectName = `engage:v1:${input.platform}:${input.action}:${input.account}`;
  const snapshot = { platform: input.platform, action: input.action, account: input.account, postRef: input.postRef,
    passId: input.passId, intentId: input.intentId, pageDescriptor: input.pageDescriptor || null };
  const actionDef = { action: 'campaign.like', postRef: input.postRef };
  return { inv: makeInvocation(world, { missionId: input.missionId, effectName, snapshot, actionDef, adapterDeriveOpKey: class09.deriveOpKey, adapterInput: input }), effectName, actionDef };
}
function commentInvocation(world, input) {
  const effectName = `engage:v1:${input.platform}:${input.action}:${input.account}`;
  const snapshot = { platform: input.platform, action: input.action, account: input.account, postRef: input.postRef,
    passId: input.passId, intentId: input.intentId, pageDescriptor: input.pageDescriptor || null };
  const actionDef = { action: 'campaign.comment', postRef: input.postRef, commentText: input.commentText };
  return { inv: makeInvocation(world, { missionId: input.missionId, effectName, snapshot, actionDef, adapterDeriveOpKey: class09.deriveOpKey, adapterInput: input }), effectName, actionDef };
}
function pagePublishInvocation(world, input) {
  const effectName = `engage:v1:${input.platform}:${input.action}:${input.account}`;
  const snapshot = { platform: input.platform, action: input.action, account: input.account, postRef: input.postRef,
    passId: input.passId, intentId: input.intentId, pageDescriptor: input.pageDescriptor || null };
  const actionDef = { action: 'campaign.page-publish', postRef: input.postRef };
  return { inv: makeInvocation(world, { missionId: input.missionId, effectName, snapshot, actionDef, adapterDeriveOpKey: class09.deriveOpKey, adapterInput: input }), effectName, actionDef };
}
function deleteInvocation(world, { missionId, account, postRef }) {
  const effectName = `engage:v1:delete-post:${account}`;
  const snapshot = { platform: 'facebook', action: 'delete-post', account, postRef };
  const actionDef = { action: 'campaign.delete-post', postRef };
  const adapterDeriveOpKey = (inp) => deleteModule.deriveOpKey({ missionId: inp.missionId, effectName: inp.effectName, input: inp.snapshot });
  return { inv: makeInvocation(world, { missionId, effectName, snapshot, actionDef, adapterDeriveOpKey, adapterInput: { missionId, effectName, snapshot } }), effectName, actionDef };
}
function updateInvocation(world, { missionId, account, postRef, boundVersion, intendedContent }) {
  const effectName = `engage:v1:update-post:${account}`;
  const snapshot = { platform: 'facebook', action: 'update-post', account, postRef, boundVersion,
    contentHash: crypto.createHash('sha256').update(intendedContent, 'utf8').digest('hex') };
  const actionDef = { action: 'campaign.update-post', postRef, boundVersion, intendedContent };
  const adapterDeriveOpKey = (inp) => updateModule.deriveOpKey({ missionId: inp.missionId, effectName: inp.effectName, input: inp.snapshot });
  return { inv: makeInvocation(world, { missionId, effectName, snapshot, actionDef, adapterDeriveOpKey, adapterInput: { missionId, effectName, snapshot } }), effectName, actionDef };
}

async function attempt1(world, inv, crashPoint) {
  world.crashPoint = crashPoint;
  try {
    const res = await world.executor.execute({ mission: inv.mission, workerName: inv.workerName, event: inv.event, attempt: 1 });
    return { ok: true, res };
  } catch (e) {
    return { ok: false, err: e };
  }
}
const GREEN_LIKE = { action: 'like', guardDecision: 'ELIGIBLE', guardExitCode: 0, intentState: 'resolved', platformWarning: null };

async function main() {
  // ===== foundation sanity =====
  await scenario('A6-00', 'real A6 foundation resolved (sibling, not shim)', async (s) => {
    const world = makeWorld();
    check(s, 'foundationSource is sibling', world.core.foundationSource === 'sibling', world.core.foundationSource);
    check(s, 'EffectReconciler present', typeof world.F.EffectReconciler === 'function');
    check(s, 'EffectExecutor present', typeof world.F.EffectExecutor === 'function');
  });

  // ===== threads publish =====
  await scenario('T-PUB-01', 'threads publish, ack lost after provider accept -> recovered, exactly one post', async (s) => {
    const world = makeWorld();
    const input = { missionId: 'proof-tpub01', account: 'stub-acct', text: 'Proof post alpha', mediaManifest: [], approvalWindow: '2026-09-24T06:00/2026-09-24T07:00' };
    const { inv, effectName } = threadsInvocation(world, input);
    const a1 = await attempt1(world, inv, 'hang-after-accept');
    check(s, 'attempt 1 raised UnknownOutcomeError', !a1.ok && a1.err.name === 'UnknownOutcomeError', a1.ok ? 'no error' : a1.err.name);
    check(s, 'provider created exactly one post', world.threads.posts.length === 1 && world.threads.publishCount() === 1, `posts=${world.threads.posts.length}`);
    const trail = await reconcileOp(world, {
      opKey: inv.opKey, classModule: class05c, classId: '05c',
      probeDeps: { exec: world.exec, account: input.account, approvedSnapshot: { text: input.text, mediaManifest: [] } },
      predicateContext: { newApproval: false }, consequence: 'high',
      effectName, effectClass: class05c.EFFECT_CLASS, missionId: input.missionId, invocation: inv, attemptWindow: WINDOW,
    });
    check(s, 'class predicate RECOVER_SUCCEEDED', trail.classDecision === 'RECOVER_SUCCEEDED', trail.classDecision);
    check(s, 'foundation alone would have authorized retry (ledger empty)', trail.foundationResolution === 'retry_authorized', trail.foundationResolution);
    check(s, 'final recovered, no retry', trail.final === 'recovered', trail.final);
    check(s, 'provider still exactly one post', world.threads.posts.length === 1, `posts=${world.threads.posts.length}`);
    check(s, 'no attempt-2 dispatch', !world.store.events.some((e) => e.event_type === 'EFFECT_DISPATCHED' && e.payload.attempt >= 2));
    check(s, 'no ungrounded retries', checkNoUngroundedRetries(world).length === 0);
    s.providerLog = world.threads.log;
  });

  await scenario('T-PUB-02', 'threads publish, crash before accept -> SAFE_TO_RETRY with new approval -> exactly one post', async (s) => {
    const world = makeWorld();
    const input = { missionId: 'proof-tpub02', account: 'stub-acct', text: 'Proof post beta', mediaManifest: [], approvalWindow: '2026-09-24T06:00/2026-09-24T07:00' };
    const { inv, effectName } = threadsInvocation(world, input);
    const a1 = await attempt1(world, inv, 'hang-before-accept');
    check(s, 'attempt 1 unknown', !a1.ok && a1.err.name === 'UnknownOutcomeError', a1.ok ? 'no error' : a1.err.name);
    check(s, 'provider untouched', world.threads.posts.length === 0, `posts=${world.threads.posts.length}`);
    const trail = await reconcileOp(world, {
      opKey: inv.opKey, classModule: class05c, classId: '05c',
      probeDeps: { exec: world.exec, account: input.account, approvedSnapshot: { text: input.text, mediaManifest: [] } },
      predicateContext: { newApproval: true, newApprovalWindow: '2026-09-24T07:00/2026-09-24T08:00', frozenSnapshotMatches: true },
      consequence: 'high', effectName, effectClass: class05c.EFFECT_CLASS, missionId: input.missionId, invocation: inv, attemptWindow: WINDOW,
    });
    check(s, 'class predicate SAFE_TO_RETRY', trail.classDecision === 'SAFE_TO_RETRY', trail.classDecision);
    check(s, 'final retried', trail.final === 'retried', trail.final);
    check(s, 'authorization grounded', !!trail.authorization && !!trail.authorization.foundationReason, JSON.stringify(trail.authorization && trail.authorization.foundationReason));
    check(s, 'exactly one post after retry', world.threads.posts.length === 1 && world.threads.publishCount() === 1, `posts=${world.threads.posts.length}`);
    check(s, 'retry succeeded', trail.retryResult && trail.retryResult.status === 'ok', trail.retryResult && trail.retryResult.status);
    check(s, 'no ungrounded retries', checkNoUngroundedRetries(world).length === 0);
    s.providerLog = world.threads.log;
  });

  await scenario('T-PUB-03', 'threads publish, probe degraded -> HOLD, zero publishes', async (s) => {
    const world = makeWorld();
    world.threads.listFail = true;
    const input = { missionId: 'proof-tpub03', account: 'stub-acct', text: 'Proof post gamma', mediaManifest: [], approvalWindow: '2026-09-24T06:00/2026-09-24T07:00' };
    const { inv, effectName } = threadsInvocation(world, input);
    await attempt1(world, inv, 'hang-before-accept');
    const trail = await reconcileOp(world, {
      opKey: inv.opKey, classModule: class05c, classId: '05c',
      probeDeps: { exec: world.exec, account: input.account, approvedSnapshot: { text: input.text, mediaManifest: [] } },
      predicateContext: { newApproval: true, frozenSnapshotMatches: true }, consequence: 'high',
      effectName, effectClass: class05c.EFFECT_CLASS, missionId: input.missionId, invocation: inv, attemptWindow: WINDOW,
    });
    check(s, 'probe inconclusive', trail.steps[0].outcome === 'inconclusive', trail.steps[0].outcome);
    check(s, 'final held', trail.final === 'held', trail.final);
    check(s, 'zero provider publishes', world.threads.publishCount() === 0, `publishes=${world.threads.publishCount()}`);
    check(s, 'EFFECT_HELD emitted', world.store.events.some((e) => e.event_type === 'EFFECT_HELD'));
  });

  await scenario('T-PUB-04', 'threads publish, provider error before probe -> HOLD (no transport retry)', async (s) => {
    const world = makeWorld();
    const input = { missionId: 'proof-tpub04', account: 'stub-acct', text: 'Proof post delta', mediaManifest: [], approvalWindow: '2026-09-24T06:00/2026-09-24T07:00' };
    const { inv, effectName } = threadsInvocation(world, input);
    const a1 = await attempt1(world, inv, 'provider-error');
    check(s, 'attempt 1 failed definitively (known outcome)', !a1.ok && a1.err.code === 'PROVIDER_ERROR', a1.ok ? 'no error' : a1.err.code);
    const trail = await reconcileOp(world, {
      opKey: inv.opKey, classModule: class05c, classId: '05c',
      probeDeps: { exec: world.exec, account: input.account, approvedSnapshot: { text: input.text, mediaManifest: [] } },
      predicateContext: { newApproval: true, newApprovalWindow: 'w2', frozenSnapshotMatches: true, providerErrorBeforeProbe: true },
      consequence: 'high', effectName, effectClass: class05c.EFFECT_CLASS, missionId: input.missionId, invocation: inv, attemptWindow: WINDOW,
    });
    check(s, 'foundation would authorize (definitive retryable failure)', trail.foundationResolution === 'retry_authorized', trail.foundationResolution);
    check(s, 'class predicate HOLD_UNKNOWN', trail.classDecision === 'HOLD_UNKNOWN', trail.classDecision);
    check(s, 'final held', trail.final === 'held', trail.final);
    check(s, 'zero provider publishes', world.threads.publishCount() === 0);
  });

  // ===== instagram publish =====
  await scenario('IG-PUB-01', 'instagram publish, ack lost after accept -> recovered, exactly one post', async (s) => {
    const world = makeWorld();
    const input = { missionId: 'proof-ig01', account: 'stub-biz', kind: 'feed', mediaManifest: ['mh1'], caption: 'Proof caption one' };
    const { inv, effectName } = igInvocation(world, input);
    const a1 = await attempt1(world, inv, 'hang-after-accept');
    check(s, 'attempt 1 unknown', !a1.ok && a1.err.name === 'UnknownOutcomeError', a1.ok ? 'no error' : a1.err.name);
    const trail = await reconcileOp(world, {
      opKey: inv.opKey, classModule: class05d, classId: '05d',
      probeDeps: { exec: world.exec, probeSource: 'cli', accountId: '1', username: input.account, approvedSnapshot: { caption: input.caption, mediaManifest: input.mediaManifest } },
      predicateContext: { dailyLimit: { remaining: 5, limit: 25 }, snapshotMatches: true }, consequence: 'high',
      effectName, effectClass: class05d.EFFECT_CLASS, missionId: input.missionId, invocation: inv, attemptWindow: WINDOW,
    });
    check(s, 'class predicate RECOVER_SUCCEEDED', trail.classDecision === 'RECOVER_SUCCEEDED', trail.classDecision);
    check(s, 'final recovered', trail.final === 'recovered', trail.final);
    check(s, 'exactly one provider post', world.instagram.posts.length === 1 && world.instagram.publishCount() === 1, `posts=${world.instagram.posts.length}`);
    check(s, 'no attempt-2 dispatch', !world.store.events.some((e) => e.event_type === 'EFFECT_DISPATCHED' && e.payload.attempt >= 2));
    s.providerLog = world.instagram.log;
  });

  await scenario('IG-PUB-02', 'instagram publish, crash before accept but near daily limit -> HOLD', async (s) => {
    const world = makeWorld();
    world.instagram.daily.used = 24; // remaining = 1
    const input = { missionId: 'proof-ig02', account: 'stub-biz', kind: 'feed', mediaManifest: ['mh2'], caption: 'Proof caption two' };
    const { inv, effectName } = igInvocation(world, input);
    await attempt1(world, inv, 'hang-before-accept');
    const trail = await reconcileOp(world, {
      opKey: inv.opKey, classModule: class05d, classId: '05d',
      probeDeps: { exec: world.exec, probeSource: 'cli', accountId: '1', username: input.account, approvedSnapshot: { caption: input.caption, mediaManifest: input.mediaManifest } },
      predicateContext: { dailyLimit: { remaining: 1, limit: 25 }, snapshotMatches: true }, consequence: 'high',
      effectName, effectClass: class05d.EFFECT_CLASS, missionId: input.missionId, invocation: inv, attemptWindow: WINDOW,
    });
    check(s, 'class predicate HOLD_UNKNOWN', trail.classDecision === 'HOLD_UNKNOWN', trail.classDecision);
    check(s, 'hold reason cites daily limit', /daily publish limit/.test(trail.steps[2].holdReason || ''), trail.steps[2].holdReason);
    check(s, 'zero provider publishes', world.instagram.publishCount() === 0);
    check(s, 'final held', trail.final === 'held', trail.final);
  });

  await scenario('IG-PUB-03', 'instagram publish, crash before accept, budget ok -> retry, exactly one post', async (s) => {
    const world = makeWorld();
    world.instagram.daily.used = 20; // remaining = 5
    const input = { missionId: 'proof-ig03', account: 'stub-biz', kind: 'story', mediaManifest: ['mh3'], caption: 'Proof caption three' };
    const { inv, effectName } = igInvocation(world, input);
    await attempt1(world, inv, 'hang-before-accept');
    const trail = await reconcileOp(world, {
      opKey: inv.opKey, classModule: class05d, classId: '05d',
      probeDeps: { exec: world.exec, probeSource: 'cli', accountId: '1', username: input.account, approvedSnapshot: { caption: input.caption, mediaManifest: input.mediaManifest } },
      predicateContext: { dailyLimit: { remaining: 5, limit: 25 }, snapshotMatches: true }, consequence: 'high',
      effectName, effectClass: class05d.EFFECT_CLASS, missionId: input.missionId, invocation: inv, attemptWindow: WINDOW,
    });
    check(s, 'class predicate SAFE_TO_RETRY', trail.classDecision === 'SAFE_TO_RETRY', trail.classDecision);
    check(s, 'final retried', trail.final === 'retried', trail.final);
    check(s, 'exactly one provider post', world.instagram.publishCount() === 1, `publishes=${world.instagram.publishCount()}`);
    check(s, 'no ungrounded retries', checkNoUngroundedRetries(world).length === 0);
  });

  await scenario('IG-PUB-04', 'instagram publish, CDP probe source rejected -> HOLD', async (s) => {
    const world = makeWorld();
    const input = { missionId: 'proof-ig04', account: 'stub-biz', kind: 'feed', mediaManifest: ['mh4'], caption: 'Proof caption four' };
    const { inv, effectName } = igInvocation(world, input);
    await attempt1(world, inv, 'hang-before-accept');
    const trail = await reconcileOp(world, {
      opKey: inv.opKey, classModule: class05d, classId: '05d',
      probeDeps: { exec: world.exec, probeSource: 'cdp', approvedSnapshot: { caption: input.caption, mediaManifest: input.mediaManifest } },
      predicateContext: { dailyLimit: { remaining: 5, limit: 25 }, snapshotMatches: true }, consequence: 'high',
      effectName, effectClass: class05d.EFFECT_CLASS, missionId: input.missionId, invocation: inv, attemptWindow: WINDOW,
    });
    check(s, 'probe inconclusive (degraded path rejected)', trail.steps[0].outcome === 'inconclusive', trail.steps[0].outcome);
    check(s, 'final held', trail.final === 'held', trail.final);
    check(s, 'zero provider publishes', world.instagram.publishCount() === 0);
  });

  // ===== likes (toggle semantics) =====
  const likeInput = (n) => ({ missionId: `proof-like${n}`, platform: 'facebook', action: 'like', account: 'StubBiz',
    postRef: `fb-post-${n}`, passId: 'proof-pass-1', intentId: `intent-${n}`, pageDescriptor: `StubBiz (proof photo post ${n})` });
  const likeProbeDeps = (world, postRef) => ({ action: 'like', platform: 'facebook', account: 'StubBiz', postRef,
    probeLikeState: async () => world.engagement.readLikeState(postRef) });

  await scenario('LIKE-01', 'like, ack lost after toggle -> recovered, one toggle, still liked (never unliked)', async (s) => {
    const world = makeWorld();
    const input = likeInput('01');
    world.engagement.seedPost(input.postRef);
    const { inv, effectName } = likeInvocation(world, input);
    const a1 = await attempt1(world, inv, 'hang-after-accept');
    check(s, 'attempt 1 unknown', !a1.ok && a1.err.name === 'UnknownOutcomeError', a1.ok ? 'no error' : a1.err.name);
    check(s, 'provider toggle issued exactly once', world.engagement.toggleCount(input.postRef) === 1, `toggles=${world.engagement.toggleCount(input.postRef)}`);
    check(s, 'provider state liked', world.engagement.readLikeState(input.postRef).liked === true);
    const trail = await reconcileOp(world, {
      opKey: inv.opKey, classModule: class09, classId: '09', probeDeps: likeProbeDeps(world, input.postRef),
      predicateContext: GREEN_LIKE, consequence: 'medium',
      effectName, effectClass: class09.EFFECT_CLASS, missionId: input.missionId, invocation: inv, attemptWindow: WINDOW,
    });
    check(s, 'probe delivered (liked)', trail.steps[0].outcome === 'delivered', trail.steps[0].outcome);
    check(s, 'class predicate RECOVER_SUCCEEDED', trail.classDecision === 'RECOVER_SUCCEEDED', trail.classDecision);
    check(s, 'final recovered, no retry toggle', trail.final === 'recovered', trail.final);
    check(s, 'still exactly one toggle total', world.engagement.toggleCount(input.postRef) === 1, `toggles=${world.engagement.toggleCount(input.postRef)}`);
    check(s, 'final state still liked (no inversion)', world.engagement.readLikeState(input.postRef).liked === true);
    s.providerLog = world.engagement.log;
  });

  await scenario('LIKE-02', 'like dispatch with state already-liked -> no-op, zero toggles, never unliked', async (s) => {
    const world = makeWorld();
    const input = likeInput('02');
    world.engagement.seedPost(input.postRef);
    world.engagement.likeState.set(input.postRef, true); // already liked before dispatch
    const { inv } = likeInvocation(world, input);
    const a1 = await attempt1(world, inv, 'none');
    check(s, 'attempt 1 completed', a1.ok, a1.ok ? '' : String(a1.err && a1.err.message));
    check(s, 'dispatch was a pre-dispatch no-op', a1.ok && a1.res.result && a1.res.result.status === 'noop', JSON.stringify(a1.ok && a1.res.result));
    check(s, 'zero provider toggles', world.engagement.toggleCount(input.postRef) === 0, `toggles=${world.engagement.toggleCount(input.postRef)}`);
    check(s, 'state still liked', world.engagement.readLikeState(input.postRef).liked === true);
  });

  await scenario('LIKE-03', 'like, crash before accept, probe absent + green gates -> retry issues exactly one toggle', async (s) => {
    const world = makeWorld();
    const input = likeInput('03');
    world.engagement.seedPost(input.postRef);
    const { inv, effectName } = likeInvocation(world, input);
    await attempt1(world, inv, 'hang-before-accept');
    check(s, 'zero toggles before retry', world.engagement.toggleCount(input.postRef) === 0);
    const trail = await reconcileOp(world, {
      opKey: inv.opKey, classModule: class09, classId: '09', probeDeps: likeProbeDeps(world, input.postRef),
      predicateContext: GREEN_LIKE, consequence: 'medium',
      effectName, effectClass: class09.EFFECT_CLASS, missionId: input.missionId, invocation: inv, attemptWindow: WINDOW,
    });
    check(s, 'class predicate SAFE_TO_RETRY', trail.classDecision === 'SAFE_TO_RETRY', trail.classDecision);
    check(s, 'final retried', trail.final === 'retried', trail.final);
    check(s, 'exactly one toggle total', world.engagement.toggleCount(input.postRef) === 1, `toggles=${world.engagement.toggleCount(input.postRef)}`);
    check(s, 'final state liked', world.engagement.readLikeState(input.postRef).liked === true);
    check(s, 'no ungrounded retries', checkNoUngroundedRetries(world).length === 0);
  });

  await scenario('LIKE-04', 'like, probe unreadable -> HOLD, zero toggles', async (s) => {
    const world = makeWorld();
    world.engagement.likeReadFail = true;
    const input = likeInput('04');
    world.engagement.seedPost(input.postRef);
    const { inv, effectName } = likeInvocation(world, input);
    await attempt1(world, inv, 'hang-before-accept');
    const trail = await reconcileOp(world, {
      opKey: inv.opKey, classModule: class09, classId: '09', probeDeps: likeProbeDeps(world, input.postRef),
      predicateContext: GREEN_LIKE, consequence: 'medium',
      effectName, effectClass: class09.EFFECT_CLASS, missionId: input.missionId, invocation: inv, attemptWindow: WINDOW,
    });
    check(s, 'probe inconclusive', trail.steps[0].outcome === 'inconclusive', trail.steps[0].outcome);
    check(s, 'final held', trail.final === 'held', trail.final);
    check(s, 'zero provider toggles', world.engagement.toggleCount(input.postRef) === 0);
  });

  await scenario('LIKE-05', 'like, guard ALREADY_ENGAGED vs probe absent -> HOLD (discrepancy)', async (s) => {
    const world = makeWorld();
    const input = likeInput('05');
    world.engagement.seedPost(input.postRef);
    const { inv, effectName } = likeInvocation(world, input);
    await attempt1(world, inv, 'hang-before-accept');
    const trail = await reconcileOp(world, {
      opKey: inv.opKey, classModule: class09, classId: '09', probeDeps: likeProbeDeps(world, input.postRef),
      predicateContext: { ...GREEN_LIKE, guardDecision: 'ALREADY_ENGAGED' }, consequence: 'medium',
      effectName, effectClass: class09.EFFECT_CLASS, missionId: input.missionId, invocation: inv, attemptWindow: WINDOW,
    });
    check(s, 'final held', trail.final === 'held', trail.final);
    check(s, 'hold reason cites discrepancy', /discrepancy/.test(trail.steps[2].holdReason || ''), trail.steps[2].holdReason);
    check(s, 'zero provider toggles', world.engagement.toggleCount(input.postRef) === 0);
  });

  await scenario('LIKE-06', 'like, platform warning -> HOLD, zero toggles', async (s) => {
    const world = makeWorld();
    const input = likeInput('06');
    world.engagement.seedPost(input.postRef);
    const { inv, effectName } = likeInvocation(world, input);
    await attempt1(world, inv, 'hang-before-accept');
    const trail = await reconcileOp(world, {
      opKey: inv.opKey, classModule: class09, classId: '09', probeDeps: likeProbeDeps(world, input.postRef),
      predicateContext: { ...GREEN_LIKE, platformWarning: { type: 'action_block' } }, consequence: 'medium',
      effectName, effectClass: class09.EFFECT_CLASS, missionId: input.missionId, invocation: inv, attemptWindow: WINDOW,
    });
    check(s, 'final held', trail.final === 'held', trail.final);
    check(s, 'zero provider toggles', world.engagement.toggleCount(input.postRef) === 0);
  });

  // ===== comments =====
  await scenario('CMT-01', 'comment, ack lost after post -> recovered, exactly one comment', async (s) => {
    const world = makeWorld();
    const input = { missionId: 'proof-cmt01', platform: 'facebook', action: 'comment', account: 'StubBiz',
      postRef: 'fb-post-9', passId: 'proof-pass-1', intentId: 'intent-c1', pageDescriptor: 'StubBiz (proof photo post 9)', commentText: 'Nice work, neighbors!' };
    world.engagement.seedPost(input.postRef);
    const { inv, effectName } = commentInvocation(world, input);
    const a1 = await attempt1(world, inv, 'hang-after-accept');
    check(s, 'attempt 1 unknown', !a1.ok && a1.err.name === 'UnknownOutcomeError', a1.ok ? 'no error' : a1.err.name);
    const trail = await reconcileOp(world, {
      opKey: inv.opKey, classModule: class09, classId: '09',
      probeDeps: { action: 'comment', platform: 'facebook', account: 'StubBiz', postRef: input.postRef, commentText: input.commentText,
        probeCommentPresent: async () => ({ present: world.engagement.readComments(input.postRef).includes(input.commentText) }) },
      predicateContext: { ...GREEN_LIKE, action: 'comment' }, consequence: 'medium',
      effectName, effectClass: class09.EFFECT_CLASS, missionId: input.missionId, invocation: inv, attemptWindow: WINDOW,
    });
    check(s, 'probe delivered', trail.steps[0].outcome === 'delivered', trail.steps[0].outcome);
    check(s, 'final recovered', trail.final === 'recovered', trail.final);
    check(s, 'exactly one comment', world.engagement.commentCount(input.postRef) === 1, `comments=${world.engagement.commentCount(input.postRef)}`);
    check(s, 'no attempt-2 dispatch', !world.store.events.some((e) => e.event_type === 'EFFECT_DISPATCHED' && e.payload.attempt >= 2));
  });

  await scenario('CMT-02', 'comment, crash before accept, absent + green -> retry, exactly one comment', async (s) => {
    const world = makeWorld();
    const input = { missionId: 'proof-cmt02', platform: 'facebook', action: 'comment', account: 'StubBiz',
      postRef: 'fb-post-10', passId: 'proof-pass-1', intentId: 'intent-c2', pageDescriptor: 'StubBiz (proof photo post 10)', commentText: 'Great-looking shop!' };
    world.engagement.seedPost(input.postRef);
    const { inv, effectName } = commentInvocation(world, input);
    await attempt1(world, inv, 'hang-before-accept');
    const trail = await reconcileOp(world, {
      opKey: inv.opKey, classModule: class09, classId: '09',
      probeDeps: { action: 'comment', platform: 'facebook', account: 'StubBiz', postRef: input.postRef, commentText: input.commentText,
        probeCommentPresent: async () => ({ present: world.engagement.readComments(input.postRef).includes(input.commentText) }) },
      predicateContext: { ...GREEN_LIKE, action: 'comment' }, consequence: 'medium',
      effectName, effectClass: class09.EFFECT_CLASS, missionId: input.missionId, invocation: inv, attemptWindow: WINDOW,
    });
    check(s, 'final retried', trail.final === 'retried', trail.final);
    check(s, 'exactly one comment', world.engagement.commentCount(input.postRef) === 1, `comments=${world.engagement.commentCount(input.postRef)}`);
    check(s, 'no ungrounded retries', checkNoUngroundedRetries(world).length === 0);
  });

  // ===== page publish: always HOLD =====
  await scenario('PUB-09', 'page-publish is never dispatched and never retried (PAUSED)', async (s) => {
    const world = makeWorld();
    const input = { missionId: 'proof-pub09', platform: 'facebook', action: 'page-publish', account: 'PingPage',
      postRef: 'page-draft-1', passId: 'proof-pass-1', intentId: 'intent-p1', pageDescriptor: 'PING Page (draft post 1)' };
    const { inv, effectName } = pagePublishInvocation(world, input);
    const a1 = await attempt1(world, inv, 'none');
    check(s, 'dispatch gate aborted (never reaches provider)', !a1.ok && a1.err.code === 'GATE_ABORT', a1.ok ? 'no error' : (a1.err && a1.err.code));
    check(s, 'zero provider page-publish calls', world.engagement.pagePublishCalls === 0, `calls=${world.engagement.pagePublishCalls}`);
    const trail = await reconcileOp(world, {
      opKey: inv.opKey, classModule: class09, classId: '09',
      probeDeps: { action: 'page-publish' },
      predicateContext: { ...GREEN_LIKE, action: 'page-publish' }, consequence: 'high',
      effectName, effectClass: class09.EFFECT_CLASS, missionId: input.missionId, invocation: inv, attemptWindow: WINDOW,
    });
    check(s, 'predicate HOLD_UNKNOWN (never unpause)', trail.classDecision === 'HOLD_UNKNOWN', trail.classDecision);
    check(s, 'final held', trail.final === 'held', trail.final);
    check(s, 'no attempt-2 dispatch', !world.store.events.some((e) => e.event_type === 'EFFECT_DISPATCHED' && e.payload.attempt >= 2));
  });

  // ===== delete (idempotent) =====
  await scenario('DEL-01', 'delete, ack lost after delete -> recovered; repeat delete is ok, never resurrects', async (s) => {
    const world = makeWorld();
    world.engagement.seedPost('del-post-1', { content: 'to remove', version: 1 });
    const { inv, effectName } = deleteInvocation(world, { missionId: 'proof-del01', account: 'StubBiz', postRef: 'del-post-1' });
    const a1 = await attempt1(world, inv, 'hang-after-accept');
    check(s, 'attempt 1 unknown', !a1.ok && a1.err.name === 'UnknownOutcomeError', a1.ok ? 'no error' : a1.err.name);
    check(s, 'provider deleted once', world.engagement.deleteCount('del-post-1') === 1, `deletes=${world.engagement.deleteCount('del-post-1')}`);
    const trail = await reconcileOp(world, {
      opKey: inv.opKey, classModule: deleteModule, classId: '09-del',
      probeDeps: { readTarget: async () => world.engagement.readPost('del-post-1') },
      predicateContext: {}, consequence: 'medium',
      effectName, effectClass: '09-campaign-publication', missionId: 'proof-del01', invocation: inv, attemptWindow: WINDOW,
    });
    check(s, 'probe delivered (target gone)', trail.steps[0].outcome === 'delivered', trail.steps[0].outcome);
    check(s, 'final recovered', trail.final === 'recovered', trail.final);
    const repeat = world.engagement.deletePost('del-post-1');
    check(s, 'repeat delete returns ok, alreadyGone, no error', repeat.ok === true && repeat.alreadyGone === true, JSON.stringify(repeat));
    check(s, 'target stays gone (no resurrection)', world.engagement.readPost('del-post-1').exists === false);
    check(s, 'no attempt-2 dispatch', !world.store.events.some((e) => e.event_type === 'EFFECT_DISPATCHED' && e.payload.attempt >= 2));
    s.providerLog = world.engagement.log;
  });

  await scenario('DEL-02', 'delete, crash before accept -> retry safe (idempotent), target gone once', async (s) => {
    const world = makeWorld();
    world.engagement.seedPost('del-post-2', { content: 'to remove', version: 1 });
    const { inv, effectName } = deleteInvocation(world, { missionId: 'proof-del02', account: 'StubBiz', postRef: 'del-post-2' });
    await attempt1(world, inv, 'hang-before-accept');
    const trail = await reconcileOp(world, {
      opKey: inv.opKey, classModule: deleteModule, classId: '09-del',
      probeDeps: { readTarget: async () => world.engagement.readPost('del-post-2') },
      predicateContext: {}, consequence: 'medium',
      effectName, effectClass: '09-campaign-publication', missionId: 'proof-del02', invocation: inv, attemptWindow: WINDOW,
    });
    check(s, 'final retried', trail.final === 'retried', trail.final);
    check(s, 'provider deleted exactly once', world.engagement.deleteCount('del-post-2') === 1, `deletes=${world.engagement.deleteCount('del-post-2')}`);
    check(s, 'target gone', world.engagement.readPost('del-post-2').exists === false);
    check(s, 'no ungrounded retries', checkNoUngroundedRetries(world).length === 0);
  });

  await scenario('DEL-03', 'delete, target unreadable -> HOLD', async (s) => {
    const world = makeWorld();
    world.engagement.seedPost('del-post-3', { content: 'to remove', version: 1 });
    world.engagement.stateReadFail = true;
    const { inv, effectName } = deleteInvocation(world, { missionId: 'proof-del03', account: 'StubBiz', postRef: 'del-post-3' });
    await attempt1(world, inv, 'hang-before-accept');
    const trail = await reconcileOp(world, {
      opKey: inv.opKey, classModule: deleteModule, classId: '09-del',
      probeDeps: { readTarget: async () => world.engagement.readPost('del-post-3') },
      predicateContext: {}, consequence: 'medium',
      effectName, effectClass: '09-campaign-publication', missionId: 'proof-del03', invocation: inv, attemptWindow: WINDOW,
    });
    check(s, 'probe inconclusive', trail.steps[0].outcome === 'inconclusive', trail.steps[0].outcome);
    check(s, 'final held', trail.final === 'held', trail.final);
    check(s, 'zero provider deletes', world.engagement.deleteCount('del-post-3') === 0);
  });

  // ===== update (version-bound) =====
  await scenario('UPD-01', 'update, ack lost after apply -> recovered, exactly one update', async (s) => {
    const world = makeWorld();
    world.engagement.seedPost('upd-post-1', { content: 'old copy', version: 1 });
    const { inv, effectName } = updateInvocation(world, { missionId: 'proof-upd01', account: 'StubBiz', postRef: 'upd-post-1', boundVersion: 1, intendedContent: 'new copy' });
    const a1 = await attempt1(world, inv, 'hang-after-accept');
    check(s, 'attempt 1 unknown', !a1.ok && a1.err.name === 'UnknownOutcomeError', a1.ok ? 'no error' : a1.err.name);
    const trail = await reconcileOp(world, {
      opKey: inv.opKey, classModule: updateModule, classId: '09-upd',
      probeDeps: { readTarget: async () => world.engagement.readPost('upd-post-1'), intendedContent: 'new copy', boundVersion: 1 },
      predicateContext: {}, consequence: 'medium',
      effectName, effectClass: '09-campaign-publication', missionId: 'proof-upd01', invocation: inv, attemptWindow: WINDOW,
    });
    check(s, 'probe delivered (content matches)', trail.steps[0].outcome === 'delivered', trail.steps[0].outcome);
    check(s, 'final recovered', trail.final === 'recovered', trail.final);
    check(s, 'exactly one provider update', world.engagement.updateCount('upd-post-1') === 1, `updates=${world.engagement.updateCount('upd-post-1')}`);
    check(s, 'content is the intended content', world.engagement.readPost('upd-post-1').content === 'new copy');
    check(s, 'no attempt-2 dispatch', !world.store.events.some((e) => e.event_type === 'EFFECT_DISPATCHED' && e.payload.attempt >= 2));
    s.providerLog = world.engagement.log;
  });

  await scenario('UPD-02', 'update, target changed between attempts -> HOLD, no forced update', async (s) => {
    const world = makeWorld();
    world.engagement.seedPost('upd-post-2', { content: 'old copy', version: 1 });
    const { inv, effectName } = updateInvocation(world, { missionId: 'proof-upd02', account: 'StubBiz', postRef: 'upd-post-2', boundVersion: 1, intendedContent: 'new copy' });
    await attempt1(world, inv, 'hang-before-accept');
    // external actor changes the target between the dispatch and the reconcile
    const p = world.engagement.posts.get('upd-post-2');
    p.content = 'rival edit';
    p.version = 2;
    const trail = await reconcileOp(world, {
      opKey: inv.opKey, classModule: updateModule, classId: '09-upd',
      probeDeps: { readTarget: async () => world.engagement.readPost('upd-post-2'), intendedContent: 'new copy', boundVersion: 1 },
      predicateContext: {}, consequence: 'medium',
      effectName, effectClass: '09-campaign-publication', missionId: 'proof-upd02', invocation: inv, attemptWindow: WINDOW,
    });
    check(s, 'probe not-delivered with version evidence', trail.steps[0].outcome === 'not-delivered' && trail.steps[0].evidence.version === 2, JSON.stringify(trail.steps[0].evidence));
    check(s, 'final held (abort, not forced)', trail.final === 'held', trail.final);
    check(s, 'hold reason cites version drift', /changed between attempts/.test(trail.steps[2].holdReason || ''), trail.steps[2].holdReason);
    check(s, 'zero provider updates', world.engagement.updateCount('upd-post-2') === 0);
    check(s, 'external content untouched', world.engagement.readPost('upd-post-2').content === 'rival edit');
  });

  await scenario('UPD-03', 'update, crash before accept, version bound clean -> retry, exactly one update', async (s) => {
    const world = makeWorld();
    world.engagement.seedPost('upd-post-3', { content: 'old copy', version: 1 });
    const { inv, effectName } = updateInvocation(world, { missionId: 'proof-upd03', account: 'StubBiz', postRef: 'upd-post-3', boundVersion: 1, intendedContent: 'new copy' });
    await attempt1(world, inv, 'hang-before-accept');
    const trail = await reconcileOp(world, {
      opKey: inv.opKey, classModule: updateModule, classId: '09-upd',
      probeDeps: { readTarget: async () => world.engagement.readPost('upd-post-3'), intendedContent: 'new copy', boundVersion: 1 },
      predicateContext: {}, consequence: 'medium',
      effectName, effectClass: '09-campaign-publication', missionId: 'proof-upd03', invocation: inv, attemptWindow: WINDOW,
    });
    check(s, 'final retried', trail.final === 'retried', trail.final);
    check(s, 'exactly one provider update', world.engagement.updateCount('upd-post-3') === 1, `updates=${world.engagement.updateCount('upd-post-3')}`);
    check(s, 'content applied', world.engagement.readPost('upd-post-3').content === 'new copy');
    check(s, 'no ungrounded retries', checkNoUngroundedRetries(world).length === 0);
  });

  // ===== reconcile racing guard (real foundation code path) =====
  await scenario('RACE-01', 'reconcile raced: rival terminal mid-flight -> deferred_to_existing_terminal', async (s) => {
    const world = makeWorld();
    const input = { missionId: 'proof-race01', account: 'stub-acct', text: 'Race post', mediaManifest: [], approvalWindow: '2026-09-24T06:00/2026-09-24T07:00' };
    const { inv } = threadsInvocation(world, input);
    await attempt1(world, inv, 'hang-before-accept');
    // force the ledger probe to 'unknown' so decide() -> held -> terminal emit path
    world.ledger.get = async () => { throw new Error('db unreachable'); };
    const origQuery = world.reconciler.queryOp.bind(world.reconciler);
    let calls = 0;
    world.reconciler.queryOp = async (opKey) => {
      calls += 1;
      if (calls === 2) {
        world.store.emit('EFFECT_HELD', 'rival-reconciler',
          { op_key: opKey, reason: 'rival hold', consequence: 'high', escalated_to: 'operator' }, {});
      }
      return origQuery(opKey);
    };
    const decision = await world.reconciler.reconcile(inv.opKey, { consequence: 'high', maxAttempts: 3 });
    check(s, 'real racing guard deferred', decision.resolution === 'deferred_to_existing_terminal', decision.resolution);
    check(s, 'via racing_reconciler_guard', decision.via === 'racing_reconciler_guard', decision.via);
  });

  // ===== the core theorem: no global retry boolean =====
  await scenario('NOGLOBAL-01a', 'static scan: no global retry boolean in adapters, foundation, or harness', async (s) => {
    const hits = scanForGlobalRetryBoolean([
      path.join(DIR, 'stub_providers.js'),
      path.join(DIR, 'retry_predicates.js'),
      path.join(DIR, 'harness.js'),
      path.join(DIR, 'run_proof.js'),
    ]);
    check(s, 'zero suspicious global-retry-flag hits', hits.length === 0, JSON.stringify(hits.slice(0, 5)));
    s.scanHits = hits;
  });

  await scenario('NOGLOBAL-01b', 'variance: same intent, different observed state -> different decisions (real class09 predicate)', async (s) => {
    const world = makeWorld();
    const mk = (outcome, evidence) => world.core.makeProbeResult({ opKey: 'k', outcome, observation: 'x', evidence });
    const dDelivered = world.core.evaluatePredicate({ classModule: class09, classId: '09',
      probeResult: mk('delivered', { liked: true }), context: GREEN_LIKE }).decision;
    const dAbsent = world.core.evaluatePredicate({ classModule: class09, classId: '09',
      probeResult: mk('not-delivered', { liked: false }), context: GREEN_LIKE }).decision;
    const dUnknown = world.core.evaluatePredicate({ classModule: class09, classId: '09',
      probeResult: mk('inconclusive', {}), context: GREEN_LIKE }).decision;
    check(s, 'delivered -> RECOVER_SUCCEEDED', dDelivered === 'RECOVER_SUCCEEDED', dDelivered);
    check(s, 'absent -> SAFE_TO_RETRY', dAbsent === 'SAFE_TO_RETRY', dAbsent);
    check(s, 'inconclusive -> HOLD_UNKNOWN', dUnknown === 'HOLD_UNKNOWN', dUnknown);
    check(s, 'all three differ', new Set([dDelivered, dAbsent, dUnknown]).size === 3);
  });

  await scenario('NOGLOBAL-01c', 'retry_safe takes factors, not a boolean: same action varies with observed state', async (s) => {
    const base = { action: 'campaign.like', effectClass: '09-campaign-publication', providerSemantics: 'toggle',
      idempotencySupport: 'none', observedState: { liked: false },
      reconciliationEvidence: { guardDecision: 'ELIGIBLE', intentState: 'resolved', platformWarning: null } };
    const rAbsent = retry_safe(base);
    const rLiked = retry_safe({ ...base, observedState: { liked: true } });
    const rUnreadable = retry_safe({ ...base, observedState: { liked: null } });
    const rUnknownAction = retry_safe({ ...base, action: 'campaign.teleport' });
    check(s, 'absent -> SAFE_TO_RETRY', rAbsent.decision === 'SAFE_TO_RETRY', rAbsent.decision);
    check(s, 'already liked -> RECOVER_SUCCEEDED', rLiked.decision === 'RECOVER_SUCCEEDED', rLiked.decision);
    check(s, 'unreadable -> HOLD_UNKNOWN', rUnreadable.decision === 'HOLD_UNKNOWN', rUnreadable.decision);
    check(s, 'unknown action -> HOLD_UNKNOWN (fail closed)', rUnknownAction.decision === 'HOLD_UNKNOWN', rUnknownAction.decision);
    check(s, 'no boolean retry parameter in signature', !/retry\s*=\s*(true|false)/.test(retry_safe.toString().split(')')[0]));
  });

  // ===== write evidence =====
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  const evidence = {
    generatedAt: new Date().toISOString(),
    summary: { total: results.length, passed, failed },
    scenarios: results.map((r) => ({
      id: r.id, title: r.title, pass: r.pass, error: r.error,
      checks: r.checks,
      providerLog: r.providerLog || undefined,
    })),
  };
  fs.writeFileSync(path.join(DIR, 'evidence.json'), JSON.stringify(evidence, null, 2));
  console.log(`\n${passed}/${results.length} scenarios passed, ${failed} failed. Evidence -> evidence.json`);
  process.exitCode = failed === 0 ? 0 : 1;
}

main().catch((e) => { console.error('HARNESS FATAL', e); process.exitCode = 2; });
