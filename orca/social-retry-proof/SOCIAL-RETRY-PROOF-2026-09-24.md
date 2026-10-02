# Social/Campaign Retry-Safety Proof — 2026-09-24

Scope: action-specific retry safety for social/campaign publication (effect
classes 05c/05d/09). Bounded worker run in the ops + effect-port lane.
The live engagement machinery was NOT touched: no real likes, comments,
posts, or publishes on any platform. All provider interactions went to stubs.

Artifacts (all on the Pig, untracked scratch, not committed):
- `/home/nolan/workspace/orca/social-retry-proof/stub_providers.js`
- `/home/nolan/workspace/orca/social-retry-proof/retry_predicates.js`
- `/home/nolan/workspace/orca/social-retry-proof/harness.js`
- `/home/nolan/workspace/orca/social-retry-proof/run_proof.js`
- `/home/nolan/workspace/orca/social-retry-proof/evidence.json`
- `/home/nolan/workspace/orca/social-retry-proof/SOCIAL-RETRY-PROOF-2026-09-24.md` (this file)

Code under test (read-only; branch NOT modified):
- `/home/nolan/ping/ping-runtime/orchestration/effect_adapters/` on branch
  `feat/orca-unknown-outcome-port` @ `483b39a80`:
  `adapter_core.js`, `class_05c_threads.js`, `class_05d_instagram.js`,
  `class_09_campaign_publication.js`
- Real A6 foundation: `ping-runtime/orchestration/effect_reconciler.js`
  (EffectReconciler, EffectExecutor, deriveOpKey). The harness asserts
  `foundationSource === 'sibling'` at startup and refuses the shim.
- Spec: `~/workspace/orca/effect-classes/09-campaign-publication.md`.
  (`05-social-publishing.md` does not exist locally; 05c/05d semantics were
  taken from the adapter headers and the adapter test contract.)

Method: the harness drives the REAL adapters (probe + retryPredicate via
`core.evaluatePredicate`) and the REAL `EffectExecutor` /
`EffectReconciler` against stub providers that model real provider
semantics. Crash points are SIGKILL-style: `hang-before-accept` (worker
never reaches the provider), `hang-after-accept` (provider mutation lands,
then the worker never returns: ack lost), `provider-error` (synchronous
provider throw). Executor dispatch timeout (300 ms) converts the hang to
`EFFECT_UNKNOWN` + `UnknownOutcomeError`, exactly the A6 unknown-outcome
path. Executor op keys were asserted byte-identical to the adapter-derived
op keys in every scenario (fail-fast on drift).

## The theorem

There is NO global retry boolean anywhere in the path. Retry safety is this
function, encoded explicitly per action type in `retry_predicates.js`:

```
retry_safe = f(effect class, provider semantics, current observed provider
               state, idempotency support, reconciliation evidence)
```

It takes no boolean `retry` flag. The decision is a pure function of the
five factors, dispatched per action to an explicit predicate.

## Per-action retry_safe semantics

| Action | Class | Provider semantics | Retry is safe ONLY when |
|---|---|---|---|
| threads.publish-post | 05c | create; no provider idempotency key; duplicate publish = second post; no delete endpoint | probe proves non-existence (healthy own-post list, no byte match of approved text) AND new explicit approval for a new invocation AND frozen snapshot unchanged |
| instagram.post (feed/story) | 05d | create; no idempotency; per-account daily publish limit | CLI-path probe proves absence (caption+media fingerprint miss) AND daily remaining > 1 AND snapshot frozen; CDP probe source rejected outright (degraded read path) |
| campaign.like | 09 | TOGGLE/INVERT on repeat: a second toggle on an already-liked post UNLIKES it | the like is issued ONLY when observed state differs from intended state; already-liked -> no-op/recover (never a second toggle); unreadable state -> HOLD; retry needs probe-absent + guard ELIGIBLE + intent resolved + no platform warning |
| campaign.comment | 09 | additive: re-post = second comment | probe proves comment absent + guard ELIGIBLE |
| campaign.page-publish | 09 | restricted (PAUSED) | NEVER: always HOLD_UNKNOWN; the pre-dispatch gate aborts before any provider call |
| campaign.delete-post | 09 (proposed, harness-encoded) | idempotent: already-gone = ok, never an error, never resurrects | reconcile via provider state query; target gone -> RECOVER_SUCCEEDED; target present -> SAFE_TO_RETRY; unreadable -> HOLD |
| campaign.update-post | 09 (proposed, harness-encoded) | version-bound: expected-version mismatch = conflict | adapter re-reads the target before update; content already matches -> recover; version drifted or target gone -> HOLD (abort, never force) |

The combined authorization rule enforced by the harness (`reconcileOp`):
an UNKNOWN op is re-dispatched ONLY when the class predicate returns
SAFE_TO_RETRY **and** the foundation `reconcile()` returns
`retry_authorized` with a recorded, non-empty reason. Every attempt >= 2
`EFFECT_DISPATCHED` must have a matching authorization entry whose class
evidence carries observed provider-state fields; the harness asserts this
globally per scenario (`checkNoUngroundedRetries`).

## Scenario verdicts (28/28 PASS)

Publish (05c Threads):

| ID | Crash point | Path | Provider mutating calls | Verdict |
|---|---|---|---|---|
| T-PUB-01 | hang-after-accept | probe delivered -> RECOVER_SUCCEEDED | publish x1, list x1 | PASS: exactly one post, no retry |
| T-PUB-02 | hang-before-accept | probe absent + new approval -> SAFE_TO_RETRY -> retry | list x1, publish x1 | PASS: exactly one post after authorized retry |
| T-PUB-03 | hang-before-accept, list degraded | probe inconclusive -> HOLD | publish x0 | PASS |
| T-PUB-04 | provider-error | EFFECT_FAILED (known) -> predicate HOLD (error before probe) | publish x0 | PASS: no transport retry |

Publish (05d Instagram):

| ID | Crash point | Path | Provider mutating calls | Verdict |
|---|---|---|---|---|
| IG-PUB-01 | hang-after-accept | fingerprint match -> RECOVER_SUCCEEDED | publish x1, grid x1 | PASS: exactly one post, no retry |
| IG-PUB-02 | hang-before-accept, remaining=1 | probe absent but near daily limit -> HOLD | publish x0 | PASS |
| IG-PUB-03 | hang-before-accept, remaining=5 | probe absent + budget -> SAFE_TO_RETRY -> retry | publish x1 | PASS: exactly one post |
| IG-PUB-04 | hang-before-accept, probeSource=cdp | degraded path rejected -> inconclusive -> HOLD | publish x0 | PASS |

Like (09, toggle semantics):

| ID | Crash point | Path | Provider calls | Verdict |
|---|---|---|---|---|
| LIKE-01 | hang-after-accept | re-read liked -> RECOVER_SUCCEEDED | read-like x4, toggle x1 | PASS: one toggle, still liked, never unliked |
| LIKE-02 | none, pre-liked | pre-dispatch read -> no-op | toggle x0 | PASS: second attempt is a no-op, never an unlike |
| LIKE-03 | hang-before-accept | probe absent + green gates -> retry -> gate re-reads -> toggle | toggle x1 | PASS: exactly one toggle, final liked |
| LIKE-04 | hang-before-accept, read fails | probe inconclusive -> HOLD | toggle x0 | PASS |
| LIKE-05 | hang-before-accept, guard ALREADY_ENGAGED | discrepancy -> HOLD | toggle x0 | PASS |
| LIKE-06 | hang-before-accept, action_block | warning -> HOLD | toggle x0 | PASS |

Comment (09):

| ID | Crash point | Path | Provider calls | Verdict |
|---|---|---|---|---|
| CMT-01 | hang-after-accept | probe present -> RECOVER_SUCCEEDED | add-comment x1 | PASS: exactly one comment, no retry |
| CMT-02 | hang-before-accept | probe absent + green -> retry | add-comment x1 | PASS: exactly one comment |

Page publish (09): PUB-09 — pre-dispatch gate aborts (GATE_ABORT, definitive
non-retryable); predicate HOLD_UNKNOWN ("adapters must NEVER unpause it");
page-publish provider calls x0; no attempt-2 dispatch. PASS.

Delete (09 proposed):

| ID | Crash point | Path | Provider calls | Verdict |
|---|---|---|---|---|
| DEL-01 | hang-after-accept | query shows gone -> RECOVER_SUCCEEDED; explicit repeat delete -> ok/alreadyGone | read-post x3, delete x2 (1 real + 1 already-gone) | PASS: no error, no resurrection |
| DEL-02 | hang-before-accept | target present -> SAFE_TO_RETRY (idempotent) -> retry | delete x1 | PASS: target gone exactly once |
| DEL-03 | hang-before-accept, state unreadable | probe inconclusive -> HOLD | delete x0 | PASS |

Update (09 proposed):

| ID | Crash point | Path | Provider calls | Verdict |
|---|---|---|---|---|
| UPD-01 | hang-after-accept | content matches -> RECOVER_SUCCEEDED | read-post x3, update x1 | PASS: exactly one update |
| UPD-02 | hang-before-accept, external edit to v2 | version drift -> HOLD (abort) | update x0 | PASS: external content untouched |
| UPD-03 | hang-before-accept, version clean | probe not-delivered + version bound -> retry | update x1 | PASS: exactly one update |

Reconcile racing (real foundation path): RACE-01 — a rival EFFECT_HELD
injected between the reconciler's two history queries ->
`deferred_to_existing_terminal` via `racing_reconciler_guard`. PASS.

No-global-retry-boolean:
- NOGLOBAL-01a: static scan of the four adapter/foundation sources plus the
  four harness files for global retry flags (`globalRetry|retryAll|
  allowRetry|retryEnabled|shouldRetry|forceRetry`, `retry = true`
  assignments): zero hits after excluding the scan's own pattern literals.
- NOGLOBAL-01b: same intent, same context, real class09 predicate:
  delivered -> RECOVER_SUCCEEDED, absent -> SAFE_TO_RETRY,
  inconclusive -> HOLD_UNKNOWN. All three differ.
- NOGLOBAL-01c: `retry_safe` takes the five factors, no boolean parameter;
  `campaign.like` with liked=false/true/null -> SAFE_TO_RETRY /
  RECOVER_SUCCEEDED / HOLD_UNKNOWN; unknown action -> HOLD_UNKNOWN.

## Key assertions (all proven)

1. One logical publish never becomes two posts merely because PING lost
   acknowledgement. T-PUB-01 / IG-PUB-01: provider created exactly one post
   across dispatch + crash + reconcile; the retry was refused because the
   probe proved existence.
2. One logical like never becomes an unlike. LIKE-01: one toggle total,
   final state liked. LIKE-02: pre-liked dispatch issued zero toggles.
3. No global retry boolean exists in the path (static scan: zero hits;
   variance demos: decisions vary with observed provider state).
4. No UNKNOWN -> RETRY except through `retry_authorized` with a recorded
   reason grounded in observed provider state (global per-scenario check:
   every attempt>=2 dispatch has an authorization entry with non-empty
   foundation reason + provider-state evidence; zero violations across all
   28 scenarios).

## Probe-vs-stub divergences (reported plainly)

- Stub CLI JSON shapes (`{posts:[{post_id,text}]}`,
  `{posts:[{caption,mediaManifest}]}`) mirror what the probes parse; the
  real CLI output shapes were not re-verified in this proof (live machinery
  untouched per task).
- Like-toggle semantics are modeled from the 09 spec Q6 (stated in the spec
  as a behavioral fact at MEDIUM confidence); the stub implements the
  spec's claim.
- Guard decisions (ELIGIBLE / ALREADY_ENGAGED / BLOCKED /
  UNKNOWN-UNCHECKABLE) were supplied as predicate context; the real
  `engagement-guard.py` was not executed (outreach machinery read-only).
- In-memory event store and ledger stand in for the UnifiedEventRuntime and
  pg; interface semantics were mirrored (snake_case payloads, first-writer-
  wins ledger, op_key grouping).
- Crash model: hang-then-dispatch-timeout stands in for SIGKILL; the
  executor's timeout path is the real A6 unknown-outcome path.

## FINDINGS (adapter discrepancies; not fixed per task)

- F1 (class_05c): `retryPredicate` documents `newApprovalWindow` as
  "must differ from the failed invocation" but never compares it; only the
  `newApproval` boolean is checked. A caller passing `newApproval: true`
  with the same window still gets SAFE_TO_RETRY. The documented constraint
  is unenforced.
- F2 (all classes): no dispatch-time pre-read gate exists in the ported
  adapters. The harness encodes the required gate (read provider state
  first for toggle/idempotent actions; issue only on difference; abort on
  unreadable state or version drift) and proves it, but in the ported code
  inversion safety at dispatch currently depends on machinery outside the
  adapters (engagement-guard history, driver discipline).
- F3 (class_09): DELETE and UPDATE have no predicates in the ported adapter
  set (`ACTIONS = like/comment/page-publish`). The delete/update predicates
  proven here are proposed semantics, verified in the harness but not
  ported.
- F4 (keystone, by design but load-bearing): the foundation's `decide()`
  authorizes retry on ledger-empty UNKNOWN (`probe_confirms_never_executed`)
  even when the provider effect landed. Demonstrated in T-PUB-01 and
  LIKE-01: the foundation returned `retry_authorized` while the post/like
  existed on the provider. The per-class provider probe is the gate that
  prevents the duplicate. The class layer is not optional; without it, the
  ledger-only view would double-publish.

## Gate-secret scrub

SECRET MATERIAL FOUND: NO

(Scrubbed: the proof dir, evidence.json, and /tmp leftovers. No credentials,
tokens, or secret material were introduced at any point; the harness uses
stub providers only.)
