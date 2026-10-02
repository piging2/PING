# TODO/FIXME/HACK/XXX/TBD classification — convergence branches

Date: 2026-09-26. Method: for each convergence lane, marker grep (word-boundary,
case-insensitive, `(XXX)`-style false positives excluded) restricted to files the
lane's own commits added or touched, at the lane tip; plus uncommitted work in
live worktrees and the falsifier scratch trees. Read-only; nothing edited.

Branches scanned (lane tip): mc/mission-intent-frontdoor @537d264,
mc/consequence-policy-input @db78888, mc/mission-budgets @f336c80,
mc/audit-payload-lifecycle @fd8edef, mc/approval-request @cacf7b2,
mc/pass-migration-proof @28c92f4, mc/pass-migration-supersession @d7b10a8,
spine/x-pass-reached-path @df91b4e, jev/shadow-recorder @849cf7c,
mc/tenant-hostile-tests @a65846d, orca-engagement-pipeline-endgame @f980649,
lane-c/orca-adapter-2026-09-26 @d5d56bc. mc/frontdoor-hardening has no own
commits yet (tip == 537d264); its uncommitted working tree was scanned separately.

## Items

### 1. REAL — planner adapter mapping never done
- Location: fyd-product-lane/src/fyd/proceduralize/planner.ts:37 (present in every
  convergence branch tree via shared history; introduced by ee3091c,
  "fyd-builder-v1: deterministic catalog-driven planner", an FYD product-lane commit,
  not a convergence lane)
- Marker text: `// TODO(sibling): a sibling subagent is extending sitespec/types.ts
  additively with the EXTENDED SiteSpec fields (section job, variant,
  object/media bindings, CTA hierarchy, responsive intent, theme reference,
  rationale). When those types land, map them here in this section: ...`
- Evidence: the sibling's extended types HAVE landed in
  fyd-product-lane/src/fyd/sitespec/types.ts (FYDSectionJob @492,
  V1_COMPONENT_VARIANTS @523, FYDSectionResponsiveIntent @639, job/variant/
  selectionRationale fields @666-671). The planner still imports only
  `ObjectGraph` from ../sitespec/types (line 24) and defines its own local
  Plan* equivalents (objectBindings/mediaBindings/ctaBindings/responsiveIntent/
  ThemeReference @446-527); the canonical-types adapter mapping was never done.
- Ownership: FYD product lane / design sprint (planner/composition work), not the
  convergence track. Suggested queueing: hand to the design sprint's planner lane
  as a concrete mapping task; verify no behavioral drift between the local Plan*
  types and the canonical FYDSection first.

## Verdicts

- REAL: 1 (item 1 above)
- STALE: 0
- DEAD: 0

No TODO/FIXME/HACK/XXX/TBD markers exist in any convergence lane's own code
(mission-control/, orca-adapter/, outreach/pass_policy_engine.py, all lane test
suites), in the frontdoor-hardening lane's uncommitted working tree
(mission_intent.py, test_mission_intent.py, SUPPORT-FILES.md scanned clean), or
in the falsifier scratch trees. Lane prose caveats (e.g. audit lane's
dangling-supersede and os.remove notes, front-door lane's bare-clone note) are
documented in lane/queue records without action markers; they are tracked gaps,
not marker debt.

Note: SWARM-QUEUE.md item 18 ("TODO/FIXME classification across convergence
branches") is satisfied by this report.
