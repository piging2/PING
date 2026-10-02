# CRX-RUNTIME CONVERGENCE SWEEP — T+0 (2026-09-28 ~06:15 MDT)

Order: Nolan 06:12 MDT ("MUSE — CRX-RUNTIME CONVERGENCE ORDER — EXECUTE NOW").
Rule: FYD PRODUCT CODE STAYS OUT; GENERIC CRX KERNEL/RUNTIME IMPROVEMENTS GO HOME.
Previous "don't touch crx-runtime" interpretation: REVOKED.
No-manufacturing rule: HONORED (no new abstractions created to justify convergence).

## Candidate #1: secret P0 fix — DONE
- Isolated exact diff from the dirty shared workspace (PING monorepo, branch p0/approval):
  `orca-adapter/adapter.js` (+481/-14) + `orca-adapter/test/secret-redaction-selftest.js` (new).
- Re-ran focused tests from a CLEAN worktree at cf4442f7:
  secret-redaction-selftest 234/234 PASS, adapter-selftest ALL PASS,
  reconcile-gate-selftest ALL PASS, tenant-threading-selftest ALL PASS,
  node --check clean.
- Committed on its own branch, exact files only, nothing else mixed:
  branch `security/secret-redaction-2026-09-28`, commit `9652896`.
  NOT pushed (push not ordered).
- Untouched leftovers: `orca-adapter/evidence/` and `orca-adapter/test/live-smoke.js`
  (pre-existing Sep-26 untracked, not this lane's).
- Kernel-ownership classification: the generic redaction functions (redactEnvelope,
  redactWorkerText) live in the ORCA adapter's prompt-construction seam. crx-runtime
  has NO existing secret/redaction boundary (searched kernel, runtime, tools, agents,
  whole tree: zero secret modules). There is no existing CRX semantic authority to
  converge into; extracting one would manufacture a new abstraction, which the order
  forbids. VERDICT: KEEP (ORCA-owned). The SECRET REFERENCE → AUTHORIZED BROKER
  architecture remains future backlog per the lane's own boundary note.

## Sweep findings (reobserved, not trusted from lists)

### crx-runtime located
- Remote: https://github.com/ngesk2/crx-runtime.git (note: ngesk2, not piging2).
- Remote HEAD/main: 6c4b5317 ("Freeze constitutional object model", 2026-06-08) — unchanged.
- Pig checkouts: /home/nolan/projects/CRX_REMOTE (main, b833d91→6c4b5317 after fetch;
  10 dirty .cursor agent-transcript files — transcript noise, NOT backend code, NOT a candidate)
  and /home/nolan/projects/constitutional-runtime (branch constitutional-trunk,
  74fbb74 "Lane-L-tenant-isolation-vectors" — a lane's active work area).

### constitutional-runtime 3371 dirty files — NOT a candidate
- `git diff -w --numstat` is EMPTY: 1,282,005 lines changed are pure whitespace churn
  (line-ending/format sweep), zero semantic change. Not a backend improvement.
  Left untouched (active lane area).

### crx-runtime remote feature branches — NOT convergeable
- 11 remote branches (audit-hardening, codex/context-workorder-convergence,
  constitutional-convergence-v2, constitutional-trunk, event-runtime-deduplication,
  feature/approval-effect-identity, feature/context-compilation,
  feature/external-agent-hardening, feature/knowledge-replay-routing,
  feature/mission-decomposition, feature/namespace-entitlements).
- `git merge-base` with origin/main AND origin/constitutional-trunk: NO common ancestor
  (exit 1). These are 240-commit unrelated histories (Codex/Trish Nikitha, Sep 16-17),
  not mergeable into current main by Git mechanics. Porting would be manual
  re-implementation requiring full re-verification — not a sweep action.
  VERDICT: SUPERSEDED/UNKNOWN (cannot converge; needs owning lane's intentional port
  if any invariant is wanted).

### Vocabulary gate (0264d517, fyd repo) — KEEP PRODUCT-SIDE
- Lives at src/fyd/proceduralize/vocabulary.ts; single authority, imported only by
  microdata.ts and structured-data.ts (the two canonical-ingestion paths).
- crx-runtime has NO vocabulary module. No existing CRX authority → converging would
  manufacture one. VERDICT: KEEP PRODUCT-SIDE. One vocabulary authority already holds.

### SSRF effective-destination hardening (0264d517, fyd repo) — KEEP PRODUCT-SIDE
- Single authority src/fyd/net/safe-fetch.ts; all acquisition/media callers
  (acquire-media.ts, ingest.ts, static-adapter.ts) import it. ONE URL-SAFETY AUTHORITY
  already holds within fyd.
- crx-runtime has NO URL-safety module. VERDICT: KEEP PRODUCT-SIDE.
- DNS-rebinding gap stays HONESTLY OPEN: SSRF = IMPROVED/TESTS PASS, not FULLY CLOSED.
  Backlog: SOCKET-DESTINATION BINDING.

### HOLD/UNKNOWN — KEEP (ORCA-owned)
- feat/orca-unknown-outcome-port (PING repo): ORCA-owned unknown-outcome handling.
  Existing authority is ORCA, not CRX. VERDICT: KEEP (C).

### WRONG_JOURNAL / event / evidence / replay — KEEP (PING-owned)
- Q-P0-04 invariant proven PASS; the event spine authority is PING (standing rule:
  never duplicate PING's event system; event spine stays singular). VERDICT: KEEP.

### Tenant/identity — no convergence
- Lane-L tenant-isolation work already lives in crx-runtime's constitutional-trunk
  lineage. mc/tenant-hardening is MC-owned. Nothing stranded. VERDICT: KEEP.

### fyd repo 144 dirty files (hardening/2026-09-28-vocab-ssrf) — KEEP, do not touch
- All mtimes 2026-09-27, no active writer today. Areas: ask pipeline/routes,
  customize, sites, components, tenant graph, sitespec, media, acquisition,
  mc/_lib, journal-gateway tools — all FYD (B) or MC (C) product semantics.
  Mixed-area uncommitted lane leftovers; not single-writer, not mine to commit.
  VERDICT: KEEP (B/C), inventory recorded, no action.

### Non-authorities correctly left alone
- orca-adapter/canonicalization/canonicalization_service.js: explicit SHIM, not the
  authority (real service is Pig-side). Not a duplicate.
- fyd-lane/lane-f-replay-adapter.py: lane proof adapter reusing the canonical
  reducer unchanged. Not a competing implementation.
- lane-p01/tree redactEmail: narrow email redactor in a vendored lane snapshot,
  not the secret-class invariant. Not a duplicate.

## T+0 verdict
- SEMANTIC CAPABILITY ADDED to crx-runtime: NONE (no proven CRX-owned semantics
  found stranded; all named candidates have their correct existing owner).
- DUPLICATION REMOVED: NONE (no live duplication found; apparent duplicates were
  shims, lane snapshots, synced mirrors, or single-authority callers).
- CALLERS CONVERGED: NONE needed.
- NET LOC in crx-runtime: +0.
- DEPENDENCIES ADDED/REMOVED: none. AUTHORITIES ADDED: none. TRUTH STORES ADDED: none.
- BYPASSES REMOVED: none.
- TESTS: secret fix re-verified green from clean worktree (234+3 suites).
- RUNTIME REACHABILITY: not applicable (no runtime change).
- PUSHED to crx-runtime: NOTHING. Remote verified unchanged at 6c4b5317.
- COMMITTED (PING repo, own branch, not pushed): security/secret-redaction-2026-09-28 @ 9652896.

## Discovery-inventory addendum (subagent, read-only, 06:13-06:45 MDT)
Full inventory: ~/workspace/crx-convergence-sweep/inventory-2026-09-28-t0.md.
- PING monorepo: 30 local branches (all unpushed), 17 worktrees, 1 stash
  (WIP on fyd/builder-rebuild-v1: FYD-009 DONE_VERIFIED — FYD-owned, not CRX).
  Backend-unit branches (mc/tenant-hardening, mc/approval-request,
  substrate/gap2-provenance-ref, etc.) are ORCA/MC/substrate-owned whole lane
  programs (e.g. gap2 = 213 files / 52k insertions across mission-control, tandem,
  prospects), not surgical units. crx-runtime has NO provenance module; converging
  them would manufacture a boundary the order forbids. VERDICT: KEEP (C).
- Pig FYD ~40 branches: `goose/dns-rebinding-toctou-20260925` (88 ahead) contains
  ZERO dns-rebinding/socket-pinning code (338 files of general FYD product work;
  name is a leftover). The DNS-rebinding gap is honestly still open. VERDICT: KEEP (B).
- `lane/l-secret-broker`: 0 ahead of origin/main — nothing new. Not a candidate.
- lane-p01/tree/: synced mirror of the Pig vocab-ssrf tree (identical safe-fetch
  sha256); Pig FYD repo is the authority. Not a separate improvement. VERDICT: KEEP (B).
- Local FYD builder repo (fyd-build, no remotes): 17 branches fyd-002..fyd-038,
  all FYD product work. VERDICT: KEEP (B).
- Pig track-a worktrees: broken (.git points at local-VM paths). Noted, not touched.
- Pig FYD repo: ACTIVE (src mtimes 06:18 MDT) — per active-writer rule, its 131-144
  dirty files are READ ONLY until handoff.
- The discovery arm logged this lane's secret commit as an ACTIVE WRITER event;
  that was this lane's own candidate #1 commit, not an external writer.

## Queued / needs owner or owning-lane authority
- crx-runtime remote feature branches (11): unrelated histories; intentional port only.
- fyd 144 dirty files: owning lane(s) to commit or discard.
- Secret-broker architecture (SECRET REFERENCE → AUTHORIZED BROKER): future backlog.
- SOCKET-DESTINATION BINDING (DNS rebinding): open backlog, research existing stacks.

## Next sweep (T+6h)
Re-run DISCOVER → reobserve worktrees → classify → converge only what is proven
CRX-owned against an EXISTING CRX authority. The six-hour discipline continues;
this sweep's honest result is that the kernel is not currently missing anything
that the order's own rules would allow converging.
