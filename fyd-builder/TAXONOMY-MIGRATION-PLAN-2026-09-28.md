# SPIKE 2 — TAXONOMY MIGRATION PLAN (live phase, 2026-09-28)

## Status: PLAN ONLY, no code churn in this spike

Authoritative vocabulary (verified in current tree):
`src/fyd/proceduralize/proceduralizer.ts:63` — `FactClass =
"DIRECT_FACT" | "DERIVED_FACT" | "INFERENCE" | "GENERATED_COPY" | "USER_OVERRIDE"`.
Locked mapping: OBSERVED=DIRECT_FACT, INFERRED=INFERENCE, DERIVED=DERIVED_FACT,
OWNER_ASSERTED=USER_OVERRIDE, GENERATED_COPY = legitimate fifth state.
`ClaimKind = "website_statement" | "feed_item"` is a separate, orthogonal
SOURCE-GRADING axis. It must never occupy the epistemic slot again.

Invariant: **NO FACTUAL PRESENTATION WITHOUT TRACEABLE SUPPORT.**

## V1 — Ask 3-class presentation contract (`src/fyd/ask/visitor-answer.ts`)

BEFORE: `AskClaimClass = "supported" | "derived"`; `claimClassFor` folds
DERIVED_FACT + INFERENCE + GENERATED_COPY into "derived" (presentation collapse).
Two defects found live:

1. `case "DEMO_SYNTHETIC": return "supported"` — SILENT PROMOTION. Canonical mapping
   says DEMO_SYNTHETIC -> GENERATED_COPY -> "derived". The journal event evidences
   the overlay *action*, not the claim's truth. Generator copy labeled "supported"
   is exactly the fold Nolan flagged.
2. `default: return "supported"` — SILENT PROMOTION. Unrecognized or MISSING
   classification renders as "supported". A claim with no classification must never
   present as evidence-backed.

AFTER:
- Keep the 3-class PRESENTATION contract (visitor wording may collapse states;
  canonical records must not).
- `DEMO_SYNTHETIC` -> "derived" (with honest attribution in the citation).
- Missing/unrecognized classification -> "unknown" handling (refusal path or
  explicit unknown basis), never "supported".
- The `classification` string flowing INTO `claimClassFor` keeps the full FactClass
  value; only the visitor-facing label collapses. Presentation collapse must never
  leak into canonical records (`AskClaimClassification.classification` keeps FactClass).

## V2 — `classificationFromProvenance` fallbacks (`src/lib/ping/ask-composer.ts:146-155`)

BEFORE -> AFTER:

| Provenance kind | Before (mixed vocab) | After (FactClass) |
|---|---|---|
| `overlay-authored` | `DEMO_SYNTHETIC` | `GENERATED_COPY` |
| `canonical-journal` | `DIRECT_FACT` | `DIRECT_FACT` (keep) |
| `website-derived` / `website-ingestion` | `website_statement` | `DIRECT_FACT`; the "never verified fact" nuance moves to the ClaimKind axis (`website_statement`), carried separately |
| `owner` | `owner_authorship` | `USER_OVERRIDE` |
| anything else | `"unknown"` (string in the epistemic slot) | NO FactClass emitted; claim marked basis-unknown / UNSUPPORTED per the invariant |

Also in `claimClassification` (same file): the `obj.fields["claimKind"]` fallback
(`"website_statement"` / `"feed_item"`) must map to DIRECT_FACT + carry `claimKind`
on the orthogonal source-grade axis, not leak into the classification slot.

## V3 — `AskClaimClassification` typing (`src/lib/ping/types.ts:308-321`)

BEFORE: `classification: string` with a doc comment explicitly blessing the leak
("otherwise the object's own claim kind (e.g. "website_statement")").

AFTER:
```ts
classification: FactClass | "UNKNOWN";   // epistemic axis only
claimKind?: "website_statement" | "feed_item";  // orthogonal source-grade axis
provenanceBasis?: string;                        // plain-language "how do you know"
```
No storage migration: the five FactClass values are already storage-stable;
`"UNKNOWN"` is the one new persisted token (document it; it is a legitimate state,
not a failure).

## EPISTEMIC_RANK proper: ARCHIVE, no migration

The named `EPISTEMIC_RANK` exists only in historical lane trees
(`tenanos-wave/scratch/lane-h`, `ping-build-program/lane-g`, `lane-d-impl`,
`lane-p01`) — dead code, absent from the live tree. Its VALUES live on in V2/V3
above, which is where the migration lands. Do not touch the historical trees.

## Enforcement points (exist — extend, don't invent)

- `provenance()` in `proceduralizer.ts`: emission choke point; keep. INFERENCE never
  emitted by default.
- `verifyAnswerClaims` epistemic-upgrade check: keep (rank ORDER is separate from
  vocabulary normalization).
- `binding-verifier.ts`: EXTEND to require every factual render output to carry one
  of the five FactClass values or explicit UNKNOWN; unclassified factual claims fail.

## Sequencing

V2 first (source of values) -> V1 (consumer) -> V3 (type lock). Tests to add with
the migration: unit tests pinning each row of the V2 table; a hostile test asserting
an unclassified claim NEVER renders as "supported"; a test asserting GENERATED_COPY
never lands on "supported".
