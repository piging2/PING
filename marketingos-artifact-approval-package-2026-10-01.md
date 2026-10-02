# MarketingOS Artifact Approval Package: training example zero
Date: 2026-10-01. Lane: MarketingOS phase 2 (small, parallel). Status: AWAITING NOLAN APPROVAL.

Binding order: `~/workspace/goals/ping-agent-execution-stack/files/CEO-ORDER-MARKETINGOS-EXECUTION-MODE-2026-10-01.md`
Phase-1 findings: `~/workspace/marketingos-intelligence-research-2026-10-01.md` (claims C1-C11, all CONFIRMED)

This package executes the order's EXECUTION ORDER through CLAIM CHECK:
compiled one artifact from the verified thesis, ran the section-8 claim linter,
ran adversarial technical review. STOPPED before distribution, as ordered.
No new stores, no new authorities, no production writes, FYD proof chain untouched.

What Nolan is being asked to approve:
1. The article draft below (Part 1) for accuracy and tone.
2. Whether the two Facebook permalink IDs for the escaped likes may appear in a
   published version (default in this draft: withheld, see Part 5).
3. Whether to proceed to distribution AFTER approval (separate step, not authorized here).

---

# PART 1: THE ARTIFACT (article draft)

## Review Is Not Enforcement

### A 34-candidate deterministic replay of an agent authorization escape

**Expected belief:** a human reviewed every action in the batch before dispatch.
That is the safety condition most agent teams actually rely on: a person looks
at the plan, approves it, and the plan executes.

**Observed reality:** of 34 candidates in the batch, 33 were dispatched. Two of
them were ineligible under the team's own documented policy. A human operator
was watching, caught it, and killed the worker. Two effects had already escaped.
Thirty-one dispatched intents were stopped before attempt. One candidate had
already been blocked by the guard before dispatch.

**Gap:** the review happened, the policy existed, and the escape happened anyway.

**Mechanism:** the documented policy was never executable. The batch had been
manually curated, and the manual curation path bypassed the builder's
blocked-business check entirely. The dispatch-time guard had no corridor concept
and no blocked-business list at all. Cross-posts carrying new permalink IDs were
invisible to the already-engaged index. The human was reviewing a plan against
rules that existed only in prose. When the plan contained items the prose
forbade, nothing in the execution path could see the violation.

**Consequence:** human review is a safety net, not a control. A control exists
only when the external effect cannot occur without passing it.

## The invariant

A rule in a document is not a control. A rule in an agent prompt is not a
control. A human remembering the rule is not a control. The control exists only
when the external effect cannot occur without passing it.

The repaired architecture follows a five-part pattern: AI proposes,
deterministic software decides, capability authorizes, the executor performs
only authorized envelopes, and evidence records the result. One deterministic
eligibility function maps candidate plus action plus campaign plus engagement
history plus suppression and block state plus corridor policy plus provider
capability to ELIGIBLE, INELIGIBLE, or UNKNOWN, with reason codes. UNKNOWN fails
closed. Precedents that used to live in prose (blocked, suppressed,
already-engaged, outside-corridor) became data files the function actually reads.

Enforcement happens at three points. At plan time, the curator stamps a
tamper-evident per-action envelope: SHA-256 over a canonical evidence body,
six-hour TTL. At dispatch time, the runner re-evaluates eligibility live (it
never trusts the envelope) and runs an evidence check that refuses missing,
tampered, or stale evidence. A worker-side verification check is staged but not
deployed. That gap is named in the limitations section, because any honest
account of an enforcement story names what is staged versus what is running.

## The proof

The repaired authority was tested three ways before anything real ran through it.

First, an offline deterministic replay of all 34 pass-173 candidates against
reconstructed pre-incident state: 25 INELIGIBLE, 9 ELIGIBLE, 0 UNKNOWN, zero
mismatches against the human corrections, and a second run producing identical
output. Both escaped likes replay as INELIGIBLE under OUTSIDE_CORRIDOR. The
seven items the human corrected to keep all replay as ELIGIBLE.

Second, a twelve-case adversarial fail-safe suite. Blocked candidates stay
blocked even when the post is attractive. An agent-written recommendation
embedded in candidate text is ignored and cannot override corridor policy.
Tampered envelopes are refused on hash mismatch. Evidence older than the
six-hour TTL is refused. Mid-run changes to the eligibility data trigger
re-evaluation and refusal. Within-batch duplicates, empty candidates, and
unlisted groups resolve to INELIGIBLE or UNKNOWN, never to dispatch. Unreadable
policy data raises fail-closed. Twelve of twelve pass.

Third, a bounded live validation batch: four actions through the full chain,
four ELIGIBLE envelopes stamped, four dispatches, four terminal EXECUTED
observations in the intent ledger. Envelopes, recorded outcomes, and replay
agree.

The plan-to-dispatch TOCTOU window is closed by construction. The envelope binds
the evidence available at plan time; dispatch re-evaluates against live state.
Stale envelopes and mid-run data changes are refused at the gate.

## The honest boundaries

The proof has edges, and they are part of the story.

**Taste is not eligibility.** Two items the human curator dropped on judgment (a
coffee-bean post, a free-estimate post) return ELIGIBLE from the authority,
because no deterministic rule covers them. The authority was deliberately not
adjusted to force agreement. Subjective ranking belongs in a layer above
eligibility, never inside it. The replay's "zero mismatches" means agreement
with the deterministic corrections, not with every human taste decision. The
counterexample is load-bearing: it is what keeps the system from laundering
taste into policy.

**Prose never authorizes.** The adversarial suite includes the case that matters
for agent pipelines: natural-language recommendations inside data payloads must
not move the decision. Free-form notes never authorize actions.

**The worker-side check is staged, not deployed.** Between dispatch and the
actual effect, the current worker cannot independently re-evaluate the
registries. The six-hour envelope TTL and the dispatch-time evidence check bound
that window, but the residual risk is a registry change inside the TTL after
dispatch. Deployment is an owner decision, explicitly not taken yet.

**The validation batch was four actions.** It proves the chain operates end to
end, not that it is robust at volume. The adversarial suite covers twelve
designed threat classes, not unknown ones: a compromised eligibility data file
that is internally consistent but wrong would not be caught by these cases. The
incident itself still had a human watching; the record does not show what
happens at higher stakes with no human present at all.

## The general lesson

Every agent system with external effects has a curation path, a guard, and an
executor. The failure class is structural: the curation path bypasses the
guard, the guard lacks a concept the policy requires, and the executor trusts
the plan. The fix class is equally structural: one deterministic authority,
enforced on every path to the effect, with plan-time binding and dispatch-time
re-evaluation, and evidence recorded after the fact.

Two related disciplines fall out of the same incident. First, the
model-to-software ratchet: repeated model judgments that prove stable should be
converted into executable software, but taste should not be deterministicized
prematurely. The two ELIGIBLE-but-dropped items are the counterexample that
keeps the ratchet honest. Second, incident accounting: the two escaped effects
were preserved as terminal EXECUTED outcomes in the ledger, not reversed. The
platform exposes no unlike capability, and reversal would have been a new
external effect that rewrote the incident record the replay depended on.
Preserve actual outcomes; reconcile the unknown rather than blindly retrying.

A note on prior art, because senior engineers will ask: executable policy is
established practice. OPA, Cedar, and their predecessors have enforced policy
as code for years. This incident's contribution is not the invention of policy
engines. It is the replay methodology (snapshot pre-incident state, run the
authority, diff against human corrections), the adversarial acceptance suite as
a shipping gate, and the taste boundary made explicit. The apparatus here was
Facebook likes. The apparatus is not the point.

## Reproduction

A skeptical engineer can verify the core claims without our infrastructure. The
replay procedure is: snapshot the candidate set and the eligibility data as of
just before the incident, run the deterministic authority over all 34, and diff
the verdicts against the human corrections. The expected result is 25
INELIGIBLE, 9 ELIGIBLE, 0 UNKNOWN, zero mismatches, and a second run producing
identical output. The adversarial suite is twelve cases with stated expected
outcomes; each is a small self-contained test against the guard and envelope
code.

What would falsify the thesis: a demonstration that the escape had no
structural component, that the curation path could not have bypassed the guard
by design and this was purely a one-off human error; or a replay in which the
authority disagrees with the deterministic human corrections; or an
adversarial case inside the tested threat model that dispatches when it should
refuse.

What the evidence does not support: claims about behavior at full pass volume,
about threat classes outside the twelve tested, or about the system's behavior
with no human anywhere in the loop. Those are open questions, stated as such.

---

# PART 2: EXACT SUPPORT GRAPH

Every externally checkable claim in the draft, traced to C1-C11. Claim labels
(D1...) are draft-local.

| Draft claim | Text (short) | Source claims | Evidence files |
|---|---|---|---|
| D1 | 34 candidates; 33 dispatched; 2 escaped; 31 stopped before attempt; 1 guard-blocked pre-dispatch | C5 | eligibility-escaped-likes-2026-10-01.md; intent ledger |
| D2 | Human operator was watching, caught it, killed the worker; 2 effects escaped before the kill | C11 | incident record; CEO-ORDER-ENGAGEMENT-ELIGIBILITY-P0-2026-10-01.md |
| D3 | Manual curation path bypassed the builder's blocked-check entirely | C2 | eligibility-audit-2026-10-01.md section 1f |
| D4 | Dispatch-time guard had no corridor concept and no blocked-business list | C2 | eligibility-audit-2026-10-01.md section 1a |
| D5 | Cross-posts with new permalink IDs invisible to the already-engaged index | C2 | eligibility-audit-2026-10-01.md (context) |
| D6 | Two escaped likes preserved as terminal EXECUTED, not reversed | C5 | eligibility-escaped-likes-2026-10-01.md |
| D7 | No unlike capability in the platform CLI; reversal would be a new external effect | C5 | eligibility-escaped-likes-2026-10-01.md (reversal assessment) |
| D8 | Five-part pattern: AI proposes, deterministic software decides, capability authorizes, executor accepts only authorized envelopes, evidence records | C1 (thesis; pattern is INFERRED as the general form) | CEO-ORDER-ENGAGEMENT-ELIGIBILITY-P0-2026-10-01.md |
| D9 | One deterministic eligibility function; ELIGIBLE/INELIGIBLE/UNKNOWN; UNKNOWN fails closed; precedents as data | C1, C10 | engagement-guard.py; eligibility-data/*.json |
| D10 | Plan-time SHA-256 envelope, 6h TTL; dispatch-time live re-evaluation plus evidence-check | C10 | eligibility-adversarial-2026-10-01.md (stale/state-changed cases) |
| D11 | Worker-side check staged, not deployed; owner deployment decision pending | C9 | AGENTS.md eligibility authority entry (2026-10-01) |
| D12 | Replay: 25 INELIGIBLE, 9 ELIGIBLE, 0 UNKNOWN, zero mismatches, re-run identical | C3 | eligibility-replay-173-2026-10-01.md |
| D13 | Both escaped likes replay INELIGIBLE (OUTSIDE_CORRIDOR); 7 human-corrected keeps all ELIGIBLE | C3 | eligibility-replay-173-2026-10-01.md |
| D14 | 12/12 adversarial: blocked-stays-blocked, prose ignored, tamper refused, stale refused, state-change refused, duplicates/empty/unlisted fail safe, unreadable data fail-closed | C4 | eligibility-adversarial-2026-10-01.md |
| D15 | 4-action validation batch: 4 envelopes, 4 dispatches, 4 terminal EXECUTED; envelopes/outcomes/replay agree | C6 | intent ledger, pass fb-20261001-053221 (parent-verified 2026-10-01) |
| D16 | TOCTOU closed by envelope binding plus dispatch-time re-evaluation | C10 | eligibility-adversarial-2026-10-01.md |
| D17 | Two taste-dropped items return ELIGIBLE; authority deliberately not adjusted | C7 | eligibility-replay-173-2026-10-01.md notes; binding taste order 2026-10-01 |
| D18 | Agent prose in candidate text cannot override policy (adversarial case 3) | C8 | eligibility-adversarial-2026-10-01.md case 3 |
| D19 | Residual risk: registry change inside the 6h TTL after dispatch | C9 | C9 counterevidence/mitigation note |
| D20 | n=4 proves end-to-end operation, not volume robustness | C6 | C6 counterevidence |
| D21 | 12 cases cover designed threats, not unknown classes (e.g. internally-consistent-but-wrong data file) | C4 | C4 counterevidence |
| D22 | No evidence on higher-stakes behavior with no human present | C1 | C1 unknowns |
| D23 | Failure class generalizes: curation bypass plus concept-poor guard plus trusting executor | C1, C2 (applicability fields; generalization is INFERRED) | - |
| D24 | Model-to-software ratchet; do not deterministicize taste prematurely | C7 (applicability) | binding taste order 2026-10-01 |
| D25 | Preserve actual outcomes; reconcile unknown rather than blindly retry | C5 (applicability) | eligibility-escaped-likes-2026-10-01.md |
| D26 | Executable policy is established practice (OPA, Cedar); this work's contribution is the replay methodology, adversarial acceptance gate, and taste boundary | C1 (counterevidence, cited as prior art) | - |
| D27 | Replay proves the authority's verdicts, not the historical dispatch | C3 | C3 counterevidence |

---

# PART 3: CLAIM LINT RESULTS (order section 8)

Lint verdicts: SUPPORTED / PARTIALLY SUPPORTED / CONFLICTED / INFERRED / UNSUPPORTED / STALE.

| Draft claim | Lint verdict | Rationale |
|---|---|---|
| D1 | SUPPORTED | Ledger arithmetic: 2 escaped + 31 stopped + 1 guard-blocked = 34. |
| D2 | SUPPORTED | Incident record; the kill and the 2 pre-kill escapes are both recorded. |
| D3 | PARTIALLY SUPPORTED | Audit is static analysis plus file reads; it did not re-execute the pass-173 dispatch chain (C2 counterevidence). Mechanism confirmed by the replay (C3) independently reproducing the verdicts. Flagged, not hidden. |
| D4 | PARTIALLY SUPPORTED | Same audit-method caveat as D3. |
| D5 | PARTIALLY SUPPORTED | Audit context; not independently re-executed. |
| D6 | SUPPORTED | Escaped-likes record with permalinks, intents, observation timestamps. |
| D7 | SUPPORTED | Reversal assessment in the escaped-likes record. |
| D8 | INFERRED | The five-part pattern is the thesis generalized beyond the single incident. The draft presents it as the lesson, with falsification conditions stated. Not presented as independently reproduced. |
| D9 | SUPPORTED | Implementation exists and is exercised by C3/C4/C6. |
| D10 | SUPPORTED | Adversarial cases demonstrate stale refusal and state-change refusal directly. |
| D11 | SUPPORTED | AGENTS.md entry; file state confirms staged, not deployed. Dated 2026-10-01; the draft does not claim current deployment state beyond that date. |
| D12 | SUPPORTED | Full 34-row verdict table; deterministic re-run documented. |
| D13 | SUPPORTED | Replay notes. |
| D14 | SUPPORTED | 12-case list with expected/observed outcomes. Scoped in-draft to the tested threat model (D21). |
| D15 | SUPPORTED | Parent-verified ledger state; intent IDs on record. |
| D16 | SUPPORTED | Within the plan-to-dispatch scope; dispatch-to-click scoped separately (D19). |
| D17 | SUPPORTED | Replay notes plus the binding taste order. |
| D18 | SUPPORTED | Adversarial case 3; the draft scopes the general principle as tested-case-plus-principle. |
| D19 | SUPPORTED | Follows from C9 plus the TTL mechanism; stated as residual risk, not as observed failure. |
| D20 | SUPPORTED | Direct restatement of C6 counterevidence. |
| D21 | SUPPORTED | Direct restatement of C4 counterevidence. |
| D22 | SUPPORTED | Direct restatement of C1 unknowns. |
| D23 | INFERRED | Generalization beyond the single incident. Carried as the lesson with explicit falsification conditions in the draft's Reproduction section. |
| D24 | INFERRED | Design principle derived from C7; stated as a principle, not as reproduced fact. |
| D25 | INFERRED | Incident-accounting discipline derived from C5; one incident is the evidence base, stated openly. |
| D26 | SUPPORTED | Cited as prior art acknowledged, not as our finding. No vendor claim presented as independent finding. |
| D27 | SUPPORTED | Direct restatement of C3 counterevidence; the draft states this boundary explicitly. |

## Section-8 flag sweep

- **Unsupported superlatives:** none found. The draft avoids "first", "only", "best", "novel". "Load-bearing" (taste counterexample) is a structural description, not a superlative.
- **Causal claims from correlation:** D3/D4/D5 (root cause) rest on static audit, not re-execution. Lint marks them PARTIALLY SUPPORTED and the draft's Reproduction section states the falsification condition (a demonstration of no structural component would falsify the thesis). The audit-to-replay corroboration (C3 independently reproduces the verdicts the causal story predicts) is the supporting bridge, and it is named.
- **Benchmarks without comparable conditions:** the "12/12" and "zero mismatches" figures are acceptance tests against stated expected outcomes, not comparisons with alternatives. The draft does not present them comparatively.
- **Current-state claims on stale evidence:** D11 (worker check undeployed) is dated 2026-10-01 in the support graph. If published later, this claim needs re-verification before it is presented as current fact.
- **Vendor claims as independent findings:** none. D26 explicitly attributes executable policy to prior art (OPA, Cedar).
- **Anecdotes generalized into universal rules:** D23/D24/D25 are the generalization points. All three are linted INFERRED and the draft carries explicit falsification conditions for the thesis. This is the correct handling per the order: expose the generalization, do not launder it.
- **Security claims stronger than the reproduction:** the draft's "fail safe" language is scoped to the tested threat model in-draft (D21), and the internally-consistent-but-wrong data file is named as the uncovered class. No claim is made about the undeployed worker-side check.

## Lint-required edits (applied to the draft above)

1. D1 corrected during drafting: the first version said "34 actions were dispatched"; the ledger says 33 dispatched (2 escaped + 31 stopped) plus 1 guard-blocked pre-dispatch. Fixed before lint.
2. D26 (prior-art acknowledgment) added during drafting: the first version did not name OPA/Cedar. A senior engineer would flag the omission; the counterevidence in C1 required it.
3. D27 (replay proves verdicts, not the historical dispatch) added during drafting from C3 counterevidence; the first version left this boundary implicit.

---

# PART 4: ADVERSARIAL TECHNICAL REVIEW

## The strongest objection

"This is trivially preventable process failure dressed as architecture. The
builder already had a blocked-check; the curator just didn't call it. That is
'someone skipped a step,' not a deep result. And the response, per-action
SHA-256 envelopes with TTLs and a three-point enforcement chain, is
over-engineering for Facebook likes. If that reading sticks, the piece reads as
'we built a linter for our Facebook bot.' A second version: executable policy
is decades-old practice (OPA, Cedar, SELinux policies, database constraints).
There is nothing here a senior engineer doesn't already know."

## Answer, with evidence, not rhetoric

**On 'someone skipped a step.'** The bypass was structural, not a missed step.
The audit found two independent defects, either of which alone permits the
escape: (a) the manual curation path bypassed the blocked-check by design, the
curated JSON went straight to the dispatch script with no guard in the path at
all; (b) the dispatch-time guard had no corridor concept and no blocked-business
list, so even a guard placed on that path could not have evaluated the policy.
A skipped step is fixed by a checklist. This required new concepts in the
authority (corridor, blocked-business registry, precedent registry) plus
enforcement on every path to the effect. The replay corroborates the structural
reading: the repaired authority, given exactly the concepts that were missing,
reproduces the human corrections deterministically across all 34 candidates.

**On 'the human caught it, so the process worked.'** Quantitative rebuttal: two
ineligible effects escaped before the kill, and the kill depended on the
operator watching at that moment. A safety net that lets two violations through
before it engages is not a control; it is luck with a human face. The draft
does not argue humans should be removed. It argues humans should be exception
handlers, never the enforcement path for known rule classes. That distinction
is the entire thesis, and the incident is the demonstration.

**On over-engineering for the stakes.** The machinery is sized for the
invariant, not for the apparatus. Envelope-with-TTL plus dispatch-time
re-evaluation is the standard TOCTOU pattern for any plan/dispatch split; it is
not bespoke complexity. The stakes argument cuts the other way: if the
enforcement story fails on low-stakes likes, with a human watching, it fails
everywhere it matters. The incident is valuable precisely because the stakes
were low enough to instrument fully: full replay, twelve adversarial cases, a
live validation batch, and an explicit counterexample. High-stakes incidents
rarely get this treatment because the cleanup destroys the evidence. Here the
evidence survived because the team preserved the escaped effects instead of
reversing them.

**On 'nothing a senior engineer doesn't know.'** Granted in part, and the
draft grants it explicitly (D26). Executable policy is old. What is less
commonly practiced, and what the draft actually contributes: (1) the replay
methodology as an acceptance gate, snapshot pre-incident state, run the
authority, diff against human corrections, demand zero mismatches and a
byte-identical re-run; (2) the adversarial fail-safe suite as a shipping gate
for policy code, with the uncovered threat classes named rather than hidden;
(3) the taste boundary made explicit and binding, the authority deliberately
not adjusted to force agreement, with the standing order quoted. Senior
engineers know policy engines. Fewer have shipped the proof that their policy
engine reproduces human judgment deterministically, fails safe adversarially,
and refuses to launder taste into rules. That is the falsifiable content.

**What the objection gets right, and the draft concedes.** The incident is one
data point. The generalization (D23) is INFERRED, and the draft says so. The
validation batch is n=4. The threat model has named gaps. If a reader comes
away thinking this proves agent authorization is solved, the draft has failed;
its Reproduction section exists to prevent exactly that reading.

---

# PART 5: REDACTION NOTES AND DO-NOT-PUBLISH SCREEN

From `~/workspace/marketingos-incident-scoring-2026-10-01.md` (do-not-publish screen):
no secrets, customer data, or exploit-enabling detail in this incident's
publishable core. The escaped likes are public likes on public business posts
from Nolan's own business account. The bearer/DB redaction concern applies to a
different candidate (source/build/deploy divergence), not this artifact.

Redaction decisions in this draft:
- The two escaped-like permalink IDs (4090528661082571, 4090481474420623) are
  in the evidence files, not in the article body. They are public likes on
  public posts, so inclusion is defensible, but the businesses did not consent
  to be a case study. DEFAULT: withhold from any published version unless Nolan
  explicitly approves inclusion. This is approval item 2.
- The four validation-batch business names (Surf To Turf, Efird Family
  Homestead, Ridgway empanada vendor, Aila Thai Kitchen) are not named in the
  article. Same reasoning; same default.
- Intent IDs are in the support graph (Part 2, D15 row references the ledger),
  not in the article body. They are internal identifiers; no external reader
  needs them.
- No credentials, tokens, bearer material, DB contents, or exploit detail
  appear anywhere in this package.
- D11 (worker check undeployed as of 2026-10-01) must be re-verified before any
  publication if time has passed; presenting a stale deployment state as
  current fact would violate the lint.

Nothing in this package authorizes publishing or distribution. Per the CEO
order: falsification pass done (Part 4), human approval required (this
package), distribution only after approval through the existing authorized
execution path.

---

# PART 6: APPROVAL CHECKLIST FOR NOLAN

- [ ] Article draft (Part 1) is accurate: no claim you believe is false, no
      tone you would not sign.
- [ ] Support graph (Part 2) is complete: every checkable claim traces to
      C1-C11 or is marked INFERRED.
- [ ] Lint (Part 3) is honest: the three INFERRED generalizations and the
      PARTIALLY SUPPORTED audit-method claims are acceptable to publish with
      their stated boundaries.
- [ ] Adversarial review (Part 4) answers the objection you would expect.
- [ ] Redaction (Part 5): permalinks and business names stay out (default),
      or you approve their inclusion.
- [ ] Next step after approval: distribute through the existing authorized
      execution path (NOT authorized by this package).

Lane state after this turn: E7 (THESIS to ARTIFACT) now has its first compiled
artifact in draft; E8 (CLAIM CHECK) demonstrated manually on this artifact.
E9 (durable approval) is this package itself, awaiting the human gate. E1/E3
wiring remains parked per the task constraints. FYD proof chain untouched.
