# ADAPTERS-README.md — ORCA P0 effect-class adapter layer

## Where this lives and where it is going

Staging: `~/workspace/orca/port/effect_adapters/` (this directory).
Target: `/home/nolan/ping/ping-runtime/orchestration/effect_adapters/` on
branch `feat/orca-unknown-outcome-port`. The target repo was not reachable
from this build machine, so the layer was built against the pinned A6
contract and staged here. Moving it is a directory copy; the code already
assumes the target layout (see "Foundation seam" below).

## Why this exists

The PING gateway has no write endpoints for connector effects
(`gateway/routes/connectors.js` is introspection/discovery/OAuth only).
Every real external mutation (cold emails, FB DMs, contact forms,
Threads/IG posts, engagement likes/comments) runs through agent-driven
skill CLIs or Pig browser automation OUTSIDE the gateway. This adapter
layer wraps the skill-CLI / agent boundary per effect class, giving each
logical external effect a canonical op id, a probe, and a retry predicate
wired to the A6 unknown-outcome foundation.

## Foundation seam (read this before integrating)

CONFORMANCE VERIFIED 2026-09-24 against the real A6 foundation at
`ping-runtime/orchestration/effect_reconciler.js` (commit 36d401538,
branch `feat/orca-unknown-outcome-port`). Deltas found in the pinned
contract and fixed:

- `EffectReconciler` has NO static `emit`. Event emission on the real path
  requires a caller-injected `emit(type, payload)` bound to the
  UnifiedEventRuntime: `require('./adapter_core.js')({ emit })`. With the
  real foundation loaded and no emit injected, escalateHold/recordOutcome
  FAIL LOUD instead of silently writing shim events (a hold that never
  reaches the event store can never be swept or recovered).
- Real `deriveOpKey` takes `{ missionId, effect, input }` (not
  `effectName`). The core now delegates to `foundation.deriveOpKey` with
  `effect: effectName`, so adapter op keys are byte-identical to the
  EffectExecutor / EffectReconciler key space (asserted by test).
- The foundation exports no individual `EFFECT_*` constants; it exports
  `EFFECT_TYPES` (a Set). The seam asserts the full pinned export contract
  at load and refuses to silently shim a corrupt foundation.
- Event payloads use the A6 snake_case schema (`op_key`, `mission_id`,
  `effect`, `attempt`, `reason`, `consequence`, `result`, `error`,
  `retryable`, `evidence`); the reconciler sweep groups by
  `payload.op_key`, and `consequence` drives its hold/retry decision.
- `recordOutcome` mapping on the real path: RECOVER_SUCCEEDED ->
  EFFECT_SUCCEEDED (carries `result`); RECOVER_FAILED -> EFFECT_FAILED
  (definitive failure, retryable:false); SAFE_TO_RETRY -> NO terminal
  event (the op stays open; the next dispatch emits EFFECT_DISPATCHED).
  Held ops stay sweepable and can still RECOVER on new evidence via the
  reconciler, not via the adapter.
- Deliberate policy delta (not a bug): the class predicates HOLD on any
  inconclusive probe regardless of consequence, which is stricter than the
  reconciler's unknown + low-consequence + attempts-left bounded retry.
  These effects are irreversible (duplicate cold email = reputational
  harm), so the adapter layer stays conservative; the reconciler's
  bounded-retry rule still governs ops the adapter never sees.

- `adapter_core.js` is a factory: `require('./adapter_core.js')({ foundation, emit })`.
  `foundation` is normally resolved automatically: explicit injection,
  then `require('../effect_reconciler.js')` (the sibling module, the layout
  this directory ships in), then the shim.
- If no foundation is reachable, a clearly-marked local SHIM backs the
  ledger and emits `[ADAPTER-SHIM-EVENT]` JSON lines tagged `shim:true`.
  The shim is NOT canonical and is TEST-ONLY; it exists so adapters stay
  testable off the Pig. `core.foundationSource` reports
  `injected` | `sibling` | `shim` so callers can assert which backing is
  live.

## Per-class Q1-Q8 summary

### Class 08 — message execution (cold email / FB Page DM / contact form)
- Q1 identity: `msg:v1:<channel>:<normalized-recipient>:<action-type>:t<touch-seq>`,
  content snapshot bound via canonical(input). Email recipients lowercased.
- Q2 provider key: NONE on all three channels.
- Q3/Q4 probe: email = Gmail Sent `in:sent to:<addr>` (ground truth, captures
  message id); FB DM = thread re-read for sent text (partial, no platform
  id); forms = local state only (no meaningful probe).
- Q5 reversible: NO for all three. Prevention + truthful recording only.
- Q6 UNKNOWN: sent but receipt unverified. Blind retry = duplicate cold
  email = irreversible reputational harm.
- Q7 retry safe: probe proves non-delivery AND send-eligibility.py exits 0
  AND no open intent in action-intent-ledger AND retry is not a 4th touch.
- Q8 HOLD: inconclusive receipt, eligibility non-zero (1/2/3), structured
  state vs notes discrepancy, ladder cap reached, review-triggered while a
  ladder is active, probe failure (never a false negative).

### Class 05c — Threads publish-post
- Q1 identity: hash(approved text + media manifest + account + approval window).
- Q2 provider key: NONE. Verbatim skill rule encoded: zero transport
  retries; a failure is terminal and ambiguous; any later attempt is a new
  invocation with a new explicit approval.
- Q3/Q4 probe: own recent/top posts in the attempt window, exact byte match
  of the approved text.
- Q5 reversible: NO (no delete endpoint).
- Q6 UNKNOWN: post may be live on a public profile; retry risks a permanent
  public duplicate.
- Q7 retry safe: healthy provider + no byte match + NEW explicit approval
  for the new invocation + unchanged frozen snapshot. Never retry on a
  provider error before the probe.
- Q8 HOLD: inconclusive probe (list fetch failed, pagination ambiguous,
  degradation); no new approval; snapshot drift; no snapshot supplied.

### Class 05d — Instagram post-feed / post-story
- Q1 identity: account + approved media manifest + caption hash.
- Q2 provider key: NONE ("Do not use --retries for posting"; daily publish
  limit is a rate bound, not dedup).
- Q3/Q4 probe: CLI read path ONLY (`instagram-cli posts`, post grids /
  post --id). The browser CDP path is degraded (no /p/ or /reel/ anchors
  since 2026-09-21) and is REJECTED outright by the probe.
- Q5 reversible: PARTIAL (stories self-heal in 24h; feed delete not a listed
  capability, never assumed).
- Q6 UNKNOWN: possibly-live public media; duplicate burns daily-limit budget
  and shows on the brand account.
- Q7 retry safe: definitive CLI-path absence AND daily-limit budget with
  remaining > 1 AND unchanged frozen snapshot.
- Q8 HOLD: ambiguous probe, unknown budget, near the daily limit, snapshot
  drift.

### Class 09 — campaign publication (engagement likes/comments; Page publishing)
- Q1 identity: `engage:v1:<platform>:<action>:<account>` + post ref, pass_id,
  intent_id, and the FB page descriptor (the guard's within-pass dedup keys
  on it; descriptors must be unique per post per job).
- Q2 provider key: NONE; all dedup is bolted on externally.
- Q3/Q4 probe: re-visit the post (like button in liked state = present);
  re-query comments. `action-truth.jsonl` already separates worker claims
  from independent verification.
- Q5 reversible: PARTIAL (unlike/delete exist but are visible signals; no
  automated compensation).
- Q6 UNKNOWN: may or may not have landed, with explicit UNKNOWN_EXECUTION
  intent states. Likes TOGGLE: a blind retry of an unconfirmed like can
  UNLIKE, inverting the effect. Retry here is worse than redundant.
- Q7 retry safe: probe proves absence AND engagement-guard.py returns
  ELIGIBLE AND the in-flight intent is resolved (not UNKNOWN_EXECUTION).
- Q8 HOLD: open UNKNOWN_EXECUTION intents; guard UNKNOWN-UNCHECKABLE
  (exit 3, fail closed); any platform warning (checkpoint/action
  block/rate limit -> minimum volume, 14-day hold); page-publish actions
  ALWAYS (Page publishing is PAUSED; adapters never unpause it).

## Predicate truth tables

Decisions: SAFE_TO_RETRY | HOLD_UNKNOWN | RECOVER_SUCCEEDED | RECOVER_FAILED.

Class 08 retryPredicate(probe, ctx):
| probe outcome | eligibility | open intent | touchCount | other | decision |
|---|---|---|---|---|---|
| delivered | any | any | any | | RECOVER_SUCCEEDED |
| inconclusive | any | any | any | | HOLD_UNKNOWN |
| not-delivered | != 0 (1/2/3) | any | any | | HOLD_UNKNOWN |
| not-delivered | 0 | true | any | | HOLD_UNKNOWN |
| not-delivered | 0 | false | >= 3 | | HOLD_UNKNOWN (never a 4th touch) |
| not-delivered | 0 | false | < 3 | review-triggered + ladder active | HOLD_UNKNOWN |
| not-delivered | 0 | false | < 3 | | SAFE_TO_RETRY |

Class 05c retryPredicate(probe, ctx):
| probe outcome | providerErrorBeforeProbe | newApproval | frozenSnapshotMatches | decision |
|---|---|---|---|---|
| delivered | | | | RECOVER_SUCCEEDED |
| inconclusive | | | | HOLD_UNKNOWN |
| not-delivered | true | | | HOLD_UNKNOWN |
| not-delivered | false | false | | HOLD_UNKNOWN (verbatim zero-retries rule) |
| not-delivered | false | true | false | HOLD_UNKNOWN |
| not-delivered | false | true | true | SAFE_TO_RETRY (new invocation, same frozen snapshot) |

Class 05d retryPredicate(probe, ctx):
| probe outcome | dailyLimit.remaining | snapshotMatches | decision |
|---|---|---|---|
| delivered | | | RECOVER_SUCCEEDED |
| inconclusive | | | HOLD_UNKNOWN |
| not-delivered | unknown | | HOLD_UNKNOWN |
| not-delivered | <= 1 | | HOLD_UNKNOWN (near-limit) |
| not-delivered | > 1 | false | HOLD_UNKNOWN |
| not-delivered | > 1 | true | SAFE_TO_RETRY |

Class 09 retryPredicate(probe, ctx):
| action | probe outcome | intentState | guardDecision | platformWarning | decision |
|---|---|---|---|---|---|
| page-publish | any | | | | HOLD_UNKNOWN (never unpause) |
| like/comment | delivered | | | | RECOVER_SUCCEEDED |
| like/comment | inconclusive | | | | HOLD_UNKNOWN |
| like/comment | not-delivered | UNKNOWN_EXECUTION | | | HOLD_UNKNOWN |
| like/comment | not-delivered | resolved | != ELIGIBLE | | HOLD_UNKNOWN |
| like/comment | not-delivered | resolved | ELIGIBLE | set | HOLD_UNKNOWN (14-day hold) |
| like/comment | not-delivered | resolved | ELIGIBLE | none | SAFE_TO_RETRY |

## Port laws encoded (and where)

1. Timeout is an observation, never an outcome: `probeWithTimeout()` in
   adapter_core.js resolves timeouts to inconclusive probes with an explicit
   observation record. Spotify now-playing rule generalized.
2. Never "retry the intent": `evaluatePredicate()` requires a fresh probe
   result; retry-safety is probe-state-dependent per action type (SEND harm
   vs LIKE inversion are encoded in the class predicates, not in shared
   code).
3. Placeholder success = no evidence: `assertProbeEvidence()` treats
   `{success:true}` / `delivered` without evidence fields as no-evidence.
4. FB Marketplace rule 19 pattern: any failed write with an ambiguous probe
   resolves to HOLD + human surfacing, never a silent retry (encoded in all
   four predicates' inconclusive branches).
5. Identity: `deriveOpKey()` / `deriveAttemptKey()` — caller-supplied,
   attempt-derived keys only; no wall-clock, no randomness. The three known
   repair sites are listed in REPAIR-NOTES.md (not modified here).

## Integration points (consume, never modify)

- `~/workspace/outreach/send-eligibility.py` — class 08 consumes its exit
  codes 0/1/2/3 via `runEligibilityCheck()`; proposal for the UNVERIFIED
  branch wiring is in INTEGRATION-CLASS08-PROPOSAL.md (REVIEW-REQUIRED).
- `~/workspace/outreach/engagement-guard.py` — class 09 consumes
  `check` decisions via `runGuardCheck()`; never rewrites the guard.
- `~/workspace/outreach/action-intent-ledger.jsonl` — class 08 reads open
  intents via the injected `readOpenIntents` dep (default reports
  unknown=true so a missing reader can never green-light a send).
- Skill CLIs (`hatch_gws_cli`, `threads-cli`, `instagram-cli`) — probes
  shell out via argv arrays through injectable `exec` deps; tests stub them.
- A6 foundation (`effect_reconciler.js`) — injected or auto-required from
  `../effect_reconciler.js` at the target layout; shim otherwise.

## Open gaps

- The A6 foundation module did not exist at build time; the pinned contract
  is implemented but real API conformance must be re-verified when the
  sibling module lands (rerun tests with `{ foundation }` injected).
- FB DM thread reader and form local-state reader are caller-injected deps;
  production implementations live on the Pig (CDP) and in the outreach
  tree respectively (see the integration proposal).
- Class 08 FB DM probe confidence is MEDIUM (thread re-read is inferred
  from verification practice, not a dedicated probe script).
- Like-toggle inversion semantics are stated as platform behavior to
  verify; the adapter treats them as true (fail closed).
- Threads/IG daily-limit and provider-health readers are caller context,
  not yet wired to live sources.
- Class 05a/05b/05e-05i (Gmail generic, Calendar, X, Marketplace,
  Messenger, Spotify, Kit) are surveyed but have no adapter modules yet;
  this lane covered 08, 05c, 05d, 09 per scope.

## Tests

`node --test tests/run_tests.js` from this directory. 31 tests, no
dependencies. Covers op-key determinism, canonicalization, attempt-key
derivation, no-wall-clock identity, placeholder-success rejection,
timeout-as-observation, predicate truth tables for all four classes, the
FB page-descriptor uniqueness rule, and a full probe->predicate->hold
loop on the shim ledger.

SECRET MATERIAL FOUND: NO (verified by scan; see commit notes).
