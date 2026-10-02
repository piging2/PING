# Phase 2: Live-Ahead-of-Repo Drift Reconciliation 2026-09-17

Worker B, read-only forensics. No git state changes, no file writes outside this deliverable, no service restarts, no DB writes. No commits, pushes, merges, resets, history rewrites, branch deletions, or destructive operations of any kind were performed. No credential values are printed anywhere in this report.

Method: every claim below was established by direct hash comparison (sha256sum) across four source planes: (a) the live container `ping-gateway` (`/app`), (b) the Oracle host copies (`/opt/ping` and the release tree `/opt/ping/releases/bce92787b0da631ed9218e2255607562c9dff731/ping-oracle-clean-snapshot`), (c) all six Pig WSL trees (`/home/nolan/ping` plus five worktrees) and the `oracle-assembly-patches/` overlay, (d) git refs including `remotes/windows-preserve/constitutional-convergence-v2` (commits `43a6cd2e4` and tip `28347509`) and HEAD `099927152`.

Sweep for unlisted drift: Agent A's complete deploy touch set was enumerated via `*.bak-agent-a-20260916*` (8 files: 4 live files + 4 backups, in both the container and the release tree) and cross-checked with `find /app -newer /app/gateway/Dockerfile` (image build 2026-09-15 15:30). The only `.js` files newer than the image build are the four patched files plus their four backups. Everything else newer is runtime-generated (`ping-runtime/orchestration/dormant_classifications/*.json`, written by the gateway at boot 2026-09-17 02:47 UTC, absent from the release tree) or triage-era infrastructure (`/app/infrastructure/oracle/.env`, `docker-compose.oracle.yml` with its `.bak-20260916-oracle-triage` sibling; the live compose was deliberately NOT overwritten with the canonical worktree version, so it is live-behind, not live-ahead). No other live-ahead-of-repo code drift exists.

Two corrections to the task brief, established by evidence: (1) the retry-reclaim fix is NOT in `gateway_runtime.js`; it is in `ping-runtime/orchestration/mission_runtime.js` (new `reclaimRetryPending()`) and `ping-runtime/orchestration/mission_scheduler.js` (new poll Arrow 1b). The `gateway_runtime.js` live change is the `/events` wiring (one line). (2) The retry fix was implemented by Agent A on the live release tree (Agent C found the defect via harness); there is no worktree patch for it.

## Drift item 1: POST /events namespace-authorization fix

- COMPONENT: Event boundary, gateway routes (`POST /events`)
- LIVE PATH: `/app/gateway/routes/events.js` (container `ping-gateway`)
- LIVE SHA256: `6f1abebb7c3b38a2405fcbb73518495387c2c7a7592da955715402d544844117`
- SOURCE WORKTREE CANDIDATE: `oracle-assembly` (`/home/nolan/ping/worktrees/oracle-assembly`)
- SOURCE PATH: `oracle-assembly-patches/gateway/routes/events.js`
- SOURCE SHA256: `6f1abebb7c3b38a2405fcbb73518495387c2c7a7592da955715402d544844117`
- LIVE ONLY?: No
- WORKTREE ONLY?: No
- BYTE IDENTICAL?: Yes
- SEMANTICALLY IDENTICAL?: Yes
- PROVENANCE: Authored by Agent A 2026-09-16 ~20:19 MDT in `oracle-assembly-patches/`; deployed live ~20:20-20:21 MDT by editing the Oracle release tree (`/opt/ping/releases/bce92787b0da631ed9218e2255607562c9dff731/ping-oracle-clean-snapshot`) and rebuilding the gateway image (`docker compose up -d --build gateway`). Pre-deploy baseline preserved as `events.js.bak-agent-a-20260916` (sha256 `7bf0c5d34a2fa53f6b8fdda3a054b9741def7211ad30b71785d25d32f9509388`, 6962 bytes). Semantic delta vs baseline: `createEventRoutes` takes `canonicalizationService`; `POST /` accepts optional `namespace`, derives source from the authenticated agent, calls `authorizeNamespace()` (403 on malformed), then `canonicalizeAndEmit()` with explicit 400/403/422/503; previously emitted via `eventRuntime.emit()` with no namespace authorization. BOM removed.
- TEST RECEIPT: `~/workspace/ping-overnight/event-boundary/REPORT.md`, Phase 1 live matrix: malformed namespace 403, missing auth 401, missing field 400, idempotent replay, `/ingest` unaffected, event `5e24e593f6a9f7b762ecedfed45a447faba57b6d1dacd28feab3fe443`; documented residual: syntax-only validation (no per-principal ACLs).
- TARGET CANONICAL SOURCE LOCATION: `gateway/routes/events.js` on `constitutional-convergence-v2` (or its successor branch).

## Drift item 2: gateway_runtime.js /events wiring

- COMPONENT: Gateway bootstrap (`POST /events` route wiring)
- LIVE PATH: `/app/gateway/bootstrap/gateway_runtime.js` (container `ping-gateway`)
- LIVE SHA256: `880d0d06d5cafb16d72373d57c898e5c11130c07ebd428ddeeaa5dd2c7dcd80c`
- SOURCE WORKTREE CANDIDATE: `oracle-assembly`
- SOURCE PATH: `oracle-assembly-patches/gateway/bootstrap/gateway_runtime.js`
- SOURCE SHA256: `880d0d06d5cafb16d72373d57c898e5c11130c07ebd428ddeeaa5dd2c7dcd80c`
- LIVE ONLY?: No
- WORKTREE ONLY?: No
- BYTE IDENTICAL?: Yes
- SEMANTICALLY IDENTICAL?: Yes
- PROVENANCE: Same authorship and deploy path as item 1 (Agent A, `oracle-assembly-patches/`, release-tree edit + image rebuild ~20:20 MDT). Pre-deploy baseline `gateway_runtime.js.bak-agent-a-20260916` (sha256 `30b085290857c9532c9b07b77777fadf2310891dea616c5c7c29d809bb421bbc`, 50644 bytes). Semantic delta vs baseline is exactly one line: `createEventRoutes(..., services.pool)` becomes `createEventRoutes(..., services.pool, services.canonicalizationService)`; plus CRLF to LF normalization (984 lines). The large raw diff (1971 lines) is entirely line endings.
- TEST RECEIPT: `~/workspace/ping-overnight/event-boundary/REPORT.md`, Phase 1 (this wiring is load-bearing for the item 1 fix; gateway verified healthy across restarts with the fix enforced).
- TARGET CANONICAL SOURCE LOCATION: `gateway/bootstrap/gateway_runtime.js` on `constitutional-convergence-v2`.

## Drift item 3: mission_runtime.js retry reclaim (reclaimRetryPending)

- COMPONENT: Mission lifecycle, ping-runtime orchestration
- LIVE PATH: `/app/ping-runtime/orchestration/mission_runtime.js` (container `ping-gateway`)
- LIVE SHA256: `4102bd9aff657d8a7e7e274aff631a479413a81ff9414c3909cf4e9731d4e58c`
- SOURCE WORKTREE CANDIDATE: None. No worktree patch exists for this fix.
- SOURCE PATH: `/opt/ping/releases/bce92787b0da631ed9218e2255607562c9dff731/ping-oracle-clean-snapshot/ping-runtime/orchestration/mission_runtime.js` (same host, deploy source)
- SOURCE SHA256: `4102bd9aff657d8a7e7e274aff631a479413a81ff9414c3909cf4e9731d4e58c`
- LIVE ONLY?: Delta: yes, container plus same-host release tree only; no git or worktree copy anywhere. Base file: no (see Provenance).
- WORKTREE ONLY?: No
- BYTE IDENTICAL?: Yes (live vs release-tree copy)
- SEMANTICALLY IDENTICAL?: Yes
- PROVENANCE: Implemented directly on the live Oracle release tree by Agent A ~2026-09-16 20:55 MDT (02:55 UTC) and deployed via gateway image rebuild; no worktree staging, no commit. Pre-patch baseline `mission_runtime.js.bak-agent-a-20260916-p0retry` (sha256 `24f85fc691c8a10713e23b7692de901cf8ffcc6aeb859a07548d70044ccf4b2b`) is byte-identical to the HEAD `099927152` blob and to the main working-tree copy: full repo provenance for the BASE. The DELTA (new `reclaimRetryPending()` at ~line 258 moving due `retry_pending` missions back to `created` and clearing stale claim/lease fields, emitting `MISSION_RETRY_RECLAIMED`; plus `failWithRetry` WHERE-clause hardened to include `retry_pending`) exists nowhere in git: the string `reclaimRetryPending` appears in git only as a docstring reference (line 192) at `43a6cd2e4`, `28347509`, and `099927152`. The verified DR tarball `ping-source-clean-2026-09-16.tar.gz` does NOT contain this fix (its `mission_runtime.js` is sha256 `360e3757aa8792b990822ab369b5db6e1f86b292ab631c6046682145c5c2b0ea`, semantically identical to the pre-patch baseline; tarball built ~02:26 UTC, before the 02:55 UTC deploy).
- TEST RECEIPT: `~/workspace/ping-overnight/event-boundary/REPORT.md`, P0-5 section: 12/12 proof assertions pass (fail-once-then-succeed reaches `completed` with attempt 2; bounded exhaustion dead-letters exactly once; no re-execution loop; reclaim idempotent when nothing due).
- TARGET CANONICAL SOURCE LOCATION: `ping-runtime/orchestration/mission_runtime.js` on `constitutional-convergence-v2`.

## Drift item 4: mission_scheduler.js retry-reclaim poll arrow

- COMPONENT: Mission lifecycle, ping-runtime orchestration (scheduler)
- LIVE PATH: `/app/ping-runtime/orchestration/mission_scheduler.js` (container `ping-gateway`)
- LIVE SHA256: `cc0fa09dbb3cea1667f150a14276653022e2ffef8c51724a78d986b8af608804`
- SOURCE WORKTREE CANDIDATE: None. No worktree patch exists for this fix.
- SOURCE PATH: `/opt/ping/releases/bce92787b0da631ed9218e2255607562c9dff731/ping-oracle-clean-snapshot/ping-runtime/orchestration/mission_scheduler.js` (same host, deploy source)
- SOURCE SHA256: `cc0fa09dbb3cea1667f150a14276653022e2ffef8c51724a78d986b8af608804`
- LIVE ONLY?: Delta: yes, container plus same-host release tree only; no git or worktree copy anywhere.
- WORKTREE ONLY?: No
- BYTE IDENTICAL?: Yes (live vs release-tree copy)
- SEMANTICALLY IDENTICAL?: Yes
- PROVENANCE: Same authorship and deploy path as item 3 (Agent A, direct on the live release tree, ~20:55 MDT, image rebuild). Pre-patch baseline `mission_scheduler.js.bak-agent-a-20260916-p0retry` (sha256 `cec607344063a0bdb723d3f565f207491630b4e69c9fe224eb78cbbecc4ed4c3`) does NOT match the repo HEAD blob (`7e98b7eca388b431a05777da545454db36678939b2f75823a213cfd301e9cf82`): the deployed release tree had already diverged from the branch before tonight (pre-existing deployment-lineage drift, not from this sprint). Semantic delta: new poll Arrow 1b (~13 lines) calling `reclaimRetryPending()` before dispatch, non-fatal on error, runs regardless of capacity. The DR tarball does NOT contain this fix (its copy is sha256 `9a22402aa57f9327171a27f07822d02e48b9c007865cbfb131a0850b0dce8973`, semantically identical to the pre-patch baseline).
- TEST RECEIPT: `~/workspace/ping-overnight/event-boundary/REPORT.md`, P0-5 section: 12/12 proof assertions (same run as item 3; scheduler integration with stub worker: flaky mission reclaimed and re-dispatched, attempt 2 succeeded).
- TARGET CANONICAL SOURCE LOCATION: `ping-runtime/orchestration/mission_scheduler.js` on `constitutional-convergence-v2`.

## Drift item 5: capability_authority.js (exterior-agent authorization boundary)

- COMPONENT: Capability decision ownership, gateway
- LIVE PATH: `/app/gateway/capability_authority.js` (container `ping-gateway`)
- LIVE SHA256: `7a74d6eaaaadcb1f12e7341ac57a0d5fdde545e8097d098f4f8cdc62db537d2f` (889 lines, CRLF; baked into the image 2026-09-15 15:04, untouched tonight)
- SOURCE WORKTREE CANDIDATE: None in any current branch. Preserved git source below.
- SOURCE PATH: `gateway/capability_authority.js` at commit `43a6cd2e4` ("gateway: commit the live exterior-agent authorization boundary", 2026-09-12), reachable via `refs/remotes/windows-preserve/constitutional-convergence-v2` (tip `28347509` carries the identical blob; `43a6cd2e4` is the only commit in `--all` history ever touching this path, and it is not an ancestor of HEAD `099927152`)
- SOURCE SHA256: `ff0eaeb836ec221923a98c75f40eb4c60a0644e73b559f48f1ae87bff540bfd9` (LF)
- LIVE ONLY?: Path: yes (absent from all six Pig WSL trees and from HEAD `099927152`). Content: no (preserved in git, see Provenance).
- WORKTREE ONLY?: No
- BYTE IDENTICAL?: No (CRLF vs LF line endings; confirmed in-container, not a transfer artifact)
- SEMANTICALLY IDENTICAL?: Yes (`diff -b -B` of the full 889 lines is empty)
- PROVENANCE: Content originates from commit `43a6cd2e4` (2026-09-12) on the preserved remote ref; the live container carries a CRLF-encoded copy baked into the image on 2026-09-15. `/opt/ping/gateway/capability_authority.js` carries the LF variant (sha256 `ff0eaeb8...`, identical to the preserved blob). Absent from the `constitutional-convergence-v2` branch tree: the "missing_implementation" registry classification is tree-relative only.
- TEST RECEIPT: `~/workspace/ping-overnight/agent-exec/REPORT.md`, Phase 10 forensics: `authorize()` at line 230, fail-closed (unknown agents denied, profile allowlist at lines 185-217, workspace/repo containment, write-capability gating), wired live at `gateway_runtime.js:416-418` (confirmed in the live file: `require` at line 106, instantiation at line 416). Sprint P0 table: capability decision ownership VERIFIED live.
- TARGET CANONICAL SOURCE LOCATION: `gateway/capability_authority.js` on `constitutional-convergence-v2` (restore from `43a6cd2e4`; reconcile LF vs CRLF on the way in).

## Summary table

| # | File | Live sha256 (short) | Non-live source copy | Byte-identical? | Provenance |
|---|---|---|---|---|---|
| 1 | `gateway/routes/events.js` | `6f1abebb` | `oracle-assembly-patches/gateway/routes/events.js` | Yes | Agent A worktree patch, deployed 2026-09-16 ~20:20 MDT |
| 2 | `gateway/bootstrap/gateway_runtime.js` | `880d0d06` | `oracle-assembly-patches/gateway/bootstrap/gateway_runtime.js` | Yes | Agent A worktree patch, deployed 2026-09-16 ~20:20 MDT (1-line wiring + CRLF normalization) |
| 3 | `ping-runtime/orchestration/mission_runtime.js` | `4102bd9a` | Oracle release tree only (same host) | Yes (vs release tree) | Agent A, direct on live release tree ~20:55 MDT; NO git/worktree copy of the delta |
| 4 | `ping-runtime/orchestration/mission_scheduler.js` | `cc0fa09d` | Oracle release tree only (same host) | Yes (vs release tree) | Agent A, direct on live release tree ~20:55 MDT; NO git/worktree copy of the delta |
| 5 | `gateway/capability_authority.js` | `7a74d6ea` | Commit `43a6cd2e4` on `remotes/windows-preserve/constitutional-convergence-v2` | No (CRLF vs LF) | Preserved 2026-09-12 commit; semantically identical; absent from branch tree |

## Live P0 fixes lacking a non-live source copy

Strictly, every live P0 fix has at least one non-container copy. The gap is narrower and specific:

1. **Items 3 and 4 (the retry-reclaim delta) have no git or worktree source copy.** Their only non-container copies are the Oracle release tree (`/opt/ping/releases/bce92787b0da631ed9218e2255607562c9dff731/ping-oracle-clean-snapshot/...`, same host as production) plus the pre-patch `.bak-agent-a-20260916-p0retry` siblings. The verified DR tarball `ping-source-clean-2026-09-16.tar.gz` does NOT contain the fix (built ~02:26 UTC, before the ~02:55 UTC deploy; its copies are semantically pre-patch). If the release tree were lost, the delta would have to be reverse-engineered from the container. Recommended: land the delta in `ping-runtime/orchestration/` on a branch (target locations above) from the release-tree copies, which are byte-identical to live.
2. **Item 5 has a git source with known provenance** (`43a6cd2e4`), so it is not missing a non-live copy; the only reconciliation needed is restoring the path to the branch tree (noting the CRLF/LF difference).
3. **Items 1 and 2 are fully covered**: byte-identical worktree patches exist in `oracle-assembly-patches/`, plus release-tree and tarball copies.

## Pre-existing (non-tonight) deployment-lineage drift, noted for completeness

- The Oracle release tree / image lineage has its own history distinct from every branch: pre-deploy live `gateway_runtime.js` (`.bak`, `30b08529`) matches no git source; pre-deploy live `mission_scheduler.js` (`.bak`, `cec60734`) differs from the repo HEAD blob (`7e98b7ec`); `/opt/ping/gateway/routes/events.js` (`8de8b43e`) differs from the preserve tip (`3ce84c0a`). Tonight's patches sit on top of this lineage.
- The live on-box `docker-compose.oracle.yml` was deliberately not overwritten with the canonical worktree version (sprint report, Agent B): live-behind, not live-ahead; not a drift item for this phase.
- The main repo working tree holds its own uncommitted variants (`gateway/bootstrap/gateway_runtime.js` `572a6d27`, `gateway/routes/events.js` `0cd77951`), pre-existing and unrelated to tonight's deploys.
