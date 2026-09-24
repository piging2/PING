/**
 * class_05c_threads.js — ORCA adapter for Effect Class 05c:
 * Threads publish-post.
 *
 * The existing skill rule is encoded VERBATIM (threads SKILL.md, Post write
 * safety): "Never use transport retries. A child or parent failure is
 * terminal and ambiguous. Do not continue a failed carousel. Any later
 * attempt is a new invocation with a new explicit approval."
 *
 * Identity: sha256 over (approved text + media manifest + account +
 * approval window). Provider idempotency key: NONE. Reversal: NONE (no
 * delete endpoint; a duplicate is public and permanent).
 *
 * Probe: read own recent posts / top-posts within the attempt window
 * (threads-cli top-posts --account-id ... --start-date ... --end-date ...),
 * exact byte match of the approved text (post text is byte-preserved per
 * skill rule 4). Match -> RECOVER_SUCCEEDED. Healthy provider + no match
 * -> SAFE_TO_RETRY with the SAME frozen approved snapshot.
 *
 * Retry predicate encodes: never retry on a provider error before the
 * probe has run; a retry is only ever a NEW INVOCATION with NEW EXPLICIT
 * APPROVAL (context.newApproval === true) and an unchanged frozen
 * snapshot. HOLD whenever the probe is inconclusive (list fetch failed,
 * pagination ambiguous, provider degradation).
 */
'use strict';

const { execFile } = require('child_process');
const crypto = require('crypto');

const core = require('./adapter_core.js')();
const DECISIONS = core.DECISIONS;

const EFFECT_CLASS = '05c-threads-publish-post';

// Verbatim skill rule, kept as a constant so the source of authority is
// visible next to every enforcement site.
const ZERO_TRANSPORT_RETRIES_RULE =
  'Never use transport retries. A child or parent failure is terminal and ' +
  'ambiguous. Do not continue a failed carousel. Any later attempt is a new ' +
  'invocation with a new explicit approval.';

function validateInput(input) {
  if (!input || typeof input !== 'object') throw new Error('class05c: input object required');
  if (!input.account || typeof input.account !== 'string') throw new Error('class05c: account required');
  if (typeof input.text !== 'string' || input.text.length === 0) throw new Error('class05c: approved text required');
  if (!Array.isArray(input.mediaManifest)) throw new Error('class05c: mediaManifest array required (may be empty)');
  if (!input.approvalWindow || typeof input.approvalWindow !== 'string') {
    throw new Error('class05c: approvalWindow (the explicit approval this invocation was issued under) required');
  }
}

/**
 * deriveOpKey(input) -> hex.
 * input: { missionId?, account, text, mediaManifest: [media item hashes],
 *          approvalWindow }
 * The op key binds the APPROVED text byte-for-byte plus the media manifest
 * plus the account plus the approval window, so the same text under a
 * different approval window is a different invocation (per the rule above).
 */
function deriveOpKey(input) {
  validateInput(input);
  const effectName = `threads:v1:publish-post:${input.account}`;
  const missionId = input.missionId || `class05c:${input.account}`;
  const snapshot = {
    account: input.account,
    text: input.text,
    mediaManifest: input.mediaManifest.slice(),
    approvalWindow: input.approvalWindow,
  };
  return core.deriveOpKey({ missionId, effectName, input: snapshot });
}

function effectNameOf(input) {
  validateInput(input);
  return `threads:v1:publish-post:${input.account}`;
}

/** Frozen snapshot fingerprint: sha256 of the approved text + media manifest. */
function snapshotHash({ text, mediaManifest }) {
  return crypto.createHash('sha256').update(`text:${text}\nmedia:${JSON.stringify(mediaManifest)}`, 'utf8').digest('hex');
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
  // approvedSnapshot: { text, mediaManifest } — the frozen approved content
  // the probe must byte-match against. Supplied by the caller.
  approvedSnapshot: null,
};

/**
 * probe(opKey, attemptWindow, deps) -> probe result.
 * deps: { exec, approvedSnapshot: { text, mediaManifest }, account }
 * Lists own posts in the attempt window and byte-matches the approved
 * text. Media manifest comparison is best-effort (the CLI list output may
 * not carry media hashes); a text match with unavailable media metadata
 * is still treated as delivered, with the caveat recorded in evidence.
 */
async function probe(opKey, attemptWindow, deps) {
  const d = { ...defaultDeps, ...(deps || {}) };
  const snap = d.approvedSnapshot;
  if (!snap || typeof snap.text !== 'string') {
    return core.makeProbeResult({
      opKey, attemptWindow, outcome: 'inconclusive',
      observation: 'no frozen approved snapshot supplied to the probe; byte-match impossible',
      evidence: {},
    });
  }
  const window = attemptWindow || {};
  const argv = ['threads-cli', 'top-posts', '--account-id', d.account || ''];
  if (window.after) argv.push('--start-date', window.after);
  if (window.before) argv.push('--end-date', window.before);
  argv.push('--count', '25');
  try {
    const { stdout } = await d.exec(argv, { timeoutMs: 30000 });
    const parsed = JSON.parse(stdout);
    const posts = (parsed && (parsed.posts || parsed.results || parsed.data || [])) || [];
    if (!Array.isArray(posts)) {
      return core.makeProbeResult({
        opKey, attemptWindow, outcome: 'inconclusive',
        observation: 'top-posts returned an unparseable shape; pagination/list ambiguous',
        evidence: { probeError: 'unparseable list shape' },
      });
    }
    const match = posts.find((p) => typeof p.text === 'string' && p.text === snap.text);
    if (match) {
      const postId = match.post_id || match.id || match.postId || null;
      const ev = { matchedText: true, postListCount: posts.length };
      if (postId && core.assertProbeEvidence({ evidence: { postId } })) ev.postId = postId;
      return core.makeProbeResult({
        opKey, attemptWindow, outcome: 'delivered',
        observation: `own post list in the attempt window contains an exact byte match of the approved text (${posts.length} posts scanned)`,
        evidence: ev,
      });
    }
    return core.makeProbeResult({
      opKey, attemptWindow, outcome: 'not-delivered',
      observation: `provider list healthy; ${posts.length} own posts scanned in the attempt window; no byte match of the approved text`,
      evidence: { postListCount: posts.length, listHealthy: true },
    });
  } catch (err) {
    return core.makeProbeResult({
      opKey, attemptWindow, outcome: 'inconclusive',
      observation: `own-post list fetch failed or provider degraded: ${err.message}; probe is inconclusive, never retry before a successful probe`,
      evidence: { probeError: err.message },
    });
  }
}

/**
 * retryPredicate(probeResult, context) -> { decision, evidence, holdReason }.
 * context: {
 *   newApproval: boolean (explicit approval for THIS new invocation),
 *   newApprovalWindow: string (must differ from the failed invocation),
 *   frozenSnapshotMatches: boolean (retry carries the same frozen snapshot),
 *   providerErrorBeforeProbe: boolean
 * }
 *
 * Truth table:
 *   probe delivered                                       -> RECOVER_SUCCEEDED
 *   probe inconclusive                                    -> HOLD_UNKNOWN
 *   probe not-delivered + providerErrorBeforeProbe        -> HOLD_UNKNOWN
 *   probe not-delivered + !newApproval                   -> HOLD_UNKNOWN
 *     (the verbatim rule: any later attempt is a NEW invocation with a NEW
 *     explicit approval; an unapproved retry is a transport retry)
 *   probe not-delivered + !frozenSnapshotMatches         -> HOLD_UNKNOWN
 *     (changed text is a different logical op, not a retry of this one)
 *   probe not-delivered + new approval + same snapshot   -> SAFE_TO_RETRY
 */
function retryPredicate(probeResult, context) {
  const ctx = context || {};
  const evidence = { ...(probeResult.evidence || {}), probeOutcome: probeResult.outcome };

  if (probeResult.outcome === 'delivered') {
    return { decision: DECISIONS.RECOVER_SUCCEEDED, evidence, holdReason: null };
  }
  if (probeResult.outcome === 'inconclusive') {
    return {
      decision: DECISIONS.HOLD_UNKNOWN,
      evidence,
      holdReason: `probe inconclusive (list fetch failed, pagination ambiguous, or provider degradation): ${probeResult.observation || ''}. No compensating delete exists; HOLD is the only safe state short of proof.`,
    };
  }
  // not-delivered: healthy provider, no match. The zero-transport-retries rule.
  if (ctx.providerErrorBeforeProbe) {
    return {
      decision: DECISIONS.HOLD_UNKNOWN,
      evidence,
      holdReason: 'a provider error occurred before the probe completed; never retry on a provider error before the probe',
    };
  }
  if (!ctx.newApproval) {
    return {
      decision: DECISIONS.HOLD_UNKNOWN,
      evidence,
      holdReason: `no new explicit approval for a new invocation. Rule: "${ZERO_TRANSPORT_RETRIES_RULE}"`,
    };
  }
  if (!ctx.frozenSnapshotMatches) {
    return {
      decision: DECISIONS.HOLD_UNKNOWN,
      evidence,
      holdReason: 'the retry snapshot does not match the frozen approved snapshot; changed text is a different logical op, not a retry of this one',
    };
  }
  return {
    decision: DECISIONS.SAFE_TO_RETRY,
    evidence: { ...evidence, newInvocation: true, snapshotFrozen: true },
    holdReason: null,
  };
}

const holdConditions = [
  'probe inconclusive: own-post list fetch failed, pagination ambiguous, or provider degradation (no delete exists, so HOLD is the only safe state short of proof)',
  'a provider error occurred before the probe completed (never retry on a provider error before the probe)',
  'no new explicit approval for a new invocation (verbatim rule: any later attempt is a new invocation with a new explicit approval)',
  'the retry snapshot drifted from the frozen approved snapshot',
  'approved snapshot not supplied to the probe (byte-match impossible)',
];

module.exports = {
  EFFECT_CLASS,
  ZERO_TRANSPORT_RETRIES_RULE,
  deriveOpKey,
  effectNameOf,
  snapshotHash,
  probe,
  retryPredicate,
  holdConditions,
  defaultDeps,
};
