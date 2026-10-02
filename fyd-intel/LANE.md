# TYPESAFE_JEV Decision Lane (Jev via direct TypeSafe API)

Standing contract. Cut over to direct TypeSafe 2026-09-27 ~16:25 MDT
(Nolan's directive: point the Jev client at TypeSafe, keep the OpenRouter
credential for the other model). Supersedes the 2026-09-26 OpenRouter
mapping below in the history section.

## The authoritative mapping

```
TYPESAFE_JEV
  -> provider = typesafe                   (direct, api.typesafe.ai)
  -> model    = jev-1.13.0                 (pinned Jev 1.13.0, not a router)
  -> mode     = decisions
  -> endpoint = POST https://api.typesafe.ai/v1/systemone
```

- `typesafe/jev-router` is a DIFFERENT product that routes to other models
  (it delegated to `openai/gpt-6-luna` on 2026-09-26). BANNED for this lane.
- `~typesafe/jev-latest` is a floating alias that tracks future Jev
  versions. BANNED for this contract. The direct catalog only lists
  `jev-latest` and `jev-preview`; the pinned `jev-1.13.0` build is served
  but unlisted (verified live 2026-09-27).
- Direct TypeSafe echoes the pinned model exactly, e.g. `jev-1.13.0`
  with no build suffix. Attestation accepts exactly that
  (`^jev-1\.13\.0$`), nothing else. Direct responses carry no `provider`
  or `id` fields; attestation skips the provider check when absent.

## History: OpenRouter mapping (2026-09-26, superseded)

```
TYPESAFE_JEV
  -> provider = openrouter
  -> model    = typesafe/jev-1.13
  -> mode     = decisions
  -> endpoint = POST https://openrouter.ai/api/alpha/decisions
```

OpenRouter echoed the model with a build-date suffix, e.g.
`typesafe/jev-1.13-20260917`. The Pig courier and its OpenRouter key
remain in place for the other model; TYPESAFE_JEV no longer uses them.

## Architecture (this is the fix for the real defect)

```
WORKLOAD -> LOGICAL INTELLIGENCE PROFILE -> MODEL CONTRACT
-> PROVIDER ADAPTER -> EXACT REQUEST -> RESPONSE ATTESTATION -> RESULT
```

Application code requests a LOGICAL PROFILE (`TYPESAFE_JEV`), never a
model string. There is no `--model` flag anywhere; attempting one is a
hard failure. Couriers are dumb: they POST the exact request handed to
them and know no models, endpoints, or profiles. The default courier for
`provider=typesafe` calls the direct API from this machine; the Pig
courier remains for other providers/models.
CALLERS WERE CHOOSING MODELS. That is over.

## What Jev is here

Jev is NOT the generative reasoning lane. It takes typed questions
(CHOICE / NOUL / SCORE) over a state and returns typed answers with
probabilities, not prose. No chat prompts, no prose expectations.

JEV OWNS: fast bounded semantic decisions.

- classification, policy judgment, routing among explicit options,
  claim/evidence verification, ambiguity triage, tool/action gating,
  confidence-based escalation.

DETERMINISTIC SOFTWARE STILL OWNS: hashing, schema validation, exact
matching, permissions, arithmetic, state transitions, execution,
deduplication, replay.

GENERATIVE INTELLIGENCE OWNS: writing, open-ended reasoning, research,
site composition, conversation.

## Secret handling (no new store)

- Direct TypeSafe calls use the stored `custom.typesafe` credential via
  the typesafe skill's authenticated request helper. The key is NEVER
  printed, logged, or passed as a process argument.
- The Pig-side OpenRouter path is unchanged for the other model: the key
  lives at `C:\Users\nolan\AppData\Local\hermes\.env` `OPENROUTER_API_KEY`,
  read from the .env file by the Pig-side courier only. Nothing in this
  cutover touches it.

## Authority boundary

- FYD/PING decides: context, evidence, capabilities, allowed tools,
  authority, approval requirements.
- Jev decides: one bounded semantic question, returning a typed decision
  with probabilities.
- Jev output is PROPOSAL/EVIDENCE. It never authorizes, approves, routes
  production work, mutates canonical state, or grants access.

## Refusals (zero provider calls)

`jev_ask.py` refuses before dispatch: lane STOPPED (DISABLED file),
purpose on the deterministic or generative blocklists, unknown purpose,
unreadable budget file, daily spend ceiling reached, missing/unknown
profile, caller model override, non-typed question. Exit codes: 2 usage /
contract, 3 purpose, 4 budget, 5 stopped, 6 attestation rejected.

## Budgets (see budgets.json)

- Per day: $5.00 USD ceiling across the lane, enforced from
  `jev-decisions.jsonl` before dispatch. Conservative per-call estimate
  $0.001 (measured ~$0.00001-$0.00003 per decision).
- Stop conditions: daily ceiling hit, non-200 provider response, failed
  attestation. NO SILENT FALLBACK. A failed attestation means DO NOT
  CONSUME THE DECISION.

## Response attestation

Before any decision is consumed, `jev_contract.attest` verifies the
response model matches the pinned Jev family/build and the provider is
TypeSafe. Anything else (router, Luna, latest alias, missing model, no
answers) -> ATTESTATION_REJECTED, recorded in the ledger, not consumed.

## Decision record (jev-decisions.jsonl, metadata only)

logical_profile, requested_model, response_model, provider, request_id,
question_id, decision type, answer (choice/probabilities/confidence or
noul or score), state_sha256 (never raw state), instructions, latency_ms,
input_tokens, output_tokens, cost_usd, status. No credentials, ever.

## Files

- `model_contract.json` — the single authoritative profile->model mapping
  and ban list. The only place a model slug is chosen.
- `jev_contract.py` — resolve_profile / build_request / attest.
  Fail-closed contract logic.
- `test_model_contract.py` — 17 contract proofs (exact mapping, != router,
  != latest, missing/unknown -> FAIL, override -> FAIL, unexpected model ->
  FAIL, build-suffix echo accepted).
- `jev_ask.py` — local launcher (replaces the deleted `jev-ask.sh`).
  Profile-only CLI, purpose gating, budget gate, courier dispatch,
  attestation, ledger.
- `test_jev_ask.py` — 8 launcher proofs (every refusal path makes zero
  provider calls; success path sends the exact request and ledgers it).
- `jev-decide.ps1` — Pig-side courier (deployed to
  `C:\Users\nolan\.local\share\pigi\`). POSTs the exact request, returns
  the raw response. No model strings, no decisions.
- `budgets.json` — spend policy only.
- `jev-decisions.jsonl` — decision ledger.
- `spend-ledger.jsonl` — RETIRED chat-era history (2026-09-26 router calls).

## History

- 2026-09-26 16:36: lane created on `typesafe/jev-router` (chat).
- 2026-09-26 16:39: end-to-end chat proof passed (routed to Luna).
- 2026-09-26 ~17:30: Nolan STOPPED the lane: the routing proof was
  invalid (requested jev-router, got Luna). Root cause: no logical
  profile, no mapping, no response check; callers chose models.
- 2026-09-26 ~17:40: Nolan supplied the authoritative mapping
  (typesafe/jev-1.13 exists live; Decisions API documented). Contract
  rewritten, tests written, router worker deleted from the Pig.
- 2026-09-26 17:42: ONE live canary on the Decisions API: requested
  `typesafe/jev-1.13`, response `typesafe/jev-1.13-20260917` from
  provider TypeSafe, typed choice decision, 301 ms, $0.0000133. No Luna,
  no router, no fallback. Lane re-enabled.
