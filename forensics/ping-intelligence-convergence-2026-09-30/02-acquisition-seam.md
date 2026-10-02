# L2 — ACQUISITION SEAM: where acquisition output goes in PING today

**Investigator:** L2 acquisition-seam subagent (read-only). **Date:** 2026-09-30.
**Repos searched:** `/home/nolan/ping` (git branch `lane-b/tenant-dispatch-threading`, HEAD verified at search time),
`/home/nolan/ping-gateway-src`, `/home/nolan/ping-gateway-build`, `/home/nolan/projects/constitutional-runtime`
(branch `constitutional-trunk`); plus local `~/workspace` for external emitters (tandem, fyd-lane, ping-infra, acquisition-seam).
**Transport:** `pigwsl-exec` (Pig reachable; probe answered once, no hammering). `/home/nolan/projects/ping-constitutional`
does **not** exist on the Pig (FYD adapter repo is gone/moved — see NEEDS-REVERIFY).
**Scope:** exactly one file written (this report). No code read was executed beyond grep/cat.

**Grade key:** PROVEN = definition + call sites cited from live source. NOT PROVEN = searched, not found. NEEDS-REVERIFY =
could not be closed from available evidence. UNKNOWN = legitimate per the evidence standard (absence of evidence is
not evidence of absence; each finding states what was searched).

---

## 1. HEADLINE VERDICT

**The acquisition seam is open but unmanned.** There is NO live mechanism that turns an EXTERNAL observation
(web page, API response, file) into a durable PING event. The desired conceptual path
`external observation → acquisition → Evidence → canonical event authority → durable PING event` is
**broken between the fetch stage and the emit stage**:

- The fetch stage exists only as (a) dead code in `/home/nolan/ping` and (b) unwired scratch/staging tooling in `~/workspace`.
- The emit stage exists and is PROVEN (`POST /ingest` → `CanonicalizationService.canonicalizeAndEmit` →
  `UnifiedEventRuntime.emit` → `ping_events`), **but has zero live production callers** — an open door nobody walks through.
- The only live external-observation ingress is `POST /events`, fed by **human/agent-operated scripts**
  (`~/workspace/tandem/emit-observation.py`, `~/workspace/fyd-lane/lane-e/emit-overlay.py`) and the FYD website BFF
  envelope branch. There is no automated acquisition feeding either door.

**AcquisitionManager: still a phantom.** `git grep` on the current branch returns **zero hits** for
`AcquisitionManager`/`batchCollectEvidence` in `/home/nolan/ping` and `constitutional-runtime` — **PROVEN absent**
(third confirmation after 2026-09-19 phase-2b and 2026-09-23 event forensics). There is no class by that name,
so there are no callers and no seam to close for it.

**NOT acceptable path check:** no `acquisition → private intelligence database` and no marketing-os-owned event
store were found in code. The only staging files (`~/workspace/tandem/event-spool.jsonl`,
git-ingest `evidence.jsonl`) are operational staging buffers, not event stores. **PROVEN** (by exhaustive search
of the terms; nothing proposing a private event store was found).

---

## 2. CANDIDATE-BY-CANDIDATE TRACE (fate codes: a = durable PING event via canonical boundary; b = private store; c = in-memory to caller; d = dead code)

### 2.1 `AcquisitionAuthority` / `ContinuousAcquisition` (GitHub acquisition) — fate: (d) DEAD CODE

- **Definition:** `/home/nolan/ping/gateway/acquisition_authority.js` (262 lines): `AcquisitionAuthority` class;
  `acquireRepository(owner, repo)` (line 73) fetches via `GitTransport`, snapshots via `snapshotAuthority`,
  registers objects into the injected `objectRegistry` (lines 80, 152); `acquireCommit` (line 109) additionally
  calls `this._eventBus.emit('commit_acquired', {...})` at **lines 154-160** — note this emits on the *injected*
  eventBus, which is a constructor argument; whether that lands in `ping_events` depends entirely on what was
  injected, and the object registration target (`_objectRegistry.register`) is likewise injection-dependent.
  `handleWebhook` (line 178) and `trackRepository` (line 44) are entry points with no external callers.
- **Call sites:** the ONLY constructor call is `gateway/continuous_acquisition.js:36`
  (`new AcquisitionAuthority(postgresPool, objectRegistry, eventBus)`). **Zero code requires
  `continuous_acquisition.js`** — `git grep` for `require.*continuous_acquisition` and for the bare string
  `continuous_acquisition` returns only doc/dependency-graph mentions and a
  `ping-runtime/orchestration/dormant_classifications/gateway_acquisition_authority.json` classification entry.
  It is classified dormant by the repo's own machinery.
- **Chain breaks at:** `continuous_acquisition.js:36` → nothing. The chain breaks **before** the first hop:
  no live module constructs `ContinuousAcquisition`, so no `AcquisitionAuthority` ever exists at runtime.
- **Grade: PROVEN (d).** Even if constructed, the fate of its output is injection-dependent (a/b both
  undetermined) — but the entry is dead, so the question is moot.

### 2.2 `constitutional_acquisition_loop.js` / `constitutional_acquisition_runner.js` — fate: (d) DEAD CODE

- **Definition:** `/home/nolan/ping/gateway/constitutional_acquisition_loop.js:37` requires
  `./constitutional_knowledge_acquisition` — but **`gateway/constitutional_knowledge_acquisition.js` does not
  exist** (verified via `ls`; `MISSING`). Any `require` of the loop file throws. **PROVEN.**
- `gateway/constitutional_acquisition_runner.js:87-100` is an explicit **no-op**: "Phase 1: Knowledge
  acquisition removed", "Phase 2: Knowledge acquisition removed". Zero requirers in code. **PROVEN (d).**
- Chain breaks at the `require` itself — there is no acquisition implementation behind the loop.

### 2.3 `gateway/github_snapshot.js` (400 lines) — fate: (d) DEAD CODE

- **Definition:** fetches repos/branches/commits/PRs/issues/releases/tags/contributors (per REPOSITORY_RUNTIME_REPORT).
- **Requirers:** only `gateway/end_to_end_verifier.js:19`, `gateway/git_transport.js:12`,
  `gateway/github_constitutional_pipeline.js:39`, plus `continuous_acquisition.js` (all non-production/dead).
  The repo's own runtime report marks it **DORMANT**. **PROVEN (d)** — fetches GitHub data in principle, but no
  live path invokes it, and nothing routes its output to any event authority.

### 2.4 `Dispatcher.collectEvidence` (`ping-runtime/orchestration/dispatcher.js:157`) — fate: (d) DEAD CODE

- **Definition:** returns a plain in-memory aggregate object; no persistence, no emit, no DB.
- **Call sites:** zero repo-wide (confirmed again this pass; prior forensics identical). **PROVEN (d).**

### 2.5 `constitutional-runtime` Python acquisition models — fate: (d) DORMANT STACK

- `capabilities/github/acquire_repository.py` (acquisition capability, `AcquisitionProvenance` at lines 189-198),
  `constitution/models/evidence.py` (`AcquisitionProvenance`, `acquisition_witness`), `hermes/runtime/artifact_repository.py`
  — all exist, but the Python stack is the dormant parallel implementation: `api/main.py` contains no live wiring
  to it (prior 2026-09-23 refutation stands; this pass re-searched and found no new wiring). **PROVEN (d)** for the
  live path; the mechanism exists but is unwired.

### 2.6 `~/workspace/acquisition-seam/acquire-url.ts` — fate: (c) IN-MEMORY, UNWIRED

- **Definition:** SSRF-hardened URL fetch seam (LANE ACQ-1, 2026-09-24): one exported `acquireUrl(url, opts)`;
  returns `{ ok: true, bytes, contentType, finalUrl, redirectChain }` — an in-memory object to the caller.
  58/58 hostile battery passes (README evidence). **PROVEN (c).**
- **Call sites:** zero — it lives in sandbox scratch; the README's own "Adoption" section says "built in scratch",
  adoption into the FYD repo was never confirmed. It has **no import path into PING**: no caller, no emit, no
  event. This is the fetch half of the missing seam in its purest form: a working fetcher with no path to
  `UnifiedEventRuntime.emit`.
- **Grade: PROVEN (c).** NOT dead code (it works and is tested), but its output can only go to a caller, and
  there are none.

### 2.7 `~/workspace/ping-infra/git-ingest/` (GitHub commit ingester) — fate: (b) PRIVATE STAGING JSONL, PING HALF UNWIRED

- **Definition:** `src/git_ingest/ingest.py` walks public repo commits; `emitter.py` builds the exact
  `OBSERVATION_CREATED` envelope shape (`aggregate_id, aggregate_type, event_type, event_data`) per the
  `tandem/emit-observation.py` convention; dedupe via `DedupeLedger` on sha256 of canonical observation text.
- **Sinks:** `FileSink` appends envelopes to a local JSONL (used by all tests; `evidence.jsonl` staging).
  `GatewaySink.emit()` **raises NotImplementedError**: "GatewaySink is integration-time only... Refusing to
  half-fire." — it documents the `http://127.0.0.1:8080/events` POST convention but never fires. **PROVEN.**
- **Call sites:** tests only (`tests/test_emitter.py`, `tests/test_ingest_kill.py`). No cron, no worker, no
  coordinator wires it. Its output lands in a **private JSONL staging file nothing else reads** — fate (b),
  and deliberately so ("Used for evidence capture and tests. This is a staging surface, not a canonical store").
- **Grade: PROVEN (b).** The PING-bound half is explicitly unwired; integration was never performed.

### 2.8 `POST /ingest` — the canonical boundary — fate: (a) LIVE, but ZERO LIVE CALLERS

- **Definition (mount):** `/home/nolan/ping/gateway/routes/ingest.js:28` (`createIngestRoutes(canonicalizationService)`);
  mounted at `/home/nolan/ping/gateway/bootstrap/gateway_runtime.js:707`. Also mounted in the deployment copy
  `/home/nolan/ping-gateway-src/gateway/bootstrap/gateway_runtime.js:798` (with `exteriorAuthMiddleware`).
  **NOT** present in `/home/nolan/ping-gateway-build` (build-context dir contains only `gateway/routes/events.js`
  under routes/) — copy divergence, see §4.
- **Write path:** `routes/ingest.js:48` `canonicalizationService.authorizeNamespace(body.source, body.namespace)` →
  `routes/ingest.js:53` `canonicalizationService.canonicalizeAndEmit({...})` →
  `ping-runtime/canonicalization/canonicalization_service.js:149` `canonicalizeAndEmit` (builds canonical envelope,
  default `confidence: 0.5`, `lifecycle_stage: 'observation'`) → `canonicalization_service.js:183`
  `this._eventRuntime.emit(...)` → `ping-runtime/events/unified_event_runtime.js:185` `emit` →
  `unified_event_runtime.js:289` `INSERT INTO ping_events (event_id, event_type, source, timestamp, payload, metadata, namespace, tenant_id) ... ON CONFLICT (event_id) DO NOTHING`.
  Composition root: `gateway_runtime.js:434` (`new UnifiedEventRuntime`), `:448` (`new CanonicalizationService`).
  **PROVEN (a)** — the exact missing seam, fully wired, empty.
- **Call sites (callers):** exhaustive search (`~/workspace` + `/home/nolan/ping`) finds NO production caller.
  Only: `gateway/test_ingest_boundary.js:238`, `gateway/test_tenant_spoof_ingress.js:76` (test files), and the
  2026-09-16/17 live boundary probes (valid 201 / invalid namespace 400, per `ping-overnight/event-boundary/REPORT.md`).
  `emit-observation.py` deliberately posts to `/events`, not `/ingest`. **PROVEN: zero live callers.**

### 2.9 `POST /events` — live spine, fed by human/agent-operated emitters — fate: (a) LIVE

- **Definition:** `/home/nolan/ping/gateway/routes/events.js` — direct branch (`event_type/aggregate_id/aggregate_type/event_data`
  → `eventRuntime.emit`) plus the website-BFF envelope branch at **lines 189-196**: `{type, payload, proof, metadata}`
  envelopes route through `../knowledge_ingest_adapter` (`ping.knowledge.*` schemas) or `../social_ingest_adapter`
  (everything else) → `normalizeKnowledgeEnvelope` / `normalizeBffEnvelope` (signature verification, vocabulary
  enforcement, ids minted via IdentityAuthority) → **line 215** `eventRuntime.emit(norm.eventType, 'api', norm.eventData, {...})`
  → `ping_events`. Both `social_ingest_adapter.js` (332 lines) and `knowledge_ingest_adapter.js` (276 lines) exist.
  **PROVEN (a).**
- **Callers (external observation → durable event), each with file:line:**
  1. `~/workspace/tandem/emit-observation.py:502` (`deliver_observation`): POSTs `{event_type: 'OBSERVATION_CREATED',
     aggregate_id, aggregate_type, event_data}` (built at lines 616/649) to `http://127.0.0.1:8080/events` via SSH
     PowerShell on the Pig (lines 503-543), Bearer <redacted> resolved at runtime from the `ping-gateway` container env
     (`docker exec ping-gateway printenv MUSE_LEVEL_1_KEY`), never stored. Fail-closed gates: semantic-domain gate
     (line 90, prospect/intel discovery refused, exit 2), duplicate-emission guard (observation sha256 on sidecar),
     durable spool-first (`tandem/event-spool.jsonl`) with exit 3 = spooled-but-undelivered. **Invoked by:**
     the `ping-social-outreach-discovery-research` cron (enabled, 6h, step 7: verify-then-emit per engine step-4e —
     `mark-verified.sh` → emit-observation.py → `mark-distill-closed.sh`), and `tandem/event-spool.py ship`
     (invoked by the `meta-ai-intel-pass` cron reporting step 7, spawning emit-observation.py as a subprocess,
     event-spool.py:383-393). **PROVEN (a).** (Note: `adversarial-pass-2026-09-13.md:155` says "manual-only: nothing
     invokes it automatically" — that note is **stale/superseded** by the current cron bodies, which explicitly
     direct scheduled invocation. Flagged, not relitigated.)
  2. FYD website BFF (prior forensics: `src/lib/ping/ping-object-reader.ts:279,322,370` → `GET/POST /events`; the
     repo `/home/nolan/projects/ping-constitutional` **no longer exists on the Pig** — FYD-side file:line is
     NEEDS-REVERIFY, but the gateway-side seam (`routes/events.js:189-196` + adapters) is PROVEN on the current branch).
  3. `~/workspace/fyd-lane/lane-e/emit-overlay.py:32` (`GATEWAY_URL = http://127.0.0.1:8080/events`, overridable via
     `FYD_GATEWAY_URL`, default demo `http://127.0.0.1:18199/events`): POSTs FYD owner-correction overlay events;
     invoked by `fyd-generator-edit.py` in lane-E runs. **PROVEN (a)** — FYD owner-correction → durable PING event
     is the one closed acquisition-like loop, and it is operator-driven, not automated acquisition.
  4. Business emitters (`ReviewEmitter`, `CustomerEmitter`, etc. via `CanonicalizationService` in the bootstrap) —
     internal producers of business events, not external acquisition. Listed for completeness; **PROVEN (a)** but
     out of the acquisition scope.
- **What did NOT call it:** nothing automated that fetches the open web/API/file into Evidence. The acquisition
  verbs searched (`acquire`, `crawl`, `scrape`, `fetch-and-store`, `rss`, `newsletter`, `webhook`, `ingestor`)
  yield no live production code in the JS core.

---

## 3. THE EXACT MISSING SEAM

**Precise statement:** The fetch stage and the emit stage are both real, but they are not connected by any
producer. Concretely:

- `~/workspace/acquisition-seam/acquire-url.ts` **produces** a fetched external observation (bytes, contentType,
  finalUrl) at call time, but has **zero call sites** — the chain breaks between "fetch result exists in memory"
  and "any POST to the canonical boundary."
- `~/workspace/ping-infra/git-ingest/src/git_ingest/emitter.py:65` **refuses** to POST its envelopes
  (`GatewaySink.emit` raises `NotImplementedError`); its output terminates in a private staging JSONL
  (`FileSink`) — the chain breaks between `emitter.py:65` and `http://127.0.0.1:8080/events`.
- `POST /ingest` (`/home/nolan/ping/gateway/routes/ingest.js:48,53` → `canonicalization_service.js:149,183` →
  `unified_event_runtime.js:185,289`) is the canonical door purpose-built for external observations
  (`confidence: 0.5`, `lifecycle_stage: 'observation'`), and it is **live**, but the chain breaks at
  `routes/ingest.js:31` (the first line of the POST handler): **no production caller ever reaches it.**
- The only external observations that DO reach `ping_events` are hand-carried by agents/scripts through
  `POST /events` (`emit-observation.py:502`, `emit-overlay.py:32`) or typed by users through the FYD BFF
  (`routes/events.js:189-196`).

**In one sentence:** acquisition in PING today is a human-in-the-loop HTTP POST, not a pipeline; the automated
path `external observation → acquisition → Evidence → canonical event authority → durable PING event` has no
live producer, and the canonical door built for it (`/ingest`) has never had a caller.

---

## 4. COPY DIVERGENCE + NEEDS-REVERIFY (what this lane could not close)

1. **NEEDS-REVERIFY — which gateway bytes run in the Oracle `ping-gateway` container.** `/home/nolan/ping` (current
   branch `lane-b/tenant-dispatch-threading`) and `/home/nolan/ping-gateway-src` both mount `POST /ingest`
   (`gateway_runtime.js:707` and `:798`); `/home/nolan/ping-gateway-build` lacks `routes/ingest.js` entirely
   (only `routes/events.js` present). Which bytes the container runs cannot be proven from Pig-side source alone
   (same open item as 2026-09-23 forensics §"Single most important unresolved event question"). Read-only probe
   candidates: `POST /ingest` with valid body → 201 vs 404; `docker exec` container source export.
2. **NEEDS-REVERIFY — FYD adapter repo location.** `/home/nolan/projects/ping-constitutional` does not exist on
   the Pig (verified `ls`). Prior forensics cited `src/lib/ping/ping-object-reader.ts:279,322,370` → `POST /events`
   from that repo; the gateway-side BFF branch (`routes/events.js:189-196`) is PROVEN on the current branch, but
   the client-side callers' file:line citations are unverifiable until the FYD repo's current location is found.
3. **NEEDS-REVERIFY — no DB-side caller inventory.** "Zero live callers of /ingest" is a code-search claim; a
   2026-09-16/17 boundary probe did POST /ingest (valid 201). A `ping_events` query for events whose
   `source`/`metadata` matches an ingest-shaped submission would be the runtime-side confirmation; not run (read-only
   lane did not touch the DB).
4. **Stale note flagged:** `tandem/adversarial-pass-2026-09-13.md:155` ("emit-observation.py is manual-only")
   is superseded by the current `meta-ai-intel-pass` and `ping-social-outreach-discovery-research` cron bodies,
   which explicitly direct scheduled invocation. Not relitigated; recorded so future readers don't trust the stale line.
5. **`_objectRegistry` fate in `acquisition_authority.js`:** injection-dependent by design; since the authority is
   never constructed, this is UNKNOWN-by-construction rather than a gap — the entry is dead, so no private-store
   claim is made or needed.

---

## 5. METHOD NOTES (what was searched)

- `git grep -n -E` on `/home/nolan/ping` (branch `lane-b/tenant-dispatch-threading`) and `constitutional-runtime`
  (`constitutional-trunk`), `:!node_modules`, for: `AcquisitionManager|acquisition|IngestService|collectEvidence|
  fetchAndStore|fetch-and-store|crawler|scraper`, plus follow-ups: `require.*acquisition_authority|continuous_acquisition|
  constitutional_acquisition|github_snapshot|social_ingest_adapter|knowledge_ingest_adapter`,
  `new AcquisitionAuthority|acquireRepository(|acquireCommit(|trackRepository(|handleWebhook(`,
  `createIngestRoutes`, and case-insensitive `rss|newsletter|webhook|_ingestor|Ingestor` over JS.
- Full-file reads (via cat-to-local): `gateway/acquisition_authority.js`, `gateway/continuous_acquisition.js`,
  `gateway/routes/ingest.js`, `gateway/social_ingest_adapter.js`, `gateway/knowledge_ingest_adapter.js`,
  `gateway/routes/events.js` (BFF branch lines 150-240), `tandem/emit-observation.py` (deliver_observation),
  `ping-infra/git-ingest` sources, `acquisition-seam/README.md`; `cron.list`/`cron.view` for emitter invocation.
- One Pig reachability probe at session start; no hammering; no writes to any repo; no process touched; no secret
  values printed (only variable names).
