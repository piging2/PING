# INTEGRATION LEDGER 02 — 2026-09-29 ~09:50 MDT reporting interval

## HEADLINE VERDICT

**SUBSTANTIATED INTEGRATION PROGRESS THIS PERIOD. First MVP arrow closed.**

The EVIDENCE -> PROCESSOR arrow on the PING website workload went red -> green: defect re-verified on current HEAD, minimal fix committed (3 files, +62/-9), 11/11 dogfood tests green on both branches, served `/build/ping-fyd` returning HTTP 200 with zero `BindingVerificationError`. One new operator-visible capability: the PING website workload renders again.

## OPENING: FALSIFICATION-QUEUE STATE + WRITER B EDGE FIX

**Falsification queue (P0 order: runtime identity/provenance -> reachability -> semantic authority -> convergence -> mutation):**

1. **Runtime identity/provenance: RESOLVED this period.** Proved which tree serves the PING workload: `:3100` runs from `/home/nolan/projects/ping-fyd-converged` (branch `fyd/convergence-2026-09-28`), NOT `/home/nolan/projects/ping`. Evidence: listener PID 43707, `/proc/<pid>/cwd` -> `ping-fyd-converged`. The two trees share `origin git@github.com:piging2/fyd.git` and diverge from common ancestor `f877c391` (the exact SHA the audit reproduced against). Ledger 01's "integration line" was the wrong runtime root; the served branch is the de facto reached path.
2. **Reachability:** `/build/ping-fyd` HTTP 200 on 3/3 attempts post-fix (was HTTP 500).
3. **Semantic authority:** the binding-verifier remains the sole fail-closed authority on the evidence seam. No new authorities, no new classes. The fix routes legacy `owner-asserted` facts through the existing `owner_authored` lane.
4. **Convergence:** fix converged onto the served branch via cherry-pick (`ed3ff708` -> `b9a0201a`), one semantic change, two branch commits. No duplicate semantic authority created.
5. **Mutation:** committed locally on working branches, never pushed, never main.

**Writer B edge fix: PROVEN, fully green (code + tests + served).** Terminal outcome PROVEN per the binary law; the served-path iff-condition is satisfied.

## HARVESTED

- **Owner-asserted -> owner_authored provenance routing** (Writer B, semantic unit B). Harvest chain: reached PING arrow (EVIDENCE -> PROCESSOR) -> observed defect (`BindingVerificationError`, HTTP 500, no SiteSpec) -> blocking evidence (identical failure in test and served log) -> converge (3 small changes, no new classes) -> semantic owner (binding-verifier, fail-closed, unchanged authority) -> post-integration proof (HTTP 200, 0 errors, 11/11 tests). Status: **WIRED / REACHED / PROVEN**. Note: this was a PING-internal vocabulary repair, not a CRX primitive harvest. CRX harvests remain **BLOCKED** on security containment (ledger 01 section 12, unchanged).
- Six-field `token.json`/`.env.base` inspection completed this period (read-only, no values printed): both SECRET-LIKE YES, TRACKED BY GIT YES (mode 100644, `origin/constitutional-trunk`), REFERENCED BY live code (`google_drive_backup.py` reads token.json; 5 compose files + `configuration_authority.py` load .env.base), ROTATION REQUIRED YES. Owner decision pending; not acted on.
- TIER 1 worker inventory: Copilot CLI / OpenCode / gh absent on Pig; no OpenRouter key; node v22 present. Worker classes = TIER 0 + Muse writers. PING task benchmark N/A (single class).

## INTEGRATED

- `ed3ff708` (`fyd/builder-harvest-trackc-2026-09-28`, `/home/nolan/projects/ping`): planner emits `owner_authored` for non-`website-derived` provenance; verifier read seam derives `OwnerAssertion`s from legacy `owner-asserted` objects (exact-value match still required; correction-covered fields skipped); renderer `boundField` classification follows provenance kind. 3 files, +62/-9.
- `b9a0201a` (`fyd/convergence-2026-09-28`, `/home/nolan/projects/ping-fyd-converged`): clean cherry-pick of the above onto the served branch. Working tree clean.
- Served: production rebuild (`npm run build` rc=0) + sanctioned `:3100` restart (env flag `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1` verified live on PID 43707).

## DELETED/RETIRED

None this period.

## STILL STRANDED

Carried from ledger 01, unchanged: 71 worktrees under `/home/nolan/projects/ping` (Writer A tenant/identity, Writer B ContextPack, Writer C Mission Control, approval door `af7d2688` with ~2.5k lines of tests, ws2 DependencyIndex patches, design/Ask lanes); the 21-commit workspace bank; `/home/nolan/ping` tenant-dispatch work. Stranded classes: UNKNOWN / PARTIAL (none re-graded this period). Next stranded-value accounting due next interval.

## DUPLICATE AUTHORITIES REMAINING

- **Branch convergence debt (new):** `fyd/builder-harvest-trackc-2026-09-28` and `fyd/convergence-2026-09-28` are sibling branches of one repo now carrying the identical semantic fix. Not a semantic duplicate authority (one change, two commits), but the integration-line question is open: the served branch is the de facto runtime root. Recommendation for next interval: converge the lines (one direction) rather than letting them drift. Needs a lane decision, not unilateral action.
- **Foreign process (observed, not touched):** PID 49851, a `next-server` with cwd `/home/nolan/2026-09-22/you-re-really-good-at-web/work/ping-parallel/apps/editorial-preview`, survived two sanctioned `:3100` restarts. It does not hold `:3100`. Not this stream's work; left alone.
- CRX competing authority schemes: unchanged, still queued behind security containment.

## MVP ARROWS CLOSED

- **EVIDENCE -> PROCESSOR (PING website workload): GREEN.** First arrow closed under the PING-MVP regime. Before: 9 red / 2 green dogfood, HTTP 500, `BindingVerificationError` in test and served log. After: 11/11 green on both branches (coordinator independently re-ran), HTTP 200 x3, 0 `BindingVerificationError`, page renders ("PING Social -- Grand Junction, Colorado").

## MVP ARROWS STILL BROKEN

All other arrows remain red. Notable: `/api/fyd/ask/ping-fyd` returned 404 Unknown site per ledger 01; **not re-verified this period**. The audit's second defect (source completeness / no BI acquisition for the PING tenant, finish-order 6) is the expected next break.

## TEST/CERTIFICATION STATE

- Dogfood (3 files): 11/11 green on integration line AND served branch (coordinator re-ran both; writer's "8 red" was actually 9 red / 2 green before).
- Writer-reported (not independently re-run): 25 suites 222/222 (`sitespec` + `builder`), 17 suites 150/150 (`components`); `tsc --noEmit` clean except pre-existing `secret-broker.redteam` errors in untouched files.
- Fail-closed behavior preserved: `binding-verifier.test.ts` "label without assertion -> UNBOUND" cases still green; fixtures are `website-derived`, unaffected.
- **Certification chain for the served path (complete):** SOURCE_ID `b9a0201a` -> BUILD_ID (`npm run build` rc=0, 2026-09-29 09:41:50 MDT) -> ARTIFACT_DIGEST (fresh `.next`) -> DEPLOYMENT_ID (`/home/nolan/start-3100.sh`, sanctioned) -> PROCESS_ID (43707, cwd + env flag verified) -> SERVED_DIGEST (HTTP 200, ~70KB) -> REQUEST/RESPONSE EVIDENCE (3 curls, 0 `BindingVerificationError`, title + content checks).
- Correction to ledger 01: the audit's "8 red dogfood tests" was 9 red / 2 green. The writer's claim "planner.ts gone" was wrong; it lives at `src/fyd/builder/planner.ts` (the recon grepped the wrong path). The writer adapted correctly.

## NEXT HIGHEST-LEVERAGE GAP

Per the falsification order, after runtime identity (resolved) and reachability (green): **semantic authority for the PING tenant's knowledge** — the audit's second defect (source completeness / BI acquisition, finish-order 6: "PING understanding PING"). Candidate writers: Writer A (tenant + identity hostile tests, finish-orders 1/5) or a scoped BI-retrieval reader to falsify the gap first. Also queued: the two-branch convergence decision. No writer starts on CRX items until the security incident is contained (owner decision pending).

## PENDING OWNER DECISIONS (unchanged, tracked not acted on)

1. Security incident containment (revoke/rotate, remove files, purge public history, ignores + scanning).
2. `/home/nolan/projects/happy-place-platform` local commit `f21ba933` (never-touch boundary crossed; nothing pushed).
3. Corrupt ref `fyd/builder-rebuild-v1` in `/home/nolan/workspace`.

## COMMITS THIS INTERVAL (local-only, nothing pushed)

- `ed3ff708` — Writer B fix (`/home/nolan/projects/ping`, `fyd/builder-harvest-trackc-2026-09-28`).
- `b9a0201a` — cherry-pick onto served branch (`/home/nolan/projects/ping-fyd-converged`, `fyd/convergence-2026-09-28`).
- `67b131b` — coordinator checkpoint (`~/workspace`, `security/secret-redaction-2026-09-28`; commit-every-time order applied).
- Nolan's binding commit-every-time order (2026-09-29 ~09:39 MDT) received and applied: every work unit ends committed, honest checkpoint labels, no pushes without his word.

---

*Ledger 02. Next ledger: integrate-or-explain.*
