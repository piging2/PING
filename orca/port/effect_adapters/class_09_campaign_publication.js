/**
 * class_09_campaign_publication.js — ORCA adapter for Effect Class 09:
 * Campaign Publication (engagement passes: likes/comments; Page publishing).
 *
 * CRITICAL NUANCE (spec Q6): likes TOGGLE, they do not add. A blind retry
 * of an unconfirmed like can UNLIKE, inverting the effect. Retry here is
 * worse than redundant. This module NEVER authorizes a like retry without
 * a fresh probe proving the like absent.
 *
 * Identity: engage:v1:<platform>:<action>:<account> + (post URL/id,
 * pass_id, intent_id) bound via canonical(input). The FB job-file page
 * descriptor is part of the identity because the guard's within-pass dedup
 * keys on it.
 *
 * Retry is SAFE only when ALL of:
 *   (a) the probe proves the effect absent (re-visit: like button NOT in
 *       liked state / comment not present), AND
 *   (b) engagement-guard.py check returns ELIGIBLE (mechanical
 *       never-re-engage over the durable markdown history), AND
 *   (c) the in-flight intent for that action is resolved (not
 *       UNKNOWN_EXECUTION; open unknown intents must be reconciled first).
 *
 * HOLD when: open UNKNOWN_EXECUTION intents; the guard returns
 * UNKNOWN-UNCHECKABLE (exit 3 = history unreadable, fail closed); any
 * platform warning (checkpoint, action block, rate limit -> minimum
 * volume with a 14-day hold per AGENTS.md). Page publishing is PAUSED
 * under a silent restriction: adapters must NEVER unpause it, so a
 * page-publish action always resolves to HOLD_UNKNOWN.
 *
 * This module consumes engagement-guard.py. It does NOT modify it.
 */
'use strict';

const { execFile } = require('child_process');
const path = require('path');

const core = require('./adapter_core.js')();
const DECISIONS = core.DECISIONS;

const EFFECT_CLASS = '09-campaign-publication';
const PLATFORMS = ['facebook', 'instagram', 'threads', 'x', 'tiktok'];
const ACTIONS = ['like', 'comment', 'page-publish'];

const ENGAGEMENT_GUARD = path.join(
  process.env.HOME || '/home/hatch',
  'workspace/outreach/engagement-guard.py'
);

const GUARD_DECISIONS = ['ELIGIBLE', 'ALREADY_ENGAGED', 'BLOCKED', 'UNKNOWN-UNCHECKABLE'];

function validateInput(input) {
  if (!input || typeof input !== 'object') throw new Error('class09: input object required');
  if (!PLATFORMS.includes(input.platform)) throw new Error(`class09: platform must be one of ${PLATFORMS.join(',')}`);
  if (!ACTIONS.includes(input.action)) throw new Error(`class09: action must be one of ${ACTIONS.join(',')}`);
  if (!input.account || typeof input.account !== 'string') throw new Error('class09: account/handle required');
  if (!input.postRef || typeof input.postRef !== 'string') throw new Error('class09: postRef (post URL or id) required');
  if (!input.passId || typeof input.passId !== 'string') throw new Error('class09: passId required');
  if (!input.intentId || typeof input.intentId !== 'string') throw new Error('class09: intentId required');
}

/**
 * deriveOpKey(input) -> hex.
 * input: { missionId?, platform, action, account, postRef, passId,
 *          intentId, pageDescriptor?, commentText? }
 * effectName carries (platform, action, account); canonical(input) binds
 * the post ref, pass, intent, and page descriptor so a re-queued pass is
 * a distinct logical op and the guard's page-string dedup is preserved.
 */
function deriveOpKey(input) {
  validateInput(input);
  const effectName = `engage:v1:${input.platform}:${input.action}:${input.account}`;
  const missionId = input.missionId || `class09:${input.platform}`;
  const snapshot = {
    platform: input.platform,
    action: input.action,
    account: input.account,
    postRef: input.postRef,
    passId: input.passId,
    intentId: input.intentId,
    pageDescriptor: input.pageDescriptor || null,
  };
  return core.deriveOpKey({ missionId, effectName, input: snapshot });
}

function effectNameOf(input) {
  validateInput(input);
  return `engage:v1:${input.platform}:${input.action}:${input.account}`;
}

/**
 * FB job-file page-name rule (AGENTS.md 2026-09-18): the guard's
 * within-pass dedup keys on the "page" string, so every action's page
 * field must be UNIQUE per post within a job. Returns { ok, duplicates }.
 * A duplicate page descriptor is a job-construction defect: HOLD the
 * affected actions until the job is rebuilt with unique descriptors.
 */
function validateUniquePageDescriptors(actions) {
  const seen = new Map();
  const duplicates = [];
  for (const a of actions || []) {
    const page = a && a.page;
    if (typeof page !== 'string' || page.length === 0) {
      duplicates.push({ action: a, reason: 'missing page descriptor' });
      continue;
    }
    if (seen.has(page)) duplicates.push({ action: a, reason: `duplicate page descriptor '${page}'` });
    else seen.set(page, a);
  }
  return { ok: duplicates.length === 0, duplicates };
}

function defaultExec(argv, opts) {
  return new Promise((resolve, reject) => {
    execFile(argv[0], argv.slice(1), { timeout: (opts && opts.timeoutMs) || 30000, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(`exec failed: ${argv[0]}: ${err.message}`));
      resolve({ stdout: String(stdout), stderr: String(stderr) });
    });
  });
}

const defaultDeps = {
  exec: defaultExec,
  // Probe readers are platform-specific and injected by the caller
  // (Pig CDP re-visit for FB, platform CLIs elsewhere). No default reader
  // exists: a missing reader yields an inconclusive probe, never a retry.
  probeLikeState: null, // async ({platform, account, postRef}) -> { liked: true|false|null }
  probeCommentPresent: null, // async ({platform, account, postRef, commentText}) -> { present: true|false|null }
  action: null, // 'like' | 'comment'
  commentText: null,
};

/**
 * probe(opKey, attemptWindow, deps) -> probe result.
 * Re-probes the post FIRST: liked state for likes, comment presence for
 * comments. null from a reader = the state could not be determined =
 * inconclusive (port law: no reading -> no decision).
 */
async function probe(opKey, attemptWindow, deps) {
  const d = { ...defaultDeps, ...(deps || {}) };
  const action = d.action;
  if (!['like', 'comment'].includes(action)) {
    return core.makeProbeResult({
      opKey, attemptWindow, outcome: 'inconclusive',
      observation: `probe needs action 'like' or 'comment', got '${action}'`,
      evidence: {},
    });
  }
  try {
    if (action === 'like') {
      if (typeof d.probeLikeState !== 'function') {
        return core.makeProbeResult({
          opKey, attemptWindow, outcome: 'inconclusive',
          observation: 'no like-state reader configured; cannot re-probe the post',
          evidence: {},
        });
      }
      const st = await d.probeLikeState({ platform: d.platform, account: d.account, postRef: d.postRef });
      if (!st || st.liked === null || st.liked === undefined) {
        return core.makeProbeResult({
          opKey, attemptWindow, outcome: 'inconclusive',
          observation: 'like state unreadable on re-visit; toggling semantics make any blind retry an inversion risk',
          evidence: { likeStateReadable: false },
        });
      }
      if (st.liked) {
        return core.makeProbeResult({
          opKey, attemptWindow, outcome: 'delivered',
          observation: 're-visit shows the post in liked state; the effect is present (a retry would UNLIKE it)',
          evidence: { liked: true },
        });
      }
      return core.makeProbeResult({
        opKey, attemptWindow, outcome: 'not-delivered',
        observation: 're-visit shows the like button NOT in liked state; the effect is absent',
        evidence: { liked: false },
      });
    }
    // comment
    if (typeof d.probeCommentPresent !== 'function') {
      return core.makeProbeResult({
        opKey, attemptWindow, outcome: 'inconclusive',
        observation: 'no comment reader configured; cannot re-probe the post',
        evidence: {},
      });
    }
    const st = await d.probeCommentPresent({ platform: d.platform, account: d.account, postRef: d.postRef, commentText: d.commentText });
    if (!st || st.present === null || st.present === undefined) {
      return core.makeProbeResult({
        opKey, attemptWindow, outcome: 'inconclusive',
        observation: 'comment presence unreadable on re-query',
        evidence: { commentReadable: false },
      });
    }
    return core.makeProbeResult({
      opKey, attemptWindow,
      outcome: st.present ? 'delivered' : 'not-delivered',
      observation: st.present
        ? 're-query shows the comment present on the post'
        : 're-query shows the comment absent from the post',
      evidence: { commentPresent: st.present },
    });
  } catch (err) {
    return core.makeProbeResult({
      opKey, attemptWindow, outcome: 'inconclusive',
      observation: `re-probe failed: ${err.message}`,
      evidence: { probeError: err.message },
    });
  }
}

/**
 * Run the mechanical never-re-engage guard. Consumes (never modifies)
 * ~/workspace/outreach/engagement-guard.py.
 * Returns { exitCode, decision } where decision is one of
 * ELIGIBLE / ALREADY_ENGAGED / BLOCKED / UNKNOWN-UNCHECKABLE, or null
 * when the guard could not run (exit 3 = fail closed).
 */
function runGuardCheck({ platform, account, url }) {
  const argv = ['python3', ENGAGEMENT_GUARD, 'check', '--platform', platform, '--account', account];
  if (url) argv.push('--url', url);
  return new Promise((resolve) => {
    execFile(argv[0], argv.slice(1), { timeout: 30000 }, (err, stdout) => {
      const exitCode = err && typeof err.code === 'number' ? err.code : err ? 3 : 0;
      let decision = null;
      try {
        const parsed = JSON.parse(String(stdout || ''));
        if (parsed && GUARD_DECISIONS.includes(parsed.decision)) decision = parsed.decision;
      } catch (_e) { /* unparseable -> null */ }
      resolve({ exitCode, decision });
    });
  });
}

/**
 * retryPredicate(probeResult, context) -> { decision, evidence, holdReason }.
 * context: {
 *   action: 'like'|'comment'|'page-publish',
 *   guardDecision: 'ELIGIBLE'|..., guardExitCode: number,
 *   intentState: 'resolved'|'UNKNOWN_EXECUTION',
 *   platformWarning: null | { type: 'checkpoint'|'action_block'|'rate_limit', detail? }
 * }
 *
 * Truth table:
 *   action == 'page-publish'                        -> HOLD_UNKNOWN (always;
 *     Page publishing is PAUSED; adapters never unpause it)
 *   probe inconclusive                               -> HOLD_UNKNOWN
 *   probe delivered                                    -> RECOVER_SUCCEEDED
 *   probe not-delivered + intentState UNKNOWN_EXECUTION -> HOLD_UNKNOWN
 *   probe not-delivered + guard != ELIGIBLE           -> HOLD_UNKNOWN
 *     (ALREADY_ENGAGED + probe-absent is a discrepancy: HOLD for
 *     reconciliation; BLOCKED is ambiguous identity: HOLD; UNKNOWN-UNCHECKABLE
 *     / exit 3 is fail closed: HOLD)
 *   probe not-delivered + platformWarning            -> HOLD_UNKNOWN
 *     (minimum volume, 14-day hold per AGENTS.md)
 *   probe not-delivered + all gates green             -> SAFE_TO_RETRY
 */
function retryPredicate(probeResult, context) {
  const ctx = context || {};
  const evidence = { ...(probeResult.evidence || {}), probeOutcome: probeResult.outcome };

  if (ctx.action === 'page-publish') {
    return {
      decision: DECISIONS.HOLD_UNKNOWN,
      evidence,
      holdReason: 'Page publishing is PAUSED under a silent restriction; adapters must NEVER unpause it. Surface to a human.',
    };
  }
  if (probeResult.outcome === 'inconclusive') {
    return {
      decision: DECISIONS.HOLD_UNKNOWN,
      evidence,
      holdReason: `re-probe inconclusive: ${probeResult.observation || 'no observation'}. For likes, a blind retry can UNLIKE and invert the effect.`,
    };
  }
  if (probeResult.outcome === 'delivered') {
    return { decision: DECISIONS.RECOVER_SUCCEEDED, evidence, holdReason: null };
  }

  // outcome === 'not-delivered': the effect is absent. Gates, in order.
  if (ctx.intentState === 'UNKNOWN_EXECUTION') {
    return {
      decision: DECISIONS.HOLD_UNKNOWN,
      evidence: { ...evidence, intentState: ctx.intentState },
      holdReason: 'an open UNKNOWN_EXECUTION intent exists for this action; reconcile the intent before any retry',
    };
  }
  const gd = ctx.guardDecision;
  if (gd !== 'ELIGIBLE') {
    const reasonByGuard = {
      'ALREADY_ENGAGED': 'guard says ALREADY_ENGAGED but the probe shows the effect absent: discrepancy, reconcile before retrying',
      'BLOCKED': 'guard says BLOCKED (ambiguous identity or explicit block)',
      'UNKNOWN-UNCHECKABLE': 'guard could not consult history (exit 3): fail closed',
    };
    return {
      decision: DECISIONS.HOLD_UNKNOWN,
      evidence: { ...evidence, guardDecision: gd || null, guardExitCode: ctx.guardExitCode },
      holdReason: reasonByGuard[gd] || `guard did not return ELIGIBLE (got '${gd}'); fail closed`,
    };
  }
  if (ctx.platformWarning) {
    return {
      decision: DECISIONS.HOLD_UNKNOWN,
      evidence: { ...evidence, platformWarning: ctx.platformWarning },
      holdReason: `platform warning (${ctx.platformWarning.type || 'unknown'}): drop to minimum volume with a 14-day hold per AGENTS.md; no retry until cleared`,
    };
  }
  return { decision: DECISIONS.SAFE_TO_RETRY, evidence, holdReason: null };
}

const holdConditions = [
  'action is page-publish (Page publishing is PAUSED; adapters never unpause it)',
  're-probe inconclusive (like state or comment presence unreadable; blind like retry can UNLIKE and invert the effect)',
  'an open UNKNOWN_EXECUTION intent exists for the action',
  'engagement-guard.py does not return ELIGIBLE (ALREADY_ENGAGED discrepancy, BLOCKED, or UNKNOWN-UNCHECKABLE / exit 3 fail-closed)',
  'any platform warning: checkpoint, action block, or rate limit (minimum volume, 14-day hold)',
  'duplicate or missing page descriptors in an FB job file (guard within-pass dedup keys on the page string; rebuild the job)',
];

module.exports = {
  EFFECT_CLASS,
  PLATFORMS,
  ACTIONS,
  deriveOpKey,
  effectNameOf,
  validateUniquePageDescriptors,
  probe,
  runGuardCheck,
  retryPredicate,
  holdConditions,
  defaultDeps,
};
