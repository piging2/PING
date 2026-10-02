# ABSORB REPORT — GitHub harvest, top-3 absorption (2026-09-21)

Scope note: this is the **GitHub/PING-runtime harvest lane** (C1–C10 from
`~/workspace/fyd-lane/harvest-report.md`), not the parallel web-source wave
(`harvest-wave1/top3-synthesis.md`, which ranked JCS etc.). Different sources,
different top-3. No duplication: that wave harvested web standards; this lane
harvests Nolan's own runtime patterns.

All absorbed code is **staged** in `~/workspace/fyd-lane/absorb/` (src/ + test/).
It was NOT placed in `/home/nolan/projects/ping` — the portal placement
coordinator is mid-flight on that dirty tree. Zero writes to any repo.

## What was absorbed

**C3 — verifyPresentationBinding (highest leverage).**
`src/binding-verifier.ts`. The accumulate -> verify -> rank/drop pattern from
`EvidenceAuthority` (harvest-wave1/code-evidence/evidence_authority.js), FYD-sized
and in-memory (no PG dependency). Every candidate binding for a render is
verified by recomputing the claim's evidence hash and walking
claim -> evidence -> observation -> source. Unsupported, missing, or tampered
evidence FAILS CLOSED (`verified: false` + typed reason) — never "healthy".
Unverifiable bindings are dropped from the presentation set, never rendered.
Ranking keeps PING's discipline: null confidence -> 0.5, never 1.0.

**C6 — causation fields (rode along with C3).**
`causation_id` + `confidence_source` (direct/derived/inherited/owner-asserted)
on every evidence and claim record, harvested from `BaseWorker._emit`.
`walkCausation()` makes WHY THIS a chain walk: intact chain returns
claim -> evidence -> observation -> source; a dropped record reports exactly
where the chain broke (never silently intact).

**C1 — deterministic transition identity + idempotent append.**
`src/transition-id.ts` + `src/canonical.ts`. The pattern from
`UnifiedEventRuntime.emit` (content-hash ID, ON CONFLICT DO NOTHING dedup),
with the harvest-report key-order flag FIXED at absorption time: FYD uses the
Patch-7B canonical serializer (recursive key sort, arrays ordered,
undefined -> null) instead of the spine's raw JSON.stringify. `generator_version`
is bound into the identity — matching FYD's determinism contract
(SiteSpec = f(ObjectGraph, OwnerPolicy, ViewerContext, GeneratorVersion)) —
the same way PING's IdentityAuthority binds constitutional_version.
`TransitionJournal.append()`: second emit of the same logical transition
returns `deduped` and changes no state.

**C4 — failure-honesty gate.**
`src/attestation-gate.ts`. The W7 WitnessWorker pattern made executable for
FYD: every attestation (`regen-complete`, `correction-survived`,
`refresh-applied`) checks its named evidence preconditions FIRST. Missing
evidence -> `ATTESTATION_REJECTED` with reason `missing_evidence:<names>`,
and the emit callback is never invoked. Explicit null is NOT evidence.
Unknown attestation kind throws (refuses to guess preconditions).
This is Nolan's law — missing evidence NEVER becomes HEALTHY — as code.

## What the tests proved (41/41 passing, `npx tsx --test`)

- Key-order permutation (flat AND nested) -> identical canonical bytes and
  identical transition IDs; array order stays semantically significant.
- Same logical transition hashed twice -> identical ID (process-boundary safe).
- Double emit -> `deduped`, journal size and state unchanged; key-order-permuted
  payload dedups against the original.
- Tampered evidence (bytes edited after commit) -> UNVERIFIED,
  `tampered_evidence: hash mismatch on recompute`.
- Deleted evidence / missing claim / missing observation / missing source /
  namespace mismatch / rejected evidence / unsupported binding shape / evidence
  without hashable bytes -> all UNVERIFIED with typed reasons. Nothing renders.
- Null-confidence binding ranks strictly below an explicitly assessed one
  (0.5 x provenance < 0.9 x 0.9).
- WHY THIS chain: intact chain walks fully; dropped evidence reports
  `brokenAt: 'evidence'`.
- All three attestation kinds: full evidence -> ATTESTED with emit invoked;
  one missing precondition -> ATTESTATION_REJECTED naming it, emit never called;
  empty evidence -> rejected naming every precondition; explicit null rejected.
- Fail-closed edges: unsupported canonical types throw; unknown attestation
  kind throws.

Run: `cd ~/workspace/fyd-lane/absorb && npx tsx --test test/*.test.ts`
(41 tests, 4 suites, 0 failures, 2026-09-21.)

## What stays deferred (recorded, not built)

- **C2** loop-stage map + idempotent run IDs + lease: serves the resumable-loop
  seam; build when the customer loop needs crash-resume, not before.
- **C5** capability registry: the cheapest correct foundation for the future
  action substrate; build when the first provider action is specified.
- **C7** lineage worker: C6 fields make lineage derivable by query; implement
  only if WHY THIS queries get slow.
- **C8** generator manifest + input-audit gate: build when the generator's
  determinism contract needs mechanical enforcement.
- **C9** tenant config identity: build when customer #2 exists; isolation
  (PRINCIPAL -> TENANT -> OBJECT -> CAPABILITY) is separate future work and was
  explicitly NOT claimed by absorbing the config pattern.
- **C10** answered (identity era: content-hash, transitional; canonical bytes:
  key-sorted JSON/UTF-8; hash domain: SHA-256 hex; event era: ping_events
  journal; replay contract: journal read-back unwired — D1 stands). Nothing to
  build; the answers fed directly into C1's serializer design.
- **Danger list D1–D11**: all REJECT/FLAG verdicts stand. Notably D1 (fake
  replay) and D11 (healthy/verified naming): the absorbed C4 gate is the
  executable guard against exactly this failure class.

## Ingestion evidence

- `~/workspace/fyd-lane/harvest-wave1/CODE-INGESTION-INDEX.md` — 16 files,
  byte counts, md5s, source paths, per-candidate verification notes.
- `~/workspace/fyd-lane/harvest-wave1/code-evidence/` — the 16 ingested files.
- Corrections vs the pattern report: tenant config path is
  `src/config/tenant.ping.v1.json` (report path was stale); no LICENSE at
  either repo root (diligence gap recorded); ping-website/HPP unreachable via
  this route (FL-20260921-224).

## Constraints honored

No git writes/commits/pushes in any repo. No credential regeneration or request.
No Pig reboot. Placement coordinator's tree untouched (verified: all work in
~/workspace/fyd-lane/). Failures recorded in FAILURE_LEDGER.md before narration
(FL-20260921-223, FL-20260921-224).
