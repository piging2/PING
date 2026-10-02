# Ask FYD Outcome-History Contract (design)

**Date:** 2026-09-30, night shift (read-only design; no implementation)
**Backlog item:** `askfyd-outcome-history` (BACKLOG_PING.md line 205, P3, OPEN): "Ask FYD answer history / outcome tracking is not part of the current contract."
**Purpose:** Support the FYD owner loop (correct / hide / feature) with a contract for recording what happened to an Ask FYD answer, without touching the website synthesis, the owner loop implementation, or any crew lane.
**Status of this doc:** Proposal. Nothing here is built. All record shapes are proposed, all open questions are lane decisions.

## 1. Grounding: what already exists

### 1a. The Ask FYD answer contract (pinned)

`~/workspace/fyd-build/src/fyd/ask/types.ts` defines `AskFydAnswer` with pinned top-level keys only:

- `answer` (string), `evidence` (EvidenceCitation[]), `unknowns` (string[]), `availableActions` (string[]), `proposal` (always null in this lane), `refusal` (boolean), `conflicts` (AskConflictSurface[]), `graphSnapshot` ("sha256:<hex>" pin of the ObjectGraph the answer was composed against, FYD-024), `stale` (serve-time freshness flag).

The lane is deterministic and template-based: one builder (`src/fyd/ask/context-builder.ts`), one composer (`src/fyd/ask/answer.ts`), no LLM calls, no network. Agent boundary law: `availableActions` names read/ask affordances only; nothing authorizes publishing, messages, purchases, advertising, provider actions, or business-data mutations.

The input contract `AskFydContextInput` is bounded: the builder rejects any extra top-level key and deep-scans for forbidden keys (`rawHtml`, `crawlerDump`, `secretNotes`, `providerToken`). Private context never enters the agent boundary.

### 1b. The FYD-010 field-level privacy gate (closure evidence)

`~/workspace/goals/ping-agent-execution-stack/hidden_files/backlog-burn-2026-09-27/fyd-010-closure.md` records a PASS closure (2026-09-27, fyd-build working copy, branch `fyd-010-field-gate`, 13 tests, 210/210 lane suite, served-path proof on ephemeral :3199 with zero owner-field values in visitor JSON):

- `src/fyd/visibility/policy.ts`: `VISITOR_VISIBLE_FIELDS` pinned allowlist (claimKind, source_url, source_type, source_digest, observed_at, evidence_ref, title, description, website, area_served, service_key, service_href). `maySeeField(fieldName, viewer)`: visitor sees allowlist only; demo_owner sees everything; unknown mode sees nothing (fail closed). `filterObjectFieldsForViewer`: pure projection, hidden keys absent, input not mutated.
- The gate HIDES fields (removes them), never rewrites or coarsens a value. The suppression-shape decision (how a suppressed value renders) is Nolan's pending D-SHIP decision and was deliberately not made.
- `src/fyd/ask/context-builder.ts` applies the gate to targetObject and every relatedObject on the non-owner branch; the builder also filters loaded conflicts to open + entity-matching + field-visible, so an owner-only field conflict never enters the visitor context.
- `AskViewer.mode` is "visitor" | "demo_owner". demo_owner is a demo-surface label, not an authorization upgrade.

**Backlog-state caveat (not resolved here):** BACKLOG_PING.md still lists FYD-010 as OPEN while the 2026-09-27 burn layer records it DONE_VERIFIED with full proof (flagged as contradiction F1 in the 2026-09-30 night-shift triage). This contract composes with the FYD-010 gate as designed and proven; which backlog layer is canonical is the owning lane's call, not this doc's.

### 1c. Owner-loop records this contract can reference

- FYD-018 (BACKLOG_PING.md line 221): owner correction record shape (target, before, after, classification, timestamp, actor), partially proven via tests.
- THREE-STATE law (directive 7): OBSERVED WORLD / OWNER INTENT / GENERATED PRESENTATION are distinct states; CONFIRM / CORRECT / HIDE / SHOW / FEATURE / REORDER are typed owner operations.
- FYD-024: graphSnapshot pinning with serve-time staleness detection (`withSnapshotFreshness`).

## 2. Design intent

The outcome-history contract records **receipts and reactions**, not facts:

- WHAT the answer was (a digest-linked reference to the composed answer, never a second copy of its content).
- WHETHER it was presented, to whom (viewer mode), and against which graph snapshot.
- WHAT the owner did about it (typed feedback events referencing owner correction records), and what later invalidated it (regen supersession).

It is a journal, not a second authority. Business facts live in the graph and evidence plane; the journal never asserts a fact. This keeps the xcut no-second-authority audit (BACKLOG_PING.md line 204) satisfied by construction: the journal stores digests and references, never field values that could be read as truth.

## 3. Record shape

### 3a. `AskFydOutcomeRecord` (proposed)

Minted once per served answer instance, appended to with outcome events. Fields are pinned; unknown fields are rejected, mirroring the builder's bounded-input law.

Identity section:

- `recordId`: stable reference for this record. Proposed as a deterministic digest over (`questionDigest`, `graphSnapshot`, `servedAt`), NOT a new UUID authority. Whether this is acceptable under the frozen identity ruling is open question Q2.
- `questionDigest`: `sha256` of the normalized question string. Never the raw question (see privacy hook P3).
- `viewerMode`: "visitor" | "demo_owner". Copied from the AskViewer that received the answer.
- `targetObjectId`: id of the object asked about.
- `graphSnapshot`: the same "sha256:<hex>" pin stamped on the answer (FYD-024). Carries no field values.

Answer linkage (composition with the answer contract):

- `answerDigest`: digest over the canonical bytes of the composed `AskFydAnswer`. One-way link: record -> answer. The answer contract is unchanged; the journal holds no answer text.
- `citations`: array of `{ n, objectId, claimClass }`, referencing the answer's `evidence` array by citation index `n`. No source strings copied.
- `unknownsCount`: integer; plus `unknownsDigest` (digest of the joined unknowns list). Raw unknown labels are question-derived and stay out of the record.
- `conflictsSurfaced`: array of `{ conflictId, winnerClaimId }`, referencing the answer's `AskConflictSurface` entries. The Conflict record itself (generation-side artifact) is never copied.
- `staleAtServe`: boolean, the `stale` flag value at serve time.

Outcome section (append-only events after mint):

- `presentedAt`: timestamp the answer was served to the viewer. Minting the record IS the presentation receipt.
- `terminal`: pinned vocabulary, exactly one: `ANSWERED` | `ANSWERED_WITH_UNKNOWNS` | `REFUSED` | `SUPERSEDED_BY_REGEN`. (Whether the owner loop needs more, e.g. `CORRECTED_BY_OWNER`, is open question Q5.)
- `ownerFeedback`: ordered list of typed events, each `{ op, target, correctionRef, actor, at }`:
  - `op` in { CONFIRM, CORRECT, HIDE, SHOW, FEATURE, REORDER } (the THREE-STATE typed ops).
  - `target`: what the op acted on, as a reference (field name, claim id, object id), never a value.
  - `correctionRef`: optional reference to the FYD-018 owner correction record. The correction record owns before/after; the journal only points at it.
  - Digests of values where a digest is needed for correlation; raw owner-only values never enter.
- `supersededBy`: null while current; when a regen produces a newer graph snapshot for the same `questionDigest`, the `recordId` of the newer record. Marking only; the older record is never mutated beyond this pointer (three-state law applied to the journal).

### 3b. Field table

| Field | Type | PII / sensitivity | Why it exists |
|---|---|---|---|
| `recordId` | string (digest) | none | stable reference; no new identity authority (Q2) |
| `questionDigest` | string (sha256) | none stored; digest of possibly-PII input | correlate repeat questions without keeping raw visitor text (P3) |
| `viewerMode` | "visitor" \| "demo_owner" | operational | gating differs by mode; demo outcomes are not production evidence (P4) |
| `targetObjectId` | string | none (id only) | which object was asked about |
| `graphSnapshot` | "sha256:<hex>" | none | replay + staleness semantics, carried over from the answer contract |
| `answerDigest` | string (digest) | none | one-way link to the composed answer; no content copy |
| `citations` | [{n, objectId, claimClass}] | none | which citations the answer carried, by index |
| `unknownsCount` | integer | none | gap signal for the owner loop |
| `unknownsDigest` | string (digest) | none | correlate identical gap sets across records |
| `conflictsSurfaced` | [{conflictId, winnerClaimId}] | none | which open conflicts the answer flagged |
| `staleAtServe` | boolean | none | was the answer served against a newer graph |
| `presentedAt` | timestamp | operational | the presentation receipt |
| `terminal` | pinned enum | none | lifecycle state of the record |
| `ownerFeedback` | ordered event list | references only | typed owner reactions; values live in correction records |
| `supersededBy` | recordId \| null | none | regen invalidation pointer |

What is deliberately absent: raw question text, raw answer text, any field value (business or owner), raw before/after correction values, visitor identity beyond mode.

## 4. Privacy gating hooks (composing with FYD-010)

- **P1. Mint after the gate.** The outcome record is minted at or after answer composition, in the layer where `filterObjectFieldsForViewer` has already run. The record therefore never observes an owner-only field value. This mirrors the FYD-010 finding that the leak was in the context, not the composer: the journal sits downstream of the same fixed boundary.
- **P2. `maySeeField`-aware serialization.** If any surface ever serializes an outcome record for a viewer (e.g. an owner dashboard showing "what visitors asked"), that serialization applies the same field gate the builder uses. The record's fields are digests and references by design, so the gate is a no-op today; the hook exists so a future field addition cannot silently leak.
- **P3. Question text is never stored.** Visitor questions may contain PII ("my address is ..."). The record keeps `questionDigest` only. Any lane wanting raw question retention for owner review must treat it as a new data-collection decision (open question Q3; likely Nolan's call).
- **P4. Mode segregation.** `demo_owner` outcomes are labeled demo and must not feed owner-loop learning as production evidence. demo_owner is a label, not authorization; its outcomes describe demo behavior, not visitor behavior.
- **P5. Unknown mode fails closed.** If the viewer mode is anything other than the two known modes, no outcome record is minted. The builder already closes at the context layer; record minting follows the same rule so the journal cannot contain answers that were never legitimately servable.
- **P6. No suppression-shape choice.** The D-SHIP rendering decision (whole-value suppression vs substring redaction) is Nolan's and still pending. Outcome records must not encode or imply a suppression rendering.

## 5. Composition with the existing answer contract

- **Additive, not altering.** `AskFydAnswer` keeps its pinned keys. The outcome history is a separate journal linked by `answerDigest` + `graphSnapshot`. No change to the composer, the builder, or the renderer is required by this contract (wiring the mint call is implementation, owned by the fyd lanes).
- **Reference, never copy.** Conflicts are referenced by `conflictId` (+ `winnerClaimId`); the Conflict record stays generation-side. Citations are referenced by index into the answer's `evidence` array. Evidence authority is untouched: the journal never re-asserts a cited fact.
- **Snapshot semantics carry over.** FYD-024 pinning means an outcome is always interpretable against the exact graph snapshot that produced it. Replay of an outcome = recompose the answer from the same snapshot + viewer mode and compare digests (open question Q8 on whether the owner loop needs this).
- **Tenant scoping.** Owner feedback and correction references are tenant-scoped per the owner-tenant law (FYD approval digest binding is tenant-scoped; owner corrections inherit the same boundary). The journal must be partitioned by tenant; cross-tenant outcome reads are rejected (open question Q6 on storage mechanics).
- **Agent boundary law preserved.** Outcome records describe read/ask receipts and owner reactions. They never record an authorized external effect, because the ask lane authorizes none. If the lane ever gains an action surface, the terminal vocabulary needs a new class (do not silently reuse `ANSWERED`).
- **Relation to Ask FYD "unknowns".** The `unknowns` array on the answer is the honesty mechanism (no evidence -> say so). The outcome record's `unknownsCount`/`unknownsDigest` turn those honesty signals into an owner-loop work queue: repeated identical unknown digests across visitor records = candidate content the owner could add. The raw unknown labels are not needed for this; digests suffice.

## 6. Non-goals and boundaries

- Not a fact store, not an evidence store, not a second authority on anything the graph already owns.
- Does not resolve the FYD-010 backlog-status contradiction (flagged in triage; owning lane's call).
- Does not design the owner-loop feedback surface itself (which UI emits CONFIRM/CORRECT/HIDE on an answer); it only defines the event envelope the ask lane would consume.
- Does not touch website synthesis, the FYD owner loop implementation, crew lanes (FOCUS-1..10, BUG-0001, C1 perfecting pass), or any standing file.

## 7. Open questions for the fyd lanes

- **Q1. FYD-010 canonical status.** BACKLOG_PING.md lists FYD-010 OPEN; the 2026-09-27 burn layer records DONE_VERIFIED with served-path proof. Which layer does this contract target for its privacy-gate composition? The hooks above assume the gate as built; if the lane re-opens FYD-010, P1/P2 need re-verification.
- **Q2. Record identity.** Is a deterministic digest over (`questionDigest`, `graphSnapshot`, `servedAt`) an acceptable `recordId` under the frozen identity ruling, or must record identity come from an existing identity primitive? No new identity authority may be created; the answer determines the minting site.
- **Q3. Raw question retention.** Is there an owner-legitimate need to keep raw visitor question text (e.g. for the owner to see what visitors ask)? Default proposed: digest-only. Raw retention is a new privacy decision and likely needs Nolan's explicit call, with retention window and access control specified.
- **Q4. Feedback ingestion envelope.** Which surface emits owner feedback events on answers, and what is the exact event envelope the ask lane consumes? FYD-018 gives the correction record shape; does the ask journal reference correction records by id, or does the owner loop push a normalized event?
- **Q5. Terminal vocabulary.** Is `ANSWERED / ANSWERED_WITH_UNKNOWNS / REFUSED / SUPERSEDED_BY_REGEN` the right pinned set, or does the owner loop need classes like `CORRECTED_BY_OWNER` / `HIDDEN_BY_OWNER`? Note overlap risk with `ownerFeedback` events: terminal should describe the record lifecycle, not duplicate the feedback list.
- **Q6. Storage, tenancy, retention.** Where does the journal live (existing store vs new), how is it partitioned by tenant, what is the retention window for visitor outcome records, and who may read them? Privacy authority is a standing FYD P0; visitor-derived records need an explicit read policy.
- **Q7. demo_owner outcomes.** Excluded from owner-loop learning entirely, or labeled but usable for surface testing? Proposed: labeled demo, never production evidence.
- **Q8. Replay requirement.** Does the owner loop need outcome replay (recompose answer from `graphSnapshot` + `viewerMode`, compare `answerDigest`)? If yes, the composer must stay deterministic and version-pinned; if no, `answerDigest` is correlation-only.
- **Q9. Aggregation boundary.** Is per-record journaling enough, or does the owner loop need a defined aggregation (e.g. per-questionDigest rollups of unknownsCount)? If rollups are needed, where do they live so they do not become a competing derived-truth store?

## 8. Suggested acceptance shape (for the lane that picks this up)

1. A test constructs an `AskFydAnswer` through the real builder + composer for a visitor, mints an outcome record, and asserts: no raw question text, no answer text, no field values anywhere in the record; `questionDigest` matches sha256 of the question; `answerDigest` matches the digest of the composed answer; `graphSnapshot` equals the answer's pin.
2. Same flow with a fixture carrying owner-only fields (phone, home_address): assert the record contains zero owner-field values (mirrors the FYD-010 CASE A probe).
3. Owner feedback append: a CORRECT event referencing a correction record; assert the journal holds the reference, not the before/after values.
4. Regen supersession: a second record with the same `questionDigest` and a newer `graphSnapshot` sets `supersededBy` on the first; assert the first record's other fields are unmodified.
