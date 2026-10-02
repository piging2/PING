# Generator determinism

## Decision (2026-09-19, operator's agent)

Byte equivalence of a generated artifact means equivalence of its STABLE
payload. Volatile provenance metadata (`generatedAt`) is intentionally
nondeterministic, classified separately, and excluded from canonical
comparison/hashing. Full-byte reproducibility including `generatedAt` would
be a separate schema decision (freeze or remove the field) and is not this
patch. Rationale: PING's determinism law requires intentional nondeterminism
to be explicit and kept outside deterministic constitutional outputs;
`generatedAt` is volatile provenance metadata, not payload.

## Invariant

Every generator resolves its artifact paths module-relative through
`artifact_paths.js` (`__dirname`), with no CWD or environment dependence.
`stable_payload.js` is the minimal shared canonical-comparison helper: it
strips exactly the top-level `generatedAt` key before comparison.

## Proof method

Run each generator from `/`, the generator directory, and an unrelated temp
dir against copied fixtures. The stable payload must exactly match the
tracked artifact; only `generatedAt` may vary. No tracked artifact is
rewritten by proof runs. Generators whose inputs reference secondary files
by absolute scan paths are proven CWD-independent against synthetic
fixtures instead, since their tracked outputs encode the original scan
filesystem.
