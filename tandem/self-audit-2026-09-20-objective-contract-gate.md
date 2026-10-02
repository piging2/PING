# Self-audit note: meta-ai-intel-pass 2026-09-20 ~21:20 MDT

## 1. h-marketing-intelligence objective/contract mismatch (THIRD INSTANCE, promoted)

Third instance of the h-brief contract violation, the trigger the
2026-09-19 audit set for hardening.

- Round 94 (ingested.log, reliability data point 9): h asked for marketing
  TACTICS (sections A-D); Meta AI answered with businesses. Prompt-adherence
  miss, wrong content type.
- Run 20260920-030848-h (2026-09-19): h answered substantive prose with ZERO
  numbered items. Presence validation failed closed; rotation did not advance.
  Right content type, wrong structure.
- Run 20260920-210422-h (this pass, 2026-09-20): h answered 6 numbered
  BUSINESSES instead of sections A-D. Root cause this time is structural,
  not model misbehavior: meta-pass.sh appends the same OUTPUT CONTRACT to
  every brief, and contract line 1 demands "a numbered list of at least N
  real businesses". The contract declares itself authoritative over the
  objective, so the model obeys it and the objective fails while the
  presence validator PASSES. The h objective (mechanisms, pricing changes,
  adjacent-industry transfers, substitutes) never asks for a prospect list.

All three shapes compared: the invariant is that the business-list OUTPUT
CONTRACT is incompatible with every non-prospect-list objective, and the
model will always follow the contract over the objective.

## 2. The promotion: objective/contract compatibility gate

Deterministic rule: a non-prospect-list objective must fail validation
before dispatch when paired with a business-list output contract.

- New: `tandem/check-objective-contract.py <slug>` (exit 0 compatible,
  3 incompatible, 2 infra). The prospect-list briefs are a closed, explicit
  set (a, b, c, d); the prompt owner owns that decision (per the 2026-09-19
  audit) and adds a slug when a new prospect-list brief is created. The gate
  verifies meta-pass.sh still emits the business-list directive so it can
  never go silently vacuous (stale assumption -> infra, not pass).
- New: `tandem/tests/test-objective-contract.py`, 15 cases. Written
  fail-before: it failed on the missing module, then passed after the gate
  was implemented. Existing suites still pass
  (validate-research-contract.py --self-test, test-numbered-items-invariant.py).
- `pig-fb/meta-pass.sh`: gate runs before any dispatch work; on mismatch it
  exits 2 via the existing infra_exit convention (ledger records
  objective_contract_incompatible, no Pig call, no rotation advance).
- `tandem/next-brief.py`: incompatible briefs are skipped from the effective
  cycle (same shape as quarantined briefs, loud on stderr) so one blocked
  brief never stalls rotation. meta-pass.sh re-checks as a backstop for
  direct invocations.

## 3. Standing consequence (needs the prompt owner's decision)

h-marketing-intelligence is now BLOCKED from dispatch until the pairing is
resolved. Two explicit fixes, either one:
1. Give h its own output directives via contracts/h-marketing-intelligence.json
   prompt_block (rendered after the generic contract, per the 2026-09-15
   machinery) and remove the generic business-list line for it; or
2. Add the slug to PROSPECT_LIST_SLUGS if the brief is re-scoped to a
   prospect list.

The same latent defect covers the other intel briefs (e, f, g, i, j, k):
they are also incompatible with the business-list contract and would burn
runs the same way. They are not in the dispatch cycle today, so no further
action now; any future cycle addition must resolve the pairing first.

What was deliberately NOT done: no per-brief contract content was written
(the prompt owner owns prompt content), no quarantine was created or
removed (never auto-quarantine), no framework was built (one gate, one
test, two three-line hooks).
