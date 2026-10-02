# AUTONOMOUS SOCIAL INTERDEPENDENCE SKILL — BUILD REPORT 2026-10-01

Nolan's MUSE BUILD DIRECTIVE (2026-10-01 ~12:19 MDT), executed with his structural modification: instead of eight generic documents, ONE SELF-CONTAINED SOCIAL DELIVERABLE PER PLATFORM OPERATION (Facebook, Instagram, Threads, X). TikTok is HELD per standing order: hold noted, no active loop built.

Skill home: `~/workspace/skills/social-interdependence/`

## What was built

Four platform deliverables, each self-contained with all eight components (SKILL.md, ARCHITECTURE.md, AUTONOMY_ENVELOPE.md, STATE_MACHINE.md, CAPABILITY_MATRIX.md, RECOVERY_PROTOCOL.md, WATCHDOG_SPEC.md, EVAL_PLAN.md), JSON schemas, runnable code, adapter-boundary fixtures, and real test suites:

| Platform | Dir | Tests | Result |
|---|---|---|---|
| Facebook | `facebook/` | 121/121 (6 suites) | green |
| Instagram | `instagram/` | 33/33 (3 consecutive runs) | green |
| Threads | `threads/` | 28/28 (3 suites) | green |
| X | `x/` | 134/134 (8 suites) | green |

Plus: `README.md` (cross-platform contract, shared authorities, live-vs-fixture status), `tiktok-HELD.md` (standing tripwire hold, reactivation path).

## Evidence grounding (harvested before any writing)

- `engagement-guard.py` `eligibility_check()`: the ONE deterministic eligibility function, imported by code path, never forked. Precedence CAPABILITY_MISSING/PROVIDER_UNSUPPORTED → BLOCKED → SUPPRESSED → ALREADY_ENGAGED → OUTSIDE_CORRIDOR → class rules → DUPLICATE → UNKNOWN → ELIGIBLE. UNKNOWN never dispatches. Plan-time tamper-evident envelopes (sha256, 6h TTL); dispatch-time live re-evaluation + evidence-check refusing missing/tampered/stale.
- `eligibility-data/*.json`: single copies, never forked.
- `holds.json` + `set-hold.py` + `authority-check.py`: machine-readable holds are the ONLY freeze mechanism; prose never freezes. The 2026-10-01 11:26 MDT Facebook DENY-CONFLICT was a gate false positive (regex matched "held=false" inside the authority documentation); reconciled, gate returns AUTHORITY-ALLOW. Final clear on outreach is Nolan's.
- Never-reengage: `post:<id>`-prefixed ledger IDs; terminal-aware merge (NOT_ATTEMPTED stays eligible); pfbid opaque tokens as disjoint namespace.
- TASTE IS NOT ELIGIBILITY: subjective curation lives ABOVE eligibility in every deliverable.
- Authorized ceilings encoded as budgets: FB 75+20, IG 50+12, Threads 45+12, X 30 likes per 2h pass; weekly ramp +5/+3; failed pass = retry, never lower caps.
- Platform executor realities: FB Pig-only CDP :9223 + engage.js (staged copy NOT deployed; deployment is owner call); IG ig-pipeline with gate-check-first and the CDP haystack fix + Phase-A2 verification; Threads skill surface with tab-hygiene invariant; X via the x-api skill pattern (authd, api.x.com only).
- AGENTS.md lessons encoded: pigwsl-exec single-quote stripping, CO BizNet OUT-OF-CORRIDOR, bare-ID ledger comparisons, dispatch-file format, X outcomes `ok`-boolean schema.

## What replaces the human (explicit, per platform)

Constitutional invariants + PolicyAuthority + CapabilityAuthority + IdentityAuthority + stable intent identity + idempotency + budgets + leases + read-after-write verification + evidence + replay + circuit breakers + watchdogs + bounded self-improvement + automatic rollback.

The human keeps: envelope issuance/revocation, ceiling changes, hold clearing, first-contact decisions. Nothing else in the ordinary path.

Machine-enforced invariants are runtime assertions, not suggestions: NO_ACTION_WITHOUT_AUTHORIZED_ACCOUNT, NO_DUPLICATE_ACTIVE_INTENT, NO_CANONICAL_SUCCESS_WITHOUT_VERIFICATION, NO_BLIND_RETRY_AFTER_UNKNOWN_EXTERNAL_MUTATION, NO_LEARNER_POLICY_SELF_MODIFICATION, NO_ADAPTER_DECISION_AUTHORITY, NO_EXECUTION_AFTER_CIRCUIT_BREAKER_OPEN, plus platform-specific ones (X: OUTCOME_OK_BOOLEAN_REQUIRED; Threads: TAB_HYGIENE).

## Real bugs the tests found and fixed

- Facebook (5): transitions written to a file the fold never read; readers choking on zero-byte kill files; missing within-batch duplicate threading; lie fixture mutating before lying; batch re-runs re-creating terminal intents. Plus added: per-target cross-batch in-flight protection, dispatch-time authority recheck, idempotent batch re-runs.
- Instagram (2): intent field-name mismatch vs the cross-platform contract; fixture dropping a passed empty truth dict via `or`.
- Threads (7): stale-state save clobbering transitions; duplicate lifecycle transitions for within-batch duplicates; import-time-frozen STATE_DIR; `lie_detected` not propagating into evidence; learner params lost on promotion; verification-failure breaker wrongly gated on sample size; range-valued learner bound comparison.
- X (4): missing legal transitions (DISPATCHED→VERIFYING, ATTEMPTING→DEFERRED, SAFE_RETRY/FAILED_RETRYABLE→DEFERRED); reconcile stopping at SAFE_RETRY without re-driving; half-open trial not marked inflight (two concurrent trials possible); circuit `check()` dropping the stored refusal reason.

## Architecture constraints honored

- Reused PING primitives (MissionRuntime, MissionScheduler, WorkerRuntime, CapabilityAuthority, IdentityAuthority, HashAuthority, Witness, Lineage, Replay). No new scheduler, worker authority, PolicyAuthority, CapabilityAuthority, Event Authority, or social event database.
- Event Authority under forensic review: persistence-integration boundaries marked in code, not implemented.
- Dumb adapters: receive authorized intents; never choose targets, set policy/budgets, or declare canonical success without read-after-write verification.
- Replay = decision replay, never mutation replay. UNKNOWN → ATTEMPTING does not exist in the transition tables.
- No detection evasion, no randomness-for-disguise, no CAPTCHA/auth bypass, no fabricated success, no blind retry of uncertain mutations, no constitutional rewrite from metrics.
- Bounded self-improvement: SHADOW → CANARY → ACTIVE with machine-verifiable gates; automatic rollback on regression; learner cannot raise its own ceiling, grant capabilities, authorize accounts, weaken verification, or disable evidence.
- Git safety: no commits, no staging, no reset/clean; all work inside the skill directory; no secrets printed. HEAD remains 591fb95.

## BLOCKED / not live

- LIVE EXTERNAL EXECUTION: BLOCKED on all four platforms (no credentials in this environment; Pig unreachable from here). Fixtures exist ONLY at the adapter boundary; everything above it is real code tested against scratch state. No production ledgers touched.
- X: envelope sample ceiling (30 likes/pass) conflicts with an older "10 likes per pass" value in AUTHORITY.json; needs Nolan's reconciliation before any live X use.
- Facebook: live proof of the production adapter against the Pig CDP endpoint pending; staged engage.js deployment remains an owner call.
- Instagram: live-adapter implementation against instagram-cli/Pig CDP is a 4-call boundary change; EVAL_PLAN has the live-readiness checklist.
- Threads: first live pass must run on the Pig with `SI_THREADS_EXECUTOR=pig` and record honest live evidence; after the first VERIFIED_SUCCESS, call `engagement-guard.py record --platform threads`.
- TikTok: HELD by tripwire (platform restriction banner, durable_like_cap 0). No loop built. Reactivation only via tripwire-observed flag clearance or Nolan's word.

## Cross-platform notes

- All four builders held the shared contract (intent_id shape, state names, envelope fields, decision-record fields). Recommend a shared contract check script if the deliverables evolve independently.
- X builder's reconcile-chaining fix (reconcile fully resolves through SAFE_RETRY re-drive) is X-only; siblings may want to adopt it.

## NEXT

1. Nolan reconciles the X ceiling conflict (30 vs 10 likes/pass) before any live X use.
2. Live adapter proof per platform on the Pig (boundary-only changes; fixtures swap out).
3. First live Threads pass with honest evidence recording + guard `record` calls.
4. Facebook staged engage.js deployment decision (owner call).
5. Event Authority forensic resolution, then wire the marked persistence-integration boundaries.
6. TikTok: no action until the tripwire hold clears.

---

## RESPONSE (Nolan's specified block)

AUTONOMOUS SOCIAL INTERDEPENDENCE SKILL — PHASE 1 COMPLETE

WORKTREE: /home/hatch/workspace
HEAD: 591fb95

SKILL: ~/workspace/skills/social-interdependence/ (README.md index; facebook/, instagram/, threads/, x/ self-contained deliverables; tiktok-HELD.md)

AUTONOMY ENVELOPE: machine-readable per platform (tenant, actor, authorized_accounts, allowed_platforms, allowed_capabilities, allowed_action_types, prohibited_targets, namespace_scope, execution_budget, concurrency_budget, relationship_budget, platform_budget, temporal_constraints, confidence_requirements, verification_requirements, retry_policy, maximum_failure_rate, maximum_unknown_rate, circuit_breaker_policy). TikTok excluded from allowed_platforms by the standing tripwire hold.

DECISION AUTHORITY: deterministic eligibility_check() from the real engagement-guard.py (single copy, never forked), plus per-platform decision records with interpretable dimensions (no opaque AI score as authority).
POLICY AUTHORITY: reused PING PolicyAuthority surface via authority-check.py + holds.json (machine-readable holds only; prose never freezes).
CAPABILITY AUTHORITY: reused; action-capability.json matrix (data edit, not code change); per-mutation capability negotiation (SUPPORTED/UNSUPPORTED/NOT_AUTHORIZED/TEMPORARILY_UNAVAILABLE/UNKNOWN).
IDENTITY AUTHORITY: reused; stable intent identity + idempotency keys; identity ambiguity fails closed.
EVENT AUTHORITY: under forensic review; persistence-integration boundaries marked in code, NOT implemented; no independent social event database created.
EXECUTION AUTHORITY: existing MissionRuntime/MissionScheduler/WorkerRuntime; dumb adapters execute authorized intents only.
VERIFICATION AUTHORITY: read-after-write verification mandatory; no canonical success without observed external state; X outcomes require the ok boolean.

HUMAN APPROVAL IN ORDINARY PATH: none. The human keeps envelope issuance/revocation, ceiling changes, hold clearing, first-contact decisions.

AUTONOMOUS STOP CONDITIONS: authority DENY; safe mode (identity/policy/capability/event-persistence/verification unavailable → reads continue, new mutations stop); open circuit breaker; watchdog stop; UNKNOWN never dispatches.

DURABLE INTENT: persisted before any external effect; intent_id = <platform>:<action>:<target_ref>:<batch_id>; evidence refs, capability/policy/relationship snapshots, correlation/causation ids, idempotency key.

STATE MACHINE: DISCOVERED → NORMALIZED → EVALUATED → ELIGIBLE/REJECTED → INTENT_CREATED → QUEUED → SCHEDULED → DISPATCHED → ATTEMPTING → UNKNOWN/VERIFYING → VERIFIED_SUCCESS/VERIFIED_NOOP/SAFE_RETRY/DEFERRED/FAILED_RETRYABLE/FAILED_TERMINAL/CANCELLED. Legal transitions table-checked on every write; transition evidence persisted. UNKNOWN → ATTEMPTING does not exist.

IDEMPOTENCY: one active intent per target (per-account never-reengage); batch re-runs do not re-create terminal intents; exactly-once proven by fixture execution logs.

LEASE/CONCURRENCY: single-writer leases (O_EXCL), one executing worker per account; loser leaves intent SCHEDULED; crashed worker's lease expires and another worker recovers per state semantics.

UNKNOWN-OUTCOME RECOVERY: reconcile by verification READS only, never replay; timeout-after-success → read proves applied (VERIFIED_SUCCESS, zero re-executions) / proves absent (SAFE_RETRY) / inconclusive (honest UNKNOWN, DEFERRED).

CIRCUIT BREAKERS: scoped action/account/adapter/platform/tenant; consecutive failures / failure % / unknown % / verification failures / auth failures / 429 → open with machine-readable reason; half-open single probe; no execution after open breaker. X encodes the 2026-09-30 probe precedent (no probe inside cooldown).

WATCHDOG: observes policy violations, failure/unknown/verification-failure rates, budget anomalies, negative feedback; may reduce execution, open circuits, disable adapter/account, defer intents, roll back learned config. May NOT grant authority. SAFE_MODE exits are operator-only with provenance.

AUTOMATIC ROLLBACK: regression vs ACTIVE baseline triggers rollback; rollback is truthfulness correction (annotate, never delete; no auto-unlike).

JS EXECUTOR: fixtures only (Threads fake_threads_executor.js speaks the th-engage.js result protocol; X/IG/FB fixtures at the adapter boundary).
PYTHON EXECUTOR: real guard + harness on all four platforms (eligibility, authority, ledger, budgets, recovery are real code).

FIRST PLATFORM: facebook. FIRST ACTION: like.
LIVE EXECUTION: BLOCKED on all four (no credentials in this environment; Pig unreachable). Fixtures ONLY at the adapter boundary.

FILES ADDED: 4 platform deliverables under ~/workspace/skills/social-interdependence/{facebook,instagram,threads,x}/ (8 docs each + schemas + src/bin + fixtures + tests + references), README.md, tiktok-HELD.md. Full per-file lists in each builder's report above.
FILES MODIFIED: none (no production files touched; all tests on scratch state via env overrides).

TESTS: facebook 121/121, instagram 33/33 x3 runs, threads 28/28, x 134/134. All real, all green.
FAILURE-INJECTION TESTS: kill after decision/before intent, after claim/before execution, during request, after success/before verification, after verification/before recording (real process kills, zero-byte file reads, budget races across processes/threads, lease contention).
EVALS: guard-level replay/adversarial proofs inherited (replay-173 zero mismatches, adversarial 12/12); skill-level adversarial (lying adapter, timeout-after-success, tampered/stale envelope, stale capability, checkpoint spike, concurrent workers, budget race, identity ambiguity, saturation, negative-feedback spike, learner out-of-envelope proposals).

EVENT-AUTHORITY INTEGRATION: boundary marked in code on all four platforms; not implemented pending the forensic review. Stated precisely: intent creation, terminal transitions, and watchdog stops are the emission points; no independent social event database was created.

BLOCKERS: live credentials (all platforms); Pig reachability (FB/IG/Threads executors); X ceiling conflict (30 vs 10 likes/pass) needs Nolan's reconciliation; Event Authority forensic review; TikTok tripwire hold; Facebook staged engage.js deployment (owner call).

NEXT: (1) Nolan reconciles X ceiling conflict. (2) Live adapter proof per platform on the Pig. (3) First live Threads pass with honest evidence + guard record calls. (4) Facebook staged engage.js deployment decision. (5) Event Authority resolution, then wire marked boundaries. (6) TikTok: no action until hold clears.
