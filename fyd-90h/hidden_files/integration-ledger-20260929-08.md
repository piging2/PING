# Integration Ledger — Interval 08 (2026-09-29)

**Binding order:** `~/workspace/fyd-90h/INTERVAL-08-ORDER.md` (commits `0ccf470`, `bf97380`).
**Workspace branch observed:** `security/secret-redaction-2026-09-28`.
**All commits local. Nothing pushed to any remote.**

---

## VERDICT

**Interval 08 closes GREEN with one residual owner decision.**

1. **Exposed credentials: all live authority dead or rotated, independently proven.** Google x4 dead per Google (revoke endpoint 400s). Hugging Face x2 dead per HF (401). Postgres superuser rotated with the live consumer switched and verified healthy; old password rejected live. The exposed Qdrant key was proven useless (hash mismatch; the reachable endpoint takes no auth at all). Webhook secret was empty; the private key was never exposed. One new finding needs Nolan: a Google OAuth client secret at the branch tip requires a Cloud Console reset (lower severity; file already removed in the unpushed containment commit). Git history still carries the blobs; purge was not authorized and remains Nolan's call.
2. **One PING action traversed the full P0 chain.** FB comment `8cfeddea8fee41e598630b2c36330f22`: INTENT -> AUTHORIZATION -> ATTEMPT -> RESULT (EXECUTED) -> VERIFIED EFFECT (EFFECT_CONFIRMED via an independent observer channel, not the worker's self-report) -> OUTCOME (NO_SIGNAL, window honestly left open) -> no candidate learning (n=1 refused per the learning law).
3. **Event/execution components actually reached:** UnifiedEventRuntime, IdentityAuthority, MissionRuntime, MissionScheduler, WorkerRuntime (dispatch-only), DeadLetterAuthority, Replay/Witness/Evidence/Projection workers, EventReadAuthority are REACHED-AUTHORITY on the served line. CapabilityRegistry is REACHED-NONAUTHORITY. Planning, Placement, Secrets, Policy Promotion are UNKNOWN (not on the traced path). IEventAuthority and EventRepository are UNREACHED-CANDIDATE (repo-only, absent from the served image). ConstitutionalEventStore does not exist anywhere. AcquisitionManager does not exist as a named class, but the underlying handoff exists (79 live OBSERVATION_CREATED rows via POST /events).
4. **Served-line capabilities:** the Why This + regen whitelist opened narrowly for `ping-fyd` (3 commits, served :3100 rebuilt and verified, regression PASS). The outcome ledger and timeout fix live on an isolated branch, not the served line. `f21ba933` was classified SUPERSEDE, not harvested. The corrupt `fyd/builder-rebuild-v1` ref was repointed to its evidenced target by the coordinator under the order's explicit authorization. Convergence harvest: 10 semantic groups approved pending execution; 5 portability groups held for a scope decision.
5. **PING gained one visible capability:** ping-fyd now traverses Why This -> owner correction -> regen -> survival on the served line, and the ledger now records VERIFIED EFFECT + OUTCOME + CANDIDATE LEARNING as first-class stages with hard distinctions enforced in code.

---

## PRODUCT ARROWS

- **Interval 07 correction survival: PRESERVED, not reopened.** The i07 proof was rerun against the new served build (`CTfvku8OQWWqrG8pKnSy7` @ `a8957e3f`): source X phone `(970) 589-3309` intact; ask seam `baseDigest` ok; overlay `fyd-ovl-mumzkn87-a211ccecf0aa` composed; re-observe-still-X with `ownerLayerIntact: true`; source-moved collision resolved with the owner override winning. The regression invariant holds: SOURCE X -> OWNER CORRECTION Y -> REGENERATION -> SOURCE REOBSERVATION X -> PRESENTATION STILL Y.
- **P0 outcome loop: FIRST FULL TRAVERSAL PROVEN** (sandbox ledger, isolated branch). The seven-stage chain with its six distinctions is now executable, not just specified. See lane 4.
- **Why This / regen whitelist: OPEN for ping-fyd, PROVEN LIVE.** Both previously closed boundaries now admit exactly one literal tenant. Deny-by-default unchanged for everyone else (negative controls verified live).
- **Event spine: TRACED, not assumed.** UnifiedEventRuntime -> `ping_events` confirmed on the served runtime with one correction (spine DB is `brain-postgres`/`ping_runtime`, not `ping-postgres`). See lane 2.
- **Timeout defect: MINIMAL FIX COMMITTED.** Probe-before-follow enforced mechanically; the read-only probe fails closed fast instead of burning its bound behind the write driver's lock. See lane 6.

---

## LANE 1 — INCIDENT ZERO (top priority)

**Worker:** re-dispatched after the first attempt died on a model-stream timeout (infrastructure, produced nothing). Completed 2026-09-29 ~13:20 MDT.
**Authority:** Nolan's binding revoke+rotate order. History purge NOT authorized, NOT performed. Nothing pushed.

### Per-credential status

| Credential | Status | Independent proof old authority is dead |
|---|---|---|
| token.json — Google OAuth pair | REVOKED | Google revoke endpoint -> 400 invalid_token for both; tokeninfo -> 400. No live grant. |
| .env.base GOOGLE_TOKEN + GOOGLE_CREDENTIALS | REVOKED | Same revoke endpoint -> 400 invalid_token for both. |
| HF_TOKEN / HUGGINGFACE_HUB_TOKEN | REVOKED (effective) | huggingface.co/api/whoami-v2 -> 401 for both. No live consumer found. |
| QDRANT_API_KEY (exposed 176-char) | Old authority dead, no rotation needed | Hash-compare: exposed key != ping-qdrant's enforced key != disk-copy key. Reachable :6333 answers 200 with and without a key (no auth). The exposed key grants nothing anywhere reachable. |
| POSTGRES_PASSWORD (brain-postgres superuser) | ROTATED by this lane | Old password rejected over TCP/scram (live-tested). New 32-char password authenticates. Sole live consumer ping-gateway recreated with it: 2 live ping_runtime connections, zero auth failures. |
| GITHUB_APP_WEBHOOK_SECRET | NOT-APPLICABLE | Value is empty (len 0) in .env.base. Nothing was ever exposed. |
| GITHUB_APP_PRIVATE_KEY | NOT-APPLICABLE | Only a Windows path string in .env.base; the .pem lives locally at C:\PING\secrets\github\, never committed. |
| credentials/client_secret.json (found by this lane; interval-07 sweep missed it) | BLOCKED-ON-NOLAN | Google OAuth client secret (installed-app type) at tip. Reset needs Google Cloud Console -> APIs & Services -> Credentials -> the OAuth client -> reset secret. Lower severity (installed-app secrets are non-confidential; user tokens already dead). File deleted in the containment commit. |

### Containment commit (LOCAL ONLY, NOT PUSHED)

- SHA `b0b82f6dfffa572d093b7f53d9e14c9909c25866`, branch `incident-zero/containment-20260929`, repo `/home/nolan/crx-swarm/crx-runtime-main`, parent `origin/constitutional-trunk` = `74fbb74`. Verified locally present; branch has no upstream; `origin/constitutional-trunk` untouched at `74fbb74`.
- Contents: delete token.json, delete .env.base, delete credentials/client_secret.json; redact 5 known-compromised values to `ROTATED_REPLACE_ME` in `.env.example` and `brainos/orchestration/config/environments/.env.qdrant`; add token.json to .gitignore. Verified zero secret material in added lines (checked against hashes of known values).

### Secret scan

- Both files still at `origin/constitutional-trunk` tip `74fbb74` (unchanged by anyone). Prior commits carrying the blobs enumerated (`git log --all`); `e36a0f6` (Aug 27 "remediate committed credentials") exists only on sibling branches, never reached constitutional-trunk. Fork/cache exposure of the public repo assumed, unverifiable. Purge list ready for separate authorization.
- Wider exposure found: root `.env.example` carried the same compromised HF/Qdrant/postgres values; `brainos/orchestration/config/environments/.env.qdrant` carried the same Qdrant key. (`.env.example`'s Google values and the Yahoo app password in `.env.mission-control` proven non-live.)
- Disk: 29 `.env.base` copies on the Pig held tip-compromised values; all now dead (postgres rotated; Google/HF dead per providers; Qdrant key useless). 1 disk token.json = same dead grant. `/tmp/crx-ct` extraction deleted. `docker inspect` outputs retain dead values in container env (cosmetic only).
- No secret value appears in any lane log, commit, or report (hashes and statuses only).

### Nolan must act (exact blockers)

1. Google Cloud Console client-secret reset (runbook above). Lower severity.
2. Re-run the Drive OAuth consent flow if Drive access is ever needed again (nothing consumes it now; no urgency).
3. Issue new HF tokens at huggingface.co/settings/tokens only if HF access is needed again (nothing needs it now).
4. Authorize or decline public-history purge (blast radius: public branch, unknown forks/caches).
5. Hygiene: sanitize the 29 dead-value `.env.base` copies; firewall-review host-published `:6333` (qdrant, **no auth at all** — separate finding, not changed by this lane) and `:5432`.

### Incidents during execution

- Egress proxy flapped twice (recovered; all mutations re-verified after).
- One failed `ALTER USER` from a transport quirk: **pigwsl-exec strips literal single-quoted substrings from commands** (proven with a `repr()` probe); recovered via `chr(39)` construction, zero bad state persisted. Recorded in `~/workspace/AGENTS.md`.
- Pre-existing, not caused by this lane: `ping-vault` container unhealthy; gateway `/health` -> 503 is its normal baseline (same before rotation).

## LANE 2 — EVENT FORENSIC (read-only)

**Worker:** re-dispatched after the first attempt died on a model-stream timeout. Completed 2026-09-29. Strictly read-only: SELECTs and file reads only; no repo writes, commits, restarts, or deployments.

**Method:** traced from the actually served bootstrap, not from class names. Served PING runtime = docker container `ping-gateway` (image `ping-gateway:repair-cert-20260924` + exterior-auth backport) serving host :8080. Entrypoint: `/app/gateway/server.js` -> `bootstrap/gateway_runtime.js` -> `GatewayRuntime.start(8080)`. All classifications describe the served image, which DIFFERS from repo HEAD `546b62d76` (backport present in served, absent in HEAD). The `:3100` Next.js runtime is a separate served surface and was not traced in this lane.

**Falsification result:** "UnifiedEventRuntime -> PostgreSQL ping_events is the canonical spine" is CONFIRMED for the served runtime, with one correction: the database is `brain-postgres`/`ping_runtime`, NOT the `ping-postgres` container on :5433 (served env `POSTGRES_HOST=brain-postgres`, `POSTGRES_DB=ping_runtime`; ping-postgres is unreferenced by the served gateway).

### First live event path (SOURCE -> REACHABILITY -> EXECUTION -> PERSISTENCE -> CONSUMER)

- Entrypoint: `ping-gateway` -> `server.js` -> `GatewayRuntime.start(8080)`.
- Source/caller: HTTP `POST /events` (exterior-auth middleware) with BFF envelope `{type, payload}` -> `social_ingest_adapter.normalizeBffEnvelope` (or `knowledge_ingest_adapter` for `ping.knowledge.*`) -> `eventRuntime.emit(...)`. Alternate reached producers: business emitters (Review/Customer/Project/Connector/System) via `CanonicalizationService`, `BaseWorker._emit`, `EventBridge` (polls legacy tables).
- Live example: `OBSERVATION_CREATED`, event_id `12453477988e8d4bfb0dd45bc67c9e0787da8846ab2bf275e4bfe37657b8d01a`, source `api`, namespace `core::system`, 2026-09-29 02:33:49 UTC. Live table: 2546 events, 30 types, 2026-09-16 -> 2026-09-29.
- Validation (in `UnifiedEventRuntime.emit`, the single admission choke point): (1) event_id = SHA-256 of `{eventType, source, [namespace], [logical_id|payload]}` — deterministic, no wall clock; (2) `EventValidator` against `generated/event_registry.json`; (3) `_assertVerdictAuthority` — verdict-class types fail closed pre-persistence unless from the canonical producer worker, unskippable even with `_skipGovernance`; (4) `EventGovernance.validateEvent` (namespace/privacy boundary); timestamp from `constitutionalTimeAuthority`.
- Writer: `INSERT INTO ping_events (...) ON CONFLICT (event_id) DO NOTHING`; fail-closed when no pool ("never return ok without durability"); semantic-collision detection on same-ID/different-payload.
- Table: `ping_events` @ brain-postgres/ping_runtime. PK `event_id VARCHAR(64)`; indexes on type/source/namespace/processed/timestamp/causation/correlation. No global sequence number; idempotent retries converge on the content hash; `causation_id`/`correlation_id` in metadata; `ping_bridge_cursors` for bridge cursors.
- Reader: `EventReadAuthority` (GET /events, /recent, /stats, /:stream); `EvidenceAuthority` (recomputes canonical hash, traces Qdrant hits back to `ping_events`); in-memory handler dispatch at emit time.
- Replay consumer: `EventToMissionBridge` (.on subscription) -> `MissionRuntime` (`ping_missions`, 502 rows, matching 502 `MISSION_CREATED`) -> `MissionScheduler` (5s poll) -> `WorkerRuntime.dispatch` (dispatch-only; the `_poll` loop is deliberately disabled) -> canonical workers (Observation -> Claim -> Replay -> Witness -> Lineage -> Projection -> Recommendation), each re-emitting through `UnifiedEventRuntime` via `BaseWorker._emit` with namespace/correlation/causation/logical_id preserved. Async projections: knowledge-graph candidate nodes (`knowledge_nodes`: 230 rows), `EmbeddingService` -> Qdrant `knowledge` collection.
- Live proof the consumer chain fires: `REPLAY_COMPLETED` 68 rows from source `replay`, `WITNESS_CREATED` 66 from `witness`, `LINEAGE_CREATED` 66 from `lineage`, `PROJECTION_CREATED` 68 from `projection` — all verdict types exclusively from their canonical producers, consistent with the verdict admission authority being enforced in production.
- Dormant but reached-at-init: `EventBridge` polls `repository_events` and `canonical_events` every 5s; both tables are EMPTY (0 rows, 0 cursors advanced) — live code with no traffic. `repository_dead_letters`: 0 rows (DLQ wired in served bootstrap, never yet exercised).

### Authority Matrix (evidence output)

| Concern | Owner | Reachable? | Persistence | Callers | Competing implementations | Status | Gap |
|---|---|---|---|---|---|---|---|
| Identity | IdentityAuthority (ingest object/relationship ids); event identity minted inside UnifiedEventRuntime.emit (SHA-256 content hash) | Yes, on the live path | None (deterministic derivation) | social_ingest_adapter, knowledge_ingest_adapter | runtime_identity_authority.js, replay_identity_authority.js present in served image, not verified on traced path | REACHED-AUTHORITY | Competing identity files unresolved |
| Event | UnifiedEventRuntime | Yes, constructed in served bootstrap; sole emit choke point | ping_events @ brain-postgres/ping_runtime (2546 rows, live) | POST /events route, CanonicalizationService, BaseWorker._emit, EventBridge, business emitters | None on served line (EventRepository is repo-only, unreached) | REACHED-AUTHORITY | None on traced path |
| Mission | MissionRuntime | Yes | ping_missions (502 rows) | MissionScheduler, EventToMissionBridge, POST /missions | None observed | REACHED-AUTHORITY | None observed |
| Planning | — | No component encountered | — | — | — | UNKNOWN | Not on traced path |
| Scheduling | MissionScheduler | Yes, started in served bootstrap, 5s poll | None owned (polls ping_missions) | GatewayRuntime | None observed | REACHED-AUTHORITY | None observed |
| Capability | CapabilityRegistry / CapabilityResolver | Yes at init (loaded, wired to /connectors routes) | Not verified | createConnectorRoutes | None found | REACHED-NONAUTHORITY | Function beyond wiring not verified on event path |
| Placement | — | No component encountered | — | — | — | UNKNOWN | Not on traced path |
| Execution | WorkerRuntime (dispatch-only; 8 canonical workers + jev-shadow registered) | Yes, live dispatches evidenced by 268 verdict rows | None (dispatch) | MissionScheduler.dispatch | ExecutionEngine, WorkflowExecutor present in image, not on traced path | REACHED-AUTHORITY | None on traced path |
| Retry | DeadLetterAuthority | Yes at init (instantiated + injected in served bootstrap) | repository_dead_letters (0 rows) | MissionScheduler | None observed | REACHED-AUTHORITY | Wired but never exercised |
| Verification | ReplayWorker -> KernelReplayExecutionProvider -> DeterministicReplayEngine | Yes | Verdicts in ping_events (68 REPLAY_COMPLETED from source replay) | WorkerRuntime.dispatch on REPLAY_VERIFY / PROJECTION_CREATED | None observed | REACHED-AUTHORITY | Lane-level replay unproven |
| Witness | WitnessWorker | Yes | Verdicts in ping_events (66 WITNESS_CREATED from witness) | WorkerRuntime.dispatch | None observed | REACHED-AUTHORITY | None observed |
| Evidence | EvidenceAuthority (+ HybridSearch) | Yes, constructed in served bootstrap | Reads ping_events (verification), Qdrant (traced back) | HybridSearch, knowledge routes | None observed | REACHED-AUTHORITY | Route-level invocation not individually verified |
| Projection | ProjectionWorker (+ EmbeddingService -> Qdrant; graph-projection .on subscribers) | Yes | Verdicts in ping_events (68 PROJECTION_CREATED from projection); knowledge_nodes 230 rows | WorkerRuntime.dispatch; runtime .on at emit | None observed | REACHED-AUTHORITY | None observed |
| Secrets | — | No Secrets component on traced path (ping-vault container exists at :8200; exterior-auth middleware uses in-memory credentials) | — | — | — | UNKNOWN | Not on traced path |
| Policy Promotion | — | No promotion-authority component on traced path | — | — | — | UNKNOWN | Not on traced path |

### Suspect classifications

- **IEventAuthority:** UNREACHED-CANDIDATE. Exists only as `runtime/kernel/events/event-authority-interface.ts` in the repo; absent from the served JS image; nothing in the served runtime references it. Dead name on the served line; dead code does not get a vote.
- **ConstitutionalEventStore:** UNKNOWN. The name does not occur in the served image or anywhere in the repo. No implementation found to classify; not inventing one. (This closes the question: there is no such component to reach.)
- **EventRepository:** UNREACHED-CANDIDATE. Repo-only (`gateway/event_repository.js` shim -> `runtime/kernel/event_repository.js`, owns `repository_events` DDL); absent from the served image. Its read-side function on the served line is performed by `EventBridge`'s direct SQL polling. Not reached; not reopened as a constitutional question.
- **AcquisitionManager:** UNKNOWN as named — the class does not exist in the served image or anywhere in the repo. The underlying falsification question has a real answer: there IS a canonical handoff, no missing edge. Acquisition output enters as `OBSERVATION_CREATED` events from source `api` (79 live rows) via `POST /events` (ingest adapters) or `POST /ingest` -> `CanonicalizationService.canonicalizeAndEmit` -> `UnifiedEventRuntime.emit` -> `ping_events`. In-image `ContinuousAcquisition` / `AcquisitionAuthority` exist but are NOT instantiated in the served bootstrap (0 references) -> UNREACHED-CANDIDATE. Acquisition producers are external to the runtime.

### REPLAY status (precise language)

REPLAY UNPROVEN by this lane. No test or harness was executed (read-only lane; the existing test files target the live pool and would emit events). Established: the deterministic replay chain (ReplayWorker -> KernelReplayExecutionProvider -> DeterministicReplayEngine -> REPLAY_COMPLETED verdicts) is REACHED in production, with 68 live REPLAY_COMPLETED verdicts from the authorized `replay` producer and the verdict admission authority observably enforced. PROJECTION REBUILD PROVEN is not claimed. MISSION REPLAY PROVEN is not claimed. A bounded verification (existing harness rebuilding a disposable projection without source modification or live-spine writes) remains future work.

## LANE 3 — HOLDS CLASSIFICATION

**Worker:** completed 2026-09-29. Strictly read-only; no merges, cherry-picks, deletes, rewrites, ref mutations, or working-state changes by the worker.

### Task A — f21ba933 (HOLD)

- Repo: `/home/nolan/projects/happy-place-platform` (original Happy Place, read-only). Commit `f21ba93393b416f49211c9f6aa63d4198a64b1fa`, "wip: commit stranded work 2026-09-29 (wave4 integration-ledger sweep)", 2026-09-29 09:11 MDT, HEAD of local branch `devin/hpp-ping-boundary`, parent `6dd11bed`. Branch diverged from main at `97056a43`; local main == origin/main == `76be71a3`.
- Push state re-verified: nothing pushed; no upstream; `git ls-remote origin` shows no `devin/*` refs; `ls-remote origin f21ba933` empty. Working tree clean; no worktrees.
- Contents (10 added files): `sync-static-media-to-kv.mjs` (canonical->KV reconciliation script); `hpp-ping-boundary.test.ts` (187 lines, tests parent commit's branch-only event boundary); `test-real-assignment-loop.mjs`, `test-media-resolution.mjs` (live-KV/localhost smoke tests); `PRODUCTION_STATUS.md`, `PRODUCTION_REPAIR_QUICK_REFERENCE.md` (docs); two draft commit-message files; two stale config backups (`generatedAt 2026-09-02` vs main's `2026-09-16` regeneration; ID scheme changed since — no restore value).
- **UNIQUE CAPABILITY: none as a commit.** The only runtime-shaped file (`sync-static-media-to-kv.mjs`) duplicates the reconciliation capability already on main (`execute-production-reconciliation.mjs` + the `/api/admin/diagnostic/reconcile-static-media` endpoint, same classification and repair semantics). The nearest-to-unique artifact is the test file — verification-only, for the parent's branch-only event boundary.
- **REACHED: no.** Local branch only, never pushed, no CI, no package.json script or workflow reference, no worktree, not deployed.
- **ALREADY SUPERSEDED: yes**, for the one capability-shaped file. The rest are tests/docs/snapshots with no live value.
- **MUST HARVEST: no. Disposition: SUPERSEDE as a unit.** If the coordinator later converges the parent `6dd11bed`'s event boundary, `hpp-ping-boundary.test.ts` is the natural verification companion to pull then.
- **Secret/quarantine: CLEAN.** Full diff scanned: no credential values; only env-var placeholder references in usage docs. Not descended from contaminated state (diverged at `97056a43`; the credential incident is a different repo).

### Task B — corrupt ref fyd/builder-rebuild-v1 (HOLD)

- Repos carrying the ref: `/home/nolan/workspace` (Pig) only. Clean: all 4 sandbox repos and 5 Pig sub-repos checked — no loose ref, no packed-refs entry, no branch, no worktree.
- Ref value was `49e821bf8b712b22153f367a166a519dce3277ab` (loose) — dangling; target object missing in every repo checked; no log anywhere references that hash (stray hash, no provenance).
- Reflog file intact: full history from branch creation 2026-09-25 17:50 MDT through 20+ fyd-builder-v1 commits to last legitimate entry 2026-09-26 08:11:57 MDT: `8cc82913 -> 85faad17` ("backlog: FYD-010/FYD-012 falsification evidence 2026-09-26"). No reflog entry for the 49e821bf overwrite — out-of-band. Overwrite timing: after 2026-09-26 08:11; actor/mechanism unknown.
- Reflog-tip objects `85faad17` and `8cc82913` both exist and are ancestors of current HEAD (`f1c4d70`) — the entire fyd-builder-v1 chain was merged into the mainline. **Zero unique commits vs HEAD.** The reflog-only commit `b26c10c5` (reset away immediately) deleted ~23k lines of generated assets — deliberately discarded; zero harvest value.
- No worktree, no consumers. Sibling `fyd/builder-rebuild-v1-cherrypick` (packed, healthy) sits at `8cc82913`.
- **Coordinator action taken under the order's explicit authorization** ("if uniquely reconstructable, repoint with evidence"): `git update-ref refs/heads/fyd/builder-rebuild-v1 85faad1740844013f54923565fd1982cacef7fe3` on `/home/nolan/workspace`. Verified: `git rev-parse --verify`, `git log`, and `git for-each-ref` all work again. The sandbox `/home/hatch/workspace` copy was already healthy at the same target. The reflog file is preserved as evidence. Post-repoint the branch is fully merged (zero unique commits) and may be considered for routine branch cleanup later — a separate convergence decision, not this HOLD.
- Incidental (flagged, untouched): `/home/nolan/workspace/fyd-build` has a stale worktree admin entry (`fyd-replay-2026-09-27-r2` points at a sandbox path) — likely prunable; left for the sweep lane.

---

## LANE 4 — P0 OUTCOME LEDGER WRITER

**Worker:** completed 2026-09-29. Branch `fyd/i08-outcome-ledger` (in `~/workspace`; the FYD repo was touched read-only only). Commit `7f2dabf` ("P0 outcome loop: VERIFIED EFFECT + OUTCOME + CANDIDATE LEARNING on the action-intent ledger"). Local only, nothing pushed. Commit discipline followed: STATUS -> OWNERSHIP -> SECRET CHECK (clean) -> explicit two-path staging -> diff review -> commit. Verified independently: commit present with the expected message.

### Search-first findings

- PING (`/home/nolan/ping`, `lane-b/tenant-ditching`): INTENT (spec YAMLs, unreached), AUTHORIZATION (governance-authority decision vocabulary), ATTEMPT/RESULT (audit-hook `success|failure`). **No VERIFIED EFFECT and no BENEFICIAL OUTCOME concepts exist anywhere in PING.**
- FYD (served line): INTENT/PLAN (ask contract `proposedAction`), AUTHORIZATION (mc-approval, mature). Nothing after approval.
- CRX: no result/effect/outcome primitive under those keywords. Conceptual harvest only: the Talos "receipt" shape informed `effect_verification` — an observer-signed claim separate from the worker's self-report. No CRX code copied.
- Duplication risk assessed: PING kernel `success|failure` vs sandbox `EXECUTED|FAILED` — same concept, different layer (unreached kernel spec vs operational ledger); FYD mc-approval vs sandbox guard filter — same concept, not reimplemented; sandbox `action-truth.jsonl` aggregate `verified` count vs new per-action `effect_verification` — complementary (aggregate vs ground truth). Building in PING runtime would duplicate on an unreached foundation; building here converges.
- Smallest required delta: the sandbox `action-intent-ledger.py` already implemented INTENT -> AUTHORIZATION (guard pipeline) -> ATTEMPT -> RESULT. Delta = ~270 lines in one file + one test script. No new storage, no orchestration, no analytics platform.

### New subcommands (hard distinctions enforced in code)

- `verify-effect`: independent observation of materialized effect (`EFFECT_CONFIRMED` / `EFFECT_ABSENT` / `INCONCLUSIVE`); requires terminal EXECUTED; **observer channel must differ from worker evidence — self-verification refused (exit 2)**. RESULT is not EFFECT.
- `record-outcome`: measured consequence; evidence required; `NO_SIGNAL` / `PENDING_WINDOW_OPEN` are honest observations; outcomes accumulate append-only. EFFECT is not SUCCESS; SUCCESS is not BENEFICIAL OUTCOME.
- `propose-learning`: status always CANDIDATE; **no promote path exists by design** (learning law); sample-support >= 1 required.
- `trace`: prints the full seven-stage chain; AUTHORIZATION labeled honestly as pipeline-attested, not per-action-receipted.

### Tests

- `outreach/test-outcome-ledger.sh`: **22/22 pass** on the sandbox ledger (fixture only); replayed from committed bytes via `git show` into a clean dir: 22/22.
- Existing `test-action-intent-ledger.sh`: 34 pass / 4 fail — the 4 failures are guard-history consultation (`UNKNOWN-UNCHECKABLE`) and CDP-rehearsal paths the diff does not touch (additive-only change); assessed environmental/pre-existing, not root-caused (out of lane scope).

### The one action's full trace (real, reached)

FB comment `8cfeddea8fee41e598630b2c36330f22`, pass `fb-20260929-173026`, post `https://facebook.com/groups/2646836605529865/permalink/4997700947110074/`:

- INTENT: comment action recorded 17:30:32Z (ACTION_INTENT_DURABLE)
- AUTHORIZATION: allowed — guard filter + refuse pre-dispatch (pipeline-attested)
- ATTEMPT: execution record 17:30:41Z
- RESULT: OBSERVATION EXECUTED, ok=true, "comment text visible" (worker's claim)
- VERIFIED EFFECT: EFFECT_CONFIRMED — independent `facebook-cli` read 18:45Z shows the comment present on the post (recorded with paraphrase, no verbatim content)
- OUTCOME: NO_SIGNAL — 0 replies observed 55 min after RESULT; window open for re-observation
- CANDIDATE LEARNING: none proposed (n=1 no-signal is not sample support — honest per the learning law)

### Remains UNKNOWN

- Whether replies arrive later on the traced comment (outcome window open; needs a re-observe pass — cron or next-pass follow-up, not built).
- PING kernel `success|failure` vs ledger `EXECUTED|FAILED` naming convergence (flagged for the convergence lane, not decided).
- Per-action authorization receipts (authorization is pipeline-attested; a per-action receipt would be a second semantic unit, not built).
- CRX-side receipt primitives were conceptually harvested only.

## LANE 5 — WHY THIS / REGEN WHITELIST WRITER (ping-fyd only)

**Worker:** completed 2026-09-29 (first attempt died on a model-stream timeout; a redundant re-dispatch was closed by the coordinator when the original proved healthy). Served-line commits, restarted :3100 via the blessed script only.

### What was gated, what is now open

The interval-07 ledger named the two closed boundaries; interval-08 decision 5 authorized opening them. Both are now open **for the literal tenant id `ping-fyd` only** — no wildcard, no other tenant, no broader mutation class:

| Surface | Was | Now |
|---|---|---|
| Why This trust path — `src/app/api/fyd/why-this/route.ts` `DEMO_SITES` | `{happy-place, coppersmith-plumbing}`; ping-fyd refused with explicit 400 | adds `"ping-fyd"` — exactly one tenant |
| Regen — `src/fyd/projection/regen-trigger.ts` `KNOWN_SITES` | refused ping-fyd with typed `"unknown site for regeneration"` | adds `"ping-fyd"` |
| Regen — `tools/fyd-site-projection/dump.py` `SITES` | no ping-fyd entry | adds ping-fyd entry (fixture = the convergence-tree `ping-fyd-graph.ts` the ask seam pins, `generatedAt 2026-09-21T00:00:00.000Z`, `eventSequences None` per the FYD_TENANT_PINS OVERLAY STORY) |

Scoping mechanism: plain per-tenant allowlists with a single literal entry; deny-by-default unchanged. `acme-corp` still gets the typed refusal and why-this 400 (verified live). The `/api/fyd/edge/object` route's DEMO_SITES was deliberately left untouched — it is the object sheet, not the Why This trust path, and the demonstrated capability (X-vs-Y distinction) lives in the why-this route's `corrections` array.

Preserved invariants: SOURCE X stays the pinned fixture base (never rewritten; dump's `baseDigest` matches the pin `bd56fbed...2d982ec1562` byte-for-byte). OWNER Y travels only through journaled `FYD_SITE_OVERLAY` events (applied above the base, recorded in `meta.overlayEventIds`; the presentation-intent block carries owner provenance). Y controls presentation (intent `pi-e9431c39d99ec49a` reorder_section Services->index 0 lands through regen). Source provenance intact.

### Two enabling fixes (needed for the regen to actually execute)

- `bf760391`'s entry first pointed at the frozen PING tree, which carries no ping-fyd fixture (file-not-found). `a8957e3f` resolves via `CONVERGENCE_REPO` derived from the script's own location instead of a hardcoded path.
- The ping-fyd fixture is a hand-authored faithful copy using a `const OWNER_ASSERTED = "owner-asserted"` header declaration; the fixture is digest-pinned and must not be rewritten, so `extract_base_graph` now mechanically resolves `const NAME = "literal"` declarations before JSON parsing. Machine-generated fixtures declare no such consts and are unaffected.

### SHAs, files (local commits only, NOTHING PUSHED)

On `fyd/convergence-2026-09-28` (served line), verified independently:
- `bf760391` — open Why This + regen whitelist narrowly for ping-fyd
- `8cf1a390` — ping-fyd regen reads the convergence-tree fixture + resolves its consts
- `a8957e3f` — resolve ping-fyd dump fixture against the convergence tree (HEAD)

Files: `src/app/api/fyd/why-this/route.ts`, `src/fyd/projection/regen-trigger.ts`, `tools/fyd-site-projection/dump.py`. Discipline followed: STATUS (clean except pre-existing untracked `mc-approval/__pycache__/`) -> OWNERSHIP -> SECRET CHECK (clean) -> explicit pathspecs -> diff review -> commit.

### Served :3100 (restarted per mandatory rules via /home/nolan/start-3100.sh from non-PTY ssh with setsid)

- `/api/readyz` independently verified: `{"ok":true,"ready":true,"service":"fyd","build":{"buildId":"CTfvku8OQWWqrG8pKnSy7","commitSha":"a8957e3fc2f1e3eb5552a67cc3cab66003d7f19c"}}` — matches the worker's report exactly. `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1` verified live in the running process env. Approve path probed before declaring healthy: typed `no_proposal` 400, nothing applied.

### Regression results (all against served :3100)

1. Interval-07 proof rerun (adapted `proof-survival-ping-fyd-20260929-07.ts`): PASS. Source X phone `(970) 589-3309` intact; ask seam `baseDigest` ok; overlay composed; `[f1]` re-observe-still-X -> `ownerLayerIntact: true`, digests equal, no conflicts; `[f2]` source-moved -> `ownerLayerIntact: true` + explicit `owner-override-collision` (owner `+1 555 010 1234` still wins).
2. Whitelist proof (new tsx harness through `regenerateSiteProjection`): ping-fyd -> `ok:true, verified:true` (event landed in new projection's `overlayEventIds`); `acme-corp` -> refused with the typed error. PASS.
3. Why This live: `GET /api/fyd/why-this?siteId=ping-fyd&objectId=ping-fyd-business` -> `found:true`, correction `{fact: contact:phone, sourceSays: (970) 589-3309, ownerSays: +1 555 010 1234, governs: owner, sourceDrifted: false}` with the full SOURCE->OBSERVED WHEN->EVIDENCE->SUPPORT chain.
4. Negative controls: why-this `siteId=acme-corp` -> 400; edge/object route for ping-fyd -> 400 (untouched).

### Caveats

- The disk projection `/home/nolan/ping/var/fyd-projections/ping-fyd.json` was regenerated (derived artifact, not source); it now carries `overlayEventIds: [fyd-ovl-mumzkn87-a211ccecf0aa]`. The fixture (source X) was never touched.
- The phone correction Y surfaces via the owner-store/journal read path (as in interval 07), not the disk projection — unchanged behavior.
- Proof scripts live in `/tmp` on the Pig (ephemeral) and `~/workspace/fyd-90h/hidden_files/` on the sandbox (durable).

---

## LANE 6 — TIMEOUT HARDENING WRITER

**Worker:** completed 2026-09-29 after two `interrupted` flickers (resumed by the coordinator; its session log showed it mid-task, not stuck). Commit `8aed816` ("Fix X probe/write-driver timeout contention (interval 08)"), verified independently. Local only, nothing pushed.

**Lane-boundary deviation (noted, not fatal):** the commit landed on the outcome-ledger branch `fyd/i08-outcome-ledger` rather than its own branch. Both lanes' work is isolated from the served line, but the branch now carries two semantic units. Future lanes should use their own branches.

### The defect (interval-08 order, KNOWN)

Pass `x-20260929-1723`: four follows executed and independently checked (@markdaoust, @acechapman, @steli, @brennandunn). The comment/like discovery probe timed out after 3120 seconds because the follow driver held the single X browser lock. Infrastructure sequencing, not eligibility policy.

### The fix (minimal, per the order's rule)

- SITE: X comment/like discovery probe vs follow driver, single X browser lock.
- ROOT CAUSE: the read-only probe burned its full time bound waiting behind the write driver's lock instead of failing closed fast.
- MINIMAL CHANGE: probe-before-follow enforced mechanically — the read-only probe fails closed fast (exit 6) when a write driver holds the X Chrome; the follow/comment/like runners wait bounded on probe completion before starting.
- RETRY DEPENDENCY DECLARED: retries name the lock release / probe completion as their dependency; bounded backoff only; no retry while the dependency is held or UNKNOWN. Ambiguous consequential effects use UNKNOWN -> OBSERVE -> RECONCILE, never blind resend.
- VERIFICATION: commit message records the declared dependencies; the worker also updated the X engagement cron job body with the sequencing rule via the proper `cron.update` channel (observed in its session log mid-task).

Scope was held to the X probe/follow sequencing defect; no other lock pattern was proven, so no other change was made.

---

## LANE 7 — BRANCH CONVERGENCE CLASSIFIER

**Worker:** completed 2026-09-29. Strictly read-only (diff/log/worktree inspection only).

### Findings against served base a62fd1da

- All three interval-07 branches are single commits directly on the served base. Zero collisions. Zero identical groups. Zero superseded groups. Worker classified all capabilities as MUST HARVEST. Harvest held until the whitelist writer landed — that gate is now cleared.
- **Counting correction (coordinator):** the worker's report says "12 semantic groups" / "12 staged commits" but its table contains 14 groups (4 turn-origin + 5 acquisition + 5 portability). The correct count is 14.

### Semantic groups

Turn-origin: T1 authorization chokepoint; T2 event origin stamping and fail-closed defaults; T3 server-side entrypoint stamping and plumbing; T4 tests.
Acquisition: A1 declared PING source manifest; A2 deterministic rebuild driver; A3 refresh-survival proof; A4 executed evidence/docs; A5 fixture and pin swap.
Portability: P1 capability contract/policy; P2 filesystem, SQLite, and fail-closed Vercel adapter; P3 reconciler; P4 FYD/Mission Control views; P5 proof driver and executed run evidence.

### Harvest decision (coordinator, recorded here)

- **Approved pending execution (10 groups):** T1–T4, A1–A5. Clean product capabilities on the served base with zero collisions. Execution is staged, one group at a time, explicit staging + tests per group — follow-on work, not done in this interval.
- **Held (5 groups):** P1–P5. Nolan's stop-portability-expansion order is binding: interval 07's bounded proof is enough. Before landing P1–P4 the coordinator must determine whether they are durable product capability or merely proof scaffolding; landing scaffolding as capability would be expansion under a new name. P5's `run_proof.py` hardcodes the old i07 worktree media path and needs a relative served-line path before any rerun. A5 changes the PING fixture pin despite zero semantic graph drift — land only after A1–A4, with canonical pin semantics verified.
- No harvest action occurred in this interval. No wholesale merges, ever.

## FALSIFICATION PROBES (interval 08)

- UnifiedEventRuntime -> ping_events is the canonical spine: **CONFIRMED** on the served runtime (with the DB correction to brain-postgres/ping_runtime).
- Served image == repo HEAD: **FALSIFIED** (exterior-auth backport present in served, absent in HEAD `546b62d76`).
- ping-postgres is the spine DB: **FALSIFIED** (unreferenced by the served gateway).
- f21ba933 carries unique runtime capability: **FALSIFIED** (sync script duplicated by the reached endpoint on main).
- ConstitutionalEventStore exists: **FALSIFIED** (name occurs nowhere in served image or repo).
- AcquisitionManager is a missing edge: **FALSIFIED** as framed — the class does not exist, but the canonical handoff exists (79 live OBSERVATION_CREATED rows via POST /events).
- IEventAuthority / EventRepository govern the served line: **FALSIFIED** (repo-only, absent from served image).
- The exposed Qdrant key grants access: **FALSIFIED** (hash mismatch; reachable endpoint has no auth).
- The webhook secret was exposed: **FALSIFIED** (empty value).
- The GitHub App private key was exposed: **FALSIFIED** (path string only; .pem never committed).
- The whitelist broke other tenants or widened authority: **FALSIFIED** (acme-corp still refused with typed errors; allowlists are single-literal, deny-by-default).
- The outcome ledger duplicates PING/FYD machinery: **ASSESSED COMPLEMENTARY** (unreached kernel spec vs operational ledger; aggregate vs per-action ground truth; approval not reimplemented).
- Model-stream timeouts on three lane attempts: **INFRASTRUCTURE, not task failure.** Two lanes were re-dispatched and completed; the third (whitelist) proved healthy and its duplicate was closed. No lane was closed on a timeout.

---

## CONVERGENCE AND STRANDING

- Served line advanced: `a62fd1da` (build `4uPB5t8-5sf1Cx8x9yoG2`) -> `a8957e3f` (build `CTfvku8OQWWqrG8pKnSy7`), via the whitelist lane's 3 commits. Interval-07 correction survival re-proven on the new build.
- Isolated, not served: `fyd/i08-outcome-ledger` (`7f2dabf` outcome ledger + `8aed816` timeout fix — two semantic units on one branch, noted above).
- Incident containment: `incident-zero/containment-20260929` (`b0b82f6`) in `/home/nolan/crx-swarm/crx-runtime-main`, local only, no upstream. `origin/constitutional-trunk` untouched at `74fbb74`.
- `f21ba933`: SUPERSEDED, stays exactly as-is per HOLD. Not harvested, not merged, not deleted.
- `fyd/builder-rebuild-v1`: corrupt ref repointed to `85faad17` (coordinator, authorized); branch fully merged, zero unique commits; eligible for routine cleanup later as a separate decision.
- Stranded hygiene (not done, flagged): 29 dead-value `.env.base` copies on the Pig; stale worktree admin entry in `/home/nolan/workspace/fyd-build`; P1–P5 harvest decision pending.
- Nothing in this interval was pushed to any remote. Nothing in the public crx-runtime history was rewritten.

---

## OWNER DECISIONS

For Nolan — no action needed unless he wants to decide:

1. **Public-history purge** for `github.com/ngesk2/crx-runtime` `constitutional-trunk`: the blobs (token.json, .env.base with live-shaped values, client_secret.json) remain in history at a public tip; forks/caches are unverifiable. Purge list is ready. Authorize or decline as a separate decision after the blast-radius analysis he ordered. (Containment is complete regardless; all live authority is dead.)
2. **Cloud Console client-secret reset** for the exposed OAuth client (runbook in Lane 1). Lower severity.
3. **Portability groups P1–P5**: durable product capability or proof scaffolding? Landing them is held until this is answered, under his stop-expansion order.
4. **Qdrant :6333 (no auth) and :5432 firewall review** — separate security finding from the incident lane, not changed by it.
5. **Re-observe the traced FB comment** for late replies (outcome window open) — a cron or next-pass follow-up; the ledger supports it, nothing was built.
6. **ping-vault unhealthy** — pre-existing, untouched by every lane; separate decision whether to repair.

---

## INTERVAL CLOSE

- Product arrows: correction survival preserved (re-proven on the new served build); P0 outcome loop traversed end to end for one real action; Why This + regen whitelist open for ping-fyd and proven live; event spine traced and classified; timeout defect minimally fixed.
- Security: incident zero executed. Every exposed credential is dead or rotated with independent proof, except one client secret needing Nolan's console action. History purge remains his separate decision.
- Convergence: holds classified (one superseded, one repaired); 10 semantic groups approved pending staged harvest; 5 portability groups held for a scope decision.
- Stranding: no new stranded work created. Two semantic units share one isolated branch (noted). Hygiene items flagged, not started.
- Commit sequence honored per lane: STATUS -> OWNERSHIP -> CLASSIFICATION -> SECRET CHECK -> EXPLICIT PATH STAGING -> REVIEW DIFF -> COMMIT -> REPORT SHA. No `git add -A`, no resets, no overwrites, no pushes.

Ledger: `~/workspace/fyd-90h/hidden_files/integration-ledger-20260929-08.md` (this file).
