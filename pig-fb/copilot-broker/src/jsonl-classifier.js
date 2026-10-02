'use strict';
//
// JSONL failure classifier. The CLI's --output-format json event stream is the
// authoritative machine-readable execution surface; exit code alone is NOT
// sufficient (quota, auth, and unknown failures can all surface as exit 1).
//
// Classifications: SUCCESS, EXHAUSTED, RATE_LIMITED, AUTH_FAILED,
// TEMPORARY_FAILURE, POLICY_BLOCKED, TOOL_FAILURE, UNKNOWN.
//
// Known quota signals (statusCode 402, errorType "quota", errorCode
// "quota_exceeded") are never confused with HTTP 429 / rate-limit behavior.
// Unknown failures stay UNKNOWN and are never blindly retried.

export const CLASSIFICATIONS = Object.freeze([
  'SUCCESS',
  'EXHAUSTED',
  'RATE_LIMITED',
  'AUTH_FAILED',
  'TEMPORARY_FAILURE',
  'POLICY_BLOCKED',
  'TOOL_FAILURE',
  'UNKNOWN',
]);

// Only these may be retried automatically, with a bounded budget owned by the caller.
const RETRYABLE = new Set(['RATE_LIMITED', 'TEMPORARY_FAILURE']);

export function isRetryable(classification) {
  return RETRYABLE.has(classification);
}

function asArray(v) {
  return Array.isArray(v) ? v : v == null ? [] : [v];
}

// Scan one parsed event object for error signals. Returns a classification or null.
function signalFromEvent(event) {
  if (!event || typeof event !== 'object') return null;
  const candidates = [event, event.error, event.data].filter(Boolean);
  for (const obj of candidates) {
    if (typeof obj !== 'object') continue;
    const statusCode = obj.statusCode ?? obj.status_code;
    const errorType = String(obj.errorType ?? obj.error_type ?? '').toLowerCase();
    const errorCode = String(obj.errorCode ?? obj.error_code ?? obj.code ?? '').toLowerCase();
    if (statusCode === 402 || errorType === 'quota' || errorCode === 'quota_exceeded') return 'EXHAUSTED';
    if (errorCode === 'billing_not_configured') return 'AUTH_FAILED';
    if (statusCode === 401 || statusCode === 403 || errorType.includes('auth')) return 'AUTH_FAILED';
    if (errorCode === 'session_quota_exceeded') return 'TEMPORARY_FAILURE';
    if (errorType === 'rate_limit' || statusCode === 429 || errorCode.includes('rate_limit')) return 'RATE_LIMITED';
    if (errorType.includes('policy') || errorType.includes('content_filter') || errorCode.includes('policy'))
      return 'POLICY_BLOCKED';
  }
  return null;
}

// Terminal error classifications take precedence over everything else.
const TERMINAL = new Set(['EXHAUSTED', 'AUTH_FAILED', 'POLICY_BLOCKED']);

function extractUsage(event, usage) {
  if (!event || typeof event !== 'object') return usage;
  const u = event.usage ?? event.aiCredits ?? event.credits;
  if (u != null && typeof u === 'object') {
    for (const k of ['total', 'credits', 'ai_credits', 'input', 'output']) {
      if (typeof u[k] === 'number') usage[k] = u[k];
    }
  } else if (typeof u === 'number') {
    usage.total = u;
  }
  return usage;
}

// lines: array of raw JSONL text lines (stdout of the CLI).
// result: { classification, signals, usage, resultText, exitCode }
export function classifyStream(lines, exitCode = null) {
  const signals = { terminal: [], transient: [], sawResult: false, resultExitCode: null };
  let usage = {};
  let resultText = null;

  for (const line of asArray(lines)) {
    if (typeof line !== 'string' || !line.trim()) continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue; // unparseable lines are not failure signals
    }
    usage = extractUsage(event, usage);
    const sig = signalFromEvent(event);
    if (sig) {
      if (TERMINAL.has(sig)) signals.terminal.push(sig);
      else signals.transient.push(sig);
    }
    const type = String(event.type || '').toLowerCase();
    if (type === 'result' || event.exitCode != null || event.exit_code != null) {
      signals.sawResult = true;
      signals.resultExitCode = event.exitCode ?? event.exit_code ?? signals.resultExitCode;
      const text = event.result ?? event.text ?? event.message;
      if (typeof text === 'string' && text.trim()) resultText = text;
    }
  }

  let classification;
  if (signals.terminal.length > 0) {
    classification = signals.terminal[0];
  } else if (signals.sawResult && signals.resultExitCode === 0) {
    classification = 'SUCCESS';
  } else if (signals.transient.includes('RATE_LIMITED')) {
    classification = 'RATE_LIMITED';
  } else if (signals.transient.includes('TEMPORARY_FAILURE')) {
    classification = 'TEMPORARY_FAILURE';
  } else if (signals.sawResult || exitCode === 1) {
    classification = 'TOOL_FAILURE'; // nonzero exit, no recognized signal
  } else {
    classification = 'UNKNOWN'; // empty stream, no result, no signal
  }

  return {
    classification,
    signals,
    usage: Object.keys(usage).length > 0 ? usage : null,
    resultText,
    exitCode,
  };
}
