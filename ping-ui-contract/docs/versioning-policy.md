# Versioning assessment: PING UI projection schemas

Date: 2026-09-17. Basis: the 17 JSON schemas, index.mjs, ADR section 0 resolution 3 (contract-change approval) and ADR section 10 open question 7 (contract versioning policy: PARTIAL; packages/schemas versions independently; breaking changes require explicit operator review; semver policy itself is DIRECTION). No em dashes are used in this document.

## Current state

- All 17 schemas declare `"$schema": "http://json-schema.org/draft-07/schema#"` and `"$id": "https://ping.social/schemas/<name>.json"`. Draft version is consistent across the package.
- Every schema except envelope.json composes the envelope under a
  `_envelope` property via `$ref: "envelope.json"` (resolved 2026-09-17; see
  resolution note below). The `$ref` is a relative reference that resolves
  against the `$id` base to `https://ping.social/schemas/envelope.json`.
  `$ref` usage is consistent: one relative ref per schema, always the
  envelope, always under `_envelope`, always required.
- There is no per-schema version marker (no schema_version field, no version segment in $id). packages/schemas currently versions only as an npm package, per the ADR.

## Recommended backward-compatible additive rules

Adopt these as the standing contract-change rules until the semver policy moves past DIRECTION. All are additive-only; any change outside this list is breaking and triggers ADR section 0 resolution 3 (explicit operator review by Nolan):

1. **Add optional properties.** New fields must be optional (not in `required`) and must not change the meaning of existing fields.
2. **Add enum values.** New enum members are additive. Never remove or rename an enum value; never narrow a type (string to integer, number to integer with new constraints).
3. **Add new schemas.** New projection schemas are additive by definition, provided they do not claim authority already owned by an existing schema's authority source (see duplicates.md verdict).
4. **Loosen validation, never tighten.** Removing a `required` entry or widening a type is a candidate additive change only if every existing producer and consumer is audited; treat as review-required rather than automatically safe.
5. **Descriptions are documentation, not contract.** Rewording a description is non-breaking only if it does not change the normative meaning (requiredness, authority claims, maturity assertions). Description changes that alter normative meaning follow the breaking path.
6. **Keep $id stable for additive changes.** The canonical `$id` URL does not change when fields are added; consumers pinning the $id keep working.
7. **Helpers and schemas move together.** index.mjs `validate()` enforces only the load-bearing subset (required fields, maturity vocabulary). Any JSON schema change must be mirrored by a contract test that runs `getSchema()` plus `validate()` against a fixture, so the two enforcement layers cannot drift.

## When a v2 is justified

A v2 of an individual schema (new `$id` such as `https://ping.social/schemas/<name>.v2.json`, old schema retained) is justified only for breaking changes:

- Removing or renaming a required field.
- Changing a field's type or its semantic meaning (e.g. `progress` from unbounded number to 0-1 fraction).
- Removing an enum value or narrowing a type.
- Changing the envelope composition (e.g. replacing the envelope allOf with a different metadata model), because every schema inherits it.
- Splitting one schema into two or merging two schemas, since identity fields and authority sources change.
- Resolving the envelope placement divergence (top-level maturity/source vs `_envelope`) if the resolution moves the canonical location: that changes what a valid document looks like and is breaking for whichever producers/consumers followed the other placement.

v2 is NOT justified for: adding optional fields, adding enum values, adding descriptions or evidence_ref text, adding new schemas, or publishing the same contract to a new host.

## Does any current schema already need a v2?

**No.** Reasoning per schema:

- All 17 are at CONTRACT_DEFINED or IMPLEMENTED stage; none is WIRED or DEPLOYED against a live gateway from this host, so there is no production consumer to break. The honest moment to lock versioning is before the first WIRED surface, not now.
- The envelope placement divergence (schema-audit.md finding 1) is the one issue that would justify a v2 when it is resolved, because it changes document shape. Recommendation: resolve the placement as part of the same review that approves the first WIRED surface, and cut v2 $ids then if the resolution is breaking for early adopters. Do not cut v2 now for a contract with no live consumers; it would create version theater.
- run.json needs no v2: its UNPROVEN/gap-labeled status is expressed in-band via maturity and description, which is exactly what the envelope vocabulary is for. When runtime instrumentation lands, run instances become populatable without any schema change; the maturity value on the envelope moves from UNPROVEN upward, which is a data change, not a contract change.

## $id and $ref notes

- The `https://ping.social/schemas/...` $id values are fine as canonical identifiers; they do not need to be dereferenceable today, but if they ever serve real schema documents, serve the exact versioned file at each URL or the $id becomes a lie.
- `$ref` usage is consistent (relative "envelope.json" in allOf, envelope excluded from self-reference). One risk: relative refs resolve correctly only if tooling honors the `$id` base. If schemas are ever bundled or served from a different base, switch to absolute `$ref` values (`https://ping.social/schemas/envelope.json`) to remove base-dependence.
- index.mjs `loadSchema`/`getSchema` reads files by name and does not resolve `$ref`s; any future tooling that validates full documents against these JSON schemas (e.g. ajv) must be configured with the envelope ref resolvable, or required maturity/source will fail on documents built by `withEnvelope` (which nests them under `_envelope`). This is the same divergence as finding 1, stated from the tooling side.

## Resolution note (2026-09-17)

The envelope placement divergence flagged in the schema audit (finding 1) was
resolved the same day: all 16 non-envelope schemas now compose the envelope
under `_envelope` via `$ref` to envelope.json, matching the runtime helpers
(`withEnvelope` writes and `validate()` checks `_envelope`). Because no
surface is WIRED or DEPLOYED against a live gateway, there is no production
consumer to break, so no v2 was required. A contract test now asserts the
canonical placement for every schema. Optional `generated_at` was added to
envelope.json as the one approved additive field (projection build time,
distinct from `verified_at`).
