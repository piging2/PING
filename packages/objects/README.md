# packages/objects — the object kernel

The minimum object contracts the website → evidence → objects pipeline
needs: typed objects with deterministic ids, typed relationships between
them, and evidence references on every record. Pure TypeScript, no
runtime dependencies except the already-harvested `packages/trust`
(pinned digest, imported by relative path).

## What the kernel owns

- **Schema** (`src/schema.ts`): field/type contracts (`string | string[] | url`,
  required flags), the three proof schemas (business, service, post), the
  `validateAgainstSchema` validator (field types never change; new fields
  optional), and relationship rules (`isAllowedPredicate` gates which
  predicates a schema may carry).
- **Object identity** (`src/identity.ts`): deterministic ids only.
  - `web:<kind>:<key>` — the proven website-derived naming contract.
  - `deriveObjectId(namespace, key)` — content-addressed `obj:<16 hex>`
    ids over the trust kernel's pinned `sha256-canonical-json-v1` digest.
    The input formulation is pinned in the module; the kernel invents no
    hasher. Same (namespace, key) → same id, byte for byte, forever.
- **Relationships** (`src/graph.ts`): the `ObjectGraph` record
  (`objects[]` + `relationships[]`) and typed edges
  (`PingRelationship`: subject / predicate / object / active|inactive).
- **Evidence references** (`src/object-types.ts` + `src/graph.ts` +
  `src/verify.ts`): every object carries `provenance.ref`, every
  relationship carries `evidenceRef`. `verifyPresentationBinding` /
  `resolveBoundField` implement the object field → claim → evidence ref
  hop: a `direct` factual binding resolves only when the object's
  provenance ref is non-empty; anything else fails closed (the caller
  omits the value, never guesses).
- **Verification** (`src/verify.ts`): `verifyObjectGraph` enforces the
  five-check contract (ids unique; schema registered; evidence refs
  present; relationship legality incl. public-endpoints-only; visibility
  public|private) and attests the graph with a trust-digest over its
  canonical bytes. Never writes; read-only.

## What the kernel does NOT own

- **Evidence storage** — references only; the evidence itself lives
  behind the refs (trust kernel digests, event kernel journal).
- **Projection** — ObjectView / media views / capability lists are read
  models over these records, not these records.
- **Rendering** — component eligibility and the component registry were
  deliberately not harvested (FYD renderer concern).
- **Capabilities/actions** — `capabilityOptions` and the action planner
  belong to the capability kernel.
- **Owner state** — corrections, overrides, and owner assertions are the
  owner/proposal layer; `PingObject` carries no owner fields.
- **Acquisition** — website → evidence ingestion (crawling, parsing)
  feeds the kernel but lives outside it.

## Proofs served

- Proof 1 (schema): `src/schema.ts` — field/type contracts + validator.
- Proof 2 (object identity): `src/identity.ts` — deterministic ids via
  the trust digest; no invented hasher.
- Proof 3 (relationships): `src/graph.ts` + `src/object-types.ts` —
  typed edges; `src/verify.ts` relationship-legality check.
- Proof 4 (evidence references): `provenance.ref` / `evidenceRef`
  required by `verifyObjectGraph`; the binding verifier's field →
  evidence-ref hop.

## Sources

Harvested read-only from `ping-fyd-converged` (SHA 32f8347); see
`harvest-manifest.json` for per-file SOURCE_PATH / TARGET_PATH /
proof_ids. Rejected candidates are recorded there too.
