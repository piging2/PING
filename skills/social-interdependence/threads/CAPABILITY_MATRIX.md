# Capability Matrix - Threads

Single source of truth: `~/workspace/outreach/eligibility-data/action-capability.json`.
The harness never keeps a local copy; `si_policy.probe_capabilities()`
reads the file live at every pass and goes to safe mode on UNKNOWN.

## Threads capabilities (as of 2026-10-01)

| Action | Supported | Path |
|---|---|---|
| like | yes | Pig browser worker (`run_th_pass.sh` -> `th-engage.js` via CDP :9226); likes/unlikes detected by the "Unlike" svg title (already-liked is reported, never clicked) |
| comment | yes | same worker |
| repost | no | not attempted |
| follow | no | not attempted |
| DM | no | not attempted |
| publish post | no (out of engagement scope) | `threads-cli publish-post` is the post path and is NOT part of this skill |

## Constraint behavior

- If a candidate requests an unsupported action, the guard returns
  `PROVIDER_UNSUPPORTED` / `CAPABILITY_MISSING` at the highest
  precedence; the intent is ELIGIBLE_REJECTED and never dispatched.
- If the capability data file is unreadable, `probe_capabilities()`
  returns UNKNOWN and the cycle enters safe mode: reads continue, new
  mutations stop.
- The adapter validates every job against the probed capabilities
  before invoking any executor (`assert_adapter_result_within_bounds`);
  a capability-violating result opens the adapter breaker.

## Executor matrix

| Environment | Executor | Notes |
|---|---|---|
| This sandbox / tests | `fixtures/fake_threads_executor.js` | speaks the adapter protocol; adversarial modes for tests |
| Operator host (Pig-reachable) | `SI_THREADS_EXECUTOR=pig` -> `~/workspace/pig-fb/run_th_pass.sh` | authority gate -> scp job -> CDP worker in its OWN window -> result JSON |
| threads-cli | read-only surface | usable for discovery reads, never for engagement dispatch |

## Why likes/comments go through the Pig, not an API

There is no public Threads write API for engagement on this account.
The durable deployment pattern (proven by `th-engage.js` discovery) is
the Pig's CDP-driven browser worker with its own window, tab hygiene,
and live-targeted selectors. The skill's executor boundary exists to
hold exactly that pattern; see `references/REF_THREADS_EXECUTOR.md`.
