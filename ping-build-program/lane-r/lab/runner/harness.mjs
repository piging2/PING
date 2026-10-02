// Reference connector harness: the generic ingestion mechanism under test.
// Implements the BCQ contract behaviors the fixtures prove:
//   - paginated read: follow Link rel="next" or response.nextPath, opaque
//     cursors echoed verbatim, checkpoint per contiguous success
//   - failure classification + retry policy: DELEGATED to runner/taxonomy.mjs,
//     the executable port of lane-K FAILURE-TAXONOMY.md v1 (canonical).
//     The harness assigns classes honestly; it never overrides policy.
//   - typed FULL_RESYNC on provider-side cursor rotation (never a blind retry)
//   - idempotency dedupe: sha256(connectorId|streamId|externalId|version)
//   - coerce-then-quarantine on schema drift (never silently drop)
//   - webhook: HMAC verify BEFORE parse, fail closed, dedupe on event id
// Virtual clock only: no wall-clock sleeps, no network.

import { createHmac } from 'node:crypto';
import {
  canonicalize, sha256hex, TransportError, mulberry32,
} from './transport.mjs';
import {
  TAXONOMY_VERSION, RETRY_POLICY, backoffMs,
  classifyOutcome, classifyTransportFailure, classifyFailure,
} from './taxonomy.mjs';

export { TAXONOMY_VERSION, classifyFailure };
export const CONNECTOR_ID = 'lab-reference-connector';

export function idempotencyKey(connectorId, streamId, externalId, version) {
  return sha256hex([connectorId, streamId, String(externalId), String(version ?? '')].join('|'));
}

function parseLinkNext(linkHeader) {
  if (!linkHeader) return null;
  for (const part of String(linkHeader).split(',')) {
    const m = part.match(/<([^>]+)>\s*;\s*rel="next"/);
    if (m) return m[1];
  }
  return null;
}

function parseRetryAfter(headers) {
  if (!headers) return NaN;
  for (const k of Object.keys(headers)) {
    if (k.toLowerCase() === 'retry-after') {
      const v = parseInt(headers[k], 10);
      return Number.isFinite(v) && v >= 0 ? v : NaN;
    }
  }
  return NaN;
}

function validateRecord(record, schema) {
  if (!schema) return { ok: true };
  if (!record || typeof record !== 'object') return { ok: false, reason: 'not-an-object' };
  for (const [field, type] of Object.entries(schema.fields || {})) {
    const v = record[field];
    if (v === undefined || v === null) return { ok: false, reason: `missing-field:${field}` };
    const actual = typeof v;
    if (type === 'number' && actual !== 'number') return { ok: false, reason: `type-mismatch:${field}:expected-number:got-${actual}` };
    if (type === 'string' && actual !== 'string') return { ok: false, reason: `type-mismatch:${field}:expected-string:got-${actual}` };
  }
  return { ok: true };
}

function newReport(fixture) {
  return {
    fixtureId: fixture.fixtureId,
    fixtureVersion: fixture.fixtureVersion,
    taxonomyVersion: TAXONOMY_VERSION,
    recordsEmitted: 0,
    uniqueRecords: 0,
    duplicatesAbsorbed: 0,
    quarantined: 0,
    attempts: [],
    failureCodes: [],
    checkpoints: [],
    terminalState: 'NOT_STARTED',
    fullResync: false,
    retryAfterHonored: false,
    signatureFailures: 0,
    schemaViolationsQuarantined: 0,
    idempotencyKeys: [],
    virtualMs: 0,
  };
}

function noteFailure(report, code) {
  if (code && !report.failureCodes.includes(code)) report.failureCodes.push(code);
}

export async function runPaginatedRead(fixture, transport) {
  const report = newReport(fixture);
  const streamId = fixture.fixtureId;
  const schema = fixture.recordSchema || null;
  const seen = new Set();
  const quarantine = [];
  const rand = mulberry32((fixture.replay?.seed ?? 1) >>> 0);
  report.terminalState = 'STARTED';

  const emitRecord = (record) => {
    const externalId = schema ? record[schema.idField] : (record.id ?? canonicalize(record));
    const version = schema && schema.versionField ? record[schema.versionField] : '';
    const key = idempotencyKey(CONNECTOR_ID, streamId, externalId, version);
    if (seen.has(key)) { report.duplicatesAbsorbed += 1; return; }
    seen.add(key);
    report.idempotencyKeys.push(key);
    report.recordsEmitted += 1;
    report.uniqueRecords += 1;
  };

  const ingestPage = (resp) => {
    const records = Array.isArray(resp.body) ? resp.body : [];
    for (const r of records) {
      const v = validateRecord(r, schema);
      if (!v.ok) {
        quarantine.push({ record: r, reason: v.reason, rawPayload: r });
        report.quarantined += 1;
        report.schemaViolationsQuarantined += 1;
        noteFailure(report, 'SCHEMA_CHANGED');
        continue;
      }
      emitRecord(r);
    }
  };

  // One logical request with lane-K policy. Returns {resp}, {resync:true},
  // or {fatal:true}. Non-retryable classes terminate immediately: the
  // harness never overrides the taxonomy's retry policy.
  const fetchWithRetry = (method, path, stepLabel, providerDirected) => {
    let attempt = 0;
    let waitedMs = 0;
    for (;;) {
      attempt += 1;
      let resp = null;
      let outcome = null;
      try {
        resp = transport.request(method, path);
      } catch (e) {
        if (e instanceof TransportError && e.reason === 'connection-drop') {
          outcome = classifyTransportFailure(e.reason);
        } else {
          throw e;
        }
      }
      if (resp) {
        report.virtualMs += resp.latencyMs || 0;
        if (resp.truncated) {
          // 200 with a body that is not even parseable: batch-level
          // SCHEMA_CHANGED (lane K 2.7). Halt the stream, never silently
          // complete with zero records.
          report.attempts.push({ step: stepLabel, attempt, status: resp.status, failureCode: 'SCHEMA_CHANGED', waitedMs, truncated: true });
          noteFailure(report, 'SCHEMA_CHANGED');
          report.terminalState = 'FAILED';
          return { fatal: true };
        }
        outcome = classifyOutcome({
          status: resp.status, headers: resp.headers, body: resp.body,
          context: { providerDirected },
        });
        if (outcome.class === null) {
          report.attempts.push({ step: stepLabel, attempt, status: resp.status, failureCode: null, waitedMs });
          return { resp };
        }
      }
      // Failure path (HTTP failure outcome, or transport failure).
      const code = outcome.class;
      report.attempts.push({
        step: stepLabel, attempt,
        status: resp ? resp.status : outcome.detail,
        failureCode: code, waitedMs,
        ...(outcome.detail ? { detail: outcome.detail } : {}),
      });
      noteFailure(report, code);
      if (outcome.resyncHint) return { resync: true };
      const policy = RETRY_POLICY[code] || { retryable: false };
      const maxAttempts = policy.maxAttempts || 1;
      if (policy.retryable === true && attempt < maxAttempts) {
        let waitMs;
        const retryAfter = resp ? parseRetryAfter(resp.headers) : NaN;
        if (code === 'RATE_LIMITED' && Number.isFinite(retryAfter)) {
          waitMs = retryAfter * 1000;
          report.retryAfterHonored = true;
        } else {
          waitMs = backoffMs(code, attempt, rand);
        }
        waitedMs += waitMs;
        report.virtualMs += waitMs;
        continue;
      }
      report.terminalState = 'FAILED';
      return { fatal: true };
    }
  };

  const readFrom = (startPath, providerDirected) => {
    let path = startPath;
    let directed = providerDirected;
    const visited = new Set();
    while (path) {
      if (visited.has(path)) throw new Error(`harness bug: pagination loop at ${path}`);
      visited.add(path);
      const { resp, resync, fatal } = fetchWithRetry('GET', path, path, directed);
      if (fatal) return 'failed';
      if (resync) return 'resync';
      ingestPage(resp);
      report.checkpoints.push(resp.stepId);
      path = resp.nextPath || parseLinkNext(resp.headers?.link);
      directed = true; // every subsequent path is provider-directed
    }
    return 'done';
  };

  const firstPath = fixture.steps.find(s => s.kind === 'request')?.request.path;
  if (!firstPath) throw new Error('fixture has no request steps');
  let outcome = readFrom(firstPath, false);
  if (outcome === 'resync') {
    report.fullResync = true;
    report.checkpoints = []; // watermark resets: contiguous successes only
    outcome = readFrom(firstPath, false);
  }
  if (outcome === 'done') report.terminalState = 'SUCCEEDED';
  else if (report.terminalState !== 'FAILED') report.terminalState = 'OUTCOME_UNKNOWN';
  report.quarantine = quarantine;
  return report;
}

export async function runWebhookPush(fixture, transport) {
  const report = newReport(fixture);
  const streamId = fixture.fixtureId;
  const seen = new Set();
  const key = transport.signatureKey;
  report.terminalState = 'STARTED';

  for (const d of transport.deliveries()) {
    report.virtualMs += d.latencyMs || 0;
    // HMAC verify BEFORE parse; fail closed on missing/malformed signature.
    const presented = d.headers?.['x-hub-signature-256'];
    let valid = false;
    if (d.signature === 'valid' && presented) {
      const expected = 'sha256=' + createHmac('sha256', key).update(canonicalize(d.body), 'utf8').digest('hex');
      valid = presented.length === expected.length &&
        Buffer.from(presented).equals(Buffer.from(expected));
    }
    if (!valid) {
      report.signatureFailures += 1;
      report.attempts.push({ step: d.stepId, attempt: 1, eventId: d.eventId, accepted: false, reason: 'bad-signature' });
      continue;
    }
    const idem = idempotencyKey(CONNECTOR_ID, streamId, d.eventId, '');
    if (seen.has(idem)) {
      report.duplicatesAbsorbed += 1;
      report.attempts.push({ step: d.stepId, attempt: 1, eventId: d.eventId, accepted: true, deduped: true });
      continue;
    }
    seen.add(idem);
    report.idempotencyKeys.push(idem);
    report.recordsEmitted += 1;
    report.uniqueRecords += 1;
    report.attempts.push({ step: d.stepId, attempt: 1, eventId: d.eventId, accepted: true, deduped: false });
  }
  report.terminalState = 'SUCCEEDED';
  return report;
}
