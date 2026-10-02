# PLACEHOLDER-SUCCESS AUDIT — cross-domain semantic audit
Date: 2026-09-24. Auditor: ORCA effect-port lane (subagent, read-only mission).
Mandate item 5: PLACEHOLDER SUCCESS IS NOW A HARD FAILURE CLASS.
Mission: find every path where a proxy signal is represented as a stronger claim than the evidence supports.

## Summary counts

| Severity | Count |
|---|---|
| P0 (could cause consequential duplicate/harm or false certainty about an external effect) | 1 |
| P1 (dormant-but-live-tree placeholders; false-verification or false-negative paths) | 4 |
| P2 (design weaknesses, latent branches, cause-labeling) | 5 |
| Positive patterns harvested | 14 |

All findings below were verified by code reading AND by execution (node --test: 31/31 pass; live checker demos; node probes). No findings were invented.

## Findings

### P0

**F-01. Gmail-verified history ignored when structured touches = 0**
- Location: `~/workspace/outreach/send-eligibility.py:571`
- False equivalence: "Gmail-verified prior sends represented as zero touches when the structured state is stale"
- Detail: the cross-check is gated by `if args.gmail_sent_count is not None and row and sv["touches"]:`. When structured state records 0 touches but Gmail verifies 1-2 prior sends, `sv["touches"]` is 0 (falsy) and the cross-check is skipped entirely. Demonstrated live: with a JSONL row of 0 touches, `gmail_sent_count=1` and `gmail_sent_count=2` both return ELIGIBLE (exit 0) for `cold-email`. The gmail>=3 ladder backstop does not cover counts 1-2.
- Harm path: `send-batch.py` STALL (a `+send` that times out AFTER provider accept, outcome unknown) stops the batch without recording anything; a later re-run passes this gate and re-sends, producing a duplicate cold email to a real business (the exact irreversible harm class named in class_08's header). Any other source of structured-state staleness (manual send, failed row update) triggers the same path.
- Repair: drop the `sv["touches"]` truthiness gate; run the Gmail-vs-structured comparison whenever `row` exists and `gmail_sent_count is not None`. A mismatch (gmail > touches, including touches=0) must emit DISCREPANCY (exit 2), fail closed. Add a regression test: touches=0, gmail_count in {1,2} -> exit 2.

### P1

**F-02. `_gitPush` placeholder returns success; caller records pushed=TRUE in Postgres**
- Location: `/home/nolan/ping/gateway/commit_authority.js:207-213` (stub), caller `pushCommit` lines 124-132 (`UPDATE commits SET pushed = TRUE, push_status = 'success'`)
- False equivalence: "no-op represented as pushed to remote"
- Detail: `_gitPush` is `// Placeholder - in production, use actual git push` returning `{success: true}` unconditionally. `pushCommit` writes `pushed=TRUE, push_status='success'` to the DB from that stub. Sibling placeholders in the same file: `_gitAdd` (169-179, `staged: true` without staging), `_gitCommit` (181-188, fake hash, no commit), and `commit()` records `committed: true` with a non-existent git hash (100-112). Downgraded to P1 (not P0) because the module is NOT referenced by the live runtime (`bootstrap/gateway_runtime.js`, `authority_container.js`, `server.js` all clean; only `patch_authority_v2.js` mentions the names, via its own hash string). Dormant but present in the canonical gateway tree.
- Repair: quarantine before any wiring: replace stubs with `throw new Error('not implemented: real git op required')`, or delete the file. Any future wiring must pass a real-push verification gate (read-back `git ls-remote` / remote ref check) before `pushed=TRUE` may be written.

**F-03. `_applyChange` no-op returns bytes_written; `applyPatch` reports applied:true**
- Location: `/home/nolan/ping/gateway/patch_authority.js:255-262` (stub), caller `applyPatch` lines 215-244 (`applied: true` per change, `allApplied` aggregate). Related: `_rollbackChange` returns `restored: true` without restoring (309-315); lint hardcoded `passed: true` (403-407); typecheck hardcoded `passed: true` (426-432).
- False equivalence: "no-op represented as applied filesystem write / restored / lint-clean"
- Detail: P1 (not P0) for the same reason as F-02: the module is unreferenced by the live runtime. A hardcoded-pass lint/typecheck feeding a deploy decision would be P0 if wired.
- Repair: same quarantine rule as F-02; lint/typecheck must execute the real tool and parse its result, or be removed.

**F-04. `verify_in_sent` fuzzy subject-substring match can false-verify an unverified send**
- Location: `~/workspace/outreach/send-batch.py:146`: `if subject.lower().split(",")[0] in subj or subj in subject.lower():`
- False equivalence: "a different send's receipt represented as this send's receipt"
- Detail: verification matches any Sent item (window `newer_than:2h`) whose subject merely CONTAINS the draft's first comma-chunk (or vice versa). If the `+send` actually failed but an earlier same-subject-prefix send to the same address exists inside the 2h window (e.g. a re-run after F-01's duplicate path, or two drafts sharing a subject line), the failed send is recorded `SENT+VERIFIED` with the wrong message id.
- Repair: require exact full-subject equality against the most recent matching message; better, capture the message id from `+send` output when the CLI provides one and match on id. Add a test with a colliding earlier send.

**F-05. Zero-hits email probe trusts search health without a positive control**
- Location: `~/workspace/orca/port/effect_adapters/class_08_message_execution.js:183-190`
- False equivalence: "empty result represented as proof of non-delivery"
- Detail: `outcome: 'not-delivered'` with the claim "Zero hits with a healthy search = proof of non-delivery", but health is assumed, not checked. A degraded-but-non-erroring search (index lag, partial outage returning valid empty JSON) false-negatives into SAFE_TO_RETRY and a duplicate email. (Errors do fail to inconclusive; this is the non-erroring degraded case.)
- Repair: add a positive control before trusting zero hits (e.g. a canary query known to return results, or require the search to return at least one unrelated hit in the window); alternatively treat first-ever zero-hits as inconclusive pending a second independent probe.

### P2

**F-06. `assertProbeEvidence` ignores outcome: timeout/inconclusive evidence passes the gate**
- Location: `~/workspace/orca/port/effect_adapters/adapter_core.js:161-167`
- False equivalence: "observation evidence represented as effect evidence"
- Detail: demonstrated live: `assertProbeEvidence({outcome:'inconclusive', evidence:{timeoutMs:30000, timeoutObserved:true}})` returns true, and a `not-delivered` probe with `{hitCount:0, searchHealthy:true}` returns true. The gate checks field presence only. Any consumer using it as a standalone delivery check (rather than after an outcome gate) would treat a timeout observation as proof. The shipped probes branch on outcome first, so this is latent.
- Repair: require `probeResult.outcome === 'delivered'`, or exclude observation-only markers (`timeoutObserved`, `probeError`, `evidenceClass`) from the field count.

**F-07. `evaluatePredicate` accepts malformed outcome strings, treated as not-delivered**
- Location: `~/workspace/orca/port/effect_adapters/adapter_core.js:246`
- False equivalence: "unknown-shaped result represented as not-delivered"
- Detail: the check is truthiness (`!probeResult.outcome`), not the `delivered|not-delivered|inconclusive` enum. Demonstrated live: `{outcome:'sent', evidence:{a:1}}` flows through class_08's predicate and returns SAFE_TO_RETRY. `makeProbeResult` enforces the enum, but any caller constructing results by hand bypasses it.
- Repair: validate `outcome` against the enum in `evaluatePredicate`; anything else fails closed to HOLD_UNKNOWN.

**F-08. Form probe: local-state SUBMITTED reported as `delivered`**
- Location: `~/workspace/orca/port/effect_adapters/class_08_message_execution.js:243-249`
- False equivalence: "queued local state represented as delivered"
- Detail: the code is honest in its comments ("no platform receipt exists for forms") and marks `evidenceClass: 'local-state-only'`, but the outcome enum value is `delivered`. Any downstream that reads outcome without checking evidenceClass treats a local pipeline row as platform delivery.
- Repair: add a distinct outcome or require downstream (INTEGRATION-CLASS08-PROPOSAL.md) to gate on `evidenceClass === 'local-state-only'` before treating form outcomes as delivery.

**F-09. `/health` fallback returns healthy when the authority is absent**
- Location: `/home/nolan/ping/gateway/routes/health.js:15`: `res.json({ status: 'healthy', service: 'gateway', note: 'healthAuthority not available' })`
- False equivalence: "process existence represented as health"
- Detail: latent only. In production `healthAuthority` is a required module (`bootstrap/gateway_runtime.js:43`), so the branch is unreachable today. If a future wiring change passes a null authority, the endpoint would report healthy with zero checks.
- Repair: return 503 with `status: 'unhealthy'` in the absent-authority branch; add a startup assertion that the authority is present.

**F-10. STALL log asserts "approval stall" as the cause of a timeout**
- Location: `~/workspace/outreach/send-batch.py:166` (and docstring line 8)
- False equivalence: "timeout observation represented as a diagnosed cause"
- Detail: a `TimeoutExpired` on `+send` is logged as "timed out (approval stall)". Timeout is an observation; the cause is unknown (network, provider accept, CLI hang). The fail-closed behavior (stop, no SENT record) is correct; only the label over-claims.
- Repair: log "send-timeout (outcome unknown); verify in Sent before any re-send".

## What was checked and found clean (no findings invented)

- `assertProbeEvidence` DOES reject evidence-free `{success:true}` / `{outcome:'delivered', evidence:{}}` (verified by the 31/31 passing unit tests in `tests/run_tests.js`, including the placeholder-success test).
- Pig orchestration implements timeout-as-observation correctly: `ping-runtime/orchestration/effect_reconciler.js` (timeout -> EFFECT_UNKNOWN + UnknownOutcomeError + late-settle handlers; only explicit EFFECT_FAILED yields FAILED) and `ping-runtime/orchestration/mission_scheduler.js:343` (reconcile-before-retry; mission fails only if reconciliation itself fails). No "timeout => failed" mappings found.
- No dry-run flags confusable with live in gateway or ping-runtime (only a "Dry-run the decision" comment in effect_reconciler.js:500, which is decision-simulation, not an effect).
- No `{success:true}`-without-effect in gateway routes or api_controller; orchestration routes clean.
- `send-batch.py`: UNVERIFIED is never recorded as SENT; batch stops on stall/error; eligibility gate runs before EVERY send with the per-recipient Gmail count; a missing count fails closed (flag omitted -> checker exit 3).
- `send-eligibility.py`: fail-closed on missing `--gmail-sent-count`; notes never resurrect sequences (precedence: structured > suppression > verified history > projection > notes); discrepancies emitted with state-hash-bound reconciliation; negation and "sent mail" guards; cross-prospect attribution scoping; gmail>=3 ladder backstop.
- `_gitPush` matches exist only in the dormant `commit_authority.js` (main tree + two worktree copies); the live bootstrap does not reference it.
- `emitOverlayEvent` (REPAIR-NOTES.md R3): the fyd-journal-gateway is not present under /home/nolan on the Pig, so the timeout-after-accept pattern there could not be re-verified in this scope; R3 in REPAIR-NOTES.md stands as the documented repair item.

## Positive-pattern harvest (mandate item 9)

1. `~/workspace/orca/port/effect_adapters/adapter_core.js` `probeWithTimeout`: timeout resolves to an inconclusive probe with an explicit observation record, never success or failure.
2. `~/workspace/orca/port/effect_adapters/adapter_core.js` `assertProbeEvidence` + `tests/run_tests.js`: evidence-free `{success:true}` is rejected as no-evidence (31/31 tests pass).
3. `~/workspace/orca/port/effect_adapters/adapter_core.js` `evaluatePredicate`: missing probe or invalid predicate decision fails closed to HOLD_UNKNOWN.
4. `~/workspace/orca/port/effect_adapters/class_05c_threads.js`: ZERO_TRANSPORT_RETRIES_RULE encoded verbatim; retry requires a new explicit approval AND a frozen-snapshot match.
5. `~/workspace/orca/port/effect_adapters/class_05d_instagram.js`: the degraded browser-CDP read path is rejected outright; only the CLI read path may feed a probe.
6. `~/workspace/orca/port/effect_adapters/class_09_campaign_publication.js`: like-toggle awareness (retry requires a fresh absence probe; a blind like retry could UNLIKE); page-publish always HOLD (adapters never unpause it).
7. `~/workspace/orca/port/effect_adapters/class_08_message_execution.js`: retry requires eligibility exit 0, no open intent for the logical op, and the 3-touch ladder cap.
8. `~/workspace/outreach/send-batch.py`: every acceptance is verified in Gmail Sent before proceeding; UNVERIFIED is never recorded as SENT; the batch stops on stall/error; the eligibility gate runs before every send.
9. `~/workspace/outreach/send-eligibility.py`: mandatory `--gmail-sent-count` (missing = exit 3 fail-closed); prose-is-not-authority precedence; discrepancy emission with state-hash-bound reconciliation; negation and "sent mail" marker guards.
10. `~/workspace/outreach/engagement-guard.py`: history-unreadable yields UNKNOWN-UNCHECKABLE (fail closed); mechanical never-re-engage check.
11. `/home/nolan/ping/ping-runtime/orchestration/effect_reconciler.js`: DISPATCH_TIMEOUT becomes EFFECT_UNKNOWN + UnknownOutcomeError with late-settle handlers; FAILED only from an explicit EFFECT_FAILED.
12. `/home/nolan/ping/ping-runtime/orchestration/mission_scheduler.js:343`: timeout triggers reconcile-before-retry; the mission fails only if reconciliation itself fails.
13. `/home/nolan/ping/gateway/health_authority.js` `getHealth`: aggregates registered component checks (gateway, event_runtime, qdrant, embedding, ...); any non-healthy component marks the whole node unhealthy.
14. `/home/nolan/ping/gateway/routes/health.js`: returns 503 when status is not healthy (the OPS-002 real-readiness pattern).

## Recommended repair order

1. F-01 (P0): fix the `send-eligibility.py:571` cross-check gate; add regression tests for touches=0 with gmail_count 1 and 2. This closes the duplicate-email path.
2. F-04 (P1): exact subject (or message-id) matching in `send-batch.py` `verify_in_sent`; relabel F-10 STALL in the same edit.
3. F-06 + F-07 (P2): harden `assertProbeEvidence` (require `outcome==='delivered'`) and `evaluatePredicate` (enum-validate outcome) in `adapter_core.js`; extend `tests/run_tests.js`.
4. F-05 (P1): positive search-health control in the class_08 email probe; F-08 (P2): document/enforce `evidenceClass` handling for form outcomes in INTEGRATION-CLASS08-PROPOSAL.md.
5. F-02 + F-03 (P1): quarantine the dormant Pig placeholders (throw-not-implemented or delete); add a wiring-time verification requirement before any of these modules may be referenced by the live runtime; fix F-09 health fallback to 503 in the same pass.

SECRET MATERIAL FOUND: NO
