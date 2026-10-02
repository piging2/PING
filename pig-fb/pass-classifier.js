#!/usr/bin/env node
// pass-classifier.js -- universal empty-pass classifier for the automation
// resilience program (Nolan's directive: "Every automation should be able to
// explain why it did nothing").
//
// Exactly these terminal classes:
//   SUCCESS_ACTION, SUCCESS_EMPTY, ENUMERATION_FAILURE, ELIGIBILITY_EMPTY,
//   DEPENDENCY_FAILURE, AUTH_FAILURE, SURFACE_DRIFT, RATE_LIMIT,
//   TEMPORARY_FAILURE, TERMINAL_FAILURE.
//
// Zero-result suspicion: whenever candidatesFound == 0 and the historical
// baseline is > 0, the zero is NEVER classified as SUCCESS_EMPTY. Suspicion
// levels:
//   Level 0 -- normal zero: baseline is also zero (genuinely empty account).
//   Level 1 -- unexpected zero: baseline > 0, no alternate enumeration yet.
//   Level 2 -- alternate enumeration recommended: a healthy alternate
//              strategy exists and has not been tried this pass.
//   Level 3 -- browser/surface recovery recommended: surface-drift evidence
//              is present (fingerprint mismatch, missing selectors).
//   Level 4 -- quarantine the surface: repeated enumeration failures on the
//              same surface (consecutive failures at threshold).
//
// Every result includes a human-readable `explanation` stating why the pass
// did nothing (or what it did). Pure function: no I/O, no browser, no
// network. Safe to require from any worker script.
//
// Usage:
//   const { classifyPass } = require('./pass-classifier');
//   const r = classifyPass({ candidatesFound: 0, historicalBaseline: 139, ... });
//   // r = { class, explanation, suspicionLevel, recommendedAction, details }

'use strict';

const CLASSES = [
  'SUCCESS_ACTION',
  'SUCCESS_EMPTY',
  'ENUMERATION_FAILURE',
  'ELIGIBILITY_EMPTY',
  'DEPENDENCY_FAILURE',
  'AUTH_FAILURE',
  'SURFACE_DRIFT',
  'RATE_LIMIT',
  'TEMPORARY_FAILURE',
  'TERMINAL_FAILURE',
];

// Consecutive enumeration failures before a surface should be quarantined.
const QUARANTINE_THRESHOLD = 3;

/**
 * Compute zero-result suspicion.
 * Input: { candidatesFound, historicalBaseline, alternateStrategyAvailable,
 *          alternateStrategyTried, surfaceDriftEvidence,
 *          consecutiveEnumerationFailures }
 * Returns { level, handling } with handling one of:
 *   'normal' | 'investigate' | 'alternate-enumeration' |
 *   'surface-recovery' | 'quarantine-surface'
 */
function zeroSuspicion(input) {
  const i = input || {};
  const found = Number.isFinite(+i.candidatesFound) ? +i.candidatesFound : 0;
  const base = Number.isFinite(+i.historicalBaseline) ? +i.historicalBaseline : 0;
  if (found > 0) return { level: null, handling: null };
  if (base <= 0) {
    return {
      level: 0,
      handling: 'normal',
      note: 'Zero candidates with a zero historical baseline; a genuinely empty result is plausible.',
    };
  }
  const consecutive = +i.consecutiveEnumerationFailures || 0;
  if (consecutive >= QUARANTINE_THRESHOLD) {
    return {
      level: 4,
      handling: 'quarantine-surface',
      note: consecutive + ' consecutive enumeration failures on this surface; quarantine it for manual review and do not burn more automation budget here.',
    };
  }
  if (i.surfaceDriftEvidence) {
    return {
      level: 3,
      handling: 'surface-recovery',
      note: 'Surface-drift evidence present: ' + String(i.surfaceDriftEvidence).slice(0, 160) + '.',
    };
  }
  if (i.alternateStrategyAvailable && !i.alternateStrategyTried) {
    return {
      level: 2,
      handling: 'alternate-enumeration',
      note: 'A healthy alternate enumeration strategy exists and has not been tried this pass.',
    };
  }
  return {
    level: 1,
    handling: 'investigate',
    note: 'Unexpected zero: historical baseline is ' + base + ' but this pass enumerated 0 candidates. Do not treat as a successful empty run.',
  };
}

/**
 * Classify one automation pass. Returns
 *   { class, explanation, suspicionLevel, recommendedAction, details }
 * The explanation is always human-readable and answers "why did this pass
 * do nothing" whenever the pass did nothing.
 */
function classifyPass(input) {
  const i = input || {};
  const context = i.context ? String(i.context) : 'pass';
  const details = {};

  const explain = (clazz, text, suspicion, action) => ({
    class: clazz,
    explanation: text,
    suspicionLevel: suspicion === undefined ? null : suspicion,
    recommendedAction: action || 'none',
    details,
  });

  // 1. Auth: the logged-in session is gone. Nothing else can be trusted.
  if (i.loggedIn === false) {
    return explain(
      'AUTH_FAILURE',
      'Pass "' + context + '" did nothing because the browser session is logged out (loginState false). Human re-login is required in the always-on window; no automation can proceed.',
      null,
      'manual-login'
    );
  }

  // 2. Dependency: a prerequisite the pass cannot provide failed (CDP attach,
  // database, queue). The pass never started, so nothing is implied about
  // the world.
  if (i.cdpAvailable === false || i.dependencyOk === false) {
    const what = i.dependencyName || (i.cdpAvailable === false ? 'cdp' : 'unknown');
    details.dependency = what;
    return explain(
      'DEPENDENCY_FAILURE',
      'Pass "' + context + '" did nothing because the "' + what + '" dependency was unavailable (' +
        String(i.dependencyNote || 'connection failed').slice(0, 160) + '). The target surface was never reached; the outcome says nothing about candidates.',
      null,
      'retry-later'
    );
  }

  // 3. Rate limit: the platform pushed back; stopping is compliance.
  if (i.rateLimited) {
    return explain(
      'RATE_LIMIT',
      'Pass "' + context + '" stopped without completing because the platform signaled rate limiting' +
        (i.rateLimitEvidence ? ' ("' + String(i.rateLimitEvidence).slice(0, 120) + '")' : '') +
        '. Halting is correct; the remaining work resumes on the next scheduled pass.',
      null,
      'backoff-and-resume'
    );
  }

  // 4. Terminal: a non-retryable error (bad config, revoked capability,
  // explicit block). Quarantine the job definition, not the surface.
  if (i.terminalError) {
    return explain(
      'TERMINAL_FAILURE',
      'Pass "' + context + '" did nothing and must not retry automatically: ' +
        String(i.terminalError).slice(0, 200) + '. This is a permanent configuration or platform decision, not a transient blip.',
      null,
      'human-review'
    );
  }

  // 5. Surface drift: the UI changed under us (fingerprint mismatch, missing
  // selectors, unexpected layout). This is its own class so it is not
  // mistaken for an empty result.
  if (i.surfaceDrift) {
    return explain(
      'SURFACE_DRIFT',
      'Pass "' + context + '" did nothing because the target surface changed: ' +
        String(i.surfaceDriftEvidence || 'selectors/fingerprint mismatch').slice(0, 200) +
        '. Candidate counts from this surface are untrustworthy until a driver strategy is re-validated.',
      null,
      'revalidate-driver'
    );
  }

  // 6. Temporary: a transient error that may clear (navigation timeout,
  // evaluate exception, brief network stall).
  if (i.transientError) {
    return explain(
      'TEMPORARY_FAILURE',
      'Pass "' + context + '" did nothing because of a transient error that may clear on retry: ' +
        String(i.transientError).slice(0, 200) + '.',
      null,
      'retry-later'
    );
  }

  const candidatesFound = Number.isFinite(+i.candidatesFound) ? +i.candidatesFound : 0;
  const baseline = Number.isFinite(+i.historicalBaseline) ? +i.historicalBaseline : 0;

  // 7. Zero results go through suspicion first: a zero against a nonzero
  // baseline is NEVER a successful empty run.
  if (candidatesFound === 0) {
    const s = zeroSuspicion(i);
    details.suspicionNote = s.note || null;
    if (s.level === 0) {
      return explain(
        'SUCCESS_EMPTY',
        'Pass "' + context + '" found 0 candidates and the historical baseline is also 0, so this is a genuine empty result, not a failure. Nothing was eligible because nothing exists to enumerate.',
        0,
        'none'
      );
    }
    const action = s.handling === 'quarantine-surface' ? 'quarantine-surface'
      : s.handling === 'surface-recovery' ? 'surface-recovery'
      : s.handling === 'alternate-enumeration' ? 'alternate-enumeration'
      : 'investigate-zero';
    return explain(
      'ENUMERATION_FAILURE',
      'Pass "' + context + '" enumerated 0 candidates against a historical baseline of ' + baseline +
        ' (suspicion level ' + s.level + '). ' + (s.note || '') +
        ' This is an ENUMERATION_FAILURE, never a successful empty run.',
      s.level,
      action
    );
  }

  // 8. Candidates exist but none are eligible (already handled, excluded,
  // filtered out). The enumeration worked; the eligibility rules bit.
  if (Number.isFinite(+i.eligibleCount) && +i.eligibleCount === 0 && !(+i.actionsPerformed > 0)) {
    return explain(
      'ELIGIBILITY_EMPTY',
      'Pass "' + context + '" enumerated ' + candidatesFound + ' candidate(s) but 0 were eligible to act on' +
        (i.eligibilityNote ? ' (' + String(i.eligibilityNote).slice(0, 160) + ')' : '') +
        '. Enumeration is healthy; the work queue is genuinely drained or the filters excluded everything.',
      null,
      'none'
    );
  }

  // 9. Actions were performed.
  if (+i.actionsPerformed > 0) {
    return explain(
      'SUCCESS_ACTION',
      'Pass "' + context + '" performed ' + i.actionsPerformed + ' action(s) out of ' + candidatesFound +
        ' enumerated candidate(s).' +
        (i.stopped ? ' It stopped early: ' + String(i.stopped).slice(0, 140) + '.' : ' It completed its queue.'),
      null,
      'none'
    );
  }

  // 10. Default: something was enumerated and eligible but no action ran.
  return explain(
    'SUCCESS_EMPTY',
    'Pass "' + context + '" enumerated ' + candidatesFound + ' candidate(s) but took no action and no failure was recorded. Treat as a conservative no-op; the next pass should re-enumerate and confirm.',
    null,
    'none'
  );
}

module.exports = {
  CLASSES,
  QUARANTINE_THRESHOLD,
  classifyPass,
  zeroSuspicion,
};
