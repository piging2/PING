# FYD-026 closure: claim classifications enforced at write time

Branch: `fyd-026-claim-classifications` (off `eb20998`, the FYD-018 branch tip).
Commit: local only, never pushed. No production touch (:3100 never bound).

## The gap (triage 2026-09-27, read-only, verified)

`claims.ts` enforced evidence-presence at write time, but for its OWN
vocabulary (supported/qualified/unknown). The standing classification
vocabulary — DIRECT / DERIVED / INFERRED / GENERATED_PRESENTATION /
OWNER_AUTHORED (BACKLOG_PING.md CURRENT VERIFIED FRONTIER) — existed
NOWHERE in the lane source. Vocabulary drift: the FYD-018 closure typed a
correction record's classification against the FYD-038
`ContentClassification` vocabulary (WEBSITE_STATEMENT | DEMO_SYNTHETIC), a
third vocabulary. Admission rules for DIRECT were unwritten.

## Step 1: the failing probe (written BEFORE implementation, watched fail)

`src/fyd/claims/__tests__/claim-classification.test.ts` (17 tests) asserts:

- (a) the standing vocabulary has exactly five members; `isClaimClassification`
  accepts them and rejects the drifted vocabularies
  (supported/qualified/unknown, WEBSITE_STATEMENT/DEMO_SYNTHETIC);
- every claim made at write time carries a standing classification;
- (b) DIRECT is admitted only when the evidence binding meets the written
  DIRECT admission rule: admitted on a direct observation record; rejected
  (`direct_admission_failed`) on a loader acquisition placeholder; rejected
  (`superseded_evidence`) on superseded evidence; rejected
  (`dangling_evidence_ref`) on a dangling ref; rejected
  (`empty_evidence_refs`) with no refs;
- (c) a non-vocabulary classification (`"supported"`, `"WEBSITE_STATEMENT"`)
  is rejected at write time with `unclassified_claim`;
- the FYD-038 provenance bridge: WEBSITE_STATEMENT -> DIRECT,
  DEMO_SYNTHETIC -> GENERATED_PRESENTATION (never DIRECT),
  DEMO_SYNTHETIC + ownerAuthored -> OWNER_AUTHORED.

Pre-implementation run: suite failed to compile — `TS2345: Argument of
type '"DIRECT"' is not assignable to parameter of type
'"supported" | "qualified" | "unknown"'`. The standing vocabulary existed
nowhere in the lane source, exactly as the triage proved. Failing probe
confirmed before any implementation was written.

## The delta

**`src/fyd/claims/claims.ts`** (the single write-time enforcement point —
extended, no second validator created):

- `ClaimClassification` = DIRECT | DERIVED | INFERRED | GENERATED_PRESENTATION
  | OWNER_AUTHORED; `CLAIM_CLASSIFICATIONS` runtime tuple;
  `isClaimClassification(value)` runtime gate.
- `StructuredClaim.classification` is now `ClaimClassification`.
- `makeClaim(text, classification: unknown, evidenceRefs)`: the parameter is
  typed `unknown` deliberately so the runtime gate is real for JS callers
  and deserialized records (the type system alone cannot see those). Throws
  `ClaimValidationError("unclassified_claim")` for any non-vocabulary
  classification — this is the write-time vocabulary gate; the FYD-018
  drift (typing a claim classification against the FYD-038 vocabulary)
  would now fail here instead of drifting silently.
- Evidence-presence rules re-keyed to the standing vocabulary (migration of
  supported/qualified): DIRECT and DERIVED require non-empty evidenceRefs;
  INFERRED / GENERATED_PRESENTATION / OWNER_AUTHORED may carry none
  (migration of unknown). Behavior identical, labels changed.
- `validateClaims` gains the defensive mirror: non-vocabulary
  classification -> `unclassified_claim`; DIRECT claims whose bound
  records fail the DIRECT admission rule -> `direct_admission_failed`.
  New `ClaimValidationReason`s: `unclassified_claim`,
  `direct_admission_failed`.
- `claimClassificationForContent(content: ContentClassification, opts?)`:
  the EXPLICIT bridge from the FYD-038 provenance vocabulary to the claim
  vocabulary (never conflated): WEBSITE_STATEMENT -> DIRECT (a proposal —
  the write-time admission gate still applies); DEMO_SYNTHETIC ->
  GENERATED_PRESENTATION; DEMO_SYNTHETIC + `ownerAuthored: true` ->
  OWNER_AUTHORED (the standing owner-claim-verification-ladder: owner
  claims enter as OWNER_AUTHORED, never DIRECT). The FYD-018
  `CORRECTION_CLASSIFICATION: ContentClassification` is untouched and its
  tests keep passing.

**`src/fyd/ask/types.ts`**: `EvidenceCitation.claimClass` is now
`ClaimClassification` (was the old `"supported" | "qualified"`).

**`src/fyd/ask/answer.ts`**: the composer emits `claimClass: "DIRECT"`
(was `"supported"`) — the composer cites website statements backed by
direct observation records, and the claims still pass through
`makeClaim`/`validateClaims` at write time.

**`src/fyd/ask/answer.ts` `findEvidence` — TWO REAL BUGS the DIRECT gate
exposed (not volume-preserving tweaks):**

1. `null === null` placeholder match. The first loop `e.observationId ===
   rawRef` matched a null rawRef (the business object, which has no
   evidence_ref) against the first loader "acquisition" placeholder
   (observationId null). The business's DIRECT claim was being bound to
   CIRCULAR placeholder evidence (FYD-009: placeholders are synthesized
   from the citing object's own fields and "never satisfy validation").
   The FYD-009 post-answer validator independently resolved `<business>`
   to the real business-fields observation, which is why the old e2e
   tests passed while the internal binding was wrong. Fixed with a
   `rawRef !== null` guard.
2. Double-dash tail bug. The docstring promised "the business object
   resolves to the '-business-fields' observation", but the null-branch
   tail was `"-business-fields"` while the endsWith check prepends
   another dash → `"--business-fields"`, which no observation id ends
   with. The documented resolution never worked; the placeholder match
   was masking it. Fixed: tail is `"business-fields"`.

Both fixes align the composer with the FYD-009 resolver semantics
(placeholders excluded from verbatim resolution). The composer now binds
the business claim to the real business-fields observation, and that
binding passes the DIRECT admission gate.

**`src/fyd/why/why-this.ts`**: the claim hop gains
`claimClassification: ClaimClassification`, set via the explicit bridge
(`claimClassificationForContent(contentClassificationOf(...))`). The
FYD-038 `classification` field is untouched — both ride the same hop,
never conflated.

**`src/fyd/components/renderer.tsx`**: the server-rendered WHY THIS?
`<details>` renders `<span data-claim-classification="...">` on the claim
hop, so the standing classification lands in the served bytes.

**Migrated test files** (documented mapping applied, behavior unchanged):
`claims.test.ts` (supported->DIRECT, qualified->DERIVED, unknown->INFERRED;
one sed-mangled label hand-fixed), `services.test.ts`
(`claimClass` "supported" -> "DIRECT"), `fyd-013-superseded.test.ts` and
`fyd-013-serve-proof.test.ts` (`makeClaim` "supported" -> "DIRECT" — the
write-time gate caught these call sites, which is the intended effect).

## Harvest notes (harvest before writing)

- Standing vocabulary: BACKLOG_PING.md CURRENT VERIFIED FRONTIER
  ("Claim classification vocabulary: DIRECT / DERIVED / INFERRED /
  GENERATED_PRESENTATION / OWNER_AUTHORED") — the authority; the lane
  invents no vocabulary of its own.
- DIRECT admission legs harvested from FYD-009 (`evidence/refs.ts`):
  resolution order, acquisition placeholders excluded as circular,
  `wrong_snapshot` digest binding (leg 5, enforced by
  `validateEvidenceRef` where the citing graph exists — claims.ts only
  sees the evidence index, so the rule documents the leg split rather
  than duplicating the check).
- Superseded leg harvested from FYD-013 (`applySupersededMarks`,
  `supersededBy`); existing `superseded_evidence` reason preserved and
  ordered before the admission check so reasons stay stable.
- FYD-038 provenance vocabulary (`ContentClassification`,
  `contentClassificationOf` in `components/renderer.tsx`) — related but
  distinct; bridged explicitly, never merged.
- Owner-authored distinction: the standing
  `owner-claim-verification-ladder` backlog item (owner claims enter as
  OWNER_AUTHORED, not DIRECT).

## The DIRECT admission rule (product law — written here because it was unwritten)

A claim is admitted as DIRECT iff, at write time, its evidence binding
satisfies ALL of:

1. evidenceRefs is non-empty (enforced by `makeClaim`).
2. Every ref resolves in the evidence index (`dangling_evidence_ref`).
3. Every resolved record is kind === `"observation"` with a non-null,
   non-empty observationId — loader `"acquisition"` placeholders are
   circular as evidence (FYD-009) and can never back a DIRECT claim
   (`direct_admission_failed`).
4. No resolved record is superseded (`superseded_evidence`, FYD-013).
5. Where the citing graph exists, the record's `sourcePointer` digest
   matches the citing object's `fields.source_digest` (FYD-009
   `wrong_snapshot`) — enforced by `validateEvidenceRef` on the
   composer/serve paths, documented here as the final binding leg.

Rationale (why this is the smallest defensible rule): DIRECT is the
strongest statement the system can make — "the source itself says this".
Any weaker binding (no ref, a dangling ref, a circular placeholder, or
replaced evidence) would let an inference or a stale observation wear the
system's strongest label. The weaker labels exist exactly for those
cases: DERIVED for computed-from-evidence, INFERRED for judgment,
GENERATED_PRESENTATION for the presentation layer's own words, and
OWNER_AUTHORED for owner corrections (ladder rule: never DIRECT).
Recorded in the code comment on `directRecordAdmitted` and here.

## Vocabulary mapping (old -> standing; explicit, not silent)

| old (retired) | standing | evidence behavior (unchanged) |
|---|---|---|
| "supported" | DIRECT | evidence required; now also the admission rule |
| "qualified" | DERIVED | evidence required; no admission rule |
| "unknown" | INFERRED | evidence optional; never wears DIRECT |

The old literals are gone, not aliased: `makeClaim` rejects anything
outside `CLAIM_CLASSIFICATIONS` at write time, so future drift fails the
build and the tests.

## ContentClassification bridge (FYD-038 provenance -> claim vocabulary)

- `WEBSITE_STATEMENT` -> `DIRECT` (proposal only; admission gate applies)
- `DEMO_SYNTHETIC` -> `GENERATED_PRESENTATION` (never DIRECT)
- `DEMO_SYNTHETIC` + `ownerAuthored: true` -> `OWNER_AUTHORED`
  (FYD-016/FYD-018 corrections are overlay-authored owner state)

`claimClassificationForContent` in `claims.ts`. The FYD-018
`CORRECTION_CLASSIFICATION: ContentClassification = "DEMO_SYNTHETIC"` is
unchanged and its tests pass unmodified — bridged, not conflated.

## Suite output

- Failing probe (pre-implementation): suite failed to compile (TS2345) —
  standing vocabulary absent, as triaged.
- Post-implementation: `npx jest --config jest.config.cjs` — **40 suites,
  311 tests, all green** (311 = 294 base + 17 new probe tests).
- `npm run test:refresh` — fail 0.
- `npx tsc --noEmit -p tsconfig.json` — clean.

## Served-path evidence (ephemeral :3237; production :3100 never bound)

Rebuilt via `npm run build:server`; dist PORT patched to :3237 for the
proof only (dist is gitignored; restored to 3100 after; server stopped;
no listener on :3237 or :3100 afterwards).

- `GET /sites/happy-place` (200): 8 server-rendered WHY THIS?
  affordances; **5 `data-claim-classification="DIRECT"` spans in the
  served bytes** (the 5 service-card claim hops; the business object's
  why-this chain fails closed honestly per FYD-014 — it carries no
  evidence_ref).
- `GET /api/why-this?site=happy-place&objectId=<repairs-service>` (200):
  claim hop carries **both** `classification: "WEBSITE_STATEMENT"`
  (FYD-038 provenance) **and** `claimClassification: "DIRECT"` (standing
  claim vocabulary) — the bridge visible in served bytes, not conflated.
- `POST /api/ask` `{site: happy-place, question: "What services does this
  business offer?"}` (200): **6 citations, all `claimClass: "DIRECT"`**,
  `refusal: false`, `unknowns: []` — the composer's claims pass the
  write-time DIRECT admission gate against real observation records on
  the served path.
- FYD-010: the served bytes contain no owner-correction values (the
  FYD-018 corrected demo phone +1-970-555-0199 is absent); the single
  phone-number hit is the business's own PUBLIC website phone in the
  Contact section (visitor-visible by design). /api/ask response: zero
  owner-field hits.

## Three-state law

No observation mutated. `applySupersededMarks` unchanged (pure, returns
new records). The DIRECT admission check reads record metadata only.
`makeClaim` copies the refs array. The bridge is a pure function.

## Open / not done

- The `ownerAuthored: true` bridge branch is unit-tested but not yet
  wired into the FYD-016/FYD-018 apply paths (the correction record
  keeps its `ContentClassification` typing per the task's keep-passing
  requirement). Wiring owner-corrected content to emit OWNER_AUTHORED
  claims is the natural FYD-026 follow-up, scoped to the owner lane.
- The served proof covers happy-place; coppersmith's composer path is
  covered by the green e2e tests (both graphs pass with DIRECT claims).
