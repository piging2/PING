"""Narrow replay-payload-precedence fix. Runs ON THE PIG in the jev-surgical worktree.

Edits (exact-match, asserted counts):
 1. ping-runtime/workers/canonical_workers.js
    - ReplayWorker constructor: add _allowPayloadTranscript (system metadata).
    - _buildReplayEvents: gate payload.replay_events on the flag; ignore
      unauthorized caller transcripts (inert data, never executed).
    - _buildAuthorityEvidence: event row namespace outranks metadata namespace.
    - Docstring: clarify authorized-harness usage.
 2. gateway/test_replay_worker_wiring.js: mark legitimate harness constructors
    with allowPayloadTranscript: true.
 3. gateway/test_verdict_authority.js: golden-path worker gets the flag.
 4. evals/constitutional-runtime/EVAL-009_replay_convergence.js: harness gets the flag.
Writes: gateway/test_replay_precedence.js is transferred separately.
"""
import os
import sys

ROOT = '/home/nolan/ping/worktrees/jev-surgical'


def edit(path, old, new, expect=1):
    with open(path) as f:
        content = f.read()
    count = content.count(old)
    if count != expect:
        print('MISMATCH %s: found %d, expected %d' % (path, count, expect))
        print('--- searched for ---')
        print(old[:200])
        sys.exit(1)
    with open(path, 'w') as f:
        f.write(content.replace(old, new))
    print('OK %s (%d replacement%s)' % (path, expect, '' if expect == 1 else 's'))


# --- 1a. constructor: system-metadata authorization flag ----------------------
edit(
    os.path.join(ROOT, 'ping-runtime/workers/canonical_workers.js'),
    """    // The kernel replay execution provider — injected by registerCanonicalWorkers
    // or by test harness. When absent, replay is a no-op (verified: false).
    this._replayProvider = options.replayProvider || null;""",
    """    // The kernel replay execution provider — injected by registerCanonicalWorkers
    // or by test harness. When absent, replay is a no-op (verified: false).
    this._replayProvider = options.replayProvider || null;
    // SECURITY: explicit test-harness authorization for caller-supplied
    // transcripts. Worker construction options are system metadata — no event
    // payload can ever set this. Production workers are constructed without
    // it and always resolve the authoritative correlation group from the
    // canonical store.
    this._allowPayloadTranscript = options.allowPayloadTranscript === true;""",
)

# --- 1b. docstring: authorized-harness usage ---------------------------------
edit(
    os.path.join(ROOT, 'ping-runtime/workers/canonical_workers.js'),
    """   * store via UnifiedEventRuntime.getCorrelationGroup (deterministic created_at
   * ASC ordering from the existing schema).
   * In tests, this constructs events directly.""",
    """   * store via UnifiedEventRuntime.getCorrelationGroup (deterministic created_at
   * ASC ordering from the existing schema).
   * In authorized test harnesses (allowPayloadTranscript), events may be
   * supplied directly via payload.""",
)

# --- 1c. _buildReplayEvents: precedence flip ---------------------------------
edit(
    os.path.join(ROOT, 'ping-runtime/workers/canonical_workers.js'),
    """    // If events are provided in payload (test mode), use them directly
    if (Array.isArray(payload.replay_events) && payload.replay_events.length > 0) {
      return payload.replay_events;
    }""",
    """    // SECURITY INVARIANT: caller payload is DATA, never authority.
    // A caller-supplied transcript (payload.replay_events) may be executed
    // ONLY when the worker was explicitly constructed with test authorization
    // (system metadata at construction, unreachable from any event payload).
    // Production always resolves the authoritative correlation group from the
    // canonical store. An unauthorized caller transcript is ignored — it stays
    // inert data on the original event row and is never replayed.
    const callerTranscript = payload.replay_events;
    if (Array.isArray(callerTranscript) && callerTranscript.length > 0) {
      if (this._allowPayloadTranscript === true) {
        return callerTranscript;
      }
      console.warn('[ReplayWorker] ignoring caller-supplied replay_events (no test authorization); resolving authoritative correlation group');
    }""",
)

# --- 1d. evidence namespace: row outranks caller metadata --------------------
edit(
    os.path.join(ROOT, 'ping-runtime/workers/canonical_workers.js'),
    """    const ns = event.metadata?.namespace || event.namespace;""",
    """    // SECURITY: the event row namespace is authoritative execution context;
    // caller-controlled metadata must never outrank it for tenant identity.
    const ns = event.namespace || event.metadata?.namespace;""",
)

# --- 2. wiring tests: mark legitimate harness constructors --------------------
edit(
    os.path.join(ROOT, 'gateway/test_replay_worker_wiring.js'),
    'new ReplayWorker({ eventRuntime, replayProvider: provider })',
    'new ReplayWorker({ eventRuntime, replayProvider: provider, allowPayloadTranscript: true })',
    expect=8,
)

# --- 3. golden path in test_verdict_authority.js ------------------------------
edit(
    os.path.join(ROOT, 'gateway/test_verdict_authority.js'),
    '  const replayWorker = new ReplayWorker({ eventRuntime: grt, replayProvider });',
    '  // Golden-path harness: explicitly authorized to execute the harness-supplied\n'
    '  // transcript (system metadata at construction, not a caller payload field).\n'
    '  const replayWorker = new ReplayWorker({ eventRuntime: grt, replayProvider, allowPayloadTranscript: true });',
)

# --- 4. EVAL-009 harness -------------------------------------------------------
# Only the four provider-backed constructions (the no-provider one at rt5 is
# left untouched; it never executes a transcript).
edit(
    os.path.join(ROOT, 'evals/constitutional-runtime/EVAL-009_replay_convergence.js'),
    'replayProvider: new KernelReplayExecutionProvider() })',
    'allowPayloadTranscript: true, replayProvider: new KernelReplayExecutionProvider() })',
    expect=4,
)

print('ALL EDITS APPLIED')
