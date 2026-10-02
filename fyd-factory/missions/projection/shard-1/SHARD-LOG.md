# PROJECTION-SHARD-1 LOG

## 2026-09-23 ~20:22 MDT: task received
PROJECTION missions 500-999. Read MISSION-PROTOCOL.md. Checked ~/workspace/AGENTS.md
(no conflicts; absorbed pigwsl quoting lesson).

## Exploration (decisions at 80%+)
- Pig load check first: 2.31 on 24 cores, repo at e48ef710, 103 dirty files.
  Decision: proceed, read-only, never touch the tree.
- Repo has no generators for most of the 16 named surfaces, but has the
  authorities that matter: object-level gate (builder/visibility), field-level
  gate (sitespec/field-visibility), and the ask concierge. Decision: compose the
  16 projections in the harness THROUGH those gates. The mission attacks "one
  graph, many surfaces", and the gates are the single choke point worth testing.
- Fixtures live in the sandbox, the repo lives on the Pig, harness must import
  repo TS: scp tarball to the Pig, run tsx from the repo's own node_modules.
  Decision: dynamic imports inside one async main() (avoids tsx CJS top-level-await issue).

## Smoke tests (20, 30 missions)
- Two harness false positives found and fixed with evidence before the full run:
  1. ask evidence refs are relationship ids too, not just object ids; the
     public-only check now validates relationship endpoints.
  2. hidden location titles are city names shared with public business objects;
     substring title matching was replaced with the injected-marker signal
     (the real leak test).
  3. Owner-intent layer check was vacuous when no intents existed; fixed to
     check labeling of present facts instead of presence of facts.
- Verified checks are live: LEAK/MISLABEL outcomes fired correctly on the
  false-positive versions before fixing.

## Full run
- ONE tsx invocation, missions 500-999: 500/500 lines, 0.3 s compute, 17 MB peak.
- Result: 116 PASS / 312 PASS_WITH_NOTES / 72 UNSUPPORTED / 0 failures /
  0 findings. No generic classes, no patches.

## After finishing (factory never idles)
- Shard 3 unclaimed (no shard-3 dir in missions/projection/; shard-0 in progress
  by another worker, no results to falsify yet). Taking shard 3 (missions
  1500-1999) with the same harness.
