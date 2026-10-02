# @piging2/owner

Owner corrections as append-only assertions (CONFIRM / CORRECT / HIDE),
the owner identity seam, and the effective-visibility rule. Proof 6.

## The model

- **Assertion algebra** (`src/corrections.ts`): an owner correction is a
  stored `OwnerAssertion` - op, target fact (objectId + field + index),
  owner value (CORRECT), provenance (owner, timestamp, supersedes), and
  the source value seen at assertion time. Assertions are append-only;
  only supersedes chain heads apply. `applyCorrections(graph,
  assertions)` projects them over a freshly extracted graph:
  regeneration preserves owner intent by construction, and a source that
  changed an asserted field surfaces a `CorrectionConflict` (both values
  carried, the owner's value stays applied). HIDE never changes a value;
  it lands in `hiddenFactIds` for the visibility layer.
- **Verifier wire**: a CORRECT projection attaches the SiteSpec
  read-seam record (`ownerFieldCorrections`) to the projected object, so
  the corrected graph passes the binding verifier's owner-assertion
  lane: the assertion is itself evidence (kind `"owner-assertion"`,
  ref to the assertion id).
- **Identity seam** (`src/identity.ts`): `OwnerIdentityProvider` with a
  demo default that resolves to `DEMO_OWNER_CONTEXT` - `verified` is the
  literal type `false`, so the demo context is structurally incapable of
  passing a `verified: true` check (compile-time error + runtime
  refusal via `requireVerifiedOwner`). Production binds a real provider
  via `bindIdentityProvider()`. Nothing here is auth; the demo proves
  nothing.
- **Visibility** (`src/visibility.ts`): `effectiveVisibility()` resolves
  one field from four inputs - source visibility / system default /
  owner override / effective visibility (owner override > source floor >
  system default). `projectPublicGraph` drops hidden facts from a graph
  copy; hidden facts are absent from the public projection, never
  redacted in place.

## Rules

- Pure, deterministic, browser-safe. No I/O, no clock (injectable),
  zero runtime dependencies.
- Harvested ADAPT from ping-fyd-converged @ 32f8347
  `src/fyd/owner-mode/` (corrections, provenance, facts, owner-identity,
  visibility-policy). Semantics preserved; sha256/canonicalization reuse
  the trust kernel.
- Demo honesty: `DEMO_OWNER_LABEL` / `DEMO_OWNER_CONTEXT` are explicit
  non-identities. They can never authorize.
