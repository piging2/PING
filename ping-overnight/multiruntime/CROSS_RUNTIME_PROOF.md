# Cross-Runtime Proof (Track G)

**Date**: 2026-09-16/17 overnight sprint.
**Claim under test**: "one authority, many runtimes" for a real JS + Python
execution: canonical event -> mission -> scheduler -> WorkerRuntime ->
Python adapter -> real Python execution -> structured result -> canonical
result event -> evidence, with every identifier preserved.
**Harness**: `/home/nolan/ping/worktrees/oracle-assembly/multiruntime-proof/`
(uncommitted proof code in the main worktree; the runtime source authority
branch was read-only forensics, never patched).

## 1. What was executed

ONE harmless real Python capability: `python.canonical_hash`
(`multiruntime-proof/capabilities/ping_canonical_hash.py`). It reads
`{"text": ...}` from stdin and returns the sha256 of the canonical JSON bytes
computed with the repo's OWN `tools/execution/envelope.py canonical_bytes`.
Pure computation: no filesystem, network, or process I/O beyond stdin/stdout;
no secrets; no side effects. Transport: the EXISTING, UNMODIFIED
`tools/execution/runner.py` + `envelope.py` (spawned via execFile, request on
stdin, result envelope on stdout).

Driver: `multiruntime-proof/run_proof.mjs`. Result: exit 0, 34/34 assertions
PASS, `FULL CHAIN VERIFIED`.

## 2. Identifier trace (captured live)

| Identifier | Value |
|---|---|
| principal | `multiruntime-proof-harness` |
| namespace | `core::system` |
| correlation_id | `135596e26a4d6325244d3fb0b531660ff3260f49c95da11e478e94842068f675` |
| E1 `PYTHON_CAPABILITY_VERIFY` | `135596e26a4d6325244d3fb0b531660ff3260f49c95da11e478e94842068f675` (root; correlation_id = own event_id per the bridge rule) |
| E2 `MISSION_CREATED` | `09620af22ae861f5020c69d287399fbc1107a58b66ecf294e51e89f2c64ff042` |
| mission_id | `3b3a4270a0f9eeb4` (type=`PYTHON_CAPABILITY_RUN`; deterministic `sha256(missionType:event_id)[0:16]`) |
| E3 `MISSION_ASSIGNED` | `e5499d90825afd593947265fddc85568424e4b3ea465ee8e6610514003de29dd` (assigned to `python-worker`, attempt 1) |
| task_id (work identity) | `f3d07d36d5d45615` (deterministic `sha256('task:'+mission_id+':python-worker:attempt1')[0:16]`) |
| worker_id | `python-worker@Pig` |
| capability | `python.canonical_hash` |
| E4 `TASK_STARTED` | `ca0d3b3cdc03a135ec3dfc585353111b3d091910a9514b0f04e61ae1b79f0860` |
| E5 `TASK_COMPLETED` | `36f9056c789cf4b878089b08db680d6d0d710e53488223d8c68962525e9d4a27` |
| E6 `EVIDENCE_RECORDED` | `4c20e93c3024fda2141a7989a91b2d158ef6dd7582fe0358c66705ae5ad96ae1` (evidence_id=`5e08c69ee32f6b20`) |
| E7 `MISSION_COMPLETED` | `d32341ea08737fd4bcd8871d427639110c4be1d5dccb9be4dc5ad30a1686624b` |
| ExecutionRequest replay anchor (request_hash) | `f457b331ef70b104f73a4ae6e1e3a58faf0b88a432ce6a4f3356087d09efe1ab` |
| script_hash | `a8741cbe3ab2f8280b82c0fe9fcd6e65e9ae3d214604c6479b13154ee4ef8304` |
| content_hash (capability output) | `f93b364274eeb76cf8ddca51ec204498250e5814d33b6b5404a62142cdd8cd74` |
| capability result (canonical_sha256) | `fbc784801a0f39288d72c3f99643b67580d22fef9c66653aef8f31f3e0283863` (byte_length=59) |
| execution_host | `Pig` |
| events recorded | 7, deduplicated 0; record: `multiruntime-proof/proof-events.jsonl` |

## 3. Traceability assertions (all PASS)

- **Causation chain**: E2.causation=E1, E3.causation=E2, E4.causation=E3,
  E5.causation=E4, E6.causation=E5, E7.causation=E5. Unbroken.
- **Correlation**: all of E2..E7 carry `correlation_id = E1`.
- **Determinism**: every event_id recomputed from its identity material
  (`eventType, source, namespace, logical_id`) using the UnifiedEventRuntime
  rule reproduces the recorded id, byte for byte. `mission_id` and `task_id`
  recompute identically.
- **Cross-runtime canonicalization**: the sha256 Python computed over
  `envelope.canonical_bytes` was independently recomputed in JS from the same
  canonical JSON rule and matches exactly
  (`fbc784801a0f3928...`). JS and Python are byte-identical on identity
  material, which is what makes deterministic cross-runtime ids possible.
- **No phantom completion**: dispatch matched exactly one worker on
  `eventTypes`; a null dispatch would have skipped, not completed.
- **Transport honesty**: the result envelope carries the structural
  no-authorization marker; the adapter asserted the transport performed no
  authorization and bound the envelope to the task via `command_id == task_id`.
- **Mission terminal state**: `completed`, result stored; dead-letter list
  empty.

## 4. Honest PARTIAL edges (what the proof does NOT yet cover)

1. **Persistence is harness-local.** Events append to a JSONL file and mission
   state lives in memory. Production uses `UnifiedEventRuntime` -> Postgres
   `ping_events` and `MissionRuntime` -> `ping_missions`. The identity,
   causation, and dedup rules are the production rules; the storage backend is
   the stand-in. No new production event authority was created.
2. **Scheduler is synchronous.** The proof drives one poll cycle inline; the
   production `MissionScheduler` poll loop, lease renewal, reaper, and
   `maxConcurrent` backpressure were not exercised.
3. **One capability, one attempt, no retry path.** The retry/dead-letter
   mapping is designed and unit-shaped in the adapter (`retryable` flags) but
   no failure was injected in this run.
4. **Direct subprocess transport.** The proof spawns `runner.py` locally; the
   remote Pig/WSL ship mechanisms (`client.py` remote/pig transports) carry the
   same envelope bytes but were not exercised here.
5. **No concurrent missions.** Ordering/idempotency under concurrency is
   asserted by design (deterministic ids + dedup), not by load.

## 5. Reproduction

```bash
ssh -F ~/.ssh/pig-config pigwsl 'wsl -d Ubuntu -- bash -s' <<'EOF'
cd /home/nolan/ping/worktrees/oracle-assembly/multiruntime-proof
rm -f proof-events.jsonl
node run_proof.mjs
EOF
```

Expected: exit 0, `FULL CHAIN VERIFIED`, 7 events in `proof-events.jsonl`.
Any traceability failure exits 3 with the exact failing assertion named
(PARTIAL, not silent).
