# LANE H: Mission Control Real vs Mock

Read-only. 2026-09-28 ~18:20 MDT. Audit of the code and its evidence paths, not the served bytes.

## Audit basis

- Canonical tree `/home/nolan/projects/ping` @ `0264d517` (branch `hardening/2026-09-28-vocab-ssrf`), dirty worktree preserved per the freeze record `~/workspace/ping-24h/dirty-mc-freeze-2026-09-28.md`. Read via Pig WSL SSH (grep/sed reads only; no checkout, no writes, no dispatch, no restart).
- Front end: `src/app/mission-control/page.tsx`. Back end: `src/app/api/mc/{today,agents,approvals,dispatch,graph,missions,missions/[id],object,search,technology,trace-forward}` plus `_lib/mc-dispatch.ts`.
- Leans on two prior lane reports, both read in full: laneB7 (MC observability audit, Phase 11, 16 consolidated gaps) and laneA (Orca/MC archaeology, 36-item inventory). Findings below were re-verified against the worktree where cited; verdicts that merely restate a prior lane say so.
- NOT audited: the served `:3100` build (stale ~21h, built 2026-09-27 21:00:32 per laneB7; everything here describes worktree code, which is NEWER than what a viewer would see).

## Verdict scale for the autonomy questions

- ANSWERED: the projection is a real, evidence-backed projection of existing state.
- PARTIAL: something real is projected, with a material blind spot or fragility.
- MOCK: the surface asserts something the evidence does not support.
- ABSENT: no surface at all.

## The 10 autonomy questions, graded

1. WHAT IS PING TRYING TO ACCOMPLISH? PARTIAL.
   Per-mission intent exists (dispatch form, mission records carry a brief; TODAY "will happen next" lists cron.d schedules). But there is no goal/objective rollup anywhere: MC never projects what PING as a system is trying to accomplish, only a list of dispatched missions and schedule filenames. A schedule filename is not an intent. The missions list is real; the "trying to accomplish" layer is narrative, not state.

2. WHAT DOES IT KNOW / NOT KNOW? PARTIAL.
   This is MC's strongest layer. UNKNOWN is first-class vocabulary in the TECHNOLOGY claim system (PROVEN/OBSERVED/DERIVED/UNKNOWN/STALE/CONFLICTING/PROTOTYPE/UNWIRED) and in mission status; timeouts never render as FAILED. But two holes: no per-UNKNOWN entry names what evidence would resolve it (B7 gap: absent "missing evidence" list), and the journal-quiet condition (no staleness-of-the-journal-itself signal) means MC cannot say "I know nothing new since <time>".

3. WHAT DECISIONS IS IT MAKING? PARTIAL, with one MOCK element.
   Decisions are real in the machine: `authorizeWorkOrder` 8 ordered fail-closed checks (vendored adapter `:185`), `reconcileGate` typed refusals, `verifyResultEnvelope` 8-field structural gates, `orca_policy.js` decision records (AUTO_EXECUTE / REQUIRES_HUMAN_APPROVAL / PROHIBITED + reason). MC projects only the VERDICTS (MC_AGENT_AUTHORIZED/DENIED, mission statuses), never the decision units or check-level evidence. The MOCK element (B7 gap 1): every UNKNOWN mission renders "OUTCOME UNKNOWN - RECONCILIATION IN PROGRESS" while no reconciler exists; the AGENTS tab's own withheld-controls card contradicts it.

4. WHY THIS WORKER?: ABSENT.
   There is no "which worker" decision to project: model selection is a static profile constant or a caller parameter (orca-adapter `dispatchExecution`, orca decision inventory D-02: "there is NO model routing"). The dispatch catalog honestly lists available agents (ollama PROVEN acceptance-run; identity_1..4 PROTOTYPE, "no quota spent"). But no per-dispatch rationale is recorded anywhere, because none is computed. Nothing to project yet; projecting one would be fabrication.

5. WHAT AUTHORITY EXISTS?: PARTIAL.
   Mission detail shows `capabilities_granted` and `work_order_id` from MC_AGENT_AUTHORIZED events; DENIED missions carry the denial reason; tenant-scoped reads enforced. Not projected: the 8 ordered checks behind the verdict, which grant came from PING authority vs the adapter's registry default (lane 14 R1/R2), the issue-to-invoke trust gap (invoke at adapter.js:1353 trusts the carried WorkOrder with no redeem-time re-decide; B7 gap 7). The AGENTS tab "Withheld controls" card is the most honest authority surface in the whole page.

6. WHAT IS RUNNING?: MOCK (display), PARTIAL (raw data).
   TODAY "happening now" reads fleet inprogress dir names and `displayState(row, inprogress=true)` hardcodes RUNNING for anything present; a stale leftover dir renders as RUNNING. No process liveness is bound to the dir listing. The `ps` process-count card is a separate unlinked surface (command counts, no worker mapping). The raw data (dir names, process counts) is real; the RUNNING claim is not evidence-backed. This is the sharpest "shows something the evidence does not support" case on the page.

7. WHAT MAY HAVE HAPPENED?: PARTIAL.
   OUTCOME UNKNOWN is a genuine first-class state; missions carry events, result digests, and error fields. But the lost-result case (lane 12 W2: effect-succeeds-but-event-write-fails, emit() has no try/catch at dispatch/route.ts:371-373) is indistinguishable from RUNNING, and no UNKNOWN entry names the evidence that would resolve it.

8. WHAT WAS VERIFIED?: PARTIAL.
   Real verification machinery exists in the adapter (`verifyResultEnvelope`: 8-field structural echo-binding; validation failure is non-retryable). MC shows the materials (artifacts with sha256 + `present` truthfulness check; prompt_digest/output_digest, digests only, never raw). Not projected: which verification checks ran, their per-check results, or which verification failed when a result was rejected. MC shows the evidence; it never shows the verdict trail.

9. WHAT NEEDS ME?: PARTIAL.
   Two real-but-weak signals: TODAY "needs your authority" parses `~/workspace/GRILLING-BRIEF.md` "## ACTIVE QUESTIONS" with regex `^###\s+(.+?):`; on format drift it renders an empty PROVEN list, so "no open questions" is indistinguishable from "parser saw nothing" (B7 gap: attention items silently vanish; parse rule not surfaced). The AGENTS tab withheld-controls card names exactly what is withheld and why. The strongest human-gate primitive in the system (digest-pinned approve/deny, journals MC_APPROVAL_APPROVED/DENIED, tamper-detecting) has zero MC UI: backend live, projection absent (B7 gap 9, laneA D12).

Score: 0 ANSWERED / 8 PARTIAL / 1 MOCK / 1 ABSENT.

## The attention queue: real projection vs absent

Searched the MC tree for every named item (`attention`, `attention_queue`, `attentionQueue`, `approvalRequired`, `reconciliationRequired`, `evidenceRequired`, `securityIssue`, `budgetIssue`, `workerUnavailable`, `failedVerification`, `outcomeUnknown`, `policyDecision`, `requires_human`, `REQUIRES_HUMAN`): zero hits in `src/app/api/mc` or `src/app/mission-control`. The attention queue does not exist as a concept in Mission Control. Item-by-item against the underlying machine state:

- APPROVAL REQUIRED: real in the backend (ApprovalRequest primitive, `/api/mc/approvals/route.ts` digest-pinned approve/deny via the vendored `p0/approval` copy, journals MC_APPROVAL_APPROVED/DENIED). MC projection: ABSENT. No tab, no panel, no link in the page (B7 verified). The WAITING_APPROVAL triage (L-03b) is operator procedure with no code primitive.
- RECONCILIATION REQUIRED: real in the backend (`reconcileGate` typed refusal `reconciliation_required`; idempotency-index lock; UNKNOWN missions that need reconciliation). MC projection: ABSENT as a state; the `reconciliationState` field renders null/PROTOTYPE in agents/route.ts, and the UNKNOWN badge text "IN PROGRESS" asserts a nonexistent process (mock wording).
- EVIDENCE REQUIRED: ABSENT. No such item, no "missing evidence" list anywhere; UNKNOWN missions never name what would resolve them.
- SECURITY ISSUE: PARTIAL. The TECHNOLOGY tab incidents mechanism is real and honest (broken qdrant/vault probes with verified cause, backup risk, masked-health risk). But the largest live incident class has no object: the gateway's own health body said `unhealthy` / event_governance `degraded` (1704 NAMESPACE_VIOLATION rejections) at audit time while MC's 200-OK probe would render it PROVEN (B7 gap 2/8).
- BUDGET ISSUE: ABSENT from MC. copilot-broker owns `cost-model.js` (explicitly ESTIMATE-labeled) and quota tracking for identities 1..4; no spend, quota, or per-mission cost number reaches any MC surface (B7 gap: COST entirely absent).
- WORKER UNAVAILABLE: ABSENT. No liveness probe for workers (lane 14 R5: health = registry-state only). MC shows no per-agent current assignment, no quota reading, no broker state.
- CONFLICT: ABSENT as an attention item. CONFLICTING exists as a badge in the claim vocabulary, but it is misapplied (FAILED renders CONFLICTING, DENIED renders STALE, CREATED renders PROTOTYPE; B7 gap 4). The SEARCH "conflicts" intent honestly reports that journal conflict ops are not yet read.
- FAILED VERIFICATION: ABSENT as an item. `verifyResultEnvelope` gates exist in the adapter; a structural FAIL has no MC projection and no distinct state (it collapses into UNKNOWN/denied paths without naming the failed check).
- OUTCOME UNKNOWN: PARTIAL, the most real of the ten. UNKNOWN is a genuine projected mission status from the journal. Partial only because of the "IN PROGRESS" wording and the missing resolving-evidence list.
- POLICY DECISION: ABSENT from MC. Real in the Pig worktree policy module (`orca_policy.js`: `classifyDelegation`/`classifyRetry`/`prohibitedAction` return typed `{AUTO_EXECUTE | REQUIRES_HUMAN_APPROVAL | PROHIBITED, reason, action}` decision records). None of it is journaled or projected.

Tally: 0 fully real projections / 2 partial (OUTCOME UNKNOWN, SECURITY ISSUE) / 2 real-backend-with-absent-projection (APPROVAL REQUIRED, RECONCILIATION REQUIRED) / 6 absent (EVIDENCE REQUIRED, BUDGET ISSUE, WORKER UNAVAILABLE, CONFLICT, FAILED VERIFICATION, POLICY DECISION).

## The causal spine, link by link

For one mission, can MC show the full chain MISSION -> QUESTIONS -> DECISION UNITS -> EVIDENCE -> PROCESSOR -> DISTRIBUTION -> CRITICALITY -> AUTHORITY -> CAPABILITY -> WORKER -> ATTEMPT -> ARTIFACT -> POSSIBLE EFFECT -> VERIFICATION -> OUTCOME -> LEARNING -> NEXT ELIGIBLE WORK?

| # | Link | State | Evidence |
|---|---|---|---|
| 1 | MISSION | Real | `projectMissions` in `_lib/mc-dispatch.ts`: deterministic journal -> mission records; list + detail routes; events, reconciliation_state |
| 2 | QUESTIONS | Partial | TODAY "needs your authority" = GRILLING-BRIEF regex parse (fragile, format-drift silent); no per-mission open-questions projection; WAITING_APPROVAL triage has no code primitive |
| 3 | DECISION UNITS | Absent from MC | Real in code (authorizeWorkOrder 8 checks; reconcileGate; verifyResultEnvelope; orca_policy.js records). Zero MC projection: MC shows verdicts, never the check trail |
| 4 | EVIDENCE | Real | Mission detail -> events -> event_ids; artifacts with sha256 + `present` flag (2026-09-27 truthfulness check); prompt_digest/output_digest (digests only, deliberate and honest) |
| 5 | PROCESSOR | Partial | AGENTS tab "live processes" = unlinked ps command counts; no mission-to-process binding (B7 gap 6) |
| 6 | DISTRIBUTION | Partial | Dispatch catalog lists agents from adapter profiles (LIVE filter, honest claims); no per-mission distribution record beyond the agent name |
| 7 | CRITICALITY | Absent | Field exists in agents/route.ts, always null, status PROTOTYPE; "pending the ORCA port-lane reconciler contract; exposed as null, not invented" |
| 8 | AUTHORITY | Partial | `capabilities_granted` + `work_order_id` from MC_AGENT_AUTHORIZED; DENIED carries reason; check-level evidence and issue-vs-invoke scope absent |
| 9 | CAPABILITY | Partial | Per-mission `capability` + granted set; FIXED_CONSTRAINTS in catalog; PING-authority vs adapter-registry source not distinguished |
| 10 | WORKER | Partial | Per-mission agent name; fleet workers = inprogress dir names; no liveness, no assignment rationale, no per-agent current work (WORKER UNAVAILABLE absent) |
| 11 | ATTEMPT | Partial | `{missionId, runId, executionId, attempt}` tuple minted by orca-adapter `dispatchExecution` and the MC dispatch route; `execution_id` projected for MC missions; fleet worker `attempt` is null/PROTOTYPE |
| 12 | ARTIFACT | Real | sha256 + present-verified at projection time; orca-adapter/evidence holds per-attempt result envelopes |
| 13 | POSSIBLE EFFECT | Partial | `outcomes.js` EFFECT_STATE vocabulary is real in the adapter; MC mission result shows outcome/output_digest; read-only slice effect classification honest; but "effect happened, event write died" is invisible (renders RUNNING) |
| 14 | VERIFICATION | Absent from MC | `verifyResultEnvelope` is real in the vendored adapter; no verification verdicts, per-check results, or FAILED_VERIFICATION state projected |
| 15 | OUTCOME | Partial | Terminal statuses project honestly from the journal; badge vocabulary mislabels them (FAILED->CONFLICTING, DENIED->STALE, CREATED->PROTOTYPE); SUCCEEDED carries digest only |
| 16 | LEARNING | Absent | No MC surface for lessons, replay gates, promotion reports, or any learning loop (B7 gap 13) |
| 17 | NEXT ELIGIBLE WORK | Absent | `retryEligibility` renders the string "NOT EVALUATED: RETRY NOW is never offered..."; "will happen next" is cron.d filenames, not eligible work items |

Spine links present (real or partial): 12 of 17. Fully real: MISSION, EVIDENCE, ARTIFACT (3). Partial: QUESTIONS, PROCESSOR, DISTRIBUTION, AUTHORITY, CAPABILITY, WORKER, ATTEMPT, POSSIBLE EFFECT, OUTCOME (9). Absent: DECISION UNITS, CRITICALITY, VERIFICATION, LEARNING, NEXT ELIGIBLE WORK (5).

## Highest-leverage observability gap

One projection: typed decision records as first-class journal events, rendered in MC mission detail.

Every consequential gate in the machine already produces a typed decision in code: `authorizeWorkOrder`'s 8 ordered fail-closed checks (GRANT/DENY + reason), `reconcileGate`'s typed refusals (`duplicate_attempt`, `reconciliation_required`, `artifact_exists`, `idempotency_index_corrupt`), `verifyResultEnvelope`'s structural gates, and the Pig worktree `orca_policy.js` records (`AUTO_EXECUTE` / `REQUIRES_HUMAN_APPROVAL` / `PROHIBITED` + reason + action). None of these are journaled or projected today; MC shows only the verdict. A single projection that emits one journaled decision record per gate evaluation (check name, inputs digest, outcome, reason) and renders the check trail under each mission would convert three autonomy questions from PARTIAL to ANSWERED at once: WHAT DECISIONS IS IT MAKING (the units themselves), WHAT AUTHORITY EXISTS (the check trail behind every grant/deny), and WHAT WAS VERIFIED (the verification gates with per-check results). It also unblocks three absent attention-queue items for free: RECONCILIATION REQUIRED (reconcileGate refusals become listable), FAILED VERIFICATION (verifyResultEnvelope failures become named), and POLICY DECISION (REQUIRES_HUMAN_APPROVAL records become the approval queue's feed, complementing the existing approvals backend that currently has zero UI). No new authority is created: the gates already decide; this only makes the decisions visible. Per the 2026-09-25 reconciliation-authority rule, the projection must remain read-only (records decisions, never reconciles), and per the no-new-stores constraint the records ride the existing journal envelope.

## Verdict

Mission Control today is a dashboard with a real projection layer and honest truth-law, not a control plane and not a mock. The event plane, mission records, evidence drill paths (events -> artifacts with sha256 + present flags, digests not raw), the claim-badge law, and the UNKNOWN vocabulary are real. The control verbs (reconcile, hold, resume, retry, approve) are deliberately withheld until witnessed mutations exist, and the page says so on its own withheld-controls card. What is missing is not honesty but the decision layer: the machine makes typed, deterministic decisions at every gate and Mission Control shows none of them, while asserting two things it cannot prove (RUNNING from dir existence; RECONCILIATION IN PROGRESS with no reconciler) and mislabeling terminal outcomes with the wrong badge words.

Counts: autonomy questions 0 ANSWERED / 8 PARTIAL / 1 MOCK / 1 ABSENT. Attention queue: 0 fully real projections / 2 partial / 2 real-backend-absent-projection / 6 absent. Causal spine: 12 of 17 links present (3 fully real, 9 partial), 5 absent.
