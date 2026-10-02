# Falsifier F2: LIVE :3100 deployment attack (2026-09-27 ~13:35 MDT)

Independent falsification of W3's claims. Transport HEALTHY throughout (ssh pigwsl hop). :3200, HPP, Vercel, main/master untouched. No approval, no application, no restart of :3100.

## Verdict summary

| Check | Verdict |
|---|---|
| 1. Build fidelity (served = branch, fresh build, right PID) | PASS |
| 2. Journal chain (9 events, content-derived ids, digests byte-match) | PASS |
| 3. Live idempotency retry | PASS |
| 4. Live concurrency (2 and 10 concurrent) | PASS |
| 5. Negatives (bad key, evil tenant, identity_5) | PASS with caveat |
| 6. Proposal validation gap | CONFIRMED (gap is real; W4's problem, not fixed) |
| 7. Projection GET /api/mc/missions/mc-m-c5b2c89b4ff7 | PASS |

## 1. Build fidelity: PASS

- Deployed source hashes on the Pig (`/home/nolan/projects/ping`):
  - `src/app/api/mc/dispatch/route.ts`: `c444cbffeb2fa011cdcd29b0de8f7123fc53b85080c023f9cae25eed13a45cb1`
  - `src/app/api/mc/_lib/mc-dispatch.ts`: `6595a1b7784155d1fdd726dcc2b3744f5f1d247edda39fdd9a5727fa446c139a`
- Branch verification note: the files are NOT at `src/app/api/mc/dispatch/route.ts` on branch `p0/front-door-idempotency`; they live at `lane-p01/tree/src/app/api/mc/dispatch/route.ts` and `lane-p01/tree/src/app/api/mc/_lib/mc-dispatch.ts`. Their branch hashes match the deployed hashes byte for byte, exactly W3's claimed digests. W3's report omits the `lane-p01/tree/` path prefix but the hashes are correct.
- `.next/server/app/api/mc/dispatch/route.js` built 2026-09-27 13:23:53 -0600 (BUILD_ID 13:24:21), contains the idempotency logic (`duplicate_suppressed` marker present). No stale 2026-09-26 build.
- Listener: PID 39185 (`next-server (v15.5.24)`, started 13:26:15 MDT) holds :3100. `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1` live in its environ.

## 2. Journal chain: PASS

- Lines 43-51 of `/home/nolan/workspace/fyd-journal-gateway/events.jsonl`, aggregate `mc:mission:mc-m-c5b2c89b4ff7`: exactly 9 events in causal order (CREATED, RUN_QUEUED, EXECUTION_STARTED, AGENT_AUTHORIZED, 4x ARTIFACT_PUBLISHED, RUN_SUCCEEDED).
- Event_ids independently recomputed: derivation is `mc-d-` + first 12 hex of sha256(`dispatch|mission_id|event_type|summary`), taken from the deployed `mintEventId` in mc-dispatch.ts. All 9 recomputed ids MATCH the recorded ids.
- All 4 artifact sha256 digests match the on-disk files byte for byte: prompt.txt `b591b740...`, workorder.json `3a9bec99...`, context.json `139d3478...`, result.json `596ac543...`. `prompt_digest` in MC_MISSION_CREATED also equals prompt.txt's digest.
- Evidence fields in MC_RUN_SUCCEEDED: host pig-wsl, model qwen2.5-coder:1.5b, startedAt/endedAt 19:27:30.760Z/19:27:40.686Z (~10s execution). No stub.

## 3. Live idempotency: PASS

- Re-POSTed W3's own payload file (`/tmp/p0-payload.json`, byte-identical): HTTP 200, `duplicate_suppressed: true`, `mission_id: mc-m-c5b2c89b4ff7`, journal 51 lines before and 51 after. Zero new side effects.

## 4. Live concurrency: PASS

- 2 concurrent identical POSTs (new key `f2-concurrency-probe-20260927`, prompt "F2 concurrency probe - ignore"): both returned the SAME mission id `mc-m-f09c98fbdb11`; one SUCCEEDED, one HOLD ("previous dispatch for this mission is in-flight (no terminal event); refusing duplicate dispatch"). Journal 51 -> 60 (exactly 9 new lines, one mission chain). One execution.
- 10 concurrent identical POSTs (new key `f2-concurrency-probe10-20260927`): all 10 returned the same mission id `mc-m-bb747d9b147e`; 1 SUCCEEDED + 9 HOLD. Journal 60 -> 69 (exactly 9 new lines). Exactly one mission, one execution.

## 5. Negatives: PASS with caveat

- Empty idempotency key -> HTTP 400 `bad_idempotency_key`. Key with illegal chars ("bad key!") -> 400. 129-char key -> 400. All pre-dispatch, zero journal lines.
- tenant=evil-tenant -> HTTP 400 `bad_tenant`, detail "tenant must be one of: happy-place, coppersmith-plumbing."
- agent=identity_5 -> HTTP 403 `agent_denied` ("agent 'identity_5' is not dispatchable from Mission Control"), not 500.
- CAVEAT: the contract accepts 1-char keys (1..128 chars), so my probe with key "x" was treated as VALID and executed a real probe mission (`mc-m-669d8c808182`, SUCCEEDED, journal 69 -> 78). This was an extra unintended mission beyond the planned probes; it carried the "F2 negative probe - ignore" prompt, nothing was approved or applied. The 1-char-accepted behavior matches the stated validation rule, so it is not a bug in the route, but a falsifier probe cost a real dispatch.

## 6. Proposal validation gap: CONFIRMED

All four mismatches W3 flagged are real in `result.json` output (fenced JSON block):
- `objectOrder` is the integer `5`; the FYDPresentation contract defines `objectOrder?: string[]`.
- `featuredIds: ["Emergency Repairs"]` is a label, not a `ping.social.service` object id; no such object exists in the happy-place graph.
- No new `ping.social.service` object for Emergency Repairs was proposed (prompt asked for one with website_statement provenance).
- Surrounding prose mentions "tenants" and 24/7 availability; model-generated claims, not website statements, unverified.
- The deployed route validates ONLY fail-closed INPUT (idempotency key, tenant allowlist, agent allowlist, capability) before dispatch. Grep of both deployed files: no reference to proposal, SiteSpec, FYDPresentation, objectOrder, or featuredIds anywhere. The agent's output is digested (`output_digest`, `output_chars`) and published verbatim as an artifact; no validation step exists before recording. This is W4's problem; not fixed here.

## 7. Projection: PASS

- GET /api/mc/missions/mc-m-c5b2c89b4ff7 -> HTTP 200. Status SUCCEEDED; mission/run/execution/work_order ids all match the dispatch response; result.outcome `completed`; `output_digest` `7c21cc9c...` matches the dispatch response exactly; 4 artifacts each with matching sha256 + event id; 9-event list in order.

## Side effects (for the record)

- F2 probes created 3 scratch missions, all with clearly-marked "F2 ... probe - ignore" prompts, all SUCCEEDED, none approved or applied:
  - `mc-m-f09c98fbdb11` (2-concurrency probe)
  - `mc-m-bb747d9b147e` (10-concurrency probe)
  - `mc-m-669d8c808182` (1-char key probe, see check 5 caveat)
- Journal grew 51 -> 78 lines total; the P0 mission aggregate (lines 43-51) is untouched.
- No POSTs beyond the sanctioned budget: one byte-identical retry, 2+10 concurrency probes, 6 negative probes.
