# ARCHITECTURE: social-interdependence/instagram

## Layering (what owns what)

```
discovery (adapter.read_state / read_profile)
  -> normalize (siig_decisions.normalize_candidate)
  -> guard plan filter (real engagement-guard.py: ELIGIBLE/INELIGIBLE/UNKNOWN)
  -> taste layer (priority_score; ranking only, never eligibility)
  -> decision record (siig_decisions.build_decision_record)
  -> intent (siig_states: 19-state machine, durable first)
  -> budget reserve (siig_budgets: atomic, 2h window, weekly ramp)
  -> dispatch refilter (live guard re-evaluation + evidence verification)
  -> lease (siig_leases: one executing worker per account)
  -> attempt (adapter.execute: the ONLY external mutation)
  -> verification read (siig_verify: independent read_state)
  -> canonicalize (guard history + relationship touch) or fail/unknown paths
```

Each layer may only say no. Authority flows downward from the gate; no
layer grants what a higher layer denied.

## Reused PING primitives (no new authorities)

This skill creates no scheduler, worker, policy, capability, or event
authority. It reuses the PING primitives named in the build order:
MissionRuntime, MissionScheduler, WorkerRuntime, CapabilityAuthority,
IdentityAuthority, HashAuthority, Witness, Lineage, Replay. The skill's
own files are mechanism, not authority: the state machine records
transitions, the guard decides eligibility, the budgets count, the
watchdog observes.

Event Authority is under forensic review: this skill marks the
persistence-integration boundary (where a PING event would be emitted)
and implements everything else. No independent social event database is
created.

## Module map (bin/)

| module | owns |
|---|---|
| siig_common | paths, env overrides, atomic JSON/JSONL IO, handle normalization, batch ids |
| siig_states | the 19-state machine, legal transitions, transition-evidence log, intent index |
| siig_guard | binding to the real engagement-guard.py and authority-check.py; plan filter, dispatch refilter, history recording |
| siig_budgets | atomic reserve/commit/release per 2h window; deterministic weekly ramp from 2026-09-26 |
| siig_leases | single-writer leases via O_EXCL; one executing worker per account |
| siig_breakers | circuit breakers on 5 scopes; half-open single probe; fail closed |
| siig_decisions | candidate normalization, country precision gate, prohibited targets, taste-layer priority, comment content policy (machine-checked) |
| siig_verify | read-after-write verification; lie/timeout/outage handling; negative-feedback signals |
| siig_watchdog | pass metrics, stop/defer/rollback; may never grant authority |
| siig_learner | bounded parameter learning; shadow -> canary -> active with machine gates; auto-rollback |
| siig_relationship | relationship touches, only at VERIFIED_SUCCESS |
| siig_adapter_contract | the dumb-adapter protocol and its exceptions |
| siig_executor | build_pass / execute_pass / reconcile / verify_pass orchestration |
| si-ig.py | CLI: plan, execute, reconcile, verify, lease test |

## Data flow of one intent

1. Discovery yields a candidate dict (handle, header, body, post_url,
   media_type, country, city).
2. `normalize_candidate` builds the vetting haystack (handle + header +
   body) and applies the country precision gate (Durango-MX vs Durango-CO
   class of error) and the prohibited-target list (owner orders, e.g.
   Monument View: no autonomous contact).
3. `plan_candidates` calls the real guard. ELIGIBLE candidates get a
   stamped envelope (sha256, 6h TTL). Anything else is dropped with the
   guard's reason codes.
4. `build_decision_record` adds the taste layer: priority_score from
   content features, content-policy check for comments, budget view,
   relationship context. A decision of DEFER or SKIP stops the intent.
   No opaque single AI score is used as authority; the record carries
   its factors.
5. The intent is persisted (intents.jsonl) BEFORE any external effect,
   then transitions INTENT_CREATED -> QUEUED -> SCHEDULED.
6. At dispatch, `dispatch_refilter` re-evaluates eligibility live and
   verifies the envelope (tamper, staleness, data digest). Refusal ->
   CANCELLED with the refusal evidence.
7. The worker acquires the account lease, transitions to DISPATCHED,
   then ATTEMPTING, then calls `adapter.execute`. That call is the only
   external mutation in the skill.
8. `verify_after_attempt` performs an independent `read_state` and
   compares observation against claim. Match -> VERIFYING ->
   VERIFIED_SUCCESS, then guard history recording and one relationship
   touch. Mismatch -> adapter-truth-mismatch, bounded retries, then
   FAILED_TERMINAL. Timeout/outage -> UNKNOWN, resolved later by reads.

## Invariants (machine-checked, not prose)

- NO_EXECUTION_WITHOUT_AUTHORITY: build and execute both start at the
  authority gate; anything but AUTHORIZED raises.
- NO_ACTION_WITHOUT_AUTHORIZED_ACCOUNT: identity must resolve to
  `nolanpigi`; auth-expired enters safe mode.
- UNKNOWN_NEVER_DISPATCHES: guard UNKNOWN and intent UNKNOWN both stop
  dispatch.
- NO_DUPLICATE_ACTIVE_INTENT: one active intent per handle
  (never-reengage is per account).
- NO_CANONICAL_SUCCESS_WITHOUT_VERIFICATION: relationship touches and
  guard history writes happen only at VERIFIED_SUCCESS.
- NO_MUTATION_REPLAY: reconcile resolves stranded intents by reads.
  UNKNOWN -> ATTEMPTING does not exist in the transition table.
- NO_FALSE_SUCCESS: a claim without an observed effect is a violation,
  never a success.

## Concurrency model

One executing worker per account, enforced by an O_EXCL lease file with
a TTL. A second worker that finds the lease held leaves the intent
SCHEDULED and moves on. Budget reservation is atomic under a lock file
(thread + fcntl), so concurrent passes cannot double-spend. The
`test_budget_race_single_winner` and `test_two_workers_one_lease` tests
prove both.
