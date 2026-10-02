// ReplayTransport: serves recorded fixture steps to a connector-shaped harness.
// Zero dependencies. Deterministic: no wall-clock, no network, no randomness
// except a seeded PRNG for reorder injection.
//
// Failure injection (all optional, from CLI --inject JSON):
//   { latencyMs, errorAt:[stepId], errorStatus, truncateAt:{stepId,bytes},
//     reorderSeed, dropAt:[stepId] }

import { createHash, createHmac } from 'node:crypto';

export function canonicalize(value) {
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonicalize(value[k])).join(',') + '}';
  }
  return JSON.stringify(value);
}

export function sha256hex(str) {
  return createHash('sha256').update(str, 'utf8').digest('hex');
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class TransportError extends Error {
  constructor(stepId, reason) {
    super(`transport failure at step ${stepId}: ${reason}`);
    this.stepId = stepId;
    this.reason = reason; // 'connection-drop' (outcome unknown to the caller)
  }
}

export class ReplayTransport {
  constructor(fixture, injection = {}) {
    this.fixture = fixture;
    this.injection = injection;
    // Per logical request path: how many attempts have been served.
    this.attemptCount = new Map();
    // Steps consumed in order (strict mode).
    this.cursor = 0;
    this.currentStep = null;
    this.strictOrder = fixture.replay?.strictOrder !== false;
    this.latencyMode = fixture.replay?.latencyMode || 'recorded';
    this.signatureKey = fixture.replay?.signatureKey || 'lab-fixture-key';
  }

  // Serve one request. Matches the next unconsumed step by method+path.
  // Retries of the same logical request consume `responses[]` in order.
  request(method, path) {
    const key = method + ' ' + path;
    const attempt = (this.attemptCount.get(key) || 0) + 1;
    const step = this._nextRequestStep(method, path);
    const responses = step.responses || [step.response];
    const recorded = responses[Math.min(attempt - 1, responses.length - 1)];
    this.attemptCount.set(key, attempt);

    if ((this.injection.dropAt || []).includes(step.id)) {
      throw new TransportError(step.id, 'connection-drop');
    }

    let status = recorded.status;
    let headers = { ...(recorded.headers || {}) };
    let body = recorded.body;
    let truncated = false;
    if ((this.injection.errorAt || []).includes(step.id)) {
      status = this.injection.errorStatus || 500;
      body = { error: 'injected-failure', injected: true };
      headers = {};
    }
    const trunc = this.injection.truncateAt;
    if (trunc && trunc.stepId === step.id) {
      const s = typeof body === 'string' ? body : canonicalize(body);
      body = s.slice(0, trunc.bytes);
      truncated = true;
    }

    let latencyMs = recorded.latencyMs || 0;
    if (this.latencyMode === 'none') latencyMs = 0;
    else if (typeof this.latencyMode === 'string' && this.latencyMode.startsWith('scaled:')) {
      latencyMs = Math.round(latencyMs * parseFloat(this.latencyMode.slice(7)));
    }
    latencyMs += this.injection.latencyMs || 0;

    return {
      stepId: step.id, attempt, status, headers, body,
      latencyMs, truncated,
      nextPath: recorded.nextPath || null,
    };
  }

  _nextRequestStep(method, path) {
    const sig = method + ' ' + path;
    const steps = this.fixture.steps;
    // Retry of the same logical request: serve the next recorded attempt
    // of the CURRENT step without advancing.
    if (this.currentStep) {
      const cur = this.currentStep.request;
      if (cur.method + ' ' + cur.path === sig) return this.currentStep;
    }
    // New logical request: advance to the next unconsumed step.
    if (this.cursor >= steps.length) {
      throw new Error(`transport exhausted: no recorded step for ${method} ${path}`);
    }
    let step = steps[this.cursor];
    if (step.kind !== 'request') {
      throw new Error(`transport order violation: expected request step, found ${step.kind} (${step.id})`);
    }
    const stepSig = step.request.method + ' ' + step.request.path;
    if (stepSig !== sig) {
      if (this.strictOrder) {
        throw new Error(`transport order violation: harness requested ${method} ${path}, fixture expects ${stepSig} (step ${step.id})`);
      }
      const found = steps.find(s => s.kind === 'request' && (s.request.method + ' ' + s.request.path) === sig);
      if (!found) throw new Error(`transport: no recorded step matches ${method} ${path}`);
      step = found;
      this.cursor = steps.indexOf(found) + 1;
    } else {
      this.cursor += 1;
    }
    this.currentStep = step;
    return step;
  }

  // Webhook deliveries, in recorded order (or seeded-shuffled with reorderSeed).
  deliveries() {
    let ds = this.fixture.steps.filter(s => s.kind === 'webhook-delivery');
    const seed = this.injection.reorderSeed ?? this.fixture.replay?.reorderSeed;
    if (seed !== undefined && seed !== null) {
      const rand = mulberry32(seed);
      ds = ds.slice();
      for (let i = ds.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [ds[i], ds[j]] = [ds[j], ds[i]];
      }
    }
    return ds.map(s => {
      const d = { ...s.delivery, stepId: s.id };
      if (d.signature === 'valid') {
        d.computedSignature = 'sha256=' + createHmac('sha256', this.signatureKey)
          .update(canonicalize(d.body), 'utf8').digest('hex');
        d.headers = { ...(d.headers || {}), 'x-hub-signature-256': d.computedSignature };
      }
      return d;
    });
  }

  // Fixture digest check: recompute over canonical bytes, fail closed on drift.
  verifyDigest() {
    const f = this.fixture;
    const canonical = canonicalize({
      fixtureId: f.fixtureId, fixtureVersion: f.fixtureVersion,
      steps: f.steps, expect: f.expect, recordSchema: f.recordSchema || null,
    });
    const digest = 'sha256:' + sha256hex(canonical);
    const recorded = f.capture?.sourceDigest;
    if (!recorded || recorded === 'sha256:COMPUTED-BY-RUNNER') {
      return { ok: true, computed: digest, note: 'digest not yet pinned; computed ' + digest };
    }
    return { ok: recorded === digest, computed: digest, recorded };
  }

  pinDigest() {
    const v = this.verifyDigest();
    this.fixture.capture.sourceDigest = v.computed;
    return v.computed;
  }
}
