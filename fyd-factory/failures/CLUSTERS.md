# FYD FACTORY FAILURE CLUSTERS

Membership counts count corpus entries (FC-001..FC-036 in FAILURE-CORPUS.md). Some entries appear in two clusters where the mechanism overlaps; this is noted per cluster.

## Cluster A: silent-empty / false-green (6 members)

The system reports a healthy or successful outcome while nothing (or the wrong thing) happened.

- FC-015: extractGraph silently returned zero nodes for flatten() array output.
- FC-018: nodesVisited recounted from filtered entities (two definitions of one stat).
- FC-020 (part): the gateway smoke test passed without a DB present, so the failing migration never executed in smoke.
- FC-023: the probe queried event_id='fetch' and five rounds of failure were misattributed to Pig unreachability.
- FC-033(b) (part): "45 passing" was claimed while the preset validation error made 11 suites fail to load; the contradiction was hidden.
- FC-036 (part): 76 intents were counted and marked EXECUTION before dispatch; zero browser actions ever ran.

Generic shape: zero-cardinality results and unexecuted code are not asserted. The invariant that deletes the cluster: assert expected cardinality when a stage succeeds (a successful expansion with zero nodes is a failure), and never count what has not executed.

## Cluster B: claim without evidence / dishonest provenance (6 members)

A claim reaches the visitor or owner with a stronger or different source story than the data supports.

- FC-006: ClaimBadge stamped everything "Website statement"; overlay-authored content had no provenance kind.
- FC-010: Ask FYD answered with plausible filler and refusal:false for unanswerable questions; evidence classes never reached the visitor.
- FC-019: Offer objects classified as claims, inflating claim counts and naming offers as services.
- FC-025: dangling evidence_refs render as citations with no existence check (OPEN).
- FC-012 (residue): fixture-derived service lists presented alongside the PING-backed list as equally true (OPEN).
- GEN-CONSTRAINT (corpus note): structured generation with deterministic claim-binding validation for Ask FYD, still IN_PROGRESS.

Generic shape: the presentation layer assigns or upgrades labels. The invariant that deletes the cluster: every rendered claim carries its evidence class from the write path (canonical-journal -> DIRECT_FACT, website-derived -> website_statement, owner -> owner_authorship, overlay -> DEMO_SYNTHETIC); the presentation sink cannot invent or upgrade a label. This is also TD-009's repair.

## Cluster C: unvalidated data crosses a boundary (6 members)

Hostile, private, or malformed data crosses a trust boundary without a gate.

- FC-002: javascript: URLs interpolated verbatim into href.
- FC-026: hidden owner fields (phone/address) may leak through Ask FYD to public viewers (OPEN).
- FC-001: ping.social.external_identity@1 crosses the generator -> validator boundary and fails the whole site.
- FC-008: preview/stale/hand-written manifests accepted as production truth on the read path.
- FC-009: corrupt/missing/tampered projection crossed the route boundary and escaped as empty 500.
- FC-031: an unimplemented verification method is a named gap with no typed outcome pinned (OPEN, known).

Generic shape: no typed gate at the boundary. The invariant that deletes the cluster: one boundary resolver per data kind (URL resolver, manifest validator, schema gate, privacy gate, journal-marker guard) applied at every crossing, with hostile fixtures in the test matrix (javascript: URLs, preview manifests, dangling refs, tampered digests).

## Cluster D: stale state, no versioning (3 members)

Evidence outlives the snapshot it was built on, or the snapshot silently degrades.

- FC-028: superseded evidence bound without stale-mark; answers not versioned against the graph snapshot (OPEN, FYD-013 + FYD-024).
- FC-032: regen fixtures silently degraded (2 objects vs 9) and 6 tests fail with no triage owner (OPEN).
- FC-029: real captures yield zero Service/Offer objects; synthetic tests miss the real shape (OPEN).

Generic shape: snapshots and regenerations have no provenance or freshness check. The invariant that deletes the cluster: every derived artifact carries its source snapshot id and version; regen asserts output cardinality against the committed baseline (a regen that emits 2 objects where 9 are committed is a failure, not a quieter site); answers are stale-marked when the snapshot advances.

## Cluster E: two definitions of one thing (3 members)

Two code paths define the same concept differently.

- FC-012: ObjectView/CircleProjection read fixture graphs; Ask FYD/pages read the PING projection (residue OPEN).
- FC-014: has_address vs located_at for the same address link.
- FC-018: nodesVisited as "unique expanded nodes" vs "post-filter entity count".

Generic shape: parallel vocabularies with no single owner. The invariant that deletes the cluster: one canonical read model and one vocabulary per fact kind (Rule of One); fixtures are an explicit FIXTURE class, never a live read path; stats accumulate from the stage that owns them.

## Cluster F: non-durable acknowledgment / silent retry (4 members)

Work is acknowledged or retried without evidence it completed.

- FC-021: the sequence migration failure retried silently forever (only every 10th attempt logged); no FAILED_MIGRATION state (OPEN).
- FC-020 (part): recovery loop semantics assumed; first runtime execution of the refactor was the Oracle deploy.
- FC-035: a standby transition killed 44/11 likes mid-pass with no lock and no wake ownership; the failures were FAILED, not unknown, but only because the targets were checked (proof pending).
- FC-036 (part): intents marked EXECUTION with no OBSERVATION were correctly refused as UNKNOWN_EXECUTION by the run_pass guard (the guard is the good example here).

Generic shape: retry without bound, ack without observation. The invariant that deletes the cluster: every retry loop has a terminal FAILED state with a typed reason; every ack requires an observation; the run_pass refuse-step pattern (refuse UNKNOWN_EXECUTION) is the reference implementation.

## Cluster G: stale assumptions about library signatures (7 members)

Code written against a remembered API; the library disagrees.

- FC-016: jsonld.flatten(doc, {documentLoader}) put options in the context position.
- FC-015: flatten() returns an array, extractGraph() assumed an object.
- FC-022: process.versions.http_parser is undefined on Node >= 20.
- FC-033 (a,b,c): unrs-resolver native binding absent; jest 30 preset resolution; plain jest has no TS transform.
- FC-011: pg BIGINT arrives as a string, readers assumed number.
- FC-017: context-less JSON-LD assumed to self-describe.

Generic shape: the library's actual behavior was never probed. The invariant that deletes the cluster: probe the real return shape with a one-node test before wiring a pipeline stage (the FC-015 probe pattern), and pin argument positions with tests when a signature is from memory.

## Cluster H: missing fail-closed guards (5 members)

A dangerous operation has no guard; the failure is silent continuation.

- FC-027: no wrong-journal fail-closed guard (OPEN).
- FC-025: no dangling-ref fail-closed check (OPEN).
- FC-024: FYD_SITE_OVERLAY assumed registered; the 8080 gateway rejected it (repo registered, 8080 deployment OPEN).
- FC-034: scheduler service unbuildable in the Oracle compose file (OPEN).
- FC-035: no browser lock before the fix; two workers on one profile.

Generic shape: the guard is designed late or never. The invariant that deletes the cluster: guard -> typed failure -> zero side effects, proven by a test that asserts the journal/table/browser is untouched after the failed attempt (TD-004's acceptance pattern).

## Cluster I: operator/procedural failures (8 members, not tournament material)

Process repairs, not product defects. Included so the corpus is honest about where the failure lived.

- FC-036: intents pre-written before run_pass.sh (fixed by rule: run_pass.sh owns the full lifecycle).
- Sprint-001: `git add <mine> && git commit` swept Lane B's staged files into Lane A's commit (fixed by pre-commit `git diff --cached --stat` check).
- FL-20260921-012: worker acted on the sandbox PING when Nolan asked about the Pig PING (scope-breach rule: sandbox paths are never Pig paths; every Pig file action is verified through the Pig).
- /tmp wipes mid-run (2026-09-22 lesson): irreplaceable work lives under ~/workspace, never /tmp.
- scp vs pigwsl-put.sh: base64-chunk transfer stalls on multi-MB files; scp + sha256 compare is the fast path.
- The 375px screenshot false alarm (FC-003 note): a dirty-worktree WIP artifact was briefly read as a committed defect; the screenshot pipeline is proof, not inference.
- Pool-seeds + unfollow 14-hour gap: an unfollow worker ran on stale (possibly post-suspend) state.
- FL-20260921-214/215/216: portal-circle capture arg style, missing playwright libs, wrong source URL (minor process issues).

## Top 3 generic repairs by leverage

Ranked by how many distinct corpus defects one invariant deletes.

1. **Fail closed with typed states (guard -> typed failure -> zero side effects).** Deletes or repairs: FC-021, FC-025, FC-027, FC-031, FC-035, FC-024, FC-034, and is the acceptance pattern of TD-002 through TD-007. One guard pattern repeated at every dangerous boundary replaces eight bespoke failure modes.

2. **Evidence-bound claims (every claim carries its evidence class from the write path; the sink cannot invent or upgrade a label).** Deletes or repairs: FC-006, FC-010, FC-019, FC-025, FC-012 residue, GEN-CONSTRAINT. Covers Cluster B entirely and is the repair behind TD-009.

3. **Honest-unknown multi-vantage probes plus zero-cardinality assertions (distinguish UNREACHABLE/UNKNOWN from FAILED; a successful stage that yields zero is a failure).** Deletes or repairs: FC-015, FC-018, FC-023, FC-020 (smoke without DB), FC-033(b), FC-032 (regen cardinality), FC-029 (zero Service/Offer objects as an asserted failure). Covers Cluster A and the D-cluster cardinality cases.

Honorable mentions: the single read model (deletes Cluster E, TD-006); the safe-URL boundary resolver (FC-002, TD-008); the migration-vs-trigger compatibility check (FC-021's missing gate).
