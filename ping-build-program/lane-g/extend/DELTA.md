# ADOPT + EXTEND: audit and delta for src/fyd/ask/context-compiler.ts

Date: 2026-09-23 (night shift). DUP-lane directive absorbed: ADOPT/EXTEND, no third module.

## The existing compiler (what it covers)

`src/fyd/ask/context-compiler.ts` in the Pig repo (559 lines, zero importers, dormant) plus the 41-line `src/fyd/ask/context-builder.ts` in the same directory.

What the base file already gets right (ADOPTED, kept in `extend/context-compiler.ts`):
1. Viewer tier model (anonymous/visitor/owner/staff/agent) with owner-identity verification, unverified-owner downgrade, and agent delegation. Fail-closed on unknown tiers.
2. Visibility filtering at assembly time, never prompt-side. Missing-visibility records excluded.
3. Target resolution with recorded unknowns (unknown id never throws).
4. Deterministic relevance scoring (target boost, token hits, schema-intent boosts) with deterministic tiebreaks (score desc, id asc).
5. Active-only relationships, both endpoints selected (kills dangling/cross-tenant edges).
6. Per-field visibility with owner/staff flagging (`hiddenInPublic`).
7. Field-level evidence registry (`obj:`/`field:`/`rel:` ids) with provenance classification.
8. Unknowns derivation (question facets with no supporting evidence).
9. consumerRules firewall (content is DATA, cite-only-registry, grade discipline).
10. `verifyAnswerClaims` grade vocabulary enforcement: unknown grades, unbound claims, UNKNOWN-with-citations, evidence-not-in-packet.

What `context-builder.ts` (the live path) does: `buildAskFydContext` takes the projected graph + SiteSpec + capabilities + request and calls `buildAskContext` from `lib/ping/ask-composer`. The compiler slots in BEFORE it: replace the raw `relatedObjects` dump with the compiled packet's selection. No change to `context-builder.ts` is required for the first integration; it consumes whatever objects it is handed.

## Provenance note (honest)

The Pig file is untracked (`??` in git status, no history) and byte-identical to this lane's earlier `port/context-compiler.ts` sketch (SHA-256 `aab39942...`). It is this lane's own prior unproven output, not longstanding PING machinery. The DUP directive still holds as convergence discipline: one compiler going forward, not two or three. `extend/context-compiler.ts` IS the base file plus the delta below. `spike/compiler.js` remains as the executable proof of the semantics; it is evidence, not a competing module.

## Gaps found (G1..G12)

- **G1 No byte budget.** Count caps only (8 objects, 20 rels, 500 field chars). No byte bound, no priority order, no ledger. A hostile tenant can stuff the context with 8 huge objects.
- **G2 Exclusion ledger leaks ids.** Per-record `{kind, ref, reason}` names hidden object/field ids (e.g. `not_public` on a specific id). A visitor can enumerate hidden records' existence and ids. Privacy regression against the design.
- **G3 No relevance gate.** Top-N always selected regardless of the question; a nonsense question still drags objects into the packet, weakening the honest-UNKNOWN path.
- **G4 packetId hashes a subset.** Only ids/caps/rules are hashed, not field content. Same ids + edited content = same packetId. The determinism proof does not cover content.
- **G5 No epistemic rank enforcement.** `verifyAnswerClaims` checks registry membership but not rank: a claim graded/typed as DIRECT_FACT citing only `website_statement` evidence passes.
- **G6 Provenance mapping incomplete.** `directory` kind falls through to UNKNOWN; owner kinds map to `owner_authorship` instead of the binding vocabulary's `USER_OVERRIDE`.
- **G7 No secret stripping.** A secret-shaped field name with public visibility would enter the packet (lane L custody violation).
- **G8 Capabilities unfiltered.** `capabilities: string[]` copied verbatim: unknown kinds pass, and no forbidden-agent-effect stripping happens in the packet.
- **G9 No explicit contentBoundary.** consumerRules imply it, but there is no machine-readable untrusted-data marker for LLM consumers.
- **G10 Predicate weights don't match lane E.** `offers`/`has_article` vs the canonical `provides`/`publishes` from lane E's agent-tool-descriptions output.
- **G11 No lane F consumption point.** Scoring is local substring matching; no SearchRequest/SearchResponse seam, no indexDigest binding.
- **G12 No recency signal.** Scoring has no evidence-derivedAt term.
- **Also fixed while here:** the `/conflict/i.test(provenance.ref)` scoring hack (tied to a fixture naming convention, not a real conflict signal) is removed; B5 semantics (both sides admitted, contradiction bound at answer time) replace it. And a latent bug: the base resolves agent tier to owner/visitor before any agent-gating could read `scope.tier`, so agent-effect gating on the resolved tier is dead code; the delta gates on the pre-resolution tier.

## The delta (what changed, where)

File: `extend/context-compiler.ts` (TypeScript, erasable syntax; runs under node 24 type-stripping). Self-contained (no PING imports) for testability; on port, swap the local `canonicalize`/types for `canonicalize` from `lib/ping/ask-composer` and the repo types. Packet version bumped to `ask-context-packet@2`, compiler to `ctx-compiler@2` (byte budget and predicate table changed, so the determinism pin must change); claim binding stays `claim-binding@1`.

- **G1** `BudgetPolicy` (default maxBytes 24000, proportions target .15 / evidence .30 / relationships .15 / relatedObjects .30 / sourceExcerpts .10). Fill priority: target, evidence, relationships, related objects, excerpts. Sections are logical fill phases; the wire keeps the adopted flat arrays. `budgetCut` counted in the ledger; `budget.usedBytes/sections` emitted. Impossible target budget THROWS (fail closed) instead of emitting targetless context.
- **G2** `ExclusionCounts` replaces `ExclusionRecord[]`: counts for nonPublic, aclMissing, inactiveRelationships, danglingRelationships, ownerHiddenFields, belowFloor, selectionCut, budgetCut, secretFields. No ids anywhere in the packet's visibility block. Per-record detail belongs in lane J's server-side run record, never the packet.
- **G3** Relevance gate: a non-target candidate needs a question signal (token hit, intent-boosted schema, or lane-F hit). Structural proximity alone never qualifies. Gate failures counted as `belowFloor`; empty evidence emits `no_candidates_above_floor`.
- **G4** `packetId = sha256Hex(canonicalize(fullBody))`. Content edits change the id.
- **G5** `EPISTEMIC_RANK` table; `verifyAnswerClaims` gains the `epistemic_upgrade` violation: when a claim carries an `epistemic` class, its rank must not exceed the best rank of its cited evidence. Concierge-grade checks unchanged.
- **G6** `directory` -> DIRECT_FACT; `owner-authored`/`owner-correction`/`owner`/`owner_asserted` -> USER_OVERRIDE.
- **G7** `SECRET_FIELD_RE` strips secret-shaped fields at projection; counted, never emitted.
- **G8** Capabilities become `CapabilityView[]` (`kind`/`label`/`actionId`); unknown kinds dropped; agent-tier handles with forbidden effects stripped (gated on pre-resolution tier).
- **G9** `contentBoundary` string on the packet; `sourceExcerpts` section added (top-3 objects' raw text, bounded, boundary-marked).
- **G10** Predicate weights aligned to lane E vocabulary (`provides` .9, `employs` .85, `located_at` .8, `publishes` .6, etc.); legacy aliases kept at the same weights.
- **G11** Optional `search: {hits, indexDigest}` input. Exact-tier hits boost strongly, graded hits weakly; `indexDigest` binds into `digests.searchIndex`. When absent, local scoring stands alone. Visibility stays enforced at assembly regardless.
- **G12** Deterministic recency term: relative to the newest `derivedAt` in the visible set (no clock; missing dates neutral).

## Proof

`node extend/test-delta.js` — 17/17 pass (2026-09-23). Each test pins one gap closure or one adopted behavior: T1 adopted ranking, T2 counts-only ledger + no id leakage, T3 relevance gate, T4 full-body packetId, T5 epistemic_upgrade, T6 provenance mapping, T7 secret stripping, T8 capability gating, T9 500-object flood vs byte budget, T10 lane F seam, T11 lane E weights, T12 adopted claim discipline, T13 tier visibility, T14 content boundary, T15 impossible-budget refusal, T16 tier downgrades, T17 determinism (repeated + order-reversed).

## Lane F consumption (contract accepted)

Lane F's SearchRequest/SearchResponse contract (INTEGRATION-REQUEST-f.md, in this lane's dir) is accepted as-is. The compiler consumes `SearchResponse.hits[]` (objectId, tier, rule, score) as score boosts and binds `indexDigest` into the packet for replay. Lane F owns retrieval; lane G never reimplements it. No contract changes requested.

## Lane E consumption

`lane-e/spike/out/agent-tool-descriptions.json` (schema -> NL description with fields + relationships) is consumed for the schema-intent map and the canonical relationship vocabulary in predicate weights. Coverage is currently 3 schemas (business, service, post); the compiler's intent table extends beyond that (location, person, article) and will pick up E's fuller output when it lands. No E changes requested.

## What the delta does NOT do (explicit non-goals)

- No changes to `context-builder.ts` or any Pig file. Coordinator owns convergence.
- No owner-plane packet variant beyond the tier model (visitor-only first integration, per mission).
- No binding-record minting (claimId etc.) in `verifyAnswerClaims`; that stays with the answer stage / lane N lineage.
- The old `port/context-compiler.ts` (v1 sketch) and `spike/context-compiler.mjs` remain superseded; `spike/compiler.js` remains as proven-semantics evidence.
