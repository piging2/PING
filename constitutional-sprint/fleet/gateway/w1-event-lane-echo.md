# W1 — Event-lane auth hardening (F242) + echo-loop kill plan (F243)

**Worker:** W1, constitutional-sprint wave. **Date:** 2026-09-24. **Mode:** read-only; propose-only.
**COMMITS CREATED: NONE.** No staging, no installs, no live-runtime mutations.
Live Pig probes attempted and unavailable from this sandbox (SSH `Operation not permitted`;
direct HTTP to :8080 failed) — all claims below rest on captured workspace evidence, tagged by revision.

**Consumed findings:** F180 (unauthenticated canonical-spine lane), F124 (unauthenticated POST /missions),
F172 (echo loop confirmed unbounded; P-T1 supersedes OBS3), F242 (auth proposal exists, not applied),
F243 (kill plan pending). Also consumed: F156 (B1 closed), F199/CP-7 (image-only CapabilityAuthority +
exterior-auth middleware; source deploys would drop them), F200, F244.

**Revision vocabulary used below:**
- `[SOURCE]` = `/home/nolan/ping` source tree (what the rc line matches)
- `[PROD-IMAGE]` = live `ping-gateway:devin-boundary2` (bundles exterior-auth middleware + CapabilityAuthority)
- The newest captured `POST /events` canonical-spine text (`event/gw-post-events.txt`) carries tenant
  isolation + `req.authenticatedAgent` — newer than F180's cited lines 111-132; tagged `[NEWER-CAPTURE]`.

---

## F250 — F242's auth proposal is revision-blind; it must be re-anchored before apply [SECURITY] [P0]

- WHY: The existing proposal (`patches/transition/gateway-events-canonical-lane-auth.md`) diffs against
  the `[SOURCE]` revision: "no auth middleware", "zero hits for the bearer token", gate on a new
  `GATEWAY_WRITE_TOKEN` env. But `[PROD-IMAGE]` already wraps `/events` in `ExteriorAuthMiddleware`
  (image `gateway_runtime.js:790,794,798,900,916-920`; EXECUTION-CORE.md §0) which attaches
  `req.authenticatedAgent`, and `[NEWER-CAPTURE]` reads it in the canonical-spine branch. A diff that
  ignores the middleware either double-gates (harmless but confusing) or, worse, gets evaluated against
  the wrong revision and is declared "unnecessary" because "the image already has auth" — while the
  actual gap (F251) survives. F156 closed B1 only for the route file, not the middleware chain.
- EVIDENCE: EXECUTION-CORE.md rows 230-231; `event/gw-post-events.txt` (tenant isolation + authenticatedAgent);
  `fleet/security/sec4-unauth-endpoints.md:16` (live 401/403 capture neither worktree copy explains).
- MINIMUM CHANGE: Rewrite the proposal as revision-aware: gate the route on `req.authenticatedAgent`
  presence (the middleware's attachment point) with the env-bearer as fallback where no middleware runs;
  verify-first probe matrix (F252) precedes any apply.
- TEST: (1) identify which revision serves :8080 now; (2) unauthenticated canonical POST → 401 in every revision.
- RESULT: Hardened proposal written at `patches/transition/w1-event-lane-auth-hardened.md`; NOT APPLIED.

## F251 — Attribution is not access control: the canonical-spine branch tolerates missing identity [SECURITY] [P0]

- WHY: `[NEWER-CAPTURE]` shows the branch reads the middleware's attachment but never requires it:
  `const _agent = req.authenticatedAgent; const _source = _agent ? ('api:' + _agent.agentId) : 'api';`
  then proceeds to `eventRuntime.emit(...)`. If the middleware passes a request through without attaching
  an identity (misconfig, pool failure, localhost exception), the lane journals the event anyway with
  source `'api'`. Identity attachment is attribution; only a require-identity check is access control.
  The tenant-isolation block in the same branch validates the *claimed tenant* against the registry —
  scope validation, not caller authentication.
- EVIDENCE: `event/gw-post-events.txt:41-47`; EXECUTION-CORE.md row 236 (MEDIUM confidence, "full middleware
  chain in prod image not re-verified for this branch").
- MINIMUM CHANGE: In the canonical-spine branch, reject when `req.authenticatedAgent` is absent
  (401), before tenant validation and before emit. Never fall back to source `'api'` for HTTP callers.
- TEST: Request with middleware present but no credential → 401 at the route (not silent `'api'` source).
- RESULT: Folded into the hardened proposal; NOT APPLIED.

## F252 — Unresolved contradiction: live 401 capture vs proven code acceptance [SECURITY] [P0]

- WHY: SEC4 records a 2026-09-16/17 live capture of `POST /events` returning 401 for unauthenticated calls
  and 403 for malformed namespaces (`fleet/security/sec4-unauth-endpoints.md:16`), while F180 proves the
  `[SOURCE]` code accepts unauthenticated callers. Both cannot describe the same revision. Until the
  contradiction is resolved by a read-only live probe, any apply risks "fixing" the wrong revision —
  or declaring victory on a revision that is not serving.
- EVIDENCE: sec4-unauth-endpoints.md:16,424,428,553; F180 evidence block; F156 (B1 closed for route file only).
- MINIMUM CHANGE: Run the probe matrix (read-only, no POST mutations): (a) `GET /health` + container image
  digest — which bytes serve :8080 now; (b) unauthenticated `POST /events` with a *structurally invalid*
  body (rejected before any journal write — proves the 401/accept boundary without mutating); (c) repeat
  against a `FYD_SITE_OVERLAY` shape only if (b) shows acceptance. No synthetic overlay event may be journaled.
- TEST: Probe results recorded; the hardened proposal's TEST section is gated on them.
- RESULT: Probe NOT RUN (Pig unreachable from this sandbox). Owned by whoever holds Pig access; the hardened
  proposal lists it as apply-blocker #1.

## F253 — The operator bearer token is still theater; its lifecycle is unspecified [SECURITY] [P1]

- WHY: `tools/fyd-site-projection/emit-overlay.py` sends an `Authorization: Bearer` token that zero gateway
  code validates (F180/T7). The existing proposal promotes it to the write credential via
  `GATEWAY_WRITE_TOKEN`, but specifies no issuance, rotation, revocation, or distribution list. A static
  shared secret with no lifecycle is a credential-theater upgrade: it closes the anonymous hole while
  creating an unmanageable shared secret (every operator, every script, one value, no expiry).
- EVIDENCE: transition/TRANSITION.md T7; F180; F253 is new (lifecycle gap in the existing proposal).
- MINIMUM CHANGE: (a) Prefer the middleware's verified agent identity as the primary credential on
  `[PROD-IMAGE]`; use the env bearer only where no middleware runs (`[SOURCE]`/rc). (b) Specify: token
  generated per deployment, stored in the gateway container env (never in repo), distributed to
  `emit-overlay.py` operators out of band, rotated on operator churn; revocation = env change + restart.
- TEST: Wrong token → 401; rotated token → old stops working, new works; `emit-overlay.py` documented.
- RESULT: Specified in the hardened proposal; NOT APPLIED.

## F254 — F244 interplay: the hardened gate must live in the source tree, or the next deploy drops it [SECURITY/GOVERNANCE] [P0]

- WHY: F199/CP-7: the exterior-auth middleware exists ONLY in `[PROD-IMAGE]`; the next source-tree deploy
  silently drops it (F244). If the auth gate lives only in the image, the F242 hole re-opens on the next
  deploy. The durable fix must be a route-level require-identity check committed to the source tree, so
  every future image carries it regardless of which middleware the image bundles.
- EVIDENCE: EXECUTION-CORE.md rows 230-231; F244; GLOBAL-AUTHORITY-MAP.md CP-7.
- MINIMUM CHANGE: Route-level gate in `gateway/routes/events.js` (source tree), fail-closed, middleware-
  agnostic (requires `req.authenticatedAgent`, else env-bearer, else 401). Rollout ordered after the
  F244 canonical-home ruling; deploy freeze respected.
- TEST: Build an image from source; unauthenticated canonical POST → 401 with no middleware present.
- RESULT: Proposed; NOT APPLIED. Blocked on F244 governance ruling for the deploy step only — the source
  diff itself is safe to prepare.

## F255 — Echo-loop trigger anatomy CONFIRMED (consumes F124/F172/F243) [EXECUTION/SECURITY] [P0]

- WHY: A single unauthenticated `POST /missions {missionType:'PROJECTION_CREATE'}` (F124: `gateway/routes/missions.js:22`,
  no auth; scheduler auto-dispatches within 5s) ignites a truly unbounded loop:
  1. `MissionScheduler._dispatch` builds the dispatch event with `event_type` = the ORIGINAL business type
     (`mission_scheduler.js:24-32` DOC-CONTRACT, `:219-244`), so a `REPLAY_VERIFY` mission dispatches as
     `event_type='PROJECTION_CREATED'`.
  2. `WorkerRuntime.dispatch(event)` (`worker_runtime.js:69-108`) broadcasts to EVERY worker whose
     `eventTypes` include `PROJECTION_CREATED` — projection re-runs (`canonical_workers.js:708-709`).
  3. ProjectionWorker re-emits `PROJECTION_CREATED` (`canonical_workers.js:182`) with a fresh-timestamp
     payload → fresh content-hash `event_id` (`unified_event_runtime.js:80-83`) → defeats the
     `ON CONFLICT DO NOTHING` dedupe (`:153`).
  4. `EventToMissionBridge` sees the new `PROJECTION_CREATED` → mints a new `REPLAY_VERIFY` mission
     (`mission_runtime.js:78-84`, `mission_id = sha256('REPLAY_VERIFY:' + new_event_id)`, distinct each echo).
  5. Goto 1. Each cycle also spawns the replay→witness→lineage tail and a Qdrant point. Throttled ONLY by
     scheduler `maxConcurrent=3` / per-worker `maxConcurrent=2` — rate limits, not termination.
  6. Observability poisoning: the echo inflates `/mc/missions/stats` completed counts and `ping_events` row
     counts, reading as healthy throughput; the only early signal is abnormal correlation-group growth.
- EVIDENCE: `fleet/observability/obs1-mission-trace.md` T1 (verified against byte-identical scratch pulls
  `fleet/observability/obs1-scratch/`); F172; F124/F243.
- MINIMUM CHANGE: None in this finding — mechanism record. Remediation is F256/F258.
- TEST: Not run — any live-fire drill ignites the loop (F243 warning stands).
- RESULT: Mechanism re-verified against scratch sources; kill plan written at
  `patches/transition/w1-echo-loop-kill-plan.md`. NO DRILL RUN.

## F256 — Kill-switch insertion points for the echo loop (kill plan must precede any drill) [EXECUTION] [P0]

- WHY: The loop has four independent fuel points; a kill plan must name the switch at each, in order,
  before anyone runs the live-fire drill OBS1/OBS3 proposed. Switches:
  1. **Scheduler poll pause** (`mission_scheduler.js:190-213`, 5s poll): an in-memory/env pause flag checked
     at the top of `_poll` — stops new dispatches within one poll interval. Fastest switch.
  2. **Bridge mint pause** (`event_to_mission_bridge.js`): flag or filter that stops minting `REPLAY_VERIFY`
     for `PROJECTION_CREATED` — stops new mission creation even if events flow.
  3. **P-T1 dispatch scoping** (F258): structural fix — `WorkerRuntime.dispatch(event, onlyWorker)` —
     removes the re-match that re-runs projection. The permanent kill.
  4. **POST /missions auth gate** (companion to F124): removes the remote trigger. Until applied, the loop
     is remotely ignitable by anyone reaching the gateway.
  Secondary audit (not a switch): `WorkerRuntime._poll` (`worker_runtime.js:145-159`) polls the vestigial
  `/events/unprocessed` endpoint and calls broadcast `this.dispatch(event)` — a second fan-out path if that
  endpoint ever serves rows again.
- EVIDENCE: obs1-scratch `mission_scheduler.js:190-213,250`, `worker_runtime.js:69-108,145-159`;
  obs1-mission-trace.md P-T1; s5-missions-mcp.md F1.
- MINIMUM CHANGE: Add the pause flags (1)(2) as propose-only diffs; P-T1 as the structural diff; /missions
  gate per s5-F1's minimum change.
- TEST: With (1)+(2) armed, one synthetic `PROJECTION_CREATED` → assert `ping_missions` stops growing
  within 2 poll intervals and no new `REPLAY_VERIFY` rows appear. Full chain test only after P-T1.
- RESULT: Kill plan written; switches NOT INSTALLED (propose-only). NO DRILL RUN.

## F257 — Detecting a live loop from the journal (read-only) [OBSERVABILITY] [P1]

- WHY: If the loop ignites (accidentally or hostilely), the operator needs read-only queries that distinguish
  it from healthy throughput, because `/mc/missions/stats` is poisoned by the echo itself.
- EVIDENCE: obs1-mission-trace.md T1/T6; F249 (live journal = brain-postgres/ping_runtime, 2429 rows baseline).
- MINIMUM CHANGE (detection runbook, no code):
  1. `SELECT event_type, count(*) FROM ping_events WHERE created_at > now() - interval '5 minutes' GROUP BY 1 ORDER BY 2 DESC;`
     → `PROJECTION_CREATED` dominating and growing window-over-window = loop signature.
  2. `SELECT mission_type, state, count(*) FROM ping_missions GROUP BY 1,2;`
     → `REPLAY_VERIFY` in `created`/`pending` growing unboundedly.
  3. Correlation-group growth: `SELECT correlation_id, count(*) FROM ping_events WHERE created_at > now() - interval '1 hour' GROUP BY 1 ORDER BY 2 DESC LIMIT 20;`
     → one chain absorbing the majority of new rows (the only early signal per OBS1).
  4. Chain signature: echo missions carry `mission_id = sha256('REPLAY_VERIFY:' || payload->>'event_id')`
     with `payload->>'event_id'` pointing at the parent echo's `PROJECTION_CREATED` event — walkable via
     `/events/:eventId/descendants`.
  5. Cross-check: `/mc/missions/stats` completed counts rising while (1)-(3) show a single chain = poisoned
     observability, not throughput.
- TEST: Run (1)-(5) against the live journal now (read-only) to bank a quiescent baseline; re-run on any alert.
- RESULT: Runbook written in the kill plan; baseline NOT captured (Pig unreachable from here).

## F258 — P-T1 design hardened: dispatch only to the assigned worker [EXECUTION] [P0]

- WHY: OBS3's proposed fix (remove self-subscription from worker `eventTypes`) targets registrations that do
  not exist at cc6856c — it would change nothing. The live mechanism is dispatch-time re-matching
  (F255), so the fix must be at dispatch time: `MissionScheduler._dispatch` already resolves
  `workerName = MISSION_WORKER_MAP[mission.mission_type]` (`:193`) and verifies registration (`:199-204`);
  it then throws that knowledge away and broadcasts. P-T1 keeps the knowledge.
- EVIDENCE: obs1-scratch `mission_scheduler.js:193-204,250`; `worker_runtime.js:69-108`;
  obs1-mission-trace.md P-T1; F172 (OBS3 fix refuted).
- MINIMUM CHANGE (exact diff shape):
  ```diff
  --- a/ping-runtime/workers/worker_runtime.js
  +++ b/ping-runtime/workers/worker_runtime.js
  @@
  -  async dispatch(event) {
  +  async dispatch(event, onlyWorker = null) {
       const eventType = event.event_type;
       let lastResult = null;
       for (const [name, entry] of this._workers) {
  +      // P-T1: mission dispatch targets exactly the assigned worker.
  +      // event_type on a mission dispatch event is data, not a routing broadcast.
  +      if (onlyWorker && name !== onlyWorker) continue;
         if (entry.eventTypes.length > 0 && entry.eventTypes.includes(eventType)) {
  --- a/ping-runtime/orchestration/mission_scheduler.js
  +++ b/ping-runtime/orchestration/mission_scheduler.js
  @@
  -      const dispatchResult = await this._workerRuntime.dispatch(event);
  +      // P-T1: dispatch only to the assigned worker. Broadcast dispatch re-matched
  +      // projection on every REPLAY_VERIFY mission (event_type='PROJECTION_CREATED')
  +      // and re-ignited the echo. See [DOC-CONTRACT] below.
  +      const dispatchResult = await this._workerRuntime.dispatch(event, workerName);
  ```
  Plus: update the `[DOC-CONTRACT]` comment (`mission_scheduler.js:24-32`) to record the new invariant —
  *a mission executes exactly its assigned worker; event_type on the dispatch event is data, not a routing
  broadcast.* Default `onlyWorker = null` preserves broadcast for the non-mission caller
  (`WorkerRuntime._poll`, vestigial `/events/unprocessed` path).
- FAILURE SEMANTICS (unchanged paths): unknown `mission_type` → existing skip + stats (add a journal/log
  event per s5-F1's minimum change); assigned worker unregistered → existing skip; assigned worker returns
  no match (null) → existing skip + `_failMission` (phantom-complete prevention intact); worker throws →
  existing retry → exhaustion → DLQ (`mission_scheduler.js:289-330`).
- TEST (no live-fire until kill switches armed): unit — dispatch synthetic `REPLAY_VERIFY` with
  `payload.event_type='PROJECTION_CREATED'`, assert only the replay worker ran and no `PROJECTION_CREATED`
  was emitted; chain — one `PROJECTION_CREATED` through the bridge with switches armed → assert
  `ping_missions` grows by a bounded finite chain and returns to quiescent.
- RESULT: Design written; NOT APPLIED. Dependency: touches the `[DOC-CONTRACT]` convergence-ledger entry —
  route through Agent 20 before any test (obs1 open question 3, carried).

## F259 — Recovery procedure + Nolan-gated decisions [GOVERNANCE] [P0]

- WHY: Killing the loop is half the job; recovery must not corrupt the journal, and three decisions need
  Nolan (standing rule: destructive/irreversible, production side effects, ambiguous ownership).
- EVIDENCE: F243; F204 (no backups — journal loss is permanent); F249 (append-only lives in code only).
- MINIMUM CHANGE (recovery order, operator-run):
  1. Arm kill switches (F256: pause scheduler poll, pause bridge mint).
  2. Let in-flight echo missions drain; mark stuck echo `REPLAY_VERIFY` missions failed/dead-lettered via
     the existing `_failMission` → DLQ path — never `DELETE` journal rows (append-only; F204: no backups).
  3. Verify quiescence with F257 probes (two consecutive quiet windows).
  4. Apply P-T1 (+ /missions auth gate), re-enable scheduler/bridge, run the bounded chain test.
  5. Bank the new quiescent baseline.
- NOLAN-GATED (do not proceed without his call):
  1. **401-contradiction probe** (F252): who runs the read-only live probe matrix, and is a structurally-
     invalid-body POST acceptable as the probe (no journal mutation by construction)?
  2. **Credential choice**: middleware-attached agent identity as primary credential vs the env bearer
     token (F253 lifecycle) — or both (defense in depth)?
  3. **F244 canonical-home ruling**: the deploy that carries the hardened gate needs the governance ruling
     first; until then the image/source drift persists and any source deploy re-opens the lane.
- TEST: Recovery drill is the bounded chain test in F258 — only after kill switches are installed.
- RESULT: Documented in the kill plan. NO DRILL RUN. Nothing applied.

---

## Generic failure classes (every failure becomes a class entry)

- **G-AUTH-1 — Attribution without access control.** A middleware attaches a verified identity to the request;
  the route reads it but tolerates its absence. Identity attachment is not enforcement. (F251)
- **G-AUTH-2 — Revision-blind security claims.** A finding or proposal verified against one revision
  (source tree) is evaluated as if it described another (live image). Tag every security claim with its
  revision. (F250, F252)
- **G-AUTH-3 — Theater credentials.** A credential is sent by clients but validated by nothing; promoting it
  to a real credential without specifying issuance/rotation/revocation just upgrades the theater. (F253)
- **G-EXEC-1 — Dispatch re-match echo.** Broadcast dispatch keyed on a data field (`event_type`) re-runs
  the producer of that field; content-hash IDs with fresh timestamps defeat dedupe. Fix at dispatch time,
  not at registration time. (F172/F255/F258; OBS3's registration fix was the wrong layer)
- **G-EXEC-2 — Poisoned observability.** A runaway loop inflates the very throughput counters used to judge
  health; detection must cross-check journal growth against control-plane stats. (F255/F257)
- **G-DEPLOY-1 — Silent auth drop on deploy.** Security middleware living only in an image is dropped by the
  next source-tree deploy; durable gates must live in the source tree. (F199/F244/F254)

**Deliverables:** this file; `patches/transition/w1-event-lane-auth-hardened.md`;
`patches/transition/w1-echo-loop-kill-plan.md`.
**COMMITS CREATED: NONE.**
