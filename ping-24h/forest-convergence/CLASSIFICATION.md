# Forest Convergence: Classification

Date: 2026-09-28 ~18:40 MDT. Coordinator synthesis from 4 completed Step-0 lanes
(STEP0_WORKTREES, STEP0_SERVED_TREE, STEP0_SEMANTIC_TRACE, STEP0_REGEN_SEAM)
plus the Jev track's JEV_DECISION_INVENTORY. Workspace-repo lane pending.

## Commit target (decided, verified not frozen)

- New worktree: `/home/nolan/projects/ping-fyd-converged`
- New branch: `fyd/convergence-2026-09-28`, cut from `f877c3919941978f07d5014909595df4751ec258`
- Worktree is clean (0 porcelain). Frozen tree `/home/nolan/projects/ping`
  untouched (still 144 dirty on its own branch).
- Journal carried over by COPY (not move): `data/fyd-journal/events.jsonl`,
  65 lines, gitignored in both trees. Frozen tree keeps its file.
- Projections stay at `/home/nolan/ping/var/fyd-projections/` (outside both
  trees); dump.py rewrites them from the new tree.

## Semantic units and dispositions

### 1. proposal/approval (customize path) -> CONVERGE + BUILD
- M `src/app/api/fyd/customize/route.ts`: contains handleApprove AND an
  uncommitted stale-guard 409 layer NOT in the served build. Must diff;
  keep the served behavior, evaluate the stale-guard separately.
- M `src/fyd/customize/server.ts`, `types.ts`: emitOverlayEvent lives here. KEEP.
- ?? `src/fyd/customize/__tests__/stale-guard.test.ts`: goes with the guard.
- ?? `mc-approval/`: unknown content; inspect before classifying.
- BUILD: approve->auto-regen trigger. Smallest seam per archaeology: the
  committed/replayed branch of handleApprove (~route.ts 537-567) where
  emitOverlayEvent returns { eventId, deduped }. New server-only module
  `src/fyd/projection/regen-trigger.ts`: journal selection (demo),
  timeout, post-dump overlayEventIds verification, regen outcome reported
  in the approval response. Approval stays committed regardless; derived
  truth may honestly lag. Rejected alternative: routing spec-pipeline
  through getFydTenantGraph (changes the proven serve path; would
  invalidate the verification proofs).

### 2. renderer/components -> KEEP
- M `src/app/layout.tsx`: the mobile one-liner (suppressHydrationWarning),
  verified live in served bytes. Harvest with an attributing test.
- M `src/app/sites/_shared/site-client.tsx` (min-w-0), `site-metadata.ts`.
- M `src/fyd/components/renderer.tsx`, `hero-section.tsx`, `contact-link.tsx`,
  `object-overlay.tsx`, `ask-fyd-widget.tsx` + tests.

### 3. proceduralizer + deterministic IDs + JSON-LD -> KEEP
- M `src/fyd/proceduralize/patch.ts`, `sha256.ts`,
  `__tests__/service-extraction.test.ts`.
- ?? `src/fyd/proceduralize/__fixtures__/redacted-batch-c-*.ts`: fixtures.

### 4. SiteSpec generator -> KEEP (clean at HEAD, no action)
- generator.ts, apply-layer.ts, spec-pipeline.ts: not dirty. Nothing to do.

### 5. binding verifier -> KEEP
- M `src/fyd/sitespec/binding-verifier.ts`, `public-projection.ts`,
  `sites-render-audit.ts`.

### 6. evidence/provenance (Ask FYD, why-this) -> KEEP
- M `src/app/api/fyd/ask/*`, `src/fyd/ask/*`, `src/components/ping/ask-ping.tsx`,
  `src/lib/ping/ask-composer.ts`, `src/app/api/fyd/why-this/route.ts`,
  `src/fyd/object/why-this-steps.ts`, `src/fyd/ui/why-this.tsx`.
  Ask FYD is proven live; dirty changes are post-build improvements.
  Diff each; keep improvements only if tests pass.

### 7. visibility/owner overrides -> KEEP
- M `src/app/api/fyd/objects/[objectId]/overrides/route.ts`,
  `src/fyd/object/owner-overlay.ts` + tests, `src/fyd/data/fyd-tenant-graph.ts`.

### 8. projection regeneration tooling -> KEEP
- `tools/fyd-site-projection/dump.py`: clean at HEAD. No change.
- M `tools/fyd-journal-gateway/server.mjs`: diff, keep.
- ?? `tools/fyd-journal-gateway/start.sh`, `README.md`: KEEP (gateway launch
  needs start.sh; token stays in ~/.config, never committed).

### 9. BFF/read boundary -> KEEP
- M `src/app/api/fyd/edge/object/route.ts`, `src/fyd/edge/client.ts`,
  `resolve.ts` + tests.

### 10. demo routes -> KEEP
- M `src/app/sites/happy-place/page.tsx`,
  `src/app/sites/coppersmith-plumbing/page.tsx`, `src/app/sites/page.tsx`,
  `src/app/o/[objectId]/page.tsx`.

### 11. tenant isolation (FYD) -> KEEP
- M `src/fyd/tenant/__tests__/f-journal-privacy.test.ts`,
  `g-route-isolation.test.ts`, `h-crash-window.test.ts`.
- The Jev track's live tenant gaps (MC dispatch tenant-from-body,
  event-bridge namespace laundering) are NOT inherited by FYD writes:
  the FYD journal gateway 400s on tenant_required/tenant_mismatch today
  and the convergence preserves that.

### 12. object graph / digest -> KEEP (subset)
- ?? `src/lib/ping/digest.ts` + `__tests__/digest.test.ts`: digest law
  implementation. Inspect, keep if it matches sha256-canonical-json-v1.
- M `src/lib/ping/ping-object-reader.ts`, `types.ts`.

### 13. Track C sitepatch/ -> DEMOTE (keep, unwired)
- `src/fyd/sitepatch/`: committed at HEAD, ZERO imports anywhere in
  src/app or src/fyd (verified). Fully orphaned. The live path is
  `proceduralize/patch.ts` (name trap documented). Do not wire it now;
  do not delete. Revisit only if a measured experiment needs it.

### 14. MC dispatch + MC routes -> FREEZE (not my unit)
- M `src/app/api/mc/_lib/mc-dispatch.ts`, `src/app/api/mc/dispatch/route.ts`,
  `src/app/api/mc/missions/*`: the tenant-from-body gap lives here; the
  Jev track owns the surgical patch (HELD). Do not harvest into the
  convergence tree (new worktree starts at HEAD without these dirty changes).
- ?? `src/app/api/mc/_lib/mc-dispatch-identity.ts`, `mc-tenant-gate.ts`,
  `src/app/api/mc/{agents,approvals,graph,object,search,today,trace-forward}/`:
  unverified new surface. FREEZE.

### 15. acquisition / builder UI / dev lab / media lane -> FREEZE
- M `src/fyd/acquisition/*`, `src/app/build/[siteId]/*`,
  `src/app/dev/objects/*`, `src/fyd/media/authority-binding.ts`,
  `?? public/fyd-media/*`, `?? public/t1-media/`: not on the proven
  phone-loop path. Leave in the frozen tree. Media content dirs: check
  whether served pages reference them; if yes, copy as content (not code).

### 16. secret broker -> FREEZE
- ?? `src/lib/secrets/`: no imports from any FYD demo path (verified).
  Separate unit. Not harvested. (Secret scan still runs before commits
  as a blanket guard.)

### 17. junk -> never commit
- `?? .next.backup-*/`, `.next.bak-*/`, `.next.integration-build-*/`,
  `.next.pre-purehead-*/`, `.proof-tmp/`, `=586`, `nul`,
  `geometry-regression.mjs`, `tsconfig.*.tsbuildinfo`,
  `src/fyd/lineage/tsconfig.tracer.tsbuildinfo`,
  `tools/fyd-site-projection/__pycache__/`, `*.bak`, `*.bak-r3`,
  `?? var/` (runtime output: fyd-intake/, mc-approvals.json).
- `?? .github/`: repo agent config (copilot-instructions.md). KEEP, harmless.

## Genuinely missing (BUILD, after forest search)

1. approve->auto-regen trigger (+ reporting in approval response).
2. Build-identity seam in demo diagnostics (expose BUILD_ID/commit SHA;
   no seam exists today).
3. Attributing test for the mobile one-liner (verification required
   failing-then-passing before commit).

## Tenant-safety rule for all writes

FYD journal gateway tenant enforcement (400 on tenant_required /
tenant_mismatch / request_id_tenant_conflict) is preserved as-is.
No write may accept tenant identity from untrusted input or weaken
the fail-closed journal selection (WRONG_JOURNAL behavior stays).

## Commit plan (small semantic commits, explicit pathspecs)

1. proceduralizer + JSON-LD determinism + digest law
2. SiteSpec/planner (only if dirty; currently clean -> skip)
3. renderer safety + mobile fix (+ attributing test)
4. evidence binding + owner visibility + tenant tests
5. proposal/approval + regen trigger (the BUILD item)
6. demo routes + read surface + journal gateway tooling
7. tests/fixtures/proof tooling + .github config
8. build-identity seam (BUILD item)

Each commit: git status + diff + diff --cached + secret scan +
targeted tests + semantic-contract check. Then clean-worktree gate,
build from the SHA, switch :3100, re-prove the full list.
