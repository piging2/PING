# LANE 6 (MODEL ROUTING + EVAL CORPUS + BENCHMARK) — REPORT
**Date:** 2026-09-28. **Mode:** read-only harvest, no production wiring.
**Owner order:** BRUTAL CEO MODE, HARVEST + BENCHMARK + REFACTOR DISCOVERY.

## 0. CENTERING NEGATIVE EVIDENCE

The archived 2026-09-26 Jev routing project is the governing constraint on everything
below: **Jev-based tool selection/compaction did NOT generically reduce agent token
usage, while straightforward tool-result truncation DID.** Consequences, all binding:

- **NO GLOBAL ROUTER.** There is no Jev tier-selection layer in front of System 2
  that survives this evidence. Routing that "helps" must be proven per-decision.
- **Every routing proposal must beat a static/truncation baseline on measured
  evidence**, not on latency anecdotes or accuracy-without-cost framing.
- The independent external datum matches: Ruqi Zheng (Sep 2026) found Jev
  **pre-routing** ("will Haiku get this wrong?", i.e. a global pre-router)
  performed **close to random**, while Jev **cascading** (answer first, check after)
  reached 94% of Opus accuracy at 54% of the cost.
  https://medium.com/@zhengruqi2019/can-jev-route-between-cheap-and-expensive-llms-e2a3aaa7db6e
- A second external datum: on fstandhartinger/auto-model-router's 78-task
  calibration replay, a **heuristic beat both Jev and a local Laya classifier**
  (heuristic 68/78 solved, Jev 65/78). Jev was cheaper per solved turn
  ($0.00269 vs heuristic $0.00388) but solved fewer. A learned router is not
  automatically the best router.
  https://github.com/fstandhartinger/auto-model-router
- System-1 framing constraint (locked architecture): Jev **selects only**; it does
  not authorize, execute, merge identities, or weaken deterministic safety
  requirements. The metric that matters: **System-2 calls avoided without reducing
  success or safety.** If Jev adds a call and System 2 does the same work, REJECT
  the integration.

---

## 1. MODEL ROUTING — HYPOTHESIS + KILL CONDITIONS

### 1.1 What recent Jev routing work actually looks like (web survey, Sep 2026)

| Study | Finding relevant to PING |
|---|---|
| pi-model-router routing-policy study (jev-1.13.0) | Structured Choice criteria > flat; two parallel Nouls added ~190 tokens and **changed zero routes in 72 requests** — extra signals with zero decision value. Confidence varied across runs even when the top option stayed stable (uncalibrated-confidence warning). https://github.com/alexei-led/pi-model-router/blob/HEAD/docs/research/jev-routing-policy.md |
| ayautomate.com Jev-vs-LLM benchmark | Jev 1.13: median 0.33s/decision, $0.0151/1k decisions (8-way); 4.7-7.5x cheaper than cheapest small LLMs, 40-49x cheaper than GPT-5.6 Terra. But p95 0.44s and max 1.42s — cheap does not mean deterministic. https://www.ayautomate.com/blog/jev-vs-llm-benchmark |
| Zheng cascade vs preroute (Medium) | **Cascade (answer-then-verify) works; preroute (predict-difficulty) is ~random.** Direct evidence against global pre-routing. |
| skell-e-router classification (jev-1.13.0) | Jev 109/111 (98.2%) vs Luna 111/111; both Jev misses were the same "refund please" case with confidences 0.00/0.06 where the application rule accepted. Lesson: **low confidence did signal the miss**, but 0.02 on the correct attempt shows confidence is not a reliable per-case threshold. https://github.com/stanprokopenko/skell-e-router/blob/HEAD/docs/jev-classification.md |
| auto-model-router classifier comparison | Heuristic > Jev on solve rate; Jev > heuristic on cost/solved. **The bar is the heuristic, not Opus.** |

### 1.2 Candidate PING shape (HYPOTHESIS ONLY, not approved for wiring)

```
task
 ├─ D0-eligible?  (hash / schema / exact-match / arithmetic / permission /
 │                 state-transition / dedupe / replay — all deterministic
 │                 software, zero model involvement)
 │     └─ YES → execute software. DONE. No Jev, no LLM.
 │
 └─ NO → is this a CLOSED decision contract? (explicit options, typed inputs,
         bounded criticality, fail-closed default, shadow-calibrated first)
         ├─ NO  → ABSTAIN/ESCALATE: Jev never arbitrates open-ended work.
         │        Route: System 2 or HUMAN_REVIEW by standing policy.
         │
         └─ YES → Jev complexity classification FAST / BALANCED / STRONG
                  (post-answer cascade where the artifact exists;
                   pre-routing only inside a closed contract where the
                   misroute cost is bounded and measured)
                  ├─ FAST    → D0-equivalent deterministic fast path
                  │           (or Jev-decided trivial, e.g. dedupe classification)
                  ├─ BALANCED→ Jev primary decision, System 2 spot-check sampled
                  └─ STRONG  → System 2 decides, Jev observes for shadow eval
```

Routing decision contracts would be named instances, never a generic
"which model is good enough" oracle: e.g. `mc.authorize_work_order/v1`,
executor selection among {DETERMINISTIC_WORKER, HEADLESS_AGENT,
DEEP_REASONER, VERIFY_MORE, HUMAN_REVIEW}, reconciliation triage,
retry-vs-investigate. Each contract needs: typed inputs, explicit option set,
deterministic fallback, shadow-mode calibration history, per-version labels.

### 1.3 Kill conditions (the hypothesis dies if ANY holds)

1. **Static-beats-Jev on the eval corpus.** If `STATIC` (heuristic/default-route)
   or `TRUNCATE` (tool-result truncation / pass-through without routing) matches
   or beats `JEV` on **cost per correct decision** at equal-or-better success rate
   on the corpus in Section 2, the routing hypothesis is REJECTED for that
   contract. The heuristic already won once (auto-model-router); the truncation
   won once (2026-09-26 archive). Default to assuming the static baseline wins.
2. **Preroute equivalence.** If Jev pre-routing is statistically indistinguishable
   from RANDOM escalation at equal escalation budget on difficulty-prediction
   cases (the Zheng result), no preroute integration ships, ever. Cascade
   (verify-after) is the only surviving shape.
3. **Net-negative System-2 avoidance.** If the Jev call does not *replace* a
   System-2 call — i.e. total calls per task increase or stay equal with no
   success delta — REJECT. (The metric that matters.)
4. **Determinism failure.** If repeat runs of the same (contract, input digest)
   disagree on the route at a rate exceeding the agreed tolerance (see 3.4),
   routing is unsafe for any fail-closed path: REJECT or downgrade to
   advisory-only with deterministic tie-break.
5. **Confidence-miscalibration danger.** If Jev is *confidently wrong* (high
   confidence on wrong routes) at a rate above the false-safe budget (see 3.3),
   the contract cannot use Jev outputs as decision inputs — shadow only.
6. **Zero-cost-bleed violation.** Jev answers carry no provider cost field (direct
   TypeSafe API: spend ledger records 0.0). Any routing proposal must include a
   measured cost model; "cheap" without a number is not an argument.

### 1.4 The single measurement most likely to kill the hypothesis

**Cost per correct decision, Jev-routed vs static-route vs truncation-only, on
the corpus in Section 2 with the System-2-avoidance delta.** If
`COST_PER_CORRECT(JEV) >= COST_PER_CORRECT(STATIC)` — i.e. Jev does not buy its
way in with fewer System-2 calls at equal success — the hypothesis is dead, and
the corpse is the truncation baseline, which already won this fight once.

## 2. EVAL CORPUS — 20 GROUNDED EXAMPLES FROM EXISTING PING HISTORY

Each entry: decision as it occurred / inputs available at the time / known
ground-truth outcome / deterministic baseline verdict / current LLM approach /
the label a Jev classifier should produce.

### 2.1 ROUTING DECISIONS

**E1. Shadow seam: mc.authorize_work_order/v1 (2026-09-28, LIVE SHADOW SAMPLES)**
- Decision: GRANT vs DENY work-order authorization (C4 criticality).
- Inputs: {agentId, capability, namespace, constraints}; evidence = AGENT_PROFILES
  registry facts + request fields. Deterministic unit: authorizeWorkOrder() in
  orca-adapter, 8 ordered fail-closed checks.
- Ground truth (known): 6 real shadow samples — S1 hermes+text.summarize GRANT
  0.95; S2 hermes+orchestration.plan DENY 0.05; S3 unknown agent DENY 0.02;
  S4 bad namespace DENY 0.02; S5 missing no_mission_state_writes DENY 0.06;
  S6 opencode string-blocked DENY 0.19. 6/6 agreement with deterministic checks
  at 0.5 threshold, Brier 0.0076. Source: ~/workspace/ping-24h/LEDGER.md
  ("SHADOW JEV SEAM — LANDED 14:29 MDT").
- Deterministic baseline: 8 ordered fail-closed checks — exactly the behavior
  Jev shadowed, 100% agreement on this sample.
- Current LLM approach: Jev live via api.typesafe.ai/v1/systemone, jev-latest,
  latency 334-566ms (mean 422ms), cost UNKNOWN (no cost field returned),
  confidence:null never populated.
- Jev label: DECIDED=DENY/GRANT matching the deterministic checks;
  shadow-only (n=6, calibration NOT established). This is the canonical
  "router that must not beat a checklist" case: **the deterministic baseline is
  the bar and Jev only earns a vote after n>=100 with measured calibration.**

**E2. J4 shadow executor-routing harness (2026-09-26)**
- Decision: route a task to one of {DETERMINISTIC_WORKER, HEADLESS_AGENT,
  DEEP_REASONER, VERIFY_MORE, HUMAN_REVIEW}.
- Inputs: task state reduced to a seven-field whitelist.
- Ground truth: harness completed on uncommitted branch
  `jev-shadow-routing-domain`; tests 37/37 green; static/runtime checks showed
  **zero production routing changes**; every recommendation shadow-denied.
  Source: memory/2026-09-26.md#L2030.
- Deterministic baseline: none existed (this was a new seam); the standing
  policy is the default route.
- Current LLM approach: TypedDecision/JevShadowWorker/JEV_DECISION_EVALUATED
  path, adapted not added (no new authority).
- Jev label: shadow-denied routing recommendation with route + typed reason.
  **A routing layer that changes nothing in production is exactly the right
  shape; a router that touches production without clean-checkout replay is a
  violation.**

**E3. Failed routing proof: typesafe/jev-router → openai/gpt-6-luna (2026-09-26)**
- Decision: which model serves TYPESAFE_JEV intelligence dispatch.
- Inputs: jev-ask.sh had no model/profile concept; jev-reason.ps1 hardcoded
  model='typesafe/jev-router' in the POST body (slug from Nolan's message,
  overriding the "never use Jev Router" contract); no response.model check.
- Ground truth: OpenRouter delegated to `openai/gpt-6-luna` — the router did
  exactly what a routing product does. Nolan stopped ALL Jev intelligence
  dispatch until an exact TypeSafe model contract is proven; fault is ours
  (configuration), not the provider. Source: memory/2026-09-26.md#L2514,
  memory/2026-09-27.md#L88-L89.
- Deterministic baseline: pinned logical profile → model contract → provider
  adapter → exact request → response attestation (^jev-1\.13\.0$). The baseline
  would have REJECTED the Luna response at the attestation step.
- Current LLM approach (after fix): TYPESAFE_JEV → provider typesafe →
  jev-1.13.0 pinned; `typesafe/jev-router` and floating aliases BANNED;
  direct API echoes pinned model exactly. Verified live 2026-09-27
  (27/27 tests green, e2e PASS in 352ms).
- Jev label: CONTRACT_VIOLATION / ABSTAIN — a router must attest what it
  returned. **The most dangerous routing failure here was not the model choice
  but the missing response.model check; a Jev router without attestation is a
  delegation chain with no receipts.**

**E4. Cascade vs preroute, external (Zheng, Sep 2026)**
- Decision: when to escalate Haiku→Opus on 200 MMLU-Pro questions.
- Inputs: Jev as (a) cascade verifier of Haiku answers, (b) preroute
  difficulty predictor.
- Ground truth: cascade → 94% of Opus accuracy at 54% cost; preroute →
  **close to random**. Random-30 escalation was the control.
  https://medium.com/@zhengruqi2019/can-jev-route-between-cheap-and-expensive-llms-e2a3aaa7db6e
- Deterministic baseline: always-Haiku and always-Opus; random-escalation
  control beat Jev preroute.
- Jev label: for cascade, DECIDED=ESCALATE/KEEP with measured
  accuracy-per-dollar; for preroute, **UNKNOWN — abstain from pre-routing,
  the evidence says the signal is noise.** This is the strongest external
  corroboration of the 2026-09-26 archive: no global prerouter.

**E5. Heuristic beats learned router, external (auto-model-router, Sep 2026)**
- Decision: route 78 tasks among Sol/Luna/Jev/local routes.
- Inputs: exact replay through F_expected; frozen per-task results + list-price
  cost; no new LLM answers.
- Ground truth: heuristic 68/78 solved (87.2%), local Laya 66/78, Jev 65/78,
  always-Opus 71/78. Jev cheapest per solved turn ($0.00269 vs heuristic
  $0.00388) but solved fewer. **The heuristic was strongest on this replay.**
  https://github.com/fstandhartinger/auto-model-router
- Deterministic baseline: the heuristic — the bar Jev must beat.
- Jev label: DECIDED with route, but the corpus-level label is
  **KILL-CONDITION-1 TRIGGERED** (Section 1.3): the static baseline won.

**E6. FB builder tier quality, pass 129 (2026-09-27)**
- Decision: pick 12 like-targets from regex tiers (trade-hit/PROMO_RE).
- Inputs: provisional pool of local business posts.
- Ground truth: tiers misfired — a real-estate listing, a sponsorship
  solicitation, an out-of-corridor concert, cross-posted near-dups, and a
  previously-engaged business were picked; genuine farm-stand/restaurant/bar
  promos were missed. Curated manually; shipped honest below-cap count;
  saved ~/workspace/outreach/fb129-curated-job.json. Source: ~/AGENTS.md
  (FB builder tier quality check).
- Deterministic baseline: none; the regex tiers ARE the deterministic baseline
  and they failed.
- Current approach: human curator over the fresh-ok pool (genuine local
  business promos only, near-dups collapsed, recently-engaged excluded).
- Jev label: this is a **classification-for-routing** case (which posts are
  genuine local-business promos?). A Jev classifier would need per-post labels
  and measured precision/recall vs the regex tiers. **Unproven until a corpus
  like this one labels it.**

### 2.2 CLASSIFICATION DECISIONS

**E7. Commute-blackout vs real outage (2026-09-28, multiple readings)**
- Decision: classify a reachability failure as EXPECTED_COMMUTE_BLACKOUT vs
  REAL_REACHABILITY_FAILURE.
- Inputs: probe result + timestamp vs standing windows (~06:30-07:00,
  ~16:30-17:00 MDT weekdays; earlier notes 06:45-08:15 / 15:45-17:15).
- Ground truths (known):
  (a) 16:04-16:05 MDT: PROXY_FAILED, two retries, before the 16:30 window →
      **genuine tailnet tunnel failure**, UNKNOWN transport, no restart.
      memory/2026-09-28.md#L1978-L1989.
  (b) 15:26 MDT outage, 15-19 min BEFORE the evening window →
      **real reachability failure**, alert raised. #L1804-L1810.
  (c) 16:01 MDT PIG_REACHABLE then 16:04 PROXY_FAILED, just ahead of the
      commute window → treated as **UNKNOWN transport, possible early
      commute**, no further action. #L1947.
  (d) 2026-09-27 11:11-12:47 and 13:50 MDT wedges: Windows Modern Standby
      (S0 idle) with connectivity-disconnect logged ~35 min before each wedge;
      classified TRANSPORT_UNKNOWN / NETWORK_TRANSITION, not GATEWAY_DOWN or
      PIG_DOWN. Source: ~/AGENTS.md (Transport failure != service failure).
- Deterministic baseline: timestamp ∈ window ? EXPECTED_BLACKOUT : RETRY-THEN-
  CLASSIFY. The baseline handles (a)-(d) correctly.
- Current LLM approach: none — this is pure deterministic + standing-policy
  classification, and it is the model Jev must beat to earn any role here.
- Jev label: DECIDED with window arithmetic only; **a classifier that
  mislabels a commute blackout as an outage causes restarts of healthy infra —
  the false-escalation cost dominates.** Excellent abstain-calibration case.

**E8. Gateway health triage typing (2026-09-27/28)**
- Decision: type a failed probe as PROXY_FAILED / TUNNEL_FAIL /
  TAILSCALE_UNREACHABLE / HOST_ASLEEP / CONTAINER_MISSING / UNKNOWN.
- Inputs: SSH stderr signatures ("nc: proxy read: Broken pipe",
  "Connection closed by UNKNOWN port 65535"), empty remote output, host state.
- Ground truth: when the probe fails at the CONNECT tunnel, downstream
  alarms (container missing, consecutive non-healthy counts, identity
  mismatch) are **the same transport failure wearing different masks**; the
  tripwire mislabeled empty readings as JOURNAL_GATEWAY_IDENTITY_MISMATCH
  (fixed 2026-09-28: now emits OBSERVATION_FAILED exit 3 on null/unparseable
  readings). Source: ~/AGENTS.md (Probe retry posture; Health status taxonomy).
- Deterministic baseline: typed reasons with per-layer attribution; no remote
  absence claim without host authority contact. Handles correctly.
- Jev label: ABSTAIN-if-null — **"never convert low confidence into arbitrary
  action"**: empty readings → OBSERVATION_FAILED, never a guessed diagnosis.
  The classic case for fail-closed abstention semantics.

**E9. Ask FYD ingestion: "Move emergency plumbing to the top" (2026-09-23)**
- Decision: parse intent → resolve target object → bind to a digest-bound
  proposal.
- Inputs: fixture-backed Coppersmith projection containing both `Plumbing`
  and `Emergency Plumbing`.
- Ground truth: parsed to `promote_first`, resolved **specifically to
  `Emergency Plumbing`** (not the shorter `Plumbing` partial match),
  produced a `reorder_section` proposal moving the Services section to
  index 0. Source: memory/2026-09-23.md#L1350.
- Deterministic baseline: exact-match/prefix resolution would have matched
  `Plumbing` first — **the baseline is wrong here**; semantic specificity
  wins. This is the rare case where a System-1 semantic judgment beats
  deterministic matching.
- Jev label: DECIDED=promote_first(Emergency Plumbing) with disambiguation
  evidence. **Candidate System-1 win case — but it needs a labeled corpus of
  ambiguous resolutions to measure precision.**

**E10. Alpine Tree Service chain re-verification (2026-09-10 → 2026-09-13)**
- Decision: is this prospect still an independent (no-franchise rule)?
- Inputs: T1 (2026-09-10, round-19): verified independent candidate.
  T2 (2026-09-13, round-44): own site announces it joined SavATree.
- Ground truth: EXCLUDED per the no-franchise rule; same identity, changed
  property, both evidence-linked; projection recomputed SUPPRESS-adjacent;
  temporal law holds. Source:
  ~/workspace/ping-decision-fabric/one-reached-loop-report-2026-09-28.md;
  SavATree consolidation (T4, Peak Tree Works, Alpine, Aspen Tree Service)
  re-confirmed 2026-09-20 (memory/2026-09-20.md#L529-L535).
- Deterministic baseline: standing no-chain policy + site re-check at
  outreach time → EXCLUDED. Baseline is correct.
- Current approach: human research rounds with chain re-verification at
  send time (standing rule since 2026-09-20).
- Jev label: DECIDED=EXCLUDE (changed affiliation) with T1→T2 temporal
  evidence. **Temporal classification case: the label is a function of
  (identity, property, time); Jev must cite the T2 evidence, not just the
  current state.**

**E11. "refund please" completeness classification, external (skell-e-router)**
- Decision: is this support message textually sufficient?
- Inputs: the string "refund please."
- Ground truth: the application rule accepts it as sufficient. Jev returned
  *insufficient* twice (confidence 0.00, 0.06) and *sufficient* once
  (confidence 0.02). Luna passed every attempt. Overall Jev 109/111 vs
  Luna 111/111 on 111 decisions. Labels and prompts were fixed before Jev
  testing; no tuning after seeing mistakes. https://github.com/stanprokopenko/skell-e-router/blob/HEAD/docs/jev-classification.md
- Deterministic baseline: keep the free local rule — the study's own
  recommendation.
- Jev label: on this case, WRONG with near-zero confidence — a **confidently
  (well, consistently) wrong** signal. Corpus label: the case is a known
  Jev blind spot; **confidence is uncalibrated (0.02 on the right answer,
  0.00-0.06 on wrong ones) — never threshold on it without calibration data.**

### 2.3 FAILURE TRIAGE DECISIONS

**E12. NAMESPACE_VIOLATION ×963 — detector defect, not breach (2026-09-28)**
- Decision: is the gateway under attack, or is the detector broken?
- Inputs: /health showed event_governance NAMESPACE_VIOLATION ×963 (all
  JEV_DECISION_EVALUATED, namespace `jev` missing from NAMESPACE_OWNERS);
  3 jev-shadow missions in unbounded fail/retry (1 failure/5s); /health
  degraded.
- Ground truth: **root cause DETECTOR_DEFECT** (policy-map gap in the Sep-24
  image), not a genuine breach. The live rejection proves genuine producers
  pass the verdict gate; only the ownership map is missing. Fix = one key
  (`jev: 'PING'`) held for owner authorization. Source:
  ~/workspace/ping-decision-fabric/jev-namespace-candidate-report-2026-09-28.md,
  one-reached-loop-report /health section.
- Deterministic baseline: 5 pre-edit proofs (intended producer, exact event
  type, no other owner, external callers cannot acquire authority, ordering
  preserved) — all checkable without any model.
- Jev label: DECIDED=DETECTOR_DEFECT with proof list. **The failure-triage
  case where a classifier sees "963 violations" and must NOT conclude
  "attack". A naive model screams incident; the correct label is policy-map
  gap. Abstention (UNKNOWN pending the 5 proofs) is the safe fallback.**

**E13. Canonical test-run triage: 11 failing suites (2026-09-27 → 2026-09-28)**
- Decision: did the lane's changes cause these failures?
- Inputs: 09-27 full run: 207 suites, 196 pass/11 fail; 2230 pass/22 fail,
  known-failing list documented. 09-28: 221 suites, 2488 pass, 23 failures
  across 12 suites; failure set **byte-identical with and without the lane
  changes** (verdict: zero new regressions). 09-28 clean-worktree gate:
  base 124 suites/1289 tests with 2 failing suites/4 failed tests; candidate
  125/1290 with the IDENTICAL 2 suites/4 tests failing → ADDITIVE-GREEN.
  Sources: ~/workspace/ping-24h/LEDGER.md#L50; memory/2026-09-28.md#L1036, #L1053.
- Deterministic baseline: byte-compare failure sets with/without the change —
  the baseline IS the triage method and it is correct.
- Jev label: DECIDED=PRE_EXISTING with evidence (failure-set diff = empty).
  **Lane self-reports are hypotheses until replayed from a clean checkout
  (2026-09-26 binding rule). A Jev triage classifier must implement
  "diff against baseline" as its primary evidence, not "count red tests".**

**E14. Fixture discrepancy: deterministic regeneration vs committed fixtures
  (2026-09-21)**
- Decision: why do 6 proceduralize/components suites fail on the canonical
  branch?
- Inputs: suites expect rich committed fixtures; deterministic regeneration
  yields degraded fixtures (Happy Place 2 objects vs 9 in HEAD); SiteSpec
  digest unchanged; identical failures before/after lane work.
- Ground truth: **fixture/pipeline-driven, not caused by the planner work**;
  logged OPEN as FL-20260921-034; pipeline-vs-fixture triage pending.
  Source: memory/2026-09-21.md#L716.
- Deterministic baseline: digest comparison (SiteSpec digest unchanged) +
  before/after failure-set identity → PRE_EXISTING. Baseline correct.
- Jev label: DECIDED=ENVIRONMENT/FIXTURE_DRIFT, not CODE_REGRESSION. **A
  classifier that cannot distinguish fixture drift from regressions will
  blame every lane for pre-existing rot.**

**E15. Ingestion failure-honesty: verified:false verdicts (2026-09-23)**
- Decision: what to do with a verdict event whose verification failed.
- Inputs: genuine pipeline test events; witness adversarial suite 13/13;
  bridge-shaped verdict events incl. _skipGovernance:true.
- Ground truth: verified:false failure-honest paths are **admitted as
  records** (not dropped, not promoted); bridge maps verdict types to
  trigger missions, **never upgrades**; _skipGovernance:true fails closed;
  trust-transport PASS. Source: memory/2026-09-23.md#L625.
- Deterministic baseline: the verdict-gate code — fail-closed ordering is
  exactly specified. Baseline is the authority.
- Jev label: DECIDED=ADMIT_AS_RECORD (not PROMOTE, not DROP). **Classification
  with a third state between accept and reject; a binary classifier would
  either launder failures into truth or destroy failure evidence.**

**E16. Reconciliation gap triage (2026-09-14; 2026-09-28)**
- Decision: are there unreconciled gaps in the pipeline state?
- Inputs: 2026-09-14: gap_count 0, exit 0; post-success worker death healed on
  retry by ping_events probe by observation SHA-256 (sidecar healed, duplicate
  refused); uncheckable durability probe → UNCHECKED/BLOCKED, never silent
  success. 2026-09-28 04:03 MDT: LATEST.json gap_count=0; prior 22:03 had 1
  actionable R3 EMIT UNCHECKED (scp failed during 05:21-05:24 tailnet wedge)
  that cleared on the next run; 15 KNOWN_PERMANENT suppressed (8 R2 DISTILL +
  7 R3 EMIT, closed per r2/r3-closure-20260920.md). Sources:
  memory/2026-09-14.md#L355; memory/2026-09-28.md#L1188.
- Deterministic baseline: gap counters + suppression lists + heal-on-retry —
  the baseline handles everything observed.
- Jev label: DECIDED=NO_ACTIONABLE_GAPS with the UNCHECKED→cleared transition
  as evidence. **Excellent negative-example material: most reconciliation
  checks conclude "nothing to do"; a router that escalates "nothing to do"
  into work is a cost leak.**

**E17. Laundering point LP-1: fabricated confidence 0.85 (2026-09-23)**
- Decision: can the autonomous-loop's 0.85 confidence feed consensus
  acceptance (0.7 threshold) → durable registry reputation?
- Inputs: startAutonomousLoop hardcodes 0.85, reachable via authenticated
  route; 8 laundering points mapped (LP-4: P2 hardcoded 0.85 probabilities
  shadow-contained; LP-5: createCanonicalObject defaults confidence=1.0, 3
  of 4 callers never pass it; LP-8: double confidence channel).
- Ground truth: LP-1 **P0-GATED, code live** — a hardcoded number becomes a
  reputation input. This is the canonical "confidence is evidence, never
  authorization" violation. Source: memory/2026-09-23.md#L162;
  memory/2026-09-22.md#L1388 (priority P0).
- Deterministic baseline: the gate — reject hardcoded confidence at the
  boundary.
- Jev label: **this is what happens when a model/router output (a
  probability) is treated as a decision**: DECIDED=GATE_REQUIRED. **For Jev
  routing: a Jev probability must never cross the authorization boundary
  unaccompanied. Any corpus that trains "high Jev confidence → act" is
  training the LP-1 failure.**

**E18. DISTILL closer: 36-hour threshold semantics (2026-09-26)**
- Decision: when does a stale distill item qualify for closure?
- Inputs: the 36-hour threshold; qualifying observation/report timestamp
  (latest consecutive report's checked_at) vs wall-clock decision time.
- Ground truth: threshold evaluated **at the qualifying observation
  timestamp**, not at wall-clock decision time, unless the rule says
  otherwise; fail-closed when observation time is undeterminable. Patched
  into chronic-distill-close.py. Source: ~/MEMORY.md (DISTILL closer age
  semantics).
- Deterministic baseline: timestamp arithmetic on the observation — exact,
  auditable. Baseline is authoritative.
- Jev label: DECIDED=rule-application with cited timestamp. **Age semantics
  are a D0 problem; routing this to any model is waste. Keep in corpus as a
  "must NOT route" negative control.**

**E19. HPP PR #1: policy reversal (2026-09-27)**
- Decision: continue the upstream Happy Place fix, or stop?
- Inputs: PR #1 open against trishnikitha-art/happy-place-platform; fork
  pinging2/happy-place-platform; local clone at ~/workspace/original-site.
- Ground truth: Nolan ordered never touch the Happy Place original (hard
  boundary: no modification clone, PR, push, deploy, workflow edit).
  **PR #1 closed unmerged, fork deleted, upstream untouched, local clone
  removed.** All HPP defect work confined to the design sprint's parallel
  separate clone. Source: memory/2026-09-27.md#L1972-L1974, #L2297.
- Deterministic baseline: the standing prohibition list (exact matches on
  repo identity) — mechanical, instant.
- Jev label: DECIDED=HOLD/REVERSE with policy citation. **Corpus value:
  decisions that reverse prior work on authority grounds; the label needs a
  reason field, not just a route.**

**E20. FB engagement guard blind spot (2026-09-25)**
- Decision: which posts are eligible for engagement without re-engaging?
- Inputs: pass-log sections 113+ recorded targets as prose without
  per-action URLs; builder's ledger scan was date-scoped to today only.
- Ground truth: **12 already-engaged posts slipped into one provisional job;
  2 survived the at-dispatch guard pre-fix.** Fixed: guard merges
  terminal-aware ledger post IDs on every load_index(); NOT_ATTEMPTED
  terminals stay eligible (proven non-execution); EXECUTED/FAILED/
  UNKNOWN_EXECUTION and open intents block; builders use the same helper
  pre-filter. Verified: fixed guard blocked all 9 must-drops as
  ALREADY_ENGAGED. Source: ~/AGENTS.md (Never-reengage guard blind spot).
- Deterministic baseline: the merged post-ID set — exact, complete.
  Baseline correct after fix.
- Jev label: DECIDED=BLOCKED (ALREADY_ENGAGED) with ledger citation.
  **The failure mode was incomplete input coverage (prose logs, date-scoped
  scan), not judgment: a classifier fed partial history will under-block.
  Corpus lesson: label the evidence-completeness of the input, not just the
  verdict.**

### 2.4 Corpus summary and coverage matrix

| Class | Count | Deterministic baseline already correct | Baseline wrong / model-wins candidate |
|---|---|---|---|
| Routing | 6 (E1-E6) | E1 (checklist ties), E2 (policy), E3 (attestation), E4-preroute (random control), E5 (heuristic) | E4-cascade (verify-after), E6 (promo classification, unproven) |
| Classification | 5 (E7-E11) | E7, E8, E10, E11 | E9 (semantic specificity beat exact-match) |
| Failure triage | 9 (E12-E20) | E12-E20 all | (none) |

Headline: **on 18 of 20 examples the deterministic baseline is already
correct or authoritative.** The two genuine model-win candidates are E4
(cascade verification) and E9 (semantic disambiguation). Every routing
proposal must say which of these 20 examples it would handle differently
and show the measured delta — otherwise it is speculation.

## 3. BENCHMARK METHODOLOGY — DETERMINISTIC BASELINE vs JEV vs CURRENT LLM vs HUMAN/KNOWN OUTCOME

### 3.1 Contestants (four arms, every example)

| Arm | Definition | What it represents |
|---|---|---|
| STATIC | Deterministic baseline: heuristics, checklists, timestamp arithmetic, ledger-set membership, policy lookup, exact-match/prefix resolution, failure-set diff. Zero model calls. | The incumbent. The bar. |
| TRUNCATE | Static route + tool-result truncation / pass-through: no routing decision at all, the decision point is removed or replaced with a fixed cap. | The 2026-09-26 winner. |
| JEV | Jev 1.13.0 via the TYPESAFE_JEV contract (pinned, attested, purpose-gated, budget-gated), per-decision-contract prompt, typed Choice output. | The hypothesis. |
| LLM | Current System-2 approach (frontier model) doing the same decision today, where one exists. | The cost to beat on latency/cost. |
| TRUTH | The ground-truth label from Section 2 (human/known outcome). | The judge. |

### 3.2 Metrics (measured per decision contract, n >= 100 before any promotion)

1. **Accuracy**: fraction of DECIDED outputs matching TRUTH (abstentions excluded
   from the numerator, counted separately).
2. **Abstention rate**: fraction of outputs that are ABSTAIN / UNKNOWN / ESCALATE.
   A model that is right whenever it decides and abstains otherwise can still be
   useful — but only if the fallback (STATIC or human) is cheap.
3. **False-safe rate**: fraction of outputs where Jev said DECIDED-safe
   (GRANT / route-to-cheap / no-escalation) and TRUTH says UNSAFE.
   **This is the safety metric. Budget: 0 on safety-critical contracts
   (C4+), near-zero elsewhere.**
4. **False-escalation rate**: fraction where Jev said ESCALATE/HUMAN_REVIEW and
   TRUTH says the deterministic answer was available. This is the cost-leak
   metric (cf. E16: "nothing to do" escalated into work).
5. **Latency**: p50/p95 per decision, end-to-end including attestation and
   ledger write. Jev reference points: 0.33s median (ayautomate), 0.213s median
   (skell-e-router), 334-566ms mean 422ms (PING shadow seam 2026-09-28).
6. **Cost**: measured dollars per decision AND **System-2 calls avoided per
   100 decisions**. The direct TypeSafe API returns no cost field, so cost is
   measured at the ledger (calls × contracted unit price), never assumed.
7. **Determinism / repeatability**: same (contract_version, input_digest) →
   same output, measured as agreement rate over >= 3 repetitions per example.
   Tolerance: >= 99% agreement for fail-closed contracts; >= 95% elsewhere.
   Below tolerance → advisory-only or REJECT.
8. **Calibration**: Brier score on the probability channel + a calibration
   curve. The shadow seam measured Brier 0.0076 on n=6 — encouraging, not
   established. The "refund please" case (E11) and the pi-model-router
   confidence-variance finding are standing warnings: **confidence is not a
   decision until calibrated.**

### 3.3 Abstain semantics (typed, never converted to action)

| State | Meaning | Downstream |
|---|---|---|
| DECIDED | Output selected from the contract's explicit option set, with typed reason + evidence refs + probability. | Proceeds to the authority that owns the action (Jev never authorizes). |
| ABSTAIN | Jev declines: input outside contract, evidence incomplete, or confidence below the calibrated floor. | Falls back to STATIC baseline for this input. Recorded as ABSTAIN. |
| UNKNOWN | The reading itself is null/unparseable (cf. E8: empty probe readings → OBSERVATION_FAILED exit 3). | No claim made about the world. Retry per probe posture, then HOLD. |
| ESCALATE | Contract requires human/owner authority (C5+, canonical truth, irreversible effects). | Human queue with the full evidence packet. |

**Iron rules:**
- Never convert low confidence into an arbitrary action (the tripwire
  JOURNAL_GATEWAY_IDENTITY_MISMATCH mislabel is the standing anti-pattern).
- UNKNOWN is a legitimate terminal state; a made-up root cause is not
  (2026-09-27 standing rule).
- ABSTAIN must be cheaper than DECIDED-wrong: the fallback path (STATIC)
  must exist and be measured, or ABSTAIN is just latency with extra steps.
- Confidence gates are calibrated per contract version, never global, never
  hand-set (cf. LP-1: hardcoded 0.85 → P0 gate).

### 3.4 Adoption bar (numeric, binding if accepted)

A Jev routing/classification integration for contract C is ADOPTED iff ALL hold
on the corpus + a live shadow window (n >= 100):

1. **System-2 avoidance**: Jev avoids >= 25% of System-2 calls for C
   (calls/100 decisions vs the no-Jev path), with success delta >= -2
   percentage points vs STATIC on TRUTH-labeled outcomes.
2. **Cost per correct decision**: COST_PER_CORRECT(JEV) <= 0.8 ×
   COST_PER_CORRECT(best of STATIC / TRUNCATE / LLM), measured end-to-end
   (Jev call + fallback + System-2 calls not avoided).
3. **Safety**: false-safe rate = 0 on C4+ contracts; <= 0.5% elsewhere, with
   every false-safe incident producing a written post-mortem before the
   contract re-opens.
4. **No confidence laundering**: the Jev probability never crosses an
   authorization boundary as a lone input; every DECIDED carries the
   deterministic checks it shadowed (cf. E1's 8 fail-closed checks).
5. **Determinism**: >= 99% repeat-agreement on fail-closed contracts,
   >= 95% elsewhere (3+ repetitions per example).
6. **Calibration**: Brier <= 0.05 on the shadow window AND the calibration
   curve shows no confident-wrong mass above the false-safe budget.
7. **Kill-switch**: the STATIC fallback stays wired and is exercised weekly;
   if any metric regresses below the bar for 2 consecutive windows, the
   contract reverts to STATIC automatically (no meeting required).

If the proposal cannot name the corpus examples it beats STATIC on, it does
not get a shadow window.

### 3.5 What "beats the baseline" looks like concretely

- **E4-cascade shape**: Jev verifies an existing artifact (answer, proposal,
  classification) and its ESCALATE/KEEP decisions cut System-2 rework by
  >= 25% at equal success. (Zheng: 94% of Opus accuracy at 54% cost.)
- **E9 shape**: Jev disambiguates where deterministic matching is provably
  wrong (exact-match loses), with measured precision >= 95% on a labeled
  ambiguity corpus.
- **Everything else**: STATIC/TRUNCATE wins until shown otherwise. The
  default answer to "should Jev route this?" is NO, with the corpus as
  the receipt.

---

## 4. FAILURES / ABSTENTIONS — WHAT HAPPENS WHEN JEV IS WRONG

### 4.1 When Jev is wrong (ordinary miss)

- The DECIDED output carries: selected option, typed reason, evidence refs,
  input digest, contract version, probability, latency, cost.
- The owning authority (deterministic check, adapter, or human) re-verifies
  against its own evidence before any effect. Jev's miss is therefore
  **contained at the proposal layer** — the E1 shape (shadow-denied) is the
  safe default posture for every new contract.
- Evidence recorded: the full envelope above + the TRUTH label once known +
  the delta vs STATIC on the same input. Every miss feeds the corpus
  (Section 2 grows; the contract's calibration is recomputed).

### 4.2 When Jev abstains (ABSTAIN / UNKNOWN / ESCALATE)

- ABSTAIN → STATIC fallback executes; the abstention is logged with the
  reason (out-of-contract input, incomplete evidence, sub-floor confidence).
  Abstention rate is a first-class metric (3.2); a contract where Jev
  abstains > 40% is a contract Jev does not belong in — revert to STATIC.
- UNKNOWN (null/unparseable input) → no claim; retry per probe posture
  (bounded, path-varied; no retries inside commute windows); then HOLD.
- ESCALATE → human queue with the evidence packet, one decision, one
  sentence, one evidence link, APPROVE or DENY (the standing owner-approval
  shape).
- **Who catches it**: the fallback chain is STATIC → human, never
  Jev-retrying-Jev. A second Jev call on the same input is forbidden
  (it converts abstention into latency).

### 4.3 When Jev is confidently wrong (the dangerous case)

This is the LP-1 / E11 / E3 class: high (or fabricated) confidence on a wrong
output, or a confident output that bypasses attestation.

- **Caught by**: (1) response attestation (E3: model-echo check rejects
  delegation); (2) the deterministic checks the decision shadows (E1: the 8
  fail-closed checks outvote any probability); (3) calibration monitoring —
  confident-wrong mass above the false-safe budget closes the contract;
  (4) the authorization boundary — a probability is evidence, never
  authorization (standing product law, MEMORY.md#L246).
- **Evidence recorded**: the confident-wrong envelope is preserved verbatim
  (prompt sha256, output, probability) in the spend ledger; a post-mortem is
  written; the contract's calibration floor is raised or the contract is
  reverted to STATIC.
- **The asymmetry**: an ordinary miss costs a retry; a confidently-wrong
  output that reaches an authority costs a laundering incident (LP-1 was
  P0-gated code-live). This is why the adoption bar (3.4) puts the false-safe
  budget at zero for C4+ and why no Jev output may cross an authorization
  boundary alone.

### 4.4 Standing guardrails that already implement this

- Jev stays SHADOW until calibration is established (n >= 100, Brier
  measured); the 2026-09-28 seam is at n=6 — nowhere near the bar.
- Every call through jev_ask.py: profile-only, purpose gating, budget gate,
  prompt sha256 in the spend ledger (MEMORY.md#L246).
- `typesafe/jev-router` and floating aliases are BANNED; pinned jev-1.13.0
  with response attestation (~/workspace/fyd-intel/model_contract.json).
- Design A: per-call explicit opt-in throwing AUTONOMOUS_LOOP_CLOSED;
  de-fabrication at root (no fabricated confidence reaches a record).
- UNKNOWN is never rendered as FAILED and never enters learning
  (one-reached-loop report: EFFECT/OUTCOME classification).

---

## 5. OPEN QUESTIONS FOR THE PARENT / OWNER

1. Adopt the numeric bar in 3.4 as the lane standard, or tighten/loosen which
   threshold first? (The 25% System-2-avoidance and 0.8× cost bar are my
   proposal, not owner-approved.)
2. The corpus has 20 examples; E4-cascade and E9 are the only model-win
   candidates. Should the next lane build labeled corpora specifically for
   those two shapes (ambiguity resolution, verify-after), or hold until a
   third candidate appears?
3. `~/workspace/ping-24h/jev-autonomy/` did not exist before this report —
   confirm this is the intended home for the eval corpus (vs
   ~/workspace/ping-decision-fabric/).

## 6. SOURCES

- ~/memory/2026-09-14.md, 2026-09-20.md, 2026-09-21.md, 2026-09-22.md,
  2026-09-23.md, 2026-09-26.md, 2026-09-27.md, 2026-09-28.md
- ~/MEMORY.md (standing product law; DISTILL closer semantics)
- ~/AGENTS.md (never-reengage guard blind spot; FB builder tier quality;
  probe retry posture; transport failure != service failure)
- ~/workspace/AGENTS.md (Pig transport rules — read per folder house rules)
- ~/workspace/ping-24h/LEDGER.md, convergence-matrix/CONVERGENCE_MATRIX.md
- ~/workspace/ping-decision-fabric/one-reached-loop-report-2026-09-28.md,
  jev-namespace-candidate-report-2026-09-28.md
- ~/workspace/fyd-intel/LANE.md, model_contract.json, spend-ledger.jsonl
- External: Zheng cascade/preroute (Medium, Sep 2026); ayautomate Jev-vs-LLM
  benchmark; pi-model-router routing-policy study; skell-e-router
  jev-classification; fstandhartinger/auto-model-router classifier comparison.
