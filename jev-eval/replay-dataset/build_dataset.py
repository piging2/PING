#!/usr/bin/env python3
"""Build ~/workspace/jev-eval/replay-dataset/items.jsonl.

J8 lane: 51 staged historical PING decisions with known final dispositions
for future Jev replay evaluation. Dataset staging only; no live Jev calls,
no replay execution.

Item content is sanitized: state digests (sha256) over canonical summary
strings, never raw private context. No PII, no secrets.
"""
import json, hashlib, pathlib

OUT = pathlib.Path.home() / "workspace" / "jev-eval" / "replay-dataset" / "items.jsonl"
SCHEMA = "jev-shadow/replay-item/v1"

def digest(text):
    return "sha256:" + hashlib.sha256(text.encode("utf-8")).hexdigest()

def item(item_id, family, question, state_summary, typed_answer,
         existing_decision, final_decision, eventual_outcome, outcome_known,
         verified_by, verified_at, source_ref,
         probabilities=None, confidence=None,
         correlation_id=None, causation_id=None,
         decision_schema_version=SCHEMA,
         notes=None):
    rec = {
        "item_id": item_id,
        "decision_family": family,
        "decision_schema_version": decision_schema_version,
        "question": question,
        "state_summary": state_summary,
        "state_digest": digest(state_summary),
        "requested_model": None,
        "actual_served_model": None,
        "typed_answer": typed_answer,
        "probabilities": probabilities,
        "confidence": confidence,
        "latency_ms": None,
        "token_count": None,
        "cost_usd": None,
        "existing_decision": existing_decision,
        "final_decision": final_decision,
        "eventual_outcome": eventual_outcome,
        "outcome_known": outcome_known,
        "correlation_id": correlation_id,
        "causation_id": causation_id,
        "verified_by": verified_by,
        "verified_at": verified_at,
        "source_ref": source_ref,
    }
    if notes:
        rec["notes"] = notes
    return rec

HARNESS = "~/workspace/sprint-2026-09-24/orca/lane-f-harness/out/run-2026-09-26T1344-0309/run-summary.json"
HARNESS_BY = "Lane F integration harness (worker_runtime fail-closed repair), final all-green run 2026-09-26T13:45:08Z"
A5 = "~/workspace/goals/ping-agent-execution-stack/hidden_files/orca-a5-audit-verdict-2026-09-18.md"
A5_BY = "Independent ORCA A5 audit (2026-09-18 ~08:25 MDT, direct audit of commit 992e12725)"
RULE = "~/workspace/jev-stage/typed_decision.js + test_jev_shadow.js"
RULE_BY = "RuleClaimDecisionProvider (rule-claim-v0, policy rule-claim-v0/2026-09-22), test-verified deterministic"
HOLDREG = "~/workspace/sprint-2026-09-24/orca/HOLD-UNKNOWN.md"
HOLD_BY = "ORCA HOLD/UNKNOWN register (coordinator triage dispositions)"
MEM26 = "~/memory/2026-09-26.md"
MEM_BY = "Coordinator memory record (2026-09-26)"
GRILL = "~/workspace/sprint-2026-09-24/grill-20-locked-answers.md"
GRILL_BY = "Nolan locked escalation answers (2026-09-24 ~19:05 MDT)"
IDENT = "~/workspace/sprint-2026-09-24/support/IDENTITY-QUOTA-INVESTIGATION.md"
IDENT_BY = "Identity/quota containment record (Nolan decision 2026-09-25 ~20:45 MDT)"

items = []

# ---------------- ROUTING (11) ----------------
R = []
R.append(("j8-routing-01",
  "Given a happy-path dispatch to a registered worker, what is the dispatch outcome classification?",
  "WorkerRuntime dispatch: registered worker, event type registered, handler returns normally. Adapter outcome=completed; work_order_id deterministic mint (sha256 workorder:taskId[0:16]); prompt-context digest present; artifact path returned.",
  "MATCHED_SUCCESS",
  "dispatch receipt: worker matched, handler settled normally",
  "MATCHED_SUCCESS",
  "harness verdict PASS, 18/18 checks; work order stable across re-dispatch; no canonical emission without an event runtime (honest recorded=false)",
  True, HARNESS_BY, "2026-09-26", HARNESS,
  "lane-f-a4e05bbc43402d7b"))
R.append(("j8-routing-02",
  "Given a dispatch whose matched worker returns undefined after a possible effect, what is the dispatch outcome classification?",
  "WorkerRuntime dispatch: worker 'observation' matched; handler returned undefined; mission row untouched (still running); zero automatic retry (retries=0, no retry_pending); UNKNOWN reconciled as HOLD with MISSION_RECONCILE_HOLD event.",
  "UNKNOWN",
  "dispatch receipt: matched=true, worker=observation, result=undefined (honest)",
  "UNKNOWN",
  "harness verdict PASS, 23/23 checks; no FAILED collapse; no duplicate effect; HOLD observable",
  True, HARNESS_BY, "2026-09-26", HARNESS,
  "lane-f-9eca86abe3209125"))
R.append(("j8-routing-03",
  "Given a dispatch for an event type with no registered worker, what is the dispatch outcome classification?",
  "WorkerRuntime dispatch: no worker registered for event_type=LANE_F_UNREGISTERED; receipt matched=false, routeExists=false; zero effects performed; error prose states the OBSERVED receipt.",
  "NO_MATCH",
  "dispatch receipt: matched=false, routeExists=false (explicit, observed)",
  "NO_MATCH",
  "harness verdict PASS, 17/17 checks; terminal fail, zero retry, routed to DLQ for human repair; not recorded as UNKNOWN (no HOLD)",
  True, HARNESS_BY, "2026-09-26", HARNESS,
  "lane-f-c3ff6d5301c2e583"))
R.append(("j8-routing-04",
  "Given a dispatch whose handler throws before performing any effect, what is the dispatch outcome classification and is retry safe?",
  "WorkerRuntime dispatch: handler threw before any effect (0 effects); first failure recorded with the real error; FAILED event recorded for attempt 1 carrying the real error.",
  "MATCHED_FAILURE",
  "dispatch receipt: matched=true, handler threw pre-effect",
  "MATCHED_FAILURE",
  "harness verdict PASS, 10/10 checks; honest retry of the genuine failure completed; exactly 1 effect total; projected status SUCCEEDED",
  True, HARNESS_BY, "2026-09-26", HARNESS,
  "lane-f-8732d9bb8e798013"))
R.append(("j8-routing-05",
  "Given a dispatch that times out with unknown effect status, what is the dispatch outcome classification?",
  "WorkerRuntime dispatch: dispatch timed out (1403ms, did not hang); mission row stays running, never FAILED; HOLD emitted with DISPATCH_TIMEOUT reason; late effect recorded honestly in the counter file but did NOT rewrite the outcome.",
  "UNKNOWN",
  "dispatch timeout; outcome unknown",
  "UNKNOWN",
  "harness verdict PASS, 16/16 checks; zero retry queued; no FAILED-on-timeout collapse; HOLD observable",
  True, HARNESS_BY, "2026-09-26", HARNESS,
  "lane-f-1d5bec141c901f24"))
R.append(("j8-routing-06",
  "Does the repaired WorkerRuntime satisfy the duplicate-effect regression (effect -> undefined -> exactly one physical effect)?",
  "Duplicate-effect regression: negative control on known-bad code reproduced the duplicate effect; repaired code ran the regression suite.",
  "MATCHED_SUCCESS",
  "regression: 45/45 assertions pass on repaired code; negative control reproduced the bug on old code",
  "MATCHED_SUCCESS",
  "harness verdict PASS, 5/5 checks; exactly-once invariant: effects == 1; lane-A regression evidence bundle captured",
  True, HARNESS_BY, "2026-09-26", HARNESS,
  "lane-f-d4b1677be06bd7b6"))
R.append(("j8-routing-07",
  "Do two concurrent executions on a shared transport receive distinct identities and deterministic work orders?",
  "Concurrency AB: barrier rendezvous with both transports in flight; execution windows genuinely overlap; mission_id, run_id, execution_id, work_order_id, artifact ID families pairwise distinct; work orders match the deterministic mint.",
  "MATCHED_SUCCESS",
  "concurrent dispatch: two executions, distinct ID families, deterministic work orders",
  "MATCHED_SUCCESS",
  "harness verdict PASS, 114/114 checks; no identity collision under genuine concurrency",
  True, HARNESS_BY, "2026-09-26", HARNESS,
  "lane-f-conc-shared-a4cd3a41f1df"))
R.append(("j8-routing-08",
  "What happens when an unauthorized identity (identity_5..10) requests dispatch?",
  "Identity-denials: catalog offers only ollama + identity_1..4; identity_5..10 absent from the offered catalog.",
  "DENIED",
  "dispatch request for identity_5: HTTP 403 agent_denied at validation",
  "DENIED",
  "harness verdict PASS, 27/27 checks; denied at validation (no mission minted, never FAILED); zero execution effects",
  True, HARNESS_BY, "2026-09-26", HARNESS,
  "lane-f-fd5bf4a8d9ba1ba7"))
R.append(("j8-routing-09",
  "Does the mission-control projector show parity with the live route, and is duplicate emit refused?",
  "Refresh-replay: projector port equivalent to live route on a real mission (journal_events=9, field_mismatches=0, artifacts_match=true, route_status=SUCCEEDED); duplicate emit refused (content-derived id); event_id content-derived and stable; causal order preserved.",
  "MATCHED_SUCCESS",
  "projection parity verified; duplicate emit refused",
  "MATCHED_SUCCESS",
  "harness verdict PASS, 7/7 checks; project.py is a pure function of (journal, as-of), byte-identical",
  True, HARNESS_BY, "2026-09-26", HARNESS,
  "lane-f-33b80f94df5e48cc"))
R.append(("j8-routing-10",
  "Given an ORCA objective, was the dispatch -> result -> verify -> close chain genuinely executed?",
  "ORCA run orca-run-mu6wmbzn (2026-09-18): objective -> dispatch -> result -> verify -> close; timestamps coherent (11:57:46Z -> 11:59:56Z); Hermes output contained real live data (191 missions all completed, 987 events, independently re-queried and matched).",
  "WORKER_COMPLETED",
  "ORCA dispatch to Hermes; result envelope returned; mission closed after verification",
  "WORKER_COMPLETED",
  "Independent A5 audit: SUBSTANTIALLY PROVEN; causation chain verified; live PG path matched exactly",
  True, A5_BY, "2026-09-18", A5,
  "orca-run-mu6wmbzn"))
R.append(("j8-routing-11",
  "Given a worker attempt that times out, what is the correct policy transition?",
  "ORCA run orca-run-mu6x9eeh (2026-09-18): attempt 1 timedOut -> WORKER_FAILED (aaa09271) -> policy AUTO_EXECUTE retry-attempt-plus-1 -> attempt 2 WORKER_COMPLETED (74cdadc5).",
  "MATCHED_FAILURE_THEN_RETRY",
  "attempt 1: WORKER_FAILED on timeout; policy: AUTO_EXECUTE retry-attempt-plus-1",
  "MATCHED_FAILURE_THEN_RETRY",
  "Independent A5 audit: real failure-to-recovery semantics confirmed; attempt 2 WORKER_COMPLETED",
  True, A5_BY, "2026-09-18", A5,
  "orca-run-mu6x9eeh"))
for (iid, q, ss, ta, ed, fd, eo, ok, vb, va, sr, corr) in R:
    items.append(item(iid, "routing", q, ss, ta, ed, fd, eo, ok, vb, va, sr,
                      correlation_id=corr,
                      notes="Dispatch-outcome classification family: the Jev shadow router's routing question is executor selection, but dispatch-receipt classification (MATCHED_SUCCESS/MATCHED_FAILURE/NO_MATCH/UNKNOWN) is the closest historical labeled data available; executor selection was uniformly HEADLESS_AGENT in the 2026-09-26 broker wave so it cannot calibrate a multi-class router."))

# ---------------- CLASSIFICATION (5) ----------------
C = [
 ("j8-class-01", "R3: claim-classification, subjectRef=doc present, eventType=LEAD_CREATED (known vocabulary), evidenceRefs non-empty -> ?",
  "DecisionRequest{domain=claim-classification, subjectRef present, evidenceRefs=['evt-upstream'], context.eventType=LEAD_CREATED}",
  "ACCEPT_CLAIM", 0.85, "R3: structurally valid claim with evidence reference"),
 ("j8-class-02", "R4: claim-classification, subjectRef present, eventType known, evidenceRefs empty -> ?",
  "DecisionRequest{domain=claim-classification, subjectRef present, evidenceRefs=[], context.eventType=ESTIMATE_CREATED}",
  "NEEDS_MORE_EVIDENCE", 0.55, "R4: structurally valid claim but no evidence reference"),
 ("j8-class-03", "R2: claim-classification, subjectRef present, eventType outside known vocabulary -> ?",
  "DecisionRequest{domain=claim-classification, subjectRef present, evidenceRefs=['e'], context.eventType=UNKNOWN_TYPE_X}",
  "NEEDS_MORE_EVIDENCE", 0.40, "R2: event type outside known claim vocabulary"),
 ("j8-class-04", "R1: claim-classification, subjectRef missing -> ?",
  "DecisionRequest{domain=claim-classification, subjectRef absent, context.eventType=LEAD_CREATED}",
  "NEEDS_MORE_EVIDENCE", 0.20, "R1: claim has no subject reference (documentId missing)"),
 ("j8-class-05", "R0: wrong domain (not claim-classification) -> ?",
  "DecisionRequest{domain=other-domain, subjectRef present}",
  "NEEDS_MORE_EVIDENCE", 0.10, "R0: provider only handles claim-classification"),
]
for (iid, q, ss, ta, prob, rationale) in C:
    items.append(item(iid, "classification", q, ss, ta,
                      f"rule-claim-v0 -> {ta} p={prob} ({rationale})",
                      ta,
                      "deterministic rule output; test-verified in test_jev_shadow.js; replay must reproduce exactly",
                      True, RULE_BY, "2026-09-22", RULE,
                      probabilities={ta: prob}, confidence=prob,
                      notes="Deterministic-rule golden, not a historical judgment: the 'final disposition' is the rule's specified output. Used to check replay determinism and Jev-vs-rule agreement, not human calibration."))

# ---------------- TRIAGE (14) ----------------
T = []
T.append(("j8-triage-01",
  "Headless finding: privacy fix branch refs lost, but fix content appears merged elsewhere. Queue transition?",
  "Falsifier reobservation 2026-09-25 ~20:38 MDT: branch fyd/privacy-projection-p0 and commits ecd2ef9/7e6b81c not found; worktree git-orphaned. BUT fix content present and committed on fyd/sprint-integration-2026-09-24 (field-visibility.ts fail-closed language; commits 136bf9a6, 568b3e5e, 3dfa164d).",
  "HOLD",
  "coordinator triage: HOLD - verify, do not re-implement",
  "HOLD",
  "Held as of 2026-09-26; no re-implementation occurred; reopen trigger: falsifier diffs merged content against lane RED/GREEN evidence",
  True, HOLD_BY, "2026-09-25", HOLDREG, "h1-privacy-branch"))
T.append(("j8-triage-02",
  "Headless finding: several worktrees are git-orphaned (.git points at missing metadata). Queue transition?",
  "Worktrees copper-v2, fyd-privacy-p0, orca-autonomy: .git files point at /home/nolan/workspace/.git/worktrees/<name>, but the metadata dir contains only audit-beyond-backlog-2026-19; git commands fail.",
  "UNKNOWN",
  "coordinator triage: UNKNOWN - leave them alone",
  "UNKNOWN",
  "Outcome unknown; left alone as of 2026-09-26; reopen trigger: identify which are still needed, then re-register or remove deliberately",
  False, HOLD_BY, "2026-09-25", HOLDREG, "h2-orphan-worktrees"))
T.append(("j8-triage-03",
  "Headless finding: a next-server process listening on :3105 runs from a deleted worktree. Queue transition?",
  "Process pid 48581 next-server listening on :3105 with cwd /home/nolan/worktrees/copper-v2 (deleted) - running from a deleted tree.",
  "KNOWN_BROKEN",
  "coordinator triage: known-broken; out of review until rebuild",
  "KNOWN_BROKEN",
  "Known-broken as of 2026-09-26; do not send Nolan there; reopen trigger: 05:00 rebuild replaces it, then kill the zombie and re-prove the port",
  True, HOLD_BY, "2026-09-25", HOLDREG, "h3-zombie-3105"))
T.append(("j8-triage-04",
  "Headless finding: secret-shaped connection string in shell history. Queue transition?",
  "A secret-shaped DATABASE_URL value observed in ~/.bash_history line 37 (2026-09-16). Value not reproduced here; existence only.",
  "HOLD",
  "coordinator triage: HOLD per Nolan - do not print, purge, copy, or rotate without his explicit decision",
  "HOLD",
  "Held as of 2026-09-26; Nolan's explicit decision required",
  True, HOLD_BY, "2026-09-25", HOLDREG, "h4-secret-shaped-history"))
T.append(("j8-triage-05",
  "Headless finding: tenant isolation proof Q-P0-06 incomplete. Queue transition for public Ask FYD?",
  "Tenant isolation proof Q-P0-06 incomplete as of the register entry.",
  "HOLD",
  "coordinator triage: HOLD - public Ask FYD opens only after grounding, isolation, and abuse-control hostile tests pass",
  "HOLD",
  "Held as of 2026-09-26; public Ask gated",
  True, HOLD_BY, "2026-09-25", HOLDREG, "h5-tenant-isolation"))
T.append(("j8-triage-06",
  "Should a third proof business (restaurant) be selected now?",
  "Third proof business = RESTAURANT per FYD framing, but only after the two-site loop closes.",
  "DEFERRED",
  "Nolan decision: no third site until HPP + Coppersmith pass",
  "DEFERRED",
  "Deferred as of 2026-09-26; not selectable by the queue",
  True, HOLD_BY, "2026-09-25", HOLDREG, "h6-restaurant-deferred"))
T.append(("j8-triage-07",
  "Headless finding: identity_5/identity_6 appear in live quota state but the registry authorizes only 1-4. Queue transition?",
  "Convergence swarm: identity_5/identity_6 in live quota state; registry authorizes only 1-4. Possible live authorization hole, not proven.",
  "UNKNOWN",
  "coordinator triage: UNKNOWN - Q-ID lane investigating read-only",
  "RESOLVED_CONTAINED",
  "Eventual outcome known: identity/quota investigation concluded CONTAIN (Nolan 2026-09-25); broker fail-closed allowlist committed (da64baa); identities 5-10 task_count stayed 0; no live unauthorized spend anywhere",
  True, HOLD_BY + "; " + IDENT_BY, "2026-09-25", HOLDREG + " + " + IDENT, "h7-identity-auth"))
T.append(("j8-triage-08",
  "Headless finding: 1489 untracked files across four repos; is uncommitted source at risk?",
  "Q-E lane live inventory 2026-09-25 ~20:42 MDT: 1489 untracked files, zero modified/deleted tracked files. projects/ping: 829 untracked (796 Next.js build outputs ~264MB + 25 webp + manifests; none gitignored). build-edge-port: 650 untracked (worker .next.bak backup). happy-place-platform: 10 untracked pre-existing work artifacts (docs, scripts, config backups) - NOT disposable-by-default. build-template1: clean.",
  "RESOLVED",
  "coordinator triage: RESOLVED - retire the stale '23 unrelated dirty files' figure; 1479 files disposable build artifacts; 10 hpp files must not be bulk-cleaned; zero uncommitted source changes exist",
  "RESOLVED",
  "Resolved 2026-09-25; nothing to cherry-pick, nothing at risk",
  True, HOLD_BY, "2026-09-25", HOLDREG, "h8-dirty-files"))
T.append(("j8-triage-09",
  "Broker identity_3 changed ACTIVE -> QUARANTINED after three consecutive UNKNOWN failures. What does the quarantine mean?",
  "identity_3: three consecutive UNKNOWN failures; immediate cause shown by tools was an invalid workdir supplied by the orchestrator (path does not exist on the Pig), not a demonstrated provider/account failure.",
  "QUARANTINED",
  "coordinator triage: QUARANTINED; do not treat the quarantine as evidence that identity_3's Copilot account is unhealthy",
  "QUARANTINED",
  "Quarantined as of 2026-09-26; needs deliberate recovery/reset after correcting task paths",
  True, MEM_BY, "2026-09-26", MEM26, "identity-3-quarantine"))
T.append(("j8-triage-10",
  "A headless worker reports three consecutive 150s timeouts at a non-interactive permission gate. Queue transition?",
  "ORCA A5: OpenCode worker hit 3x 150s timeouts at a non-interactive permission gate; claimed as failed, not as passed.",
  "VERIFIED_FAILURE",
  "auditor triage: honestly reported failure accepted as verified; no escalation, no false pass",
  "VERIFIED_FAILURE",
  "Recorded in A5 audit 2026-09-18 as correctly scoped out of the A5 claim (OpenCode WorkOrder proof blocked on permission gate)",
  True, A5_BY, "2026-09-18", A5, "a5-opencode-honest-failure"))
T.append(("j8-triage-11",
  "Headless result: broker-recorded completion for identity_1 startup-authority archaeology, but result text was lost. Queue transition?",
  "Rolling swarm wave 1 (2026-09-26): identity_1 dispatched on startup-authority archaeology; broker recorded successful completion; dispatch scripts printed only routing/completion, not worker result text.",
  "NEEDS_FALSIFIER",
  "coordinator triage: claims remain unverified unless separately established; substantive outputs not captured in conversation",
  "UNVERIFIED",
  "Outcome unknown as of 2026-09-26: must not be treated as verified findings (Restart-survival Items 3 and 4 remain RED)",
  False, MEM_BY, "2026-09-26", MEM26, "wave1-identity-1"))
T.append(("j8-triage-12",
  "Headless result: broker-recorded completion for identity_2 restart/Ask falsification, but result text was lost. Queue transition?",
  "Rolling swarm wave 1 (2026-09-26): identity_2 dispatched on restart/Ask falsification; broker recorded successful completion; result text lost at dispatch.",
  "NEEDS_FALSIFIER",
  "coordinator triage: claims remain unverified unless separately established",
  "VERIFIED",
  "Eventual outcome known: a separate identity_2 read-only probe wrote /tmp/item6-result.txt (services UP at PIDs 2880/2958) and the coordinator independently verified /api/health, process env flag, and journal gateway - triage closed as verified",
  True, MEM_BY, "2026-09-26", MEM26, "wave1-identity-2"))
T.append(("j8-triage-13",
  "Headless result: broker-recorded completion for identity_4 health-authority archaeology, but result text was lost. Queue transition?",
  "Rolling swarm wave 1 (2026-09-26): identity_4 dispatched on health-authority archaeology; broker recorded successful completion; result text lost at dispatch.",
  "NEEDS_FALSIFIER",
  "coordinator triage: claims remain unverified unless separately established; substantive outputs not captured in conversation",
  "UNVERIFIED",
  "Outcome unknown as of 2026-09-26: must not be treated as verified findings",
  False, MEM_BY, "2026-09-26", MEM26, "wave1-identity-4"))
T.append(("j8-triage-14",
  "Headless result: broker-recorded completion for identity_3 gateway TODO/FIXME classification, but result text was lost. Queue transition?",
  "Rolling swarm wave 1 (2026-09-26): identity_3 dispatched on gateway TODO/FIXME classification; broker recorded successful completion; result text lost at dispatch.",
  "NEEDS_FALSIFIER",
  "coordinator triage: claims remain unverified unless separately established; substantive outputs not captured in conversation",
  "UNVERIFIED",
  "Outcome unknown as of 2026-09-26: must not be treated as verified findings",
  False, MEM_BY, "2026-09-26", MEM26, "wave1-identity-3"))
for (iid, q, ss, ta, ed, fd, eo, ok, vb, va, sr, corr) in T:
    items.append(item(iid, "triage", q, ss, ta, ed, fd, eo, ok, vb, va, sr,
                      correlation_id=corr))

# ---------------- OTHER (21) ----------------
grill = [
 ("j8-other-01", "MONUMENT VIEW OWNER CONTACT", "DO NOT CONTACT AUTONOMOUSLY", "Prepare the complete owner-ready package automatically (private preview, evidence summary, claim method, owner journey, contact draft, exact requested action). Nolan makes/authorizes first contact. Do not stall product work waiting for authorization."),
 ("j8-other-02", "PHONE CHECKPOINT", "DO NOT INTERRUPT AT AN ARBITRARY HOUR", "When the objective mobile journey qualifies, freeze a stable checkpoint, capture exact URL/build/revision/screenshots, mark NOLAN VISUAL CHECK READY. Keep all non-conflicting work running. Surface at the next interaction, never block the machine."),
 ("j8-other-03", "HOUR-24 DELIVERY", "PROOF PACKAGE FIRST", "Also keep a reproducible live walkthrough ready. The proof package stands independently: HEADs, runtime, commits, tests, screenshots, replay commands, failures, first broken arrow, exact demo path. Certification must not depend on Nolan being present at hour 24."),
 ("j8-other-04", "BIGGEST PING-SITE PROBLEM", "TREAT AS PRODUCT INTELLIGENCE GAP", "THE SITE DOES NOT YET MAKE THE UNDERLYING PING/FYD INTELLIGENCE OBVIOUS AND USEFUL THROUGH THE PRODUCT EXPERIENCE ITSELF. No more marketing copy as the fix. Dogfood the canonical pipeline."),
 ("j8-other-05", "CLOSER EDGE VERSION", "COORDINATOR DIGS THROUGH HISTORY", "Do not ask Nolan to remember a branch. Search commits, worktrees, branches, inspectable stashes, deployment history, screenshots/artifacts, component diffs. Find the closest prior implementation empirically; use as mechanism/design donor; do not blindly revert."),
 ("j8-other-06", "COPILOT CAPACITY", "YES FOR LOW-RISK WORK AFTER REOBSERVED", "Route research, test generation, static analysis, bounded implementation, documentation, falsification through the existing broker. Do not increase concurrent writers on the same semantic unit. No production deployment, secret handling, destructive mutation, or consequential external action merely because capacity exists."),
 ("j8-other-07", "ONE-CLICK URL INTAKE", "OPERATOR-ONLY FIRST", "The acquisition boundary must already treat every URL and its content as hostile. No anonymous/public arbitrary URL intake until abuse controls, resource limits, tenant/auth boundaries, and Phase-17 publication requirements are proven."),
 ("j8-other-08", "PUBLIC FYD ATTRIBUTION", "NEUTRAL BRANDING", 'Do not hard-code "Built from verified business information with FYD" as a universal claim. "Verified" is too strong for mixed DIRECT/DERIVED/INFERRED/CONFLICTED knowledge. Use neutral branding ("Powered by FYD") or omit where policy permits.'),
 ("j8-other-09", "FYD SOCIAL", "HOLD THE LINE", "No generalized FYD Social provider expansion before PING + one genuinely independent external owner/customer pass the two-tenant product loop."),
 ("j8-other-10", "GENERATED MEDIA", "DO NOT USE AS OBSERVED REALITY", "Prefer authorized observed media for real customer facts/presence. Synthetic media only in explicitly labeled demo/design-exploration/synthetic-fixture contexts."),
 ("j8-other-11", "TENANT B", "MONUMENT VIEW FIRST IF AUTHORIZED", "If unavailable, coordinator may propose the next independent external business based on test value. No contact without authorization."),
 ("j8-other-12", "AUTOMATED OWNER CLAIM", "SMALLEST STRONG METHOD FIRST", "Investigate existing auth/domain mechanisms first. Priority: domain-email verification or domain/DNS challenge before adding a large provider dependency solely for claiming."),
 ("j8-other-13", "POST-H24 MACHINE", "CONTINUOUS", "Hour 24 ends the sprint, not the program. After certification, transition directly into the never-done convergence loop. Bounded physical concurrency, durable work claims."),
 ("j8-other-14", "OUTREACH / ENGAGEMENT VOLUME", "DO NOT INCREASE DURING THE SPRINT", "Preserve already-authorized conservative cadences only where current health/risk signals are green. Any auth degradation, provider warning, unknown-effect increase, account-risk signal, or reliability regression automatically reduces/halts the affected action lane."),
 ("j8-other-15", "1002 QUESTIONS", "PRESERVE ARCHIVE; DERIVE ACTIVE SET", "Do not preserve all 1002 as active decision debt. Produce a derived active set classified: resolved, duplicate, obsolete, machine-decidable, invariant-decided, human-product, business/legal, unknown."),
 ("j8-other-16", "DISK DELETION", "NO STANDING AUTHORIZATION FOR UNCERTAIN DESTRUCTIVE CLEANUP", "Autonomously remove only material proven reconstructable, unreferenced, noncanonical, non-user-owned, non-forensic, and safe under existing retention policy."),
 ("j8-other-17", "CREDENTIAL ROTATION", "NON-SECRET FORENSICS NOW", "Determine whether the exposed credential is still active, already rotated, or unknown, without revealing its value. If rotation requires Nolan/account-owner action: escalate ONE exact action immediately."),
 ("j8-other-18", "PING/FYD DOGFOOD PUBLICATION", "PRIVATE PREVIEW FIRST", "Generate PING through the exact same factory. Critique it. Compare it. Fix generic failures. Public cutover remains a consequential production promotion requiring existing release/promotion authorization."),
 ("j8-other-19", "VISITOR QUESTION HISTORY", "DEFAULT DO NOT CREATE DURABLE PER-VISITOR BEHAVIORAL MEMORY", "For the first owner test, conversation/session continuity may exist under the existing privacy model. No durable owner-visible identifiable visitor question history until purpose, retention, visibility, tenant isolation, deletion, consent/notice, and authorization semantics are explicit and tested."),
 ("j8-other-20", "GREEN PROOF BUT UGLY EDGE OBJECTS", "DOES NOT AUTOMATICALLY INVALIDATE PROOF", "Material usability/comprehension defects can block the owner test; cosmetic subjective defects are recorded as the first presentation arrow. Nolan's visual judgment is authoritative for that subjective distinction."),
]
for (iid, topic, ta, detail) in grill:
    ss = f"Grill-20 question {topic}: escalation decision under the installed escalation classifier (locked invariant? previous Nolan decision? code/runtime evidence? reversible experiment? >=80% safe default?)."
    items.append(item(iid, "other", f"Escalation decision: {topic} - escalate to Nolan or decide autonomously?",
                      ss, ta,
                      "Nolan locked answer (2026-09-24 ~19:05 MDT)", ta,
                      "Locked as operating rule; escalation classifier installed the same day and referenced as standing law in AGENTS.md",
                      True, GRILL_BY, "2026-09-24", GRILL,
                      correlation_id="grill-20-2026-09-24",
                      decision_schema_version="grill-20/locked-2026-09-24",
                      notes=f"Locked verdict detail: {detail[:300]}"))

items.append(item("j8-other-21", "other",
    "Identity_5..10 (Nolan's own OAuth logins) are UNAUTHORIZED-SPENDABLE but task_count=0. Promote them to execution authorization?",
    "Identity/quota investigation 2026-09-25: broker dispatch() never consults AGENT_PROFILES (broker.js:40 accepts any identity_id); Crush bypass mechanism proven but DORMANT (credential expired 2026-09-19).",
    "CONTAIN",
    "Nolan decision: CONTAIN, do not promote identities 5-10. OWNERSHIP is not EXECUTION AUTHORIZATION.",
    "CONTAIN",
    "Broker fail-closed allowlist committed locally (branch fix/broker-failclosed-containment, da64baa; 62/62 tests incl. 3 containment tests); denial logged without secrets; identities 5-10 task_count stayed 0; no live unauthorized spend anywhere",
    True, IDENT_BY, "2026-09-25", IDENT,
    correlation_id="identity-quota-2026-09-25",
    notes="Reclassification triggers: task_count>0 on 5-10 -> incident; Crush run on refreshed cred -> BYPASS-ACTIVE."))

OUT.write_text("\n".join(json.dumps(it, ensure_ascii=False) for it in items) + "\n")
print(f"wrote {len(items)} items to {OUT}")
from collections import Counter
print(Counter(it["decision_family"] for it in items))
unknown = [it["item_id"] for it in items if not it["outcome_known"]]
print("outcome unknown:", unknown)
