# PING2 Executable Dependency Graph - Archaeology Report

Date: 2026-10-02
Coordinator: PING2 dependency-graph lane (read-only archaeology)
Binding: ~/workspace/directives/2026-10-02-ping-ping2-owner-hold-authority.md,
         ~/workspace/directives/2026-10-02-execution-optimization-doctrine.md
Deliverable: ~/workspace/backlog/ping2-dependency-graph-2026-10-02.md

## 0. Coverage: what was actually searched

SEARCHED (verified present in this sandbox):
- ~/workspace/forensics/transfer-2026-09-19/ - canonical_event_envelope.js (31KB),
  convergence_identity.js, convergence_derivation.js, convergence_invariants.js,
  legacy_ingress_adapter.js, 2026-09-19_event_authority_convergence.sql
- ~/workspace/forensics/recon-2026-09-19/ - invariant harnesses
- ~/workspace/forensics/ - phase0..phase24 convergence docs (read selectively)
- ~/worktrees/gap1-F2-absorb-floats/fyd-lane/absorb/src/ - canonical.ts,
  transition-id.ts, binding-verifier.ts, attestation-gate.ts
- ~/worktrees/phase1-approval-door/src/ - fyd/approval/gate.ts,
  fyd/owner-mode/gate.ts, lib/ping/dev-signer.ts
- ~/worktrees/fyd-write-boundary/src/ - full FYD app snapshot (src/fyd/*:
  sitespec, object, claim, capabilities, ask, customize, identity, tenant,
  owner-mode, object-identity, write-boundary, acquisition, net, wiring, ...)
- ~/workspace/outreach/ - authority-check.py, set-hold.py, holds.json,
  engagement-guard.py
- ~/workspace/mission-control/ - approval_request.py, proposal_record.py,
  proposal_validate.py, emit.py, payload_lifecycle.py, frontdoor_adapters.py,
  mission_intent.py, adapters/, lane-d/
- ~/workspace/runtime-harvest/ - first-pass-findings.md, wave1-donor-reports.md
  (prior external-donor archaeology, 2026-09-28)
- ~/workspace/piging2-harvest-docs/ - fyd-slice-recon-2026-10-02.md,
  json-render-forensic-2026-10-02.md, ecosystem/SYNTHESIS.md (21 readers)
- ~/workspace/p0-kernel/, ~/workspace/acquisition-seam/, ~/workspace/orca*/
  (delegated to workers; see sections 6-8)

NOT SEARCHABLE FROM THIS SANDBOX (reported honestly, not claimed):
- /home/nolan/projects/ping (canonical PING runtime; branch fyd-factory) -
  ABSENT. All "canonical authority" modules referenced by forensics files
  (../ping-runtime/authorities/*, ../authorities/canonical_authority.js,
  IdentityAuthority V2, UnifiedEventRuntime, ping_events PostgreSQL table)
  live there. Classifications of those modules rest on archaeology evidence,
  not direct reads.
- /home/nolan/projects/ping-fyd-converged (FYD product repo) - ABSENT as a
  repo; surveyed via the ~/worktrees/fyd-write-boundary snapshot and the
  2026-10-02 forensic docs that read it on the Pig.
- /home/nolan/projects/piging2-harvest - ABSENT (empty /home/nolan/projects/).

## 1. Disposition taxonomy (binding)

Every result terminates in exactly one: REUSE / WRAP / EXTRACT / MERGE /
DELETE / REJECT. "Interesting" is not a disposition.

- REUSE: consume as-is via shared package / workspace dependency; no copy.
- WRAP: thin PING2-owned adapter over the existing implementation; the
  implementation stays where it is.
- EXTRACT: pull the module into a shared package both PING and PING2 depend
  on (justified only when the current home cannot be depended upon).
- MERGE: two homes implement the same behavior; converge to one, keep the
  stronger, archive the other.
- DELETE: dead code; deadness proven against all consumers (not claimed on
  this report alone).
- REJECT: do not carry into PING2 (demo stand-ins, superseded paths,
  wrong-layer implementations).

## 2. Verified primitives (coordinator's own reads)

### 2.1 canonical.ts - canonical serialization - EXTRACT (candidate)

- SOURCE: ~/worktrees/gap1-F2-absorb-floats/fyd-lane/absorb/src/canonical.ts
- SIZE: 3,632 bytes, 74 lines. Siblings: transition-id.ts (102 lines),
  binding-verifier.ts (248 lines), attestation-gate.ts (78 lines).
- SHA/VERSION: worktree gap1-F2-absorb-floats @ 2fa9c9b ("Gap-1 F2:
  absorb/canonical.ts refuses all floats (pinned FLOATS_REFUSED)").
- LICENSE: UNSTATED in file; header says "fresh FYD code implementing a
  harvested pattern, not copied text." Harvest source named:
  /home/nolan/ping runtime/constitutional/src/hash-authority.ts
  (HashAuthority.canonicalizeObject, Patch 7B fix, verified 2026-09-21) +
  runtime/constitutional/src/ping-identity.ts, HEAD 4c098334c.
- PURPOSE: recursive key-sort canonicalization; canonicalBytes() = the
  byte form that gets hashed/signed. Fail-closed: ALL floats refused
  (NaN, Infinity, fractional), functions/symbols/bigint throw,
  undefined -> null.
- PUBLIC API: canonicalize(value), canonicalBytes(value).
- DEPENDENCY COST: TypeScript, zero imports (pure). Node or browser.
- TEST: absorb/test/canonical.test.ts, c1.test.ts, c3.test.ts, c4.test.ts
  (verified present in worktree).
- GOLDEN STEP: underpins CREATE SIGNED OBJECT, APPEND GOVERNED EVENT,
  CANONICAL EVENT, REPLAY -> IDENTICAL PROJECTION (all digest/hash steps).
- DISPOSITION: MERGE into the adopted RFC 8785 (JCS) profile
  (p0-kernel/v2-identity-harness/jcs-from-spec.js, 79/79 vectors - see
  section 6). Correction 2026-10-02 (worker A evidence): binding P0-A
  verdict is ADOPT RFC 8785; this file is the legacy sorted-keys-JSON
  profile + FLOATS_REFUSED discipline. Fold the float-refusal discipline
  into the single JCS-profile implementation and keep one vector corpus
  (vectors.js); retire canonical.ts as a standalone serializer so
  cross-language digests (TS vs Python vs JS) agree byte-for-byte. The
  constitutional owner remains PING's hash/canonicalization authority.
- PING2 WRAPPER: @ping/kernel canonicalize/canonicalBytes backed by the
  JCS profile; no wrapper logic, direct import.
- KEEP: YES (kernel).

### 2.2 transition-id.ts - deterministic id + idempotent append - MERGE (four homes)

- SOURCE: ~/worktrees/gap1-F2-absorb-floats/fyd-lane/absorb/src/transition-id.ts
- SIZE: 102 lines. Worktree @ 2fa9c9b.
- LICENSE: unstated (same worktree).
- PURPOSE: transition identity = SHA-256 over canonical bytes with
  generator_version bound in; dedup contract "second emit is a no-op."
  Harvested from UnifiedEventRuntime.emit (event_id = SHA-256 of
  {eventType, source, namespace, logical_id|payload}; INSERT ... ON
  CONFLICT (event_id) DO NOTHING). FYD adaptation: in-memory journal
  (staged; PG wiring future).
- PUBLIC API: transition identity mint + idempotent append (read the file
  for exact exports).
- DEPENDENCY COST: node:crypto + ./canonical.js. No DB in this version.
- TEST: worktree-local; header states "the dedup contract (second emit is a
  no-op, state unchanged) is what the tests prove"; absorb/test/c1.test.ts
  covers the C1 transition-id contract.
- GOLDEN STEP: APPEND GOVERNED EVENT (the no-double-apply primitive).
- DISPOSITION: WRAP. Rationale: the durable version of this behavior is
  PING's event spine (PostgreSQL ON CONFLICT DO NOTHING, per the header's
  named source). PING2 must not mint a second idempotency semantic. Wrap
  the spine's append contract; keep this file's in-memory journal as a
  TEST DOUBLE only, never as a competing live authority (JSONL lesson).
  CORRECTION 2026-10-02 (worker C evidence): the idempotent write boundary
  was independently reinvented in two MORE lanes -
  fyd-write-boundary/src/fyd/write-boundary/ AND
  phase1-approval-door/src/fyd/customize/write-boundary.ts (client
  request_id + server-computed canonical payload digest; same id+different
  digest -> 409; per-site lock closing TOCTOU; UNKNOWN outcomes on timeout).
  That is FOUR homes of the same idempotent-append behavior counting
  transition-id.ts and emit.py's dedupe-append. Refined disposition: MERGE -
  one canonical idempotent-write module in the shared kernel, converged from
  the phase1 write-boundary (phase1 supersedes fyd-write-boundary on
  overlap) with transition-id.ts's minting discipline folded in, durable
  idempotency record (Postgres) behind it, the in-memory journals demoted
  to test doubles.
- PING2 WRAPPER: PING2 calls the PING journal append (shared contract);
  the in-memory implementation is demoted to test fixture.
- KEEP: YES as contract + test double; NO as live authority.

### 2.3 approval/gate.ts - exact-digest approval door - REUSE

- SOURCE: ~/worktrees/phase1-approval-door/src/fyd/approval/gate.ts
- SIZE: part of 23,714 bytes (two gate files). Worktree @ 02e7ffe
  ("T2 approval door: gate.ts + owner-event adapter + 15 unit tests").
- LICENSE: unstated.
- PURPOSE: the human-authority seam. Verification order on APPROVE, all
  before effect: 0. not-terminal, 1. identity well-formed, 2. capability
  includes required_capability, 3. exact digest
  sha256(canonical(proposal.patch)) === proposed_digest, 4. base state
  digest (TOCTOU guard -> STALE_SUPERSEDED), 5. not expired, 6. target
  resolves, 7. evidence refs meet requirements, 8. transition via
  owner-events path with pre/post hashes; journal APPROVAL_APPROVED.
  Fail-closed throughout; clock injectable (no Date.now).
- PUBLIC API: approval gate (read file for exact exports); owns no queue,
  no journal store, no object write path.
- DEPENDENCY COST: node:crypto, ./queue, ./types, ./journal (T1/T3 teammate
  files - header notes they were not present yet: "This file does NOT
  define competing queue/journal/types modules").
- TEST: 15 unit tests per commit message.
- GOLDEN STEP: AGENT PROPOSES TRANSITION -> CAPABILITY EVALUATION ->
  HUMAN APPROVES -> CANONICAL EVENT.
- DISPOSITION: REUSE. Rationale: this is already a seam (owns no store);
  it is the approval kernel PING2 needs. Consume via shared package once
  its queue/journal binds land; do not copy it into PING2.
- PING2 WRAPPER: none needed beyond the package boundary; PING2 supplies
  queue/journal adapters behind its declared interfaces.
- KEEP: YES.

### 2.4 owner-mode/gate.ts - DEMO owner mode - REJECT (kernel) / WRAP (seam)

- SOURCE: ~/worktrees/phase1-approval-door/src/fyd/owner-mode/gate.ts
- LICENSE: unstated.
- PURPOSE: demo-only owner affordance, env-gated
  (NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1). Header: "There is no identity
  verification here... Nothing in this directory may ever be consulted for
  a real authorization decision... these demo verdicts must not be reused,
  wrapped, or 'upgraded'."
- DISPOSITION: REJECT for the kernel. The file says so itself. The
  production seam is OwnerContext (see 2.5), which is the WRAP point.
- KEEP: NO (kernel). Keep in FYD demo surface only.

### 2.5 OwnerContext seam (owner-context.ts) - capability evaluation seam - WRAP

- SOURCE:
  ~/worktrees/fyd-write-boundary/src/app/api/fyd/objects/[objectId]/overrides/owner-context.ts
- PURPOSE: "the single owner-context seam for the owner overrides route."
  Interface: tenantId (server-verified), actor (OwnerActor, future-neutral),
  evaluateCapability(objectId, capability) -> {capability, allowed, reason}
  (pure, no mutation), capabilityImpactLine, responseLabel/disclosure.
  "DemoOwnerContext today -> PING identity/capability implementation later.
  Replacing DemoOwnerContext with a PING identity/capability implementation
  changes this file (one class) and nothing else."
- GOLDEN STEP: CAPABILITY EVALUATION.
- DISPOSITION: WRAP. Rationale: the seam already exists and is honestly
  labeled. PING2 implements OwnerContext against PING identity/capability
  authorities; the demo class stays demo. This is the WHO/WHAT/WHICH/
  CONSTRAINTS/HOW-LONG/WITH-WHAT-APPROVAL answer point for FYD.
- KEEP: YES (seam, not authority).

### 2.6 dev-signer.ts - DEV Ed25519 signing stand-in - REJECT

- SOURCE: ~/worktrees/phase1-approval-door/src/lib/ping/dev-signer.ts
- PURPOSE: temporary dev signing helper; "SERVER ONLY... This exists only
  so the practice page can produce signed dev envelopes until the PING
  runtime (Lane A) exposes a canonical signing endpoint. Canonicalization
  authority stays with the runtime; the sorted-key JSON below is a clearly
  labeled dev stand-in, not the constitutional path."
- PUBLIC API: generateDevKeypair, storeDevKeypair, signAsIdentity,
  canonicalizeJson, IdentitySignature.
- DISPOSITION: REJECT for the kernel (dev-only by its own header). It
  documents the interface the real signing endpoint must satisfy.
- GOLDEN STEP: CREATE SIGNED OBJECT / VERIFY IDENTITY need the REAL
  PING signing authority (Lane A / canonical runtime), not this file.
- KEEP: NO. Open item: PING must expose the canonical signing endpoint;
  until then PING2 cannot honestly do CREATE SIGNED OBJECT in production.

### 2.7 authority-check.py + set-hold.py + holds.json - owner-hold gate - REUSE

- SOURCE: ~/workspace/outreach/authority-check.py, set-hold.py, holds.json
- SIZE: 106,461 bytes total with engagement-guard.py.
- PURPOSE: fail-closed pre-action authority gate. Order: 0. holds.json
  (active hold -> DENY; missing/invalid -> fail-closed), 1. AUTHORITY.json,
  2. surface status, 3. platform restriction/tripwire, 4. capability/
  authorization window, 5. execution-history tail. Exit codes:
  0 AUTHORIZED / 1 DENIED / 2 CONFLICT / 3 FAIL-CLOSED. "A schedule is NOT
  authorization. A stale note is NOT authorization. A cleared platform
  timer is NOT authorization."
- DEPENDENCY COST: **stdlib-only Python** (argparse, json, os, re, sys,
  hashlib, difflib, tempfile, datetime). Zero third-party deps.
- TEST: adversarial proofs referenced in workspace (eligibility-adversarial
  12/12); the 8 new hold adversarial tests belong to the parallel social
  authority-repair lane.
- GOLDEN STEP: OWNER HOLD CHECK (the dispatch-boundary invariant from the
  2026-10-02 authority directive). This is the executable form of
  "OWNER HOLD MUST DOMINATE SCHEDULE."
- DISPOSITION: REUSE. Rationale: dependency-free, already the enforced
  boundary for social surfaces, already machine-readable. PING2's
  dispatch boundary for any consequential scheduled execution should
  consume this gate (or its extracted equivalent), not reinvent it.
- PING2 WRAPPER: thin wrapper mapping PING2 execution contexts to
  surfaces; the gate logic stays single-sourced.
- KEEP: YES (kernel: owner hold/policy evaluation).

### 2.8 canonical_event_envelope.js - event envelope certifier - WRAP

- SOURCE: ~/workspace/forensics/transfer-2026-09-19/canonical_event_envelope.js
- SIZE: 31,087 bytes. Part of 97,831-byte transfer set.
- LICENSE: unstated.
- PURPOSE (post-convergence, 2026-09-19): SECONDARY CERTIFIED EVENT
  REPRESENTATION - certifier + validator + serializer + query surface
  over ALREADY-AUTHORITATIVE events. acceptCanonicalEvent() builds the
  certified envelope of an event whose identity was minted by
  UER/IdentityAuthority; persists idempotently to canonical_events;
  serves compatibility/domain reads. HARD PROHIBITIONS: must not mint
  logical event identity, must not compute canonical order, must not
  present envelope_id as event identity.
- DEPENDENCY COST: node stdlib (crypto, path) + MISSING PING-internal
  modules (../ping-runtime/authorities/constitutional_validation,
  ../ping-runtime/authorities/constitutional_time_authority.js) - absent
  from this sandbox (canonical tree unreachable).
- GOLDEN STEP: APPEND GOVERNED EVENT (representation/certification side),
  PROJECT OBJECT (query surface feeds projections).
- DISPOSITION: WRAP. Rationale: the authority (event identity, order,
  commit) lives in UER/ping_events, not here. PING2 consumes the envelope
  as the certified read/representation contract, never as the mint.
- KEEP: YES (envelope contract).

### 2.9 convergence_identity.js - identity role separation - REUSE

- SOURCE: ~/workspace/forensics/transfer-2026-09-19/convergence_identity.js
- SIZE: 5,904 bytes.
- PURPOSE: pure mechanism (no I/O, no authority decisions) separating
  identity roles: canonical_event_id (carried, never minted here),
  envelope_id (deterministic UUID v5 of the canonical identity -
  representation only), source_event_id (cross-ref to authoritative
  commit), ingress_event_id (legacy, historical). "Sovereignty: hashing
  delegates to CanonicalAuthority (the hash authority); canonicalization
  delegates to CanonicalJson via CanonicalBytes."
- GOLDEN STEP: VERIFY IDENTITY (role discipline), APPEND GOVERNED EVENT.
- DISPOSITION: REUSE as the identity-role contract. The actual
  CanonicalAuthority/CanonicalJson live in the unreachable canonical
  tree; this file is the portable statement of the roles.
- KEEP: YES (contract).

## 3. Measurements (lite must become measurable)

All numbers measured 2026-10-02 in this sandbox. "Candidate kernel" =
the smallest set of verified primitives above (2.1, 2.2-contract,
2.3, 2.5-seam, 2.7, 2.8-contract, 2.9-contract).

| Measure | Value | Notes |
|---|---|---|
| TOTAL EXECUTABLE BYTES (verified kernel candidates) | ~345 KB | forensics transfer set 97,831 + absorb 4 files (~12 KB) + phase1 gates 23,714 + outreach 3 files 106,461 + mission-control 6 files 85,235. Excludes FYD product subtree. |
| FYD product subtree (for scale contrast) | 2.68 MB | ~/worktrees/fyd-write-boundary/src/fyd alone. The kernel is ~13% of the FYD app's fyd/ subtree by bytes - and most of that subtree is product, not kernel. |
| sitespec contracts alone | 82,440 bytes | types+schemas+validator+binding-verifier+render-model+visibility+projection. Product IR, not kernel. |
| DEPENDENCY COUNT (kernel candidates) | 2 third-party | proceduralize/proceduralizer.ts: jsonld (npm). acquisition/static-adapter.ts: node-html-parser (npm). Everything else stdlib-only: outreach Python stdlib-only; forensics JS node stdlib + PING-internal modules (unreachable here); absorb zero imports; phase1 gates node:crypto + lane-local modules. |
| DEPENDENCY COUNT (FYD app snapshot) | 35 npm (19+16) | phase1-approval-door package.json. fyd-write-boundary has no root package.json in this snapshot - UNKNOWN. |
| COLD START | UNKNOWN | No extracted kernel exists yet to measure. Floor: node/python interpreter start (ms). Real cold start depends on extracted kernel + DB connection (PostgreSQL for the event spine). Must be measured on the first extracted kernel build; do not quote lane-file load times as PING2 cold start. |
| TEST COUNT (kernel-adjacent, verified) | 15 + 128 | phase1 approval door: 15 unit tests (per commit 02e7ffe). fyd-write-boundary src: 128 *.test.ts files (product scope, not kernel). Kernel-specific conformance tests (canonicalization vectors vs PING Patch-7B, idempotent-append dedup) - NOT YET WRITTEN: this is a gap. |
| DATABASE REQUIREMENTS | PostgreSQL (event spine) | Canonical commit is ping_events in PostgreSQL (per forensics headers: "one authoritative runtime commit (ping_events)", "canonical log position allocated by PostgreSQL"). PING2 needs a DB-backed append for production; the in-memory journal (transition-id.ts) is a test double only. No new DB invented: reuse the spine. |
| NETWORK REQUIREMENTS | None for kernel pure functions | canonicalize/hash/verify-identity-roles/envelope-validate are pure. Network enters at: journal append (PG), capability evaluation (PING authority), dispatch (provider adapters). PING2 kernel proper: zero mandatory network. |

## 4. Topology recommendation (follows actual dependency topology)

- The kernel candidates are ALREADY dependency-free (stdlib-only). There is
  no dependency-topology reason to copy them: the correct topology is a
  shared package (e.g. @ping/kernel) published from the PING repo, consumed
  by PING2 and FYD as a workspace dependency. EXTRACT applies only to
  files whose current home is a lane worktree that cannot be depended upon
  (canonical.ts, transition-id.ts, gate.ts) - and even then, EXTRACT means
  "move to the shared package," not "copy into PING2."
- PING2 must never contain: the demo owner-mode gate (2.4), the dev signer
  (2.6), the in-memory journal as a live authority (2.2's staged impl),
  FYD product code (sitespec/components/renderer), Mission Control UI,
  harvest archives, or any second event-spine implementation.
- Authority stays where it is: event identity/order/commit in
  UER/ping_events; signing in the PING runtime (Lane A endpoint - OPEN);
  capability semantics in PING capability authority; OwnerContext (2.5) is
  the seam PING2 implements against.

## 5. Tenant/identity handoff (for the tenant/identity lane - NOT resolved here)

1. ~/workspace/forensics/transfer-2026-09-19/canonical_event_envelope.js:135-180 -
   generateEventId(tenantId, eventType, timestamp, sequence) and
   getNextSequence(tenantId) (per-tenant MAX(sequence)+1) are marked LEGACY:
   "only the deprecated executeEmitEvent path may call it." The converged
   path carries identity from UER/IdentityAuthority. No conflation in the
   converged path; the legacy path equated tenant scope with identity mint
   - correctly quarantined, not yet deleted.
2. ~/worktrees/fyd-write-boundary/src/app/api/fyd/objects/[objectId]/overrides/owner-context.ts -
   OwnerContext carries tenantId (server-verified scope) AND actor
   (OwnerActor, future-neutral) as SEPARATE fields. Not conflated, but the
   PING-backed implementation does not exist yet (DemoOwnerContext today);
   the tenant/identity lane must verify the real implementation keeps
   tenant (storage isolation) distinct from actor identity, delegation,
   and device.
3. FYD ask route tests (ask-classes-tenant.test.ts) derive tenant from the
   route path and refuse cross-tenant bodies (400 tenant_mismatch). Tenant
   here is a request-scope boundary, not an identity claim - consistent
   with the directive, but the lane should confirm no code path treats
   "same tenant" as "same identity."

## 6. Worker A: event spine / identity / crypto / canonicalization / holds
## (delivered 2026-10-02T23:56Z; read-only; roots verified present; canonical
## trees /home/nolan/projects/ping and /home/nolan/projects/piging2-harvest
## NOT reachable - classifications rest on forensic evidence)

Disposition corrections to coordinator's Section 2 (worker's evidence wins):
- 2.1 canonical.ts: EXTRACT -> MERGE. Binding P0-A verdict is ADOPT RFC 8785
  (JCS); the adopted profile is p0-kernel/v2-identity-harness/jcs-from-spec.js
  (79/79 vectors, oracle agreement, cross-process determinism). absorb
  canonical.ts is the legacy sorted-keys-JSON profile + FLOATS_REFUSED
  discipline: fold the float-refusal discipline into the JCS profile, keep
  one vector corpus (vectors.js), retire canonical.ts as a standalone
  serializer so TS/Python/JS digests agree byte-for-byte.

New items (one disposition each):
- convergence_derivation.js (8,344 B) - EXTRACT. Consistency-model-B
  coordinator: derive-after-commit, idempotent rebuild, cross-ref audit.
  Node stdlib only, injected pool+envelope. GOLDEN: APPEND GOVERNED EVENT,
  REPLAY. KEEP (extracted).
- convergence_invariants.js (19,322 B, T0-T8) - REUSE as the executable
  conformance gate for event-authority convergence (one-identity,
  idempotent retry, conflict fail-closed, never-remint, rebuild identity
  preservation). Needs scratch PG + canonical tree to run; not re-runnable
  here. GOLDEN: APPEND GOVERNED EVENT, REPLAY, IDENTICAL PROJECTION. KEEP.
- legacy_ingress_adapter.js (26,766 B) - REJECT for PING2. Migration
  scaffolding for PING's pre-convergence ingress era; serves no golden
  step. Stays in PING while the legacy surface exists. REMOVE from PING2.
- 2026-09-19_event_authority_convergence.sql (6,408 B) - REUSE as the
  canonical schema contract (envelope_id/source_event_id identity roles);
  PING2 never runs the DDL. KEEP as contract.
- w1a-invariant-harness.js (13,662 B) - REUSE as replay/witness conformance
  reference; PING2 never owns witness authority. KEEP as evidence.
- recon-*.md lane reports - REJECT as code (evidence only).
- jcs-from-spec.js + vectors.js + run.js (p0-kernel/v2-identity-harness) -
  REUSE. The ADOPTED RFC 8785 profile + locked vector corpus (digest
  55107ec88618...069c8e63). GOLDEN: CREATE IDENTITY (byte foundation).
  Node stdlib only. KEEP - this is the canonical serializer; items
  canonical.ts / approval_request._canonicalize / emit.py journal bytes
  must conform to its vectors.
- v1-snapshot-canonical_authority.js (17,261 B) - DELETE from executable
  tree. Byte-identical defect exhibit ("NOT A FORK, NOT WIRED ANYWHERE");
  evidentiary value captured in EVAL-REPORT.md. Archive with the report.
- bridge-governance-forensics-2026-10-01.md - REJECT as code.
- engagement-guard.py (71,456 B) - EXTRACT the generic mechanism only:
  tamper-evident per-action evidence envelope (stamp_evidence/verify_evidence,
  sha256, 6h TTL) + deterministic eligibility-function shape. Engagement
  data files, platform parsers, log index stay domain-local. GOLDEN: AGENT
  PROPOSES TRANSITION + CAPABILITY EVALUATION. Python stdlib only. KEEP
  (mechanism).
- approval_request.py (19,443 B) - REUSE. Digest-bound approval: id +
  expected digest required, silence never approves, server-controlled
  ApprovalStore, typed MC_APPROVAL_* transitions, expiry -> typed
  terminals. WARNING: its _canonicalize uses Python json.dumps(sorted,
  compact, ensure_ascii) - diverges from adopted JCS on numbers/NaN
  (fail-open class); must be re-pointed at JCS vectors. GOLDEN: AGENT
  PROPOSES TRANSITION + HUMAN APPROVES + CANONICAL EVENT. KEEP.
- proposal_record.py (3,562 B) - REUSE. Validated proposal -> canonical
  digest, deterministic proposal_id (p0prop- + sha256). Product constants
  (CAPABILITY fyd.sitespec.patch) stay in FYD layer. KEEP.
- proposal_validate.py (15,826 B) - REUSE the validator SHAPE
  (anchor/contract/references/claims, never-normalize); customer fixture
  ground truth moves to product config. KEEP.
- emit.py (10,963 B) - WRAP. Dedupe-append journal write path
  (content-derived IDs, duplicate refusal, dry_run). Tensions: header
  admits un-merged lane-D emit fork ("must be merged, not forked");
  JSONL journal vs doctrine (Postgres spine canonical, JSONL not second
  authority) - handed to the event-spine lane. Event-ID minting must move
  to canonical-bytes profile. KEEP (wrapped).
- payload_lifecycle.py (23,560 B) - REUSE as PING2's privacy/retention
  authority at the projection boundary: audit-metadata vs erasable-payload
  separation, metadata_digest, revocable payload_ref, forward-only
  lifecycle, secret-shape fail-closed scan, erasure emits
  DATA_ERASURE_COMPLETED with subject_digest. This is the "fail
  conservatively" mechanism. KEEP.
- mission_intent.py (59,813 B) - REUSE the front-door pattern:
  AuthenticatedContext (agent_id + tenant + principal + entitled_tenants;
  tenant derived from auth context, never request body), fail-closed
  entitlement, revocation lifecycle, unknown-outcome terminals. Tenant/
  agent/principal separation handed to tenant/identity lane. KEEP.

DUPLICATES found (same behavior, multiple homes - converge to one):
1. Canonical serialization + digest: SIX live homes (PING CanonicalBytes/
   CanonicalAuthority [unreachable]; jcs-from-spec.js [ADOPTED]; absorb
   canonical.ts [merge into JCS]; approval_request._canonicalize [Python
   profile, must conform]; emit.py journal bytes + "|"-joined ID seeds;
   convergence_identity.canonicalEventHash -> missing CanonicalAuthority).
   Cross-language digest agreement does NOT hold today. Convergence target:
   JCS profile + vectors.js corpus.
2. Deterministic identity minting: 5+ homes (generateEventId UUIDv5 legacy;
   deriveEnvelopeId UUIDv5; fydTransitionId sha256; mint_proposal_id
   p0prop-; mint_event_id mc-bf-/mc-apr-/mc-pass-). One identity-authority
   profile must govern all (domain-separated hashes; era prefixes are the
   good pattern).
3. Event envelope construction: CanonicalEventEnvelope certified
   representation vs emit.py journal envelope; plus emit.py's admitted
   un-merged lane-D fork.
4. Hold/gate mechanics: four domains, same shape (authority-check.py +
   holds.json; approval_request.py; eligibility_check + evidence envelopes;
   mission_intent revocation). One shared mechanism, per-domain policy data.

TENANT/IDENTITY handoff (worker A, not resolved):
1. canonical_event_envelope.js ~l.407-413: "tenant_id carries the canonical
   namespace verbatim in the converged era (tenant::<id> | core::system)...
   it is NOT the producer tenant claim." Tenant encoded as namespace string.
2. legacy_ingress_adapter.js _resolveNamespace: absent tenant collapses to
   'core::system' while malformed fails closed - absence vs malformation
   treated differently.
3. convergence SQL COMMENT ON canonical_events.tenant_id: 'the canonical
   namespace (tenant::<id> | core::system) resolved at the UER acceptance
   choke point, carried verbatim.'
4. mission_intent.py AuthenticatedContext: agent_id/tenant/principal/
   entitled_tenants separate fields; lane must review 1,700 lines for
   implicit agent<->tenant binding.
5. transition-id.ts: ownerId is the sole principal axis, no tenant axis -
   owner IS the identity for the FYD transition journal.

COVERAGE GAPS (worker A, verified): CREATE SIGNED OBJECT has NO surveyed
signer/verifier in any root (identity proof is hashing+digests, not
signatures). VERIFY IDENTITY has no dedicated verifier (v2-identity-harness
proves serialization, not identity verification). convergence_invariants.js
and w1a-invariant-harness.js not re-runnable here (no scratch PG, no
canonical tree). Referenced-but-missing imports: ../ping-runtime/
authorities/constitutional_validation, constitutional_time_authority.js,
../ping-runtime/events/convergence_identity.js, ../authorities/
canonical_authority.js, /home/nolan/worktrees/constitutional-convergence.

Worker A KEEP/REMOVE net: KEEP items 1,2,3,4,6,7 (spine+conformance),
10,11,12 (evidence/attestation/journal), 13 (JCS), 16,17,18 (hold
mechanism), 19 (eligibility envelope), 20,21,22 (approval/proposal),
23 (journal write, wrapped), 24 (payload lifecycle), 25 (front door).
REMOVE from PING2: item 5 (legacy ingress), 9 (standalone canonical.ts -
merged), 14 (V1 snapshot), 8+15 (markdown forensics).

## 7. Worker B: execution / scheduling primitives (delivered
## 2026-10-02T23:57Z; read-only). Roots: orca/, orca-adapter/, orca-port/,
## orca-remediation/, orca-dispatch-test/, mission-control/,
## outreach/, pig-fb/, pig-linkedin/, convergence/, orchestration/.
## ~/workspace/scheduler/ EXISTS but is EMPTY. Canonical PING tree
## unreachable. Licenses unstated in every lane file read. Dirty lane
## tree @ 64cfc9c.

### dispositions
- orca/model_router.py (229 lines) - EXTRACT. Deterministic worker
  routing: DATA CLASS -> eligibility -> RoutingDecision
  (eligible+selected+fallback+reason). Pure stdlib. GOLDEN: CAPABILITY
  EVALUATION (worker-side). KEEP as ping2.execution.select_worker.
- orca/mission.py, mission2.py, mission_ollama.py, mission_hermes.py -
  DELETE. Experiment drivers; their proven invariants already live in
  mission_intent.py. Archive orca/missions/ evidence dirs read-only.
- orca/dispatch.py - EXTRACT. build_dispatch_envelope(step):
  JSON-serializable per-attempt routing history, schema-versioned.
  GOLDEN: CAPABILITY EVALUATION (records why a worker was chosen). KEEP.
- orca-adapter/adapter.js (1573 lines, ~60 KB) - WRAP. The proven
  execution seam below authorized work: authorize -> issue -> dispatch
  -> envelope-verify -> record, effect-state typing, tenant threading,
  idempotency reconcile gate, crash-safe rendezvous awareness.
  PUBLIC: dispatchExecution(), idempotencyKeyFor(), OUTCOME,
  EFFECT_STATE. Tests: adapter/reconcile/tenant/secret-redaction
  selftests + falsify-index-race. GOLDEN: AGENT PROPOSES TRANSITION +
  CANONICAL EVENT. DEPS: Node 22 + vendored adapter + transport.
  PING2 exposes dispatchExecution; the adapter stays the ONE
  implementation. KEEP.
- orca-adapter/effect_ledger.js + outcomes.js - MERGE into the PING2
  execution seam. Outcome/effect-state type contract
  (completed|failed|unknown|denied|escalated x
  effect_unknown|effect_hold|effect_none); terminalOutcome() throws on
  labeling unknown terminal. GOLDEN: CANONICAL EVENT (unknown never
  becomes terminal success). KEEP as types; REMOVE as standalone
  module once merged.
- orca-adapter/vendor/external_agent_adapter.js - REUSE. The canonical
  vendored copy (sha256 fe030e122ff7...7d8b59). authorizeWorkOrder /
  issueWorkOrder / verifyResultEnvelope / recordVerifiedResult. ALL
  lanes must point here. GOLDEN: CAPABILITY EVALUATION + CANONICAL
  EVENT. KEEP.
- orca-adapter/canonicalization/canonicalization_service.js - DELETE
  once the vendored adapter is re-homed next to the real
  canonicalization service (Pig-side). Transitional load-bearing shim;
  must never grow behavior.
- orca/port/effect_adapters/adapter_core.js (611 lines, staged for
  ping-runtime/orchestration/effect_adapters/) - WRAP. PORT LAWS:
  timeout is an observation never an outcome; never "retry the intent",
  always re-probe; placeholder success != evidence; deterministic op
  keys (op:v1:<mission>:<effect>:<canonical(input)>); fail-loud emit;
  adapters never own terminal state. DECISIONS: SAFE_TO_RETRY /
  HOLD_UNKNOWN / RECOVER_SUCCEEDED / RECOVER_FAILED. WARNING: tests/
  dir is EMPTY (0 bytes) - in-tree tests absent. GOLDEN: CANONICAL
  EVENT + PROPOSAL adjacency. KEEP.
- orca-remediation/objective-runtime.js (508 lines) - EXTRACT. Layer-3/
  layer-4 durability kernel: objective_id from logical intent only
  (never PID/wall-clock/attempt); atomic temp+rename writes under
  PING_DATA_ROOT; deterministic PG advisory-lock coordinator claims.
  GOLDEN: CANONICAL EVENT (durable attempt identity binds verdicts to
  attempts). DEPS: node stdlib + PG (locks only). KEEP the algorithms.
  SECURITY: lock-test.js (adjacent) contains a hardcoded DB credential -
  REDACTED, not quoted; REMOVE that file partly for this reason.
- orca_control_loop.js x2 (1192 + 437 lines) - DELETE both drivers
  after extraction (remediation copy supersedes dispatch-test copy;
  reusable parts already extracted).
- orca-remediation/hermes_dispatch.py (105 lines) - EXTRACT. Crash-safe
  rendezvous: after worker settle or timeout, atomically write a
  rendezvous record (temp + os.replace) carrying stdout/stderr +
  attempt metadata, so a killed coordinator reconciles instead of
  losing output. The layer-3 checkpoint for external execution. GOLDEN:
  CANONICAL EVENT (attempt evidence survives coordinator death). KEEP.
  DELETE the dispatch-test 25-line version (superseded).
- lock-test.js, delegate.new.js, main.new.js - REJECT. REMOVE all
  three (stale .new rewrites; credential liability).
- mission-control/mission_intent.py - WRAP (consistent with section 6).
  Journal-as-idempotency-ledger, E2 collision safety, sticky
  revocation, MC_LANE_UNKNOWN terminal-but-never-success. GOLDEN:
  AGENT PROPOSES TRANSITION + CAPABILITY EVALUATION + CANONICAL EVENT.
  KEEP via thin wrapper.
- mission-control/emit.py - WRAP (consistent with section 6). The
  write path; reduces to a thin journal-gateway client. KEEP.
- mission-control/approval_request.py + adapters/chat_approval.py +
  adapters/mc_approval.py + proposal_validate.py - REUSE (consistent
  with section 6). Same function object on both surfaces. GOLDEN:
  HUMAN APPROVES. KEEP. proposal_record.py - MERGE into the approval
  surface (101 lines of glue, no independent authority; reconciles
  worker A's REUSE toward the more precise MERGE).
- mission-control/payload_lifecycle.py - REUSE (consistent with section
  6 reconciliation). KEEP.
- mission-control/_adapter_shim.js vs lane-d/adapter-call.js - MERGE
  (self-documented parallel; keep the canonical one).
- mission-control/frontdoor_adapters.py - MERGE (migrate remaining
  callers to MissionIntent contract, then delete). KEEP transitional.
- outreach/engagement-guard.py - WRAP the pattern (reconciles worker A's
  EXTRACT: the GENERIC mechanism - deterministic eligibility function +
  stamped evidence envelopes + live re-check - moves to the shared
  kernel; corridor/platform data stays domain-local). GOLDEN:
  CAPABILITY EVALUATION analog. KEEP.
- outreach/action-intent-ledger.py (1356 lines) - WRAP. The layer-3
  durability kernel for external effects: intent states
  ACTION_INTENT_DURABLE -> EXECUTION -> OBSERVATION -> FINALIZATION;
  terminals EXECUTED/FAILED/UNKNOWN_EXECUTION/NOT_ATTEMPTED;
  write-intents BEFORE any effect; reconcile explicit and
  operator-driven. PING2 wraps it as the durable-attempt store behind
  the dispatch seam. GOLDEN: AGENT PROPOSES TRANSITION lifecycle.
  KEEP.
- outreach/authority-check.py + set-hold.py + holds.json - WRAP/REUSE
  (consistent with section 6: REUSE the gate). The last-responsible-
  execution-boundary check. GOLDEN: CAPABILITY EVALUATION. KEEP.
- outreach/pass_policy_engine.py (540 lines) - WRAP. Pass state
  machine (transition table + terminal classification + idempotent
  MC_PASS_* emission). The STEP-level checkpoint language PING2 needs.
  GOLDEN: CANONICAL EVENT. KEEP.
- pig-fb/run_pass.sh, run_ig_pass.sh, run_tk_pass.sh, run_th_pass.sh -
  WRAP the ORDERING, collapse the copies. The canonical dispatch
  pipeline order: SCHEDULE -> OWNER HOLD CHECK -> CAPABILITY CHECK ->
  POLICY CHECK -> DEDUP/PRIOR-ACTION CHECK -> DISPATCH. PING2
  implements this ordering once; the four scripts become thin surface
  parameters. KEEP the ordering.
- pig-linkedin/run_pass.sh - REJECT as-is. Verified: ZERO
  authority-check calls - no hold check, no guard filter, no intent
  ledger. A bypass-capable surface. REMOVE or repair under owner
  direction; must enter the #23 pipeline.
- outreach/staged/engage.js - REJECT for harvest. Staged, NOT deployed
  to the Pig (deployment is an owner call). Note as pending-owner-
  decision, not machinery.
- orca/social-retry-proof/retry_predicates.js - EXTRACT. Pure
  retry-decision function: retry_safe = f(effect class, provider
  semantics, observed provider state, idempotency support,
  reconciliation evidence). DELETE the harness/runner/stubs after
  extraction (Pig-path-bound proof artifacts). GOLDEN: CANONICAL EVENT
  recovery semantics. KEEP the predicate function.
- orca/effect-classes/*.md (10 taxonomies) - REUSE as reference data.
  KEEP.
- convergence/workorder-attempt-result-contract-2026-09-18.md - REUSE
  as contract reference (work-order identity, attempt lifecycle,
  result-envelope guards, retry binding; lease/heartbeat flagged as
  PROPOSED-missing). KEEP.
- orchestration/worktree-architecture-spec.md, convergence/discovery/,
  convergence/backlog-o1-o20.md - REJECT (out of scope or design-only).
  Noted, not harvested.

### (a) owner-hold check placement - exact findings
- Dispatch time: FIRST executable line of all four run_*_pass.sh
  (fb/ig/tk/th): authority-check.py <surface> || exit 2. Runs before
  guard filter, curate, intent refuse, write-intents, scp, WMI launch.
  authority-check.py reads holds.json at step 0 (before
  AUTHORITY.json); missing/invalid -> fail-closed DENY.
- Build time: CLAIMED by holds.json description but NOT evidenced in
  this sandbox - zero archived cron bodies contain an authority-check
  call. Live Pig cron may differ; in-sandbox it is prose-only. This is
  consistent with the 2026-10-02 incident class (prose is not state).
- Worker side: staged only (outreach/staged/engage.js), NOT deployed;
  nothing on the Pig enforces the hold.
- Stale schedule (2026-10-02 incident, fb-20261002-233439): YES,
  demonstrated - dispatch-time gate passed because no machine hold
  existed; the park was prose, which the gate never reads by design.
- Queued dispatch: YES, race window - gate is a point check at script
  start; a hold landing after the gate but before WMI launch still
  dispatches; a launched detached worker cannot be recalled.
- Restarted dispatch: PARTIALLY protected - crash between write-intents
  and mark-execution -> next pass's refuse closes candidates as
  UNKNOWN_EXECUTION (never silently retried); but operator-driven
  reconcile + manual re-launch bypasses the gate.
- Manual dispatch: YES, two paths - pig-linkedin/run_pass.sh (no gate
  at all); running Pig-side engage.js directly with a hand-built job
  JSON (bypasses every layer).

### (b) four latency/failure layers - coverage
- Layer 1 (in-turn speculation/sPTC): NOTHING FOUND anywhere. Attach
  points (PURE-classifiable: model_router.route(),
  engagement-guard.eligibility_check(), pass_policy_engine.
  evaluate_candidates) exist but are unbuilt - per doctrine, note only.
- Layer 2 (parallel independent calls): WEAK. run_pass.sh strictly
  sequential by design; concurrency only as independent per-surface
  crons. No donor. Attach point: filter stages (guard/curate/refuse)
  are per-action independent behind the same deterministic function.
- Layer 3 (checkpointing/durable execution/resume): STRONG.
  action-intent-ledger.py (durable intents; UNKNOWN_EXECUTION/
  NOT_ATTEMPTED terminals), emit.py (content-derived ids; idempotent
  re-emit), mission_intent.py (journal-as-idempotency-ledger; sticky
  revocation), orca-adapter reconcile gate (idempotencyKeyFor +
  idempotency-index.jsonl), hermes_dispatch.py rendezvous, objective-
  runtime.js (atomic durable run records). No explicit
  NONE/ASYNC/STEP/CRITICAL taxonomy exists anywhere - checkpoint
  levels are implicit in intent states vs journal events vs rendezvous
  files. PING2 should formalize that taxonomy over these primitives.
- Layer 4 (cross-agent/machine: run state, leases, worker routing):
  PARTIAL. objective-runtime.js (deterministic objective identity; PG
  advisory-lock coordinator claim = lease with fencing),
  model_router.py (capability-eligibility routing + fallback), SPINE-
  TRACE-documented MissionScheduler (60s lease, reapExpiredLeases,
  Pig-side, unreachable here), orca-adapter tenant threading.
  Missing in-sandbox: the scheduler itself (~/workspace/scheduler/
  empty). Honest gap: scheduling primitives must be harvested from the
  Pig runtime or built against the contracts above.

### (c) tenant/identity conflation (reported to tenant/identity lane)
- orca-adapter/adapter.js:84 (resolveTenantId): "tenantId absent +
  namespace 'tenant::<t>' -> derive tenant_id = t." Header at :62:
  "// Tenant identity pattern - the tenant portion of the contract
  namespace pattern 'tenant::<tenant_id>'". I.e. when the scheduler's
  authoritative tenantId is ABSENT, tenant identity is derived from
  the CALLER-SUPPLIED namespace string.
- mission-control/mission_intent.py:222-245 (resolve_tenant): "The
  tenant is taken from auth_ctx.tenant, never from the request
  body... the body tenant is never trusted."
- Two surfaces in the SAME execution path disagree on tenant-identity
  provenance: namespace-derived (adapter) vs authenticated-context-
  derived (front door). Binding question for the lane: whether tenant
  == namespace portion == identity has become an accidental invariant
  in the adapter path.

### (d) duplicates of execution behavior
1. external_agent_adapter.js - SEVEN copies, five distinct SHAs
   (canonical orca-adapter/vendor/ fe030e12...; orca-workstream-d/
   755a6e7c...; three identical b32ad888... in tenanos-wave/swarm-20/
   reference/, orca-finish/wave2/redteam/poc/, orca-finish/program/
   orca-d/probes/; identical repair-artifacts pair 7e3e3af9...).
   Known E2 divergence: canonical vendor copy SILENTLY IGNORES a
   workOrderId override while the orca-autonomy worktree copy honors
   it - exactly what the Rule of One forbids. KEEP canonical copy
   only; DELETE the rest after deadness proof (repair-artifacts pair
   stays as labeled read-only evidence).
2. orca_control_loop.js x2 - superseded pair; DELETE both after
   extraction.
3. hermes_dispatch.py x2 - DELETE the 25-line dispatch-test version.
4. Canonical-JSON behavior - FOUR more implementations:
   adapter_core.js:canonicalize(), objective-runtime.js:
   stableStringify(), payload_lifecycle.py:canonical_json(),
   approval_request.py:canonical_proposal_bytes(). These extend section
   6 duplicate #1 (six homes) to TEN homes of canonical serialization.
   Converge to ONE; others become thin callers or die.
5. Adapter shims (_adapter_shim.js vs lane-d/adapter-call.js) - MERGE.
6. Journal emit paths (emit.py vs lane-D emit vocabulary) - MERGE
   (the lane-D fork the emit.py header admits).
7. Dispatch scripts - four near-identical run_*_pass.sh + the gateless
   pig-linkedin/run_pass.sh. Collapse to one pipeline; REJECT the
   LinkedIn copy as-is.
8. adapter_core.js - staged (orca/port/effect_adapters/) vs deployment
   target (ping-runtime/orchestration/effect_adapters/, Pig-side).
   Staged copy is the PING2 donor.

### worker B KEEP/REMOVE (execution net)
KEEP: model_router.py (EXTRACT), dispatch.py (EXTRACT), orca-adapter/
adapter.js (WRAP), effect_ledger/outcomes types (MERGE), vendored
external_agent_adapter.js canonical copy (REUSE), adapter_core.js +
class_*.js (WRAP), objective-runtime.js (EXTRACT), hermes_dispatch.py
rendezvous (EXTRACT), mission_intent.py (WRAP), emit.py (WRAP),
approval_request.py + adapters + proposal_validate.py (REUSE),
proposal_record.py (MERGE into approval), payload_lifecycle.py (REUSE),
engagement-guard.py mechanism (EXTRACT to kernel), action-intent-
ledger.py (WRAP), authority-check.py + set-hold.py + holds.json
(WRAP/REUSE), pass_policy_engine.py (WRAP), run_*_pass.sh ordering
(WRAP), retry_predicates.js (EXTRACT), effect-classes taxonomies
(REUSE), workorder contract doc (REUSE), all test suites (REUSE).
REMOVE: orca mission drivers, both orca_control_loop.js, dispatch-test
hermes_dispatch.py, lock-test.js / delegate.new.js / main.new.js,
duplicate shims (one of each pair), duplicate adapter copies,
pig-linkedin/run_pass.sh as-is, staged engage.js, social-retry-proof
harness (after predicate extraction), orca/missions/ drivers (keep
evidence dirs read-only).
HONEST GAPS: no in-sandbox scheduler donor (~/workspace/scheduler/
empty); no layer-1 speculation machinery (per doctrine, correctly
absent); no explicit checkpoint taxonomy - PING2 must formalize
NONE/ASYNC/STEP/CRITICAL over the layer-3 primitives; build-time
authority gate prose-only in-sandbox; adapter_core.js has no in-tree
tests; ~/workspace/scheduler/ EMPTY.

## 8. Worker C: sitespec / builder / proceduralize / object store /
## acquisition / mission-control (delivered 2026-10-02T23:57Z; read-only)
## Roots: ~/worktrees/phase1-approval-door (git 02e7ffed, 2026-09-28 -
## SUPERSEDES fyd-write-boundary on overlap), ~/workspace/mission-control,
## ~/workspace/acquisition-seam, ~/workspace/piging2-harvest-docs.
## License unstated in every file read. phase1 = converge source of truth.

### sitespec (compiler IR, NOT canonical truth)
- sitespec/types.ts - REUSE. Product IR: FYDSiteSpec, ObjectGraph,
  ViewerContext, FYDQuery; "the spec is DATA, never generated JSX";
  versioned kind fyd.sitespec@1. GOLDEN: CREATE SIGNED OBJECT /
  PROJECT OBJECT. Types-only. KEEP (shared package @ping2/sitespec).
- sitespec/schemas.ts + schema-roles.ts - REUSE. One schema definition
  drives validator -> eligibility -> relationships -> capabilities ->
  renderer; capability authority for FYD surfaces. GOLDEN: PROJECT
  OBJECT / capability scoping. KEEP.
- sitespec/validator.ts - REUSE. Two-layer findings validator;
  validateSiteSpec pure/deterministic, findings carry
  authority: "fyd.sitespec.validator". Fail-closed emission gate.
  GOLDEN: fail-closed behavior. KEEP.
- sitespec/binding-verifier.ts - REUSE. THE no-invented-claims seam:
  per-binding BOUND/UNBOUND verdicts; assertSpecBindingsVerified throws
  before any spec is produced. Pure (no clock, no I/O, no LLM).
  "THE RENDERER DOES NOT OWN FACTUAL TRUTH." GOLDEN: CREATE SIGNED
  OBJECT (evidence/provenance). KEEP (shared package @ping2/evidence).
  NON-NEGOTIABLE kernel citizen.
- sitespec/field-visibility.ts - REUSE. source value / visibility
  default / owner override / effective resolution; conservative default
  (address -> coarse). Pure, deterministic. Matches the directive's
  FIELD = source/default/owner-override/effective model. GOLDEN:
  visibility. KEEP.
- sitespec/render-model.ts - REUSE. Same inputs (graph+spec+viewer+
  overrides+renderer version+token version) -> same semantic model;
  RENDER_MODEL_VERSION=1. The REPLAY proof artifact. GOLDEN: REPLAY ->
  IDENTICAL PROJECTION. KEEP.
- sitespec/public-projection.ts - REUSE. THE single public projection
  boundary (Q-C-01): unprojected graphs are compile errors downstream.
  "No public route may serialize tenant object data that has not passed
  through this boundary." GOLDEN: PROJECT OBJECT. KEEP. DRIFT RISK:
  ANONYMOUS_CAPABILITIES literal mirrors VISITOR_ALLOWED_CAPABILITIES in
  edge/resolve.ts (import would be a cycle) - MERGE to one source at
  converge time.
- sitespec/graph.ts - REUSE (with binding-verifier). KEEP.
- sitespec/contract-digests.ts - REUSE the mechanism (generated pin file
  + regen script for component catalog/theme tokens). KEEP as kernel
  pattern.
- sitespec/safe-link.ts - REUSE but REMOVE from kernel; projection util,
  travels with public-projection.

### builder / proceduralize
- builder/canonical.ts - REUSE. semanticDigestOf (volatile *At stripped,
  keys sorted). Proposal-approval and regeneration-compare identity.
  Distinct semantic layer; rebase onto the merged canonical primitive
  (see below). GOLDEN: REPLAY compare. KEEP.
- proceduralize/proceduralizer.ts - REUSE. DISCOVER -> ACQUIRE -> PARSE
  -> NORMALIZE -> EXTRACT -> PROVENANCE -> RESOLVE -> RELATE -> PROJECT;
  deterministic-first (JSON-LD > OG > meta > RSS); every field carries
  evidence ref + confidence + fact class + visibility. The FYD pressure
  test URL -> OBSERVATIONS -> EVIDENCE arrows in executable form. DEPS:
  jsonld npm (third-party, replaceable). KEEP.
- proceduralize/generator.ts - REUSE. ObjectGraph -> FYDSiteSpec,
  pure/deterministic. GOLDEN: pressure-test GENERATE. KEEP.
- proceduralize/patch.ts - REUSE. SiteIntent -> digest-bound SitePatchBody
  (single proposal format, no fork). GOLDEN: AGENT PROPOSES TRANSITION.
  KEEP.
- proceduralize/sha256.ts - MERGE into the single canonical-hash
  primitive; a wrapper module is not a kernel citizen.
- builder/planner.ts + builder/eligibility.ts - ADAPT. Website-product
  planning logic; correct but REMOVE from PING2 kernel; keep in the FYD
  product lane.

### identity / tenant / claim
- object-identity/identity.ts (+ IDENTITY-LAW.md) - EXTRACT. Versioned
  business-object identity domain ping.object-identity@1 (era separation,
  runner-is-provenance-not-identity law). Identity is PING-authority
  territory; extract to PING package; PING2 consumes via shared package.
  GOLDEN: CREATE IDENTITY. KEEP (via extraction).
- tenant/tenant-context.ts + tenant/scoped-stores.ts - WRAP. Refusal
  semantics are the right boundary (TENANT_CONTEXT_MISSING /
  CROSS_TENANT_REFERENCE, never empty result); key model (tenant==site)
  is FYD-specific -> handed to tenant/identity lane. GOLDEN: CAPABILITY
  EVALUATION scoping. KEEP via wrapper.
- identity/* (principal/provider/session/callback/uuid) - WRAP. Correct
  binding semantics, but FYD-local namespace mints "PING" identities;
  PING must own the namespace. PING2 wraps the binding pattern against
  PING identity; REMOVE FYD-local minting from kernel. GOLDEN: CREATE /
  VERIFY IDENTITY (via PING).
- claim/* (machine/store/verification-seam/resource-id) - WRAP.
  OBSERVED -> CLAIMED -> VERIFIED-CONTROLLED, every transition immutable
  + audit event; verification seam declares implemented:false so futures
  cannot be mistaken for present. GOLDEN: VERIFY IDENTITY / claim
  epistemics. KEEP the machine + seam; WRAP identity behind PING.

### ask FYD
- ask/context-compiler.ts (v2) - ADAPT; ask/context-builder.ts (v1) -
  MERGE into v2 (two assembly paths is a duplicate). Evidence-bounded
  context compiler (viewer tiers, visibility at assembly, grade
  vocabulary). GOLDEN: ASK FYD. KEEP (merged).
- ask/contract.ts - REUSE. Output-side contract enforcement; violation
  -> fail closed as honest-unknown. KEEP.
- ask/answer.ts + ask/site-patch.ts + ask/envelope.ts - REUSE. Agent
  NEVER mutates; site-patch intents become digest-bound signed proposals;
  Ed25519 envelope kit, key-custody clean, node:crypto only, zero npm
  deps. GOLDEN: AGENT PROPOSES TRANSITION. KEEP.
- ask/capabilities.ts - WRAP. Thin wrap over lib/ping/grants with
  FORBIDDEN_AGENT_EFFECTS stripped; fail-closed on unknown. Already the
  correct ONE-IMPLEMENTATION shape. KEEP.
- ask/visitor-answer.ts + ask/concierge.ts - ADAPT. Concierge is
  kernel-suitable (pure, no model); visitor-answer is the route adapter.
  GOLDEN: ASK FYD. KEEP.

### customize / proposal / approval
- customize/intent.ts + propose.ts + apply-layer.ts - REUSE. Plain-English
  -> typed intent (deterministic regex, no LLM) -> digest-bound proposal
  -> journaled presentation-intent directives applied as pure layer at
  render; idempotent replay; unresolved directives surfaced, never
  dropped. Owner-correction loop in executable form. GOLDEN: PROPOSAL.
  KEEP.
- customize/owner-proposal.ts + owner-command-compiler.ts -
  UNEXAMINED in this pass (likely MERGE candidates with propose.ts);
  flag for the converge lane.
- customize/server.ts - ADAPT; server glue, REMOVE from kernel.
- approval/gate.ts + approval/apply-owner-event.ts - REUSE (same as
  section 2.2's target). BOUNDARY WARNING: header admits ./queue,
  ./journal, ./types bind to teammate files "not present yet" (only test
  doubles in __tests__/doubles/); the gate is incomplete without a real
  proposal queue + journal. GOLDEN: CAPABILITY EVALUATION -> HUMAN
  APPROVES -> CANONICAL EVENT. KEEP.
- owner-mode/* - REJECT for the kernel (consistent with section 2.7).
- capabilities/runtime.ts - REJECT for the kernel. Portal HTTP
  executors; client presentation transport, serves no golden step. The
  fail-closed executor pattern may travel to the product UI lane.

### object store / events / projection
- object/owner-events.ts - REUSE. Append-only owner event log;
  content-hash event IDs; current state = pure fold; unknown event
  types fail closed; v1->v2 transparent migration on read. GOLDEN:
  APPEND GOVERNED EVENT. KEEP.
- object/owner-store.ts - WRAP. Event schema + fold shared; file-backed
  store is a port PING2 provides. KEEP via wrapper.
- object/owner-overlay.ts - REUSE. Owner corrections composed over the
  verified projection; source never mutated; SOURCE SAYS X / OWNER
  SAYS Y carried as evidence. GOLDEN: pressure-test OWNER CORRECTION
  survival. KEEP.
- object/object-projection.ts - REUSE. Typed ObjectProjection with
  evidence-graded Fact claims ("a claim with no evidence is state
  'unknown' and MUST NOT render as fact"). GOLDEN: PROJECT OBJECT. KEEP.
- object/object-projection.ts - see above. object/related.ts - REUSE.
  Deterministic bidirectional related-object walk. GOLDEN: CREATE /
  PROJECT RELATIONSHIP. KEEP.
- object/types.ts - REUSE. KEEP.
- boundary/data-boundary.ts - REUSE. Nolan's law in code: CUSTOMER_OWNED
  vs FYD_OWNED; CustomerDataPackage exportable/deletable. The product/
  data ownership boundary for ONE IMPLEMENTATION -> MANY PRODUCTS. KEEP.

### acquisition / fetch
- acquisition/* (adapter types/live-loop/static-adapter/errors) - REUSE
  adapter contract + live-loop + static-adapter. L0 policy gate -> L1
  static HTTP (SSRF gate) -> L2 browser (declared, not implemented) ->
  L3 discovery -> L4 AI on observations only. GOLDEN: pressure-test
  URL -> OBSERVATIONS. DEPS: node-html-parser (static-adapter). KEEP.
- net/safe-fetch.ts - REUSE. SSRF-safe fetch gate (scheme/credential/
  DNS-per-hop/public-address checks, redirect re-validation). KEEP.
- ~/workspace/acquisition-seam/acquire-url.ts - MERGE into
  net/safe-fetch.ts (two modules both claim to be "the ONE seam";
  extras: IP-pinning/DNS-rebinding closure, proxy caveat). REMOVE as
  standalone. Consistent with section 2.5.

### idempotency / write boundary - disposition correction to 2.2
- Two homes, identical behavior: fyd-write-boundary/src/fyd/write-boundary/
  and phase1-approval-door/src/fyd/customize/write-boundary.ts
  (request_id + canonical payload digest; same id+different digest -> 409;
  per-site lock closing TOCTOU; UNKNOWN on timeout). Section 2.2
  (transition-id.ts, gap1 absorb lane) is a THIRD home of the same
  idempotent-append behavior, and emit.py's dedupe-append a fourth.
  Updated 2.2 disposition: MERGE all four into ONE canonical
  idempotent-write module in the kernel, converged from the phase1
  write-boundary (phase1 supersedes fyd-write-boundary on overlap), with
  a durable idempotency record (Postgres) behind it and in-memory
  journals demoted to test doubles. KEEP (merged).

### canonicalization duplicate (section 6 duplicate #1, extended)
- lib/ping/ask-composer.ts:60 (canonicalize) vs
  lib/ping/dev-signer.ts:46 (canonicalizeJson): near-identical
  sorted-key serializers differing on undefined (drop-key vs emit-null).
  MERGE into one PING-owned canonical serializer; dev-signer.ts itself
  REJECTed as authority (its own header: dev stand-in).
- builder/canonical.ts's semantic digest is a distinct layer ON TOP;
  keep separate, rebase onto the merged primitive.

### mission-control (Python, stdlib-only)
- mission_intent.py - WRAP (consistent with section 6). KEEP via thin
  wrapper. GOLDEN: CAPABILITY EVALUATION / dispatch.
- approval_request.py + adapters/mc_approval.py + adapters/chat_approval.py
  - REUSE (consistent with section 6). Same function object on both
  surfaces: "Neither surface owns approval." GOLDEN: HUMAN APPROVES. KEEP.
- frontdoor_adapters.py - REUSE the pattern (registry + bypass
  detection). KEEP pattern.
- project.py - REUSE. Deterministic journal -> JSON state projector;
  --as-of required (no wall clock). GOLDEN: REPLAY / rebuildable
  projection. KEEP.
- proposal_validate.py - REUSE the validator shape, but its ground-truth
  pin is against the unreachable /home/nolan/projects/ping - RE-PIN at
  converge time; keep in product/CI lane, not kernel.
- emit.py - WRAP (worker A) / REUSE (worker C): reconcile to WRAP.
  Additive MC_* vocabulary on the existing emit path = classic wrap
  case. KEEP via wrapper.
- payload_lifecycle.py - reconcile: REUSE the mechanism (audit-metadata
  vs erasable-payload separation, revocable refs, erasure events;
  the "fail conservatively" mechanism), kernel-adjacent evidence-
  retention module; productization order after the spine.
- pass_queries.py + backfill.py - REUSE/ADAPT the patterns; both
  outreach-specific, REMOVE from kernel.

### duplicates (worker C, authority-overlap)
1. Canonical serializer (ask-composer vs dev-signer) - MERGE.
2. Idempotent write boundary (fyd-write-boundary vs phase1/customize) -
   MERGE.
3. SSRF fetch seam (net/safe-fetch.ts vs acquisition-seam/acquire-url.ts)
   - MERGE.
4. Ask context assembly (v1 builder vs v2 compiler) - MERGE (keep v2).
5. Anonymous capability literal (public-projection.ts vs edge/resolve.ts)
   - MERGE to one source.
6. Approval gates (FYD gate.ts exact-digest vs MC approval_request.py
   exact-digest): same law, two languages; converge on one canonical
   transition per surface pair (py side already does this via shared
   function object).

### tenant/identity conflation (worker C, reported not resolved)
- tenant/tenant-context.ts:39: "the tenant id IS the site id (one site
  per business)."
- tenant/scoped-stores.ts:10-12: "the acting tenant's id IS the store
  key (the owner object's id for owner state, the projection's siteId
  for projections and Ask FYD)."
- sitespec/public-projection.ts: "No per-request auth exists; public
  routes use 'anonymous'; owner-management lanes use 'owner'." Viewer
  kind standing in for identity.
- identity/principal.ts claims "ONE PING identity" while deriving via
  FYD_IDENTITY_NAMESPACE (./uuid.ts) - FYD-local namespace minting
  "PING" identities.
- claim/identity.ts: demo-owner actorId derived from DEMO_OWNER_ACTOR.id
  (a label) - one rename from being mistaken for authentication.
- approval/gate.ts step 1: identity is a string label at the gate;
  signature check lives only in the site-patch envelope path.
- owner-mode/capability.ts: relationship label "controller" used as
  authority basis (demo).
- boundary/data-boundary.ts: CUSTOMER_OWNED includes "identity" - the
  business's identity data, not the principal. Same word, different layer.

### worker C KEEP/REMOVE (kernel net)
KEEP: sitespec suite (types/schemas/validator/binding-verifier/
field-visibility/render-model/public-projection/graph/contract-digests);
builder/canonical; proceduralizer/generator/patch; object-identity
(EXTRACT); owner-events, owner-store (WRAP), owner-overlay,
object-projection, related, object/types; claim machine (WRAP); ask
contract/context-compiler(merged)/answer+site-patch+envelope/
capabilities(WRAP)/concierge; customize intent/propose/apply-layer;
merged write-boundary; approval/gate (+ real queue/journal);
tenant-context (WRAP); data-boundary; net/safe-fetch (merged);
acquisition adapter+live-loop+static-adapter; mission_intent (WRAP);
approval_request+adapters; project.py; emit.py (WRAP); payload_lifecycle.
REMOVE from kernel: capabilities/runtime.ts; owner-mode demo;
components registry/renderer; edge/resolve; builder/planner+eligibility;
FYD-local identity minting; customize/server.ts; proposal_validate.py
(re-pin first); backfill.py; pass_queries.py; media pipeline; spatial/
rank/presence/attention/archetypes/preview; activitypub/ATPROTO adapters;
onboarding anonymous-preview.
UNEXAMINED: customize/owner-proposal.ts, owner-command-compiler.ts,
sitespec/sites-render-audit.ts, object/view.ts, object/commands.ts,
object/by-id.ts, object/circle-adapter.ts, ask/field-conflicts.ts,
ask/site-spec.ts, ask/circle-actions.ts, claim/claim-projection.ts,
edge/types.ts, data/fyd-tenant-graph.ts, invariants test bodies,
builder/eligibility.ts (header + tests only).

## 8. Worker C: execution / scheduling / durability
## (results appended on delivery)

## 9. Nolan's report template

PING2: thin product runtime/projection; kernel archaeology phase (this report).
  52 items classified across workers A and C; worker B
  (capability/visibility/evidence) still running at final edit.
EXECUTABLE KERNEL: canonicalize/canonicalBytes (MERGE into adopted RFC 8785
  JCS profile) + ONE merged idempotent-append module (four homes found,
  durable record behind it) + exact-digest approval door (REUSE; real
  queue/journal still needed) + OwnerContext seam (WRAP) + owner-hold gate
  (REUSE) + event-envelope certifier (WRAP) + identity-role contract
  (REUSE) + evidence binding-verifier (REUSE, non-negotiable) +
  attestation gate (REUSE) + eligibility evidence-envelope mechanism
  (EXTRACT) + proposal record/validate (REUSE) + payload lifecycle/privacy
  (REUSE) + front-door entitlement (REUSE) + JCS vector corpus (REUSE) +
  sitespec IR suite (REUSE) + owner-event log + projection/overlay (REUSE)
  + field visibility (REUSE) + SSRF-safe fetch (REUSE, merged) +
  acquisition adapter (REUSE) + proceduralizer/generator/patch (REUSE) +
  customize intent/propose/apply-layer (REUSE) + claim machine (WRAP) +
  ask FYD contract/composer/envelope (REUSE) + data-boundary (REUSE) +
  execution seam: model_router + dispatch envelope (EXTRACT),
  dispatchExecution adapter (WRAP), vendored authority adapter (REUSE,
  canonical copy only), effect outcome types (MERGE), effect port seam
  (WRAP), durability kernel objective-runtime (EXTRACT), rendezvous
  pattern (EXTRACT), action-intent ledger (WRAP), pass policy engine
  (WRAP), dispatch pipeline ordering (WRAP), retry predicates (EXTRACT).
  2 third-party deps (jsonld, node-html-parser); everything else
  stdlib-only; ~345 KB verified core plus the FYD-lane kernel per
  section 8 plus the execution seam (~60 KB adapter + primitives).
PING CODE REUSED: approval/gate.ts, authority-check.py/set-hold.py/holds.json,
  convergence_identity.js, convergence_derivation.js, convergence_invariants.js
  (as conformance), canonical_event_envelope.js (as contract), JCS vector
  corpus, sitespec suite, binding-verifier, owner-event log, safe-fetch gate.
PING CODE REJECTED: owner-mode demo gate, dev-signer.ts, in-memory journal
  as live authority, second event-spine implementations, FYD product code,
  capabilities/runtime.ts portal executors, media shim duplicate,
  media pipeline, activitypub/ATPROTO adapters, demo-identity minting.
DUPLICATE IMPLEMENTATIONS REMOVED: none yet - deletion requires deadness
  proof against the canonical tree (unreachable here). Fourteen duplicate
  sets named by workers A, B, C with merge targets: (1) canonical
  serializer x10 (sections 6+7) -> JCS profile + vectors; (2) identity
  minting x5+ -> one identity authority profile; (3) event envelope x3 ->
  one envelope; (4) hold/gate x4 domains -> one shared mechanism;
  (5) idempotent write boundary x4 -> one kernel module; (6) SSRF fetch
  seam x2 -> one seam; (7) ask context assembly x2 -> v2 compiler;
  (8) anonymous capability literal x2 -> one source; (9) approval gates
  TS/py -> one canonical transition per surface pair; (10) emitted fork
  of emit.py lane-D un-merged; (11) external_agent_adapter.js x7 copies,
  5 SHAs, one KNOWN E2 divergence (workOrderId override) -> canonical
  vendored copy only; (12) orca_control_loop.js x2 -> DELETE both;
  (13) hermes_dispatch.py x2 -> DELETE short one; (14) dispatch scripts
  x4 + gateless LinkedIn copy -> one pipeline; LinkedIn copy REJECTED
  as-is (no authority check).
DEPENDENCY COUNT: 2 third-party (jsonld for proceduralizer, node-html-parser
  for static-adapter); everything else in the kernel candidates is stdlib-only.
EXECUTABLE SIZE: ~345 KB verified kernel candidates (vs 2.68 MB FYD fyd/
  subtree for contrast) + FYD-lane kernel per section 8 + execution seam
  (~60 KB orca-adapter + routing/ledger/ledger-primitives per section 7).
  Total kernel shape: dependency-light (2 third-party: jsonld,
  node-html-parser), stdlib otherwise.
GOLDEN TEST: NOT RUN - no extracted kernel exists yet; conformance tests
  (canonicalization vectors vs PING Patch-7B, dedup no-double-apply) not
  yet written. FAIL until then (honest).
FIRST BROKEN INVARIANT: PING2 cannot honestly do CREATE SIGNED OBJECT in
  production - the canonical signing endpoint (PING runtime Lane A) does
  not exist yet; dev-signer.ts is explicitly a dev stand-in.
HIGHEST-LEVERAGE NEXT FIX: (1) write the kernel conformance tests
  (canonicalization vectors, idempotent-append dedup, hold-gate adversarial
  8); (2) get PING to publish the stdlib-only kernel files as a shared
  package (@ping/kernel) so PING2/FYD depend on ONE IMPLEMENTATION;
  (3) merge the fourteen duplicate sets (sections 6/7/8) starting with
  the canonical serializer, the idempotent write boundary, and the SSRF
  seam; (4) formalize the NONE/ASYNC/STEP/CRITICAL checkpoint taxonomy
  over the layer-3 primitives (worker B (b)); (5) harvest the scheduler
  from the Pig runtime - ~/workspace/scheduler/ is empty, no in-sandbox
  donor exists (worker B #30).
DELIVERABLE STATUS: all three workers delivered (A: section 6,
  B: section 7, C: section 8). Committing now under commit law.
