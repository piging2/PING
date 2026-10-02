# Lane B failure evidence

Lane B: Card + Node projections (generic primitives, same object substrate).
Repo: /home/nolan/projects/ping, branch fyd/sitespec-generator.

## 2026-09-21 — lane start
- `var/fyd-projections/` does not exist in the canonical repo (task assumed it).
  Routed around: Lane A's real data shape is `ObjectView` (src/fyd/object/types.ts);
  the lane-B prop interface `ObjectProjection` is defined from that shape plus an
  honest evidence-basis layer. Mismatch risk documented in the final report.
- `~/workspace/fyd-lane/_coord/LANE_A_DONE` does not exist yet. Proceeding on the
  current ObjectView contract; adapter is type-checked against it.
- No @testing-library/react / jsdom in package.json. Routed around: tests assert
  on react-dom/server renderToStaticMarkup HTML in the node test environment.

(Failures appended below as they occur; success entries go in the final report.)

## 2026-09-21 — ServiceBasis mismatch caught live by the proof tests
- 11/13 tests passed; 2 failed because Lane A reworked `view.ts`/`types.ts`
  MID-LANE: `ServiceBasis` changed from `"derived" | "owner"` to
  `"structured" | "owner"`, services now come from structured
  `ping.social.service@1` objects (provides/offers relationships) in the new
  projection JSON fixtures (`src/fyd/object/__tests__/fixtures/projections/`),
  and `buildObjectView` loads via `getPingObjectGraphSync`.
- Evidence preserved in the jest output: adapter mapped unknown "structured"
  basis to the `unverified` fallback (honest, never a silent upgrade).
- Recovery: adapter updated (structured -> observed with "From the site data"
  receipt + lineage steps; unknown kinds -> unverified), Service proof
  rewritten to use the REAL structured "Pergola Design Consultations" object
  from the happy-place projection, Person proof via the real coppersmith
  projection. Result: 14/14 pass. The task's named service turned out to
  exist as a real structured object in Lane A's new fixture.
- Open coordination gap: no `~/workspace/fyd-lane/_coord/LANE_A_DONE` exists;
  the adapter tracks the ObjectView contract by type-checking only.
