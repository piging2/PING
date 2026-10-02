# Copilot Broker (skeleton v0.1.0)

Single-identity Copilot task broker for the Pig. WSL is the canonical
execution plane. This is the skeleton: classification, identity state, quota
model, cost model, JSONL failure classifier, credential boundary, CLI runner,
and deterministic tests. No N-account orchestration, no browser automation,
no new PING primitives.

## Layout

```text
copilot-broker/
  src/
    task-tiers.js          T0..T4, conservative classifier (T0/T1 never Copilot)
    identity-state.js      identity records, 8 states, atomic JSON store
    quota-model.js         server-authoritative quota, predictive eligibility
    cost-model.js          THE single cost-estimate module (versioned, labeled ESTIMATE)
    jsonl-classifier.js    8-way JSONL failure classification
    credential-boundary.js token scrubbing, redaction, no-token-in-state rule
    cli-runner.js          spawn copilot -p --output-format json --max-ai-credits N
    broker.js              dispatch: classify -> route -> execute -> evidence
    sdk-probe.js           Level-1 zero-quota verification
  scripts/
    authorize.sh           THE one human step (fresh-session OAuth + verify)
    post-authorize.js      zero-AI finalizer: quota, models, mark ACTIVE
    deploy-to-pig.sh       ship canonical copy to Pig WSL, npm install there
  fixtures/                8 deterministic JSONL fixtures (one per classification)
  test/                    node:test suites, zero real Copilot calls
  state/                   identities.json (created at runtime, never shipped)
```

## The authorize-once UX

```text
human:   bash ~/copilot-broker/scripts/authorize.sh [identity_id]
           -> a FRESH isolated Chrome window opens on the Pig
              (temporary profile, no saved GitHub login, your everyday
              profiles are never touched)
           -> you sign in to GitHub as the identity you want and click
              Authorize (one action); each run is a clean identity choice
Muse:    detects the callback, verifies auth, queries quota,
         discovers models, marks the identity ACTIVE, deletes the
         temporary session completely
human:   nothing else. No token copying, no config editing, ever.
```

Primary path is browser OAuth (`copilot login --web-flow`, loopback
callback captured by the CLI). The OAuth URL opens in a fresh temporary
Chrome profile launched as a visible window via the one-shot
`PigiOAuthFresh` scheduled task (InteractiveToken, same mechanism as
PigiPopBrowser, since a cross-session SSH caller cannot show interactive
windows). Because the profile starts with no GitHub session, each run is
identity-selectable and never silently reuses a previous login. The temp
profile, its Chrome processes, the one-shot task, and the `copilot login`
process itself are cleaned up on every path (success, timeout, failure,
Ctrl-C); the CLI kill on the EXIT trap prevents orphaned callback listeners
from holding their loopback port and blocking the next run's guard. Stale
residue from crashed runs is swept at startup, and a node-side deletion
guard refuses anything outside the session base (see `src/fresh-oauth-session.js`). The captured
authorize URL is validated fail-closed before the task is registered
(single-line https github.com authorize URL with all required OAuth
params; a truncated or polluted capture falls back to device code).
If the browser path is unavailable or times out, the script falls back to
the device-code flow. Test hook: `AUTHORIZE_TEST_WEBFLOW_ONLY=1`
exercises the web flow without the blocking fallback.

## Task tiers

T0/T1 run locally and never invoke Copilot. T2/T3/T4 are Copilot eligible
only when the identity passes predictive eligibility
(`quota_remaining >= estimated_cost + safety_reserve`, fail closed on unknown
or stale quota).

## Credential boundary

Broker state holds `identity_id` only. After `copilot login`, the CLI/SDK
resolves its own stored credential; the broker scrubs ambient token
overrides (`COPILOT_GITHUB_TOKEN`, `GH_TOKEN`, `GITHUB_TOKEN`) from every
child env so the stored identity is authoritative. See
`src/credential-boundary.js` for the investigated WSL keyring boundary.

## Verification levels

- Level 1 (this skeleton): `node src/sdk-probe.js` — CLI present, SDK
  imports, API surface, auth presence, quota RPC, model discovery. Zero AI
  calls, zero credits.
- Level 2 (later, explicit human approval only): one tiny bounded Copilot
  task with `--max-ai-credits` ceiling in an isolated workdir.

## Tests

```text
npm test   # node --test test/ : deterministic, mocked fixtures, no quota
```
