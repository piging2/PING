# Research pipeline self-audit, 2026-09-15: making the contract machine-checkable

Directive: Nolan's FIRST through SEVENTH, 2026-09-15. The research worker may
discover nondeterministically; everything after discovery becomes increasingly
deterministic. One promotion at a time.

## Production evidence used

- Run 20260915-210425 (c-review-complaint-signals, ok): contract validator
  v1.0.0 verdict REJECTED, 0 of 10 entries VALID. Classifications: 1
  STALE_REVIEW, 1 DUPLICATE (true positive: Keenan's Plumbing & Heating,
  Montrose, exact normalized match in the canonical JSONL), 6 WRONG_SIGNAL,
  2 INSUFFICIENT_EVIDENCE. Hard violations: reviewer quote in a timing
  field, 0 VALID below the minimum of 3.
- Run 20260915-210630 (d-segment-deep-dive, unknown, exit 143): SIGTERM
  reaping when the worker's turn ended. Fourth such kill in three days
  (b-210419 on 2026-09-13, a-030423 and a-090418 on 2026-09-15).
- ingested.log rounds 52-60: Meta AI reliability data points (novelty
  overclaims, newness-inference failures, dedupe overclaims). Round 54
  c-ingest: 0 confirmed review triggers from the prior c-run; Birdeye hides
  post dates and the claimed low reviews were not visible at all.

## The eight judgment dimensions, measured

1. Candidate discovery requiring judgment: YES, every run. Not promoted.
   Nondeterministic discovery is the designed role of the worker (SIXTH).
2. Review classification requiring judgment: PARTIAL. Mapping the stated
   category to the defined vocabulary is now mechanical (substring match).
   Interpreting ambiguous review language ("mixed", "inferred from 4.1
   stars") still needs judgment, and now fails closed as WRONG_SIGNAL
   instead of passing on assertion.
3. Business identity resolution requiring judgment: PARTIAL. Normalized exact
   match plus phone and domain keys are mechanical. Cross-name conflation
   inside one entry (a review naming a different business than the header)
   still needs judgment and stays with the engine's verification gate.
4. Geography resolution requiring judgment: NO. Mechanical: town in the
   declared GEOGRAPHY section of the run's own pack file.
5. Recency extraction requiring judgment: PARTIAL. Explicit dates and
   relative durations are mechanical. Vague timing ("recent", "2025",
   "last 12 months", "Last 90 days aggregate") is unresolvable and becomes
   INSUFFICIENT_EVIDENCE, never negative evidence.
6. Duplicate detection requiring judgment: NO. Mechanical: normalized
   identity against the canonical JSONL and the brief-aware negative-signal
   list; near-miss (similarity 0.88-1.0) returns ambiguous, never guessed.
7. Final inclusion requiring judgment: NO. Mechanical: all checks pass and
   at least 3 VALID entries.
8. Output formatting requiring judgment: NO. Mechanical schema; the prompt
   echo is excluded from validation at the Show thinking boundary.

## New findings from this run

- The presence validator counts numbered items across the whole capture
  including the prompt echo. The c-run's "5 numbered items" were 4 contract
  items from the echoed prompt plus 1 real item. The contract validator
  extracts the answer region starting after the Show thinking chrome line.
  Follow-up candidate (not done now, one promotion at a time): count items
  in the answer region only inside validate-meta-answer.py.
- The model satisfies the timing requirement by assertion ("Last 90 days
  aggregate", "Within last 90 days") without dates. Assertions do not pass
  the validator; only resolvable dates do.
- A reviewer-quote leak was detected mechanically in a timing field (quoted
  review text). Unquoted reviewer names remain engine-judgment territory;
  not automated, because name detection without quotes would false-positive
  on business names.

## The ONE promotion: the 90-day recency invariant

Highest frequency times highest risk.

- Frequency: 7 of 10 entries in the production artifact had timing defects
  (1 resolved stale, 6 unresolvable).
- Risk: review-triggered outreach based on stale or misdated reviews. Round
  54 already showed the brief's core promise arriving unverified.
- SPECIFY: contract v1.0.0, recency_days 90. STALE_REVIEW means the timing
  resolved to a date outside the window. INSUFFICIENT_EVIDENCE means the
  timing could not be resolved; missing evidence is never negative evidence.
- TEST: --self-test unit cases (days/weeks/months ago, month-year, bare
  year, year ranges, claim-not-date, vague words).
- AUTOMATE: parse_timing plus classification precedence in
  validate-research-contract.py, wired as gate 4b in meta-pass.sh.
  Rejection fails closed: evidence preserved, never enters extraction,
  rotation does not advance.
- REMOVE: the worker no longer reasons about window compliance. The report
  states the resolved date for every entry, or exactly why it could not.

## Deliberately not promoted (judgment stays, by design)

Candidate discovery. Cross-business identity conflation. Unquoted reviewer
names. Whether a business truly exists and whether a review is real: those
are the outreach engine's step-4e web-search verification gate, which owns
truth while the validator owns the contract.

## FIFTH: Lightpanda decision

No measured bottleneck in read-only discovery. The verification gate uses
the browser.search API; round 60 verified 23 businesses in one engine pass
with no latency constraint in the record. The demonstrated constraints are
answer quality (this audit) and capture reliability (SIGTERM reaping).
Decision: do not implement Lightpanda; do not write the experiment spec.
Revisit trigger: measured per-business verification wall-time in step 4e
becomes the binding constraint. No vendor benchmark accepted without our
own measurement.
