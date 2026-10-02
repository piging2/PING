# INTEGRATION LEDGER 01 — 2026-09-29 ~09:45 MDT reporting interval

## HEADLINE VERDICT

**NO SUBSTANTIATED INTEGRATION PROGRESS THIS PERIOD.**

No code became newly integrated, reached, verified, or observable this period. Work was banked into local commits (auditable, unpushed), and the PING audit completed with an independently reproduced first broken reached edge plus a queued minimal correction. Twenty banked commits with zero additional reached code equals zero integration progress.

**SEPARATE SECURITY INCIDENT (see section 12):** real-shaped credentials (`token.json`, `.env.base`) are committed on the PUBLIC branch `origin/constitutional-trunk` of `github.com/ngesk2/crx-runtime`. Revocation/rotation is proposed before any other CRX-side work continues.

## MVP ARROWS (newly integrated this period)

PING TENANT: red. SOURCES: red. OBSERVATIONS: red. EVIDENCE: red. KNOWLEDGE: red. CONTEXTPACK: red. MISSION: red. DECISION: red. AUTHORITY: red. WORKER: red. WORKORDER: red. ATTEMPT: red. RESULT: red. VERIFICATION: red. OUTCOME: red. LEARNING: red. NEXT WORK: red.

Nothing moved from unreached to reached. What exists per arrow is stranded, tested-but-unwired, or regression evidence (sections 3-6).

## 1. CODE IN THE INTEGRATION LINE

Integration line: `/home/nolan/projects/ping`, branch `fyd/builder-harvest-trackc-2026-09-28`, HEAD now **`b38973fb`** (`wip: commit stranded work 2026-09-29 (wave4 integration-ledger sweep)`), 140 files banked from the previously dirty checkout.

Status: **unverified WIP bank, NOT an integration milestone.** It was committed as one broad shared-branch commit; semantic coherence is unproven and the relevant canonical gates have not been replayed against it. The PING audit's independent reproduction ran against the prior HEAD `f877c391`; its findings must be re-verified against `b38973fb` before any claim is made.

Remaining dirty on the line: 4 entries, all generated build residue (`.next.backup-missionj-20260927/`, `.next.bak-20260924-redirect/`, `.next.integration-build-20260924/`, `.next.pre-purehead-20260924/`). Correctly uncommitted.

## 2. CODE STRANDED IN WORKTREES

71 worktrees under `/home/nolan/projects/ping`. Stranded value by semantic unit:

- Writer A (tenant/identity): `fyd-dehpp` worktree, tenant-kit, tenant-hostile worktrees.
- Writer B (Orca evidence/ContextPack/verification): `decision-fabric/contextpack-wire-2026-09-28`, approval replay worktrees, ContextPack replay worktrees.
- Writer C (Mission Control projection): `copilot/authority-ux`, mission-control worktrees.
- Cross-cutting: `phase1/approval-door-2026-09-28` (tip `af7d2688`, the tested approval door, ~2.5k lines of tests, NOT on the integration line), `ws2/int-w3`, `ws2/int-w4`, `ws2/int-w5` (DependencyIndex patches banked as `~/workspace/fyd-90h/patches/ws2-w3|w4|w5-f877c391.patch`), design lanes, Ask lane worktrees, `copper-v2-serve`.
- Wave-4 audit worktrees removed after use (HPP, Coppersmith, PING temp worktrees); `/tmp/w4-ledger-head` removed this period.

Every stranded item above is accounted for; none of it is reached from the integration line.

## 3. RUNTIME-REACHED CODE (no change this period)

- Happy Place `:3214` last-good serving behavior preserved (Wave 3 browser proof 2026-09-29 ~08:01 MDT stands as regression evidence). Not the MVP workload.
- PING website workload: `/build/ping-fyd` on `:3100` returns HTTP 500 (`BindingVerificationError`); `/api/fyd/ask/ping-fyd` returns 404 Unknown site. Only artifacts are 4 static HTML renders from 2026-09-21, 8 days stale.

## 4. TESTED-BUT-UNWIRED

- Approval door on `phase1/approval-door-2026-09-28` (ordered identity->terminal->capability->digest->base->expiry gate, terminal-first lifecycle, dual-digest binding). Zero production callers on the integration line. Harvest rule per Nolan: minimal slice only, no blind merge.
- ContextPack wiring on `decision-fabric/contextpack-wire-2026-09-28`.
- DependencyIndex (ws2 w3/w4/w5 patches).
- The PING audit's proposed 3-line evidence-seam correction (section 7): the verifier's `owner_authored` path exists at `binding-verifier.ts:303` but is unreachable; the correction wires it. Written as a recommendation, not yet implemented or tested.
- FYD owner-loop and evidence-binding mechanics proven on HPP, not wired into the PING MVP chain.

## 5. FIRST BROKEN REACHED EDGE (independently reproduced)

**PING website workload, EVIDENCE -> PROCESSOR (binding verification).** Independently verified on a clean worktree at pinned SHA `f877c391`: `planSite` throws `BindingVerificationError: Binding verification refused 2 of 2 factual bindings (provenance kind "owner-asserted" cannot back direct evidence on ping-fyd-business#title)` at `buildVerifiedRenderModel (binding-verifier.ts:883)` <- `planSite (planner.ts:410)`. The served `:3100` log shows the identical error for `/build/ping-fyd` -> HTTP 500. Same wall in test and in production.

Root cause per the audit: the dumper emits provenance kind `"owner-asserted"`; commit `fa0f7efa` (2026-09-22) dropped that kind from the HEAD type vocabulary (`ObjectProvenanceKind` now only `canonical-journal | website-derived | overlay-authored`); the verifier fails closed on `direct` bindings backed by non-`website-derived` provenance. The verifier fails *correctly*; the defect is vocabulary incoherence. No SiteSpec can emit for ping-fyd on HEAD.

This supersedes the earlier inherited ORCA formulation for the PING workload: the first reached break is now localized and reproduced, not hypothesized.

## 6. DELETED OR CONVERGED

None this period. Hygiene only: commit `1bd5b6ad` non-destructively removed 5,158 generated dependency/build files from the git index (they were swept into `0907f113` by an over-broad `git add`; worktrees retain their local installs). No history rewritten.

## 7. NEW OPERATOR-VISIBLE CAPABILITY

None. Mission Control shows no new truthful state from this interval.

## 8. NEXT FOUR WRITERS (concentrated semantic units)

- **Writer A (tenant + identity enforcement):** hostile Tenant A/B tests for the one real PING tenant; tenant binding for GitHub ingestion (finish-orders 1, 5).
- **Writer B (Orca evidence / ContextPack + verification):** implement the PING audit's 3-line evidence-seam correction (dumper kind -> `overlay-authored`; planner emits `owner_authored` for non-`website-derived`; read seam derives `OwnerAssertion`s), proven by the 8 red dogfood tests; then reproduce the ORCA EVIDENCE -> PROCESSOR edge from the reached path (finish-orders 3, 6-adjacent).
- **Writer C (Mission Control decision/outcome projection):** truthful projection of typed decision records as journaled/projected events; Mission Control consumes truth (finish-order 2; CRX item 10).
- **Writer D (HOLD/reconciliation, when collision-free):** UNKNOWN -> HOLD -> RECONCILE as reached runtime behavior (finish-order 8; CRX item 7).

Readers/falsifiers keep the queue full: Jev E1+E2 tournament protocol vs frozen 0.760 baseline; worker-envelope adversarial tests (SUCCESS-while-tests-fail); BI retrieval design; learning-loop replay harness. No writer starts until the security incident (section 12) is contained.

## 9. COMMIT SHAs (local-only, nothing pushed)

Integration line and Pig worktrees (wave-4 sweep + this interval):
- `/home/nolan/projects/ping` (`fyd/builder-harvest-trackc-2026-09-28`): **`b38973fb`** (140 files; unverified bank)
- `codex/ping-parallel-review`: `76248bda`
- `fyd/write-boundary-idempotency`: `3fa8a703`
- `ask-loop/fyd-ask-behavior`: `1f6d54f4`
- `lane/bcq-connector-substrate`: `0ebabf94`
- `constitutional-convergence-v2`: `260c369c`
- `lane/l-secret-broker`: `f7ea9990`
- `copilot/arrow1-claims-gate`: `4bab96c0`
- `copilot/arrow1-hostile-proof`: `ba94089c`
- `copilot/arrow6-sitepatch`: `30dc6ede`
- `copilot/authority-ux`: `0970f71b`
- `fyd/builder-rebuild-v1`: `b6a5cb4e`
- `copilot/l2-benchmark`: `2430df8a`
- `/home/nolan/ping` (`lane-b/tenant-dispatch-threading`): `546b62d76`
- `/home/nolan/fyd-projection-harness`: **`148fe4e5`** (was 7ec906d; leftover 3 staged files banked)
- `/home/nolan/projects/happy-place-platform-forensic`: **`ed0575a`** (was 7569bb4; 1 modified file banked)
- CRX runtime `/home/nolan/crx-swarm/crx-runtime-main` (`main`): `6c4b5317`, clean, no commit needed.

`/home/nolan/workspace` (`security/secret-redaction-2026-09-28`, remote `piging2/PING`): 1,845 dirty entries resolved into 21 bounded local commits. Chain tip **`f1c4d70`** (`audit-bank: workspace remaining untracked dirs batch 2/2`). Full chain: `6b2b1da8` (tracked M/D) -> `027b57fe` (outreach) -> `208e4366` (fyd-product-lane) -> `0907f113` (fyd-lane) -> `c9ea3967` (tandem) -> `6f82a87c` (sprint-2026-09-24) -> `7ee100a6` (goals) -> `7fd2e1bf` (your_files) -> `8c18f5f0` (orca-mc-convergence) -> `8fcaef26` (bin) -> `10b6f92d` (lane-p01) -> `20dfa488` (mission-control) -> `989a674d` (orca) -> `5855aa10` (ping-ui-contract) -> `05dcf87e` (orca-adapter) -> `3159a9c9` (convergence) -> `8c56c0c4` (root files) -> **`1bd5b6ad`** (non-destructive junk removal from index) -> `81c16092` (batch 1/2) -> **`f1c4d70`** (batch 2/2).

Remaining dirty in `/home/nolan/workspace` (277 entries, all classified):
- 268 generated residue (`__pycache__/`, `node_modules/`, `.next/`) — correctly excluded, not committed.
- 5 modified embedded-repo pins (markitdown, hpp-clone, letta-code, inngest, demo-sites): unstageable until those independent repos are committed themselves; reported as stranded-but-independent.
- 4 untracked: `demo-sites/`, `fyd-build/`, `hermes-agent-research/` (independent nested repos, all clean at `fd3ff9e`, `7283af0`, `5472489` respectively) and `tenanos-wave/` (contains a broken embedded repo `.applycheck2/` with no commit checked out; cannot be staged).

Secret scan before commit: filename scan + content scan for private keys, `ghp_`/`github_pat_`, `AKIA`, `xox*`, `sk-ant-`, `AIza` over the full tree. Hits limited to already-tracked vendored/test content (`track-a/*/test_payload_lifecycle.py`, `FAILURE_LEDGER.md` synthetic security-test examples, vendored `goose`/`adk` sources referencing credential field names). One filename hit (`spine-S1-jevshadow.md`) is prose, not a secret. No live secrets found in the newly banked workspace content.

## 10. CRX 14-POINT CONVERGENCE ORDER -> MVP ARROW MAPPING

Adopted as the harvest sequence. Item 1 comes first: without one reached runtime root, converging anything else risks converging the wrong tree.

1. One reached runtime root -> **unblocks ALL arrows** (foundation).
2. One authority graph -> AUTHORITY, DECISION, PING TENANT.
3. One canonicalization/hash authority -> EVIDENCE, VERIFICATION, OUTCOME (replay equivalence).
4. One event schema -> OBSERVATIONS, EVIDENCE, DECISION (typed decision records as journaled/projected events).
5. One identity/tenant chain -> PING TENANT, AUTHORITY.
6. One WorkOrder/ResultEnvelope -> WORKER, WORKORDER, ATTEMPT, RESULT, VERIFICATION.
7. UNKNOWN/HOLD/reconciliation first-class -> finish-order 8 (HOLD/UNKNOWN/recovery as reached behavior).
8. Independent result/effect verification -> VERIFICATION, OUTCOME.
9. Qdrant demoted to rebuildable projection -> KNOWLEDGE, RETRIEVAL, CONTEXTPACK (degrade loudly).
10. Mission Control consumes truth -> CONTEXTPACK -> MISSION -> DECISION display (finish-order 2).
11. Archive old implementations from runtime namespace -> convergence support for all arrows.
12. Shrink the constitution -> AUTHORITY, DECISION (only laws protecting reached invariants).
13. Stop certifying unreached architecture -> VERIFICATION, OUTCOME, LEARNING (promotion only by replay/falsification/measured improvement; finish-order 9).
14. PING as first adversarial tenant -> PING TENANT; proves the whole chain end to end.

P0 -> writer queue (in order): competing authority schemes; authority defined in runtime code; event/schema drift; canonicalization duplication; ambiguous doc status; silent fallback; reachability not separated from experiments; secret/config artifacts in public repo (see section 12); weak outcome verification; UNKNOWN-effect semantics. P1/P2 queued behind P0. **Blocked until section 12 is contained.**

"Desired new authorities = 0" stands: harvest = smallest set of proven invariants (deterministic replay, canonicalization discipline, evidence/authority separation, mutation constraints, witness thinking, adversarial audit culture); delete/archive the rest from the reached path. No constitutional compiler runs until one authority graph passes uniqueness and ownership constraints.

## 11. BINDING EPISTEMIC LAWS AND DONE STATES

Adopted for all harvested code: event integrity != world truth; verified recording != verified proposition; authority and verification stay orthogonal forever (never compute authority from verification scores); EVENT != EVIDENCE; WITNESS != ORIGIN; METRIC != TRUTH; RESULT != VERIFIED OUTCOME.

DONE states used in this ledger and henceforth: documented / implemented / tested / wired / reached / runtime-proven / restart-proven / certified. Nothing is "complete" until reached at minimum. By this scale: the approval door is tested; the evidence-seam correction is documented (recommended); the integration line bank is implemented-at-best; the PING website workload is not reached.

## 12. SECURITY INCIDENT: REAL-SHAPED CREDENTIALS IN THE PUBLIC CRX REPO

Read-only audit completed today against `/home/nolan/crx-swarm/crx-runtime-main` (remote `https://github.com/ngesk2/crx-runtime.git`, public).

**Finding:** on the public branch `origin/constitutional-trunk`, two root files contain real-shaped credentials (no placeholder markers; value shapes classified secret-like by inspection):

- `token.json` (741 bytes): OAuth token pair shape (`access_token`, `refresh_token`, `scope`, `token_type`, `expires_in`). Both token values are opaque, non-placeholder strings.
- `.env.base` (4,086 bytes): 38 keys; credential-shaped opaque values for `QDRANT_API_KEY`, `HF_TOKEN`, `HUGGINGFACE_HUB_TOKEN`, `GOOGLE_TOKEN` (Google Drive OAuth), `GITHUB_APP_WEBHOOK_SECRET`, `POSTGRES_PASSWORD`. Remaining keys are ordinary infra config.

Neither file exists on `origin/main` or in the local `main` checkout. Additionally, `CascadeProjects/infra/.env` on `main` (tracked) contains compose-local credential-shaped values (`POSTGRES_PASSWORD` 16 chars, `GRAFANA_PASSWORD` 5 chars) — lower severity (local-dev stack), same hygiene class.

No secret values are printed in this ledger or anywhere else. Temp copies used for structural characterization were deleted.

**This is a security incident.** Assume the exposed credentials are compromised until proven otherwise.

**Proposed containment (needs Nolan's decision before any other CRX-side work):**
1. Revoke/rotate immediately: Google OAuth pair (token.json), HuggingFace tokens, Qdrant API key, GitHub App webhook secret, Postgres passwords.
2. Remove the files from the branch; purge from git history (history rewrite on a public branch — requires explicit owner approval).
3. Add `.env*`, `token.json`, `*.pem` style rules to `.gitignore` and a pre-commit secret scan so it cannot recur.
4. No CRX harvest writes until containment is confirmed.

## 13. DISCLOSURES AND REPO HEALTH

- **Original Happy Place repo:** the sweep committed `/home/nolan/projects/happy-place-platform` locally at `f21ba933`. Standing policy says the original HPP repo must never be touched. No push occurred. No reset or rewrite performed (destructive Git actions need Nolan's decision). Awaiting Nolan's call on how to resolve.
- **Over-broad add:** commit `0907f113` swept 5,156 generated files (node_modules/.next/__pycache__) into the workspace bank. Corrected non-destructively by `1bd5b6ad` (index-only removal; worktrees keep their installs). No history rewritten.
- **Broken ref:** `/home/nolan/workspace` has a corrupt branch ref `fyd/builder-rebuild-v1` (points at missing object `49e821bf...`). Pre-existing, not caused by this sweep. Left untouched; needs a decision (delete ref vs recover).
- **Commit identity:** workspace bank commits used the repo's configured identity (`Pigi <pigi@local>`); the two small-repo leftover commits used `-c` flags with the same identity while their prior commits used `factory <factory@local>` and `trishnikitha-art <trishnikitha@gmail.com>`. Cosmetic inconsistency, noted.
- **PING audit clean worktree** `/tmp/w4-audit-ping` (Pig-side) remains at pinned `f877c391` for follow-up verification.

## 14. WAVE 4 AUDIT CLOSEOUT

- PING audit: DONE. Final report summarized in section 5; first quality loss EVIDENCE QUALITY with independently reproduced break; smallest correction queued for Writer B; second defect (source completeness / no BI acquisition for the PING tenant) is the MVP-weighted follow-up (finish-order 6).
- Happy Place audit: reclassified QUEUED; partial findings at `~/workspace/fyd-90h/hidden_files/wave4-queued-hpp.md`; agent stood down.
- Coppersmith audit: reclassified QUEUED; partial findings at `~/workspace/fyd-90h/hidden_files/wave4-queued-coppersmith.md`; agent stood down.

## 15. STRANDED-VALUE ACCOUNTING (4-hour rule)

Stranded value this period: the 71-worktree inventory (section 2), the 21-commit workspace bank (section 9), the approval-door branch (`af7d2688`), the ContextPack wire branch, the ws2 DependencyIndex patches, and the PING audit's queued 3-line correction. None of it is lost; none of it is reached. Next accounting due in 4 hours or next reporting interval, whichever the coordinator schedules.

---

*Ledger 01, first of the PING-MVP reporting regime. Next ledger: integrate-or-explain.*
