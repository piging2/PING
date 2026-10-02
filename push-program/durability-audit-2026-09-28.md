# Local-Durability Audit — 2026-09-28 (Phase 2)
Conducted: 2026-09-28 ~06:25–07:00 MDT. Read-only except the two ordered pushes.
Supersedes T+0 inventory where state changed. T+0 file: crx-convergence-sweep/inventory-2026-09-28-t0.md.

## Binding context applied
- Tenancy rule (06:24): HPP + piging2 website are TENANTS; everything else is PING. Generic backend/kernel/runtime → crx-runtime (semantic authority; do NOT manufacture abstractions just to centralize — 06:30 refinement).
- Tenancy model locked (06:30): customer data belongs to the tenant; PING operates the persistent runtime; Mission Control/ORCA is a capability-filtered tenant operating surface over that runtime; tenant isolation at every read/write/capability boundary; shared PING infrastructure stays shared. PING substrate may have multiple implementation owners while retaining ONE semantic authority.
- Phase 3 (secret-invariant convergence into crx-runtime) is HELD until the nine constitutional-runtime commits land. They have now landed (see PUSHED).

## PUSHED (verified)
1. **ngesk2/crx-runtime `constitutional-trunk`**: 9 commits landed via Git Database API (git-over-HTTPS auth unavailable; credential scoped to api.github.com). Every object SHA verified against local on creation. Remote branch now `74fbb74d9ab73f7df7b23bad2355f2c808ed720d` (was `ffc2b4d6`). Fast-forward, no force. Pig-side `origin/constitutional-trunk` refetched to match. Commits: f0b7e69 (P9 subprocess boundary), b6449e8 + 257b3d5 + 53ade95 (AGENTS.md docs), 532a3a7 (P9 acquire_repository), 87461fe (Phase 7 deprecation markers), 0e4d599 + e1fba76 (event-mutation authority audits + Gateway fixes), 74fbb74 (Lane-L tenant-isolation vectors: fail-closed tenant_id on Qdrant read/write paths). Audit verdict: coherent constitutional-runtime governance sequence; no split needed; top commit directly implements the locked tenancy model (isolation at every read/write boundary).
2. **piging2/PING `security/secret-redaction-2026-09-28`**: 90 commits replicated via Git Database API (2,077 objects; every SHA verified on creation). Remote branch at `965289637c8eeb46c43f4adef33ac8e78ab00448`. New branch, no force. VERIFIED via independent API GET (MATCH). Push method note: git-over-HTTPS unavailable (credential surrogate scoped to api.github.com only; github.com returns 401). Replication survived a VM service restart mid-run (/tmp wiped); re-ran idempotently from ~/workspace.

## COMMITTED BUT NOT PUSHED (PING repo ~/workspace — all unpushed, no upstreams unless noted)
| Branch | Unique commits | Content |
|---|---|---|
| mc/tenant-hardening | 6 | front-door + approval tenant semantic unit |
| mc/tenant-hostile-tests | 5 | hostile tenant-isolation suite (692 lines) |
| mc/consequence-policy-input | 5 | fail-closed money-signal conflicts |
| mc/frontdoor-hardening | 3 | honest executor outcomes H2a/H5b, revocation H7 |
| mc/mission-intent-frontdoor | 2 | idempotency D1/D2 |
| mc/approval-request | 1 | canonical ApprovalRequest (1039 lines) |
| mc/pass-migration-supersession | 16 | STUBS wiring, lane merges |
| mc/mission-budgets | 2 | falsifier repair, budget-as-capability |
| mc/pass-migration-proof | 1 | X-pass-as-mission proof (1678 lines) |
| mc/fyd-shapeA-site-console | 2 | tenant-scoped MC dispatch console |
| mc/lane-c-reconcile-gate, mc/audit-payload-lifecycle, mc/sprint-integration-2026-09-27 | 1-3 ea | triage/perfecting |
| substrate/gap1-F1, gap1-F6, gap1-canonical, gap2-provenance-ref, gap3-journal-identity, gap4-binding-lint, gap5-probe-health, fix/gap1-f2-absorb-floats | 1-5 ea | canonicalization/provenance/binding substrate |
| lane-c/orca-adapter-2026-09-26 | 3 | tenant_id threading, headless adapter |
| lane-f/harness-2026-09-26 | 5 | integration harness 9/9 |
| feat/orca-unknown-outcome-port | 42 ahead / 2 behind origin | ORCA unknown-outcome port (HAS upstream) |
| orca-engagement-pipeline-endgame | 1 | 9-stage policy engine spec |
| burn/orca-f04, burn/orca-f06, burn/outreach-caps | 1 ea | ORCA fixes, cap snapshot |
| fyd/builder-rebuild-v1, fyd/builder-rebuild-v1-cherrypick | 2 | FYD falsification evidence |
| p0/approval, p0/front-door-idempotency | 58, 1 | backlog base |
| fix/broker-failclosed-containment | 1 | identity_1..4 allowlist |
| jev/shadow-recorder | 2 | Jev shadow decision recorder |
| spine/x-pass-reached-path | 1 | X-pass observation spine |
| stream-b/composeview-visibility, stream-b/publicgraphof-visibility | 2, 1 | journaled field-visibility |
| audit/beyond-backlog-2026-09-19 | 1 | constitutional findings |
| track-a/d1-monitors, d2-schedule, d3-igprefilter, d4-spool | 1 ea | gateway monitors, scheduler, IG prefilter, spool |
| trackc/tenant-prep-2026-09-27 | 0 (in base) | tenant prep |
| master | — | backlog base |
| lane-f-probe-staleness-fix | 1 | probe fixes |

Pig FYD repo (/home/nolan/projects/ping — ACTIVE writer, read-only):
- hardening/2026-09-28-vocab-ssrf @ 0264d517 (100 ahead of origin/main): vocabulary gate + SSRF effective-destination. NOT pushed (active writer).
- ~30 other branches (harvest/2026-09-28, goose/dns-rebinding, workerB/H tenant seams, fyd/builder-rebuild-v1, etc.). NOT pushed.

Other local repos:
- fyd-build (~/workspace/fyd-build/.git): ~16 branches, all local-only. NOT pushed.
- shapec-work: 1 commit, no remote. NOT pushed.
- fyd-write-boundary worktree: master, 1 modified file. NOT pushed.

## VALUABLE UNCOMMITTED
- Pig FYD: 144 modified tracked files (vocab-ssrf + ask/mc/tenant APIs). ACTIVE writer → read-only; do not touch.
- PING: 22 modified + 5 deleted tracked. Notable: lane-p01/tree/ (FYD vocab-ssrf sync copy with local mods — safe-fetch.ts, proceduralize/*, ask/*, mc/*), tandem/emit-observation.py, outreach/*.jsonl, your_files/western-co-prospects.jsonl.
- PING untracked: 1,728 files. Top dirs per T+0: outreach (~620), fyd-product-lane (~228), tandem (~106), sprint-2026-09-24, fyd-lane, goals, orca-mc-convergence, bin, lane-p01, mission-control, orca. Largely lane working state, evidence, and outreach pipeline data.
- Stashes: PING 1 (fyd/builder-rebuild-v1 WIP), Pig FYD 1, pig-constitutional 1, ping-bcq-substrate 1.

## ARCHIVED
- None this pass. (No archival actions taken; classification only.)

## INTENTIONALLY LOCAL
- 17 dangling commits in PING (superseded WIP stash versions, old track-a variants, fyd-builder fix). Preserved in object DB; not on any branch. No action.
- Pig track-a/*/work: broken worktrees (.git points at /home/hatch path). Not touched.
- Vendor clones (crawl4ai, firecrawl, obs-scratch, etc.): clean, not PING work.
- fyd-build stale worktree registrations (Pig paths, /tmp paths): do not exist; registrations only.

## BLOCKED
- Pig FYD `hardening/2026-09-28-vocab-ssrf` + 144 dirty files: ACTIVE writer (mtimes today 06:18). Read-only until handoff. Cannot push or converge until writer hands off.
- PING `feat/orca-unknown-outcome-port` (42 ahead / 2 behind): needs rebase/merge decision by owning lane; not pushed to avoid history rewrite.

## GARBAGE/CHURN NOT PUSHED
- constitutional-runtime: 3,371 dirty tracked files (1,883 node_modules, whitespace/mode churn). NOT pushed, NOT committed. Per Nolan: do not push whitespace churn.
- CRX_REMOTE (/home/nolan/projects/CRX_REMOTE): 1,694 dirty (node_modules mode churn + transcripts). NOT pushed. Checkout stale (b833d91 vs remote main 6c4b5317); QUIET, no action.

## REMOTE VERIFICATION
- ngesk2/crx-runtime `constitutional-trunk`: remote = 74fbb74d9ab73f7df7b23bad2355f2c808ed720d. MATCH (independent API GET).
- piging2/PING `security/secret-redaction-2026-09-28`: remote = 965289637c8eeb46c43f4adef33ac8e78ab00448. MATCH (independent API GET).
- piging2/PING `main`: 81b324805611d75e7697cf698f6f304d8914b394 (unchanged).
- ngesk2/crx-runtime `main`: 6c4b5317 (unchanged).

## DATA-LOSS RISKS
1. **Pig FYD dirty work (144 files)**: only local. If the Pig disk fails before the writer pushes, the vocab-ssrf work is lost. Mitigation: writer handoff → push. Cannot mitigate from here (active writer).
2. **PING 40 unpushed branches**: only local. Durable against local disk failure only via push. Classified; push decisions need lane owners (one writer per semantic unit).
3. **Stashes (4)**: only local. Low risk (small).
4. **Dangling commits (17)**: only in local object DB; pruned by `git gc` eventually. Low value (superseded).
5. **constitutional-runtime dirty churn**: intentionally not preserved (garbage per Nolan).
6. **/tmp cleared on restart**: the 2026-09-28 service restart wiped /tmp (killed the PING replication mid-run; bundle copies lost). Lesson: keep all durable work under ~/workspace, never /tmp. The replication script and bundles were recoverable; re-ran from ~/workspace.

## Rollback receipts
- crx-runtime constitutional-trunk: pre-landing remote SHA `ffc2b4d673a6d8e7541888a4512c88651a43ffbf`. To roll back: PATCH ref to ffc2b4d (fast-forward only moves forward; rollback needs force — NOT done; record only).
- PING secret branch: new branch; rollback = delete remote branch (not done).
