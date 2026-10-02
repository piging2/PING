# @piging2/ask

Ask FYD: deterministic, evidence-backed question answering over the object
graph, plus the WHY THIS provenance primitive. No LLM, no I/O, no new
runtime dependencies.

Proof 3: "What services does this business offer, and how do you know?"
answered from evidence for Happy Place and Coppersmith through the
identical `askFyd()` machinery. Proof 4: `whyThis(factRef, graph)` returns
the source, the observation record, the evidence type, and the
classification for one visible fact, using the same citation machinery
the answerer stands on.

## Layout

- `src/types.ts` - ask contracts (AskInput, AskAnswer, claim vocabulary,
  WHY THIS types). Vocabulary decision documented in the file header.
- `src/viewer.ts` - the viewer boundary: fail-closed viewer
  classification, public-only projection, fail-closed field allowlist.
  Enforced in code, not comments.
- `src/classify.ts` - mechanical mapping from the extraction vocabulary
  (DIRECT_FACT, DERIVED_FACT, INFERENCE, GENERATED_COPY, USER_OVERRIDE,
  website_statement) to the ask vocabulary (DIRECT / DERIVED / INFERRED).
- `src/cite.ts` - `citeFact`, the single citation primitive, and
  `whyThis`, its public surface. Proof 4.
- `src/answer.ts` - `askFyd`, the mechanical answerer. One intent in this
  slice (the services question); anything else is refused.
- `test/ask-proof3.test.ts`, `test/whythis-proof4.test.ts` - the proofs.

## Harvest verdicts

| File | Source | Verdict |
| ---- | ------ | ------- |
| `src/types.ts` | `src/lib/ping/types.ts` (AskClaimClassification, AskEvidenceRef), `src/fyd/ask/types.ts`, `src/fyd/ask/contract.ts` | ADAPT: re-expressed for the piging2 object shape; vocabulary decision documented |
| `src/viewer.ts` | `src/fyd/ask/context-projection.ts`, `src/fyd/ask/visitor-safe-fields.ts` | ADAPT: owner-decision and conflict layers deferred to proofs 6+; public projection + safe-field choke point preserved |
| `src/classify.ts` | `src/fyd/ask/visitor-answer.ts` (claimClassFor, basisForClassification) | ADAPT: 5-class citation vocabulary re-expressed as DIRECT / DERIVED / INFERRED |
| `src/cite.ts` | `src/fyd/ask/visitor-answer.ts` (citationFor) | ADAPT: becomes the shared primitive for answer citations and WHY THIS |
| `src/answer.ts` | `src/fyd/ask/visitor-answer.ts` (answerAskFyd refusal shape), `src/fyd/ask/answer.ts` (refusalAnswer) | ADAPT: only the deterministic core; the composer/LLM layers are later proofs |
| `src/index.ts`, tests, scaffolding | - | NEW |

REJECTED for this slice (not needed to close proofs 3-4): the general
question composer (`lib/ping/ask-composer.ts`), site-patch intents,
capabilities/grants, field conflicts, owner visibility decisions, the
route layer, the React widget.

## Decisions

- Vocabulary: DIRECT / DERIVED / INFERRED / UNKNOWN. UNKNOWN is the
  answer state on refusal, never a claim class. Mapping documented in
  `src/types.ts` and implemented in `src/classify.ts`.
- Boundary: visitors see public objects only. The projection does not
  widen for owners today (the source's zero-canary rule); the owner
  class is a verified hook that grants nothing here.
- Refusal: "FYD does not have evidence ..." with the unsupported topic in
  `unknowns`. No filler, no invented business copy.
