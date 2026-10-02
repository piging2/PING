# PATCH-INTEGRATION-REPORT

Lane: patch integration (FYD factory). Records patch application verification
and combination checks. Entries are appended, never rewritten.

---

## 2026-09-24 ~05:20 MDT: OBJECT-0 rail patches combination check

Open item from COLLISION-RECONCILIATION.md (OBJECT shard-0, reconciled
2026-09-24 ~05:10 MDT): after applying the two reconciled rail patches,
re-run the bound-variant FIXED_OK check against the COMBINATION.

### Patches under test

- `object-rail-binding-gate.patch` (worker 1): gates the ObjectRailSection
  featured identity on the binding verifier (candidates restricted to objects
  whose title binding verifies; view fed verified title/description).
  File: `src/fyd/components/renderer.tsx`.
- `0001-rail-bound-description.patch` (worker 2): adds `boundRailDescription()`
  in `src/fyd/components/object-rail.tsx`, routing both rail adapters
  (`pingObjectToProjection`, `pingObjectToView`) through
  `verifyPresentationBinding`.
- `0002-rail-section-bound-summary.patch`: NOT applied (superseded per the
  reconciliation decision).

### Application state found

Both patches were already present in the Pig working tree
(`/home/nolan/projects/ping`, branch `fyd-factory`, dirty) when this check
ran. Presence verified by code markers, not assumed:

- Gate patch: `renderer.tsx:1741`
  `objects.filter((o) => boundTitle(ctx, o) !== undefined)` and `:1746`
  `pingObjectToView({ ...featured, title: name, description: summary ?? "" })`.
- 0001 patch: `object-rail.tsx:90` `function boundRailDescription`,
  call sites at `:110` (projection adapter) and `:305` (view adapter).
- 0002 confirmed absent: zero hits for `featuredView.summary` in renderer.tsx.

The tree also carries other lanes' uncommitted changes (WIRE p2/p5 strong
verifier, objects-margin ISSUE-2 CSS, etc.). The check below ran against
this real integration state, which is the state the combination must survive.

### Check procedure

Worker 2's harness (`missions/object/shard-0/scratch/`, identical to the
Pig-side copy at `/home/nolan/fyd-missions/shard-0/`). Repro bundle rebuilt
from the current tree (`node build-repro.cjs` -> `REPRO_BUILD_OK baseline`;
baseline mode bundles the repo's current files, which include both patches).
Minimized fixtures: `rail-bound-description.json` (bound variant) and
`rail-unbound-description.json` (unbound variant).

### Results

Bound variant (`rail-bound-description.json`):

```json
{"fixture":"rail-bound-description.json","pages":4,"sections":12,
 "unboundRendered":false,"boundRendered":true,"verdict":"FIXED_OK"}
```

Unbound variant (`rail-unbound-description.json`):

```json
{"fixture":"rail-unbound-description.json","pages":4,"sections":12,
 "unboundRendered":false,"boundRendered":false,"verdict":"INCONCLUSIVE"}
```

The INCONCLUSIVE on the unbound fixture is the expected outcome for that
fixture: it carries only the unbound sentinel (no bound sentinel exists in
it), and the unbound marker is suppressed (`unboundRendered: false`), which
is the defect-closed signal. The bound claim renders 3 times in the dumped
HTML (rail + section paths), so the FIXED_OK is not a vacuous pass.

### Verdict

**Combination check PASSES.** With `object-rail-binding-gate.patch` +
`0001-rail-bound-description.patch` applied (0002 excluded), the
unbound-rail-description defect is closed and the bound variant still
renders. The two patches do not fight: the gate patch owns the section
featuring path, 0001 owns the adapter paths, different files and surfaces,
and the combined behavior satisfies worker 2's FIXED_OK criterion on the
bound variant. No integration action required for this pair.
