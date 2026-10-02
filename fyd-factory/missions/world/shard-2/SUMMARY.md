# WORLD shard-2 (missions 1000-1499) — SUMMARY

Worker: WORLD-SHARD-2. Repo: /home/nolan/projects/ping, branch fyd-factory, read-only (no repo writes, no commits). One tsx-equivalent invocation (esbuild bundle) for the whole shard; results appended incrementally to results.jsonl.

## Outcome distribution (n=500, unpatched repo behavior)

| Outcome | Count | Cause |
|---|---|---|
| GENERATED_WITH_WARNINGS | 407 | all generated worlds; every one carried the ClaimBadge coverage warnings (generic class 1) |
| EVIDENCE_CONFLICT | 39 | contradictory-sources hostile: two sources disagree on phone, fail closed at EVIDENCE |
| IDENTITY_AMBIGUOUS | 38 | franchise-lookalike hostile: chain-pattern name, independent identity unconfirmable, fail closed at OBJECTS |
| ACQUISITION_FAILED | 16 | stale-source hostile with fetch failure (i%3==0), fail closed at SOURCE |
| GENERATED | 0 | none clean: the badge gap touched every generated world |
| NEEDS_REVIEW / UNSAFE_SOURCE / UNSUPPORTED / CRASH | 0 | zero |

Hostile mix in this shard (i%4==0 only): franchise-lookalike (38), stale-source (48: 16 failed + 32 warned), contradictory-sources (39). No unsafe-url scheme ever reached rendered HTML (unsafe_url_count total = 0). Hidden-object and owner-correct-fact intents verified on all 200 owner-intent worlds that generated.

## Latencies (ms)

Total: p50 2.78, p95 4.21, max 25.33.
Per stage p50/p95 (n varies by early-fail): render 2.608/3.898 (dominant: React SSR of ~12 sections x4 pages), verify 0.255/0.368, sitespec 0.040/0.072, projection 0.010/0.016, objects 0.016/0.030, source/observation/evidence/relationships/owner_intent all <0.01 p50.

## Throughput and saturation

23,427 missions/min steady state; 500 worlds in ~1.3 min wall clock; peak RSS 124 MB. Pre-run Pig load: 2.02 on 24 cores (saturation threshold 48) — no wait needed. Single bundle invocation; no per-mission ssh.

## Failure taxonomy

All non-generated outcomes are by-design fail-closed classifications for hostile inputs, not defects: (EVIDENCE_CONFLICT, evidence, contradictory phone sources) x39; (IDENTITY_AMBIGUOUS, objects, franchise-lookalike name) x38; (ACQUISITION_FAILED, source, stale-source fetch fail) x16. Zero crashes, zero spec validation errors, zero unsafe URLs in output across 500 missions.

## Generic classes found

### 1. ClaimBadge coverage gap — Links, CTA, ObjectRail sections (IMPROVED, loop completed)
Signature: `unbound-claim: section binds >=1 public object(s) but renders no claim badge`. 407 missions, 1221 occurrences, 3 per generated world (home:Links, home:CTA, home:ObjectRail). These components render source-derived content (official website/social links, contact CTA, featured-object description) without the ClaimBadge mechanism the 2026-09-22 claim-source standard requires; sibling sections (Services, IdentityCard, SocialProof, CardGrid) all render it.
- Minimize: single world (e.g. 1001) section-level render.
- Fixture: `missions/fixtures/shard2-claim-badge-gap.json`.
- Patch: `missions/patches/0001-shard2-claim-badge-coverage.patch` — ONE authorized path (`src/fyd/components/renderer.tsx`), one mechanism (existing `<ClaimBadge>`), three insertions: LinksSection (badge after link list), CTASection (badge guarded by `objects.length > 0` since it renders with requiresData:false), ObjectRailSection (badge on `[featured]` next to the ad-hoc provenance line).
- `git apply --check` against the live dirty tree: OK (all 3 hunks).
- Test: esbuild bundle with the patch applied in-memory (byte-identical effect, verified line-by-line against the patch file); full shard rerun -> `results-patched.jsonl`: unbound_claim_count 1221 -> 0; exactly 225 missions GENERATED_WITH_WARNINGS -> GENERATED; zero changes to object/relationship/page/section/rendered-section counts; hostile outcomes unchanged; remaining warnings only the designed owner-intent (164) and stale-source (32) kinds.
- Falsify: 9 edge assertions pass — CTA with zero bound objects renders badge-free without crashing; Links with no safe links returns null (no invented badge); unsafe website never leaks a scheme; badge present on normal Links.
- Status: patch PROPOSED (repo is read-only for mission workers; single integration writer owns application). Canonical `results.jsonl` records unpatched repo behavior.

### 2. By-design hostile classifications (logged, no improvement attempted)
franchise-lookalike -> IDENTITY_AMBIGUOUS, contradictory-sources -> EVIDENCE_CONFLICT, stale-source fetch fail -> ACQUISITION_FAILED. These are the mission semantics (fail closed, never invent), not defects. Improving them would mean changing what the mission is supposed to do.

## Findings (shared record format)

- DOMAIN: fyd / COMPONENT: components/renderer.tsx (LinksSection, CTASection, ObjectRailSection) / CLAIM: sections bind source objects and render source-derived content without rendering ClaimBadge, violating the 2026-09-22 claim-source standard / EVIDENCE: 1221 unbound sections across 407 generated worlds; fixture missions/fixtures/shard2-claim-badge-gap.json / CALLER: renderSection / CALLEE: ClaimBadge (existing) / WRITER: n/a (proposed) / READER: public site visitor / AUTHORITY: fyd.sitespec.renderer / CLASSIFICATION: generic defect, fail-open on claim sourcing / CONFIDENCE: high / BROKEN BOUNDARY: projection seam claim-labeling invariant / DEPENDENCIES: claimBadgeLabel, SectionShell / AFFECTS AGENTS: integration writer (apply patch), future WORLD/OBJECT shards (expect GENERATED not GENERATED_WITH_WARNINGS once applied).
- DOMAIN: fyd / COMPONENT: components/registry.ts / CLAIM: dirty working-tree edit changed the import to `./schema-roles`, which does not exist; HEAD imports `../sitespec/schemas`. The fyd module graph is broken at import time in the working tree. / EVIDENCE: `node bundle` failed `Cannot find module './schema-roles'`; `git ls-tree HEAD` shows no schema-roles.ts under components/; `git show HEAD:...registry.ts` imports `../sitespec/schemas` / CALLER: any importer of fyd modules / CALLEE: n/a (missing) / WRITER: unknown other lane (dirty, uncommitted) / READER: mission harness / AUTHORITY: unknown (dirty) / CLASSIFICATION: local accident (other lane), not a generic defect / CONFIDENCE: high / BROKEN BOUNDARY: module graph integrity / DEPENDENCIES: generator.ts, validator.ts, renderer.ts import chains / AFFECTS AGENTS: integration writer (reconcile with owning lane); mission workers must shim the redirect until resolved. NOT patched (read-only boundary; not my lane).
- DOMAIN: fyd / COMPONENT: components/renderer.tsx SectionShell / CLAIM: React warns `Unsupported style property view-transition-name` (should be viewTransitionName) on every section render / EVIDENCE: stderr on all 500 missions / CLASSIFICATION: cosmetic, single occurrence class / CONFIDENCE: high / AFFECTS AGENTS: compose lane. Logged only (1 bizarre-ish cosmetic; not a generic class).

## Saturation numbers

Pre-run: load average 2.02 (1-min) on 24 cores; threshold 48; 0 waits. Run: 23,427 missions/min; peak RSS 124 MB (unpatched), 126 MB (patched rerun).

## Artifacts

- `world/shard-2/results.jsonl` — 500 mission records (canonical, unpatched repo).
- `world/shard-2/results-patched.jsonl` — 500 mission records with the proposed patch applied in-memory (experiment, not canonical).
- `world/shard-2/SHARD-LOG.md` — run log.
- `world/shard-2/harness.tsx`, `build.mjs`, `build-patched.mjs`, `edge.mjs`, `analyze.py`, `inspect.py` — harness and tooling.
- `missions/fixtures/shard2-claim-badge-gap.json`, `missions/patches/0001-shard2-claim-badge-coverage.patch`.

## Compliance caveats (recorded 2026-09-24, not re-run)

1. **Phone format**: missions generated phones as `+1 (555) 01<NNN>` forms
   (e.g. `+1 (555) 01100`) to keep 500 unique values; the protocol's literal
   `555-01XX` range cannot hold 500 uniques. Format acknowledged as
   deviation; uniqueness and dialability verified.
2. **Marker propagation**: mission/world envelopes carry `synthetic:true`
   and `testing_only:true` and the rendered HTML contains a synthetic-test
   comment, but not every intermediate repo-typed artifact structurally
   carries both fields. Explicitly synthetic, testing-only, but the marker
   is not end-to-end on every intermediate.
3. **Runtime**: the run was one esbuild-bundled Node invocation, not a
   literal single `tsx` invocation, because the dirty tree's registry.ts
   imports nonexistent `./schema-roles` (HEAD is fine). Workaround was an
   in-memory esbuild redirect only; repo untouched.
4. **Claim-badge patch premise**: patch 0001's premise (Links/CTA/ObjectRail
   must show a ClaimBadge whenever they bind an object) is NOT proven. The
   repo's claim-badge.test.ts verifies label selection only, not section
   coverage. Other WORLD harnesses did not measure section-level badge
   coverage, so their differing classifications do not falsify this class,
   but the contract premise remains unproven. Patch 0001 is an EXPERIMENT,
   not integration-ready, until claim semantics for Links/CTA/ObjectRail are
   confirmed by the product owner. results-patched.jsonl is experimental
   data, not canonical.
