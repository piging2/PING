'use strict';
/**
 * retry_predicates.js — the core theorem, encoded.
 *
 * THEOREM: there is NO global retry boolean anywhere in the path.
 *   retry_safe = f(effect class, provider semantics, current observed
 *                  provider state, idempotency support, reconciliation evidence)
 *
 * It is this function. It takes no boolean `retry` flag; the decision is a
 * pure function of the five factors above, dispatched per action type to an
 * explicit per-action predicate. The proof demonstrates:
 *   (a) static scan: no global retry flag exists in the adapters, the A6
 *       foundation, or this harness;
 *   (b) variance: the same intent under different observed provider states
 *       yields different decisions (a global boolean could not do this).
 */
const path = require('path');
const fs = require('fs');

const ADAPTERS = '/home/nolan/ping/ping-runtime/orchestration/effect_adapters';
const createCore = require(path.join(ADAPTERS, 'adapter_core.js'));
const _core = createCore(); // foundation resolution only; no emit needed here
const DECISIONS = _core.DECISIONS;
const makeProbeResult = _core.makeProbeResult;

const class05c = require(path.join(ADAPTERS, 'class_05c_threads.js'));
const class05d = require(path.join(ADAPTERS, 'class_05d_instagram.js'));
const class09 = require(path.join(ADAPTERS, 'class_09_campaign_publication.js'));

/**
 * retry_safe({action, effectClass, providerSemantics, observedState,
 *             idempotencySupport, reconciliationEvidence}) ->
 *   {decision, reason, evidence}
 *
 * Explicit predicate per action type. No boolean retry parameter exists.
 */
function retry_safe({ action, effectClass, providerSemantics, observedState, idempotencySupport, reconciliationEvidence }) {
  if (!action || !effectClass || !providerSemantics || !observedState) {
    return { decision: DECISIONS.HOLD_UNKNOWN, reason: 'missing predicate factor; fail closed', evidence: {} };
  }
  const fn = PREDICATE_TABLE[action];
  if (!fn) {
    return { decision: DECISIONS.HOLD_UNKNOWN, reason: `no predicate encoded for action '${action}'; fail closed`, evidence: {} };
  }
  return fn({ effectClass, providerSemantics, observedState, idempotencySupport, reconciliationEvidence });
}

const PREDICATE_TABLE = {
  // -- publish actions: create semantics, no provider idempotency.
  // Retry is safe ONLY when the probe proves non-existence of the post.
  'threads.publish-post': ({ observedState, reconciliationEvidence }) => {
    if (observedState.probeOutcome === 'delivered') {
      return { decision: DECISIONS.RECOVER_SUCCEEDED, reason: 'probe proves the post exists; a retry would duplicate', evidence: reconciliationEvidence };
    }
    if (observedState.probeOutcome !== 'not-delivered') {
      return { decision: DECISIONS.HOLD_UNKNOWN, reason: 'probe did not prove absence; never retry on ambiguity', evidence: reconciliationEvidence };
    }
    if (!reconciliationEvidence.newApproval) {
      return { decision: DECISIONS.HOLD_UNKNOWN, reason: 'zero transport retries: a later attempt needs new explicit approval', evidence: reconciliationEvidence };
    }
    return { decision: DECISIONS.SAFE_TO_RETRY, reason: 'probe proves absence + new explicit approval + frozen snapshot', evidence: reconciliationEvidence };
  },
  'instagram.post': ({ observedState, reconciliationEvidence }) => {
    if (observedState.probeOutcome === 'delivered') {
      return { decision: DECISIONS.RECOVER_SUCCEEDED, reason: 'fingerprint match proves the post exists; retry would duplicate', evidence: reconciliationEvidence };
    }
    if (observedState.probeOutcome !== 'not-delivered') {
      return { decision: DECISIONS.HOLD_UNKNOWN, reason: 'probe ambiguous or degraded path; never retry', evidence: reconciliationEvidence };
    }
    if (!Number.isInteger(reconciliationEvidence.dailyRemaining) || reconciliationEvidence.dailyRemaining <= 1) {
      return { decision: DECISIONS.HOLD_UNKNOWN, reason: 'daily budget unknown or near limit; a duplicate could burn the last slot', evidence: reconciliationEvidence };
    }
    return { decision: DECISIONS.SAFE_TO_RETRY, reason: 'CLI probe proves absence + budget headroom + frozen snapshot', evidence: reconciliationEvidence };
  },
  // -- like: provider semantics are TOGGLE/INVERT on repeat.
  // The like is issued ONLY when observed state differs from intended state.
  // A second attempt with state already-liked is a no-op, never an unlike.
  'campaign.like': ({ observedState, reconciliationEvidence }) => {
    if (observedState.liked === true) {
      return { decision: DECISIONS.RECOVER_SUCCEEDED, reason: 'post already in liked state; issuing another toggle would UNLIKE', evidence: reconciliationEvidence };
    }
    if (observedState.liked !== false) {
      return { decision: DECISIONS.HOLD_UNKNOWN, reason: 'like state unreadable; a blind toggle can invert the effect', evidence: reconciliationEvidence };
    }
    if (reconciliationEvidence.guardDecision !== 'ELIGIBLE') {
      return { decision: DECISIONS.HOLD_UNKNOWN, reason: `guard did not return ELIGIBLE (got '${reconciliationEvidence.guardDecision}')`, evidence: reconciliationEvidence };
    }
    if (reconciliationEvidence.intentState === 'UNKNOWN_EXECUTION') {
      return { decision: DECISIONS.HOLD_UNKNOWN, reason: 'open UNKNOWN_EXECUTION intent; reconcile first', evidence: reconciliationEvidence };
    }
    if (reconciliationEvidence.platformWarning) {
      return { decision: DECISIONS.HOLD_UNKNOWN, reason: 'platform warning; minimum volume with 14-day hold', evidence: reconciliationEvidence };
    }
    return { decision: DECISIONS.SAFE_TO_RETRY, reason: 'probe proves like absent + guard ELIGIBLE + intent resolved + no warning', evidence: reconciliationEvidence };
  },
  // -- comment: additive on repeat (a re-post is a second comment).
  'campaign.comment': ({ observedState, reconciliationEvidence }) => {
    if (observedState.commentPresent === true) {
      return { decision: DECISIONS.RECOVER_SUCCEEDED, reason: 'comment already present; a retry would double-post', evidence: reconciliationEvidence };
    }
    if (observedState.commentPresent !== false) {
      return { decision: DECISIONS.HOLD_UNKNOWN, reason: 'comment presence unreadable', evidence: reconciliationEvidence };
    }
    if (reconciliationEvidence.guardDecision !== 'ELIGIBLE') {
      return { decision: DECISIONS.HOLD_UNKNOWN, reason: `guard did not return ELIGIBLE (got '${reconciliationEvidence.guardDecision}')`, evidence: reconciliationEvidence };
    }
    return { decision: DECISIONS.SAFE_TO_RETRY, reason: 'probe proves comment absent + guard ELIGIBLE', evidence: reconciliationEvidence };
  },
  // -- page-publish: PAUSED. Adapters never unpause it.
  'campaign.page-publish': () => ({
    decision: DECISIONS.HOLD_UNKNOWN,
    reason: 'page publishing is PAUSED under a silent restriction; adapters must NEVER unpause it',
    evidence: {},
  }),
  // -- delete: idempotent on the provider (already-gone = ok, never an
  // error, never resurrects). Reconcile via provider state query.
  'campaign.delete-post': ({ observedState, reconciliationEvidence }) => {
    if (observedState.targetReadable !== true) {
      return { decision: DECISIONS.HOLD_UNKNOWN, reason: 'target state unreadable; cannot reconcile the delete', evidence: reconciliationEvidence };
    }
    if (observedState.targetExists === false) {
      return { decision: DECISIONS.RECOVER_SUCCEEDED, reason: 'target absent on provider; delete is effective (repeat is a no-op)', evidence: reconciliationEvidence };
    }
    return { decision: DECISIONS.SAFE_TO_RETRY, reason: 'target still present; delete is idempotent so repeat is safe', evidence: reconciliationEvidence };
  },
  // -- update: the adapter re-reads the target before update and aborts
  // (HOLD) if the target changed between attempts in a way the op cannot
  // bind to (version drift, target gone).
  'campaign.update-post': ({ observedState, reconciliationEvidence }) => {
    if (observedState.targetReadable !== true) {
      return { decision: DECISIONS.HOLD_UNKNOWN, reason: 'target state unreadable; cannot bind the update', evidence: reconciliationEvidence };
    }
    if (observedState.contentMatches === true) {
      return { decision: DECISIONS.RECOVER_SUCCEEDED, reason: 'target already carries the intended content', evidence: reconciliationEvidence };
    }
    if (observedState.targetExists === false) {
      return { decision: DECISIONS.HOLD_UNKNOWN, reason: 'target gone; the update cannot bind to anything', evidence: reconciliationEvidence };
    }
    if (observedState.versionMatches !== true) {
      return { decision: DECISIONS.HOLD_UNKNOWN, reason: `target changed between attempts (provider v${observedState.providerVersion} vs bound v${observedState.boundVersion}); abort, do not force`, evidence: reconciliationEvidence };
    }
    return { decision: DECISIONS.SAFE_TO_RETRY, reason: 'target re-read clean: version bound, content differs; update is safe', evidence: reconciliationEvidence };
  },
};

// ---------------------------------------------------------------------------
// DELETE / UPDATE class modules in the adapter contract shape, so they can be
// driven through core.evaluatePredicate exactly like the ported adapters.
// Proposed semantics (harness-encoded); NOT part of the ported adapter set.

const deleteModule = {
  EFFECT_CLASS: '09-campaign-publication',
  deriveOpKey({ missionId, effectName, input }) {
    return _core.deriveOpKey({ missionId, effectName, input });
  },
  async probe(opKey, attemptWindow, deps) {
    const s = await deps.readTarget();
    if (!s) {
      return makeProbeResult({ opKey, attemptWindow, outcome: 'inconclusive',
        observation: 'target state unreadable; delete cannot be reconciled',
        evidence: { targetReadable: false } });
    }
    if (!s.exists) {
      return makeProbeResult({ opKey, attemptWindow, outcome: 'delivered',
        observation: 'target absent on provider; the delete is effective',
        evidence: { targetReadable: true, targetExists: false } });
    }
    return makeProbeResult({ opKey, attemptWindow, outcome: 'not-delivered',
      observation: 'target still present on provider',
      evidence: { targetReadable: true, targetExists: true, version: s.version } });
  },
  retryPredicate(probeResult, context) {
    const evidence = { ...(probeResult.evidence || {}), probeOutcome: probeResult.outcome };
    if (probeResult.outcome === 'delivered') {
      return { decision: DECISIONS.RECOVER_SUCCEEDED, evidence, holdReason: null };
    }
    if (probeResult.outcome === 'inconclusive') {
      return { decision: DECISIONS.HOLD_UNKNOWN, evidence,
        holdReason: 'target state unreadable; a delete retried blind could mask a real failure' };
    }
    return { decision: DECISIONS.SAFE_TO_RETRY,
      evidence: { ...evidence, idempotent: true },
      holdReason: null };
  },
  holdConditions: [
    'target state unreadable on the provider state query',
  ],
};

const crypto = require('crypto');
const fingerprint = (content) => crypto.createHash('sha256').update(String(content), 'utf8').digest('hex');

const updateModule = {
  EFFECT_CLASS: '09-campaign-publication',
  deriveOpKey({ missionId, effectName, input }) {
    return _core.deriveOpKey({ missionId, effectName, input });
  },
  async probe(opKey, attemptWindow, deps) {
    const s = await deps.readTarget();
    if (!s) {
      return makeProbeResult({ opKey, attemptWindow, outcome: 'inconclusive',
        observation: 'target state unreadable; update cannot be reconciled',
        evidence: { targetReadable: false } });
    }
    if (!s.exists) {
      return makeProbeResult({ opKey, attemptWindow, outcome: 'not-delivered',
        observation: 'target gone on provider; the update has nothing to bind to',
        evidence: { targetReadable: true, targetExists: false } });
    }
    const matches = fingerprint(s.content) === fingerprint(deps.intendedContent);
    return makeProbeResult({ opKey, attemptWindow, outcome: matches ? 'delivered' : 'not-delivered',
      observation: matches
        ? 'target already carries the intended content'
        : `target content differs (provider v${s.version}, bound v${deps.boundVersion})`,
      evidence: { targetReadable: true, targetExists: true, version: s.version,
                  boundVersion: deps.boundVersion, contentMatches: matches } });
  },
  retryPredicate(probeResult, context) {
    const evidence = { ...(probeResult.evidence || {}), probeOutcome: probeResult.outcome };
    if (probeResult.outcome === 'delivered') {
      return { decision: DECISIONS.RECOVER_SUCCEEDED, evidence, holdReason: null };
    }
    if (probeResult.outcome === 'inconclusive') {
      return { decision: DECISIONS.HOLD_UNKNOWN, evidence,
        holdReason: 'target state unreadable; cannot bind the update' };
    }
    if (evidence.targetExists === false) {
      return { decision: DECISIONS.HOLD_UNKNOWN, evidence,
        holdReason: 'target gone on provider; the update cannot bind to anything' };
    }
    if (evidence.version !== evidence.boundVersion) {
      return { decision: DECISIONS.HOLD_UNKNOWN, evidence,
        holdReason: `target changed between attempts (provider v${evidence.version} vs bound v${evidence.boundVersion}); abort, do not force the update` };
    }
    return { decision: DECISIONS.SAFE_TO_RETRY,
      evidence: { ...evidence, versionBound: true }, holdReason: null };
  },
  holdConditions: [
    'target state unreadable on the provider state query',
    'target gone on provider (nothing to bind the update to)',
    'target version drifted from the bound version between attempts',
  ],
};

// ---------------------------------------------------------------------------
// (a) Static scan: prove no global retry boolean exists in the path.

const SCAN_FILES = [
  path.join(ADAPTERS, 'adapter_core.js'),
  path.join(ADAPTERS, 'class_05c_threads.js'),
  path.join(ADAPTERS, 'class_05d_instagram.js'),
  path.join(ADAPTERS, 'class_09_campaign_publication.js'),
  '/home/nolan/ping/ping-runtime/orchestration/effect_reconciler.js',
];

const SUSPICIOUS = [
  /\b(?:globalRetry|retryAll|allowRetry|retryEnabled|shouldRetry|forceRetry|retryAnyway)\b/,
  /[^_.a-zA-Z]retry\s*=\s*true/,
  /[^_.a-zA-Z]retry\s*:\s*true/,
];

function scanForGlobalRetryBoolean(extraFiles) {
  const hits = [];
  for (const f of SCAN_FILES.concat(extraFiles || [])) {
    const src = fs.readFileSync(f, 'utf8');
    src.split('\n').forEach((line, i) => {
      const text = line.trim().slice(0, 160);
      // Skip the regex literals that DEFINE the suspicious patterns above:
      // a scan must not flag its own pattern source.
      if (text.startsWith('/') && text.includes('|')) return;
      for (const re of SUSPICIOUS) {
        if (re.test(line)) hits.push({ file: f, line: i + 1, text });
      }
    });
  }
  return hits;
}

module.exports = {
  retry_safe,
  PREDICATE_TABLE,
  deleteModule,
  updateModule,
  fingerprint,
  scanForGlobalRetryBoolean,
  SCAN_FILES,
  DECISIONS,
  class05c,
  class05d,
  class09,
};
