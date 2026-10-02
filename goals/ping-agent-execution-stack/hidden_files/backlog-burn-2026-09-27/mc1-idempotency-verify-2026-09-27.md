# MC-1 verification: dispatch idempotency gap (2026-09-27 ~12:16 MDT)

READ-ONLY worker. No files modified in the workspace, no branches, no
commits, no pushes, no Pig contact, no HPP original contact, no
:3100/:3200 contact, no live-journal writes, no network calls to real
endpoints. Scratch work lived in /tmp/mc1-verify/ (ephemeral).

## Verdict

**MC-1 CONFIRMED**. Two byte-identical POSTs through the TS dispatch
route mint two distinct missions with zero dedupe and zero refusal. The
python front door (`mission_intent.py`) holds the opposite, certified
contract: tenant-keyed idempotency with fail-closed E2 refusal. The two
front doors diverge exactly as the recon claimed.

## TS side evidence (the route under test)

Exact quotes, character-for-character from the source tree:

- `~/workspace/lane-p01/tree/src/app/api/mc/dispatch/route.ts:256`:
  `const missionId = 'mc-m-' + sha256hex(['mission', agent, tenant, capability, promptDigest, ts].join('|')).slice(0, 12);`
  where `ts = nowIso()` is minted fresh per request two lines above
  (`route.ts:254-255`). The timestamp is inside the hashed identity
  material, so no two POSTs can ever produce the same mission id.
- `~/workspace/lane-p01/tree/src/app/api/mc/dispatch/route.ts:53-58`:
  `DispatchBody` accepts exactly `{prompt, agent, capability, tenant}`.
  There is no `idempotency_key` field anywhere in the request contract.
- `grep -n idempotency` over `dispatch/route.ts` and `_lib/mc-dispatch.ts`:
  zero hits. The word does not appear in the dispatch plane at all.
- The sibling's FYD panel, which posts through this route, is equally
  key-less: `patch/src/app/sites/_shared/mc-api.ts:130-138` POSTs exactly
  `{prompt, agent, capability, tenant}`. Its own doc comment admits the
  gap: `tenant-mission-control.tsx:23`: "POST has no idempotency key: the
  UI never blind-retries" -- UI convention, not a contract.

### Empirical run (real handler, scratch journal)

Harness: byte-identical copies of `route.ts` + `_lib/mc-dispatch.ts` in
`/tmp/mc1-verify/` (md5sums match originals), transpiled 1:1 with Node's
own `module.stripTypeScriptTypes`. The scratch copy of the LIB differs
from the original in exactly 3 lines (`diff` verified): the three
hardcoded Pig absolute paths (`JOURNAL_PATH`, `ARTIFACT_ROOT`,
`ADAPTER_SHIM`, mc-dispatch.ts:23-25) redirected to /tmp. `route.ts`
itself is byte-identical; the id-minting logic under test is untouched.
The adapter shim does not exist on this VM at all (no
`adapter-call.js` anywhere under ~/workspace), so a minimal stub in
/tmp answered `profiles`/`authorize`/`issue` with a fixed grant --
environment binding only, not the code under test. Documented in the
harness header (`/tmp/mc1-verify/harness.mjs`).

Two identical POSTs (same JSON body string, fresh Request each):

- POST #1 -> http 200, `mission_id: "mc-m-48c29845b49d"`
- POST #2 -> http 200, `mission_id: "mc-m-9874a11fdaca"`

Scratch journal (`/tmp/mc1-verify/journal/events.jsonl`): 16 events,
**2 x MC_MISSION_CREATED**, one per mission id, with IDENTICAL
`prompt_digest` (`c5ff42db1be778f9a33b18c9d5ddef7798fed4750c0f9a3bcccf94ed8fd1a7ad`)
-- the same intent bytes became two missions. `projectMissions` over the
scratch journal: 2 projected missions. Full lifecycle ran for both
(CREATED -> QUEUED -> EXECUTION_STARTED -> AGENT_AUTHORIZED -> artifacts
-> MC_RUN_FAILED). The FAILED terminal is the honest local outcome
(ollama unreachable at 127.0.0.1:11434 on this VM; nothing external was
called); the mission-creation and id-minting path under test ran
end-to-end.

## Python side evidence (the certified contract)

`~/workspace/mission-control/mission_intent.py`, Batch 6 certified:

- `:281` `canonical_intent_hash(intent)` -- content hash over the FULL
  canonical intent (intent_version, mission_class, actor, tenant,
  capability, event_bind, inputs_hash). Docstring: "Two intents hash
  equal exactly when their canonical bytes are identical."
- `:309` `_intent_collision(record, intent)` -- "True when a reused
  idempotency key carries different canonical intent bytes than the
  recorded acceptance: fail closed (E2)."
- `:1044` `submit()` -- `:1084` `find_intent_record(journal_file,
  intent["idempotency_key"], tenant=tenant)` (tenant-scoped: `:782`
  "the same key in another tenant is a different record"); `:1088-1092`
  collision -> `raise IntentDispatchError("idempotency key reuse with
  different canonical intent bytes ...: fail-closed (E2 collision
  safety)")`; `:1111-1143` no collision -> emits MC_CHECKPOINT
  `duplicate-suppressed` and returns the ORIGINAL dispatch record
  (`"outcome": "duplicate-suppressed"`, no second work order).

Live probe on a scratch journal (`/tmp/mc1-verify/journal/py-scratch.jsonl`,
never the live journal), driving the exact functions `submit()` uses:

- same key + same bytes: record found, `_intent_collision` -> False
  (would dedupe to the original record)
- same key + different bytes: `_intent_collision` -> True
  (would fail closed E2)
- same key, other tenant: no record found (tenant-scoped)
- `canonical_intent_hash` equal on identical bytes, different on
  changed bytes.

## Handoff note for the patch owner (sibling stream)

MC-1 is yours to fix; this worker changed nothing. The smallest delta,
per the recon's Gap 1, ported into the TS route:

1. Accept an optional `idempotency_key` in the POST body
   (`route.ts:53-58` `DispatchBody`; validated like the other fields).
   When absent, keep today's behavior (so existing callers don't break)
   but the FYD panel (`mc-api.ts`) should mint one per deliberate
   dispatch (UUID per form submission, NOT per retry).
2. Before minting the mission id (`route.ts:256`), look up the key in
   the journal scoped to `(tenant, idempotency_key)`. Reuse
   `mission_intent.py`'s `canonical_intent_hash` field list
   (intent_version, mission_class, actor, tenant, capability,
   event_bind, inputs_hash) so both front doors converge on one
   semantic -- the TS intent bytes are
   `(agent, tenant, capability, promptDigest)`; record them at
   acceptance.
3. Same key + same bytes -> return the original dispatch record
   (HTTP 200 with the original `mission_id`, plus a
   `duplicate: true` marker); do NOT mint, do NOT re-issue a work
   order, do NOT re-execute.
4. Same key + different bytes -> fail closed: HTTP 409, no mission,
   no work order (mirror `IntentDispatchError` E2).
5. Keep the journal as the idempotency ledger (no new store), same as
   the python side.

Falsification test for the fix (re-runnable against this worker's
harness pattern): two identical POSTs -> one mission id, one
MC_MISSION_CREATED; same key with different prompt bytes -> 409, no
second MC_MISSION_CREATED. Today the harness proves: two ids, two
created events, zero refusal.

Caveats for the fixer: the harness's stub adapter granted
authorization; on the Pig the real adapter decides. The duplicate
mission's `prompt_digest` equality (`c5ff42db...` on both events) is the
cleanest single-line evidence that identical intent bytes became two
missions. The retried-POST trigger is real: the FYD panel's 5s mission
poller (`tenant-mission-control.tsx:195`) is GET-only today, but
network retry / double-click / any future poller bug hits the POST
path, and nothing in the route stops it.

## Constraints observed

Read-only held: zero workspace modifications (verified `git status`
untouched -- no git operations run at all). No live journal touched:
all writes went to `/tmp/mc1-verify/journal/`; the live journal at
`~/workspace/fyd-journal-gateway/events.jsonl` was never opened for
write. No Pig writes (transport not attempted). No :3100/:3200, no HPP
original contact. No network calls beyond localhost connection-refused.

MC-1 CONFIRMED

## E2 falsification of the python front door (2026-09-27 ~13:50 MDT, backlog-burn subagent)

The MC-1 confirmation rested on code reading ("the python front door
dedupes + E2-refuses correctly"). Now proven empirically with
`mc-e2-falsify-2026-09-27.py` (real `mi.submit`, scratch journal, fake
executor, hermes constraints):

1. First submit → `dispatched`, executor called exactly once.
2. Identical resubmit (same key, same bytes) → `duplicate-suppressed`,
   executor NOT called again.
3. Same key + different canonical bytes → `IntentDispatchError`
   ("idempotency key reuse with different canonical intent bytes...
   fail-closed (E2 collision safety)").
4. Different key + same bytes → fresh `dispatched` (no false dedupe).

The python front door is PROVEN correct on dedup + E2. The defect is
isolated to the TS `route.ts` (no idempotency key accepted, `nowIso()`
in the mission-id hash). Fix ownership remains with the lane-p01 patch
owner.
