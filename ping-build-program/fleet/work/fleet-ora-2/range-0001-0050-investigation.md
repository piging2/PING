# Range 0001-0050 investigation (fleet-ora-2, 2026-09-23/24 UTC)

## Mission family
All 50 missions (ORA-0001..ORA-0050) are family `reproducibility`:
"Reproducible build: component-N — digest-stable artifact from pinned sources"
Pass criterion: two independent builds of component-N produce identical sha256.

## Evidence of synthetic placeholder
1. Matrix generator source `fleet/gen_matrices.py` line 57:
   `add_ora("reproducibility", 200, [f"component-{i}" for i in range(20)], ...)`
   The items are f-string placeholders `component-0`..`component-19` repeated 10x. No mapping to real
   buildable artifacts exists in the generator.

2. Oracle host (129.146.60.17) read-only probe, `~/p18-oracle-staging`:
   - Staging contents: build-arm64*.log, p18-probe.js, source/ (tar.gz sources + ping-converged tree).
   - `grep -ril "component-0"` across ping-converged (json/yaml/md/sh/js): **zero hits**.
   - Production `/opt/ping`: backups, config, database, gateway, infrastructure, package.json, ping-runtime, releases.
     No `component-N` directory, lockfile entry, or build definition anywhere.

3. No Dockerfile/build target/digest lockfile references `component-N` (searched the staging tree).

## Conclusion
There is no pinned source for any component-N. A "rebuild" is unexecutable: the pass criterion cannot
be evaluated because its subject does not exist. Baseline untouched (read-only SSH probes only; no builds
attempted on the Oracle host, which is correct since the baseline is sacred and the mission premise fails).

## Verdict
N-A with justification, all 50 missions. The honest repair is to regenerate the reproducibility family with
the REAL component list (e.g., the 15 ORA_IMGS images or the ORA_SVCS services) and re-issue; see followup.
Recommending fleet coordinator (parent) treat the `component-{i}` placeholder grid as a matrix-generation
defect, not a component defect.

## Cost avoided
Running 50 no-op rebuild loops against a nonexistent subject would have burned agent cycles and, worse,
would have risked someone executing real docker builds on the Oracle host. Flagged before any work started.
