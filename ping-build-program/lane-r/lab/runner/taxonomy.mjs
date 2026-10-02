// taxonomy.mjs -- executable port of the canonical lane-K failure taxonomy.
//
// AUTHORITY: ~/workspace/ping-build-program/lane-k/FAILURE-TAXONOMY.md v1
// (2026-09-23). The taxonomy document is the classification source of truth;
// this module is its lab-local executable rendering. If they disagree, the
// document wins: file a lane-R bug and fix this module, never the reverse.
//
// Pinned: TAXONOMY_VERSION 'lane-k-v1-2026-09-23'.
// The lab's previous classifier (harness-local, pre-K) disagreed with v1 on
// five boundaries; the mismatches are documented per rule below and locked
// by regression fixtures (see lab/fixtures/* and lab/evidence/
// taxonomy-swap-proof.json). Those fixtures are the PROOF artifact for the
// incident "lab misclassified provider failures", fixed generically here.

export const TAXONOMY_VERSION = 'lane-k-v1-2026-09-23';
export const TAXONOMY_DOC = 'ping-build-program/lane-k/FAILURE-TAXONOMY.md';

export const CLASSES = [
  'AUTH_REQUIRED', 'AUTH_EXPIRED', 'PERMISSION_DENIED', 'RATE_LIMITED',
  'SOURCE_UNAVAILABLE', 'SOURCE_CHANGED', 'SCHEMA_CHANGED', 'INVALID_PAYLOAD',
  'UNSUPPORTED', 'CONFLICT', 'TIMEOUT', 'TRANSIENT', 'PERMANENT',
];

// Retry policy is engine-owned (lane K section 3). Connectors only assign the
// class. attempt is 1-based. Jitter is applied by the caller with a seeded
// PRNG; the policy gives the unjittered base.
export const RETRY_POLICY = {
  RATE_LIMITED:      { retryable: true, honorRetryAfter: true, baseMs: 60000, capMs: 7200000, maxAttempts: 5 },
  SOURCE_UNAVAILABLE:{ retryable: true, baseMs: 30000, capMs: 600000, maxAttempts: 4 },
  TIMEOUT:           { retryable: true, baseMs: 15000, capMs: 300000, maxAttempts: 3, idempotentOnly: true },
  TRANSIENT:         { retryable: true, baseMs: 5000, capMs: 120000, maxAttempts: 5 },
  CONFLICT:          { retryable: 'once-after-reread', maxAttempts: 2 },
  AUTH_EXPIRED:      { retryable: 'refresh-once', maxAttempts: 1 },
  AUTH_REQUIRED:     { retryable: false },
  PERMISSION_DENIED: { retryable: false },
  SOURCE_CHANGED:    { retryable: false },
  SCHEMA_CHANGED:    { retryable: false },
  INVALID_PAYLOAD:   { retryable: false },
  UNSUPPORTED:       { retryable: false },
  PERMANENT:         { retryable: false },
};

export function backoffMs(className, attempt, rand) {
  const p = RETRY_POLICY[className];
  if (!p || p.retryable !== true) return 0;
  const raw = Math.min(p.baseMs * Math.pow(2, attempt - 1), p.capMs);
  const jitter = rand ? 0.8 + 0.4 * rand() : 1; // deterministic when seeded
  return Math.round(raw * jitter);
}

function header(headers, name) {
  if (!headers) return undefined;
  const want = name.toLowerCase();
  for (const k of Object.keys(headers)) {
    if (k.toLowerCase() === want) return headers[k];
  }
  return undefined;
}

function bodyText(body) {
  if (body == null) return '';
  if (typeof body === 'string') return body;
  try { return JSON.stringify(body); } catch { return String(body); }
}

// Classify one HTTP outcome. Returns { class, resyncHint, detail }.
//   - context.providerDirected: true when the requested path came from the
//     provider itself (Link rel="next" / nextPath), not from our own state.
//     Used for the 404 boundary: provider-directed 404 -> SOURCE_CHANGED
//     (previously valid, the provider pointed us there); first-visit 404 ->
//     UNSUPPORTED (the operation never worked).
//   - resyncHint: true only for provider-side cursor rotation, where the
//     designed recovery is a typed FULL_RESYNC (BCQ contract), not a retry
//     of the same request and not connector maintenance.
//   - A 200 outcome returns { class: null }: classification is for failures;
//     record-shape breakage on 200 is SCHEMA_CHANGED at the record level
//     (handled by the harness quarantine path, lane K 2.7).
export function classifyOutcome({ status, headers = {}, body = null, context = {} }) {
  const text = bodyText(body);
  const saysRateLimit = /rate.?limit|too many requests|quota.?exceeded|slow down/i.test(text);
  const remaining = header(headers, 'x-ratelimit-remaining') ?? header(headers, 'ratelimit-remaining');
  const throttledByHeaders = String(remaining) === '0';
  const retryAfter = header(headers, 'retry-after');

  const base = { resyncHint: false, detail: '' };

  if (status >= 200 && status < 300) return { ...base, class: null };

  // Lane K: check rate-limit headers FIRST on every 403 (Appendix A, #1/#2).
  // Previous lab behavior mapped every 403 to PERMISSION_DENIED, which is
  // the Airbyte infinite-loop misclassification. FIXED.
  if (status === 429) return { ...base, class: 'RATE_LIMITED', detail: 'http-429' };
  if (status === 403) {
    if (throttledByHeaders || saysRateLimit) {
      return { ...base, class: 'RATE_LIMITED', detail: 'http-403-with-rate-limit-signals' };
    }
    return { ...base, class: 'PERMISSION_DENIED', detail: 'http-403-no-throttle-signals' };
  }

  // A 401 response means the request reached the provider and a presented
  // credential was rejected: AUTH_EXPIRED family. AUTH_REQUIRED ("no usable
  // credential, fetch never reached the provider", lane K 2.1) cannot be
  // observed from an HTTP response; the lab raises it only when the harness
  // itself has no credential handle configured. Previous lab behavior mapped
  // every 401 to AUTH_REQUIRED. FIXED.
  if (status === 401) {
    if (/invalid_grant|revoked|deauthorized|uninstall|suspend|not.?authorized.?app/i.test(text)) {
      return { ...base, class: 'PERMANENT', detail: 'grant-gone-not-expired' };
    }
    return { ...base, class: 'AUTH_EXPIRED', detail: 'credential-rejected-by-provider' };
  }

  if (status === 400 || status === 422) {
    const code = (body && typeof body === 'object' && (body.code || body.error)) || '';
    if (String(code).toLowerCase() === 'invalid_cursor' || /invalid.?cursor/i.test(text)) {
      // Lane K scenario 7 vs provider rotation: OUR malformed stored cursor
      // -> INVALID_PAYLOAD (fix the cursor, do not retry the same value).
      // Provider rotated/invalidated the cursor format server-side ->
      // SOURCE_CHANGED with a typed FULL_RESYNC (never a blind retry).
      if (/rotat|provider|deploy|format/i.test(text)) {
        return { ...base, class: 'SOURCE_CHANGED', resyncHint: true, detail: 'provider-rotated-cursor' };
      }
      return { ...base, class: 'INVALID_PAYLOAD', detail: 'our-cursor-malformed' };
    }
    return { ...base, class: 'INVALID_PAYLOAD', detail: `http-${status}` };
  }

  // Previous lab behavior mapped 404/410 to SOURCE_UNAVAILABLE. Lane K:
  // 404 on a previously-valid endpoint and 410-with-Sunset are SOURCE_CHANGED
  // (our endpoint knowledge is stale); 404 on a never-valid operation is
  // UNSUPPORTED; bare 410 on a deleted resource is PERMANENT. FIXED.
  if (status === 404) {
    if (context.providerDirected) {
      return { ...base, class: 'SOURCE_CHANGED', detail: 'provider-directed-path-now-404' };
    }
    return { ...base, class: 'UNSUPPORTED', detail: 'http-404-never-valid' };
  }
  if (status === 410) {
    const sunset = header(headers, 'sunset');
    if (sunset || /sunset|successor|migrat|deprecat/i.test(text)) {
      return { ...base, class: 'SOURCE_CHANGED', detail: 'gone-with-sunset-or-migration-hint' };
    }
    return { ...base, class: 'PERMANENT', detail: 'gone-no-migration' };
  }
  if (status === 405 || status === 501) return { ...base, class: 'UNSUPPORTED', detail: `http-${status}` };
  if (status === 409 || status === 412) return { ...base, class: 'CONFLICT', detail: `http-${status}` };

  // Previous lab behavior mapped every 5xx to TRANSIENT. Lane K 2.5/2.11:
  // 500/502/503 are SOURCE_UNAVAILABLE (provider down/degraded, registry
  // health drops); 504/408 are TIMEOUT (no conclusive response). FIXED.
  if (status === 408 || status === 504) return { ...base, class: 'TIMEOUT', detail: `http-${status}` };
  if (status === 500 || status === 502 || status === 503) {
    return { ...base, class: 'SOURCE_UNAVAILABLE', detail: `http-${status}` };
  }

  // Lane K: unrecognized signals land in TRANSIENT with original_signal, capped.
  return { ...base, class: 'TRANSIENT', detail: `unrecognized-http-${status}`, originalSignal: text.slice(0, 200) };
}

// Transport-level failure (no HTTP status at all): connection dropped with no
// conclusive response -> TIMEOUT (lane K 2.11). For reads the harness may
// reconcile by re-requesting; idempotency absorbs duplicates. For
// non-idempotent writes the harness must set side_effect_unknown and
// dead-letter instead of retrying blindly.
export function classifyTransportFailure(reason) {
  if (reason === 'connection-drop') {
    return { class: 'TIMEOUT', resyncHint: false, detail: 'no-conclusive-response', sideEffectUnknown: true };
  }
  return { class: 'TRANSIENT', resyncHint: false, detail: reason, originalSignal: reason };
}

// Back-compat alias: the pre-K harness exported classifyFailure(status, body).
// It now delegates to the canonical classifier. Prefer classifyOutcome.
export function classifyFailure(status, body, headers = {}, context = {}) {
  return classifyOutcome({ status, headers, body, context }).class;
}
