# Schemas as found in PING (read-only extraction, 2026-09-23)

Source: `/home/nolan/projects/ping` (Pig, WSL `/home/nolan/projects/ping`), copied read-only via pigwsl-exec.
Full verbatim copy: `sitespec-schemas.ts.VERBATIM` (366 lines, SHA of source not needed; file is byte-complete per wc -l match).
Component-registry excerpt (the second schema->component mapping): `registry-excerpt.ts.VERBATIM`.

## What exists

`src/fyd/sitespec/schemas.ts` defines exactly three schema definitions:

| Schema id | Label | Fields | Relationships | identityBacked | likeable |
|---|---|---|---|---|---|
| `ping.social.business@1` | Business | title*, description*, category, website(url), phone, email, hours, socials(string[]) | provides -> service/product; publishes -> post/article; located_at -> location; employs -> person | true | false |
| `ping.social.service@1` | Service | title*, description*, price_hint, duration | provided_by -> business | false | true |
| `ping.social.post@1` | Post | title*, text, date, tags(string[]), url(url) | published_by -> business; replies_to -> post | false | true |

`*` = required. Field type vocabulary: `FYDFieldType = "string" | "string[]" | "url"` (three types only).

Definition shape (`FYDSchemaDef`): id, label, summary, fields[{name,type,required,label,meaning}], relationships[{predicate,targetSchemas,meaning}], identityBacked, likeable. Plus an evolution law in comments: new fields optional, never change a field type, never remove; breaking changes mint a new version.

## Five derivations in the file, ONE wired

1. `validateAgainstSchema` — findings-shaped validator (error/warning/info). Tested in `__tests__/schemas.test.ts`. NOT called anywhere in the ingestion/proceduralize pipeline (grep: zero consumers outside tests).
2. `eligibleComponents` — reads the hand-written `SCHEMA_COMPONENTS` table keyed by schema id, with `schemaRole()` fallback projecting `ping.knowledge.*` onto the proof vocabulary. WIRED: `src/fyd/proceduralize/generator.ts`, `src/fyd/sitespec/validator.ts`.
3. `relationshipRules` / `isAllowedPredicate` — tested, zero production consumers.
4. `capabilityOptions` — tested, zero production consumers (mirrors `src/lib/ping/action-planner.ts` rules by hand, not by import).
5. `agentToolDescription` — tested, zero production consumers.

## Honest gaps found during extraction

- `SCHEMA_COMPONENTS` is NOT derived from the `FYDSchemaDef` records; it is a separate hand-written table keyed by schema id. The "one definition" claim in the file header is overstated: eligibility metadata lives beside the definition, not inside it.
- A SECOND schema->component mapping exists in `src/fyd/components/registry.ts` (`DEFINITIONS[].acceptsSchemas`, consumed via `componentForSchema()`). The registry header claims "the registry is the only place that maps schema -> component". Both cannot be the only place. Drift risk: real, flagged for lane DUP / coordinator.
- The PING object envelope (`PingObject` in `src/lib/ping/types.ts`) carries `fields: Record<string, string | string[]>` — the schema definitions do NOT constrain real ingestion output; `validateAgainstSchema` never runs on it. Proceduralizer emits arbitrary derived fields (e.g. `locality` as DERIVED_FACT).
- No zod / ajv / prisma / drizzle / superstruct in direct dependencies. `ajv` and `zod` appear in `package-lock.json` only as transitive deps (via @fedify/fedify and friends). No existing validation/codegen machinery to reuse; the custom `FYDSchemaDef` chain is the incumbent.
- Expressiveness ceiling: no number, boolean, date, enum, nested object, or union types. Real PING interfaces that cannot be expressed: `Company.address{city,region,country}`, `Company.owners[]`, `Company.proof{}`, `Review.rating: number`, `Project.completedAt: string (ISO)`, `OwnerAssertion.value: unknown`.
- `PingPost` (`src/lib/ping/types.ts`) is a separate hand-written interface for posts (feed-rank etc.) — a third, hand-maintained shape for the Post concept, not generated from POST_SCHEMA.
