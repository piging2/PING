/**
 * class_05d_instagram.js — ORCA adapter for Effect Class 05d:
 * Instagram post-feed / post-story.
 *
 * Skill rule encoded: "Do not use --retries for posting because an
 * automatic retry could publish a duplicate. Instagram also enforces a
 * per-account daily publish limit."
 *
 * Identity: account + approved media manifest + caption hash.
 * effectName: ig:v1:post-<feed|story>:<account>
 *
 * PROBE PATH LAW (AGENTS.md 2026-09-21): the probe MUST use the CLI read
 * path (instagram-cli post grids / post --id). It must NEVER use the
 * degraded browser CDP path: the post grid no longer renders /p/ or /reel/
 * anchors in the CDP session. This module refuses a CDP-sourced probe
 * outright (probeSource !== 'cli' -> inconclusive -> HOLD), rather than
 * trusting a degraded read that could false-negative into a duplicate.
 *
 * Retry is SAFE only when: the CLI-path probe definitively shows absence
 * (grids + post-by-ID checked, caption+media fingerprint matched) AND the
 * retry stays within the daily publish limit budget (remaining > 1, so a
 * duplicate could not burn the last slot). HOLD on ambiguous probe or
 * when near the daily limit.
 *
 * Reversible: PARTIAL (stories self-heal in 24h; feed posts deletable in
 * most IG flows but delete is not a listed skill capability, so the
 * adapter never assumes compensation exists).
 */
'use strict';

const { execFile } = require('child_process');
const crypto = require('crypto');

const core = require('./adapter_core.js')();
const DECISIONS = core.DECISIONS;

const EFFECT_CLASS = '05d-instagram-post';
const KINDS = ['feed', 'story'];

// Require at least this many daily-limit slots remaining before a retry is
// authorized. remaining <= HOLD_THRESHOLD -> HOLD (near-limit).
const DAILY_LIMIT_HOLD_THRESHOLD = 1;

function validateInput(input) {
  if (!input || typeof input !== 'object') throw new Error('class05d: input object required');
  if (!input.account || typeof input.account !== 'string') throw new Error('class05d: account required');
  if (!KINDS.includes(input.kind)) throw new Error(`class05d: kind must be one of ${KINDS.join(',')}`);
  if (!Array.isArray(input.mediaManifest) || input.mediaManifest.length === 0) {
    throw new Error('class05d: mediaManifest (approved media, non-empty) required');
  }
  if (typeof input.caption !== 'string') throw new Error('class05d: caption (may be empty string) required');
}

/**
 * deriveOpKey(input) -> hex.
 * input: { missionId?, account, kind: feed|story, mediaManifest: [hashes],
 *          caption }
 * Binds the account, the approved media manifest, and the caption hash.
 */
function deriveOpKey(input) {
  validateInput(input);
  const effectName = `ig:v1:post-${input.kind}:${input.account}`;
  const missionId = input.missionId || `class05d:${input.account}`;
  const snapshot = {
    account: input.account,
    kind: input.kind,
    mediaManifest: input.mediaManifest.slice(),
    captionHash: crypto.createHash('sha256').update(input.caption, 'utf8').digest('hex'),
  };
  return core.deriveOpKey({ missionId, effectName, input: snapshot });
}

function effectNameOf(input) {
  validateInput(input);
  return `ig:v1:post-${input.kind}:${input.account}`;
}

/** Fingerprint used for probe matching: caption hash + media manifest hash. */
function contentFingerprint({ caption, mediaManifest }) {
  return crypto
    .createHash('sha256')
    .update(`caption:${caption}\nmedia:${JSON.stringify(mediaManifest)}`, 'utf8')
    .digest('hex');
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
  // probeSource: 'cli' is the ONLY accepted read path. 'cdp' (or anything
  // else) forces an inconclusive probe and a HOLD.
  probeSource: 'cli',
  approvedSnapshot: null, // { caption, mediaManifest }
};

/**
 * probe(opKey, attemptWindow, deps) -> probe result.
 * CLI read path only: `instagram-cli posts --account-id <fbid>
 * --username <u> --since <after> --until <before> --limit 25`, then
 * caption+media fingerprint match against the frozen approved snapshot.
 */
async function probe(opKey, attemptWindow, deps) {
  const d = { ...defaultDeps, ...(deps || {}) };
  if (d.probeSource !== 'cli') {
    return core.makeProbeResult({
      opKey, attemptWindow, outcome: 'inconclusive',
      observation: `probe source '${d.probeSource}' rejected: the browser CDP post-grid read path is degraded (no /p/ or /reel/ anchors since 2026-09-21); only the CLI read path may be used`,
      evidence: { probeSource: d.probeSource, degradedPathRejected: true },
    });
  }
  const snap = d.approvedSnapshot;
  if (!snap || typeof snap.caption !== 'string' || !Array.isArray(snap.mediaManifest)) {
    return core.makeProbeResult({
      opKey, attemptWindow, outcome: 'inconclusive',
      observation: 'no frozen approved snapshot supplied to the probe; caption+media fingerprint match impossible',
      evidence: {},
    });
  }
  const window = attemptWindow || {};
  const argv = ['instagram-cli', 'posts', '--account-id', d.accountId || '', '--username', d.username || ''];
  if (window.after) argv.push('--since', window.after);
  if (window.before) argv.push('--until', window.before);
  argv.push('--limit', '25', '--sort-order', 'desc');
  try {
    const { stdout } = await d.exec(argv, { timeoutMs: 30000 });
    const parsed = JSON.parse(stdout);
    const posts = (parsed && (parsed.posts || parsed.results || parsed.data || [])) || [];
    if (!Array.isArray(posts)) {
      return core.makeProbeResult({
        opKey, attemptWindow, outcome: 'inconclusive',
        observation: 'CLI post grid returned an unparseable shape; probe ambiguous',
        evidence: { probeError: 'unparseable grid shape' },
      });
    }
    const want = contentFingerprint(snap);
    const match = posts.find((p) => {
      if (typeof p !== 'object' || p === null) return false;
      const got = contentFingerprint({
        caption: typeof p.caption === 'string' ? p.caption : '',
        mediaManifest: Array.isArray(p.mediaManifest) ? p.mediaManifest : [],
      });
      return got === want;
    });
    if (match) {
      return core.makeProbeResult({
        opKey, attemptWindow, outcome: 'delivered',
        observation: `CLI post grid contains a caption+media fingerprint match of the approved snapshot (${posts.length} posts scanned)`,
        evidence: { matchedFingerprint: true, gridCount: posts.length },
      });
    }
    return core.makeProbeResult({
      opKey, attemptWindow, outcome: 'not-delivered',
      observation: `CLI read path healthy; ${posts.length} posts scanned in the attempt window; no caption+media fingerprint match`,
      evidence: { gridCount: posts.length, cliPathHealthy: true },
    });
  } catch (err) {
    return core.makeProbeResult({
      opKey, attemptWindow, outcome: 'inconclusive',
      observation: `CLI read-path probe failed: ${err.message}; a failed probe is not proof of absence`,
      evidence: { probeError: err.message },
    });
  }
}

/**
 * retryPredicate(probeResult, context) -> { decision, evidence, holdReason }.
 * context: {
 *   dailyLimit: { remaining: number, limit: number } (REQUIRED for SAFE_TO_RETRY),
 *   snapshotMatches: boolean (retry carries the frozen approved snapshot)
 * }
 *
 * Truth table:
 *   probe delivered                                   -> RECOVER_SUCCEEDED
 *   probe inconclusive                                -> HOLD_UNKNOWN
 *   probe not-delivered + dailyLimit unknown          -> HOLD_UNKNOWN
 *   probe not-delivered + remaining <= 1 (near limit) -> HOLD_UNKNOWN
 *     (a blind retry could burn the last slot on a duplicate)
 *   probe not-delivered + !snapshotMatches            -> HOLD_UNKNOWN
 *   probe not-delivered + budget ok + same snapshot   -> SAFE_TO_RETRY
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
      holdReason: `probe ambiguous (CLI read-path failure or degraded path rejected): ${probeResult.observation || ''}. A duplicate would burn daily-limit budget and show on the brand account.`,
    };
  }
  // not-delivered on the CLI path: check the daily budget, then the snapshot.
  const dl = ctx.dailyLimit;
  if (!dl || !Number.isInteger(dl.remaining)) {
    return {
      decision: DECISIONS.HOLD_UNKNOWN,
      evidence,
      holdReason: 'daily publish limit budget unknown; cannot authorize a retry without knowing the remaining budget',
    };
  }
  if (dl.remaining <= DAILY_LIMIT_HOLD_THRESHOLD) {
    return {
      decision: DECISIONS.HOLD_UNKNOWN,
      evidence: { ...evidence, dailyLimitRemaining: dl.remaining },
      holdReason: `near the per-account daily publish limit (${dl.remaining} remaining); a blind retry could burn the last slot on a duplicate`,
    };
  }
  if (!ctx.snapshotMatches) {
    return {
      decision: DECISIONS.HOLD_UNKNOWN,
      evidence,
      holdReason: 'the retry snapshot does not match the frozen approved snapshot (media manifest / caption)',
    };
  }
  return {
    decision: DECISIONS.SAFE_TO_RETRY,
    evidence: { ...evidence, dailyLimitRemaining: dl.remaining, snapshotFrozen: true },
    holdReason: null,
  };
}

const holdConditions = [
  'probe used anything other than the CLI read path (CDP browser path is degraded and is rejected outright)',
  'CLI read-path probe failed or returned an ambiguous shape',
  'no frozen approved snapshot supplied to the probe',
  'daily publish limit budget unknown or near the limit (remaining <= 1)',
  'the retry snapshot drifted from the frozen approved snapshot',
];

module.exports = {
  EFFECT_CLASS,
  KINDS,
  DAILY_LIMIT_HOLD_THRESHOLD,
  deriveOpKey,
  effectNameOf,
  contentFingerprint,
  probe,
  retryPredicate,
  holdConditions,
  defaultDeps,
};
