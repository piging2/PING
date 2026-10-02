# LANE B8 REPORT: Object/Protocol Future-Proofing Audit (Phase 12)

**Lane:** B8 | **T+0:** 2026-09-28 14:26 MDT | **Completed:** 2026-09-28 ~14:55 MDT
**Mode:** READ ONLY. Canonical tree `/home/nolan/projects/ping` on Pig WSL at HEAD `0264d517ea53358d9246ddbbba66bb9dd0beb0d4` (branch `hardening/2026-09-28-vocab-ssrf`), read via `~/workspace/pig-fb/pigwsl-exec.sh -s`. Nothing written to any canonical tree. No commits, no pushes, no restarts, no gateway contact, no scheduler missions touched. No secrets read or printed.

## Report status: HYPOTHESIS

This report is a hypothesis until replayed from a clean checkout at 0264d517. All code claims below were read directly from the stated tree this session; each carries a file:line pointer. Lane reports 9, 10, 11, 14, 15 were consumed as secondary inputs and are cited where used; their claims are not re-verified here. No new Authorities are proposed anywhere in this report.

## The portability test

Could an independent future implementation reconstruct the same identities, causal history, semantic state, relationships, owner intent, authorization decisions, canonical bytes, and hashes from specifications, history, evidence, and policy alone, without PING's current servers, database, language, LLM, or source code?

**Headline verdict: PARTIAL.** The digest layer is portability-grade (pinned algorithm, test vectors, shell recipe). Identity domains are mostly specified, but one whole class of IDs is wall-clock plus randomness and cannot be reconstructed, only verified. The three clocks are distinguished in code but the causal clock has a null lineage field. Retraction and supersession are real; redaction is partial; purge semantics do not exist. Extension namespaces have no registry. Witness commitments exist per surface but there is no unified witness primitive.

---

## 1. Identity domains - PARTIAL

Inventory of identity domains observed in code, with their minting rules:

| Domain | Mint rule | Reconstructible? |
|---|---|---|
| Journal overlay event_id | `fyd-ovl-<Date.now() base36>-<randomBytes(6) hex>` - `tools/fyd-journal-gateway/server.mjs:172-174` | NO. Wall clock plus randomness. A future implementation can verify the format but cannot re-derive the id from the record. Occurrence identity only. |
| MC dispatch event id | `'mc-d-' + sha256hex([kind, missionId, eventType, summary].join('|')).slice(0, 12)` - `src/app/api/mc/_lib/mc-dispatch.ts:181-184` | YES, given the exact four inputs. Note the formulation is plain `createHash('sha256')` over a pipe-joined string, NOT the pinned canonical-json-v1 (see dimension 5). The summary string is load-bearing: idempotent re-emit requires byte-identical summaries. |
| Mission id | `'mc-m-' + sha256hex(['mission', agent, tenant, capability, promptDigest, idempotencyKey].join('|')).slice(0, 12)` - `src/app/api/mc/dispatch/route.ts:309` | YES, given the six inputs. Same pipe-join formulation caveat. |
| Work order id | `sha256('workorder:' + taskId)[0:16]` - orca-adapter path (lane 14 grounding; orca tree out of this audit's re-read, cited as hypothesis) | Presumed YES. |
| Owner event id | `fydOwnerEventId(body)`: sha256 over `canonicalizeJson({...body, generator_version: "fyd-owner@1"})`, body includes `seq`, excludes `id` - `src/fyd/object/owner-events.ts:122-135`. "The same logical event appended at the same position always yields the same ID." | YES, given body plus seq. Uses dev-signer's canonicalizer, not the pinned digest module (see dimension 5). |
| Context packet id | `sha256Hex(canonicalize(full packet body))` - `src/fyd/ask/context-compiler.ts:801-803` (G4) | YES. Pinned algorithm. |
| Context pack id (dispatch) | `'mc-ctx-' + missionId` - `src/app/api/mc/dispatch/route.ts:314` | YES, trivially derived. Carries no evidence binding pre-patch (lane 10). |
| Evidence refs | `obj:<id>` (`context-compiler.ts:621`), `field:<objId>:<field>` (`:646`), `rel:<relId>` (`:709`), `src:<objId>` (registry), `ping-event:<eid>` (`src/fyd/data/fyd-tenant-graph.ts:303`), conflict refs `<objectId>#<field>#conflict-<index>` (`src/fyd/ask/field-conflicts.ts:104` per lane 10) | YES, deterministic from the referenced ids. |
| Identity ids (user) | UUIDv5 under pinned namespace: `uuidv5(URL_NAMESPACE, "https://ping.social/fyd/identity/v1")` - `src/fyd/identity/uuid.ts:44-48` | YES. RFC 9562 derivation, fully specified. |
| Request ids | client-supplied, else `randomUUID()` - `src/fyd/customize/write-boundary.ts:56-58` | NO when minted (random). Reconstructibility is not the point here; the idempotency contract is. |
| Claim records | keyed by `resourceId` matching `/^[a-z0-9-]{1,64}$/` - `src/fyd/claim/machine.ts:29-31`, `version: 1` - `src/fyd/claim/types.ts:72` | YES. No separate claim id; the semantic id is the key. |
| Tenant ids | `/^[a-z0-9-]{1,64}$/` - gateway `server.mjs:109-113`; aggregates `fyd-site:<tenant_id>` (`server.mjs:30`), `mc:mission:<missionId>` (`mc-dispatch.ts:234`), namespaces `tenant::<tenant>` (`route.ts:315`) | YES. Formats are conventions in code, not a registered grammar. |

**Why PARTIAL, not PASS:** the journal overlay event_id domain (the canonical archive's own occurrence id) is wall-clock plus randomness. A future implementation replaying history cannot re-mint these ids; it can only ingest and verify them. Every domain is named in code, but no single document enumerates the domains; a future reader must grep.

## 2. Occurrence vs semantic identity - PASS

The distinction is real and mechanically enforced:

- **Owner events:** occurrence identity is the content-hash `id` (bound to `seq`, so the same logical edit at two positions yields two ids); semantic identity is `(objectId, target)` where target is a fact address like `"contact:phone"` (`owner-events.ts:103`). Revert appends a new `owner.restored-fact` occurrence; the correction occurrence stays (`owner-store.ts:12`, `:224`).
- **Claim records:** semantic identity is the `resourceId` key; occurrences are the `history[]` audit entries (`machine.ts:44-57`, `withEvent` at `:36-42`). State transitions are immutable (return a new record).
- **Journal:** occurrence identity is the minted `event_id`; semantic linkage is via `aggregate_id` (`fyd-site:<tenant>`, `mc:mission:<id>`) and `request_id` replay binding (same tenant plus same request_id returns the original event with `deduped:true`, appends nothing - `server.mjs:35`, `:320`).
- **Evidence registry:** per-occurrence classification. `tenant-graph.ts:303` mints `ping-event:<eid>` refs so an updated field cites the occurrence, not just the object.

**Caveat:** nothing names this distinction as a principle; it is emergent from the shapes. A future implementation reading the code would find the shapes intact.

## 3. The three clocks - PARTIAL

- **Wall clock:** `new Date().toISOString()` everywhere: claim `stamp()` (`machine.ts:32`), journal `timestamp`, MC `nowIso()` (`mc-dispatch.ts:176-178`). The context compiler is pure: no clock at all; recency (G12) is relative to the newest `derivedAt` in the set. Packet digests therefore do not commit to a wall time.
- **Logical clock:** three independent mechanisms, each local to its surface.
  1. Owner event `seq`: position in the object's log, assigned at append, part of the event id (`owner-events.ts:100`, `:122-135`).
  2. MC dispatch per-mission monotonicity: the projector orders by `(timestamp, event_id)` (`mc-dispatch.ts:197-202`); the emitter guarantees strictly increasing acceptance timestamps per mission, bumping +1ms on a tie (`mc-dispatch.ts:219-235`, the Lane D ordering fix). This is a logical clock layered over the wall clock.
  3. Optimistic concurrency: `expectedRevision` CAS in `src/lib/assignment-store.ts:397-402` (rejects unconditional overwrites at `:472`); per-site scoped lockfile plus in-process mutex in the write boundary; idempotency ledger "last wins" on replay (`write-boundary.ts:141`).
- **Causal clock:** `provenance.supersedes` chains with chain-head apply (`src/fyd/owner-mode/corrections.ts:12`, `:189-195`); claim `history[]` append order; MC `correlation_id = runId` (`route.ts:396`). **Gap:** `causation_id` is always null in dispatch (`route.ts` per lane 14, R8). There is no cross-surface causal edge vocabulary; causality is per-surface chains plus shared ids.

**Why PARTIAL:** the three are distinguished in practice, but there is no stated clock discipline, and the causal edge field exists but is never populated. A future implementation can reconstruct ordering from (timestamp, event_id) sorts and seq numbers, but cannot reconstruct cross-surface causality.

## 4. Schema evolution - PARTIAL

Version pins observed:
- `CONTEXT_PACKET_VERSION = "ask-context-packet@2"`, `COMPILER_VERSION = "ctx-compiler@2"`, `CLAIM_BINDING_VERSION = "claim-binding@1"` (`context-compiler.ts:43-45`), stamped into every packet body (`:761-762`).
- `FYD_OWNER_GENERATOR = "fyd-owner@1"` bound into every owner event id (`owner-events.ts:44`, `:133`).
- Claim record `version: 1` (`claim/types.ts:72`).
- Owner store migrates old mutable-store files on read and persists as a v2 file on first append (`owner-events.ts:473`, `owner-store.ts:106`).

**Why PARTIAL:** versions are labels with a migration habit (read-old, write-new), but no compatibility matrix, no deprecation policy, and no observed consumer validation of the version fields was surveyed. The generator-version-in-id binding is the strongest portability property here: old owner event ids remain verifiable under the old generator. "mc.authorize_work_order/v1" is a lane-11 label, not a code version string (lane 14 precision note).

## 5. Canonical hashes - PASS (with a one-authority violation)

The pinned algorithm `sha256-canonical-json-v1` is specified completely at `src/lib/ping/digest.ts:1-60`: UTF-16 code-unit key sort applied recursively, no whitespace, array order semantic, JSON.stringify string escaping, NaN/Infinity become null, -0 becomes 0, undefined-valued keys emitted as `"key":null`, toJSON ignored, UTF-8 encode, SHA-256 hex lowercase. The file ships a shell reproduction recipe (`printf '%s' "$canonical" | sha256sum`) and claims byte-identical output to node:crypto proven by pinned vectors (`src/lib/ping/__tests__/digest.test.ts`). Packet id, proposal digests, and the write-boundary canonical payload digest use it.

**The violation:** the tree contains three digest formulations, not one, despite digest.ts's header claiming "lanes import, never re-implement":
1. `digest.ts` canonical-json-v1 (packetId, payload digests).
2. `dev-signer.canonicalizeJson` (`src/lib/ping/dev-signer.ts:46-59`), used for owner event ids. It DIFFERS: undefined-valued keys are dropped (line 51), not emitted as null. A record with an explicit undefined-valued key hashes differently under the two.
3. Plain `createHash('sha256')` over pipe-joined strings (MC event ids, mission ids, prompt digests).

All three are deterministic and reproducible, so the portability test still passes per formulation, but a future implementation must know which formulation each id used. The binding is documented at the call site for owner events (`owner-events.ts:13`, `:31`), which is what saves it. **Verdict stays PASS for reproducibility; the one-authority claim itself is FALSE** and should be corrected or narrowed to digest.ts.

## 6. Extension namespaces - FAIL

- **Evidence ref prefixes** (`obj:`, `field:`, `rel:`, `src:`, `ping-event:`, conflict `#` refs): formats are deterministic and parseable, but there is no registry of allowed prefixes and no admission rule for new ones. A future implementation cannot distinguish a canonical prefix from a lane-local invention except by reading code.
- **Journal event types:** free-form strings at admission. The gateway validates shape (`event_type` string, `event_data` object - `server.mjs:275-278`) but enforces no type vocabulary; only `FYD_SITE_OVERLAY` gets tenant binding rules (`server.mjs:285-295`). MC event types (`MC_MISSION_CREATED`, `MC_RUN_*`) are enumerated in `mc-dispatch.ts:139-146` but the gateway does not know that enum. Domain events and agent-ops events share one journal file (lane 15 conflation 3).
- **Namespace ownership:** the live gateway's `NAMESPACE_OWNERS` map has no `jev` entry, which is the current live incident (ledger). The map lives in the container, not the canonical tree (no hits in-tree). Lane 13 F6: the registered value is cosmetic (key existence only). There is no stated policy for registering a new namespace, and registration is a config/deploy act, not a reviewed code decision. **This is the dimension's clearest FAIL:** the namespace extension mechanism is ungoverned and already caused a live outage.
- **Capability kinds:** `KNOWN_CAPABILITY_KINDS` and `FORBIDDEN_AGENT_EFFECTS` sets in the compiler (`context-compiler.ts:734-740`); `AGENT_PROFILES` registry out-of-tree in the orca adapter. Extension means editing a set in one of several places, with no single owner.

## 7. Projection privacy - PASS

- Viewer tiers `anonymous | visitor | owner | staff | agent` (`context-compiler.ts:60`); owner-identity verification with downgrade to visitor on mismatch (`:88-97`); agent delegation resolves to owner or visitor (`:94`, `:731-733`); `visitor`/`anonymous` get `public-only` rules (`:97`); visibility filtering at assembly, never prompt-side (`:636`); secret-shaped fields stripped at Stage 1 (G7); `hiddenInPublic` flags; `stripInternalIds` on user-facing text (`ask-composer.ts:789`); exclusion ledger is counts-only with an explicit non-inference rule (`context-compiler.ts:772-779`).
- FACT vs VISIBILITY separation is a locked semantic in `src/fyd/owner-mode/visibility-policy.ts` (lane 15); HIDE never changes the fact value.
- Dispatch viewer resolves to the visitor tier, so dispatch packets carry public claims only (ledger dispatch note; compiler agent-delegation rule at `:731-733`).
- Honest demo labeling: the overrides route states it has no production authentication behind a one-class seam (lane 15).

**Caveat carried, not a fail:** the two `classificationFromProvenance` implementations diverge (see dimension 11), so the same provenance kind can project different epistemic classes on different paths.

## 8. Evidence immutability - PASS

- Journal: append-only. Zero `delete` hits in `server.mjs`; no edit path; corrupt lines are skipped on index rebuild, never repaired in place (`server.mjs:41-43`, `mc-dispatch.ts:199-202` "never fabricate").
- Owner log: append-only; revert appends `owner.restored-fact`, correction stays (`owner-store.ts:12`); migration note at `:287` ("append-only; no history is deleted").
- Claims: immutable transitions returning new records; atomic tmp-file plus rename writes; invalid reads return null, never invented state (`claim/store.ts:74-76`, lane 15).
- Digest authority: the server computes the canonical payload digest; the client never supplies it (`write-boundary.ts:10-11`); same request_id plus same digest replays, same request_id plus different digest is 409 (`:12-13`).
- Gateway request_id dedupe: same tenant plus same request_id returns the original event_id with `deduped:true`, appends nothing, and cross-tenant reuse is rejected 400 with zero disclosure (`server.mjs:35`, `:320-324`).

## 9. Retraction / supersession / redaction / purge - PARTIAL (purge ABSENT)

- **Retraction: PRESENT.** Owner log: `owner.restored-fact` revert events (`owner-store.ts:224`, `:374`, `:553`). Claims: `release()` returns a claim to OBSERVED with the full history preserved (`machine.ts:159-169`). Journal: correction is a new overlay op; retraction of an overlay op surfaces the claim as UNKNOWN on recompile (contextpack patch attack-9 test, per ledger).
- **Supersession: PRESENT.** `provenance.supersedes` chains, chain-head-only apply (`corrections.ts:189-195`); newer assertion names the older one (`:12`); "supersedes chains are stable across replays" (`:60`).
- **Redaction: PARTIAL.** `redactEmail` exists in identity audit (`audit.ts:85`); secret-shaped fields are stripped at compiler Stage 1; the orca-adapter branch `security/secret-redaction-2026-09-28` exists out-of-tree. But no canonical redaction lifecycle was observed in-tree: no redacted-copy record that preserves the digest chain while withholding bytes. A future implementation would not know the sanctioned redaction procedure.
- **Purge: ABSENT.** No delete, unlink, or purge path found in the claim store, owner store, owner events, or journal gateway. Purge semantics are unspecified. Combined with append-only immutability, this means a future implementation cannot honor a deletion request without inventing policy. **For the portability test, purge is the dimension's FAIL.**

## 10. Relationship semantics - PASS (thin)

- Canonical relationship vocabulary exists as `PREDICATE_WEIGHTS` in the compiler (`context-compiler.ts:161-172`): provides/offers 0.9, employs/works_for 0.85, located_at 0.8, publishes/has_article/provided_by/published_by/authored 0.6, replies_to/references 0.5, partnered_with 0.4, has_note 0.2, unknown predicate 0.3. Legacy aliases kept with the same weight (G10).
- Epistemic standing: `relationship_fact` ranks 4 in the B3 table (`context-compiler.ts` rank table), and `rel:<relId>` refs are registry entries with classification.
- Structural semantics: relationships are active-only with both endpoints selected (per the G10/G12 design notes and lane 10); `rel:` evidence binds the relationship occurrence.
- **Thin:** the vocabulary lives as a weights table, not a registered schema; directionality and cardinality are not specified anywhere observed. A future implementation can reproduce the weights exactly, which is what the portability test asks.

## 11. Witness commitments - PASS (per surface, no unified primitive)

Witness commitments exist as digest bindings on every consequential surface:
- Packet: `packetId` commits to the full canonical body; `digests: {graph, siteSpec, searchIndex, packet}` (`context-compiler.ts:786-803`).
- Dispatch artifact: `context.json` carries `prompt_digest` (`route.ts:425-431`); the work order carries `input: {prompt, prompt_digest}` (`:397`).
- MC runs: `output_digest` on verified results (`mc-dispatch.ts:122`, `:385`).
- Results: `verifyResultEnvelope` requires exact echoes of work_order_id, context_pack_id, capability, and three-way agent binding; invalid results are non-retryable and can never reach canonical event authority (lane 14).
- Owner events: content-hash ids bound to seq and generator version (`owner-events.ts:122-135`).
- MC events: content-derived ids bound to kind, mission, type, and summary (`mc-dispatch.ts:181-184`).
- Approvals: exact-digest match before approval (`verifyProposalDigest`, lane 11 D-14).
- Grill-20 escalation records: per-check evidence lines in `escalation-log.jsonl`, filed for every run (decide or escalate).
- Jev shadow records: hashes only in canonical records (memory note).

**Gap:** there is no single witness primitive or witness log; commitments are per-surface conventions. A future implementation can verify each binding from the record alone, which satisfies the test, but it must discover each convention separately.

---

## Cross-dimension findings

1. **Two canonicalizers, two classification mappings.** `digest.ts` (sha256-canonical-json-v1) vs `dev-signer.canonicalizeJson` differ on undefined handling; `classificationFromProvenance` in `context-compiler.ts:180` vs `ask-composer.ts:140` differ on the `directory` and `owner` kinds and on the UNKNOWN casing. Both divergences are deterministic and documented at their call sites, so reconstruction is possible, but they violate the one-owner-per-decision rule and are exactly the kind of drift a future implementation would trip on. Converge or document the split explicitly.
2. **The live incident is a dimension-6 failure.** The missing `jev` entry in `NAMESPACE_OWNERS` is not a code bug; it is namespace-extension governance that does not exist. The fix needs the guards lane 13 named.
3. **Purge is the honest hole.** Everything else in the retention family is append-only by design; purge was simply never specified. If retention law ever requires deletion, the design decision is open, not documented.
4. **Random plus wall-clock ids are verify-only.** `fyd-ovl-*` event ids and minted `request_id`s cannot be re-derived. This is acceptable only because the archive's integrity rests on append-order and content digests, not on id reconstructibility. That assumption should be stated somewhere durable; today it is not.

## What would falsify this report

- Any cited file:line that does not match a clean checkout of 0264d517 (the worktree carried ~144 dirty files; all reads above were against HEAD-tracked content, but a clean-checkout replay is the real check).
- A namespace registry or extension policy document I did not find (would upgrade dimension 6).
- A purge or redaction lifecycle in a file I did not read (would upgrade dimension 9).
- A unified witness log or clock-discipline document I did not find (would strengthen 3 and 11).
- Proof that `dev-signer.canonicalizeJson` and `digest.ts` canonicalize are byte-identical on all inputs in practice (would dissolve the dimension-5 violation; the undefined-handling difference is in the code I read, so this is unlikely).
- A consumer that validates `CONTEXT_PACKET_VERSION` / `CLAIM_BINDING_VERSION` on read (would upgrade dimension 4).

## Open unknowns carried (not collapsed)

- Whether the two journal sink paths (in-tree `data/fyd-journal/events.jsonl` vs out-of-tree MC read path) converge (lane 15 unknown; affects dimension 8's archive claim).
- The nine unpushed constitutional-runtime commits (trunk @ 74fbb74) are not in this tree (lane 9); if they carry identity or digest authorities, the audit is incomplete.
- The orca-adapter `work_order_id` formulation was cited from lane 14, not re-read here.
- `verifyAnswerClaims` has zero production callers (lane 10): the B3 epistemic-rank witness is declared-only until wired.

---
*Read-only audit. No canonical tree modified, no processes restarted, no credentials touched. This report is a hypothesis until replayed from a clean checkout.*
