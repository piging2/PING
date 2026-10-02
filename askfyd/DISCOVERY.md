# DISCOVERY — ASK FYD -> EVIDENCE Boundary (2026-09-30)

What the test boundary found, in falsification order. Gaps are product
defects with failing REQUIRED tests in `known-gaps.test.ts`. Findings
are honest behaviors worth recording that are not defects.

## Known gaps (red as designed)

### AG-001: "What do you NOT know?" has no limitations branch
ASK-014. The coverage-branch regex needs a contiguous "do not"; the
question "What do you NOT know?" falls through to a profile blurb
instead of an evidence-bound limitations answer. The product cannot say
what it lacks on demand.

### AG-002: owner set-service-visibility is recorded but never read
ASK-030. The owner command `set-service-visibility` records
`hiddenServices` in the owner store, but nothing in `src/fyd/ask/`
consults it. The services answer still lists Ventilation after the
owner hid it. The decision is stored; the ask path ignores it.

### AG-003: conflict acknowledgment is branch-inconsistent
ASK-018. The direct hours question answers "No hours are on record"
(absence stated as fact) while the coverage branch describes
conflicted facets as "being verified". The product's own
coverage-branch comment states conflicted fields are "described as
being verified, never as merely absent". The direct branch violates
the product's own contract.

### AG-004: conflict suppression is field-literal, not semantic-fact-wide
ASK-020. The FYD-Q1 conflict names the location object's
`address_locality` field, but the composer states the same address
fact from the business object's `locality` field. The FYD-Q2 hide path
has an `isAddressFamilyField` notion; the FYD-Q1 conflict path does
not. Same fact, two fields, suppression covers one.

## Findings (not defects)

### F-001: INFERENCE-classified negative instead of literal refusal
ASK-013. For a question with no supporting evidence, the composer
answers with an INFERENCE-classified negative ("does not offer
emergency service: nothing in the site record mentions it") rather
than the literal refusal copy. The epistemic marking is honest; the
order's letter asks for "I don't have evidence for that." Recorded
as a finding, not a gap.

### Owner-correction contract holds end to end
ASK-029/031/032. The SOURCE SAYS X / OWNER SAYS Y contract holds
through the real owner store: the corrected value is presented as
on-record, the stale value appears only explicitly superseded
("Phone on record: (970) 555-9999. The owner corrected this number;
the site lists 970-245-3869."). Rejected proposals
(confirm-contact-field) require `opts.sourceValue`; without it
`applyOwnerCommand` throws, fail-closed. `revert-contact-field`
with no correction throws `OwnerCommandError`.

### Property-test near misses (test artifacts, not product bugs)
The fast-check graph suite initially flagged three false positives,
all fixed in the generator mapping:
1. Single-character titles trivially substring-match English text.
2. A private title ("Svcvalu") that was a prefix of a public title
   ("SvcvalueOf"). Fixed with visibility-distinct title prefixes.
3. Two location objects sharing the constant title "Test City, TS":
   a public one's title false-positived against a private one's.
   Fixed with per-index location titles.
Lesson: privacy substring assertions need unique, prefixed titles.

## JEV shadow

Cassette (`jev-shadow-cassette.json`) agrees with the deterministic
baseline on all 30 recorded choice picks (match=30, mismatch=0,
missing=0). JEV is a shadow sensor; the baseline stays authoritative.
42 of 60 live JEV calls consumed 2026-09-30.

## First broken product boundary

AG-002 is the first broken seam with an ownership story: the owner
took an action (hide a service), the store recorded it, and the
product's ask path silently ignores the owner's decision. The
correction loop (ASK -> EVIDENCE -> WHY THIS -> CORRECT ->
REGENERATE) breaks at REGENERATE for visibility decisions.
