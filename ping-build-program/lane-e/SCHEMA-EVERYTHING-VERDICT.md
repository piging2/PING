# SCHEMA → EVERYTHING: VERDICT (lane E, 2026-09-23)

**Verdict: STOP on schema→EVERYTHING. Schema→MOST is real; schema→EVERYTHING is a trap. Do NOT build a meta-framework.**

## The score

From one canonical definition (`spike/schemas.canonical.json`, extracted verbatim from PING's `src/fyd/sitespec/schemas.ts`), nine targets generated and self-tested by `spike/run.js`:

| # | Target | Score | One-line evidence |
|---|---|---|---|
| 1 | validator | PROVEN | Generated validator matches PING's `validateAgainstSchema` semantics; self-tested on 5 cases |
| 2 | TypeScript type | PROVEN | Generated `Business`/`Service`/`Post` interfaces; total deterministic field-type map |
| 3 | object editor | PARTIAL | Flat CRUD spec generates; nested objects, dual-value owner corrections, conditionals, custom widgets inexpressible |
| 4 | component eligibility | PROVEN | Eligibility lists + role projection + unknown-schema fallback; same shape as wired `eligibleComponents()` |
| 5 | relationship eligibility | PARTIAL | Predicate allow-lists proven; cardinality/required/inverse not expressible |
| 6 | search fields | PROVEN | Text-indexable field lists derive mechanically |
| 7 | agent tool description | PROVEN | Deterministic text; same semantics as PING's hand-written version |
| 8 | connector normalization target | PARTIAL | JSON-Schema mapping contract generates; must stay advisory or it breaks evidence-first ingestion |
| 9 | protocol projection hints | PARTIAL | Carried as declared metadata; not derivable from field shapes |

5/9 PROVEN is a bare majority, not a clear majority, and the failures concentrate on the claims that make "everything" valuable: the editor and the relationship governance. The task's bar ("clear majority PROVEN with no contortion") is not met.

## Exactly where it breaks

1. **The vocabulary ceiling.** `FYDFieldType = string | string[] | url`. Six real PING requirements are inexpressible: `Review.rating` (number 1-5), `Project.completedAt` (date-time), `Company.address` (nested object), `Company.owners` (array of objects), `OwnerAssertion.value` (unknown), `EstimateQuestion.next` (conditional branching). Any expansion of the vocabulary (number, boolean, date, nested, enum, union) is a schema-language design project, which is the meta-framework trap wearing a trench coat. Proof: `spike/out/expressiveness-ceiling.json`.
2. **The editor needs a second layer, always.** The ecosystem harvest (`SCHEMA-UI-HARVEST.md`) tested this headless: JSON Forms' `generateDefaultUISchema` turns a pure schema into a flat VerticalLayout of Controls; every real UI (layout, conditionals, custom widgets) lives in the parallel uischema. rjsf, Payload, Sanity, Keystone all converge on the same architecture: semantic schema + UI-adjacent config. A "generated object editor" from the semantic definition alone produces CRUD toys; the moment it must render `OwnerFieldCorrection`'s SOURCE SAYS X / OWNER SAYS Y dual value, it collapses into customer code. Proof: `spike/out/editor-redteam.md`.
3. **Declared is not derived.** Component lists, protocol hints, and relationship target schemas are declarations that happen to live in the definition file. Pretending they are "generated from the schema" is how a definition file quietly becomes a framework config file. The spike labels these honestly (`declared` block in the canonical JSON); any expansion must keep that label.
4. **Normalization must stay advisory.** Connector data is OBSERVATION (constitutional). A schema-as-gate would reject PING's real ingestion output (derived fields like `locality`, tolerated unknown fields). The target spec is a mapping contract for adapters, never a validation gate. Proof: `spike/out/normalization-redteam.md`.
5. **PING already has the mechanism, mostly unwired.** Of the five derivations in `schemas.ts`, only `eligibleComponents` is wired into production. The others are tested but dead code paths in practice. The highest-leverage move is wiring what exists, not inventing a new system.

## What to do instead (expansion of the PROVEN subset, no new framework)

Inside the EXISTING `src/fyd/sitespec/schemas.ts` mechanism only:

1. Wire `validateAgainstSchema` into the proceduralizer output as ADVISORY findings (warn/info; never a gate; harvest-T5 tolerance preserved). One call site.
2. Generate `schema-types.d.ts`-equivalent interfaces at build time from the same defs; delete hand-maintained duplicates (`PingPost`, ad-hoc shapes) as they are proven redundant.
3. Hand `search-fields.json` to lane F as the deterministic seed for text indexing.
4. Hand `agent-tool-descriptions.json` to lane I (MCP tool contracts) and lane G (Ask FYD context compiler).
5. Converge the dual schema→component mappings (`SCHEMA_COMPONENTS` in schemas.ts vs `acceptsSchemas` in registry.ts): one owner, one table. Filed as a DUP-lane note via coordinator; do not fix unilaterally (shared file, registry.ts has other owners' consumers).
6. EXPLICITLY NOT: editor generation, schema-language vocabulary expansion, prescriptive normalization gating. Those are the meta-framework. If a fourth schema is ever needed, it is three data records in one file, not a system.

## Kill criteria check (from the operating model)

- New authority? No: the defs stay data, generators stay pure functions, no runtime registry.
- Weight vs value: the proven subset is ~200 lines of generator; value is deleting hand-maintained duplicates and wiring dead derivations. Positive.
- Optionality: removing the generators leaves PING exactly where it is today. Pass.

## Red-team summary

- Schema change breaking generated code at runtime: PASS. Adding an optional field keeps old records valid (0 findings); an illegal type change is caught as an error, enforcing the evolution law. (`spike/run.js` output.)
- Schema that cannot express a real product requirement: DOCUMENTED, six cases (`expressiveness-ceiling.json`). This is the load-bearing failure for "everything".
- Generated editors producing invalid objects: DOCUMENTED. Flat editor would write single values where PING requires dual-value provenance (`editor-redteam.md`).

## NEXT

Verdict is STOP on expansion-to-everything. Next: file the wiring handoffs (items 1-4 above) as INTEGRATION-REQUEST notes to the owning lanes via the coordinator; record the DUP note on the dual component mapping; close the lane's proof obligation. No further spike work unless the coordinator asks for the wiring itself.
