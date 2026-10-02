# LANE A claim-classification ledger
Continuous re-observe / provenance / regression watch. Reader only. No commits, no writes, no restarts.
Conventions: one dated line per claim with evidence. Classes: STILL_TRUE / SUPERSEDED / REGRESSED / MERGED / LIVE / DORMANT / STALE / UNKNOWN. Harvest classes: OPERATIONALIZED / DOCUMENT_ONLY / STALE / CONTRADICTED.
No em dashes in this file.

## Locked decisions (Nolan, 2026-09-24 ~15:45 MDT)
- FYD-Q3: full seven-item phase-17 gate ADOPTED. All seven must close before any unauthenticated visitor publishing. Owner authentication/authorization is an ADDITIONAL gate, not replaced by the seven. Per-item status tracked below.
- FYD-Q4: TIERED GOLDEN BARS. Safety-critical seams (identity, visibility, claim binding, link gating, export): 1.000 on the defined golden set. Presentation: >=0.95 per mission. 1.000 is a release criterion over that test population, not a mathematical zero-risk claim. A safety miss automatically blocks the affected release/wave. Inform Nolan via the orchestrator; do not ask unless changing the acceptance criterion itself is the decision. Lane A applies this as: a safety-seam regression in the cheap watch is a release-blocker report, not a note.

## Re-observed state 2026-09-24 ~16:00 MDT (via pigwsl-exec.sh, read-only)

### STILL_TRUE
- 2026-09-24: main tree /home/nolan/projects/ping is branch fyd-factory @ e474c89b, 43 dirty entries (killed generic direction residue). Read-only for all lanes. Evidence: git branch/status via pigwsl.
- 2026-09-24: production :3100 LIVE: /api/healthz 200, /api/readyz 200 (probed from Pig WSL localhost; local WSL curl fails because :3100 runs on the Pig, not here). Evidence: curl.
- 2026-09-24: template lane /home/nolan/build-template1 is fyd/template-001-hpp-clone @ a28e3e8b, clean, owned by coordinator ae77b28b. Evidence: git.
- 2026-09-24: write-boundary lane /home/nolan/build-idem is fyd/write-boundary-idempotency @ d6c1b05d, clean, 7 commits beyond e474c89b, 13/13 hostile gates. Evidence: git log/diff stat.
- 2026-09-24: ping-vault container unhealthy 2 days (started 2026-09-22T16:54:41Z); recreation HOLD, inventory only. Evidence: docker inspect.
- 2026-09-24: brain-postgres owns host 5432; no second publish (ping-postgres 5433, others on 127.0.0.1 high ports). Evidence: docker ps.
- 2026-09-24: ping-qdrant healthy, ping-redis healthy. Evidence: docker ps.

### LIVE
- 2026-09-24: ping-gateway container healthy on :8080, image ping-gateway:candidate-fffe99f7a@sha256:aa1f085a067383fb6226ffa00d13b70e63be17a5b67ca9810a493c23c5cd6d42, created 2026-09-24 11:38 MDT. /health 200, integrations 3/3 healthy. Evidence: docker inspect + curl.
- 2026-09-24: FYD journal gateway live on 127.0.0.1:18199 (localhost-only), pid 52289 started 14:47, serving main-tree server.mjs byte-identical to idem tip. Evidence: ss + diff empty.
- 2026-09-24: :3100 next-server pid 52354 started 2026-09-24 14:47:27, env has NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1. Evidence: ps + /proc environ.

### SUPERSEDED
- 2026-09-24: FRONTIER 15:40 claim "gateway HTTP surface UNKNOWN" is SUPERSEDED. The :8787 probe was the wrong port; the surface is live on :8080 (/health 200). Evidence: curl :8080.
- 2026-09-24: old "CUTOVER HOLD" on gateway promotion is SUPERSEDED. Cutover executed ~11:38 MDT: digest-pinned candidate image (jev/verdict-authority-hardening @ fffe99f7a) per promotion runbook /home/nolan/ping/promotion/2026-09-24-jev-gateway/. Evidence: container created 17:38:04Z with digest.
- 2026-09-24: CP-7 devin-boundary2 condition (prod image bundles uncommitted capability_authority.js + exterior_auth_middleware.js) is SUPERSEDED. Running image is candidate-fffe99f7a; find for capability_authority* in container returns nothing. Evidence: docker exec find.
- 2026-09-24: lesson "unauthenticated GET /events = 401 means healthy" is SUPERSEDED for the new image generation. Unauthenticated GET /events now returns 200 with full event payloads. Evidence: curl body shows event_id/event_type/payload/metadata.

### REGRESSED (vs prior verified state; significant)
- 2026-09-24: claim "production :3100 serves pure HEAD" is FALSE. Production .next BUILD_ID XQ1er2PAXrb_2nieJrtlC equals build-idem .next BUILD_ID; generateBuildId is unconfigured (random per build), so the match proves a file copy, not a rebuild. build-manifest.json and app-build-manifest.json identical. Copy at 14:46-14:47 MDT; :3100 restarted 14:47:27. /api/healthz + /api/readyz return 200, and those routes exist ONLY in the idem branch (new files in d6c1b05d). Served surface = HEAD e474c89b + idem lane 7 commits. Note: idem lane is committed and 13/13-gated, so this fits the 14:13 "harvest only individually proven, committed changes" directive; the FRONTIER "pure HEAD" wording is what is wrong.
- 2026-09-24: gateway /events is publicly readable without auth (200 + full event payloads incl. event_ids, mission metadata). Prior verified state was 401. Auth middleware absent from candidate image. Probed from Pig WSL localhost; external reach not tested. Security-relevant; PigiGatewayWatch 401-healthy branch now stale (falls through to log-only; the 503+degraded restart path is intact). Watchdog script still codes 401 as healthy (lines 44-45, 71).

### CONTRADICTED (lesson vs deployed code)
- 2026-09-24: convergence law "UNKNOWN is PARK/HOLD; lease expiry must never turn UNKNOWN back into CREATED" is CONTRADICTED by the deployed reaper: after an unknown-outcome HOLD the mission leaves _processing, lease expires, reapExpiredLeases resets it to created, auto-redispatch ~60s later. Evidence: ~/memory/2026-09-24.md:1372; ~/workspace/AGENTS.md reaper-vs-HOLD gap. Fix proven 22/22 in ~/workspace/f01-fix/ (parkHold, reconcileHold, _failMission gate), NOT deployed or committed; Nolan design word pending. Lane F owns the port.

### STALE
- 2026-09-24: 12:40 incident note "production now serves pure HEAD" was true at 12:40, stale after the 14:47 idem deployment.
- 2026-09-24: PigiGatewayWatch 401-healthy invariant is stale for the candidate image (degraded-503 path still valid).

### DORMANT / HOLD
- 2026-09-24: ping-vault recreation HOLD (inventory only). Stable non-laptop execution host BACKLOG. Monument View Coffee outreach auth-gated. Watchdog auto-restart deployment blocked pending Nolan HOLD/reaper semantics.

### UNKNOWN (carried; owned by other lanes)
- 2026-09-24: X auth state; ORCA kill-point behavior (lane F); Ask FYD current implementation (lane E); runtime JEV P0-gate enforcement on the live gateway container (image digest matches certified candidate fffe99f7a; live enforcement not verified by lane A; lane G territory).

## Regression watch 2026-09-24 ~16:00 MDT (cheap; no re-proof)
- FYD invariants suite (src/fyd/invariants, own jest config): 10/10 suites, 90/90 tests PASS in 1.3s. Invariants code clean vs HEAD. Covers G1 (spec determinism, correction-survives-reobservation), G2 (canonical graph, stable identity), G3 (conflicting evidence, invalidation scope), G4 (unknown-capability).
- capability-propagation + identity suites: 9/9 suites, 85/85 tests PASS in 1.5s. Sources (object/, identity/, sitespec/) clean vs HEAD.
- Routes: /sites/happy-place 200; /sites/coppersmith 307 to /sites/coppersmith-plumbing (idem commit b0cdc3b8 alias); /sites/coppersmith-plumbing 200.
- Template lane: clean @ a28e3e8b; lineage tracer files present; customer-token baseline 126 files under src/ (expected: HPP clone content + FYD fixture graphs); no-hardcode enforcement owned by lane B/C critic, not re-verified here.
- Golden bars applied: lane-A suites 175/175 = 1.000 on the run population (this is NOT the D-012/D-213/D-214/D-217 golden set; golden-set waves belong to the factory runner). No safety-seam regression detected. Any future safety-seam regression will be reported as a release blocker per FYD-Q4.

## Memory harvest (lesson -> invariant -> code -> test -> live consumer)
OPERATIONALIZED:
- 2026-09-24 :3100 sanctioned restart path: setsid in start-3100.sh; NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1 exported in script and verified live in process env; keep-awake holder decoupled in script (explicit comments, zero holder refs); post-restart health wait on /sites/happy-place 200 in script.
- 2026-09-24 "never depend on read-your-write": idem lane tests parse the static base spec and use fresh section/intent per mutation; committed in build-idem.
- 2026-09-24 "jest writes its summary to stderr": hostile gate script line 125 does jest.stdout + jest.stderr with an explicit comment; committed.
- 2026-09-24 gateway liveness discriminator: code in tools/fyd-journal-gateway/server.mjs returns 400 on non-string request_id; live-verified just now (POST numeric request_id -> 400 with exact error; journal mtime 09:55 unchanged, zero pollution).
- 2026-09-24 G2 stable entity identity: inv-06 pins fact identity for cw-biz-01 across a phone change (factIdFor stable, value evolves); passing in the 90/90 run.
- Convergence "brain-postgres owns host 5432": live-verified, no second publish on 5432.
DOCUMENT_ONLY:
- 2026-09-24 "confirm .next/BUILD_ID exists before any sanctioned restart": NOT in start-3100.sh (no BUILD_ID check; the 12:29 failure mode is unguarded). Partial mitigation: script waits for happy-place 200 before declaring healthy.
- 2026-09-24 "serialize commits on shared branch; never bare git commit": no pre-commit hook in /home/nolan/projects/ping/.git/hooks; no automated enforcement found.
- 2026-09-24 proven-to-safe chain as a law: review doctrine only. Sub-elements split: "timeout != failed" is CONTRADICTED by the deployed reaper; "no RETRY NOW without proven retry safety" is proven in ~/workspace/f01-fix/ but undeployed.
- 2026-09-24 never-done completion semantics: process law, no code enforcement.
CONTRADICTED:
- Convergence "UNKNOWN is PARK/HOLD; lease expiry never recreates": deployed reaper contradicts (see CONTRADICTED section). Fix proven 22/22 in ~/workspace/f01-fix/, undeployed, Nolan word pending.
- 2026-09-14 "unauthenticated /events = 401": contradicted by candidate-fffe99f7a image (200 + data).
STALE:
- 2026-09-14 gateway degraded-boot lesson ("on 503 restart; 401 = healthy"): 401-healthy half stale for new image; 503+degraded restart half still valid and still coded in the watchdog.

## FYD-Q3 phase-17 gate status (adopted 2026-09-24 ~15:45 MDT; all must close before unauthenticated visitor publishing)
1. H4/R-H4 two-verifier seam: OPEN. Reproduced: verifyPresentationBinding accepts derived and owner_authored unconditionally while the strong BindingVerifier refuses them; owner_authored phone with no assertion renders while BindingVerifier says UNBOUND. P5 patch (resolveBoundFieldVerified) proposed under evidence/WIRE-SPEC.md patches/, git apply --check PASS, NOT applied. Source: fyd-factory/MISSION-STATE.md:260, :437.
2. R-MODEL /sites wiring: OPEN. Production /sites path never runs the strong verifier; post-model graph tampering publishes values the verified model never saw. P4 patch is observation-only logging, not a gate. Source: MISSION-STATE.md:261, :437.
3. SEC-FIX integration: OPEN. 5 patches (4 REQUIRED + 1 RECOMMENDED), git apply --check OK, relayed to NIGHT-VERCEL preview worktree only; not in the production path. Source: MISSION-STATE.md:319.
4. F-1..F-8 fail-closed under pressure: OPEN/FAILING. PRESSURE-REPORT.md verdict FAIL; 10/12 attack classes fail closed; F-1..F-6 uncaught TypeErrors on null/undefined, F-7 duplicate-id generator/renderer seam inconsistency, F-8 "About null" invented claim with 0 validator errors. Source: MISSION-STATE.md:317, :410.
5. Rate limiting / abuse controls: UNKNOWN. No evidence found in the factory state excerpts reviewed.
6. Rollback plan: PARTIAL/UNKNOWN. TD-001 and WIRE patches document per-patch rollback (rm file); no phase-17 publish-level rollback plan seen.
7. Nolan sign-off in this brief: OPEN. Gate adopted ~15:45 MDT; sign-off that all items closed is pending by definition.
8. Owner authentication/authorization (ADDITIONAL gate, not replaced by the seven): OPEN. Demo-owner mode flag verified live; identity suites 85/85; but factory notes "auth surface without product entry point" and "demo-auth writes share host with live product" as broken boundaries (MISSION-STATE.md:374).

## Successor / next unknowns (never "done, waiting")
- Next lane-A pass: re-run invariants (90) + capability/identity (85) suites; confirm gateway image digest unchanged (candidate-fffe99f7a@sha256:aa1f085a...); re-probe /events auth posture; check whether phase-17 items 1-4 moved (patches applied? pressure re-run?); check whether ~/workspace/f01-fix/ deployed or Nolan ruled on HOLD/reaper; check whether PigiGatewayWatch was updated for 200-vs-401.
- Not lane A (do not duplicate): runtime JEV P0-gate enforcement proof on live gateway (lane G); Ask FYD state (lane E); ORCA UNKNOWN/HOLD chaos port (lane F); TRADESMAN generalization (coordinator ae77b28b); golden-set wave runs (factory runner).
- Open question for orchestrator: is the publicly-readable /events on the candidate gateway intended (new generation has no auth middleware) or an oversight in the promotion? The runbook's acceptance criterion was the P0 gate on POST /orchestration/engine/loop, not /events auth.
