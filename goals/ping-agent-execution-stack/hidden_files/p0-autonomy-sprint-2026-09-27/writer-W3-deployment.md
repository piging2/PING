# Writer W3: P0 deployment + REAL mission run (2026-09-27)

Single-writer deployment. No push, no merge, main/master untouched. :3200, HPP original, and Vercel untouched.

## Outcome

- **Mission ID:** `mc-m-c5b2c89b4ff7`
- **Terminal state:** SUCCEEDED (HTTP 200, `ok: true`)
- **Served :3100:** PID 39185, tree `/home/nolan/projects/ping`, fresh `.next` build 13:23-13:24 MDT, restarted via `/home/nolan/start-3100.sh`

## STEP 0: transport + ollama

- `echo 'echo PIG_OK' | pigwsl-exec.sh` printed PIG_OK (exit 0). Transport HEALTHY.
- Ollama on the Pig: `curl 127.0.0.1:11434/api/version` returned `{"version":"0.30.11"}`, rc 0. No TCP wedge; no restart needed.

## STEP 1: deploy

Served :3100 = PID 5943 (uptime 05:17) at `/home/nolan/projects/ping`, stale 2026-09-26 build, missing the idempotency fix and pointing at the then-missing shim (dispatch would 503).

Files deployed from branch `p0/front-door-idempotency` (found in the local `/home/hatch/workspace` repo; W1 commits `c28e6d4`/`f6a9302`, W2 commit `f4927a9`):

| File | Branch sha256 | Installed at |
|---|---|---|
| `src/app/api/mc/dispatch/route.ts` | `c444cbffeb2fa011cdcd29b0de8f7123fc53b85080c023f9cae25eed13a45cb1` | `/home/nolan/projects/ping/src/app/api/mc/dispatch/route.ts` |
| `src/app/api/mc/_lib/mc-dispatch.ts` | `6595a1b7784155d1fdd726dcc2b3744f5f1d247edda39fdd9a5727fa446c139a` | `/home/nolan/projects/ping/src/app/api/mc/_lib/mc-dispatch.ts` |

Deployed pair wholesale (the exact pair F1 falsified 8/8 and W2 proved e2e). Installed-hash verification passed on the Pig before rebuild.

Drift note (as W1 flagged): the branch extract is slightly NEWER than the served tree, `publishArtifact` gains a `tenant: string` param (used in the MC_ARTIFACT_PUBLISHED event_data). Grepped the served tree: no other `publishArtifact` callers outside these two files, and the two other importers of mc-dispatch (`api/mc/missions/route.ts`, `api/mc/missions/[id]/route.ts`) import only `loadJournalEvents, nowIso, projectMissions, JOURNAL_PATH`, all still exported. Environment constants identical between served and branch files (JOURNAL_PATH, ARTIFACT_ROOT, ADAPTER_SHIM).

- Backup of the pre-deploy served files: `/home/nolan/p0-deploy-backup-20260927/` (route.ts `75bae61d...`, mc-dispatch.ts `30241216...`).
- Adapter shim: `/home/nolan/workspace/mission-control/lane-d/adapter-call.js` exists, sha256 `12b3209f5c80e079585e56086a00d326a1fd1a4847e5d754458134ff2311bb23` (matches expected).
- Production journal dir `/home/nolan/workspace/fyd-journal-gateway/` exists (no mkdir needed).

## STEP 2: rebuild + restart

- `npm run build` on the Pig: BUILD_RC=0 (log `/home/nolan/p0-build-W3.log`). Compiled route fresh at `.next/server/app/api/mc/dispatch/route.js` 13:24.
- Restart ONLY via `/home/nolan/start-3100.sh`, non-PTY ssh, stdio on files (`/tmp/3100-restart-W3.log`): healthy, new PID 39185 listening on :3100, `/sites/happy-place` 200.
- `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1` confirmed live in PID 39185's environ. PASS.
- `GET /api/mc/missions` -> 200. PASS.

## STEP 3: the ONE real P0 mission

POST `http://127.0.0.1:3100/api/mc/dispatch` (payload transferred as `/tmp/p0-payload.json`, response `/tmp/p0-dispatch-response.txt`), sent exactly once at 13:27 MDT.

Request body:
```json
{
  "prompt": "Analyze my website and make emergency services more prominent.\n\nSITE CONTEXT (Happy Place Carpentry LLC, tenant happy-place):\nBusiness: Happy Place Carpentry LLC, licensed Oregon carpentry contractor (CCB# 254240), Adair Village OR. Area served: Benton, Linn, Marion, Polk Counties, Oregon. Phone +15412865190, email taylor@happyplacecarpentry.com.\nServices on the site (ping.social.service@1 objects): Repairs, Fencing, Painting, Drywall, Restoration. There is NO dedicated emergency service object; 'Repairs' is the closest match.\nTASK: Propose a concrete SiteSpec patch that makes emergency services more prominent on the homepage. Use FYDPresentation presentation fields only (heading, copy, featuredIds, hidden, objectOrder, hiddenObjectIds) inside the relevant FYDSection, and propose any new ping.social.service object for 'Emergency Repairs' with website_statement provenance.\nReturn ONLY a JSON object with keys: analysis (1-2 sentences), proposed_patch (SiteSpec page/section/presentation JSON), rationale (1-2 sentences). Do not include anything outside the JSON object.",
  "agent": "ollama",
  "tenant": "happy-place",
  "capability": "text.transform",
  "idempotency_key": "p0-happy-place-emergency-20260927"
}
```
(prompt 1081 chars, under PROMPT_MAX 2000; SiteSpec context from `src/fyd/sitespec/types.ts` presentation contract + `happy-place-graph.ts` fixture)

Response (HTTP 200, ~10s wall time):
```json
{
  "ok": true,
  "status": "SUCCEEDED",
  "mission_id": "mc-m-c5b2c89b4ff7",
  "run_id": "mc-m-c5b2c89b4ff7-r1",
  "execution_id": "mc-m-c5b2c89b4ff7-x1",
  "work_order_id": "df5e40348c2af920",
  "result_id": "f855f153c7be7800086d0cbe46ed3907cbbf5f441fa29e521825294e556f9989",
  "output_digest": "7c21cc9cde723c7e2249d9eea9282f6ca8a7990036de779fee319039cff98462"
}
```

Byte-identical retry (the single sanctioned re-verification, response `/tmp/p0-dispatch-retry.txt`): HTTP 200, `duplicate_suppressed: true`, same mission id, journal line count 9 before and 9 after (zero new side effects). Idempotency fix is live in production.

## STEP 4: evidence checklist

1. **MISSION CREATED: PASS.** Production journal `/home/nolan/workspace/fyd-journal-gateway/events.jsonl` lines 43-51 (51 lines total), aggregate `mc:mission:mc-m-c5b2c89b4ff7`. Line 43: `MC_MISSION_CREATED` (event_id `mc-d-c072646dead3`), event_data `{agent: ollama, tenant: happy-place, capability: text.transform}`.
2. **RUN CREATED: PASS.** Line 44: `MC_RUN_QUEUED` (run_id `mc-m-c5b2c89b4ff7-r1`); line 45: `MC_EXECUTION_STARTED` (execution_id `mc-m-c5b2c89b4ff7-x1`).
3. **EXECUTION ATTEMPT DURABLE: PASS.** Line 46: `MC_AGENT_AUTHORIZED` with `work_order_id: df5e40348c2af920`, issued through the REAL adapter: the route called `/home/nolan/workspace/mission-control/lane-d/adapter-call.js` (sha256-verified above), which loads the canonical vendor adapter `external_agent_adapter.js`. Work order artifact `/home/nolan/workspace/mission-control/artifacts/mc-m-c5b2c89b4ff7/workorder.json` shows the real envelope: principal `ping:external-agent-adapter`, constraints read_only/no_writes/no_network/no_canonical_events/no_mission_state_writes, deadline `2026-09-27T19:30:30.685Z`, attempt 1. No stub anywhere.
4. **AGENT STRUCTURED RESULT: PASS.** Line 51: `MC_RUN_SUCCEEDED` (event_id `mc-d-2a5c30815faa`). Result artifact `result.json` (sha256 `596ac543...` matches journal line 50): evidence `{host: pig-wsl, model: qwen2.5-coder:1.5b, startedAt 19:27:30.760Z, endedAt 19:27:40.686Z, capabilityPerformed: true}`, error null, verified_at `2026-09-27T19:27:40.687Z`, result_id matches dispatch response. Artifacts on disk: `prompt.txt` (`b591b740...`), `workorder.json` (`3a9bec99...`), `context.json` (`139d3478...`), `result.json` (`596ac543...`); all four on-disk sha256 digests match the journal MC_ARTIFACT_PUBLISHED entries byte for byte (lines 47-50).
5. **PROPOSAL: PASS.** `result.json` output contains a fenced JSON block that parses cleanly with keys `analysis`, `proposed_patch`, `rationale`. The proposed_patch carries FYDPresentation fields: heading, copy, featuredIds, hidden, objectOrder, hiddenObjectIds. NOT APPLIED (no approval machinery exists yet; application is the next writer's work).

`GET /api/mc/missions/mc-m-c5b2c89b4ff7`: PASS. Projects back status SUCCEEDED, all ids (mission/run/execution/work_order), result outcome `completed`, output_digest `7c21cc9c...` (matches dispatch response), 4 artifacts with sha256 + event ids, full 9-event list.

## Proposal summary (verbatim agent content, not applied)

analysis: "Adding an emergency repairs section on the homepage would not only enhance customer trust but also ensure they have access to the necessary support promptly."

proposed_patch:
```json
{
  "heading": "Emergency Services",
  "copy": "We understand that emergencies can cause immediate distress. Our team is available for emergency repairs 24/7, ensuring your property stays safe and secure during any natural disaster or other emergency situation.",
  "featuredIds": ["Emergency Repairs"],
  "hidden": false,
  "objectOrder": 5,
  "hiddenObjectIds": []
}
```

rationale: "Adding an emergency services section would not only enhance customer trust but also ensure they have access to the necessary support promptly. This would help reduce stress for tenants, especially during times of need."

Honest caveats for the next writer:
- `objectOrder` is the integer 5, but the FYDPresentation contract defines `objectOrder?: string[]` (object ids in display order). Contract mismatch; the patch is a proposal only, so no harm done, but it is not directly appliable as-is.
- `featuredIds: ["Emergency Repairs"]` names a label, not a `ping.social.service` object id; no such object exists in the happy-place graph.
- The prompt asked for a new `ping.social.service` object for Emergency Repairs with website_statement provenance; the agent did not produce one (presentation patch only).
- The surrounding prose (outside the JSON block) claims "tenants" language and 24/7 availability, which are model-generated claims, not website statements. The proposal was not verified against Ask FYD or the SiteSpec validator.

## Deviations from brief

- STEP 1 said to sync from branch `p0/front-door-idempotency`; the branch lives in the local `/home/hatch/workspace` repo (not on the Pig), and its tree extract is slightly newer than the served tree (tenant-param drift described above). Deployed the exact proven file pair wholesale instead of re-basing onto the served baseline; verified no other served-tree callers of `publishArtifact` and all existing mc-dispatch imports still resolve.
- The served tree's working copy has many dirty files (branch `fyd/sprint-integration-2026-09-24`); I touched only the two dispatch files and rebuilt. The dirty files were already in the served build from 2026-09-26 18:47, so the served behavior besides dispatch is unchanged.
- One `docker restart ollama` was NOT needed (ollama healthy at 0.30.11).
- No stop conditions hit: transport stayed healthy, build passed, flag live, probe 200, mission terminal SUCCEEDED on the first and only POST.
