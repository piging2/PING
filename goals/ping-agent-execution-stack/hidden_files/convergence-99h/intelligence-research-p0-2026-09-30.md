# INTELLIGENCE_RESEARCH P0 — Evidence File
Filed: 2026-09-30 ~18:55 MDT by the research-worker seam writer (subagent).
Order: CEO-ORDER-INTELLIGENCE-CONVERGENCE-2026-09-30.md (P0).

## Commit identity
- Branch: `research/intelligence-worker-p0` (Pig-local; NOT pushed)
- Commit: `9b076c6bc` "intelligence-research: wire INTELLIGENCE_RESEARCH mission seam (P0)"
- Base: `7642d3949` (same base the live image was built from)
- Worktree: `/home/nolan/ping/worktrees/research-p0`
- Diff: 4 files, +1048 lines. `git diff 7642d3949..9b076c6bc --stat`:
  - `ping-runtime/workers/research_worker.js` (new, ~30KB)
  - `ping-runtime/workers/__tests__/research_worker.test.js` (new, 18 tests)
  - `ping-runtime/workers/canonical_workers.js` (+registration, export)
  - `ping-runtime/orchestration/mission_scheduler.js` (+1 map entry)
- Untracked build helper (NOT committed): `Dockerfile.p0` in the worktree (overlay build; see Deploy).

## What was built
`ResearchWorker` (registered name `research`, eventTypes `[INTELLIGENCE_RESEARCH]`):
typed plan from `event.payload.research` (fail-closed) -> SSRF-defended HTTPS
acquisition (DNS-resolution check, private/loopback/link-local/multicast/TEST-NET
rejection incl. IPv4-mapped IPv6, 10s timeout, 1MB cap, max 3 redirects re-validated)
-> `OBSERVATION_CREATED` per source (sha256 digest, excerpt, observed_at via
constitutionalTimeAuthority, explicit digest-bound logical_id) -> deterministic
claim evaluation (term-coverage support, threshold 0.4; sentence-level
negation-pattern contradiction scan; verdict VERIFIED/REFUTED/UNCLEAR;
support[]/counterevidence[] are observation EVENT IDs; contradiction_check
records found/not-found explicitly) -> `CLAIM_CREATED` per claim ->
structured Finding Set returned as the truthy completion result.
`options.aiRuntime` is enhancement-TEXT only (labeled model synthesis, NOT
evidence), optional; `options.fetchImpl`/`options.dnsImpl` are construction-time
injection seams for hermetic tests (unreachable from event payloads).
No new authority/store/runtime. Dormant `intelligence` worker untouched.

## Test evidence
- `node --test ping-runtime/workers/__tests__/research_worker.test.js` in the
  worktree: **18/18 pass** (node:test, mocked fetch/DNS/event-runtime, no network).
  Covers: plan validation fail-closed; observation emission (digests, excerpts,
  distinct logical_ids, correlation preserved); VERIFIED / REFUTED /
  UNCLEAR-conflicting / UNCLEAR-insufficient branches; explicit
  `contradiction_found:false`; finding-set shape; SSRF rejections (non-https,
  private IP, loopback, redirect-to-private); version-token normalization;
  `MISSION_WORKER_MAP` entry; `registerCanonicalWorkers` registers research and
  keeps `intelligence` dormant.
- Clean-checkout rerun: `git worktree add /tmp/research-p0-clean 9b076c6bc`,
  same command: **18/18 pass**. Worktree removed afterwards.
- Integration smoke (real `MissionScheduler` + real `WorkerRuntime`, mock event
  runtime + mock fetch/DNS): mission `assigned_to='research'`, `completed`,
  1 OBSERVATION_CREATED + 1 CLAIM_CREATED emitted. PASS.
- The order named `mission_scheduler.retry_watchdog.test.js` and
  `mission_scheme_convergence.test.js`: **neither file exists** in the worktree
  (24 `.test.js` files, none for the scheduler). Not run; reported honestly.

## Deploy evidence
- Preflight record: `/tmp/ping-gateway-preflight-20260930.json` (Pig). Original
  config: image `ping-gateway:retry-fix-20260930`, entrypoint
  `docker-entrypoint.sh`, cmd `node gateway/server.js`, workdir `/app`,
  user `nodejs`, port 8080->8080, bind
  `/var/lib/docker/volumes/muse-workspace/_data:/app/workspace/muse`,
  network `pig-promotion_default`, restart `unless-stopped`, 17 env vars
  (saved to `/tmp/gw.env` on the Pig, reused via `--env-file`).
- **First broken edge (build):** the repo `gateway/Dockerfile` at this commit
  CANNOT produce a bootable gateway image (pre-existing drift, not introduced
  by this P0): base is `node:24-alpine` vs production `node:18`; no `nodejs`
  user is created (production runs as `nodejs`, uid 1001); and `COPY . .`
  overwrites `/app/package.json` with the monorepo root package.json, so the
  later `npm install` step prunes the gateway deps (express/pg) — the built
  container crash-loops with `Cannot find module 'express'`. This drift is
  owned by the image-promotion P0 lane (CEO-ORDER-FOCUS-THE-SYSTEM P0 #1).
- Deploy path used: overlay image `ping-gateway:research-p0-20260930` built
  from `Dockerfile.p0` (untracked in worktree):
  `FROM ping-gateway:retry-fix-20260930` + COPY of exactly the 4 P0 files.
  Verified in-image: patch present, `node --check` passes on node v18.20.8.
- Swap: `docker stop/rm` + `docker run` with config identical to preflight
  (name, restart, ports, volume, network, user `nodejs`, env-file, entrypoint,
  cmd). Rollback target `ping-gateway:retry-fix-20260930` retained locally.
- Post-deploy: container stable; log shows
  `[CanonicalWorkers] Registered 'research' worker for [INTELLIGENCE_RESEARCH]`;
  scheduler no longer logs `No worker for mission type 'INTELLIGENCE_RESEARCH'`
  (count 0); `/health` = HTTP 503 baseline (pre-existing embedding
  `not_initialized`; gateway/artifacts/integrations/event_governance all healthy,
  no new unhealthy components).

## Acceptance mission (fresh, via container-side node script; POST /missions needs a Bearer key)
- Mission `72dc09886ad305ea`, event `eabaec55-8123-4700-9e9f-35c54c7fcaa0`,
  created_by `intelligence-convergence-p0`, tenant `ping-ops`.
- Question: "Did Crawl4AI 0.9.4 fix SSRF vulnerabilities, and what is its current release?"
  Sources: `https://api.github.com/repos/unclecode/crawl4ai/releases/tags/v0.9.4`,
  `https://api.github.com/repos/unclecode/crawl4ai/releases/latest`.
- Result: `status=completed`, `assigned_to='research'`, duration ~2.6s
  (created 00:30:34Z, completed 00:30:37Z).
- 2 OBSERVATION_CREATED (src=research): real digests (`ff25ea5c…`, both sources
  returned the same release body — v0.9.4 IS the latest), `observed_at` set.
- 2 CLAIM_CREATED (src=research): both verdict **UNCLEAR** —
  claim 1 conf 0.414, claim 2 conf 0.5 (term-coverage support met) WITH
  `contradiction_found:true` (negation-pattern hit on the single-sentence
  minified-JSON blob; conservative by design) → conflicting → UNCLEAR, with
  support[] AND counterevidence[] both referencing the observation event IDs.
  Honest verdict: mixed signals on non-prose input, both sides preserved.
- Downstream cascade on existing machinery: the 2 observations triggered
  CLAIM_GENERATE → 2 more CLAIM_CREATED (src=claim) → 4 CLASSIFICATION_CREATED
  → 4 RECOMMENDATION_CREATED → 4 PROJECTION_CREATED → 4 REPLAY_COMPLETED →
  2 WITNESS_REJECTED (`unverified_replay:conversion_failed`). The witness
  rejections are **pre-existing pipeline behavior**: 29 identical rejections
  since 2026-09-25, latest 22:20 UTC 2026-09-30 (before this mission), and
  **0 verified replays in the last 7 days**. Not caused by this P0.
- Finding-set durability: the scheduler persists `{worker, completed_at,
  duration_ms}` in the mission row (existing P0-3 semantics, unchanged). The
  finding set's durable home is the canonical event journal:
  OBSERVATION_CREATED / CLAIM_CREATED payloads (digests, excerpts, verdicts,
  support/counterevidence refs, contradiction checks, rationales), correlated
  by `correlation_id`, walkable via the trace endpoint.
- Mission Control trace: `GET /mc/missions/72dc09886ad305ea/trace` → 
...[truncated 2337 chars]
