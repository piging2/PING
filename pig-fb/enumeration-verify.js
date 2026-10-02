#!/usr/bin/env node
// enumeration-verify.js -- DISCOVER -> ENUMERATE -> VERIFY ENUMERATION ->
// PLAN -> EXECUTE -> VERIFY EFFECT -> RECONCILE pipeline for the automation
// resilience program (Nolan's directive).
//
// This module implements the stage machinery as dependency-injected helpers
// so workers can adopt it surgically without a full rewrite, and so it can
// be unit-tested headless with stub stage functions (no browser required).
//
// Health signals emitted by every pass (reconcile stage):
//   expectedPopulation            historical baseline for the surface
//   discoveredPopulation          what ENUMERATE actually found
//   discoveryDeltaVsPrevious      discovered minus last known count
//   enumerationConfidence         0..1 confidence the enumeration is complete
//   surfaceFingerprint            { url, title, landmarkHash, driftVsPrevious }
//   selectorDrift                 { missingSelectors: [], addedUnexpected: [] }
//   actionableCandidateCount      candidates surviving PLAN
//   executionCount                actions attempted in EXECUTE
//   postActionVerificationCount   verified effects in VERIFY EFFECT
//
// Usage:
//   const { verifyEnumeration, fingerprintSurface, runEnumerationPipeline } =
//     require('./enumeration-verify');

'use strict';

const crypto = require('crypto');

/** Short stable hash for surface fingerprints. */
function shortHash(s) {
  return crypto.createHash('sha256').update(String(s || ''), 'utf8').digest('hex').slice(0, 16);
}

/**
 * fingerprintSurface({ url, title, landmarks })
 * landmarks: array of short strings describing stable on-page landmarks
 * (headings, section labels). Returns { url, title, landmarkHash, fingerprint }.
 */
function fingerprintSurface(info) {
  const inf = info || {};
  const landmarks = Array.isArray(inf.landmarks) ? inf.landmarks.slice().sort() : [];
  const landmarkHash = shortHash(landmarks.join('|'));
  const fingerprint = shortHash((inf.url || '') + '#' + (inf.title || '') + '#' + landmarkHash);
  return {
    url: inf.url || null,
    title: inf.title ? String(inf.title).slice(0, 120) : null,
    landmarkHash,
    fingerprint,
  };
}

/**
 * verifyEnumeration({ discoveredPopulation, expectedPopulation,
 *                     previousCount, surfaceFingerprint,
 *                     previousFingerprint, enumerationError,
 *                     enumerationNote })
 * Returns { signals, verdict } where verdict is one of:
 *   'ok' | 'suspicious-zero' | 'partial' | 'error' | 'drift'
 * and signals are the reconcile-stage health signals for enumeration.
 */
function verifyEnumeration(opts) {
  const o = opts || {};
  const discovered = Number.isFinite(+o.discoveredPopulation) ? +o.discoveredPopulation : 0;
  const expected = Number.isFinite(+o.expectedPopulation) ? +o.expectedPopulation : 0;
  const previous = Number.isFinite(+o.previousCount) ? +o.previousCount : null;
  const fp = o.surfaceFingerprint || null;

  const driftVsPrevious = !!(fp && o.previousFingerprint && fp.fingerprint !== o.previousFingerprint);

  // Confidence: fraction of the expected population discovered, capped at 1.
  // A nonzero discovery against a zero baseline, or vice versa, scores low.
  let confidence;
  if (expected > 0 && discovered > 0) {
    confidence = Math.min(1, discovered / expected);
  } else if (expected > 0 && discovered === 0) {
    confidence = 0;
  } else if (expected === 0 && discovered === 0) {
    confidence = 0.5; // empty is plausible but uninformative
  } else {
    confidence = 0.7; // more than expected: possibly scope change
  }
  if (o.enumerationError) confidence = Math.min(confidence, 0.2);
  if (driftVsPrevious) confidence = Math.min(confidence, 0.3);

  const signals = {
    expectedPopulation: expected,
    discoveredPopulation: discovered,
    discoveryDeltaVsPrevious: previous === null ? null : discovered - previous,
    enumerationConfidence: Math.round(confidence * 100) / 100,
    surfaceFingerprint: fp,
    selectorDrift: {
      driftDetected: driftVsPrevious,
      missingSelectors: Array.isArray(o.missingSelectors) ? o.missingSelectors : [],
      unexpectedElements: Array.isArray(o.unexpectedElements) ? o.unexpectedElements : [],
    },
    actionableCandidateCount: null, // filled in by PLAN stage
    executionCount: null, // filled in by EXECUTE stage
    postActionVerificationCount: null, // filled in by VERIFY EFFECT stage
  };

  let verdict;
  if (o.enumerationError) verdict = 'error';
  else if (driftVsPrevious) verdict = 'drift';
  else if (discovered === 0 && expected > 0) verdict = 'suspicious-zero';
  else if (expected > 0 && discovered < Math.ceil(expected * 0.5)) verdict = 'partial';
  else verdict = 'ok';

  return { signals, verdict };
}

/**
 * runEnumerationPipeline(stages)
 * Generic runner for the full stage chain. Every stage is an async function
 * receiving (state) and mutating state.results. Any stage may be omitted
 * (null/undefined) except enumerate. The pipeline never throws for
 * stage-level failures: they are recorded and the pipeline continues to
 * RECONCILE, because the reconcile output must exist even on failure.
 *
 * stages = {
 *   context: { capability, strategy, expectedPopulation, previousCount,
 *              previousFingerprint },
 *   discover:  async (state) => surfaceInfo | null,
 *   enumerate: async (state, surface) => { entries, error, note },
 *   plan:      async (state, entries) => actionable,
 *   execute:   async (state, actionable) => { executed, results },
 *   verify:    async (state, executedResults) => verifiedCount,
 *   onEvent:   (stage, msg) => void   // optional progress logging
 * }
 *
 * Returns { signals, verdict, actionableCount, executedCount,
 *           verifiedCount, stageErrors, classificationInput }.
 */
async function runEnumerationPipeline(stages) {
  const s = stages || {};
  const ctx = s.context || {};
  const state = { context: ctx, surface: null, entries: [], actionable: [] };
  const stageErrors = {};
  const emit = typeof s.onEvent === 'function' ? s.onEvent : () => {};

  // DISCOVER
  if (typeof s.discover === 'function') {
    try {
      state.surface = await s.discover(state);
      emit('discover', 'surface=' + JSON.stringify(state.surface && state.surface.url));
    } catch (e) {
      stageErrors.discover = String(e && e.message || e).slice(0, 200);
      emit('discover', 'error: ' + stageErrors.discover);
    }
  }
  const fp = fingerprintSurface(state.surface || {});

  // ENUMERATE
  let enumError = null, enumNote = null;
  try {
    const r = await s.enumerate(state, state.surface);
    state.entries = (r && r.entries) || [];
    enumError = (r && r.error) || null;
    enumNote = (r && r.note) || null;
    emit('enumerate', 'entries=' + state.entries.length + (enumError ? ' error=' + enumError : ''));
  } catch (e) {
    enumError = String(e && e.message || e).slice(0, 200);
    emit('enumerate', 'exception: ' + enumError);
  }

  // VERIFY ENUMERATION
  const ver = verifyEnumeration({
    discoveredPopulation: state.entries.length,
    expectedPopulation: ctx.expectedPopulation,
    previousCount: ctx.previousCount,
    surfaceFingerprint: fp,
    previousFingerprint: ctx.previousFingerprint,
    enumerationError: enumError,
    missingSelectors: ctx.missingSelectors,
  });
  const signals = ver.signals;
  emit('verify-enumeration', 'verdict=' + ver.verdict + ' confidence=' + signals.enumerationConfidence);

  // PLAN
  let actionable = state.entries;
  if (typeof s.plan === 'function') {
    try {
      actionable = (await s.plan(state, state.entries)) || [];
      emit('plan', 'actionable=' + actionable.length);
    } catch (e) {
      stageErrors.plan = String(e && e.message || e).slice(0, 200);
      emit('plan', 'error: ' + stageErrors.plan);
    }
  }
  state.actionable = actionable;
  signals.actionableCandidateCount = actionable.length;

  // EXECUTE
  let executedCount = 0;
  let execResults = [];
  if (typeof s.execute === 'function') {
    try {
      const r = await s.execute(state, actionable);
      executedCount = (r && r.executed) || 0;
      execResults = (r && r.results) || [];
      emit('execute', 'executed=' + executedCount);
    } catch (e) {
      stageErrors.execute = String(e && e.message || e).slice(0, 200);
      emit('execute', 'error: ' + stageErrors.execute);
    }
  }
  signals.executionCount = executedCount;

  // VERIFY EFFECT
  let verifiedCount = null;
  if (typeof s.verify === 'function') {
    try {
      verifiedCount = await s.verify(state, execResults);
      emit('verify-effect', 'verified=' + verifiedCount);
    } catch (e) {
      stageErrors.verify = String(e && e.message || e).slice(0, 200);
      emit('verify-effect', 'error: ' + stageErrors.verify);
    }
  }
  signals.postActionVerificationCount = verifiedCount;

  // RECONCILE: produce the terminal classification input.
  const classificationInput = {
    context: ctx.capability || 'pass',
    candidatesFound: state.entries.length,
    historicalBaseline: ctx.expectedPopulation,
    eligibleCount: actionable.length,
    actionsPerformed: executedCount,
    enumerationError: enumError,
    surfaceDrift: ver.verdict === 'drift',
    surfaceDriftEvidence: ver.verdict === 'drift' ? 'fingerprint changed: ' + (ctx.previousFingerprint || '?') + ' -> ' + fp.fingerprint : null,
    transientError: enumError && /timeout|net|reset|evaluate/i.test(enumError) ? enumError : null,
  };

  return {
    signals,
    verdict: ver.verdict,
    stageErrors,
    enumerationNote: enumNote,
    classificationInput,
  };
}

module.exports = {
  shortHash,
  fingerprintSurface,
  verifyEnumeration,
  runEnumerationPipeline,
};
