# Phase 2: Live-Ahead-of-Repo Drift Reconciliation (2026-09-17)

**Worker:** Phase 2 agent (constitutional-convergence program), session 2026-09-17 ~05:49 to ~06:10 MDT.
**Scope:** the three drift components named in the task brief, verified independently from live bytes.
**Mode:** READ-ONLY plus analysis. No commits, no pushes, no merges, no resets, no history rewrites,
no branch deletions, no worktree cleans, no live runtime file modifications, no DB writes, no service
restarts. No credential values are printed anywhere in this report.

## Method

1. Live extraction: `docker exec ping-gateway cat <path>` over SSH via
`/home/hatch/workspace/pig-fb/oracle-ssh.sh` (chain: cloud VM -> Pig Windows SSH -> Pig WSL ->
`ubuntu@129.146.60.17`), stdout redirected locally. Remote `sha256sum` taken inside the container;
local pull hashes matched the remote hashes exactly for all five files, so the transfer was byte-exact.
2. Repo forensics on the Pig WSL at `/home/nolan/ping` (read-only git only: `log`, `show`, `ls-tree`,
`grep`, `rev-parse`, `branch --contains`, `merge-base --is-ancestor`), plus `sha256sum` of worktree files.
3. Semantic comparison with line-ending normalization (`diff -b -B`) where byte identity failed.
4. Test receipts read (not re-run) from `~/workspace/ping-overnight/event-boundary/REPORT.md` and
`~/workspace/ping-overnight/agent-exec/REPORT.md`.

**Timing note:** Phase 0 recreated the `ping-gateway` container with `--force-recreate` at ~11:47 UTC
(~05:47 MDT), after the earlier Worker B extraction. The image is unchanged
(`sha256:acbcd9bb6d99cd220456593ca5555298a1bcc0da22f0679a58c6c99f0eb7ab33`); all five live file
hashes below were re-taken after the recreate and are identical to the pre-recreate values.
Observed container uptimes at extraction: ping-gateway Up 2 minutes (healthy, recreated),
ping-postgres Up 7 minutes (healthy), ping-qdrant Up 10 hours (healthy).

## Correction to the task brief (established by evidence)

The retry-reclaim fix is **not** in `gateway_runtime.js`. A container-wide grep for `reclaimRetryPending`
hits only two live files: `/app/ping-runtime/orchestration/mission_runtime.js` (the implementation,
line 258) and `/app/ping-runtime/orchestration/mission_scheduler.js` (the call site, line 181).
The live `gateway_runtime.js` change is the one-line `/events` wiring that belongs to component 2.
The three task components therefore map to **five** files, reconciled below.

## Component 1: capability_authority.js

- COMPONENT: Capability decision ownership, gateway (agent-initiated invocation authorization)
- LIVE PATH: `/app/gateway/capability_authority.js` (container `ping-gateway`, no bind mounts; image-layer code)
- LIVE SHA256: `7a74d6eaaaadcb1f12e7341ac57a0d5fdde545e8097d098f4f8cdc62db537d2f` (30,775 bytes, CRLF)
- SOURCE WORKTREE CANDIDATE: None. No copy exists in any of the six Pig WSL trees or in the HEAD
`099927152` tree (`git ls-tree -r HEAD` shows only the unrelated ledger doc
`docs/CAPABILITY_AUTHORITY_LEDGER_2026-09-16.md`).
- SOURCE PATH: `gateway/capability_authority.js` at commit
`43a6cd2e40668d2fb6a1d676446be0e9afd75bd9` ("gateway: commit the live exterior-agent
authorization boundary", author nolan, Sat 2026-09-12 19:04:25 -0600), reachable via
`refs/remotes/windows-preserve/constitutional-convergence-v2`. The remote tip
`28347509aaf817efff017ec529112cf644499d2a` carries the identical blob. `43a6cd2e4` is the only
commit in `--all` history ever touching this path and is **not** an ancestor of HEAD `099927152`.
- SOURCE SHA256: `ff0eaeb836ec221923a98c75f40eb4c60a0644e73b559f48f1ae87bff540bfd9` (29,886 bytes, LF)
- LIVE ONLY?: Path: yes (absent from all branches' working trees and from HEAD). Content: no (preserved in git).
- WORKTREE ONLY?: No
- BYTE IDENTICAL?: No (CRLF vs LF only; `file` confirms the live copy has CRLF line terminators)
- SEMANTICALLY IDENTICAL?: Yes (`diff -b -B` of the full file is empty)
- PROVENANCE: Content originates from the 2026-09-12 preserved commit on the windows-preserve remote
ref. The live container carries a CRLF-encoded copy baked into the gateway image (file mtime in image
2026-09-15 15:04, untouched by the sprint). The stale on-box tree `/opt/ping/gateway/capability_authority.js`
carries the LF variant (`ff0eaeb8...`, identical to the preserved blob); it is not live code because the
container has no bind mounts. The "missing_implementation" registry classification is tree-relative only.
- TEST RECEIPT: `~/workspace/ping-overnight/agent-exec/REPORT.md`, Phase 10 forensics: real fail-closed
`CapabilityAuthority.authorize()` at line 230 (unknown agents denied, agent profile allowlist at lines
185-217, workspace/repo containment, write-capability gating), wired live at `gateway_runtime.js:416-418`
(`require` at line 106, instantiation at line 416 in the live file, confirmed in this pass). Sprint P0
table: capability decision ownership VERIFIED live.
- TARGET CANONICAL SOURCE LOCATION: `gateway/capability_authority.js` on `constitutional-convergence-v2`
(restore the blob from `43a6cd2e4`; normalize CRLF to LF on the way in).

## Component 2: the /events authorization fix

### 2a. gateway/routes/events.js

- COMPONENT: Event boundary, gateway routes (`POST /events`)
- LIVE PATH: `/app/gateway/routes/events.js` (container `ping-gateway`)
- LIVE SHA256: `6f1abebb7c3b38a2405fcbb73518495387c2c7a7592da955715402d544844117` (7,801 bytes)
- SOURCE WORKTREE CANDIDATE: `oracle-assembly` (`/home/nolan/ping/worktrees/oracle-assembly`)
- SOURCE PATH: `oracle-assembly-patches/gateway/routes/events.js` (mtime 2026-09-16 20:19:51 MDT)
- SOURCE SHA256: `6f1abebb7c3b38a2405fcbb73518495387c2c7a7592da955715402d544844117`
- LIVE ONLY?: No
- WORKTREE ONLY?: No
- BYTE IDENTICAL?: Yes
- SEMANTICALLY IDENTICAL?: Yes
- PROVENANCE: Authored by Agent A 2026-09-16 ~20:19 MDT in `oracle-assembly-patches/`; deployed live
~20:20-20:21 MDT by editing the Oracle release tree
(`/opt/ping/releases/bce92787b0da631ed9218e2255607562c9dff731/ping-oracle-clean-snapshot/`, where the
copy is byte-identical to live) and rebuilding the gateway image. Pre-deploy baseline preserved as
`events.js.bak-agent-a-20260916` in the release tree. Verified in the live bytes: `createEventRoutes`
now takes `canonicalizationService` (line 13); `POST /` derives source from the authenticated agent,
calls `authorizeNamespace()` (403 on malformed, line 93), then `canonicalizeAndEmit()` with explicit
400 (missing fields, line 74; emission rejected, line 104), 422 (unknown event type / governance /
namespace, line 104), and 503 (service unavailable, line 82).
- TEST RECEIPT: `~/workspace/ping-overnight/event-boundary/REPORT.md`, Phase 1 live matrix: malformed
namespace 403, missing auth 401, missing field 400, idempotent replays, `/ingest` unaffected, gateway
healthy across restarts, boundary receipt event `5e24e593f6a9f7b762ecedfed45a447faba57b6d1dacd28feab3fe443`.
Documented residual: syntax-only validation (no per-principal ACLs); that is a platform follow-up, not a
gap in this reconciliation.
- TARGET CANONICAL SOURCE LOCATION: `gateway/routes/events.js` on `constitutional-convergence-v2`
(land the byte-identical worktree patch).

### 2b. gateway/bootstrap/gateway_runtime.js (the /events wiring)

- COMPONENT: Gateway bootstrap (`POST /events` route wiring)
- LIVE PATH: `/app/gateway/bootstrap/gateway_runtime.js` (container `ping-gateway`)
- LIVE SHA256: `880d0d06d5cafb16d72373d57c898e5c11130c07ebd428ddeeaa5dd2c7dcd80c` (49,694 bytes)
- SOURCE WORKTREE CANDIDATE: `oracle-assembly`
- SOURCE PATH: `oracle-assembly-patches/gateway/bootstrap/gateway_runtime.js` (mtime 2026-09-16 20:20:05 MDT)
- SOURCE SHA256: `880d0d06d5cafb16d72373d57c898e5c11130c07ebd428ddeeaa5dd2c7dcd80c`
- LIVE ONLY?: No
- WORKTREE ONLY?: No
- BYTE IDENTICAL?: Yes
- SEMANTICALLY IDENTICAL?: Yes
- PROVENANCE: Same authorship and deploy path as 2a (Agent A, `oracle-assembly-patches/`, release-tree
edit plus image rebuild ~20:20 MDT; release-tree copy byte-identical to live; pre-deploy baseline
`gateway_runtime.js.bak-agent-a-20260916` preserved in the release tree). Verified in the live bytes:
the semantic delta vs the pre-patch baseline is one wiring line, at live line 762:
`createEventRoutes(..., services.pool, services.canonicalizationService)`; the remainder of the raw
diff is CRLF to LF normalization. This file contains no retry logic; `reclaimRetryPending` does not
appear in it. The live file also wires the live CapabilityAuthority (`require` line 106, instantiation
line 416), consistent with component 1.
- TEST RECEIPT: `~/workspace/ping-overnight/event-boundary/REPORT.md`, Phase 1 (this wiring is
load-bearing for the 2a fix; gateway verified healthy across restarts with the fix enforced).
- TARGET CANONICAL SOURCE LOCATION: `gateway/bootstrap/gateway_runtime.js` on
`constitutional-convergence-v2` (land the byte-identical worktree patch; note the branch working tree
holds its own pre-existing dirty variant unrelated to tonight's deploy, which must be reconciled
separately and was not touched here).
## Component 3: the retry-reclaim fix (reclaimRetryPending)

### 3a. ping-runtime/orchestration/mission_runtime.js

- COMPONENT: Mission lifecycle, ping-runtime orchestration (retry reclaim implementation)
- LIVE PATH: `/app/ping-runtime/orchestration/mission_runtime.js` (container `ping-gateway`)
- LIVE SHA256: `4102bd9aff657d8a7e7e274aff631a479413a81ff9414c3909cf4e9731d4e58c` (16,603 bytes)
- SOURCE WORKTREE CANDIDATE: None. No worktree patch exists for this fix; no file in any of the six
Pig WSL trees contains `reclaimRetryPending` outside git objects.
- SOURCE PATH: `/opt/ping/releases/bce92787b0da631ed9218e2255607562c9dff731/ping-oracle-clean-snapshot/ping-runtime/orchestration/mission_runtime.js`
(the deploy source on the Oracle host; byte-identical to live) and the off-Oracle evidence copy
`~/workspace/ping-overnight/drift-sources/mission_runtime.js.live-20260917` (sha256 verified
`4102bd9a...` in this pass), with provenance record `drift-sources/PROVENANCE.md` and the vs-HEAD delta
`drift-sources/mission_runtime.js.delta-vs-HEAD.diff`.
- SOURCE SHA256: `4102bd9aff657d8a7e7e274aff631a479413a81ff9414c3909cf4e9731d4e58c`
- LIVE ONLY?: Delta: the implementation exists only in the container, the same-host release tree, and
the off-Oracle cloud evidence copies. Base file: no (the pre-patch baseline has full repo provenance).
- WORKTREE ONLY?: No
- BYTE IDENTICAL?: Yes (live vs release-tree copy; live vs cloud evidence copy)
- SEMANTICALLY IDENTICAL?: Yes
- PROVENANCE: Implemented directly on the live Oracle release tree by Agent A ~2026-09-16 20:55 MDT
(02:55 UTC) after Agent C's harness found the defect; deployed via gateway image rebuild; no worktree
staging, no commit. Pre-patch baseline `mission_runtime.js.bak-agent-a-20260916-p0retry`
(`24f85fc691c8a10713e23b7692de901cf8ffcc6aeb859a07548d70044ccf4b2b`) is byte-identical to the HEAD
`099927152` blob and to the main working-tree copy: full repo provenance for the BASE. The DELTA is:
new `reclaimRetryPending()` at live line 258 (moves due `retry_pending` missions back to `created`,
clearing `assigned_to`/`lease_until`/`claimed_at`/`retry_at`, emitting `MISSION_RETRY_RECLAIMED` per
reclaimed row) plus `failWithRetry()` WHERE-clause hardened to include `'retry_pending'`. The DELTA
exists nowhere in git: the string `reclaimRetryPending` appears in git history only as a docstring
reference (HEAD blob line 192, "the method failWithRetry()'s docstring has always referenced"),
introduced by commits `0bf655ad0` and `0f4ae22d7` ("fix(constitution): P0-2 through P0-6 durable
execution patches", 2026-08-19; `0bf655ad0` is an ancestor of HEAD, `0f4ae22d7` lives on
`agent/smoke-abc123def456`, `forensics/git-forensics-2026-09-16`, and several remote refs but not HEAD).
Neither commit contains the implementation. The verified DR tarball
`ping-source-clean-2026-09-16.tar.gz` does NOT contain the fix (built ~02:26 UTC, before the ~02:55 UTC
deploy; per prior Worker B verification its copy is semantically pre-patch).
- TEST RECEIPT: `~/workspace/ping-overnight/event-boundary/REPORT.md`, P0-5 section: 12/12 proof
assertions pass (fail-once-then-succeed reaches `completed` with attempt 2; bounded exhaustion
dead-letters exactly once; no re-execution loop; reclaim idempotent when nothing due).
- TARGET CANONICAL SOURCE LOCATION: `ping-runtime/orchestration/mission_runtime.js` on
`constitutional-convergence-v2` (apply the verified delta from the byte-identical evidence copy).

### 3b. ping-runtime/orchestration/mission_scheduler.js

- COMPONENT: Mission lifecycle, ping-runtime orchestration (scheduler reclaim arrow)
- LIVE PATH: `/app/ping-runtime/orchestration/mission_scheduler.js` (container `ping-gateway`)
- LIVE SHA256: `cc0fa09dbb3cea1667f150a14276653022e2ffef8c51724a78d986b8af608804` (14,612 bytes)
- SOURCE WORKTREE CANDIDATE: None. Same situation as 3a.
- SOURCE PATH: `/opt/ping/releases/bce92787b0da631ed9218e2255607562c9dff731/ping-oracle-clean-snapshot/ping-runtime/orchestration/mission_scheduler.js`
(byte-identical to live) and the off-Oracle evidence copy
`~/workspace/ping-overnight/drift-sources/mission_scheduler.js.live-20260917` (sha256 verified
`cc0fa09d...` in this pass), with provenance record `drift-sources/PROVENANCE.md` and the vs-HEAD delta
`drift-sources/mission_scheduler.js.delta-vs-HEAD.diff`.
- SOURCE SHA256: `cc0fa09dbb3cea1667f150a14276653022e2ffef8c51724a78d986b8af608804`
- LIVE ONLY?: Delta: same as 3a (container, same-host release tree, off-Oracle cloud evidence copies).
- WORKTREE ONLY?: No
- BYTE IDENTICAL?: Yes (live vs release-tree copy; live vs cloud evidence copy)
- SEMANTICALLY IDENTICAL?: Yes
- PROVENANCE: Same authorship and deploy path as 3a (Agent A, direct on the live release tree,
~20:55 MDT, image rebuild). The DELTA is the new poll Arrow 1b (live lines ~174-185) calling
`reclaimRetryPending()` before dispatch, non-fatal on error, running regardless of capacity. The
pre-patch baseline `mission_scheduler.js.bak-agent-a-20260916-p0retry`
(`cec607344063a0bdb723d3f565f207491630b4e69c9fe224eb78cbbecc4ed4c3`) does NOT match the repo HEAD blob
(`7e98b7eca388b431a05777da545454db36678939b2f75823a213cfd301e9cf82`): the deployed release tree had
already diverged from the branch before tonight (pre-existing deployment-lineage drift; the two extra
`originator: payload.originator || null,` lines in the vs-HEAD delta pre-date tonight's fix and are not
part of it). No git commit anywhere contains the Arrow 1b implementation.
- TEST RECEIPT: `~/workspace/ping-overnight/event-boundary/REPORT.md`, P0-5 section: 12/12 proof
assertions (same run as 3a; scheduler integration with stub worker: flaky mission reclaimed and
re-dispatched, attempt 2 succeeded).
- TARGET CANONICAL SOURCE LOCATION: `ping-runtime/orchestration/mission_scheduler.js` on
`constitutional-convergence-v2`. Land ONLY the Arrow 1b delta; the two pre-existing `originator` lines
are separate deployment-lineage drift and need their own disposition on the allowlist (apply or drop,
explicitly decided).

## Summary table

| # | File | Live sha256 (short) | Non-live source copy | Byte-identical? | Provenance verdict |
|---|---|---|---|---|---|
| 1 | `gateway/capability_authority.js` | `7a74d6ea` | commit `43a6cd2e4` on `remotes/windows-preserve/constitutional-convergence-v2` | No (CRLF vs LF) | Remote-branch source, semantically identical |
| 2a | `gateway/routes/events.js` | `6f1abebb` | `oracle-assembly-patches/gateway/routes/events.js` | Yes | Worktree source with test receipt |
| 2b | `gateway/bootstrap/gateway_runtime.js` | `880d0d06` | `oracle-assembly-patches/gateway/bootstrap/gateway_runtime.js` | Yes | Worktree source with test receipt |
| 3a | `ping-runtime/orchestration/mission_runtime.js` | `4102bd9a` | Release tree (same host) + off-Oracle `drift-sources/` evidence copy | Yes | Live-authored, off-host evidence preserved, test receipt |
| 3b | `ping-runtime/orchestration/mission_scheduler.js` | `cc0fa09d` | Release tree (same host) + off-Oracle `drift-sources/` evidence copy | Yes | Live-authored, off-host evidence preserved, test receipt |

## Provenance story per component

**Component 1 (capability_authority.js).** The file is old, not new: committed 2026-09-12 by the machine
identity as "the live exterior-agent authorization boundary" onto the preserved remote ref, then dropped
from the branch tree by the subsequent history rewrite (commit `099927152` documents the rewrite; the
commit is read-only forensics here, no attribution or mutation). The gateway image baked a CRLF copy on
2026-09-15 and has run it ever since; Agent D proved it live (fail-closed `authorize()`, wired at
`gateway_runtime.js:416-418`). The reconciliation needed is a restore, not new code: put the preserved
blob back at `gateway/capability_authority.js` with LF endings. The registry's `missing_implementation`
label needs a tree-relative correction.

**Component 2 (/events fix).** The cleanest case. Agent A authored both files in the `oracle-assembly`
worktree's `oracle-assembly-patches/` overlay (mtimes 20:19:51 and 20:20:05 MDT 2026-09-16), deployed them
through the release tree into a rebuilt gateway image the same evening, and proved the behavior live the
same night (400/403/422/503 matrix, idempotent replays, `/ingest` unaffected). The container copies are
byte-identical to the worktree patches; provenance and test evidence are both first-class. Landing is
mechanical.

**Component 3 (retry reclaim).** The genuine live-only authoring event of the sprint. Agent C's harness
found the defect (fail-once missions stuck in `retry_pending` forever); Agent A implemented the fix
directly on the live release tree at ~20:55 MDT because the oracle-assembly worktree had (falsely)
reported itself missing mid-sprint; there was never a worktree staging copy and nothing was committed.
The delta now has three verified non-container homes: the same-host release tree, the pre-patch `.bak`
siblings that pin the baseline, and the off-Oracle evidence copies in `~/workspace/ping-overnight/drift-sources/`
with `PROVENANCE.md`, both sha256-verified in this pass. The 12/12 P0-5 assertions are the test receipt.
Landing must separate tonight's Arrow 1b / `reclaimRetryPending` delta from the pre-existing
`originator` deployment-lineage drift in `mission_scheduler.js`.

## Recommended TARGET CANONICAL SOURCE LOCATIONS (commit-allowlist input)

When Nolan authorizes the reconciliation commit(s) on `constitutional-convergence-v2` (or its successor):

1. `gateway/capability_authority.js` <- blob from `43a6cd2e4` (normalize CRLF to LF).
2. `gateway/routes/events.js` <- `worktrees/oracle-assembly/oracle-assembly-patches/gateway/routes/events.js`
(byte-identical to live).
3. `gateway/bootstrap/gateway_runtime.js` <- `worktrees/oracle-assembly/oracle-assembly-patches/gateway/bootstrap/gateway_runtime.js`
(byte-identical to live). Reconcile separately with the branch working tree's pre-existing dirty variant.
4. `ping-runtime/orchestration/mission_runtime.js` <- apply the verified delta from
`workspace/ping-overnight/drift-sources/mission_runtime.js.live-20260917` onto the HEAD baseline.
5. `ping-runtime/orchestration/mission_scheduler.js` <- apply ONLY the Arrow 1b delta from
`workspace/ping-overnight/drift-sources/mission_scheduler.js.live-20260917`; decide the two
pre-existing `originator` lines explicitly (separate drift, separate decision).

## Constraints honored

- Read-only on every live system: extraction used `docker exec ... cat/sha256sum/grep/wc` and `sha256sum`
of host files; nothing was written, restarted, or reconfigured on Oracle; no DB rows were read beyond
what this task needed (none); no credential, token, password, or `.env` VALUE appears in this report.
- Read-only on git: `log`, `show`, `ls-tree`, `grep`, `rev-parse`, `branch --contains`,
`merge-base --is-ancestor`, `worktree list`, `status`. No checkout, no stash, no clean, no reset.
- Repo state verified unchanged after this pass: `git status` in `/home/nolan/ping` and
`worktrees/oracle-assembly` matches the Phase 1 manifest baseline exactly.
- The `agent-smoke` worktree and all staged convergence work were not touched.
- Secret scan of all five live files: no embedded credential values. Matches were limited to
`process.env.POSTGRES_PASSWORD` references, workspace deny-path strings, and agent capability config
keys (values redacted at capture; counts only recorded here).
- This report plus its JSON companion are the only files written, under
`~/workspace/ping-overnight/phase2/`.

## Open items for the parent

- The on-box tree `/opt/ping/gateway/*` remains stale (pre-patch `events.js`/`gateway_runtime.js`,
LF `capability_authority.js`) and is not live code (the container has no bind mounts). Any future
rebuild sourced from `/opt/ping` instead of a reconciled branch would silently lose all three P0 fixes.
Flagged for the deployment-lineage decision, not changed here.
- The live on-box compose is still the pre-canonical definition (Phase 1 manifest section 4); live-behind,
not live-ahead; out of scope for this phase.
