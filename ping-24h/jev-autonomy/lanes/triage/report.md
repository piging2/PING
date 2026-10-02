# LANE 5: TRIAGE — Mission Control + Failure + Test + Completion
**Status:** READ-ONLY harvest + design. No production wiring. All Jev judgments are shadow-only: Jev recommends, PING authorities decide.

## Governing constraints (owner law, baked in)
- Jev never becomes an authority or canonical truth. Classification may be probabilistic; AUTHORIZATION cannot.
- D0 = deterministic software (classifiers, parsers, gates, fixed constraints). D1 = fast bounded Jev judgment (labels + confidences, tie-breaking, completeness looks). D2 = expensive generative reasoning (novel / unknown / high-risk only).
- Key metric: **System-2 calls avoided without reducing success or safety.** Every surface below prices its D2 burn.

---

## 1. MISSION CONTROL TRIAGE

### Design: firehose -> classification -> attention
Raw input example: 2847 events, 93 worker updates, 18 warnings, 7 failures, 2 uncertain external effects. The funnel:

**D0 (deterministic, owns the funnel):** event stream is folded into typed counters and a per-item attention ledger. Every event gets a terminal disposition recorded (HANDLED / ALREADY_ATTENTIONED / SUPPRESSED_BACKGROUND). The within-pass dedup rule comes straight from `engagement-guard.py`: the guard keys dedup on a unique per-item descriptor and merges terminal-aware ledger state on every load. Applied here: **an item with a terminal disposition never re-enters the attention queue.** UNKNOWN items stay eligible; EXECUTED/FAILED/SUPPRESSED block re-alert.

**D1 (Jev, bounded):** each non-terminal item gets exactly one judgment:

| Input | Type |
|---|---|
| event type + actor + severity fields | D0 feature |
| stderr/stdout snippet (bounded, first ~2KB) | D0 feature |
| matched signature id or `NONE` | D0 feature (signature ledger lookup) |
| first-seen timestamp, prior disposition history | D0 feature |
| commute-window / known-wedge context flag | D0 feature |

Jev output (closed choice, never free text):
- `class`: ATTENTION_OWNER (Nolan must see) / ATTENTION_QUEUE (MC "needs attention" card, batched) / BACKGROUND (ledger only)
- `confidence`: float in [0,1]
- `why_ref`: pointer to the deterministic features it used (no new claims)

Jev does NOT decide alerts. A deterministic policy converts label+confidence to routing:
- class=ATTENTION_OWNER AND confidence >= 0.85 -> MC "needs your authority" card, one entry per item, deduped by the attention ledger.
- class=ATTENTION_QUEUE OR (OWNER with confidence < 0.85) -> MC "needs attention" batched card.
- class=BACKGROUND -> ledger only, never a card.
- confidence < 0.60 -> forced ATTENTION_QUEUE regardless of class (uncertain items are queued, never dropped).

Example mapping against the owner's own language: `1. UNKNOWN external email outcome` -> ATTENTION_OWNER (uncertain external effect, possible customer consequence). `2. credential exposure` -> ATTENTION_OWNER (security incident, standing wake/stop class). `3. failed canonical test` -> ATTENTION_QUEUE (internal, batsched). Routine ingestion, successful projections, expected network transition (commute windows, known wedges) -> BACKGROUND.

**D2:** only when Jev class confidence < 0.60 AND the item carries uncertain external effect or first-time signature. D2 writes an analysis, never routes.

**System-2 avoided:** from the 2847-event example, D0+D1 dispose of ~2844; only novel/uncertain items (the 2 uncertain external effects, maybe) reach D2. Without this, each anomaly burns a System-2 read of the whole firehose.

### Bounded scheduling: which mission first?
Deterministic constraints REMAIN CODE. They are the existing MC substrate: `mc-dispatch.ts` FIXED_CONSTRAINTS (slice agents/tenants, DEADLINES), AgentProfile whitelist, capability allowlist, broker quota fail-closed, reconcile-gated re-issue in the adapter path. Concretely:

**D0 (code, inviolable):** given candidate missions, eliminate all violating: blocked (dependency unmet), not in slice, capability not allowlisted, quota exhausted, deadline already past, reconcile HOLD open. The surviving set is the FEASIBLE set. Scheduling order among feasible missions uses a deterministic comparator: earliest deadline first, then declared priority, then FIFO. This is the default order and it is final unless Jev has a tie to break.

**D1 (Jev, fuzzy portion only):** Jev is invoked ONLY on the feasible set, ONLY to resolve ties / near-ties (deadlines within slack epsilon, equal priority). Inputs: customer impact signal (owner-declared business object importance, existing relationship), risk (novelty of the capability path, recent failure history of the same class), resource cost estimate. Output: a ranking of the feasible set with a one-line per-item rationale pointer. Deterministic comparator is the tiebreak-of-last-resort: if Jev abstains or errors, the D0 order stands.

**Where the boundary sits:** Jev can never make an infeasible mission feasible (no constraint override), can never reorder across a deadline inversion (a later-deadline mission may not precede an earlier-deadline one by Jev fiat), and its ranking is advisory: the dispatcher logs `order_source=JEV_TIEBREAK` or `order_source=DETERMINISTIC` per dispatch. A D2 review is never scheduled for ordering; ordering is never worth a System-2 call.

---

## 2. FAILURE TRIAGE (experiment #1)

### Pipeline
**D0 — deterministic feature extraction + known-signature match (first, always):**
Features: exit code, stderr signature (regex over closed pattern set), sentinel presence (`SENTINEL=ORACLE_OK` or equivalent proof the probe executed remotely), time-of-day vs known blackout windows (commute ~06:30-07:00 / ~16:30-17:00 MDT; Modern Standby post-wake gap), pre/post-reboot state. Signature ledger: deterministic map from (exit code, stderr regex, sentinel state) to a known signature id. Existing template: `gateway-classify.sh` with its closed 10-reason vocabulary (`DNS_FAILED PROXY_FAILED TAILNET_UNREACHABLE SSH_FAILED HOST_UNREACHABLE WSL_UNREACHABLE SERVICE_UNREACHABLE PROBE_TIMEOUT AUTH_FAILED PROBE_TRANSPORT_FAILED`) and its sanitize rule (anything unrecognized -> `PROBE_TRANSPORT_FAILED`; UNKNOWN reasons are drawn only from the closed list).

**D1 — Jev classification (shadow while calibrating, live-advisory after):**
Closed label set: TRANSPORT / APPLICATION / DATABASE / AUTH / TEST / ENVIRONMENT / UNKNOWN. Output: label + confidence. Mapping to action is a DETERMINISTIC policy table (Jev never picks the action):
- TRANSPORT (any confidence) -> retry per probe posture; prohibit restart/remediation; alert = "transport, monitoring".
- APPLICATION -> runbook lookup by signature id; if runbook exists, attach it; else ATTENTION_QUEUE.
- DATABASE -> ATTENTION_QUEUE (data-adjacent, never auto-remediate).
- AUTH -> ATTENTION_OWNER (credential/security boundary).
- TEST -> route to test-failure triage (surface 3).
- ENVIRONMENT -> retry on alternate path; if host-reboot evidence (Kernel-Power 41, docker absent), -> ATTENTION_OWNER (recovery decision is Nolan's).
- UNKNOWN or confidence < 0.60 -> System 2 (D2), ATTENTION_QUEUE meanwhile, no remediation.

**D2:** only UNKNOWN / confidence < 0.60 / first-time signature / uncertain external effect.

### Worked eval example: this morning's commute incident
Source: `~/memory/2026-09-28.md:1942-1981` (ops-watch-gateway, 16:04-16:05 MDT, 2026-09-28).

- **Deterministic features (D0):** exit 1 (WARN); stderr `nc: proxy read: Broken pipe / Connection closed by UNKNOWN port 65535`; `SENTINEL=ORACLE_OK` absent (script never executed on Oracle); signature match -> `PROXY_FAILED`; time 16:04-16:05 MDT adjacent to the ~16:30-17:00 commute window. `gateway_classify` -> GW_STATUS=UNKNOWN, GW_CLASS=PROXY_FAILED; consecutive-failure counter held at 0; no container claim.
- **Jev (shadow):** label TRANSPORT_FAILURE, confidence 0.96; would-be action per policy: no remediation.
- **Policy rule converting classification to action:** PING policy (Nolan 2026-09-27): TRANSPORT_UNKNOWN prohibits restart. Therefore NO RESTART; retry per standing probe posture (bounded retries, alternate paths); next scheduled interval resumes collection. The observed behavior matched exactly: no restarts, no host changes, WARN surfaced per watch contract.
- **Ground truth:** transport wedge at the hatch-egress-proxy CONNECT tunnel; gateway and Pig unproven either way; later recovered. Classification verdict: CORRECT.

### Three more eval examples with ground truth (mined from memory)

**E2. 2026-09-27 11:11-12:47 MDT wedge — transport misclassified as host sleep.**
Source: `~/memory/2026-09-27.md:1963-2039,2298,2501,2579`.
- Observed: pig-health reported HOST_ASLEEP at 11:11 MDT; the wired-NIC-flap hypothesis was proposed (Nolan ordered the adapter disabled). Ground truth (lane 1 forensics): Windows Modern Standby S0 idle entries (Kernel-Power 506/507), ~30 min standby-to-onset lag, both wedges; NIC-flap hypothesis FALSIFIED (zero I219-LM events after disable); the 11:16 MDT signature was the same egress-proxy CONNECT broken pipe.
- Eval: Jev D1 given the deterministic features (broken-pipe stderr + absent sentinel) should output TRANSPORT p>=0.90. The HOST_ASLEEP label requires host-side event evidence (506/507), which was absent at classification time; default-on-probe-failure must be TRANSPORT_UNKNOWN. Lesson: **a probe failure is evidence about the probe path, not about the remote host.**

**E3. 2026-09-28 05:52 MDT tripwire — null readings misclassified as identity mismatch.**
Source: `~/memory/2026-09-28.md:977-978,1191,1245,1407`.
- Observed: tripwire.sh exited 2 with JOURNAL_GATEWAY_IDENTITY_MISMATCH; all readings were null because `docker` was not found in the Pig WSL session (05:24 Kernel-Power 41 reboot, Docker Desktop never autostarted). Ground truth: no identity evidence was ever collected; the correct classification was OBSERVATION_FAILED. Nolan approved the architecture fix: tripwire validates the complete observation envelope FIRST; empty/malformed/null readings emit OBSERVATION_FAILED and exit 3; `JOURNAL_GATEWAY_IDENTITY_MISMATCH` is evaluated only after readings validate.
- Eval: deterministic-first rule (see "most important rule" below). Jev D1 over this input should output UNKNOWN with low confidence, forcing ATTENTION_QUEUE + D2 rather than a fabricated verdict. Classification of an absent signal is worse than abstention.

**E4. 2026-09-28 06:06 MDT watchdog — restart of a healthy server.**
Source: `~/memory/2026-09-28.md:1159` ("Determine why the 06:06 watchdog restarted a server that was still HTTP 200 locally").
- Observed: transport-side readings (tailnet unreachable) triggered a restart of a process that was locally healthy (HTTP 200 on localhost). Ground truth: restart was unnecessary and wrong; the failure was at the transport boundary, the service boundary was healthy.
- Eval: remediation must be gated on the failure's layer: a restart is authorized ONLY when the failure is observed at the process/local-service layer (D0: sentinel present + local probe failed). Transport-layer readings can never authorize a process restart. Jev D1 label ENVIRONMENT/TRANSPORT with p>=0.85 should map to "no restart" via the policy table; any D2 review must confirm the layer before authorizing action.

---

## 3. TEST FAILURE TRIAGE

### Pipeline
**D0 — deterministic parser:** parse jest/junit output into (suite, file, test name, stack head, counts). Emit the failure set F.

**D0b — deterministic pre-existing check (the money gate):** replay the failing tests on the pristine base (git stash / clean worktree). If the failure set is byte-identical with and without the candidate changes -> PRE_EXISTING; classify deterministically; file/ignore per standing rule; NO Jev, NO System 2. This single gate disposed of every recent real case below.

**D1 — Jev (only for novel, non-pre-existing failures):** closed labels REGRESSION / FIXTURE / ENVIRONMENT / FLAKY / DEPENDENCY / UNKNOWN + confidence. Policy mapping:
- REGRESSION (conf>=0.7) -> ATTENTION_QUEUE with the diff attached; block the lane's green claim (the completion gate, surface 4, consumes this).
- FIXTURE / ENVIRONMENT / DEPENDENCY -> ATTENTION_QUEUE, suggest the fixture/dependency owner, never block unrelated lanes.
- FLAKY -> quarantine list (rerun 3x; pass-rate recorded; no verdict change).
- UNKNOWN or conf<0.60 -> D2. Security-adjacent suites (secret-*, redteam, tenant) are UNKNOWN-first: route to D2 even at moderate confidence.

**D2:** only UNKNOWN / high-risk / security-adjacent.

### Eval examples (all with ground truth from memory)

1. **mission_scheduler.retry_watchdog.test.js 7/7 failures** (`~/memory/2026-09-26.md:1975,2090`): fails identically before and after the WorkerRuntime fail-closed repair because the fixture lacks the now-required tenant ID; proven byte-equivalent before/after; filed as a separate P2 in BACKLOG_PING.md; patch verdict unaffected. -> D0b deterministic: FIXTURE, PRE_EXISTING. No Jev needed. Ground truth: CORRECT (falsified independently, merge proceeded).
2. **generator.test.ts Gallery expectation** (`~/memory/2026-09-28.md:643,984`): byte-identical failure on pristine base `4a8c5f2e`; does not import the harvest files; clean-worktree comparison base 106/107 vs harvest 107/108 with identical one-test failure set. -> D0b deterministic: PRE_EXISTING FIXTURE. Ground truth: CORRECT (verdict ADDITIVE-GREEN).
3. **assignment-store-kv + media-authority-route** (`~/memory/2026-09-28.md:1036`): canonical gate on the remote default: base 124 suites/1289 tests, candidate 125/1290, identical two suites/four tests failing. -> D0b deterministic: PRE_EXISTING, zero new regressions. Ground truth: CORRECT.
4. **2488 passing / 23 failures across 12 suites** (`~/memory/2026-09-28.md:1053`): failure set byte-identical with and without the lane changes. -> D0b deterministic: PRE_EXISTING/ENVIRONMENT, zero new regressions. Ground truth: CORRECT.
5. **secret-broker.redteam.test.ts TS errors, unbaselined** (`~/memory/2026-09-28.md:1053`): no pristine-base comparison recorded; security-adjacent. -> UNKNOWN-first: D2. Ground truth: pending (correct routing; do not let D0b or D1 launder it).

**Note on the task's named case:** "11 failing vs 45 passing with fixture discrepancy" was searched verbatim across `~/memory/2026-09-2*.md` and all lane reports and was NOT found. The nearest neighbor is in lane09's report (`lanes/lane09-phase0-inventory/report.md`, from TESTING.md 2026-09-27): **207 suites, 196 passed, 11 failed; 2230 tests passed, 22 failed** — 11 failed *suites*, each with a documented known cause (binding-verifier refusals on ping-fyd dogfood suites, proceduralize generator gallery emission, object by-id/circle-projection/view media drift, claim attack-verifier-holes H5 expecting DIRECT_EVIDENCE, assignment-store KV CAS expectedRevision, media-authority-route suite failing to run on a nonexistent mock). That is a suite-level KNOWN-failure disposition, not the named 11-vs-45 case. The five cases above are the documented equivalents with independently established ground truth and carry the same structure (failure-set identity against base decides pre-existing). If the 11/45 case exists under different wording, it should be added to this eval set with its base-comparison evidence.

### Why D0b first is the whole game
Every recent "failure" that mattered was decided by byte-identity against the pristine base, not by reading stack traces. A System-2 reading of a stack trace for a pre-existing fixture failure is pure waste. The deterministic gate consumes the common case; Jev's fuzzy judgment is reserved for genuinely novel failures, which are the minority.

---

## 4. AGENT COMPLETION VERIFICATION

"Done" from prose is not success. The design answers a narrower question: **does the evidence package look complete?** Success ("was it successful?") stays with the verifier and the deterministic gates.

**D0 gates (all must pass; each is machine-checkable):**
1. REQUIRED EVIDENCE: every evidence ref in the claim resolves to an existing artifact (file exists, digest matches if pinned).
2. TEST RECEIPTS: the claimed test run has a receipt (runner output file, exit code recorded, command line recorded). A claimed pass with no receipt is a missing receipt, not a pass.
3. DIFF: the touched-file set is bounded by the task scope (no stray files swept in; cf. the laneB3 finding on unexpected commits).
4. EXPECTED ARTIFACTS: the task's declared artifact list is fully present (files, commits, event ids).

If any D0 gate fails, the package is INCOMPLETE deterministically; Jev is not consulted (asking Jev whether a missing file exists is waste).

**D0b — the noul evidence ladder** (from the J6 completion corpus design): per claim, four independently verifiable rungs: artifact_exists / reachable / executed / criterion_met (each yes/no/partial/unknown). Deterministic where checkable; "unknown" rungs are passed to D1 as features, not decided by it.

**D1 — Jev bounded completeness judgment:** inputs = D0 gate results + the noul ladder + the claim text. Output (closed choice, the J6 vocabulary): ACCEPT_PROOF / VERIFY_MORE / REJECT_PROOF + confidence. Jev answers only "does the evidence package look complete?". It may not upgrade a D0 failure, and its ACCEPT is advisory: **deterministic gates still control acceptance** (the verifier replays; Nolan's lane-self-report rule stands: reports are hypotheses until replayed from a clean checkout).

**D2:** only on VERIFY_MORE/REJECT_PROOF with high stakes (canonical truth, security, external effect) where a human or System-2 must adjudicate the gap.

### Eval grounding (completion corpus, `~/workspace/jev-eval/completion-corpus/`, 16 labeled items)
- rs-00 REJECT_PROOF: restart-survival worker reported all six items FIXED+PROVEN; evidence did not support it (the false completion report). D0 gate 2 (test receipts) would have failed deterministically.
- rs-03 VERIFY_MORE: watchdog task exists (artifact_exists=yes) but execution logs absent (executed=unknown). Exactly the D1-shaped judgment: package incomplete at one rung.
- wr-01 / ask-01 / fp-01 ACCEPT_PROOF: fail-closed repair, ask-lane recovery, citation-gate tamper test — all with replayed evidence and receipts.
The corpus's closed vocabulary (ACCEPT_PROOF / VERIFY_MORE / REJECT_PROOF) is the D1 output contract; its 16 items are the calibration seed. The corpus README's own caveat applies: the backlog dataset has zero UNKNOWN examples, so Jev's abstain path is uncalibrated and must be stress-tested before it is trusted.

---

## 5. EXISTING PING CODE TO REUSE (no new authority, no new DB)

| Existing code | What it already does | Triage reuse |
|---|---|---|
| `~/workspace/ops-watches/gateway-classify.sh` | Deterministic typed classifier: closed 10-reason vocabulary, sentinel authority rule, sanitize whitelist, HEALTHY/UNHEALTHY/UNKNOWN outputs | **The template for failure-triage D0.** Copy the sentinel pattern (proof-of-observation before any remote claim) and the closed-vocabulary discipline into every new classifier. |
| `~/workspace/ops-watches/check-gateway-health.sh` + `check-gateway-health-degrades.sh` | Watch contract: WARN on UNKNOWN, consecutive-failure counter held at 0 on unproven readings, typed status emission | MC attention emission + failure-triage status plumbing; the "hold the counter on UNKNOWN" rule is the anti-flap policy. |
| `~/workspace/swarm/hidden_files/obs-trip/tripwire.sh` | Envelope validation before classification: OBSERVATION_FAILED exit 3 on null/unparseable readings; identity classification only after readings validate | **The deterministic-first rule, in code.** Reuse the validate-then-classify ordering verbatim. |
| `~/workspace/outreach/engagement-guard.py` | Deterministic guard: terminal-aware intent ledger, within-pass dedup on unique descriptors, ALREADY_ENGAGED merge on every load | MC attention ledger: never re-alert a terminally-disposed item; merge ledger state on every pass. |
| `~/workspace/jev-stage/typed_decision.js` + `shadow_worker.js` | DecisionRequest -> TypedDecisionProvider -> TypedDecision -> EvaluationRecord; JEV_DECISION_EVALUATED canonical event; Jev ZERO execution authority, shadow-only | The exact harness every triage D1 judgment rides on. New triage domains register as new decision vocabularies (like CLAIM_DECISIONS), not new authorities. |
| `~/workspace/jev-eval/backlog-dataset/` (53 labeled items) | Closed-choice calibration for backlog classification | Eval harness pattern for the failure-triage D1 experiment (labels + verified_by + source_ref per item). |
| `~/workspace/jev-eval/completion-corpus/` (16 labeled items) | ACCEPT_PROOF/VERIFY_MORE/REJECT_PROOF with noul ladder | Eval harness for completion-verification D1; calibration seed for the completeness judgment. |
| Pig MC APIs `/api/mc/{today,agents,approvals,dispatch,graph,missions,object,search,technology,trace-forward}` + `_lib/mc-dispatch.ts` FIXED_CONSTRAINTS | Deterministic dispatch constraints: slice/agent/capability allowlists, deadlines, broker quota, reconcile gating | The inviolable D0 layer of bounded scheduling; Jev only tie-breaks the feasible set. |
| Lane B3 reached-path trace (route.ts intent->receipt) | Proven boundary map of the dispatch path; EVIDENCE->EXECUTOR edge ABSENT | Failure-triage should map each signature to the reached-path boundary where the failure was observed (layer attribution for E4-style cases). |
| `~/memory/2026-09-2*.md` incident records | Dated, sourced incident narratives with ground-truth outcomes (forensics, corrections, Nolan rulings) | The eval corpus: commute incident + E2/E3/E4 above are items 1-4 of the failure-triage dataset; the test cases of section 3 are items 1-5 of the test-triage dataset. |

**Deliberately not created:** no new event type (reuse JEV_DECISION_EVALUATED), no new decision database, no new authority, no parallel ledger (reuse the intent-ledger pattern, scoped per domain). Per the standing continuity rule: audit before creating.

---

## D0/D1/D2 summary table

| Surface | D0 (deterministic) | D1 (Jev, bounded) | D2 (System 2) |
|---|---|---|---|
| MC triage | counters, signature lookup, attention ledger dedup, routing policy | ATTENTION_OWNER / QUEUE / BACKGROUND + confidence | only conf<0.60 + uncertain external effect / first signature |
| MC scheduling | constraint elimination, deadline/priority/FIFO order | tie-break only within the feasible set | never |
| Failure triage | feature extraction, signature ledger, sentinel rule, closed vocabulary | TRANSPORT/APPLICATION/DATABASE/AUTH/TEST/ENVIRONMENT/UNKNOWN + conf | only UNKNOWN / conf<0.60 / first signature / high risk |
| Test triage | parser, pristine-base byte-identity gate | REGRESSION/FIXTURE/ENVIRONMENT/FLAKY/DEPENDENCY/UNKNOWN + conf | only UNKNOWN / security-adjacent / high risk |
| Completion | evidence/test-receipt/diff/artifact gates, noul ladder | ACCEPT_PROOF / VERIFY_MORE / REJECT_PROOF (completeness only) | only high-stakes VERIFY_MORE/REJECT_PROOF |

**Calibration note:** Jev starts shadow-only on all four surfaces. Promotion criterion: on a labeled eval set (seeded from the incidents above + the two jev-eval corpora), D1 must beat the D0-only baseline on routing accuracy with zero safety regressions (no remediation authorized from a transport reading, no pre-existing failure re-litigated, no incomplete package accepted). The D0-only system is already the fallback: Jev abstaining or erroring degrades to D0 order/routing, never to silence.
