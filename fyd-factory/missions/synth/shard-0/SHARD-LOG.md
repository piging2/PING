# SYNTH-SHARD-0 log

## Decisions at 80%+

- Grounded the harness in the actual repo semantics instead of inventing a loop: read owner-overlay.ts, source-refresh.ts, corrections.ts, visibility-policy.ts, facts.ts (factIdFor), owner-context seam. The four failure classes are ports of real code behavior, not strawmen.
- Modeled the reference implementation faithfully INCLUDING its sharp edges (predicate first-match, factId-anchored hide, asymmetric drift compare) so the adversarial probes test the design, not my generosity.
- One harness, run twice (reference + PATCHED). PATCHED ports the exact patch logic so the rerun measures the proposed fix, not a different implementation.
- Patches validated with git apply --check against a pristine mirror of the actual repo files at HEAD e48ef710 (extracted via wsl-run.sh). Repo never touched.
- Probe-design fix mid-run (harness v2): the whitespace-drift probe initially wrapped an already-changed value, making the "spurious" check vacuous. Fixed so the probe re-emits the same semantic value with different whitespace only; reran both modes from scratch. Old runs discarded.
- Residual 2-mission class (identity-churn + visibility-flip single-candidate eid mismatch) logged as follow-up, not patched: 2 < 3 is not generic per protocol, and the proper fix needs a record change in corrections.ts (stable target key), which is beyond the minimal one-path patches.

## Timeline

- 20:25 session start; read MISSION-PROTOCOL.md; checked missions/synth (did not exist; created shard-0).
- Saturation check: Pig load 2.44 avg on 24 cores via wsl-run.sh; no wait needed.
- Grounded reads of repo owner machinery (read-only via wsl-run.sh).
- Built work/harness.ts (mulberry32 world contract per protocol: TYPES/DIMS/HOSTILES/owner_intent mapping, unique 555-01XX phones, synthetic+testing_only markers).
- Ran shard 0 reference: 463/500 survived in ~0.7s. Four generic classes identified.
- Minimized repros -> 4 fixtures in missions/fixtures/.
- Authored 3 patches (edit + diff against pristine mirror) -> missions/patches/; git apply --check clean x3.
- Reran PATCHED: 498/500. Fixed harness probe-design flaw, reran both modes: 463/500 reference, 498/500 patched.
- Falsification: work/falsify.ts, 20 adversarial probes, 20/20 pass.
- Wrote SUMMARY.md; this log.

## After finishing (never idle)

- Checked missions/synth/ for existing shard dirs: only shard-0 (mine). Shard 1 (indices 500-999) unclaimed -> taking it next with the same harness (FYD_SHARD=1), both modes.

## Files

- results.jsonl, results-patched.jsonl: per-mission records (500 lines each).
- work/harness.ts: the single shard harness (deterministic; rerunnable).
- work/falsify.ts: 20 adversarial probes against the fix logic.
- work/*.sh, work/run*.log: grounding reads and run logs.
- ../fixtures/synth-shard0-*.json (4): minimal repros.
- ../../patches/synth-shard0-*.patch (3): checked patches.
- ../work-0/patchcheck: pristine git mirror used for git apply --check.
