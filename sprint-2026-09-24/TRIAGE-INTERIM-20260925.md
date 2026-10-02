# FYD sprint worktree triage - interim report (2026-09-25 ~15:47 MDT)

## Commit made
- `6f2dd65e` on `fyd/sprint-integration-2026-09-24` (NO PUSH): 16 files,
  mechanical call-site repair. `tsc --noEmit` clean.
- CORRECTION to the commit message's archaeology: the API breakage was
  committed in `89c7da78` (LANE-N, 10:26 MDT), NOT in `b3c891c6`. 89c7da78
  swept the Q-C-01 lane's uncommitted spec-pipeline rework
  (CompiledSite -> CompiledPublicSite, compilePublicSite replacing
  compileSiteSpecWithIntent/publicGraph) into its own commit without the
  call-site updates, leaving HEAD red. The 24 dirty files were the Q-C-01
  lane's in-progress repair. 87671a5f's "production build compiles" claim
  was made with the dirty worktree present; the clean commit was red.

## Quarantine (not committed, not deleted)
- In-repo `stash@{0}` ("qc01-lane", all 24 files as found).
- `~/workspace/sprint-2026-09-24/stashed-lanes/`:
  - `qc01-call-site-migration-20260925-full.diff` (24 files, pre-triage record)
  - `qc01-behavior-changes-and-superseded-418-fixes-20260925.diff` (8 files)
  - `README.md` (per-file disposition)

## :3101 divergence - ATTRIBUTED, not a regression
- :3101 = pid 62734, cwd `/home/nolan/build-edge-port` @ `8faf96d0`
  (separate parallel-lane worktree, NOT the sprint branch).
- Its MarginObjectLayer: `if (w >= 1024) return "single"` - no dual projection.
- :3100 (sprint branch): dual-margin via `distributeBalanced`, per Nolan's
  2026-09-25 edge-placement directive. "Dual at 1280" is intended behavior.
- viewport.ts 1280 threshold (`deviceClassFor`) is IDENTICAL in both trees.

## Live proof results (this session)
- Production build from clean tree: GREEN. :3100 restarted via
  /home/nolan/start-3100.sh, healthy, NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1
  verified live in process env.
- Widths probe (15 page loads, fresh tabs): all 200, screenshots captured.
- **React #418: RED.** Both site pages, all 5 widths (1280/1440/1920/375/390),
  in regular AND fresh-incognito contexts. Homepage clean.
- Peek containment at 1440: PASS (dialog rect fully within 1440x900).
- CLS: 0.0 measured on all probed pages (<= 0.1 PASS).

## #418 falsification (decisive)
The 15:05 "has418=False, lane closed" claim does NOT reproduce:
1. Clean tree (6f2dd65e): #418 RED.
2. + layout.tsx suppressHydrationWarning + edge/client.ts window.load
   deferral (the "superseded" fixes): #418 still RED. They were not masking it.
3. Full 24-file dirty tree (byte-identical to the 15:05 state): #418 RED.
Conclusion: the #418 was never fixed on this branch; the 15:05 verification
must have run against a different build/tree. The 761bd086 lane closure is
invalidated. The #418 needs a real diagnosis (not done - see blockers).

## Blockers / incomplete
- Pig SSH transport down since ~15:40 MDT (egress proxy "Broken pipe").
  Cannot: restore the worktree to clean 6f2dd65e (currently 8 files checked
  out from stash for experiment #3), rebuild :3100 from the clean tree
  (currently serving the 24-file experimental build), run
  verify-presence.cjs (scroll-away proof), or retrieve screenshots.
- verify-presence.cjs NOT YET RUN this session (scroll-away/return,
  mobile overlay, peek/expand, CLS from that probe).
- Homepage PortalHost mount marker: still unconfirmed (known issue).
- Screenshots: on the Pig at
  C:/Users/nolan/.local/share/pigi/fb-engage/hydration-widths-20260925/
  (15 PNGs + hpp-peek-1440.png + hydration-widths-report.json). Not yet
  copied back.

## Next steps when transport recovers
1. `git checkout 6f2dd65e -- .` (restore clean tree), verify status clean.
2. `npm run build`, restart :3100 via /home/nolan/start-3100.sh, verify flag.
3. Run verify-presence.cjs + verify-hydration-incognito.cjs.
4. Retrieve screenshots + reports to ~/workspace/sprint-2026-09-24/proof/.
5. #418 root-cause diagnosis is a separate work item for the owning lane.
