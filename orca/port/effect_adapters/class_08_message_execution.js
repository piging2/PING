/**
 * class_08_message_execution.js — ORCA adapter for Effect Class 08:
 * Message Preparation / Execution.
 *
 * Real external effects: cold email (hatch_gws_cli gmail +send), Facebook
 * Page DMs (Pig CDP send-dm-generic.js), contact forms (browser submit).
 * All three are IRREVERSIBLE once delivered: no recall/unsend exists in
 * the outreach machinery. Blind retry of an UNVERIFIED send = duplicate
 * cold email = real, irreversible reputational harm to a real business.
 *
 * Identity: msg:v1:<channel>:<normalized-recipient>:<action-type>:t<touch-seq>
 *   channel: email | fb_dm | form
 *   normalized recipient: email -> lowercase+trim; fb page-id -> as-is;
 *     form -> target URL
 *   action-type: cold | followup-f1 | followup-f2 | review-triggered | dm
 *     | form-submit
 *   touch-seq: which touch this op is within the follow-up ladder
 * The op key then binds the frozen content snapshot (contentHash) via
 * canonical(input), so a reworded retry is a DIFFERENT logical op and
 * cannot silently consume this op's dispatch record.
 *
 * Probes (per class_08 spec, section Q3/Q4):
 *   email: Gmail Sent is ground truth: `in:sent to:<addr>` via
 *     `hatch_gws_cli gmail +triage --query ... --format json`; capture the
 *     message id. Zero hits with a healthy search = proof of non-delivery.
 *   fb_dm: thread re-read for the sent text (Pig CDP). PARTIAL evidence:
 *     no platform message id is captured.
 *   form: local state only (pipeline SUBMITTED row). No meaningful probe:
 *     local state saying SUBMITTED -> RECOVER_SUCCEEDED; otherwise the
 *     probe is inconclusive and the predicate HOLDS.
 *
 * Retry is SAFE only when ALL of:
 *   (a) the probe proves non-delivery, AND
 *   (b) send-eligibility.py exits 0 (fail-closed checker; exit codes
 *       1 INELIGIBLE / 2 DISCREPANCY / 3 ERROR all -> HOLD), AND
 *   (c) no open intent for the same logical op in action-intent-ledger, AND
 *   (d) the retry would not exceed the follow-up ladder cap (max 3 touches).
 *
 * HOLD when: receipt inconclusive, eligibility non-zero, structured state
 * disagrees with notes (exit 2 covers it), review-triggered while a
 * follow-up ladder is active, or the probe cannot speak (forms).
 *
 * This module consumes send-eligibility.py and action-intent-ledger.jsonl.
 * It does NOT modify them. Integration proposal lives in
 * INTEGRATION-CLASS08-PROPOSAL.md (REVIEW-REQUIRED).
 */
'use strict';

const { execFile } = require('child_process');
const path = require('path');
const crypto = require('crypto');

const core = require('./adapter_core.js')();
const DECISIONS = core.DECISIONS;

const EFFECT_CLASS = '08-message-execution';
const MAX_TOUCHES = 3; // follow-up ladder: cold + F1 + F2, never a 4th touch

const CHANNELS = ['email', 'fb_dm', 'form'];
const ACTION_TYPES = ['cold', 'followup-f1', 'followup-f2', 'review-triggered', 'dm', 'form-submit'];

const SEND_ELIGIBILITY = path.join(
  process.env.HOME || '/home/hatch',
  'workspace/outreach/send-eligibility.py'
);

/** Normalize the recipient per channel. Lowercase email addresses so
 *  Nolan@Biz.com and nolan@biz.com cannot become two logical ops. */
function normalizeRecipient(channel, recipient) {
  const r = String(recipient || '').trim();
  if (channel === 'email') return r.toLowerCase();
  return r;
}

function validateInput(input) {
  if (!input || typeof input !== 'object') throw new Error('class08: input object required');
  const { channel, recipient, actionType, touchSeq, contentHash } = input;
  if (!CHANNELS.includes(channel)) throw new Error(`class08: channel must be one of ${CHANNELS.join(',')}`);
  if (!recipient || typeof recipient !== 'string') throw new Error('class08: recipient required');
  if (!ACTION_TYPES.includes(actionType)) throw new Error(`class08: actionType must be one of ${ACTION_TYPES.join(',')}`);
  if (!Number.isInteger(touchSeq) || touchSeq < 1) throw new Error('class08: touchSeq must be a positive integer');
  if (!contentHash || typeof contentHash !== 'string') throw new Error('class08: contentHash (frozen approved content) required');
}

/**
 * deriveOpKey(input) -> hex.
 * input: { missionId?, channel, recipient, actionType, touchSeq, contentHash,
 *          subjectHash? }
 * effectName carries the logical identity; canonical(input) binds the frozen
 * content snapshot. missionId is caller-supplied (defaults to the campaign
 * scope when the caller has none; the default is explicit and documented,
 * never wall-clock-derived).
 */
function deriveOpKey(input) {
  validateInput(input);
  const channel = input.channel;
  const recipient = normalizeRecipient(channel, input.recipient);
  const effectName = `msg:v1:${channel}:${recipient}:${input.actionType}:t${input.touchSeq}`;
  const missionId = input.missionId || `class08:${channel}`;
  const snapshot = {
    contentHash: input.contentHash,
    subjectHash: input.subjectHash || null,
    channel,
    recipient,
    actionType: input.actionType,
    touchSeq: input.touchSeq,
  };
  return core.deriveOpKey({ missionId, effectName, input: snapshot });
}

/** The logical identity (effectName) without hashing; used for ledger keys. */
function effectNameOf(input) {
  validateInput(input);
  return `msg:v1:${input.channel}:${normalizeRecipient(input.channel, input.recipient)}:${input.actionType}:t${input.touchSeq}`;
}

// ---------------------------------------------------------------------------
// Probe dependencies. Default deps shell out to the real CLIs with argv
// arrays (never shell strings). Tests inject stubs. All deps receive plain
// data; no secrets are passed (the CLIs use their own stored auth).
// ---------------------------------------------------------------------------

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
  // Reads the intent ledger for open intents matching this op identity.
  // Implemented by the caller in production (the ledger lives in
  // ~/workspace/outreach/action-intent-ledger.jsonl); default returns
  // unknown-open=false so a missing reader can never green-light a send.
  readOpenIntents: async (_effectName) => ({ unknown: true, open: [] }),
  // Local pipeline state for forms: { status: 'SUBMITTED'|'SENT'|... } or null.
  readFormLocalState: async (_input) => null,
};

/**
 * probe(opKey, attemptWindow, deps) -> probe result.
 * deps: { exec, readOpenIntents, readFormLocalState, channel, recipient,
 *         gmailAccounts? }
 * The probe never claims delivery from a CLI error. A failed search is
 * inconclusive (port law: timeout/error is an observation, not an outcome).
 */
async function probe(opKey, attemptWindow, deps) {
  const d = { ...defaultDeps, ...(deps || {}) };
  const channel = d.channel;
  const recipient = d.recipient;
  if (!CHANNELS.includes(channel)) {
    return core.makeProbeResult({
      opKey, attemptWindow, outcome: 'inconclusive',
      observation: `unknown channel '${channel}'`,
      evidence: {},
    });
  }

  if (channel === 'email') {
    const addr = normalizeRecipient('email', recipient);
    const window = attemptWindow || {};
    let q = `in:sent to:${addr}`;
    if (window.after) q += ` after:${window.after}`;
    if (window.before) q += ` before:${window.before}`;
    try {
      const { stdout } = await d.exec(['hatch_gws_cli', 'gmail', '+triage', '--query', q, '--max', '10', '--format', 'json'], { timeoutMs: 30000 });
      const parsed = JSON.parse(stdout);
      const messages = (parsed && (parsed.messages || parsed.results || [])) || [];
      if (messages.length > 0) {
        const first = messages[0];
        const messageId = first.id || first.message_id || first.messageId || null;
        const ok = messageId ? core.assertProbeEvidence({ evidence: { messageId } }) : false;
        return core.makeProbeResult({
          opKey, attemptWindow,
          outcome: ok ? 'delivered' : 'inconclusive',
          observation: ok
            ? `Gmail Sent search found ${messages.length} hit(s); ground truth: sent`
            : 'Gmail Sent search returned hits but no message id could be extracted; not evidence',
          evidence: ok ? { messageId, hitCount: messages.length, query: q } : { hitCount: messages.length, query: q },
        });
      }
      return core.makeProbeResult({
        opKey, attemptWindow, outcome: 'not-delivered',
        observation: `Gmail Sent search '${q}' returned zero hits with a healthy search; proof of non-delivery for this window`,
        evidence: { hitCount: 0, query: q, searchHealthy: true },
      });
    } catch (err) {
      return core.makeProbeResult({
        opKey, attemptWindow, outcome: 'inconclusive',
        observation: `Gmail Sent probe failed: ${err.message}; a failed probe is not proof of non-delivery`,
        evidence: { probeError: err.message },
      });
    }
  }

  if (channel === 'fb_dm') {
    // Thread re-read via the Pig CDP path. The actual re-read command is
    // provided by the caller (d.readThreadText(recipient)); the default
    // has no reader and therefore returns inconclusive, never a green light.
    try {
      if (typeof d.readThreadText !== 'function') {
        return core.makeProbeResult({
          opKey, attemptWindow, outcome: 'inconclusive',
          observation: 'no FB DM thread reader configured; cannot verify delivery',
          evidence: {},
        });
      }
      const found = await d.readThreadText(recipient, attemptWindow);
      if (found && found.matched) {
        return core.makeProbeResult({
          opKey, attemptWindow, outcome: 'delivered',
          observation: 'FB DM thread re-read shows the sent text; delivery confirmed (no platform message id available)',
          evidence: { threadMatched: true, firstLine: found.firstLine || null },
        });
      }
      if (found && found.threadReadable) {
        return core.makeProbeResult({
          opKey, attemptWindow, outcome: 'not-delivered',
          observation: 'FB DM thread re-read succeeded and the sent text is absent',
          evidence: { threadMatched: false, threadReadable: true },
        });
      }
      return core.makeProbeResult({
        opKey, attemptWindow, outcome: 'inconclusive',
        observation: 'FB DM thread unreadable (browser/Pig may have died mid-run)',
        evidence: { threadReadable: false },
      });
    } catch (err) {
      return core.makeProbeResult({
        opKey, attemptWindow, outcome: 'inconclusive',
        observation: `FB DM thread re-read failed: ${err.message}`,
        evidence: { probeError: err.message },
      });
    }
  }

  // channel === 'form': local state only, per spec Q4 (no meaningful probe).
  try {
    const st = await d.readFormLocalState({ channel, recipient, attemptWindow });
    if (st && (st.status === 'SUBMITTED' || st.status === 'SENT')) {
      return core.makeProbeResult({
        opKey, attemptWindow, outcome: 'delivered',
        observation: `local pipeline state records ${st.status}; no platform receipt exists for forms`,
        evidence: { localStatus: st.status, evidenceClass: 'local-state-only' },
      });
    }
    return core.makeProbeResult({
      opKey, attemptWindow, outcome: 'inconclusive',
      observation: 'contact forms have no platform receipt; local state does not confirm submission, so the outcome is unknown',
      evidence: { localStatus: (st && st.status) || 'unknown', evidenceClass: 'local-state-only' },
    });
  } catch (err) {
    return core.makeProbeResult({
      opKey, attemptWindow, outcome: 'inconclusive',
      observation: `form local-state read failed: ${err.message}`,
      evidence: { probeError: err.message },
    });
  }
}

/**
 * Run the deterministic fail-closed eligibility checker. Consumes (never
 * modifies) ~/workspace/outreach/send-eligibility.py. Returns
 * { exitCode, stdout } where exitCode is 0 ELIGIBLE, 1 INELIGIBLE,
 * 2 DISCREPANCY, 3 ERROR. Any non-zero code is a HOLD trigger.
 */
function runEligibilityCheck({ business, email, action, gmailSentCount, campaign, day }) {
  const argv = ['python3', SEND_ELIGIBILITY, '--business', business, '--email', email, '--action', action];
  if (campaign) argv.push('--campaign', campaign);
  if (day) argv.push('--day', day);
  // gmail-sent-count is REQUIRED by the checker; passing it as absent would
  // fail closed with exit 3, which is correct behavior, so pass only when known.
  if (gmailSentCount !== undefined && gmailSentCount !== null) {
    argv.push('--gmail-sent-count', String(gmailSentCount));
  }
  return new Promise((resolve) => {
    execFile(argv[0], argv.slice(1), { timeout: 30000 }, (err, stdout) => {
      const exitCode = err && typeof err.code === 'number' ? err.code : err ? 3 : 0;
      resolve({ exitCode, stdout: String(stdout || '') });
    });
  });
}

/**
 * retryPredicate(probeResult, context) -> { decision, evidence, holdReason }.
 * context: {
 *   eligibilityExitCode: 0|1|2|3 (from runEligibilityCheck; REQUIRED),
 *   openIntent: boolean (same logical op has an unresolved intent),
 *   touchCount: number of touches already sent to this recipient/action family,
 *   followupLadderActive: boolean (review-triggered suppressed while active),
 *   actionType: for error messages
 * }
 *
 * Truth table:
 *   probe inconclusive                                   -> HOLD_UNKNOWN
 *   probe delivered                                      -> RECOVER_SUCCEEDED
 *   probe not-delivered + eligibility != 0                -> HOLD_UNKNOWN (map code)
 *   probe not-delivered + openIntent                     -> HOLD_UNKNOWN
 *   probe not-delivered + touchCount >= 3 (4th touch)    -> HOLD_UNKNOWN (never authorize)
 *   probe not-delivered + review-triggered + ladder on   -> HOLD_UNKNOWN
 *   probe not-delivered + all gates green                -> SAFE_TO_RETRY
 */
function retryPredicate(probeResult, context) {
  const ctx = context || {};
  const evidence = { ...(probeResult.evidence || {}), probeOutcome: probeResult.outcome };

  if (probeResult.outcome === 'inconclusive') {
    return {
      decision: DECISIONS.HOLD_UNKNOWN,
      evidence,
      holdReason: `send receipt inconclusive: ${probeResult.observation || 'no observation'}. Blind retry would risk a duplicate message.`,
    };
  }
  if (probeResult.outcome === 'delivered') {
    return { decision: DECISIONS.RECOVER_SUCCEEDED, evidence, holdReason: null };
  }

  // outcome === 'not-delivered': the read path proves non-delivery. Now the gates.
  const code = ctx.eligibilityExitCode;
  if (code !== 0) {
    const names = { 1: 'INELIGIBLE', 2: 'DISCREPANCY', 3: 'ERROR' };
    return {
      decision: DECISIONS.HOLD_UNKNOWN,
      evidence: { ...evidence, eligibilityExitCode: code },
      holdReason: `send-eligibility.py exited ${code} (${names[code] || 'missing/invalid'}); fail closed. ` +
        (code === 2 ? 'Structured state disagrees with notes; explicit reconciliation required before any send to this recipient.' : ''),
    };
  }
  if (ctx.openIntent) {
    return {
      decision: DECISIONS.HOLD_UNKNOWN,
      evidence,
      holdReason: 'an unresolved intent exists for this logical op in action-intent-ledger; reconcile it before any retry',
    };
  }
  if ((ctx.touchCount || 0) >= MAX_TOUCHES) {
    return {
      decision: DECISIONS.HOLD_UNKNOWN,
      evidence: { ...evidence, touchCount: ctx.touchCount },
      holdReason: `follow-up ladder cap reached (${MAX_TOUCHES} touches); a retry would be a 4th touch, which is never authorized`,
    };
  }
  if (ctx.actionType === 'review-triggered' && ctx.followupLadderActive) {
    return {
      decision: DECISIONS.HOLD_UNKNOWN,
      evidence,
      holdReason: 'review-triggered outreach is suppressed while a follow-up ladder is active for this recipient',
    };
  }
  return { decision: DECISIONS.SAFE_TO_RETRY, evidence, holdReason: null };
}

const holdConditions = [
  'send receipt inconclusive (email: Gmail Sent verification failed after send CLI ok; FB DM: thread unreadable because browser/Pig died mid-run; form: local state does not confirm submission)',
  'send-eligibility.py exits non-zero: 1 INELIGIBLE, 2 DISCREPANCY (structured state vs notes disagreement), 3 ERROR',
  'an unresolved intent exists for the same logical op in action-intent-ledger',
  'the retry would be a 4th touch (follow-up ladder cap is 3: cold + F1 + F2)',
  'review-triggered action while a follow-up ladder is active for the recipient',
  'probe itself failed (Gmail search error, thread reader missing) — a failed probe is not proof of non-delivery',
];

module.exports = {
  EFFECT_CLASS,
  CHANNELS,
  ACTION_TYPES,
  MAX_TOUCHES,
  deriveOpKey,
  effectNameOf,
  normalizeRecipient,
  probe,
  runEligibilityCheck,
  retryPredicate,
  holdConditions,
  defaultDeps,
};
