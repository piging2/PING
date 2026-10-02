# Determinism Probe Contract (Substrate)

Shared contract for every determinism probe in the burn. Two per-lane
probes implemented the same pattern independently; this document is the
single authority for what a probe must do.

## Harvest sources (pattern catalog)

### A. `fyd-lane/check-stable.py` (projection byte-stability)

- Volatile fields: `meta.dumpedAt`, overwritten post-load with the literal
  `"NORMALIZED"` before encoding.
- Normalization strategy: **output-side masking** (strategy A below).
- Canonical encoding: `json.dumps(d, sort_keys=True, separators=(",", ":"))`
  encoded to UTF-8. Key order is canonicalized, not treated as volatile.
- Two-run procedure: one process, two sequential subprocess invocations of
  the dump generator; each run rewrites the same on-disk projection file;
  both outputs are loaded, normalized, encoded, and SHA-256 compared.
- Exit codes: `0` + `BYTE_STABLE` on identical digests, `1` + `NOT_STABLE`
  otherwise. Prints 16-hex-char digest prefixes as `run1`/`run2`.
- Portability defect (fixed 2026-09-27): Pig paths were hardcoded defaults
  (generator `/home/nolan/ping/tools/fyd-site-projection/dump.py`,
  projection `/home/nolan/ping/var/fyd-projections/coppersmith-plumbing.json`,
  tenant `coppersmith-plumbing`, env `FYD_OVERLAY_JOURNAL=demo`), so the
  probe could not run anywhere else. It is now parameterized; Pig paths
  survive only as explicit overrides.

### B. `fyd-lane/repo/determinism-probe.ts` (semantic render model)

- Volatile fields: **none masked in the probe**. Normalization strategy:
  **input-side pinning** (strategy B below): the harness
  (`repo/render-model.test.ts`) generates the spec once with a fixed
  timestamp (`FIXED_GENERATED_AT`, passed as `generatedAt` and `asOf`),
  so no wall-clock value ever enters the render path.
- Canonical encoding: `canonicalizeModel(model)` from `repo/render-model`,
  which carries `RENDER_MODEL_VERSION`.
- Two-run procedure: two separate OS processes (`tsx determinism-probe.ts
  <input.json> <output.txt>`), fresh module state each time; the harness
  reads both output files and byte-compares them.
- Exit codes: the probe itself exits `0` after writing canonical bytes
  (silent stdout) and `1` with an stderr diagnostic on usage, input-JSON,
  read, or write errors. The STABLE/NOT_STABLE verdict lives in the jest
  test, not the probe exit code.
- Documented instability classes the probe catches: `Date.now()`,
  `Math.random()`, module counters, unstable ordering, process-dependent
  ids (per the test-file header comment).

## The contract

A conformant determinism probe implements all five clauses.

### 1. Volatile-field normalization (one of two strategies)

- **Strategy A, output-side masking:** after each run, overwrite every
  declared volatile path (dotted object path, e.g. `meta.dumpedAt`) with
  a fixed sentinel (conventionally `"NORMALIZED"`) before canonical
  encoding. Declaring a volatile that is absent from the output is a
  probe error (schema change), not a pass.
- **Strategy B, input-side pinning:** supply fixed timestamps, seeds, and
  ids to the generator so no wall-clock or random value enters the
  computation; then canonicalize the model encoding.
- A probe must document which strategy it uses. Mixing is allowed if
  documented per field.

### 2. Canonical byte encoding

Byte identity, never semantic equality. Serialization must be
deterministic: sorted keys, fixed separators, UTF-8, and (for model
probes) a versioned canonical form. Two runs that differ only in key
order must compare equal.

### 3. Two-run procedure

Two fresh executions with identical inputs. The python-style probe runs
the generator as a subprocess twice; the TS-style probe spawns two
separate OS processes. Separate processes catch module-counter,
process-dependent-id, and random-seed leaks that an in-process double
call would miss.

### 4. Exit-code semantics

| Code | Meaning | Output |
|------|---------|--------|
| 0 | BYTE_STABLE: normalized canonical bytes identical | `run1 <digest>`, `run2 <digest>`, `BYTE_STABLE` |
| 1 | NOT_STABLE: bytes differ after normalization | same digest lines, `NOT_STABLE`, plus a named divergence (first differing byte offset and the divergent top-level keys) |
| 2 | probe/config error: generator failed, projection missing or unparsable, declared volatile absent, bad args | stderr diagnostic; never a stability verdict |

Usage and configuration errors must never masquerade as stability
verdicts. Exit 2 is the probe saying "I could not measure", exit 1 is
the probe saying "I measured instability".

### 5. Portability

No hardcoded environment paths in the default path. Host-specific paths
(Pig, dev-machine, CI) are explicit overrides only: CLI args or
environment variables with no host-specific defaults.

## Conformant implementations

- `fyd-lane/check-stable.py`: parameterized (projection path, generator
  command, volatile fields, generator env); Pig invocation documented in
  its docstring as an explicit override.
- `fyd-lane/repo/determinism-probe.ts` + `repo/render-model.test.ts`:
  input-side pinning with two-process byte-compare; verdict in jest.

## Falsification

See `fixtures/gen-projection.py` and the Gap-8 ledger
(`substrate-gap8-determinism-2026-09-27.md`): the parameterized probe
returns 0 on a known-stable scratch projection, 0 when a declared
volatile is flipped to a constant, and 1 naming the divergence when an
undeclared timestamp leak is injected.
