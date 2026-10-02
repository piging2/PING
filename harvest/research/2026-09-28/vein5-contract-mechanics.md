# VEIN 5: Contract Mechanics (deepening pass)
Date: 2026-09-28. Researcher: harvest pass subagent (research only, no repo writes).
Binding law: ~/workspace/sprint-2026-09-24/FYD-PING-HARVEST-PROGRAM-2026-09-25.md including the WRITER GATE CORRECTION.
Hard boundary honored: ATProto Lexicons must NEVER be ported into CanonicalAuthority, IdentityAuthority, or CapabilityAuthority. This pass harvests LAWS only, never whole-mechanism ports.

## PING side: what actually exists (traced on the Pig, repo /home/nolan/ping, git HEAD 1822d5fae)

All contract machinery lives in the TypeScript constitutional subsystem. The Python runtime/authorities/ directory (authority_router, canonical_hash_authority, identity_authority, projection_authority, repository_authority, embedding_authority, execution_authority) contains NO schema, version, or contract-evolution machinery (grep for canonical_schema, schema_version, lexicon returned zero matches). Findings below are all from runtime/constitutional/src/.

### 1. Version identity: namespace@version schema names
- Schema strings use the format `namespace.name@version`, e.g. `ping.social.post@1`, `ping.identity@1`, `ping.knowledge.business@1`.
- `runtime/constitutional/src/ping-vocabulary.ts` lines 46-51: SOCIAL_SCHEMAS (5 entries); lines 124-133: KNOWLEDGE_SCHEMAS (7 entries); lines 136-139: CANONICAL_SCHEMAS (12 entries, social + knowledge).
- Gates exist: `isSocialSchema`, `isKnowledgeSchema`, `isCanonicalSchema` (ping-vocabulary.ts lines ~141-143).
- `runtime/constitutional/src/ping-object-kernel.ts` line 38: `SCHEMA_VERSION = '1'`. Lines 108 and 121 hardcode `ping.social.post@1` and `ping.social.profile@1`.
- `runtime/constitutional/src/hash-authority.ts` lines 51-52: `CANONICAL_VERSION = '1.0.0'`, `SERIALIZATION_VERSION = '1.0.0'` (version envelope embedded in hashCanonical, lines 68-80).
- `runtime/constitutional/src/identity-authority.ts` line 39: `CONSTITUTIONAL_VERSION = '1.0.0'`.
- No written evolution policy exists anywhere. No migration code exists anywhere (the only occurrence of the word "migration" in the subsystem is a test comment, see below).

### 2. Enforcement gap (verified defect): the vocabulary gate is dead code at runtime
- ping-vocabulary.ts lines 1-8 claim the module is "the single source of truth that the TypeScript projector, the SQL schema, and the website BFF adapter must all agree with. Nothing else in the repo may define its own copy of these lists."
- Grep across runtime/constitutional/src/*.ts and database/*.sql shows `isCanonicalSchema` is called NOWHERE outside ping-vocabulary.ts itself and ping-vocabulary.test.ts. The projector does not call it.
- `runtime/constitutional/src/ping-projector.ts` rebuildObjects() (lines 161-179) inserts OBJECT_CREATED events into ping_objects with no schema allowlist check; the SQL reads `payload->>'schema'` verbatim.
- The database backstop is weak: `database/ping_objects.sql` line 41 is only `CHECK (schema LIKE 'ping.%@%')`. Any `ping.<anything>@<anything>` string passes. The predicate CHECK (line 86) and visibility CHECK (line 42) mirror the vocabulary exactly, but the schema CHECK does not.
- Net effect: PING's schema registry is currently fail-open by accident, not by design. Nothing in the code names the validation mode.

### 3. Unknown-field behavior: full preservation, no written policy
- `hash-authority.ts` canonicalizeObject() (lines 104-133): recursively sorts keys, preserves arrays in order, preserves ALL fields including unknown ones. Unknown fields are hashed, never dropped.
- The projector stores full content: `payload->'content' AS content` (ping-projector.ts line 167). Unknown content fields survive projection.
- OBJECT_UPDATED applies a shallow right-wins merge (`content || changes`, ping-projector.ts ~line 228): unknown fields in a change patch merge into the object.
- BUT there is no written unknown-field law, and typed re-serialization paths carry clobber risk: `schemas/ping-objects.ts` narrows content types (e.g. PingPost.content is `{ text: string }`, lines 28-33). Any code that reads via the narrowed type and rewrites the object can silently strip unknown fields. This is exactly the failure ATProto's spec warns about (see EXTERNAL). No instance of clobbering was observed; the risk is unproven, not the defect.
- Malformation is fail-closed at the envelope layer: `ping-canonical-envelope.ts` line 197 throws WrongJournalError if schema is missing; verifyPayload (lines 169-193) returns false on any proof malformation. That is integrity, not schema evolution.

### 4. Generated types: none (hand-written)
- `runtime/constitutional/src/schemas/ping-objects.ts` (120 lines): hand-written interfaces. PingPost extends PingObject with the literal type `schema: 'ping.social.post@1'` (line 30). No codegen from the vocabulary registry exists; drift between the registry and the interfaces is possible and unchecked except by tests.

### 5. Deterministic migration: does not exist
- Only artifact: `runtime/constitutional/src/patch-7b-canonical.test.ts` lines 49-52, a golden-vector comment: "If this value changes without an intentional contract migration, the change is a replay-compatibility break and must be treated as such." This names the concept. No machinery implements it.

### 6. Explicitly documented gaps
- PING_ONLY visibility: "a recorded schema gap (no schema support yet)" (ping-vocabulary.ts lines 69-72, VISIBILITY_GAP; ping-feed-projection.ts lines 18-23). The projector must fail closed on unsupported visibility rather than downgrade. This is a written fail-closed law and is the correct pattern to imitate for schema evolution.

## EXTERNAL: ATProto Lexicons (pinned, verified from source)

### EXACT REPO + SHA
- Code: bluesky-social/atproto @ 7a857989751ae31518509d69ab7194a922064f3d (main, committed 2026-09-25T17:45:47Z; verified via https://api.github.com/repos/bluesky-social/atproto/commits/7a857989751ae31518509d69ab7194a922064f3d).
- Spec: bluesky-social/atproto-website @ ad5b0c7e299ac5f749f656d02f5a3e66895e6e15 (main, committed 2026-09-24T22:50:58Z; verified via commits API). File: src/app/[locale]/specs/lexicon/en.mdx.

### LICENSE (quoted precisely from the repos)
- atproto LICENSE.txt: "Dual MIT/Apache-2.0 License. Copyright (c) 2022-2026 Bluesky Social PBC, and Contributors. Except as otherwise noted in individual files, this software is licensed under the MIT license, or the Apache License, Version 2.0. Downstream projects and end users may chose either license individually, or both together, at their discretion. The motivation for this dual-licensing is the additional software patent assurance provided by Apache 2.0." File-level exceptions are explicitly anticipated ("Except as otherwise noted in individual files"); no AGPL/GPL anywhere in the donor paths examined. The lexicon package README repeats the dual license.
- atproto-website LICENSE.txt: "Creative Commons Attribution (CC-BY). Copyright (c) 2022-2026 Bluesky Social PBC, and Contributors. Documentation text and blog posts in this repository are licensed under a permissive CC-BY license." And: "Inline code examples, example data, and regular expressions are under Creative Commons Zero (CC-0, aka Public Domain) and copy/pasted without attribution." We harvest LAWS (ideas), not code or text, so this is pattern learning; no transplantation is proposed.

### Compatibility laws (spec en.mdx lines 445-458, quoted)
"Lexicons are allowed to change over time, within some bounds to ensure both forwards and backwards compatibility. The basic principle is that all old data must still be valid under the updated Lexicon, and new data must be valid under the old Lexicon.
- Any new fields must be optional
- Non-optional fields can not be removed. A best practice is to retain all fields in the Lexicon and mark them as deprecated if they are no longer used.
- Types can not change
- Fields can not be renamed
If larger breaking changes are necessary, a new Lexicon name must be used."
Additional spec facts: the "set in stone" trigger is "public adoption and implementation by a third party, even without explicit permission" (line 456); experimental status should be marked in the name, e.g. `com.corp.experimental.newRecord` (line 458). Breaking changes get a NEW NSID (community convention is a version suffix such as post to postV2); there is deliberately no version number inside an NSID.

### Unknown-field law (spec en.mdx line 466, quoted)
"Unexpected fields in data which otherwise conforms to the Lexicon should be ignored. When doing schema validation, they should be treated at worst as warnings. This is necessary to allow evolution of the schema by the controlling authority, and to be robust in the case of out-of-date Lexicons."
Clobber warning (lines 506-510): implementations that deserialize into typed structures and re-serialize risk stripping unexpected fields; "one way to avoid this problem is to retain any 'extra' fields, or to pass-through the original data object instead of re-serializing it." The spec notes validation rules for additional fields may later gain a closed-schema mechanism or an `x-` extension-prefix convention (line 510).

### Code-level proof (pinned SHA)
- packages/lexicon/src/validators/complex.ts, function object(): iterates ONLY declared `def.properties`; extra keys in the value are never rejected and never stripped; the function returns the original (or shallow-cloned on default application) object with unknown fields intact. Unknown-field tolerance is structural, not a flag.
- packages/lexicon/src/lexicons.ts: the Lexicons registry (add/getDef/getDefOrThrow) resolves schema documents by URI at validation time.
- packages/lex-cli/src/codegen: generates typed clients from Lexicon documents (the generated-types mechanism).
- packages/lexicon-resolver: on-demand schema resolution.

### Authority discovery and schema resolution (spec en.mdx lines 458-498)
- "The authority for a Lexicon is determined by the NSID, and rooted in DNS control of the domain authority. That authority has ultimate control over the Lexicon definition, and responsibility for maintenance and distribution of Lexicon schema definitions."
- Dispute resolution: "The primary mechanism for resolving protocol disputes is to fork Lexicons in to a new namespace."
- Publication: Lexicon schemas are published as records of type `com.atproto.lexicon.schema` inside atproto repositories. A DNS TXT record named `_lexicon.<reversed authority>` links the authority domain to a DID (value `did=<did>`), e.g. `_lexicon.blogging.lab.dept.university.edu`. Resolution is NOT hierarchical: "resolvers should not recurse up or down the DNS hierarchy looking for TXT records" and "If the DNS TXT resolution ... failed, the resolving service would NOT try" parent or sibling domains. Namespace authority is at the group level (all NSIDs differing only in the final name part publish in the same repository).

### Validation modes (spec en.mdx lines 435-437)
Three PDS record-validation approaches are named: explicit (fail if the Lexicon cannot be resolved), none (bypass Lexicon validation), and optimistic (validate if known, allow creation if unknown; the default, also called "Fail-Open"). The modes are deliberate and named, not accidental.

## EXTERNAL: JSON Schema evolution (pinned, mechanism level)
- Repo: json-schema-org/json-schema-spec @ 4f56a9900674 (HEAD, 2026-09-04T18:28:06Z; verified via commits API). License: BSD-3-Clause (LICENSE file: "Copyright (c) 2022 JSON Schema Specification Authors", standard BSD-3-Clause redistribution text).
- Mechanism: `additionalProperties` defaults to true, so unknown fields PASS validation unless a schema explicitly closes itself with `additionalProperties: false`. Openness is the default; closedness is opt-in per schema. This is the JSON Schema analogue of the Lexicon unknown-field law, but expressed as a per-schema keyword rather than a global protocol law.
- The specification itself defines NO versioning or compatibility law for evolving schemas over time; compatibility practice (additive optional fields, etc.) is community convention and registry policy (e.g. schema-registry compatibility modes), not spec law. Harvestable as a mechanism: the open-by-default/closed-by-exception keyword. Not harvestable as an evolution law, because none exists in the spec.

## EXTERNAL: Protobuf field-number and unknown-field retention laws (pinned, mechanism level)
- Repo: protocolbuffers/protobuf @ b1503a1ca420 (HEAD, 2026-09-28T06:38:49Z; verified via commits API). License: BSD-3-Clause ("Copyright 2008 Google Inc.", standard BSD-3-Clause text).
- Mechanisms:
  1. Field NUMBERS are the permanent identity of a field, not its name. Never reuse a deleted field's number or name; the `reserved` keyword banks them.
  2. Unknown fields are retained: parsers store fields they do not recognize in the message's unknown-field set and re-emit them verbatim on serialization. A relay that does not understand a new field still forwards it intact. This is the binary-protocol version of "retain extra fields / pass through the original object."
  3. New fields must be optional (proto3 singular fields carry presence rules; adding a required field is a break). Changing a field's type on the same number breaks wire compatibility.
- Harvestable as laws: number-identity (PING already has name-identity via schema strings; the lesson is "never recycle an identifier") and unknown-field retention through intermediaries (PING's projector already does this for content; the lesson applies to any future typed relay path).

## EXTERNAL: Avro schema-resolution laws (pinned, mechanism level)
- Repo: apache/avro @ 209a3735ec33 (HEAD, 2026-09-21T12:53:46Z; verified via commits API). License: Apache License 2.0 (LICENSE.txt header verified).
- Mechanism: reader and writer schemas are resolved against each other at read time. Laws: new fields in the READER schema must declare defaults; fields present in the writer but absent in the reader are ignored; a reader may not require a field the writer lacks unless a default exists; `aliases` permit renames without breaking resolution; limited type promotion is allowed (int to long to float to double, string/bytes interop). The writer's schema travels with the data (or is fingerprint-identified), so old data is always readable.
- Harvestable as a law: the READER-vs-WRITER framing, which is stricter and more operational than PING's current "all schemas are @1" stance. PING has no reader/writer split today (journal events are read by the same codebase that wrote them), so this stays a documented law for the future, not an implementation.

## Comparative verdict (PING vs donors)
- PING's version identity (`name@version`) is simpler and adequate for a single-authority system; ATProto's no-version-in-NSID plus new-name-for-breaking is designed for a no-central-upgrade federation PING does not have. No change warranted.
- PING already implements unknown-field PRESERVATION through canonicalization, storage, and projection. What it lacks is the WRITTEN law and the clobber guard on typed paths. ATProto writes both down.
- PING's genuine current defect is the unenforced vocabulary gate (Section 2 above). ATProto's relevant mechanism is not a code import but the NAMED validation mode: explicit vs none vs optimistic. PING is accidental fail-open; it should be deliberate fail-open or deliberately fail-closed, at ingestion, with the mode written down.
- PING has no evolution law, no migration machinery, and has never needed either (every schema is @1). Adopting the four prohibitions plus the FULL_TRANSITIVE principle as a written contract is cheap insurance and the single highest-value harvest, but no live failure gates it, so it is BACKLOG, not a writer task.

---

## CANDIDATE 1: Lexicon compatibility laws as PING's written schema-evolution contract

AREA: Contract mechanics / schema evolution law.

CURRENT PING IMPLEMENTATION: Schema names carry `@1` (ping-vocabulary.ts lines 46-51, 124-133; ping-object-kernel.ts line 38 `SCHEMA_VERSION = '1'`). No document states what a `@2` may or may not do. No migration machinery exists (only the patch-7b-canonical.test.ts lines 49-52 comment naming "intentional contract migration"). All 12 canonical schemas are at version 1; the law has never been exercised.

EXTERNAL IMPLEMENTATION: ATProto Lexicon Evolution (spec, lines 445-458): FULL_TRANSITIVE principle ("all old data must still be valid under the updated Lexicon, and new data must be valid under the old Lexicon") plus four prohibitions (new fields optional; non-optional fields not removed, deprecate in place; types cannot change; fields cannot be renamed) plus the escape hatch (breaking change requires a new Lexicon name) plus the set-in-stone trigger (third-party adoption) plus experimental naming convention.

EXACT REPO + SHA: bluesky-social/atproto-website @ ad5b0c7e299ac5f749f656d02f5a3e66895e6e15, file src/app/[locale]/specs/lexicon/en.mdx, lines 445-458. Code corroboration: bluesky-social/atproto @ 7a857989751ae31518509d69ab7194a922064f3d, packages/lexicon/src/validators/complex.ts (unknown-field-preserving object validator).

LICENSE: Spec text CC-BY (atproto-website LICENSE.txt, quoted above); code examples CC-0. This candidate harvests the LAW (idea/pattern), not text or code, so no attribution-sensitive transplantation. Donor code license for reference: dual MIT/Apache-2.0.

MECHANISM WORTH HARVESTING: The four prohibitions plus the FULL_TRANSITIVE principle plus the set-in-stone trigger, written as a contract block in ping-vocabulary.ts (the module that already claims to be the vocabulary authority), with one unit test per prohibition using the existing vocabulary fixtures.

WHY IT IS BETTER: PING currently has no rule for what its own `@2` means. The first schema change will otherwise be designed ad hoc under live pressure, which is exactly when compatibility breaks. ATProto's law has survived production at federation scale since 2022 and is the tightest known statement of the constraint. Protobuf/Avro laws corroborate the same shape (additive optionality, identifier permanence).

WHAT NOT TO COPY: Do not copy Lexicon documents, the NSID system, DNS-based authority discovery, the lexicon-resolver, lex-cli codegen, or the `com.atproto.lexicon.schema` publication machinery. Do not put Lexicons into CanonicalAuthority, IdentityAuthority, or CapabilityAuthority (binding rejection). Do not adopt the no-version-in-identifier convention; PING's `@version` suffix stays.

PING AUTHORITY IT MUST REMAIN UNDER: The TypeScript constitutional subsystem's vocabulary module (ping-vocabulary.ts). No new authority. No Python-side change. The law is a constraint on future writes to that module, enforced by unit tests, not a runtime service.

MINIMAL PATCH: A comment-law block (~25 lines) at the top of the CANONICAL_SCHEMAS section of ping-vocabulary.ts plus 4 focused unit tests in ping-vocabulary.test.ts (new optional field allowed; required field removal rejected by convention test; type change flagged; rename flagged). Tests assert the law's presence as documentation-backed convention, since the law constrains future human edits, not runtime input.

EXPECTED DELETION-SIMPLIFICATION: None. This is additive law. CURRENT PING LOC TOUCHED: 201 (ping-vocabulary.ts). DONOR LOC EXAMINED: ~90. EXPECTED PING LOC ADDED: ~45. EXPECTED PING LOC REMOVED: 0. NET LOC: +45. NEW DEPENDENCIES: 0. NEW AUTHORITIES: 0. NEW RUNTIME SERVICES: 0.

TEST THAT PROVES IMPROVEMENT: No runtime behavior changes, so no failing-before test exists. The gate is documentary: a future `@2` proposal can be checked against the four prohibitions in review. The honest test artifact is a test that enumerates the prohibitions and asserts each is stated in the law block (guards against silent deletion of the law).

BENCHMARK: Not applicable (no performance dimension). Adoption signal: the law is cited in the first schema-change review.

SECURITY CONSEQUENCES: Positive but indirect. A written no-type-change / no-required-removal law prevents a future schema edit from silently widening what the projector accepts (e.g. turning an optional field required could be used to brick old clients; changing a type could alter canonical bytes and therefore object identity hashes). The law makes such edits review-visible.

MIGRATION-RISK: Zero runtime migration. Risk is conceptual: writing the law could be mistaken for permission to start versioning schemas casually. Mitigate with the set-in-stone trigger in the same block (a schema is frozen at first third-party/production adoption).

DECISION: BACKLOG. Reason: no live failure, no schema has ever evolved, no product path is blocked. The mechanism is documented here for the day a `@2` is proposed. This is a successful harvest result: the law is captured at near-zero cost without touching the frozen core.

---

## CANDIDATE 2: Name PING's validation mode and enforce the vocabulary gate at ingestion

AREA: Contract mechanics / schema admission control.

CURRENT PING IMPLEMENTATION: ping-vocabulary.ts claims single-source-of-truth status (lines 1-8) and ships `isCanonicalSchema()`, but nothing calls it at runtime (verified by grep: zero callers outside the module and its tests). The projector's rebuildObjects() inserts any schema string from journal events (ping-projector.ts lines 161-179). The only backstop is `database/ping_objects.sql` line 41: `CHECK (schema LIKE 'ping.%@%')`. So today PING admits any well-formed `ping.*@*` schema string into projections. This is fail-open by accident: no code names the mode, no ingestion point validates against the registry, and the vocabulary's own contract ("the TypeScript projector ... must agree with" it) is violated in practice.

EXTERNAL IMPLEMENTATION: ATProto names three validation modes explicitly (spec en.mdx lines 435-437): explicit (fail when the Lexicon cannot be resolved), none (bypass), optimistic (validate if known, allow if unknown; the default, "Fail-Open"). ATProto's own default is fail-open, but it is a DELIBERATE, named, documented choice, and PDS operators can select explicit. The mechanism worth harvesting is the naming and the deliberate placement at ingestion, not the DNS resolution behind it.

EXACT REPO + SHA: bluesky-social/atproto-website @ ad5b0c7e299ac5f749f656d02f5a3e66895e6e15, src/app/[locale]/specs/lexicon/en.mdx, lines 435-437 (validation options) and 458-462 (authority and control).

LICENSE: CC-BY spec text (law/pattern only, no text copied). Reference code license: dual MIT/Apache-2.0.

MECHANISM WORTH HARVESTING: (a) A named validation mode for PING schema admission, chosen deliberately and written down (recommendation: explicit fail-closed at the governed ingest path, since PING is a single-authority system and its journal is append-only; an unknown schema in the journal is a governance defect, exactly like the same-ID/different-semantics collision the projector already fails closed on, ping-projector.ts lines 110-118). (b) Wiring the existing `isCanonicalSchema()` gate into the projector's rebuild path (or the governed ingestion path upstream of it), so the vocabulary's single-source-of-truth claim becomes true.

WHY IT IS BETTER: Today the vocabulary makes a promise the runtime does not keep. Either the promise or the runtime is wrong, and ATProto's lesson is that the answer must be explicit. Fail-closed at ingestion matches PING's existing posture everywhere else in the projector (unknown object on OBJECT_UPDATED fails closed, ping-projector.ts lines 210-214; visibility outside the supported set must fail closed, ping-vocabulary.ts lines 69-72; journal collisions fail closed, ping-projector.ts lines 110-118). An unknown-schema object admitted silently today would project into every downstream consumer with no alarm, the exact class of silent-success failure the WRONG_JOURNAL contract (ping-canonical-envelope.ts lines 77-90) was built to prevent.

WHAT NOT TO COPY: Do not copy Lexicon schema documents, NSID/DNS authority discovery, optimistic remote resolution, or the lexicon-resolver package. PING's authority is local and single; resolution is a registry lookup, not DNS. Do not create a schema-registry service. Do not touch CanonicalAuthority, IdentityAuthority, or CapabilityAuthority.

PING AUTHORITY IT MUST REMAIN UNDER: The TypeScript constitutional subsystem: ping-vocabulary.ts (the gate) and ping-projector.ts (the enforcement point). Optionally the SQL CHECK as defense in depth. No new authority, no new service.

MINIMAL PATCH: In ping-projector.ts rebuildObjects(), after reading each OBJECT_CREATED row's schema (or in a pre-pass over the journal like detectConflicts()), assert `isCanonicalSchema(schema)`; on failure, throw the same FAIL CLOSED style error the projector already uses, naming the event and the unknown schema. Add one test: rebuild with an event carrying `ping.unknown@1` rejects; rebuild with all canonical schemas succeeds. Alternative within the same patch if Nolan prefers permissive ingest: keep admission open but downgrade the vocabulary docstring's false claim and log unknown schemas as warnings (ATProto's "treated at worst as warnings"). The patch must pick one; the recommendation is fail-closed at ingestion because the journal is append-only and silent admission is unrecoverable.

EXPECTED DELETION-SIMPLIFICATION: The change deletes nothing but resolves the contradiction between the vocabulary docstring and runtime behavior; if the fail-closed option is taken, the weak `LIKE 'ping.%@%'` CHECK can later be tightened to the explicit list, deleting the permissiveness (a follow-up, not this patch). CURRENT PING LOC TOUCHED: 407 (ping-projector.ts) + 139 (ping_objects.sql, read-only this pass). DONOR LOC EXAMINED: ~20. EXPECTED PING LOC ADDED: ~20 (one assertion plus one test). EXPECTED PING LOC REMOVED: 0. NET LOC: +20. NEW DEPENDENCIES: 0. NEW AUTHORITIES: 0. NEW RUNTIME SERVICES: 0.

TEST THAT PROVES IMPROVEMENT: New test in ping-projector.integration.test.ts (or a unit test at the rebuildObjects level): insert an OBJECT_CREATED event with schema `ping.unknown@1`; assert rebuildAll() rejects with a FAIL CLOSED unknown-schema error and writes zero projection rows (mirroring the existing unknown-object test at lines 311-313, which asserts the same zero-fanout property). Before the patch this test fails (the event projects silently); after, it passes.

BENCHMARK: Correctness benchmark, not latency: count of unknown-schema events currently in the journal (expected zero; the defect is latent, not active). Post-patch, any future unknown schema becomes a loud ingestion error instead of a silent projection.

SECURITY CONSEQUENCES: Positive. Today's open admission means a compromised or buggy ingest writer could introduce arbitrary schema strings that flow into the website BFF and Ask FYD retrieval paths unchecked. Fail-closed at ingestion converts that into an immediate, attributable error at the trust boundary. No new attack surface is added (no network, no new dependency).

MIGRATION-RISK: Low but real. If any existing journal event carries a non-canonical `ping.*@*` schema, the first rebuild after the patch fails closed. Mitigation: run a one-off audit query (`SELECT DISTINCT schema FROM ping_events`) before enabling; the patch should ship with that query's result recorded. If non-canonical schemas exist in history, the decision flips to the log-and-warn alternative for the historical tail.

DECISION: REFACTOR. Reason: this is a PING-internal defect (a documented contract the code does not honor) with a live path (every projection rebuild), an existing owner (vocabulary module plus projector), and a donor pattern (named validation modes) that tells us exactly what "done" looks like. The writer gate's 12 questions are answerable: concrete failure (unenforced gate contradicting its own docstring), live path (rebuildAll), existing owner (ping-vocabulary.ts / ping-projector.ts), better mechanism (named deliberate validation mode), proof (ATProto production since 2022 plus PING's own fail-closed precedents in the same file), adaptable (yes, the gate already exists), extractable (a law, trivially), deletion (resolves the docstring/runtime contradiction; optional later tightening of the SQL CHECK), test (unknown-schema rebuild rejects with zero fanout), sovereign authority (TS constitutional subsystem, no new authority), pinned SHA (ad5b0c7e299ac5f749f656d02f5a3e66895e6e15), file license (CC-BY spec pattern; no code copied). Note for the writer: run the distinct-schema audit first; if history is dirty, take the warn alternative.

---

## CANDIDATE 3: Written unknown-field retention law plus clobber guard for typed paths

AREA: Contract mechanics / unknown-field handling.

CURRENT PING IMPLEMENTATION: Unknown fields are preserved end to end today: canonicalizeObject() keeps all keys (hash-authority.ts lines 104-133), the projector stores full content JSONB (ping-projector.ts line 167), and OBJECT_UPDATED merges change patches shallowly right-wins (ping-projector.ts ~line 228). No written policy states this. Typed paths narrow content (schemas/ping-objects.ts: PingPost.content is `{ text: string }`), so any read-through-narrowed-type then rewrite path could strip unknown fields. No clobbering instance was found; the risk is structural and unproven.

EXTERNAL IMPLEMENTATION: ATProto spec en.mdx line 466 ("Unexpected fields ... should be ignored ... treated at worst as warnings") plus lines 506-510 (retain extra fields or pass through the original object instead of re-serializing; future closed-schema or `x-` prefix conventions). Code: packages/lexicon/src/validators/complex.ts object() preserves undeclared keys structurally. Protobuf's unknown-field set retention (protocolbuffers/protobuf @ b1503a1ca420, BSD-3-Clause) is the same law in binary form.

EXACT REPO + SHA: bluesky-social/atproto-website @ ad5b0c7e299ac5f749f656d02f5a3e66895e6e15 (spec lines 466, 506-510); bluesky-social/atproto @ 7a857989751ae31518509d69ab7194a922064f3d (validators/complex.ts).

LICENSE: CC-BY spec pattern (no text copied); dual MIT/Apache-2.0 reference code; protobuf BSD-3-Clause (mechanism reference only, no code).

MECHANISM WORTH HARVESTING: The written law ("unknown fields are preserved through canonicalization, storage, projection, and merge; typed re-serialization must pass through the original object or retain extra fields") plus one round-trip test proving an unknown content field survives create, project, update, and re-read. This converts PING's current accidental preservation into a guaranteed invariant.

WHY IT IS BETTER: PING's preservation is currently an emergent property of three independent implementation choices. Any one of them could be "optimized" away by a future edit that drops unknown keys (e.g. a strict Zod-style parse in a new ingest path, or a narrowed-type rewrite). ATProto and Protobuf both learned to write this down because intermediaries that strip unknown fields silently break forward compatibility across version skew. PING's projector IS an intermediary; the law protects the day a `@2` writer and a `@1` reader coexist.

WHAT NOT TO COPY: Do not copy Lexicon validation code, the `x-` prefix convention (speculative in the spec itself), or any closed-schema mechanism. Do not add an `additionalProperties`-style keyword to PING schemas; PING's content is intentionally schemaless JSONB under a named envelope.

PING AUTHORITY IT MUST REMAIN UNDER: TypeScript constitutional subsystem: hash-authority.ts (canonicalization law), ping-projector.ts (projection/merge law). No new authority.

MINIMAL PATCH: A short law comment in hash-authority.ts canonicalizeObject() and in ping-projector.ts rebuildObjects(), plus one round-trip test (create object with an extra content field, run rebuildAll, apply an OBJECT_UPDATED, assert the extra field is present in the final projection). ~35 lines added, 0 removed.

EXPECTED DELETION-SIMPLIFICATION: None. CURRENT PING LOC TOUCHED: 155 (hash-authority.ts) + 407 (ping-projector.ts). DONOR LOC EXAMINED: ~80. EXPECTED PING LOC ADDED: ~35. EXPECTED PING LOC REMOVED: 0. NET LOC: +35. NEW DEPENDENCIES: 0. NEW AUTHORITIES: 0. NEW RUNTIME SERVICES: 0.

TEST THAT PROVES IMPROVEMENT: Round-trip preservation test described above. It passes today (proving the invariant already holds) and guards the future. Because it passes before the patch, this is a characterization test, not a defect fix; that is precisely why the decision is BACKLOG and not a writer task.

BENCHMARK: Not applicable (no performance dimension). Invariant coverage: 1 new test.

SECURITY CONSEQUENCES: Neutral to slightly positive. Unknown-field preservation means a writer can smuggle opaque data through intermediaries; that is already true today and is inherent to the design (content is schemaless JSONB by constitution). The law does not change the threat model; it only documents it. Note for the record: if content ever carries executable or policy-bearing fields, the preservation law would need a companion allowlist at consumption points. Not the case today.

MIGRATION-RISK: Zero. Additive documentation plus a passing test.

DECISION: BACKLOG. Reason: the invariant already holds in code (proven by reading, would be proven by the test), no live failure exists, and the clobber risk is structural but unobserved. File the law and the test design here; write it when a typed rewrite path is actually introduced or when Candidate 1's evolution law is adopted.

---

## Candidates considered and rejected

- Port ATProto Lexicons (documents, NSID, DNS authority discovery, lexicon-resolver, lex-cli) into PING: REJECT. Binding rejected leap. PING is a single-authority system; federated schema resolution solves a problem PING does not have, and would create a second schema authority.
- Adopt JSON Schema as PING's schema language: REJECT. PING's envelope (named schema string plus schemaless JSONB content plus vocabulary registry) is already the working contract; JSON Schema would add a validation framework with no live defect demanding it, and the spec defines no evolution law anyway.
- Adopt Protobuf/Avro wire encoding for the journal: REJECT. The journal's canonical bytes plus SHA-256 identity (hash-authority.ts, ping-canonical-envelope.ts) is the proven, tested identity mechanism; replacing it would break every existing object ID and event hash with no product failure motivating it.
- Generated types from the vocabulary registry (lex-cli analogue): BACKLOG, not REJECT. With 12 schemas and hand-maintained interfaces currently in sync, no failure exists. Revisit if the registry grows past ~30 schemas or a drift incident occurs.

## Closed competitors
None in this vein. All donors are open specifications or open-source repositories; no OBSERVED/DOCUMENTED/INFERRED/SPECULATIVE labeling was required.

## Scorecard (per the harvest program's new scorecard)
- Duplicate mechanisms deleted: 0 (none found in this vein).
- Homegrown fragility removed: 0 this pass (Candidate 2 proposes resolving a contract contradiction, not deleting code).
- Live defects closed: 0 (research only).
- Tests/invariants proposed: 3 (1 for Candidate 2, 2 characterization/law tests for Candidates 1 and 3).
- Net LOC proposed: +100 across the three candidates (+45 / +20 / +35), all law and test, zero new dependencies, zero new authorities, zero new runtime services.
- Authorities added: 0.
- Best-result framing: "We studied ATProto Lexicons, JSON Schema, Protobuf, and Avro at pinned SHAs, proved PING already preserves unknown fields and already has version identity, found one real contract contradiction (unenforced vocabulary gate), and proposed at most 100 lines of law plus tests with no new machinery."

## License and attribution summary
- bluesky-social/atproto @ 7a857989751ae31518509d69ab7194a922064f3d: dual MIT/Apache-2.0 (LICENSE.txt quoted verbatim above). No code copied; no attribution obligation triggered.
- bluesky-social/atproto-website @ ad5b0c7e299ac5f749f656d02f5a3e66895e6e15: CC-BY docs, CC-0 code examples (LICENSE.txt quoted verbatim above). Laws harvested as patterns/ideas; no text transplanted.
- json-schema-org/json-schema-spec @ 4f56a9900674: BSD-3-Clause.
- protocolbuffers/protobuf @ b1503a1ca420: BSD-3-Clause.
- apache/avro @ 209a3735ec33: Apache License 2.0.
- No AGPL/GPL code anywhere in the donor paths examined. No file-level license exceptions were encountered in the examined paths (the atproto dual-license header anticipates them; none affected the cited files).

## Open questions for the parent
1. Candidate 2 (REFACTOR) recommends fail-closed at ingestion for unknown schemas. If Nolan prefers PING's ingest to stay permissive, the alternative is the warn-and-downgrade-the-claim patch. This is a genuine product decision (strictness vs permissiveness at the journal boundary) and the one item in this report that touches live behavior.
2. The distinct-schema audit (`SELECT DISTINCT schema FROM ping_events`) should precede any Candidate 2 write; a dirty history flips the recommendation to warn mode for the historical tail.
3. No 12-gate candidate beyond Candidate 2 emerged; per the program, BACKLOG/REJECT on the rest is a successful result.
