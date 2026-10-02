# RECON-F: Adversarial Audit of the Rogue Witness Branch
**Date:** 2026-09-19 (read-only audit; no source edits, no commits, no checkouts, no merges, no deletions)
**Auditor scope:** adversarial, read-only. All evidence via `git show`, `git ls-tree`, `git log`, `git grep` from safe worktrees. The rogue branch was never checked out.

## 0. Branch identity and location (PUBLIC_GITHUB vs LOCAL_BRANCH vs LOCAL_WORKTREE vs LIVE_RUNTIME)

**Branch name:** `feature/mission-control-truth`
**SHA:** `016bdc5fd5ea2697e8a51d86ac3de280b9cbfb04` (short `016bdc5f`)
**Tip commit:** `016bdc5f` "feat(witness): compute deterministic witness root from replay result; include in REPLAY_EXECUTED and WITNESS_CREATED events; remove witness_id; add determinism test" (2026-09-18 18:44:16 -0600)
**Parent:** `6e359a268d08ea0910bb0e3283bed15681c6b24f` ("constitutional(cleanup): archive obsolete authority, graph, and constitution engines")

Location verdict:

| Plane | Present? | Evidence |
|---|---|---|
| PUBLIC_GITHUB (`ngesk2/crx-runtime`) | NO | GitHub API branch list shows 13 branches; `feature/mission-control-truth` is absent. `git ls-remote origin` in WSL confirms. |
| LOCAL_BRANCH (WSL `/home/nolan/ping`) | NO | `git branch -a` and `git for-each-ref` show no such ref; exhaustive `git log --all -S` searches for the signature find nothing. |
| LOCAL_BRANCH (Windows `/mnt/c/Users/nolan/ping`) | YES | `git branch -a` lists `* feature/mission-control-truth` (currently checked out). |
| LOCAL_BRANCH (Windows `/mnt/c/Users/nolan/PING`) | YES | Same branch, also checked out (`*`). The two Windows clones appear to be copies. |
| LOCAL_WORKTREE (any `/home/nolan/ping/worktrees/*` or `/home/nolan/worktrees/*`) | NO | All worktrees checked; none on this branch. |
| LIVE_RUNTIME | NO EVIDENCE | The code is not importable (see section 3): `kernel/event_dispatcher.py` source and `repository_client.py` source are absent from the branch tree. No runtime trace collected per read-only law. |

**Base divergence (critical context):** the rogue branch is NOT a delta from the ratified `constitutional-convergence-v2` (84da2d40c). Its parent `6e359a26` is from the old constitutional-recovery era. It is a divergent line that reinvents the witness pipeline in Python with a different event vocabulary (`REPLAY_EXECUTED` instead of `REPLAY_COMPLETED`, `CLAIM_GENERATED` trigger instead of `REPLAY_VERIFY`/`PROJECTION_CREATED`). Any merge would collide with the entire ratified witness construction, not just the two 2026-09-18 commits.

## 1. Constitutional ownership: what moved, and where it went

**Ratified ownership (constitutional-convergence-v2 @ 84da2d40c):** witness-root computation is owned by the Replay Authority's kernel: the Merkle `WitnessAuthority` class in `gateway/replay/kernel/witness_authority.js` (12-leaf live artifact; 13-leaf TS source at `runtime/kernel/replay/witness_authority.ts`), invoked via `KernelReplayExecutionProvider`. The JS `WitnessWorker` in `ping-runtime/workers/canonical_workers.js` does NOT compute roots; it binds the provider-computed `payload.replay.witness_root` into `WITNESS_CREATED` behind fail-closed gates. Witness computation is proof-content computation owned by replay authority; the worker is a binder, not a minter.

**Rogue ownership (016bdc5f):** witness-root computation now lives in `workers/replay_worker.py:33`, function `compute_witness_root(claim_id: str, replay_result: Dict[str, Any]) -> str`:

```python
data = {
    'claim_id': claim_id,
    'replay_success': replay_result.get('replay_success'),
    'state_snapshot': replay_result.get('state_snapshot')
}
json_str = json.dumps(data, sort_keys=True)
return hashlib.sha256(json_str.encode('utf-8')).hexdigest()
```

(`git show 016bdc5f -- workers/replay_worker.py`, lines 33-45 of the new file.)

The verdict is **both**: the move makes replay own witness computation AND it duplicates it. Three copies exist on the branch:
1. `workers/replay_worker.py:33` (`def compute_witness_root`), the "canonical" copy, owned by the replay worker.
2. `workers/witness_worker.py:16` (`from workers.replay_worker import compute_witness_root`) plus a fallback recompute at lines 44-47: if `replay_result` lacks `witness_root`, the witness worker recomputes it itself. So the witness worker both depends on the replay worker's function and duplicates the computation as a fallback.
3. `tests/test_witness_determinism.py:9`, a third, local copy of the identical function inside the test file. The test does not import the production function.

This is the exact anti-pattern the constitutional order forbids: witness-root computation is no longer a single-authority proof-content computation. It is a utility function living in the replay worker module, imported across the worker boundary, with a fallback duplicate and a test duplicate. Any drift between the three copies is silent.

## 2. Event contract changes (exact)

The rogue branch introduces a parallel event vocabulary disconnected from the governed set (`REPLAY_COMPLETED` / `WITNESS_CREATED` as bound on the ratified head). All evidence from `git show 016bdc5f`.

### REPLAY_EXECUTED (new event type, emitted by rogue replay worker)
- `event_type='REPLAY_EXECUTED'`, `aggregate_id=claim_id`, `aggregate_type='claim'` (`workers/replay_worker.py`, emit call).
- `event_data` fields: `claim_id`, `original_claim_event_id`, `replay_result`, `verified`.
- `replay_result` fields: `claim_id`, `replay_success` (hardcoded `True`), `replay_timestamp` (`None`), `state_snapshot` (hardcoded `{}`), `verification_status` (`'pending'`), `witness_root` (added post-hoc).
- `verified` is hardcoded `False` in the emitted event data.
- Ratified `REPLAY_COMPLETED` carries `payload.replay.{verified, witness_root, fingerprint, reason, event_count}` plus `replay_id` / `authority.canonical_input_hash`. The rogue `REPLAY_EXECUTED` carries none of: fingerprint, input identity, event count, reason, version bindings.

### WITNESS_CREATED (same name, different contract)
Rogue payload (`workers/witness_worker.py`, `witness_event_data`):
- Added: `claim_id`, `witness_root`, `witness_signature`, `original_replay_event_id`, `verified`.
- `witness_signature = f"sig_{witness_root[:8]}"`, a fabricated placeholder, not a signature over anything.
- `verified = replay_result.get('verification_status') == 'verified'`, always `False` on this branch, because the replay worker hardcodes `verification_status='pending'`. The branch therefore persists attestations that are permanently unverified.
- `aggregate_id=witness_root`, `aggregate_type='witness'`, a new identity scheme: the content hash is used as the aggregate ID.
- Dropped relative to ratified `WITNESS_CREATED`: `payload.witness.documentId`, `payload.witness.eventType`, `payload.witness.replay_fingerprint`, `payload.witness.timestamp`, `payload.witness.attestation`, `payload.upstreamEventId`, and the entire metadata envelope (`namespace`, `correlation_id`, `causation_id`, `confidence`). No canonical event identity scheme; no correlation/causation envelope.

### New ungoverned event types
- `CLAIM_REPLAYED` and `REPLAY_WITNESSED`: returned as summary `Event` objects from the handlers (`event_id = str(event.event_id) + "_processed"`). These event types exist nowhere in the governed event set.
- `witness_id`: removed entirely (per commit message "remove witness_id").

### Version fields
- None. No `witness_algorithm`, `witness_version`, `leaf_count`, `tree_height`, `engine_version`, schema/replay/policy/canonicalization/hash versions anywhere in the emitted payloads. (Note: the ratified head also drops most of these before emission, but it computes them; the rogue branch never computes any of them.)

## 3. Persistence removed (and what died with it)

The rogue commit adds three files and deletes none, so "removed" must be read as what the new pipeline drops relative to the witness persistence surfaces on its base and on the ratified head:

1. **`witness_id` identity removed.** The commit message says "remove witness_id" explicitly. The only identity the branch mints is `aggregate_id=witness_root`. A content hash of simulated data is not a stable witness identity: the same claim reprocessed yields the same root (fine), but there is no witness-scoped identity for lookup, correlation, or revocation, and the root attests to nothing (see section 5).
2. **No witness-specific store write.** The witness worker comment states the design: "Store witness via RepositoryAuthority (as a canonical event, not a separate table)" (`workers/witness_worker.py`). On the branch's base (`6e359a26`), `constitutional-compiler/packages/postgres/witness_store.ts` defines a `witness_store` table (`replay_id, event_count, sha256, canonical_hash, projection_hash, identity_hash, relationship_hash, timeline_hash, knowledge_hash, duration_ms, storage_bytes`) and `certification/hashes/witness_roots.txt` exists. The new Python chain bypasses all of it. Durability guarantees that die with the bypass: replay-keyed witness lookup (`getByReplayId`), the multi-hash witness record (sha256, canonical_hash, projection_hash, identity/relationship/timeline/knowledge hashes), and the certification hash log.
3. **The emit path itself is dead.** `workers/replay_worker.py` and `workers/witness_worker.py` both `import repository_client` and `from kernel.event_dispatcher import Event, EventHandler`, but `git ls-tree -r` on the branch shows neither `repository_client.py` nor `kernel/event_dispatcher.py` source exists in the tree (only stale `__pycache__/*.cpython-311.pyc` artifacts, identical to the parent's). The imports cannot resolve; `emit_event` catches all exceptions and returns `None`. So even the "canonical event" persistence the branch claims is unreachable. Nothing the branch adds can persist anything.

## 4. Preimage vs the ratified Witness construction

### Ratified preimage (live, `gateway/replay/kernel/witness_authority.js` @ 84da2d40c)
12-leaf Merkle tree (13 in the TS source at `runtime/kernel/replay/witness_authority.ts`, which additionally binds `constitutional_law_commitment`). Verified by `git show constitutional-convergence-v2:gateway/replay/kernel/witness_authority.js` (leaf_id lines 98-169): `canonical_bytes`, `fingerprint`, `lineage`, `state_version`, `schema_version`, `replay_version`, `policy_version`, `canonicalization_version`, `hash_version`, `artifact_count`, `state_contents`, `violations_canonical`, plus metadata `leaf_count`/`tree_height`. Construction: leaves sorted by `leaf_id`; leaf hash EXCLUDES `leaf_id`; domain separation bytes 0x00 (leaf) / 0x01 (parent); duplicate-last-node for odd levels. `canonical_bytes` = base64url of CanonicalJson (JCS-flavored, F7/D1 domain); `fingerprint` = `sha256:<hex>` of those bytes.

### Rogue preimage (`workers/replay_worker.py:33-45` @ 016bdc5f)
`sha256_hex(json.dumps({'claim_id', 'replay_success', 'state_snapshot'}, sort_keys=True).encode('utf-8'))`. Flat hash, not a Merkle tree. No leaf structure, no domain separation, no versioned canonicalization.

### Explicit binding checklist

| Binding | Ratified (live 12-leaf) | Rogue |
|---|---|---|
| Law commitment leaf (`constitutional_law_commitment`) | Absent live (TS-only, 13th leaf); P0 interim invariant | **ABSENT entirely** |
| Replay engine version | `'v1'` default in code; not recorded per-attestation (known gap) | **ABSENT entirely; there is no engine** |
| Input-set identity | `fingerprint` (`sha256:` of canonical event bytes), `event_count` on REPLAY_COMPLETED | **ABSENT**; `state_snapshot` is hardcoded `{}` in the only code path |
| Canonicalization version | CanonicalJson `v1` code default (leaf carries `'1.0'` literal; known gap) | **ABSENT**; uses Python `json.dumps` defaults (whitespace separators, no NaN/Infinity rejection, no depth limit, no version) |
| Policy/invariant binding | `violations_canonical` leaf over 4 code invariants | **ABSENT** |
| Lineage binding | `lineage` leaf | **ABSENT** |
| Replay boundary | Single-event stopgap, documented (known gap) | **No replay at all**: `handle_claim_generated` "simulates" replay with hardcoded values ("For now, this is a minimal implementation", "In production, this would call DeterministicReplayEngine") |
| Hash algorithm binding | sha256 code default; leaf says `'sha256'` | sha256, unversioned, undeclared |

**Verdict:** the rogue preimage matches the ratified construction in nothing except the choice of sha256 as the hash function. It binds an aggregate identifier (`claim_id`), a hardcoded boolean, and an empty dict. It does not bind the law commitment leaf, the replay engine version, or the input-set identity. It is not a witness root in the constitutional sense; it is a checksum of three nearly-constant values.

## 5. Determinism vs correctness

`compute_witness_root` IS deterministic: same dict in, same sha256 out, and `sort_keys=True` makes key order stable. The committed test proves exactly this and nothing more.

Determinism does not prove any of the following, and the branch provides none of them:
- **Correct replay boundary:** there is no replay. The only production code path hardcodes `replay_success=True`, `state_snapshot={}`, `verification_status='pending'`. The root is `sha256({"claim_id": <id>, "replay_success": true, "state_snapshot": {}})` for every claim. It attests to the claim_id and nothing else.
- **Policy commitment:** no law leaf, no invariant set, no policy version.
- **Canonicalization version:** `json.dumps` is not the constitutional canonicalization and carries no version marker. A Python version change in float repr or key sorting would silently change roots.
- **Event set:** no event IDs, no transcript hash, no count. The attested "state_snapshot" is `{}`.
- **Engine version:** there is no engine; `engine_version` does not exist in the branch.

Further falsification of the branch's own claims:
- The test that "proves" determinism tests a **local copy** of the function (`tests/test_witness_determinism.py:9`), not the imported production function. It cannot catch drift between the test copy and `workers/replay_worker.py:33`, and it cannot prove anything about the handler code paths.
- The `witness_signature` (`f"sig_{witness_root[:8]}"`) is a truncated-hash prefix masquerading as a signature. Any verifier treating it as a signature is misled.
- `verified` in the emitted `WITNESS_CREATED` is structurally always `False`, so the branch's witness pipeline can never produce a verified attestation, yet it still emits `WITNESS_CREATED` events.

**Verdict:** determinism is proven for the wrong function of the wrong preimage. It proves nothing about correctness of the replay boundary, policy commitment, canonicalization version, event set, or engine version. A deterministic checksum of constants is still a checksum of constants.

## 6. The original failing test, and the standing process rule

**The test:** `tests/test_witness_determinism.py` (added in 016bdc5f, 99 lines). As committed it is self-contained: it defines its own `compute_witness_root` locally and imports nothing from `workers/`. It cannot fail on an import.

**What drove the placement:** the consumer import is in `workers/witness_worker.py:16`: `from workers.replay_worker import compute_witness_root`. The function was authored directly inside the replay worker module so the witness worker could import it from there, with a fallback recompute in the witness worker (lines 44-47) in case the replay worker "didn't" compute it. The test then duplicates the function rather than importing it. The placement was driven by import convenience along the `replay_worker -> witness_worker` dependency the branch itself created.

**Standing rule application:** "a failing test may expose an architectural defect, but it does not authorize moving constitutional ownership to make the test pass." The defect exposed here was real: witness-root computation had no proper home in this old Python worker lineage. The constitutional home is the Replay Authority's proof-content computation (the Merkle kernel), not the replay worker module. Instead of routing the computation to its owning authority, the branch stuffed it into `workers/replay_worker.py` because that is where the import needed it to be, then duplicated it twice more.

**Verdict: the branch violated the rule.** It treated "the witness worker needs to import this" as authorization to vest witness-root computation in the replay worker, creating a new ownership (replay owns witness computation) plus two duplicate copies. The correct response to the defect would have been to keep computation with the Replay Authority kernel and have both workers consume the provider result, as the ratified construction does.

## 7. Harvestable mechanisms vs never-harvest

### Harvestable (mechanisms only, no authority claims)
1. **Deterministic-root property-test template:** same inputs -> same root; different identity -> different root; timestamp exclusion; database-value exclusion (`tests/test_witness_determinism.py`, test functions `test_witness_determinism_same_inputs`, `..._different_aggregate`, `..._different_fingerprint`, `..._no_timestamp_influence`, `..._no_database_values`). Harvest the PROPERTY SHAPES only, rewritten to `import` the real ratified root function and to use ratified preimages. The timestamp/db-value exclusion properties are genuinely good invariants for any witness root.
2. **Golden vectors idea:** pinning (input -> root) pairs as regression vectors. Harvest the idea; vectors must be generated from the ratified 12-leaf construction, never from the rogue preimage.
3. **Root-forwarding pattern:** computing the root once in the replay result and forwarding it to the witness binder (rather than recomputing). The ratified head already does this via `payload.replay.witness_root`; the pattern is sound, the rogue computation is not.
4. **Negative test:** the branch is a ready-made negative example for the "deterministic but constitutionally wrong" case in reviewer training.

### Must never be harvested
1. The preimage `{claim_id, replay_success, state_snapshot}` and the `sha256(json.dumps(...))` construction. Not a Merkle tree, wrong canonicalization, binds no proof content.
2. The fake `witness_signature = f"sig_{witness_root[:8]}"`. A truncated hash prefix is not a signature and must never appear in witness payloads.
3. The root-as-`aggregate_id` identity scheme. Content hash is not aggregate identity; it also breaks the canonical event identity discipline.
4. The witness worker fallback recompute (`workers/witness_worker.py:44-47`). Duplicated computation across the worker boundary is the ownership violation itself.
5. The test-local-copy pattern (`tests/test_witness_determinism.py:9`). Tests must import the function under test; a local copy proves nothing about production code.
6. The `CLAIM_REPLAYED` / `REPLAY_WITNESSED` summary event types and the `REPLAY_EXECUTED` vocabulary. Ungoverned event types outside the canonical set.
7. Hardcoded simulated replay results (`replay_success=True`, `state_snapshot={}`, `verification_status='pending'`, `verified=False`). A pipeline that can only emit unverified attestations must never be wired.
8. `import repository_client` / `from kernel.event_dispatcher import ...` against absent modules, and the swallow-all `except Exception: return None` emit path. Silent persistence failure is the opposite of fail-closed.

## 8. Disposition recommendation (adversarial auditor's view)

- **Do not merge.** The branch is a divergent pre-convergence lineage carrying a constitutionally wrong witness construction, a fabricated signature, ungoverned event types, and dead persistence. It collides with the ratified construction at every layer (ownership, preimage, contracts, identity).
- **Do not delete yet** (per standing order), but note the hazard: it is checked out (`*`) in both Windows clones (`/mnt/c/Users/nolan/ping`, `/mnt/c/Users/nolan/PING`), so any agent working in those clones is standing on the rogue branch by default. That is the live risk, not the branch's existence.
- **The one live action worth taking:** ensure no agent treats the Windows clones' checked-out branch as a base for new work. The branch's own code cannot run (unresolvable imports), so runtime risk is nil; the risk is purely as a bad base or a confusing reference.
- **Harvest** only the property-test shapes (rewritten against the real function) and the golden-vector idea. Everything else in 016bdc5f is negative evidence.

---
*Read-only audit complete. No files modified, no branches created/deleted/checked-out, no commits, no DB writes, no services touched. Only this report was written.*
