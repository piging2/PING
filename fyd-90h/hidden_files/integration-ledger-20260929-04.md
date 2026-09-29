# Integration Ledger 04 — 2026-09-29 ~10:45 MDT
**Interval:** CEO-ORDER-LEDGER03-EXECUTION → execution. Coordinator: convergence interval 4.
**Branch:** `security/secret-redaction-2026-09-28` (workspace). Nothing pushed.

## Headline verdict: SUBSTANTIATED INTEGRATION PROGRESS THIS PERIOD

Second MVP arrow closed: **PING → ASK FYD → EVIDENCE is GREEN (WIRED / REACHED / PROVEN).**
The boring proof works live on the served process: "What services does PING offer, and how do you know?" → GRAPH → ASK RETRIEVAL → CLAIM → EVIDENCE → SERVED RESPONSE.

## Lane 1 — Writer A: PING → ASK FYD → EVIDENCE (PROVEN)

**REPO:** `/home/nolan/projects/ping-fyd-converged`
**BRANCH:** `fyd/convergence-2026-09-28`
**BEFORE SHA:** `b9a0201a5ae12398d97af8ade2539cafc6c650b4`
**AFTER SHA:** `c02b9ecca3863b2194f784ef9fe7389d3642006c` (committed locally, no push)
**FILES:** 4 files, 481 insertions, 1 deletion
- NEW `src/fyd/proceduralize/__fixtures__/ping-fyd-graph.ts` — faithful fixture of the 2026-09-21 PING dump (7 objects, 6 rels); legacy `owner-asserted` provenance preserved via documented cast, ObjectProvenanceKind vocabulary untouched
- MOD `src/fyd/data/fyd-tenant-graph.ts` — `ping-fyd` tenant pin: canonical digest, `generatedAt 2026-09-21`, `eventSequences: null`; explicit overlay-story decision (journal overlays stay governed above the pinned base); build/ask site-resolution duplication debt recorded; closed-read boundary preserved (no `FYD_PROJECTION_DIR`, no `getPingObjectGraph` wiring)
- MOD `src/fyd/ask/context-compiler.ts` — legacy hyphenated `owner-asserted` maps to `USER_OVERRIDE`, aligning Ask semantics with the binding-verifier fix in `b9a0201a`; one shared semantic evidence identity (no new AskCitation universe — watch item satisfied)
- NEW `src/app/api/fyd/ask/__tests__/ask-ping-fyd-contract.test.ts` — 7 tests: tenant resolution, SUPPORTED boring proof, PARTIAL separation, UNSUPPORTED refusal (financing, pricing), CONFLICTED determinism (unit + full answer with synthetic conflict)
**TEST COMMAND:** `npx jest --config src/fyd/ask/jest.config.cjs` (19 suites, 343 tests) + `npx jest --config src/app/api/fyd/ask/jest.config.cjs` (6 suites, 99 tests); `npx tsc --noEmit`; `npm run build`
**RESULT:** ALL GREEN — 343/343 + 99/99 (new contract suite 7/7); tsc clean apart from pre-existing secret-broker.redteam errors; build rc=0
**LIVE SERVED PROOF (:3100, rebuilt + restarted after commit):** POST `/api/fyd/ask/ping-fyd` "What services does PING offer, and how do you know?" → SUPPORTED BY MULTIPLE EVIDENCE, 5 graph-backed citations, objectRefs + evidenceRefs; pricing → UNSUPPORTED refusal, zero citations; hours → known-business + explicit-unknown separation; GET on the route → 405 (POST-only)
**SECRET CHECK:** clean — only pre-existing `SECRET_FIELD_RE` custody-guard regex and doc comments; no secret material in touched files
**DIRTY FILES LEFT UNTOUCHED:** none — working tree clean after commit; another lane's fyd-factory stash not touched
**SERVED BUILD ID:** `hqM6xcuYIqv6OiTRpv81y` (PID 96825, `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1` verified live in process env)
**SERVED DIGEST:** `bd56fbed1e7ed91729e6671d5e1d9b94560fb7dff800dbc6d40322d982ec1562` — canonical digest of the fixture base, matches the dump's recorded graphDigest; digest pin verified at every `getSiteBundle("ping-fyd")` load; live citations carry `lastChecked 2026-09-21` matching the pin's `generatedAt`
**PRODUCT BOUNDARY BEFORE:** PING tenant invisible to Ask — `/api/fyd/ask/ping-fyd` did not resolve (unknown_site); no PING facts reachable through the Ask path
**PRODUCT BOUNDARY AFTER:** PING tenant legible through the existing Ask path — SUPPORTED / PARTIAL / UNSUPPORTED / CONFLICTED proven live on :3100 with graph-backed claims, object refs, evidence refs; no model-prior PING facts; staleness (8 days) and empty service fields remain honestly visible

Pre-existing failures outside this unit, verified on pristine `b9a0201a` via stash round-trip (not caused by this unit): `generator.test.ts` happy-place Gallery assertion; CSS-module transform gaps in `ping-fyd-dogfood-render` and `projection-seam-attack` suites.
Observation queued (not fixed — no adjacent refactor per unit scope): the composer misroutes "Does PING offer website design?" to the phone-number answer — pre-existing intent-routing quirk, future lane.

## Lane 2 — Writer B: branch-convergence classification (COMPLETE, read-only)

Deliverable: `~/workspace/fyd-90h/branch-convergence-classification-20260929.md`, committed locally as `970702ff`, never pushed. Merge-base `f877c391`; TRACKC 2 unique commits, CONVERGENCE 8.

| Bucket | Count |
|---|---|
| ONLY TRACKC | 1 commit (`b38973fb`, 200-file WIP bank); 111 files not in convergence range, **42 real implementation** |
| ONLY CONVERGENCE | 7 semantic commits (digest law, renderer safety, evidence binding, approval→projection regen, Ask FYD BFF, journal gateway, build-identity) |
| SEMANTIC DUPLICATES | 1 commit pair byte-identical (`ed3ff708` ≡ `b9a0201a`, sha256 `af079443…`) + 88 files byte-identical across lines |
| CONFLICTS | **0** — 3-way merge-file test over 89 co-changed files: 63 clean, 26 identical adds |
| SUPERSEDED | ~65 files (pyc/tsbuildinfo/var, .bak, scratch, generated media webp/jpg, older customize/route.ts) |
| MUST HARVEST | **42 files in 7 groups**: (A) Mission Control API surface — mc-approval python tooling + 7 routes + 2 _lib + 4 idempotency/caller-identity diffs; (B) `src/lib/secrets/secret-broker.ts` + redteam test + README + jest config (absent on served line); (C) digest-law dedup (drop local sha256Hex for canonical `@/lib/ping/digest`); (D) build owner-panel improvements; (E) dev/objects lab + test; (F) UI components effects-provider/toggle, hero-intro; (G) 2 tests + jest config. Group H (4 media manifests, 640+ lines each) flagged REVIEW — source-vs-generated owner decision needed |

Recommendation: converge toward the served line (`fyd/convergence-2026-09-28`); no reverse merge. Convergence operation (one atomic commit of groups A–G + tests) staged for next interval with explicit authorization, after Writer A completed. Both Pig repos verified untouched (original HEADs, tracked status clean).

## Lane 3 — Sweep: worktree/dirty-tree disposition (interval 2)

Method: full pairwise `git merge-base --is-ancestor` matrix across all 87 local branch tips; a tip that is a proper ancestor of another is fully preserved — retiring its checkout loses zero implementation. **No branch pointers deleted.**

Dispositions: 2 REACHED via main; 17 SUPERSEDED-ABSORBED into active lanes; 9 SUPERSEDED-CONSOLIDATED into tenanos-wave/integration (9 stranded units → 1 canonical); 6 DUPLICATE-CHECKOUT retired; 1 PROVEN-DISPOSABLE file (stale interval-1 artifact in Writer-B repo root).
Untouched: copper-v2 (collision), fyd-family-converge (corrupt ref), ping-fyd-converged (Writer A's repo), codex ping-parallel WIP (active lane).
Inventory updated: `~/workspace/fyd-90h/lane2/worktree-inventory-20260929.md`, committed locally as `4a906ee`, never pushed.

### Worktree/dirty metrics (before → after)
- WORKTREES TOTAL: 67 → **33**
- DIRTY WORKTREES: 2 → 2 (both active-lane WIP: codex + Writer A — not sweep-owned)
- UNTRACKED FILES: 5 → 5 (4 codex evidence PNGs + 1 Writer-A fixture; sweep-owned 1 → 0)
- ACTIVE-WIP COMMITTED: 0
- HARVESTED: 0 (falsification queue owns reach definition)
- DEMOTED/ARCHIVED: **28**
- PROVEN DISPOSABLE: 1
- COLLISION/UNKNOWN: 1 (copper-v2, unchanged)
- SECRET-BLOCKED: 0
- WORKTREES SAFELY RETIRED: **34** this interval (cumulative 38)
- **STRANDED VALUABLE IMPLEMENTATION REMAINING: 58 → 26** (same formula as interval 1; all 26 remaining are maximal tips with no absorber)

## Binary ledger states
- **PING → ASK FYD → EVIDENCE: red → GREEN** (WIRED / REACHED / PROVEN). Second arrow closed under the PING-MVP regime.
- **EVIDENCE → PROCESSOR: still GREEN** (no regression; Writer A preserved the binding-verifier semantics).
- **STRANDED (writer-ready):** branch convergence operation (groups A–G, next interval); PING-tenant source completeness / BI acquisition (next upstream defect — belongs at SOURCE → OBSERVATION → EVIDENCE → OBJECT GRAPH, not in Ask).
- **BLOCKED:** all CRX harvest items (security containment pending owner decision).
- **REACHED:** ASK FYD → EVIDENCE for registered tenants (happy-place, coppersmith-plumbing, ping-fyd).

## Recorded debts (not solved this interval, per CEO order)
1. **Site-resolution duplication:** BUILD AND ASK DISAGREE ABOUT ENTITY EXISTENCE. One product entity must not require independent registration in every projection. Recorded in the tenant-graph module. No SiteAuthority built; prove the duplication with PING first.
2. **PING knowledge quality:** hand-authored, 8 days stale, owner-asserted only, 4/7 service objects empty, no acquisition/re-dump. Next upstream truth-quality defect. Ask faithfully exposes it.
3. **Intent-routing quirk:** composer misroutes "Does PING offer website design?" to the phone-number answer. Queued future lane.
4. **Pre-existing test failures:** generator.test.ts Gallery assertion; CSS-module gaps in dogfood-render and projection-seam-attack suites. Not caused by this interval's work.

## Pending owner decisions (unchanged, not acted on)
Security containment (token.json/.env.base on public constitutional-trunk); the `f21ba933` HPP commit; the corrupt ref `fyd/builder-rebuild-v1`; Group H media-manifest source-vs-generated decision (new, minor).

## Next highest-leverage gap
Per CEO order: Writer A stops here. Reassess, then WHY THIS → SAME EVIDENCE BINDING. Branch-convergence operation (groups A–G onto the served line, atomic) is writer-ready for next interval.
