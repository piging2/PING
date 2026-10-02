# PHASE 17: Source-to-Build-to-Booted Proof + Promotion Artifact (2026-09-19)

Governing law: "REFACTOR AUTHORITY. PRESERVE MECHANISM. DELETE NOTHING. PROVE BEFORE PROMOTION."
Git safety: absolute. One bounded commit (gateway/Dockerfile only, explicit staging). No add -A, no reset, no clean, no history rewrite, no push.

## 1. Source and build record

- Worktree: /home/nolan/worktrees/constitutional-convergence-authority-law
- Branch: constitutional-convergence-authority-law
- Pre-unit HEAD: 172577628 (verified before any mutation; matched expectation)
- Post-unit HEAD: 76bd8f4f8 ("build(gateway): remediated multi-stage Dockerfile with identity labels (Phase 17)")
- Worktree at sign-off: clean. The only delta from 172577628 is the Dockerfile commit.
- Dirty worktrees untouched: /home/nolan/worktrees/constitutional-convergence (unrelated WIP preserved), /home/nolan/worktrees/ping-oracle-deploy, /home/nolan/ping (read-only reference).
- No Oracle mutation. No push anywhere. Local build only.

### The one commit (explicit staging, gateway/Dockerfile only)

Phase 19 ARM64 recommendation applied as the promotion recipe:
- Multi-stage: toolchain (build-base, python3) lives only in the builder stage.
- CXXFLAGS="-std=c++20" (tree-sitter@0.21.1's binding.gyp pins C++17; Node 24 requires C++20; proven live in Phase 19 Trial A; required on ANY platform/libc).
- Single `npm install` (package-lock.json honored); the stray second `npm install pg express` folded in.
- Identity labels baked in via build args (values below).
- @temporalio/* NOT removed in this unit: it is lazy-loaded and unreachable at boot (Phase 19), and removing a dependency is a deletion-shaped change reserved for the Phase 18 authoring lane. The boot proof ran WITH temporal installed and boot was clean.

### Image

- Tag: ping-gateway-converged:phase17-76bd8f4f8
- Build host: the Pig (x86_64), linux/amd64, Docker 29.5.3
- Build duration: ~67s (npm install 25s; tree-sitter used linux-x64 prebuilds)
- IMAGE_DIGEST (manifest): sha256:f5086a141b034dbaa3500df58ba700ebd44181102910d6ed86ed599649a51903
- Image ID: c16a515c818b, size 1.21GB

### Identity labels (baked in, verified via docker inspect)

| Label | Value |
|---|---|
| SOURCE_SHA (org.opencontainers.image.revision) | 76bd8f4f801191923f4dda5c62550d586c4c795f |
| BUILD_ID (ping.build.id) | phase17-20260919-76bd8f4f8 |
| IMAGE_DIGEST | sha256:f5086a141b034dbaa3500df58ba700ebd44181102910d6ed86ed599649a51903 |
| BUILD_TIMESTAMP (org.opencontainers.image.created) | 2026-09-19T07:08:38-0600 |
| SCHEMA_VERSION (ping.schema.version) | UNKNOWN (honest: the convergence migration carries no schema version marker; it is additive and idempotent) |
| EVENT_IDENTITY_VERSION (ping.event_identity.version) | 2.0.0 (ENVELOPE_VERSION in ping-runtime/events/convergence_identity.js; the canonical identity form is event_<16hex> minted by IdentityAuthority V2) |

Companion JSON manifest: ~/workspace/forensics/phase17-promotion-manifest-2026-09-19.json

## 2. Boot proof (scratch Postgres only)

- Scratch store: database p17_boot on the existing w1a-scratch-pg container (127.0.0.1:15439), fresh database created for this unit, dropped-nothing, production untouched.
- Container: p17-gateway on user network p17-net, port 18080->8080, POSTGRES_HOST=w1a-scratch-pg.
- Boot log (verbatim markers): `[GatewayRuntime] PostgreSQL: CONNECTED`; `[MigrationEngine] Applied migration 1..11`; `[CanonicalEventEnvelope] Convergence migration applied (additive, idempotent)`; `[GatewayRuntime] Legacy Ingress Adapter started`; `[GatewayRuntime] Mission Scheduler started`; `[EventToMissionBridge] Listening to 28 event types`.
- GET /health: overall "unhealthy" ONLY because qdrant (error) and embedding (not_initialized) are absent in the scratch environment; every event-relevant component is healthy: gateway, generated_artifacts, integrations, event_governance, event_runtime, canonicalization.
- GET /system/state: responds; postgres "available".
- Note: the booted gateway emits its own background mission/observation traffic into ping_events (78 rows observed). This is live evidence the image's event path runs; the probe scopes its assertions to its own events.

### In-image probe (ran INSIDE the built container, proves the image not the worktree)

18 checks, 18 pass, 0 fail. Probe script: /tmp/p17-probe.js on the Pig (byte-exact copy of ~/workspace/forensics/phase17-probe.js).

- A1: producer seam (ProducerEventPort.emitProducerEvent, project.created) takes the direct UER path. PASS
- A2: exactly one canonical identity, event_<16hex> form. PASS
- A3: certified representation derived after the one commit (Model B). PASS
- A4/A5: second event accepted; distinct identities. PASS
- A6: exactly the two probe rows in ping_events. PASS
- A7: canonical_events.source_event_id resolves to ping_events.event_id (forward). PASS
- A8: ping_events.event_id resolves back (reverse). PASS
- A9: logical event_id distinct from representation envelope_id. PASS
- B1: DB-allocated sequences strictly increasing. PASS
- B2: replay cursor (sequence > N ORDER BY sequence ASC) delivers in order. PASS
- B3: cursor resumes after a position. PASS
- B4: replay reads are side-effect free (row count and sequence sum unchanged). PASS
- C1: replay completeness COMPLETE. PASS
- C2: attestation binds witness_algorithm merkle_sha256_v1 and witness_version v1. PASS
- C3: 12-leaf interim invariant holds (leaf_count 14, tree_height 4). PASS
- C4: witness root deterministic across runs. PASS

## 3. Authority matrix (condensed; full matrix in phase2-decision-ownership-matrix-2026-09-19.md)

One decision, one owner. Standing law (2026-09-19): UnifiedEventRuntime = canonical event acceptance authority; ping_events = authoritative constitutional journal; IdentityAuthority = event identity owner; CanonicalAuthority = canonical hash owner; PostgreSQL sequence / UER acceptance = authoritative event ordering; EventToMissionBridge = accepted-event to mission trigger authority; MissionRuntime = mission authority.

| Decision | Owner | Non-owner role |
|---|---|---|
| Event identity | UER via IdentityAuthority: event_<16hex>, identity_version 2.0.0 in the hash preimage, minted AFTER validation fails closed | Envelope UUID reminted as envelope_id: deterministic UUID v5 representation identity, never a second logical identity |
| Canonicalization | CanonicalAuthority (RFC-8785 path), consumed by both | none competing |
| Persistence | ping_events via UER: ONE authoritative commit, ON CONFLICT (event_id) DO NOTHING | canonical_events: SECONDARY CERTIFIED EVENT REPRESENTATION / compatibility journal; derived AFTER commit (Model B), ON CONFLICT (event_id) DO NOTHING; D-1 absorbs 23505 from the PRESERVED legacy UNIQUE (tenant_id, sequence) into the deterministic equivalence path (bounded one-retry, fail-closed) |
| Ordering | PostgreSQL-allocated global sequence on ping_events (allocation position only; not gapless, not commit order, not wall-clock, not causal; P0-certified) | Envelope per-tenant MAX+1 survives as a representation field only, never the canonical order |
| Hash | CanonicalAuthority | none competing |
| Provenance | UER with adapter provenance layers (original_* preserved; actor is a CLAIM, never verified; F3 frozen) | Envelope fields carried as original_* provenance |
| Authentication | none (F3 frozen); proposed owner authenticated ingress -> UER when reopened | actor labeled claimed, never trusted |
| Certification | UER acceptance; replay/witness attestations derived over canonical history | Envelope may certify REPRESENTATIONS of already-accepted events only |
| Replay | UER read-only cursor: SELECT ... WHERE sequence > N ORDER BY sequence ASC; never creates/rewrites/re-emits/marks | Envelope read APIs are domain reads, not replay input |
| Mission trigger | EventToMissionBridge on the canonical UER stream (REPLAY_COMPLETED -> WITNESS_ATTEST exactly once per Phase 13) | Representation derivation never dispatches |
| Processing state | canonical_events.processed = adapter CONVERGENCE progress state (explicit per-row states), not acceptance | ping_events.processed: dead/reserved, no writer; do not merge semantics by accident |
| Witness | WitnessWorker derives ONLY from verified REPLAY_COMPLETED ping_events rows; witness_root from the canonical row; witness = DERIVED replay attestation (versions bound: engine v1, algorithm merkle_sha256_v1, input schema witness-input/v1; 12-leaf interim invariant) | Envelope cannot originate witness input |
| Lineage | UER over ping_events (causation_id/correlation_id) | Envelope stores causation/correlation as pass-through |
| Representation roles | canonical_events.event_id: row identity, ERA-DEPENDENT (ingress era: historical ingress UUID as text; converged era: event_<16hex> carried from the commit). envelope_id: representation identity. source_event_id: explicit cross-reference ping_events.event_id <-> canonical_events.source_event_id, deterministic both directions | none competing |

Convergence decisions incorporated: D-1 (23505 absorb, live); D-2 REVERTED (open collision-law decision, see limitations); Model B derivation (commit then derive); era law (ingress / legacy_converged / converged; historical rows untouched, Phase 6); idempotent retry on same identity; conflict fail-closed.

## 4. Schema / migration impact and reversibility

Migration: database/migrations/2026-09-19_event_authority_convergence.sql (110 lines, additive, idempotent, applied on every envelope initialize()).

Exact statements:
1. canonical_events.event_id UUID -> TEXT (guarded ALTER, idempotent; historical UUIDs preserved verbatim as text).
2. canonical_events.sequence DROP NOT NULL (guarded; derived rows may carry NULL sequence).
3. ADD COLUMN envelope_id UUID (IF NOT EXISTS, NULL for historical rows).
4. ADD COLUMN source_event_id TEXT (IF NOT EXISTS, NULL for unconverged rows).
5. CREATE UNIQUE INDEX uq_canonical_events_source_event_id (partial, WHERE source_event_id IS NOT NULL): one canonical event -> at most one derived representation.
6. CREATE INDEX idx_canonical_events_envelope_id (partial, WHERE envelope_id IS NOT NULL).
7-8. COMMENTs documenting era-dependent semantics per column (documentation only).
- ping_events: untouched by this migration.

Honest reversibility assessment:
- Reverses cleanly (DROP with no data impact): envelope_id column + its index; source_event_id column + its unique index; the COMMENTs. Historical rows are unaffected because the new columns are NULLABLE and never backfilled.
- Reverses only conditionally: re-adding sequence NOT NULL fails if any converged-era derived row carries a NULL sequence (the migration explicitly permits this). Conditional, check first.
- Does NOT reverse cleanly on a populated historical store: the event_id UUID -> TEXT widening. Reversal would require ALTER COLUMN ... TYPE uuid USING event_id::uuid, which fails on ANY row whose event_id is a converged event_<16hex> identity. On a store that has accepted converged events, the widening is a ONE-WAY DOOR: the only clean reversal is to delete all converged-era rows first (data loss) or keep the column as TEXT. The preserved legacy UNIQUE (tenant_id, sequence) key and the event_id PK were never dropped and are not part of any reversal.
- Dropping source_event_id destroys the populated explicit cross-references; they are rebuildable from ping_events via derivation, but the populated values are lost unless re-derived.
- Bottom line: the migration is safe to apply (additive, idempotent, boot-applied and proven live in this unit); rollback of the widening on a live converged store is not clean, which is why the rollback procedure below forbids the down-migration on populated stores.

## 5. Tests (full tally carried from Phases 15/16)

| Suite | Result |
|---|---|
| W-2 witness versioning + root semantics (new) | 8 pass, 0 fail |
| W-1A invariant harness | 18 pass, 0 fail |
| convergence invariants | 67 pass, 0 fail |
| phase 7 producer migration | 50 pass, 0 fail |
| phase 9 model-B proof | 32 pass, 0 fail |
| phase 12 collision/duplicate law | 54 pass, 0 fail |
| phase 13 fanout exactly-once | 31 pass, 0 fail |
| phase 14 ordering | 21 pass, 0 fail |
| constitutional eval (EVAL-001..009, mock) | 82 pass, 3 fail (pre-existing EVAL-006) |
| EVAL-010 witness failure honesty | 34 pass, 0 fail |
| sequence/replay cert | 70 pass, 0 fail, 1 blocked (T5) |
| witness negative-path | 9 pass, 0 fail |
| Phase 17 in-image boot probe (this unit) | 18 pass, 0 fail |

Total carried: 466 pass, 3 pre-existing fails, 1 environmental block. Plus 18/18 new boot-proof checks in the built image. No new failures introduced by the Dockerfile commit (build-only change; product code untouched since 172577628).

## 6. Blocked tests (T5 verbatim, unchanged from Phase 15)

From the sequence/replay cert log (T5: reinitialization durability):

    BLOCKED [T5] docker restart unavailable: Command failed: docker restart p0-cert-postgres
    Error response from daemon: No such container: p0-cert-postgres

Environmental: the p0-cert-postgres container is absent. Not a product or test defect.

## 7. Known limitations

- D-2 reverted (commit 114afad01): the open collision-law decision stands; the D-1 absorb path is the live repair.
- EVAL-006 3 pre-existing failures (mission is running / mission completed / result not overwritten); repair lives as uncommitted WIP in the dirty worktree, untouched.
- MissionRuntime.create() content-drift decision: open follow-up from Phase 12, not patched by design.
- TS 13-leaf story: the 13-leaf construction exists only in runtime/kernel/replay/witness_authority.ts (unexecuted design document, no live require chain); adopting the constitutional_law_commitment leaf requires an operator-grade decision record plus a hash-domain-semantics pin, else all historical roots fork. 12-leaf stays normative.
- Pending governance registration of 6 HPP types: dotted review/project types plus CUSTOMER_IMPORTED / CUSTOMER_EMAIL_SYNCED / CUSTOMER_CALENDAR_SYNCED absent from event_registry.json (Nolan's call: register or extend the capability-bound exception).
- AIWorkspaceAuthority repaired via the receipt seam (F4); it is wire-only as an envelope writer (every direct call threw at executeValidateEvent pre-repair).
- business_emitters.js producer surface sits outside the five migrated families; not yet routed through the ProducerEventPort seam.
- EventGovernance payload_schema for WITNESS_CREATED still does not enforce witness_root presence (worker-code gate only); new version fields likewise worker-bound; registry regeneration is a separate unit.
- SCHEMA_VERSION is UNKNOWN: no schema version marker exists for the convergence migration (honest, not invented).
- This Phase 17 image is linux/amd64 (built on the Pig). The promotion target is linux/arm64; the ARM64 build is a Phase 18 staging item using the committed recipe (Phase 19 proved the substrate pieces: Alpine + build-base/python3 + CXXFLAGS=-std=c++20; full-set ARM64 npm install not yet executed).

## 8. Rollback procedure

Code rollback: to the pre-convergence image oracle-gateway digest sha256:8400deecf2a93be276339492b71ebb2ea2a768b565b0d0752a2dd2fe005e48c5.

Data rules (the migration is additive):
- MUST: stop the converged deployment completely before starting the rollback image. NEVER two writers to canonical ping_events: old and new code must never emit concurrently.
- MUST: verify no in-flight derivations (check canonical_events for rows with source_event_id set but no corresponding committed representation, and confirm the adapter/scheduler are drained) before cutover.
- MUST NOT: run the migration down on a populated store. The event_id UUID -> TEXT widening does not reverse cleanly once converged-era rows exist (see section 4); leave the columns in place.
- MUST NOT: delete converged-era rows to "make the down-migration work". That is data loss of canonical history.
- MUST NOT: drop the added columns/indexes while any converged deployment may still write; the new envelope_id/source_event_id columns are NULLABLE and harmless to the old image (it never selects them by name... verify: old code paths use SELECT * on canonical_events in read APIs; extra NULL columns are inert).
- Acceptable steady state after code rollback with the migration left applied: old image runs against the widened schema; ingress-era rows are unchanged; converged-era rows remain readable as text; cross-reference columns sit NULL-populated and inert. Full schema restoration is a separate operator decision, not part of emergency rollback.

Oracle backup reference: /opt/ping/backups/ping-postgres-2026-09-19.dump, verified present and non-zero on ping-core-01 (368,338 bytes, 2026-09-19 12:10). Read-only check; NOT overwritten by this unit.

## 9. Container / image target

- Promotion target: linux/arm64, node:24-alpine, multi-stage per the committed gateway/Dockerfile (builder: build-base python3 git + CXXFLAGS="-std=c++20"; runtime: git only), single npm install honoring package-lock.json, identity labels via --build-arg.
- This unit's proof image: linux/amd64 (Pig build). The Dockerfile recipe is platform-independent; Phase 19 Trial A proved the tree-sitter compile on musl/aarch64 with the same toolchain and flag.
- Phase 18 staging item: execute the full linux/arm64 build (buildx/QEMU or native ARM64 runner) and re-run the boot probe against it before any Oracle staging.

## 10. Post-deployment probes (run after any promotion)

1. GET /health: event components healthy (gateway, event_governance, event_runtime, canonicalization). qdrant/embedding may be unhealthy in minimal stacks; that is expected and unrelated.
2. GET /system/state: postgres "available".
3. Event counts: SELECT count(*) FROM ping_events; SELECT count(*), count(source_event_id) AS converged FROM canonical_events;
4. Replay cursor position: SELECT max(sequence) AS cursor FROM ping_events; then SELECT event_id, sequence FROM ping_events WHERE sequence > <cursor-10> ORDER BY sequence ASC LIMIT 5 (ordered, resumable).
5. Cross-reference audit: SELECT count(*) FROM canonical_events WHERE source_event_id IS NOT NULL AND source_event_id NOT IN (SELECT event_id FROM ping_events); expect 0.
6. Witness verify: replay a recent window through KernelReplayExecutionProvider; expect completeness COMPLETE, witness_algorithm merkle_sha256_v1, witness_version v1, leaf_count 14, tree_height 4, deterministic across two runs.
7. Never-two-writers check: exactly one gateway deployment writing to ping_events (verify via deployment inventory, not by writing).

## 11. Promotion readiness

Phase 17 does not promote; it proves and assembles. Gaps that block Phase 18 staging:
- Full linux/arm64 build of the committed recipe not yet executed (Phase 19 proved the native-module pieces; the complete `npm install` on ARM64 is untested).
- @temporalio/* still in gateway/package.json: harmless on the proven path (lazy, unreachable at boot) but it is a latent musl crash on first constitution-endpoint use (Phase 19 Trial C). Removal is the standing W1 remediation; it is a Phase 18 authoring-lane decision.
- No commit beyond the Dockerfile is proposed from this unit. The artifact docs are the deliverable.

---
*Phase 17 worker: subagent. No Oracle mutation, no push, local build only. No em dashes.*
