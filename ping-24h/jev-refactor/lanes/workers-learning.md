# LANES F+I: Worker Inventory + Learning/Outcome Records

**Date:** 2026-09-28 ~18:30 MDT. **Mode:** read-only (report is the only write).
**Status:** hypothesis until replayed from a clean checkout, where noted per claim.
**Trees read:** this VM workspace (462 top-level entries), Pig `/home/nolan/workspace/orca-adapter` (via read-only SSH), reference copies of `ping-runtime/workers/` in this workspace. The canonical `/home/nolan/projects/ping` tree is unreachable from this VM; claims about it rest on the local mirror copies plus lane 9/14/B5 read-only Pig reads cited inline.

No em dashes are used in this report, per standing rule.

---

## PART F: WORKER INVENTORY

### 0. Envelopes first (the search-first requirement)

Seven envelope/contract implementations were found. The forest converges on ONE
canonical work-order/result-envelope contract with several documented copies:

| # | Envelope | Where | State |
|---|---|---|---|
| E1 | WorkOrder (14 required + causation_id optional, closed) + ResultEnvelope (8 fields, closed) via `authorizeWorkOrder`, `issueWorkOrder`, `verifyResultEnvelope`, `recordVerifiedResult` | `/home/nolan/workspace/orca-adapter/vendor/external_agent_adapter.js` (428 lines; AGENT_PROFILES at :60-180, authorize at :185) | LIVE (Pig, branch security/secret-redaction-2026-09-28 @ 9652896) |
| E2 | Same contract, human-readable authority | `/home/nolan/workspace/multi-runtime-workorder-contract.md` (v1.0.0-draft, 2026-09-18); local mirror `~/workspace/multi-runtime-workorder-contract.md` | LIVE doc |
| E3 | Reference implementation copy | `~/workspace/orca-workstream-d/external_agent_adapter.js` + `AGENT_PROFILES.md` + `validate_dispatcher_profiles.js` | reference copy |
| E4 | WorkOrder/Attempt/ResultEnvelope execution contract (harvested strongest parts, incl. state machines and falsifications F1/F4/F5) | `~/workspace/convergence/workorder-attempt-result-contract-2026-09-18.md` | harvest doc |
| E5 | Outcome vocabulary: OUTCOME {completed, failed, unknown, denied, escalated} x EFFECT_STATE {effect_unknown, effect_hold, effect_none}; `unknownOutcome`, `terminalOutcome`, `effectHold` | `/home/nolan/workspace/orca-adapter/outcomes.js` (126 lines) | LIVE code |
| E6 | WorkOrder unit lifecycle PLANNED > AUTHORIZED > QUEUED > RUNNING > EVIDENCE_PENDING > VERIFIED > CLOSED (+ BLOCKED/FAILED/VERIFICATION_FAILED side exits) | harvested from `orca/control-loop/orca_status_model.js` (via E4) | documented, adopted-as-spec |
| E7 | Minimal unified WorkOrder spec (19 fields incl. executor_binding nonce, executor_selection, authority_posture, input_digest, action_fingerprint, reconciliation) | `~/workspace/ping-24h/lanes/lane14-worker-contract/report.md` section 3 | PROPOSED, not implemented |

Nothing else named ResultEnvelope/WorkOrder was found: the earlier workspace-wide
grep (backgrounded, completed 2026-09-28 ~18:20 MDT) returned 40 files, all
narrative or duplicates of E1-E6. There is no second competing envelope
implementation. WRAP (not rewrite) has a single contract to wrap.

The canonical result contract (E1/E2, proven live 2026-09-16/17, 2026-09-26):

- **WorkOrder:** work_order_id = sha256('workorder:'+taskId)[0:16]; agent_id;
  mission_id; task_id (executionId:attempt-N); correlation_id; context_pack_id;
  attempt; principal = constant 'ping:external-agent-adapter'; namespace matching
  ^(core|tenant)::[a-z0-9_.-]+$; capability; input (object, inline only);
  constraints (must tighten profile maxConstraints; hard no_canonical_events=true,
  no_mission_state_writes=true); result_path (PING-owned, worker never writes);
  deadline (absolute ISO); optional causation_id. Closed envelope
  (additionalProperties: false).
- **ResultEnvelope:** work_order_id, context_pack_id, agent_id, capability
  (exact echoes), status in {completed, failed}, output, evidence (open object),
  error. verifyResultEnvelope enforces three-way agent binding
  (authorized == invoked == result agent), status/output/error consistency,
  evidence-is-object, verifiedAt ISO and <= deadline. Invalid is non-retryable
  and can never reach canonical event authority. result_id = sha256 of identity
  binding (note: identity fields only, NOT output content; lane B5 D6).
- **Failure reporting:** invoker enforces timeout; no result by deadline means
  invoker reports failed/null-output/non-empty-error, never fabricated success.
  Retries live ONLY in orchestration; workers never self-retry, never select
  workers, never decide promotion.

---

### 1. Canonical pipeline workers (deterministic JS, in the PING tree)

Defined in `ping-runtime/workers/canonical_workers.js` (760 lines; local
mirrors: `~/workspace/convergence-zoom-2026-09-19/lane-d-execution/pig-src/`,
`~/workspace/fyd-lane/harvest-wave1/code-evidence/`,
`~/workspace/constitutional-sprint/fleet/observability/obs1-scratch/`).
"6 canonical JS workers extracted from 38 implementations across 7
generations" plus IntelligenceWorker. All extend BaseWorker: handle(event),
process, emit downstream via UnifiedEventRuntime.emit (never directly),
return a result. BaseWorker._emit preserves namespace, correlation_id,
causation_id (set to triggering event_id), and confidence semantics
(explicit null distinguished from missing via hasOwnProperty; inherited
confidence tagged confidence_source='inherited'). A worker without
eventRuntime throws; every downstream emission goes through emit.

| # | Name | File:line (mirror) | Handles eventTypes | Emits | Output shape |
|---|---|---|---|---|---|
| W1 | observation | canonical_workers.js:90 | BUSINESS_EVENTS (~20: DOCUMENT_IMPORT, OBSERVATION_CREATE, LEAD_CREATED, EMAIL_RECEIVED, ...), KNOWLEDGE_EXTRACT, SYSTEM_HEALTH_CHECK | OBSERVATION_CREATED | {status:'ok', observation} (structured) |
| W2 | claim | canonical_workers.js:142 | OBSERVATION_CREATED, CLAIM_GENERATE | CLAIM_CREATED | {status:'ok', claim} |
| W3 | classification | canonical_workers.js:809 | CLAIM_CREATED, CLASSIFICATION_CREATE | CLASSIFICATION_CREATED | {status:'ok', classification} |
| W4 | recommendation | canonical_workers.js:874 | CLASSIFICATION_CREATED, RECOMMENDATION_CREATE | RECOMMENDATION_CREATED | {status:'ok', recommendation} |
| W5 | projection | canonical_workers.js:177 | KNOWLEDGE_INDEX, PROJECTION_CREATE, RECOMMENDATION_CREATED, LINEAGE_CREATED | PROJECTION_CREATED | {status:'ok', projection} |
| W6 | replay | canonical_workers.js:240 | REPLAY_VERIFY, PROJECTION_CREATED | REPLAY_COMPLETED | {status:'ok', replay result} |
| W7 | witness | canonical_workers.js:524 | REPLAY_COMPLETED | WITNESS_CREATED | {status:'ok', witness} |
| W8 | lineage | canonical_workers.js:773 | LINEAGE_CREATE, WITNESS_CREATED | LINEAGE_CREATED | {status:'ok', lineage} |
| W9 | intelligence | canonical_workers.js:988 | [] (registered, structurally DORMANT; "for AI-enhanced classification") | none live | n/a |
| W10 | jev-shadow | `~/workspace/jev-stage/shadow_worker.js:28` | CLAIM_CREATED | JEV_DECISION_EVALUATED only (bridge leaves it terminal; zero execution authority) | {status:'skipped'|'ok', evaluations[]} |

Dispatch: `WorkerRuntime` (`ping-runtime/workers/worker_runtime.js`, 169
lines; OPERATING_SPEC WORKER EXECUTION AUTHORITY, PROVEN): dispatch matches
registered workers by eventTypes; empty eventTypes = dormant, never catch-all.
`MissionScheduler` (`ping-runtime/orchestration/mission_scheduler.js`)
claims missions with a 60s atomic lease, dispatches with a hung-worker watchdog
(late settlement harmless: conditional transitions match 0 rows), and
MISSION_WORKER_MAP is labeling/assignment metadata only, NOT the routing
decider (W-1A guard fails missions whose assigned worker is not registered for
the dispatched event_type, without dispatch).

- **Cost:** no model, in-process JS, sub-second latency class. Resource: Node in
  the gateway container.
- **Side-effect class:** canonical event emission only, always through
  this._eventRuntime.emit (worker never touches storage/credentials).
- **Evidence produced:** canonical events (OBSERVATION_CREATED ... LINEAGE_CREATE,
  JEV_DECISION_EVALUATED) persisted in ping_events; results flow back through the
  journal.
- **Availability:** LIVE in the gateway wiring (OPERATING_SPEC: PROVEN at
  gateway_runtime.js; W9 intelligence DORMANT by empty eventTypes).
- **Restart semantics:** stateless; re-registered on gateway boot; missions have
  60s lease + reaper (reclaimRetryPending); UNKNOWN external effect goes to
  HOLD + reconciliation, never auto-redispatch.

**Structured.** Every canonical worker returns a structured {status, payload}
result and emits typed events with preserved lineage metadata.

### 2. ORCA exterior workers (WorkOrder contract families, orca-adapter AGENT_PROFILES)

The six registered agent profiles (data, not code) at
`/home/nolan/workspace/orca-adapter/vendor/external_agent_adapter.js:60-180`,
read 2026-09-28 ~18:25 MDT. authorizeWorkOrder is GRANT/DENY with 8 ordered
fail-closed checks; identity_5..10 are DENIED by standing containment.

| # | agent_id | Family | Transport | allowedCapabilities | Latency class | Cost | Availability |
|---|---|---|---|---|---|---|---|
| W11 | hermes | hermes | oneshot subprocess: `venv/Scripts/python.exe hermes_cli/main.py --safe-mode -z <prompt>` via `~/workspace/bin/prompt-hermes.sh`; bridge at `C:\Users\nolan\hermes-bridge\` | fixture.read, text.transform, text.summarize | ~11s typical | free (openrouter) | LIVE (proven live 2026-09-16/17, reconciled 2026-09-26) |
| W12 | cloud-subagent | cloud-subagent | dispatcher-spawn; WorkOrder input embedded inline in dispatch prompt; no cross-environment paths | orchestration.plan, orchestration.review, text.transform, text.summarize, documentation.generate, dead_code.analyze, test.generate | task-dependent | cloud session cost | LIVE (PRIMARY fleet) |
| W13 | ollama | ollama | `~/workspace/bin/prompt-ollama.sh <prompt>`; default qwen2.5-coder:1.5b | text.transform, text.summarize, documentation.generate, dead_code.analyze, test.generate | ~3s | free (local) | LIVE (proven live) |
| W14-17 | identity_1..4 | copilot | broker-dispatch on Pig WSL `~/copilot-broker`; broker resolves credentials at the process boundary, never in the WorkOrder | test.generate, documentation.generate, dead_code.analyze | task-dependent | Copilot quota (gated EXTERNAL to envelope; dispatcher fails closed on unknown/stale quota) | LIVE (4 pre-authorized identities; 5-10 DENIED) |
| W18 | codex | codex | `codex exec --ignore-user-config -s read-only --ephemeral --skip-git-repo-check -C <dir> <prompt>` | fixture.read, text.transform, text.summarize | n/a | n/a | DORMANT (owner HOLD 2026-09-28 ~15:35; ACTION=HOLD; zero build work) |
| W19 | opencode | opencode | null (no headless CLI; OpenCode.exe desktop only) | [] | n/a | n/a | DORMANT (no safe invocation path) |

Synthetic (lane B5 only, not registered, A3/A4 DENY as unknown agents):
W20 deterministic-js (pure JS function of the WorkOrder; adversarial lie modes);
W21 muse-as-worker (opaque reasoning turn, zero side effects).

**Per-worker contract notes (all observed 2026-09-28):**

- **Input schema:** the full 14-field WorkOrder (E1). Herme/Ollama/copilot
  receive it as an inline prompt string (Windows-native Hermes cannot see
  WSL/cloud paths; verified 2026-09-16/17). Cloud subagents receive it embedded
  in the dispatch prompt. No family may treat result_path as writable.
- **Output schema:** exactly the 8-field result envelope on stdout (Hermes,
  Ollama) or in the final report (cloud-subagent) or broker response wrapped by
  the dispatcher (copilot). Recommended evidence keys per family: startedAt,
  endedAt, host, capabilityPerformed (+ promptLength/responseLength for Hermes;
  model/promptTokens/completionTokens for Ollama; identityUsed for copilot).
  No credentials/secrets anywhere in the envelope, enforced by contract.
- **Cost:** Hermes free, Ollama free, copilot quota-gated outside the envelope,
  cloud-subagent task-dependent.
- **Resource requirements:** Pig SSH (Hermes bridge, ollama container on Pig
  100.79.154.43:11434), dispatcher cloud session (cloud-subagent),
  ~/copilot-broker on Pig WSL (copilot).
- **Side-effect class:** read_only / no_writes / no_network / no_canonical_events
  / no_mission_state_writes (maxConstraints; caller constraints may only
  tighten). Outward-facing capabilities (email.send, sms.send) route through the
  approval gate per dispatcher policy.
- **Evidence produced:** agent-reported envelope evidence (claim, not truth;
  effect_unknown default on verified completions; O5).
- **Restart semantics:** oneshot; attempt recorded BEFORE dispatch (crash window
  closed by construction); reconcile gate (idempotency key + prior-outcome
  lookup + artifact-exists refusal + reconciliation record) before any new
  attempt on uncertain priors; validation failure non-retryable.

**Structured-with-narrative-core.** The envelope is structured and
byte-verified, but the `output` field is free text whose CONTENT is unbound
(lane B5 D8: objective-rewrite verifies valid) and `evidence` carries zero
semantic checks (lane B5 D7: fabricated timestamps verify valid). The worker
turn itself is narrative; only the binding is structural.

### 3. Pig browser engagement workers (deterministic JS via CDP)

From the 2026-09-13 worker inventory (verified then, standing since):

| # | Worker | Where | Input | Output | Availability |
|---|---|---|---|---|---|
| W22 | fb-engage | `~/workspace/pig-fb/engage.js` + `run_pass.sh` | job JSON: actions [{type like\|comment, url, text}], min/maxDelaySec | `<job>.result.json`: {ok, logged_in, results:[{type,url,ok,note}]}; exit codes 0-6 typed | LIVE (75 likes + 20 comments/pass, 2h cadence, per-action verification) |
| W23 | platform engagement drivers (threads/IG/X/TikTok wrappers: x-follow-run.ps1 family, engage variants) | `~/workspace/pig-fb/` | per-platform job files | pass logs + result JSON | LIVE (per-platform caps; C:/Windows/Temp volatility noted 2026-09-26) |
| W24 | chrome-cdp-watchdog | `C:/Users/nolan/.local/share/pigi/chrome-cdp-watchdog.ps1` via scheduled task PigiFBLogin + `~/workspace/pig-fb/ensure-cdp.sh` pre-flight | none | watchdog log; exit 0/1 | LIVE (5-min self-heal loop) |
| W25 | meta-ai research worker | `~/workspace/pig-fb/meta-ask.js` + `meta-pass.sh` + `~/workspace/tandem/build-context-pack.py` + 4 rotating prompts | brief slug (a/b/c/d) | raw answer .md + .provenance.json sidecar (status=unverified; PING ingestion only after independent verification) | LIVE (6h cadence) |

**Structured (job JSON in, result JSON out)** for W22/W23; **narrative**
(raw answer text) for W25 with a structured provenance sidecar.
Restart semantics: no mid-pass retry; infra failure exits 2, next pass retries;
checkpoint/action-block halves next-pass caps (W22).

### 4. Skill/tool workers (reads and sends as the user)

| # | Worker | Where | Input | Output | Availability |
|---|---|---|---|---|---|
| W26 | facebook-cli | `/opt/hatch/skills/facebook-cli/SKILL.md` | subcommands (me, feed, groups posts, ...) | JSON, paginated | LIVE (read-mostly; no like/comment/DM writes) |
| W27 | gmail worker | `hatch_gws_cli gmail` | +send/+reply/etc. | JSON; Gmail acceptance flips pipeline status | LIVE (10/UTC-day cap) |
| W28 | messenger worker | `hatch_messenger_cli` | send --cid/--to --text-stdin | send confirmations | LIVE (hard constraint: contacts only; max 10 DMs/day) |
| W29 | instagram-cli | skill | profile/posts reads | JSON | LIVE (reads only; engagement is browser-only) |
| W30 | social.search | tool | semantic_queries, platform, location, since/until | ranked post summaries | LIVE |
| W31 | outreach engine | cron-spawned LLM agent, `ping-social-outreach-engine` | pitch/leads/pipeline/learnings files | drafts, JSONL updates, sweep summaries | LIVE (3h cadence, 8-step sweep) |
| W32 | PING event emitter | `~/workspace/tandem/emit-observation.py` | brief_id, observation_text | gateway event_id | LIVE |

**Structured.** All return JSON or typed confirmations.

### 5. Deterministic decision workers (rule providers, Jev program)

| # | Worker | Where | Input | Output | Availability |
|---|---|---|---|---|---|
| W33 | RuleClaimDecisionProvider (rule-claim-v0) | `~/workspace/jev-stage/typed_decision.js` | DecisionRequest {domain, subjectRef, evidenceRefs[], context{}, correlationId, causationId} | TypedDecision ACCEPT_CLAIM / REJECT_CLAIM / NEEDS_MORE_EVIDENCE (deterministic) | LIVE (test_jev_shadow.js) |
| W34 | MayExecutePolicy (P12) | `~/workspace/jev-stage/typed_decision.js` | decision | shadow-only execution verdict | LIVE |
| W35 | Jev live model | `https://api.typesafe.ai/v1/systemone`, model jev-1.13 / jev-latest | DecisionRequest-derived state + typed questions (noul/choice/score) | {type, probabilities, confidence} + usage tokens | LIVE (shadow mode; 6/6 agreement at 0.5 vs authorizeWorkOrder, Brier 0.0076; calibration NOT established) |

**Structured.** TypedDecision contract; provider failures recorded as errors,
never converted into fabricated decisions.

### 6. Transports and hosting (not workers, but workers ride them)

- `~/workspace/bin/pig` + `pigread.py`: universal Pig SSH transport. LIVE.
- Docker on the Pig: ping-gateway, ping-postgres, ping-qdrant, ping-redis,
  ollama, brain-postgres, brain-qdrant, open-webui, qwen3-tts-service,
  crx-ui-next, ping-vault (unhealthy). Liveness = restart policy only; no
  manager script.
- Local AI models on the Pig (ollama container): qwen2.5-coder:14b/7b,
  llama3:latest, nomic-embed-text:latest. **Dormant capacity**: 2026-09-13
  inventory found zero callers in the workspace. (The ollama WORKER W13 rides
  `prompt-ollama.sh` via SSH, not direct HTTP; the 1.5b default model is the
  live path.)
- Git: no script worker ("None as code" per 2026-09-13 inventory); manual SSH
  commands by agents.
- OpenCode/CLIs: dormant (config present, not scheduled; worktrees are residue).

### 7. Coverage of the requested worker families

The task named 17 families. Literal implementations with those names exist
NOWHERE (workspace-wide grep 2026-09-28 ~18:20 MDT: zero hits; Pig
`/home/nolan/projects/ping/src` + `/home/nolan/workspace` grep: zero hits).
Mapping to actual coverage:

| Requested family | Actual coverage (or ABSENT) |
|---|---|
| repo-acquire, repo-index, symbol-extract, dependency-map | ABSENT as dedicated workers. Closest: copilot identities' `dead_code.analyze` / `documentation.generate` capabilities; cloud-subagent `orchestration.plan/review`; lane B5 deterministic-js prototype. |
| git-diff | ABSENT as a script worker (2026-09-13: "None as code"; manual SSH git by agents). |
| test-run | No worker; jest suites run by lanes/agents (e.g. wr-01 evidence: 45/45 local+Pig). |
| browser | W22/W23 (fb-engage + platform drivers); browser-task mechanism (parent-only). |
| web-acquire | `browser.search`/`browser.open` (fetch), `social.search`. Reads only, no worker wrapper. |
| structured-data | `~/workspace/outreach/prospect-digest.py`, the JSONL pipeline (atomic build/validate/replace), `build-context-pack.py`. Deterministic scripts, no envelope. |
| database-read | Pool queries via gateway; EventReadAuthority (read-only); no envelope. |
| log-analysis | Ad-hoc (agents read logs); no dedicated worker. |
| search | W30 social.search; `browser.search`; HybridSearch (semantic Qdrant + EvidenceAuthority verify + knowledge graph) in the gateway. |
| evidence-extract | `build-context-pack.py` (versioned, content-hashed retrieval); `collectEvidence` on Dispatcher is an uncalled pure in-memory aggregator (lane A falsification). |
| verification | `verifyResultEnvelope` (W11-17 results); EvidenceAuthority.verify (hash + lineage + namespace recompute); falsifier lanes; binding verifier. |
| patch | ABSENT as a worker; lane-driven agent work (authorized compileAskContext patch lane in flight; `wb-*.py` workbench edit scripts are ad-hoc). |
| build | ABSENT as a worker; `start-3100.sh` restart protocol; Next.js builds by lanes. |
| deploy-proof | ABSENT as a worker; `verify-served.py`, /api/health probes, served-bytes certification discipline. |

### 8. Structured vs narrative split (verdict)

- **Structured (state, status, evidence, cost, duration, retryability, failure
  class):** W1-W10 canonical workers (typed events + lineage metadata);
  W11-W19 result envelopes (8 fields, byte-verified, non-retryable invalid);
  E5 outcomes vocabulary (typed terminal states + effect states); W22/W23 job
  result JSONs; W24/W26-W32 JSON CLIs; W33-W35 typed decisions; the intent
  ledger and action-truth records (Part I).
- **Narrative-only core with structural binding:** the worker TURNS of
  W11-W19 (Hermes/cloud-subagent/Muse/ollama/copilot reasoning is free text;
  lane B5 proved `output` content unbound: objective rewrite verifies valid,
  D8); W25 Meta AI answers (raw markdown; structure lives only in the
  provenance sidecar); W31 outreach engine reports; engagement pass logs.
- **No retryability signal from the worker itself:** retryability is decided
  by PING (verifyResultEnvelope invalid => non-retryable; outcomes.js UNKNOWN
  => caller-owned reconcile), never asserted by a worker.

### Availability tally

- **Live: 33** (W1-W8, W10, W11-W17, W22-W35 counting identity_1..4 as four,
  plus transports). Includes the 6/6-agreement shadow Jev (W35).
- **Dormant: 5** (W9 intelligence; W18 codex owner-HOLD; W19 opencode; local
  model catalog with zero callers; opencode CLI config).
- **Broken: 0** confirmed as workers. (Infra: ping-vault unhealthy; codex's
  expired blockedExternal makes it grantable on stale data, lane B5 D4, which
  is a live-misconfiguration rather than a broken worker.)
- **Mock/synthetic: 3** (W20 deterministic-js, W21 muse-as-worker, lane B5
  batteries; plus jev test fixtures).

---

## PART I: LEARNING / OUTCOME RECORDS

### 1. Eval datasets (Jev shadow experiments)

| # | Dataset | Items | What it records | Labels verified? | Usable for shadow eval? |
|---|---|---|---|---|---|
| L1 | `~/workspace/jev-eval/replay-dataset/items.jsonl` | 51 | Staged historical PING decisions: routing (11: WorkerRuntime dispatch receipts), classification (5: rule-claim-v0 goldens R0-R4), triage (14: H1-H8 HOLD/UNKNOWN register + wave-1), other (21: grill-20 escalation + identity CONTAIN). Fields: question, state_summary, state_digest, typed_answer, probabilities, existing_decision, final_decision, eventual_outcome, outcome_known, verified_by/at, source_ref. | Yes: every disposition traces to a harness verdict, independent audit, falsifier replay, or Nolan decision. | YES, with documented caveats: state packages must be rebuilt from source_ref under privacy-envelope rules; live-model fields (latency/tokens/cost) are null everywhere (decisions were made by rules/harnesses/Nolan, not Jev); routing has no multi-class executor-selection labels (all dispatches went to HEADLESS_AGENT); 4 items have outcome_known:false (kept for abstain calibration). |
| L2 | `~/workspace/jev-eval/backlog-dataset/items.jsonl` | 53 | Backlog classification: gap-01..49 (Lane 9 falsifier verdicts) + FYD-009/010/012/037. Closed choice PROVEN_DEFECT / MISSING_TEST / ALREADY_IMPLEMENTED / DUPLICATE / SUPERSEDED / FUTURE / UNKNOWN. | Yes: third-party falsifier verdicts or coordinator acknowledgment; file:line citations. | YES for the classification family: input (evidence_summary), closed allowed outputs, verified label. Caveats: UNKNOWN has 0 examples (cannot calibrate abstain); MISSING_TEST dominates 41.5%; DUPLICATE n=1, SUPERSEDED n=2; 12 "PROMOTED" items are candidacy judgments, not coordinator-approved. |
| L3 | `~/workspace/jev-eval/completion-corpus/items.jsonl` | 16 | Completion falsification: claim + noul evidence ladder (artifact_exists / reachable / executed / criterion_met: yes/no/partial/unknown) + verdict ACCEPT_PROOF / VERIFY_MORE / REJECT_PROOF. | Yes: independent coordinator replays, falsifier probes, lane evidence. | YES for completion-review: input (claim + evidence_summary), allowed outputs (3), verified label, plus the noul ladder as features. Deliberate VERIFY_MORE examples included (vis-01, broker-01). |
| L4 | `~/workspace/fyd-intel/jev-decisions.jsonl` | 9 | REAL live Jev calls (typesafe/jev-1.13 via TypeSafe): answer {type, choice, probabilities, confidence}, latency_ms (~301ms observed), input/output tokens, cost_usd, state_sha256, request_id. | Yes (live API responses). | PARTIALLY: the only live-model outcome records, but n=9 and the questions are toy-shaped ("Is the state a fruit?"), not PING decision-shaped. Useful for API/contract validation, not for calibration. |
| L5 | Shadow samples in `~/workspace/ping-24h/LEDGER.md` (SHADOW JEV SEAM section) | 6 | 6 real shadow samples of mc.authorize_work_order/v1 vs live jev-latest: S1-S6 with per-sample probabilities (GRANT 0.95, DENY 0.05/0.02/0.02/0.06/0.19), 6/6 agreement at 0.5, Brier 0.0076, latency 334-566ms (mean 422ms). Raw records: `~/workspace/ping-decision-seam/shadow-decisions-2026-09-28.json`. | Yes: run against the live function the same day. | YES as agreement data (n=6): input (same facts), allowed outputs (GRANT/DENY), verified label (live function). Calibration NOT established (n=6); cost UNKNOWN; confidence:null never populated. |

**Combined pool: 51 + 53 + 16 = 120 labeled decisions** (L1 README explicitly
treats all three as one evaluation pool), plus 9 live-model records and 6
shadow agreement samples.

**Shadow-experiment readiness checklist** (input/state/question/allowed
outputs/verified label):

- L1: question yes, state_summary yes (sanitized; rebuild under
  `~/workspace/jev-eval/privacy-envelope.md` data-class rules), allowed
  outputs yes (per family), verified label yes (final_decision + eventual_outcome).
- L2: input (evidence_summary) yes, question implicit (classify the backlog
  item), allowed outputs yes (7 closed), verified label yes
  (verified_disposition).
- L3: input (claim + evidence_summary + noul ladder) yes, allowed outputs yes
  (3), verified label yes (verdict).
- L4: full live record yes, but not decision-shaped for PING families.
- L5: input yes, allowed outputs yes (GRANT/DENY), label yes, but n=6.

### 2. Outcome / correction records (operational)

| # | Record | Size | What it records | Eval-usable? |
|---|---|---|---|---|
| L6 | `~/workspace/ping-24h/LEDGER.md` | 547 lines | 24h program evidence ledger: T+0 reobservation, lane registry, verdict log, SHADOW JEV SEAM (L5). | Verdict log as landed; the shadow section is L5. |
| L7 | `~/workspace/FAILURE_LEDGER.md` | 3077 lines | Typed failure records: id, first/last seen, system/lane, what_failed, evidence, classification (SUCCESS_EMPTY / ENUMERATION_FAILURE / ELIGIBILITY_EMPTY / DEPENDENCY_FAILURE / AUTH_FAILURE / SURFACE_DRIFT / RATE_LIMIT / TEMPORARY_FAILURE / TERMINAL_FAILURE), self_heal, replay commands, status (OPEN/HEALING/HEALED/QUARANTINED/NEEDS_NOLAN). Append-only; never deleted. | PARTIALLY: a rich incident corpus with typed classes and replay info, but not decision-labeled (input/state/allowed-output/label shape absent). Usable for failure-taxonomy mining, not for Jev calibration. |
| L8 | `~/workspace/outreach/learnings.md` | 1330 lines | Per-round outcome records (rounds 1-37+): sends, submits, skips + why, bounces, reply checks, research hits, plus "Running reads". | PARTIALLY: real outcome records with corrections, but narrative and informal labels. |
| L9 | `~/workspace/outreach/angle-performance.md` | 212 lines | Closed-loop learning: signal > angle > channel > response > outcome tally per round; copy-test protocol; running reads. Outcome values: no_response, reply_positive/neutral/negative, meeting, customer. | PARTIALLY: the closest thing to a labeled outcome dataset in the campaign; labels are campaign-level, not worker-decision-level. |
| L10 | `~/workspace/outreach/action-intent-ledger.jsonl` | 12,709 records | Intent > execution > outcome records per engagement action (intent_id, pass_id, platform, action, url, stage ACTION_INTENT_DURABLE / EXECUTION / outcome). Never-re-engage source of truth. | PARTIALLY: execution outcomes (structured), but actions are platform engagements, not Jev decisions. |
| L11 | `~/workspace/outreach/action-truth.jsonl` | 15 records | Pass-level truth: discovered/eligible/selected/attempted/succeeded/verified/failed + classification. | PARTIALLY: aggregate pass outcomes. |
| L12 | ORCA HOLD/UNKNOWN register (H1-H8) | referenced in L1 triage items | Coordinator triage dispositions with evidence, disposition, reason, reopen trigger; eventual outcomes recorded (e.g. H7 UNKNOWN > RESOLVED/CONTAINED). | Ingested into L1; source records live in the register. |
| L13 | `~/workspace/self_improvement/objectives/*` + `staging/memory_reconciliation/` | ongoing | Candidate-lesson mechanisms at the MEMORY level: per-objective CURRENT.md + archives, memory reconciliation runs with pinned/numbered/before/after memory. | NO for Jev: this is agent-memory learning, not PING decision learning. The pipeline (staging > review > pinned) is a candidate-lesson mechanism in form but operates on memory content, not worker outcomes. |

### 3. Candidate-lesson mechanisms: the key finding

**The PING target learning loop is DOCUMENTED ONLY; the Lesson store is
ABSENT.** Lane 15 (memory taxonomy), read 2026-09-28, found:

> Lesson store (mined candidates, confidence counters): ABSENT. The PING
> target learning loop (OUTCOME > candidate lesson > evidence > hypothesis >
> replay/counterfactual > falsification > promotion) is DOCUMENTED as a target
> only (lane 4); no implementation found in the tree.

What exists instead:

- **Outcome records without a lesson miner:** L6-L12 record outcomes and
  corrections, but nothing mines candidate lessons from them, nothing tracks
  lesson confidence, and nothing promotes lessons into policy.
- **Memory-level learning (not PING learning):** L13's self_improvement
  objectives + memory_reconciliation pipeline is the only running
  candidate-lesson-shaped mechanism, but it operates on the agent's memory,
  not on worker outcomes, and never feeds a PING policy.
- **Human-closed loops:** the outreach engine's step 8 ("learnings + content
  queue") and `angle-performance.md` close the loop through the cron agent's
  own judgment each sweep, not through a typed mechanism.
- **Jev as the future learner:** the jev-eval datasets (L1-L3) and the shadow
  program are staged precisely to become the evaluation substrate for a
  learning loop that does not exist yet. Jev is currently a typed shadow
  signal with zero authority (MayExecutePolicy P12: shadow-only).

**Implication for the Jev refactor:** the refactor can WRAP the worker
contract (E1 exists and is proven) and can EVALUATE Jev against L1-L3 (+L5),
but it cannot yet LEARN from outcomes: there is no lesson store, no
confidence counters, no promotion path. Building those is new construction,
not a wrap.

---

## VERDICT LINES (for the parent)

1. **Workers inventoried: 35 named workers + 7 envelope implementations.**
   Availability: **live 33** (8 canonical pipeline + jev-shadow + hermes +
   cloud-subagent + ollama + 4 copilot identities + 4 Pig browser workers +
   7 skill/tool workers + outreach engine + event emitter + rule provider +
   MayExecutePolicy + live Jev model), **dormant 5** (intelligence worker,
   codex owner-HOLD, opencode, local model catalog, opencode CLI),
   **broken 0** (codex stale blockedExternal is a live misconfiguration, not
   a broken worker), **mock/synthetic 3** (lane B5 deterministic-js,
   muse-as-worker, test batteries).
2. **Structured vs narrative: the bindings are structured, the worker turns
   are narrative.** Envelopes, outcome vocabularies, typed decisions, and job
   result JSONs are byte-verified structured state. Worker `output` content
   is provably unbound (lane B5 D8: objective rewrite verifies valid) and
   `evidence` carries zero semantic checks (D7). Retryability and effect
   state are decided by PING, never asserted by workers.
3. **Envelopes found: 7**, converging on ONE canonical WorkOrder/ResultEnvelope
   contract (E1, live on the Pig; E2 the authority doc; E3 reference copy;
   E4 harvested contract; E5 outcome vocabulary; E6 unit lifecycle; E7 the
   proposed unified spec, not implemented). No competing envelope exists.
4. **Eval datasets usable for shadow experiments: L1 (51), L2 (53), L3 (16)
   = 120 labeled decisions** with verified labels and documented caveats
   (null live-model fields; no UNKNOWN examples in L2; routing has no
   multi-class selection labels; 4 L1 items outcome_known:false). Plus L5
   (6 shadow agreement samples, Brier 0.0076) and L4 (9 live Jev records,
   toy-shaped). L6-L12 are outcome records but not decision-labeled; L13 is
   memory learning, not PING learning.
5. **Single biggest worker-contract gap: authority posture is adapter data,
   not a per-order authority decision** (lane 14 R1 / lane B5 D3).
   AGENT_PROFILES.maxConstraints decides what a worker runs under; swapping
   hermes for cloud-subagent changes the executable capability set while
   authorizeWorkOrder stays green. Second: objective fidelity is unfenced
   (B5 D8), a worker silently answering a different objective verifies valid.
   Third: the learning loop the refactor would feed does not exist (lesson
   store ABSENT per lane 15); the refactor can wrap and evaluate, not yet learn.

## Files produced

- This report: [workers-learning.md](sandbox://workspace/ping-24h/jev-refactor/lanes/workers-learning.md)

## Grounding notes

- E1 AGENT_PROFILES + authorize logic: read via Pig SSH 2026-09-28 ~18:25 MDT
  (`/home/nolan/workspace/orca-adapter/vendor/external_agent_adapter.js:60-220`).
- outcomes.js: read via Pig SSH 2026-09-28 ~18:22 MDT (126 lines, verbatim).
- multi-runtime-workorder-contract.md: read via Pig SSH 2026-09-28 ~18:20 MDT
  (73 lines, verbatim).
- canonical_workers.js / worker_runtime.js / mission_scheduler.js: local
  mirrors under `~/workspace/convergence-zoom-2026-09-19/lane-d-execution/pig-src/`
  (read 2026-09-28 ~18:15 MDT); OPERATING_SPEC cross-check for the live wiring.
- Lane 5/9/11/14/B5/15 reports: read from `~/workspace/ping-24h/lanes/`
  2026-09-28 ~18:00-18:30 MDT; their PING-side claims are hypotheses until
  clean-checkout replay (their own standing caveat), reused here as cited
  prior work, not re-derived.
- Datasets: read directly 2026-09-28 ~18:10-18:30 MDT (line counts via wc,
  schemas via python json, READMEs verbatim).
- The 17 requested worker-family names (repo-acquire ... deploy-proof) return
  zero hits workspace-wide and Pig-wide (greps completed 2026-09-28 ~18:20
  MDT); the mapping table in section 7 is the honest coverage statement.
- No browser actions were taken (subagent has no live browser); no code was
  built, modified, committed, or pushed; no secrets were read or logged.
