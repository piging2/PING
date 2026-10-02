# MC-11 / MC-25: VERIFIED-mint static emitter audit

**Date:** 2026-09-30 (night shift, read-only analysis)
**Task:** Static grep for code that mints or emits a `VERIFIED` status or claim, with a proof-gate verdict per emitter.
**Method:** `grep -rn` over source files (py/js/ts/tsx), test files and comments excluded unless they show production minting. Each candidate read in context to classify the mint and its gate.

## Scope note (substitution)

The task-specified trees `/home/nolan/ping` and `/home/nolan/projects/ping-askfyd-gold` do not exist in this sandbox (`/home/nolan` is absent). Substituted with the local equivalents:

- Tree 1 (main checkout): `~/workspace` - the local PING repo working tree (`git remote origin = github.com/piging2/PING`).
- Tree 2 (askfyd): `~/workspace/askfyd` - the Ask FYD gold-set lane.

Additionally swept: `~/workspace/mission-control`, `~/workspace/orca`, `~/workspace/tenant-os`, `~/workspace/tandem`, `~/workspace/outreach`, `~/workspace/fyd-product-lane/src`, `~/workspace/fyd-build/src`, `~/workspace/fyd-lane`, `~/workspace/fyd-deploy`, `~/workspace/work-askfyd`, `~/workspace/crx-audit`, `~/workspace/crx-convergence-sweep`, `~/workspace/design-sprint-2026-09-26`, `~/workspace/fyd-factory`, `~/workspace/edge-proof`, and the lane worktrees under `~/worktrees/`.

The `~/workspace/askfyd` tree produced zero `VERIFIED` hits in source files. Worktree hits were duplicates of main-tree code unless noted. No git operations beyond read-only file reads; no Pig access; no code changes.

## Proof-gate verdicts

- **PRESENT**: an explicit verification or proof check runs before the mint (fail-closed).
- **ABSENT**: no visible gate at the mint site.
- **UNKNOWN**: cannot determine statically (gate delegated upstream, asserted in prose, or determined by another writer).

## Emitter table

| # | Emitter file | Line | Mint site (what is marked VERIFIED) | Proof gate | Notes |
|---|---|---|---|---|---|
| 1 | `mission-control/staging/mc/src/app/mission-control/page.tsx` | 893 | TruthBadge renders `"VERIFIED"` for any object whose `provenanceKind === "canonical-journal"` (object-provenance projection) | **ABSENT** | Declarative mapping only; no verification call at the mint site. Upstream `api/mc/object/route.ts` does a journal event lookup for evidence, but this mapping does not consult it: provenance KIND alone suffices for the VERIFIED badge. |
| 2 | `mission-control/staging/mc/src/app/mission-control/page.tsx` | 1350 | Static `prov` metadata `truth: "VERIFIED"` on the "Withheld controls" card | **ABSENT** | Hardcoded self-label; no runtime check behind it. |
| 3 | `mission-control/staging/mc/src/app/api/mc/agents/route.ts` | 101 | `displayState()` returns `"RECORDED - EFFECT VERIFIED"` when a ledger verdict key matches `/proven/i` | **UNKNOWN** | The mint requires a "proven"-named verdict key in the ledger row, but what makes a verdict "proven" is defined wherever verdict keys are written, not here. Statically undeterminable. |
| 4 | `mission-control/mission_intent.py` | 737 | `_terminal_verified()`: THE reference proof gate for the MC lane (returns bool; no VERIFIED string minted here). A terminal is trusted only when a preceding `MC_WORK_ORDER_ISSUED` binds the same work_order_id, tenant, idempotency_key, and intent_digest. Consumers: `find_intent_record` (line 802) and `frontdoor_adapters._verified_coverage` | N/A (it IS the gate) | Strongest MC-side gate: issuance-chain verification with positional ordering (issuance must precede the terminal). |
| 5 | `fyd-product-lane/src/fyd/claim/machine.ts` | 115-142 (mint at 138) | `verifyControl()` mints claim state `"verified-controlled"` (lowercase VERIFIED claim mint). Also: API route `src/app/api/fyd/claims/[resourceId]/verify/route.ts` (POST) which calls it under a demo-owner-mode 403 gate | **PRESENT** | Machine gate: state must be `claimed`, `claimedBy` set, `isVerificationMethodImplemented(method)` must pass, written basis >= 10 chars, else `ClaimError`. Caveat: the only implemented method is `operator-attestation`, which the code honestly labels as a statement, not a cryptographic proof of domain control (`verification-seam.ts`). Gate is real but syntactic. Duplicate copy: `fyd-lane/claim/machine.ts:138` and worktree copies (`fyd-write-boundary`). |
| 6 | `fyd-product-lane/src/fyd/sitespec/binding-verifier.ts` | 520-546 (mint at 546) | `buildVerifiedRenderModel()` emits the VerifiedRenderModel envelope stamped `version: "fyd-verified-render-model@1"` | **PRESENT** | Fail-closed emission gate: any UNKNOWN atom (unsupported factual content) throws `BindingVerificationError` before a model is produced. Every factual atom must carry VALUE + CLASSIFICATION + EVIDENCE_REF or OWNER_ASSERTION_REF. Duplicate copies in `~/worktrees/fyd-write-boundary` and `~/worktrees/gap1-F2-absorb-floats`. |
| 7 | `fyd-lane/absorb/src/binding-verifier.ts` | 156-203 (mint at 203) | `BindingVerifier.verify()` emits per-binding verdict `{verified: true, ...}`; `verifyAll()` (218-227) accumulates `verified` / `rejected` sets | **PRESENT** | Strongest per-binding mechanical gate found: recomputes the evidence SHA-256 hash and walks claim -> evidence -> observation -> source plus namespace consistency; any failure fails closed with `verified: false` and a reason. |
| 8 | `outreach/action-intent-ledger.py` | ~1033-1076 (mint at 1076) | `cmd_verify_effect` appends an EFFECT_VERIFICATION record and prints `{"verified": True, "intent_id": ..., "verdict": ...}` | **PRESENT** | Gate: intent terminal must be EXECUTED (`_require_executed`), observer channel must be independent of the worker evidence (self-verification fails closed), `--evidence-ref` and `--effect-summary` required. |
| 9 | `tandem/emit-observation.py` | 625 | Emits `OBSERVATION_CREATED` event with `'verification_status': 'verified'` in `event_data` | **PRESENT** | `_require_verified()` refuses (exit 2) before any network POST unless the newest ok run's sidecar carries a `'verified'` transition; duplicate-emission guard blocks re-emitting an already-accepted observation. |
| 10 | `tandem/mark-verified.sh` | n/a (script; transition write in embedded Python) | Appends `{"state": "verified", "at": ..., "by": "mark-verified.sh (...)"}` to the answer sidecar's transitions | **ABSENT** | The script enforces only that the sidecar exists and its status is `answer_captured`. Content verification (the "outreach engine runs web-search verification") is asserted in comments, not enforced. This is the upstream mint that emitter #9 trusts. |
| 11 | `tandem/entity-dossier.py` | 537 (also 545, 550) | Entity dossiers mint `"status": "verified"` and `"grade": "verified"` for round-52 businesses | **UNKNOWN** | Verification basis asserted in record metadata ("independent web search by outreach engine (round 52); 10/10 named businesses verified") and linked to the PING-accepted event, but no mechanical re-verification at the mint site. |

## Explicitly reviewed and excluded (not mints)

- `mission-control/staging/mc/src/app/mission-control/page.tsx:29,40` - `Truth` union type and `TRUTH_STYLE` map: constant declarations with no emission.
- `mission-control/project.py:91` - `row["status"] = "PASS-UNVERIFIED"`: marks UNverified (the opposite).
- `mission-control/mission_intent.py:610`, `mission-control/frontdoor_adapters.py:224,253` - docstrings describing VERIFIED terminals (prose, not minting).
- `mission-control/project_ping_action.py:148` - reads `VERIFIED_EFFECT` records from a chain (reader, not emitter).
- `fyd-build/src/fyd/claims/claims.ts:12,41` - "CURRENT VERIFIED FRONTIER" in comments.
- `fyd-product-lane/src/fyd/proceduralize/structured-data.ts:320,476` and `proceduralizer.ts:1121,1172` - "@GRAPH VERIFIED" completeness comments.
- `fyd-product-lane/src/lib/assignment-store.ts:538` - `'ATOMIC_CAS_VERIFIED'` console.log trace tag, not a status.
- `outreach/action-truth-append.py:99` - `"verified"` as a caller-supplied counter field in a telemetry record (no status minted).
- `outreach/send-batch.py` (`~/worktrees/...`) - `"SENT+VERIFIED"` log strings: send-log tag meaning a message id was returned (receipt-level, not a claim).
- `~/worktrees/fyd-write-boundary/*` claim machine and binding-verifier copies: duplicates of emitters #5 and #6, no independent mints.

## Summary

Eleven VERIFIED mint sites across the local trees, in three families:

1. **Mission Control UI projection (weakest gates):** the staged MC page mints VERIFIED badges by declarative mapping (provenanceKind = canonical-journal) and one hardcoded self-label, both with no proof check at the mint site. The API `displayState()` delegates "proven" semantics to upstream ledger writers (UNKNOWN). The MC lane does have a genuine gate, `_terminal_verified()` in `mission_intent.py` (issuance-chain verification), but it returns a boolean and never itself mints the word VERIFIED.

2. **FYD claim and render machinery (gated, with caveats):** the claim state machine mints `verified-controlled` behind a real syntactic gate (implemented method + written basis), but the only implemented method is operator attestation, honestly labeled as non-cryptographic. The binding verifiers fail closed on unproven atoms: `buildVerifiedRenderModel` throws on any UNKNOWN atom, and the absorb lane's `BindingVerifier.verify()` recomputes evidence hashes and walks the full lineage before emitting `verified: true`.

3. **Tandem/outreach observation pipeline (mixed):** `emit-observation.py` refuses to emit `verification_status: verified` unless the sidecar carries a `verified` transition (PRESENT), but that transition is written by `mark-verified.sh`, which performs no content verification itself (ABSENT at the mint; caller-side web-search verification asserted in prose only). The outreach intent ledger's `cmd_verify_effect` is the best-gated record here: requires EXECUTED terminal, independent observer, and mandatory evidence refs.

Notable trust seam for the convergence lane: emitter #9 (`emit-observation.py`) trusts emitter #10 (`mark-verified.sh`), and #10's verification is asserted, not enforced. Any work that tightens "verified" semantics should start there, not at the render badges.
