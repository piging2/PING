# Oracle Release Gates: Five Failure Classes as One General Mechanism

Nolan's directive 2026-09-20: do not merely ledger FL-016/017/019/020/021. Where inexpensive and reliable, make the release gate catch their failure classes automatically. Prefer one general distribution/runtime certification mechanism over five special-case scripts. Repurpose existing test/certification infrastructure first. No new framework.

## The one mechanism

`~/workspace/laneC/release-certify.js` is already the ONE release-certification sequence. It orders:

0. sourceSha
1. snapshotManifest
2. distributionClosure (closure-certify.js)
3. runtimeDepsClosure (runtime-deps-closure.js)
4. arm64Compat (arm64-compat.js)
5. executableSmoke (gateway-smoke.js)
6. migrationTrigger
7. securityNegatives

This file is the mechanism. The five failure classes become extensions to its existing gates, not new scripts.

## Failure class mapping

### FL-016: native build dependency missing

What happened: `tree-sitter` native build failed on ARM64 because the Dockerfile lacked python, make, g++.

Existing coverage: `runtime-deps-closure.js` flags native modules (binding.gyp present) for the arm64 gate. `arm64-compat.js` enumerates native modules and checks node version compatibility.

Gap: no check that the Dockerfile actually installs build tools when native modules are present.

Minimal extension (inexpensive, reliable): in `arm64-compat.js`, when native modules are non-empty, verify the Dockerfile contains the build toolchain (python3, make, g++ or equivalent apk add). If absent, FAIL before the image build wastes a cycle. This reuses the existing native-module enumeration, no new script.

### FL-017: runtime module absent (physical_clock_adapter.js)

What happened: the Oracle image missed `infrastructure/physical_clock_adapter.js`, found only at runtime.

Existing coverage: `closure-certify.js` computes transitive local module dependencies from entrypoints and fails when a SOURCE-REACHABLE and RUNTIME-REQUIRED module is NOT DISTRIBUTED.

Gap: the file was not classified as REQUIRED_RUNTIME, so absence did not fail.

Minimal extension: add `infrastructure/physical_clock_adapter.js` (and any dynamically required runtime adapter) to the classification manifest as REQUIRED_RUNTIME, or declare via `--dynamic-targets` if reached via non-literal require. No new script, just classification data.

### FL-019: required manifest absent (GENERATION_MANIFEST.yaml)

What happened: image missed `GENERATION_MANIFEST.yaml`.

Same mechanism as FL-017: classify the manifest as REQUIRED_RUNTIME in the closure classification. If the snapshot lacks it, `closure-certify.js` FAILS. No new script.

### FL-020: required SQL/runtime asset absent (database/ SQL files)

What happened: image missed `database/` SQL files.

Same mechanism: classify `database/*.sql` as REQUIRED_RUNTIME. Snapshot manifest plus closure check fails when absent. No new script.

### FL-021: runtime DB representation assumption wrong (JSONB)

What happened: PostgreSQL JSONB payloads returned as objects, not strings; collision detection assumed strings and broke.

Existing coverage: `executableSmoke` (gateway-smoke.js) boots to a safe boundary, but did not exercise real PostgreSQL JSONB round-trip behavior.

Minimal extension: extend the smoke or P0 gate to run the collision path against a real PostgreSQL (or a faithful JSONB representation double) with both string and object payload forms. The existing `p0-lane1` P0 invariants are the right home, not a new framework. Fail when the comparison assumes one representation.

## What not to do

- Do not create five special-case check scripts
- Do not create a new certification framework
- Do not duplicate `release-certify.js` ordering logic
- Classification data changes (adding REQUIRED_RUNTIME rows) are data, not code, and are the cheapest reliable gate

## Status

Documented 2026-09-20 as the gate design. Implementation is the next engineering step in the convergence lane, following the fail-before discipline: reproduce each failure class against the existing gate, watch it pass when it should fail, then add the minimal classification or check, then watch it fail correctly.

This preserves Nolan's law: refactor authority, preserve mechanism, repurpose before building.
