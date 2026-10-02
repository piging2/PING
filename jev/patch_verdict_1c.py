"""Verdict-authority fix, patch 1c: simplify REPLAY_COMPLETED provenance check.

The genuine ReplayWorker emits three shapes (ok / no_provider / kernel_error);
none sets replay.status consistently. Enumerating statuses would reject
genuine failure-honest paths. The authority proof is source === 'replay'
(only the worker's _emit can produce it); the provenance shape check only
needs a well-formed replay record. The witness applies the full evidence
qualification for attestation.
"""
path = 'ping-runtime/events/unified_event_runtime.js'
with open(path) as f:
    text = f.read()

old = """    case 'REPLAY_COMPLETED': {
      const r = p.replay;
      return !!r && typeof r === 'object'
        && typeof r.verified === 'boolean'
        && (r.status === 'ok' || r.status === 'no_provider' || r.status === 'kernel_error');
    }"""
new = """    case 'REPLAY_COMPLETED': {
      // The genuine ReplayWorker emits ok / no_provider / kernel_error shapes;
      // all carry a boolean verified. The authority proof is the source check
      // above (only the worker's _emit stamps source 'replay'); this is a
      // well-formedness check, not an evidence gate — the witness qualifies
      // evidence before attesting.
      const r = p.replay;
      return !!r && typeof r === 'object' && typeof r.verified === 'boolean';
    }"""
assert text.count(old) == 1, "provenance anchor not found"
text = text.replace(old, new)
with open(path, 'w') as f:
    f.write(text)
print("provenance check simplified")
