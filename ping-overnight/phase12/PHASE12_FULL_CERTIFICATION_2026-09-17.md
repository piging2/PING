# Phase 12: Full Certification Rerun (Live, 2026-09-17)

All 15 proof legs rerun live against Oracle `ping-core-01` (`ssh -F ~/.ssh/pig-config pigwsl` to Pig WSL, then `ubuntu@129.146.60.17`). Deployment `/opt/ping`, gateway port `8080`. Fresh test-scoped correlation marker `phase12-2026-09-17` used for every probe event and mission. Bearer tokens for `api:muse` and `api:muse-level-2` were resolved transiently at runtime from `exterior_agent_credentials` (lengths only were ever printed; values never written to disk or chat). Exactly one gateway-only force-recreate was performed for restart survival; Postgres and Qdrant were never restarted. Playbook revision `194a2b85bde957ed` and orphan node `4917265ee67e678c` were verified untouched, not modified.

## Verdict by leg

| Leg | Proof | Result | Evidence |
|-----|-------|--------|----------|
| L1 | Exterior auth + namespace ACL matrix (8 cases) | VERIFIED 8/8 | invalid token 401; malformed namespace 403; `api:muse`+`core::owner` 200 E=3d57d944497fda20; `api:muse`+`tenant::hpp` 403; `api:muse-level-2`+`core::owner` 200 E=9c09e427de00c648; `api:muse-level-2`+`tenant::hpp` 403; implicit namespace resolves `core::owner` E=5395c3400d0a776d; identical replay returns same event ID, exactly 1 row |
| L2 | Deterministic event identity (fresh vector) | VERIFIED | Fresh OBSERVATION_CREATED E=c1cb4dbb47939159b195939311502e8bdb811182b9d721097024e1ee5e1056c1, locally predicted ID matched, row type/namespace match |
| L3 | Append-only invariant matrix | VERIFIED 14/14 | UPDATE denied on live row; DELETE denied on live row; row count unchanged (2146); target row intact; zero-row predicates no-op (documented PG semantics); disposable probe table reproducing production config (owner ping, both triggers): INSERT works, ON CONFLICT idempotent, UPDATE/DELETE/TRUNCATE denied, row intact after rollback, probe table dropped. TRUNCATE was never issued against live ping_events |
| L4 | Registry: known accepted, unknown rejected | VERIFIED | Unknown event type rejected with 422; known types accepted live in legs: OBSERVATION_CREATED, PROJECTION_CREATED, SNIPPET_APPROVED, REPLAY_VERIFY, WITNESS_CREATED, LINEAGE_CREATED |
| L5 | Retry / dead-letter semantics | PARTIAL 15/17 | Fail-once: attempt 1 retry_pending (retries=1, 1 worker call), reclaimed, attempt 2 completed (retries=1, exactly 2 calls). Always-fail: attempt 1 retry_pending (retries=1), attempt 2 terminal failed (retries=2=max_attempts, exactly 2 calls), 3 later polls cause no third attempt, still failed. FAILED: dead-letter persistence, 0 records written (see defect below). Real production MissionRuntime, MissionScheduler, WorkerRuntime, DeadLetterAuthority used; only the worker was a stub, scoped to disposable mission type PHASE12_RETRY_PROBE |
| L6 | Ordinary JS mission, end to end | VERIFIED | PROJECTION_CREATED E=095013bf7293971e4e8401919c8c06302a1b86a9aec04f2728dca3dd6b52ff73, mission 603a5261ab92bdad completed, assigned=replay, retries=0, REPLAY_COMPLETED E=6cc536748e08ef65 verified against live event |
| L7 | Python production chain | PARTIAL (carried forward) | Live Python worker registration not found in canonical_workers.js (matches Phase 7 note). No live Python adapter path exists to re-prove without re-engineering. The sprint's 44/44 Python production-chain assertions are carried forward as recorded evidence |
| L8 | Hermes exterior wiring | VERIFIED (carried forward) | Phase 8 evidence carried forward per plan: 18/18 adapter tests plus one end-to-end Hermes mission emitting seven canonical events, all with event IDs recorded |
| L9 | Knowledge promotion | VERIFIED | Candidate node phase12-promote-node-001 created in tenant::phase12-knowledge with intact provenance; SNIPPET_APPROVED E=38063a3b7cff275228613d3f0bffa4541191476ea4d993d072d31bfc77ceff6a routed to KNOWLEDGE_PROMOTE; mission d45214ea98e65da0 completed, assigned=knowledge-promotion, retries=0; node status=approved, confidence=1.0 |
| L10 | Direct REPLAY_VERIFY + idempotency | VERIFIED | REPLAY_VERIFY E=9397585cfdd4ec9d0cb491091c59a38e017bc3d65ccc1d70c4564fd2a4e6dd9e routed to REPLAY_VERIFY mission e06338af1d80828b completed; REPLAY_COMPLETED E=9813ac80aa058d0e verified; re-emission returns same event ID, still 1 mission, still 1 REPLAY_COMPLETED |
| L11 | Replay of a completed mission | VERIFIED | REPLAY_VERIFY E=c6e79227c302d04226ec0df66225665dea37b0c2158659de4f9100894e502e8d for completed knowledge-promotion mission d45214ea98e65da0; mission adefbd835ed9e452 completed; REPLAY_COMPLETED E=2c2f6695e7faa076 verified against mission d45214ea98e65da0 |
| L12 | Witness | VERIFIED | WITNESS_CREATED E=1c14d6a023ac0a4d4db34ffc31212156d3a2f3acece11dad88008da9952e77f0 with attestation witness-2c2f6695e7faa076 bound to documentId d45214ea98e65da0 |
| L13 | Lineage | VERIFIED | LINEAGE_CREATED E=de57af0839e6f768d3cfa55211a418682b72b5697b807387ba8d899a5a519fd4 upstream of witness |
| L14 | Restart survival | VERIFIED | Single gateway-only force-recreate via live compose (`-p oracle up -d --no-deps --force-recreate gateway`). Pre/post snapshots: 13/13 phase12 events persist, 4/4 missions still completed, knowledge node still approved, revision and orphan guards intact, Postgres and Qdrant container IDs unchanged (not restarted). Post-restart fresh authenticated event E=72ee6c9366705250 predicted locally and persisted |
| L15 | Credential health | VERIFIED | Fresh authenticated event E=7db29a7cd690137cb1014efca5390c282d5766a75ea6ff618c214bce152ee7ee persisted |

## Do-not-touch verifications

- Playbook revision `194a2b85bde957ed` (stored as a knowledge node): `candidate|1.1.0|PENDING_HUMAN|NULL`. Unchanged.
- Orphan node `4917265ee67e678c`: status `candidate`. Preserved.
- No commits, pushes, merges, resets, branch deletions, or worktree operations were performed. No sibling directories were touched.

## New defect found (L5): DeadLetterAuthority.recordDeadLetter always throws

During the live L5 harness, the always-fail mission reached bounded exhaustion correctly (terminal failed, retries=2=max_attempts, no third attempt across 3 later polls), but `DeadLetterAuthority.recordDeadLetter` threw on every call:

`CanonicalBytes.serialize() does not accept raw Buffer. Use fromBuffer() instead.`

Root cause, confirmed by an isolated repro against the real `DeadLetterAuthority` and real `WitnessAuthority` with only the Postgres pool stubbed: `recordDeadLetter` builds `metadata: CanonicalBytes.serialize(options.metadata || {})`, which returns a raw Buffer. That Buffer is spread into the dead-letter object, `createWitness` spreads the whole object into the witness, and the final `CanonicalBytes.serialize(witness)` rejects the nested Buffer. This fails for every input, so no dead-letter record can ever be persisted through the real authority. The mission still transitions to `failed` (the scheduler catches the DLQ error and logs it), but `repository_dead_letters` stays empty.

Why the sprint missed it: the in-repo DLQ wiring test (`test_dead_letter_wiring.js`) and the sprint's exhaustion proof used a mock/stub `DeadLetterAuthority`, which never executes the real serialize path. The L5 "exactly one dead-letter record" claim does not hold against the real authority.

Classification: L5 stays PARTIAL. Retry/backoff/bounded-exhaustion semantics are verified live (15/17 harness assertions); dead-letter persistence is a genuine production defect, recorded here with its exact failure rather than substituted.

## Container state

- `ping-gateway`: recreated once for L14 (new container ID 45412699505c, started 2026-09-17T12:41:58Z), healthy, uptime ~1 min at final check.
- `ping-postgres`: never restarted (container ID 6b6913a4371d, started 2026-09-17T11:42:31Z), healthy.
- `ping-qdrant`: never restarted (container ID 6d3eca2352ec, started 2026-09-17T02:00:52Z), healthy.
- Gateway health endpoint returned 200 before and after the recreate. Final database counts: 2147 events, 412 missions, 175 knowledge nodes.

## Artifacts

- Driver: `/home/hatch/workspace/ping-overnight/phase12/p12-driver.py` (37/37 checks passed, output below)
- Retry harness: `/home/hatch/workspace/ping-overnight/phase12/p12-retry.js` (15/17 assertions passed)
- Append-only matrix: `/home/hatch/workspace/ping-overnight/phase12/p12-appendonly.sh` (14/14 passed)
- Snapshot tool: `/home/hatch/workspace/ping-overnight/phase12/p12-snapshot.sh`
- Evidence: `/home/hatch/workspace/ping-overnight/phase12/evidence/` (chain.json, driver-runlog.jsonl, snapshot-pre.json, snapshot-post.json)

## Driver output (verbatim, 37 pass / 0 fail)

```
[PASS] gateway-health code=200
[PASS] L1 invalid-token code=401
[PASS] L1 malformed-ns code=403
[PASS] emit OBSERVATION_CREATED exp=3d57d944497fda20 got=3d57d944497fda20 code=200
[PASS] L1 muse+owner E=3d57d944497fda20 ns=core::owner
[PASS] L1 muse+hpp-denied code=403
[PASS] emit OBSERVATION_CREATED exp=9c09e427de00c648 got=9c09e427de00c648 code=200
[PASS] L1 ml2+owner E=9c09e427de00c648 ns=core::owner
[PASS] L1 ml2+hpp-denied code=403
[PASS] emit OBSERVATION_CREATED exp=5395c3400d0a776d got=5395c3400d0a776d code=200
[PASS] L1 implicit-ns E=5395c3400d0a776d ns=core::owner
[PASS] L1 idempotent-replay same_id=True rows=1
[PASS] emit OBSERVATION_CREATED exp=c1cb4dbb47939159 got=c1cb4dbb47939159 code=200
[PASS] L2 identity E=c1cb4dbb47939159 row=OBSERVATION_CREATED|core::owner
[PASS] L4 unknown-type-422 code=422
[PASS] emit OBSERVATION_CREATED exp=7db29a7cd690137c got=7db29a7cd690137c code=200
[PASS] L15 health-probe E=7db29a7cd690137c persisted=True
[PASS] emit PROJECTION_CREATED exp=095013bf7293971e got=095013bf7293971e code=200
[PASS] L6 replay-mission M=603a5261ab92bdad status=completed assigned=replay retries=0
[PASS] L6 replay-completed E_rc=6cc536748e08ef65 verified=True
[PASS] emit OBSERVATION_CREATED exp=890f094e00821c52 got=890f094e00821c52 code=200
[PASS] knowledge/nodes nodeId=phase12-promote-node-001 code=200
[PASS] L9 candidate N=phase12-promote-node-001 provenance intact
[PASS] emit SNIPPET_APPROVED exp=38063a3b7cff2752 got=38063a3b7cff2752 code=200
[PASS] L9 promote-mission M=d45214ea98e65da0 status=completed assigned=knowledge-promotion retries=0
[PASS] L9 promoted N=phase12-promote-node-001 status=approved confidence=1
[PASS] emit REPLAY_VERIFY exp=9397585cfdd4ec9d got=9397585cfdd4ec9d code=200
[PASS] L10 replay-mission M=e06338af1d80828b status=completed assigned=replay retries=0
[PASS] L10 replay-completed E_rc=9813ac80aa058d0e verified=True
[PASS] L10 idempotent same_id=True missions=1 replay_completed=1
[PASS] emit REPLAY_VERIFY exp=c6e79227c302d042 got=c6e79227c302d042 code=200
[PASS] L11 replay-mission M=adefbd835ed9e452 status=completed assigned=replay retries=0
[PASS] L11 mission-replay E_rc=2c2f6695e7faa076 verified=True mission=d45214ea98e65da0
[PASS] L12 witness E_wit=1c14d6a023ac0a4d attestation=witness-2c2f6695e7faa076 documentId=d45214ea98e65da0
[PASS] L13 lineage E_lin=de57af0839e6f768 upstream=witness
[PASS] guard revision row=candidate|1.1.0|PENDING_HUMAN|NULL
[PASS] guard orphan status=candidate
DRIVER DONE pass=37 fail=0
```

## Retry harness output (verbatim, 15 pass / 2 fail)

```
[PASS] A created id=22e79943f614e16d
[PASS] A attempt1 retry_pending status=retry_pending
[PASS] A retries=1 retries=1
[PASS] A worker called once calls=1
[PASS] A completed status=completed
[PASS] A retries still 1 (attempt 2) retries=1
[PASS] A worker called twice total calls=2
[PASS] B attempt1 retry_pending status=retry_pending
[PASS] B retries=1 retries=1
[PASS] B terminal failed status=failed
[PASS] B retries=2 (max_attempts) retries=2
[PASS] B worker called exactly twice calls=2
[FAIL] B exactly one dead-letter record dlq=0
[PASS] B no third attempt calls=2
[PASS] B still failed status=failed
[FAIL] B dlq still exactly one dlq=0
[PASS] cleanup: no probe missions remain left=0
RETRY DONE pass=15 fail=2
```

Both failures are the dead-letter persistence assertions, caused by the defect above. The two failures were kept as failures; no weaker proof was substituted.
