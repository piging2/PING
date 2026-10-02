# TRACK E - Falsification Report (fresh review)
Date: 2026-09-18 ~05:15-06:30 MDT (11:15-12:30 UTC)
Reviewer: TRACK E specialist (fresh, assumed nothing from prior sprint reports)
Worktree: /home/nolan/worktrees/ping-harvest-12h (Pig WSL, read-only)
Live targets probed: ping-gateway container, ping-postgres (crx_runtime), worktree code + re-ran suites on the Pig.

## Method
Every claim below was checked against the running system, not the sprint doc.
Code citations are worktree paths unless marked "live". Suites re-run live on the Pig where noted.

---

## SEVERE

### E1. /system/state (CockpitDashboard backend) reads the WRONG event store
The "3 honest widgets reflect live backend state" claim is FALSE for the dashboard.

- `ping-runtime/runtime/system_authority.js`: `collectPostgres()` calls
  `eventReadAuthority.getAllEvents(100000, 0)`; `collectMissions()` calls
  `getEventsByType('MISSION_CREATED', ...)`.
- `runtime/kernel/event_read_authority.js` (the real implementation behind the
  ping-runtime shim): `getAllEvents` and every sibling read query
  `FROM repository_events` (lines 39-340), NOT `ping_events`.
- Live DB counts (docker exec ping-postgres, crx_runtime):
  `ping_events` = 739 rows, `ping_missions` = 144, `knowledge_nodes` = 68,
  `repository_events` = 0, `events` = 0.
- `UnifiedEventRuntime.emit()` (the canonical spine, `ping-runtime/events/unified_event_runtime.js:172`)
  writes ONLY to `ping_events`. So the dashboard's event/mission counts are
  permanently 0 even with the worktree code deployed: total_events 0 vs 739 real,
  missions total 0 vs 144 real MISSION_CREATED in ping_events + 144 rows in ping_missions.
- Additionally `collectMissions()` hardcodes `queued: 0, executing: 0, failed: 0, blocked: 0`
  regardless of backend state (system_authority.js:209).
- Live check confirms the shape: `GET /system/state` returns
  `"postgres":{"total_events":0,...}`, `"missions":{"total":0,...}`,
  `"knowledge":{"knowledge_objects":0}` against the populated DB.
  (The live gateway runs pre-sprint code, see E2, but the wrong-store read is
  present in the worktree code too, so redeploying does not fix it.)

## HIGH

### E2. The live gateway runs PRE-SPRINT code; no sprint backend fix is deployed
- `docker inspect ping-gateway`: image `ping-gateway:devin-boundary2`, created 2026-09-16
  (sprint waves ran 2026-09-18).
- md5 mismatch worktree vs container /app:
  gateway_runtime.js `3356b359...` vs `e46f07c4...`;
  unified_event_runtime.js `76bcfda7...` vs `31d43523...`.
- Verified live consequences (curl to localhost:8080):
  - `GET /api/v1/timeline` -> 404 "Cannot GET /api/v1/timeline" (TimeMachine's backend absent;
    the route exists only in worktree `gateway/routes/timeline.js`, mounted in worktree boot).
  - `GET /knowledge` -> 404 (KnowledgeGalaxy backend absent live).
  - `GET /system/state` -> zeros (see E1), `knowledge_objects: 0` despite 68 live KG nodes.
  - `ping_events` has NO `sequence` column live (the "atomic sequence" DDL in
    `initialize()` only runs at gateway boot; gateway booted before the change).
  - Tables `social_drafts`, `proposed_actions`, `effects` do not exist live
    (`to_regclass` -> NULL for all three).
- No ui-next container is running on the Pig at all (`docker ps` shows only
  open-webui as web-ish). The "3 honest widgets" have no live deployment; the
  claim was verified statically/in tests only (the sprint doc itself notes at H79:
  "H70 verified by diff inspection, not live HTTP").

## MEDIUM

### E3. Accepted does NOT imply persisted: duplicate POST /events returns success, writes nothing
- `computeEventId({eventType, source, namespace, logicalId, payload})`
  (unified_event_runtime.js:33-38) hashes with NO timestamp and NO nonce.
- `emit()` step 5: `INSERT INTO ping_events ... ON CONFLICT (event_id) DO NOTHING`;
  on conflict it returns `{status:'ok', eventId, event, deduplicated:true}`.
- `gateway/routes/events.js` POST /events returns `{event_id, event_type, status:'ok'}`
  and drops the `deduplicated` flag. Two identical POSTs -> the second is HTTP-accepted
  but nothing is persisted; the caller cannot distinguish it from a fresh persist.
- Two distinct business events with identical payloads collapse into one row.
  (Idempotency may be intended, but the success response is indistinguishable from
  a real persist. Code-path verified; live POST not attempted - the route requires
  auth and no test credential was authorized for this task.)

### E4. KnowledgeGraph -> mission pipeline is write-only provenance (decorative compounding)
- `context_compiler.js:89,105`: `_retrieveKnowledgeRefs(namespace)` reads the live KG
  and sets `pack.knowledge_refs` (H69, real and wired).
- `ping-runtime/workers/canonical_workers.js:101-138` (ObservationWorker, H74) and
  `:164-201` (ClaimWorker, H76) propagate to `observation.context_knowledge_refs` /
  `claim.context_knowledge_refs` and downstream payloads.
- Counterexample: a tree-wide grep for READERS of `context_knowledge_refs` /
  `knowledge_refs` outside tests finds ZERO consumers that use the refs to make any
  decision. The lineage is emitted faithfully and read by nothing.
- The sprint's own waves admit this: H75 verdict "write-only provenance... no [consumer]
  fields to make a decision"; H77 "the pack is compiled but never consumed"; H78 now
  SKIPS pack compilation for every worker except "observation" (mission_scheduler.js:306-329),
  so the compounding surface is one worker's provenance field.
- Verdict: the KG feeds packs (real), packs feed lineage fields (real), but no mission-side
  behavior depends on them. "Context compounding" as improved decisions is unproven.

### E5. Approval is ROUTED, not ENFORCED at a gate
- `ping-runtime/approval/effect_authority.js:65`: `createEffect({proposedActionId,
  approvalId, ...})` records `approval_id` as a plain field. It never looks up the
  approval, never checks it is APPROVED (vs PENDING/REJECTED/expired).
- `ping-runtime/orchestration/event_to_mission_bridge.js:75-84` comment, verbatim:
  "Emitting these events still requires the established authorized human action -
  this map only routes arrivals." The bridge routes SNIPPET_APPROVED / SNIPPET_REJECTED /
  AI_RESPONSE_ACCEPTED / AI_RESPONSE_REJECTED -> KNOWLEDGE_PROMOTE missions; routing,
  not gating.
- Sprint's own H37 verdict: "no producer, approval doesn't move missions, no gated
  lifecycle state."
- Mitigating fact: the only production effect path,
  `runtime/kernel/projections/social_publish_adapter.js`, has `execute()` as a
  hard-disabled stub (`{published:false, reason:'draft-only'}`), so no live bypass is
  possible today. The "approval-gated effect" is a stub plus bookkeeping, not a gate.

## LOW

### E6. NAMESPACE_RE is not actually single (commit 0b946984b overclaims)
- `ping-runtime/canonicalization/canonicalization_service.js:30` exports the canonical
  `/^(core|tenant)::[a-zA-Z0-9_-]+$/`, and evidence_authority / context_compiler /
  external_agent_adapter import it.
- BUT `ping-runtime/events/event_governance.js:205` (the emit-path enforcement gate
  called by `UnifiedEventRuntime.emit()` step 3) carries its OWN inline copy of the
  identical regex and does NOT import the canonical export (fixed-string grep for
  `(core|tenant)` finds exactly these two definitions).
- Same spelling today, so no active bypass; but a future change to the canonical RE
  would NOT change enforcement - the exact drift class the commit claimed to eliminate.

### E7. Atomic sequence is code-complete but NOT live (commit 76af2f3ec)
- DDL `ALTER TABLE ping_events ADD COLUMN IF NOT EXISTS sequence BIGSERIAL` exists in
  `UnifiedEventRuntime.initialize()` (unified_event_runtime.js:75), which runs only at
  gateway boot (bootstrap/gateway_runtime.js:442).
- Live `ping_events` schema (`\d`): event_id, event_type, source, timestamp, payload,
  metadata, namespace, processed, created_at. NO `sequence` column.
- Nothing in the tree reads `sequence` yet, so nothing breaks; the sprint doc itself
  notes "Replay reduction still needs the live-PG smoke."

### E8. Social draft trigger never ran against a live DB (H67 self-admitted, confirmed)
- H67's own "Gaps" note: "no live-Postgres run (social_drafts table existence unknown;
  script fails closed if missing)."
- Confirmed live: `social_drafts`, `proposed_actions`, `effects` all absent
  (to_regclass NULL). The 8/8 contract tests run against a stubbed pool only.

---

## Claims that HELD (probed, not falsified)

- **Replay is real.** `ReplayWorker` (canonical_workers.js:281+) is registered with a
  `KernelReplayExecutionProvider` in gateway boot (bootstrap/gateway_runtime.js:536-545,
  "This is the LIVE arrow"). The provider builds kernel envelopes and runs
  `DeterministicReplayEngine`; `verified=true` requires `status==='ok'` AND zero
  violations (canonical_workers.js:370-372). Caveat: "verified" means kernel
  self-consistency of the re-execution, not reproduce-and-compare against a previously
  recorded fingerprint.
- **Compiler suite 22/22 PASS** - re-ran `ping-runtime/context/context_compiler.test.js`
  on the Pig: "22 passed, 0 failed" (includes the H80 knowledge_refs tests).
- **Social trigger 8/8 PASS** - re-ran `test/test_social_draft_trigger.js` on the Pig:
  "8/8 tests passed" (stubbed pool, as designed).
- **Namespace enforcement in the compiler is real**: `compile()` throws
  'namespace is required and must be canonical' for bad namespaces
  (context_compiler.js:43); KG reads filter by namespace
  (`queryNodes({namespace, status})`, context_compiler.js:123-124);
  `_canonicalizeEvents` rejects namespace mismatches (context_compiler.js:208-210).
- **Worker routing is wired in code**: bridge maps REPLAY_VERIFY and the approval family
  (SNIPPET_APPROVED/REJECTED, AI_RESPONSE_ACCEPTED/REJECTED -> KNOWLEDGE_PROMOTE);
  `MISSION_WORKER_MAP` routes KNOWLEDGE_PROMOTE -> 'knowledge-promotion' and
  REPLAY_VERIFY -> 'replay' (mission_scheduler.js:50,59).
- **TimeMachine NaN% appears fixed**: TimeMachine.tsx:374-376 now guards
  `yesterday === 0` (shows absolute diff instead of percent), so the H55-flagged
  divide-by-zero no longer renders NaN%.

## UNKNOWN (could not verify within task bounds)

- Live POST /events round-trip (gateway requires auth; no test credential authorized).
  E3 is code-path + schema verified, not live-HTTP verified.
- Whether ui-next is intended to deploy elsewhere (no compose/service reference checked);
  on the Pig there is no running frontend.
- The "87 assertions" figure from the task brief does not appear in SPRINT-HARVEST-12H.md;
  could not attribute or verify it. Verified instead: 22/22 compiler, 8/8 social trigger.

## Bottom line
The sprint's code-level claims largely hold (replay wired, namespace enforced in the
compiler, suites green on re-run). The harvest is NOT complete where it touches the
running system: the dashboard reads the wrong event store (E1), the live gateway is a
pre-sprint image so none of the backend fixes are live (E2), duplicate accepts silently
skip persistence (E3), KG lineage is write-only (E4), and approval is routing without a
gate (E5). E1 is the strongest single counterexample: a widget presented as "honest"
that would report 0 events / 0 missions against a live DB holding 739 / 144.
