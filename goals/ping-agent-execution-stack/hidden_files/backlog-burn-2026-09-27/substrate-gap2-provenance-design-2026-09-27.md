# Substrate Gap 2 design — shared typed provenance reference
Date: 2026-09-27 ~11:45 MDT | Item: substrate Gap 2 (recon 2026-09-27, ranked #2)
Status: DESIGN ONLY. No code changed, no branches, no commits, no Pig writes,
no credential access, no HPP original contact. Read-only survey of the
surfaces reachable from this VM. Pig transport is down (recon UNKNOWN), so
all Pig-side state below is marked UNKNOWN, never inferred.

Model: this design follows the Gap-3 closure pattern
(substrate-gap3-journal-identity-2026-09-27.md): single authority module,
typed fail-closed behavior, probe proof, adoption by callers.

## 1. Provenance vocabulary catalog (observed, this VM)

Every ad-hoc provenance shape found. Each entry: producer -> shape ->
file:line. These are the producers the authority must cover or explicitly
map; anything not listed here was not found in the survey.

### 1a. Journal-forced object provenance (Python, dump.py)
- add_object forcing: `new_o["provenance"] = {"kind": "canonical-journal",
  "ref": "ping-event:" + eid, "derivedAt": ev["timestamp"]}`
  `fyd-lane/dump.py:446-450`
- set_field / deactivate_object mutation trail (untyped dict, no kind):
  `prov = o.setdefault("provenance", {})`,
  `refs = prov.setdefault("updatedRefs", [])`,
  `ref = "ping-event:" + eid` appended
  `fyd-lane/dump.py:436-439`, `fyd-lane/dump.py:468-470`
- Presentation-intent block (composite record, digest-verified like the graph):
  `{"kind": "owner-presentation-intent", "note": <long prose>,
  "eventIds": [d["approval"]["eventId"] for d in presentation_intents]}`
  `fyd-lane/dump.py:543-548`
- add_relationship forces `new_r["evidenceRef"] = "ping-event:" + eid`
  (evidence ref, not a provenance record, but same ref scheme)
  `fyd-lane/dump.py:460`

### 1b. Overlay emit placeholder (Python, lane-e)
- emit-overlay.py builds ops whose object provenance is
  `{"kind": "canonical-journal", "ref": "pending-emit",
  "derivedAt": "2026-09-21T00:00:00.000Z"}` and relationship evidenceRef
  `"pending-emit"` — an ad-hoc placeholder resolved only because dump.py
  FORCES provenance on add_object at apply time.
  `fyd-lane/lane-e/emit-overlay.py:173-174,181`
- lane-e/proof.py reads `svc.get("provenance").get("ref")` untyped to build
  evidenceRef maps. `fyd-lane/lane-e/proof.py:69`

### 1c. Served object provenance (TypeScript, fyd-build)
- `PingObjectProvenance { kind: "website-derived" | "overlay-authored",
  ref: string, derivedAt: string }`, ref e.g. `"website-ingestion:<url>"`
  `fyd-build/src/lib/ping/types.ts:18-33`
- Legacy lane-C mirror with a NARROWER union (drift already observable):
  `ObjectProvenance { kind: "canonical-journal" | "website-derived",
  ref: string, updatedRefs?: string[], derivedAt: string }`
  `fyd-lane/lane-c/work/ping-types.ts:91-97`
  (This is exactly the Gap-2 failure in miniature: two PingObjectProvenance
  shapes, mutually incompatible kind unions, no shared owner.)
- proceduralize builds `{ kind: "website-derived" as const,
  ref: "website-ingestion:" + sourceUrl, derivedAt: nowIso }` inline
  `fyd-build/src/fyd/proceduralize/proceduralizer.ts:382-386`
- media attach builds `{ kind: "website-derived",
  ref: "fyd-media:" + m.provenance.sourceUrl, derivedAt: m.provenance.observedAt }`
  and relationship `evidenceRef: "fyd-media:" + sourceUrl`
  `fyd-build/src/fyd/media/attach.ts:45-49,77`
- owner corrections rewrite: `target.provenance = { ...target.provenance,
  kind: "overlay-authored" }` (kind flip in place, no ref change)
  `fyd-build/src/fyd/owner/corrections.ts:158`

### 1d. Media observation provenance (TypeScript, media authority)
- `MediaProvenance { sourceUrl, sourcePage, observedAt, redirectChain?,
  fetchNote? }` — raw observation fields; the graph-bound form is 1c.
  `fyd-build/src/fyd/media/types.ts:56-66`

### 1e. Regen change provenance (TypeScript, FYD-022)
- `ProvenanceCause = "source" | "owner" | "generated" | "unknown"`
- `ValueProvenance { objectId, field, cause, unknownReason?,
  oldValue, newValue, evidenceRef }` — metadata ABOUT a regen, never a
  mutation of source observations. evidenceRef schemes: `"obs-<id>"`
  (V2 observation), `"owner-decision:<digest>"`, `"derivation:<inputs>"`,
  `""` iff cause is "unknown" (unknownReason then required).
  `fyd-build/src/fyd/regen/regenerate.ts:201-228,423-444`
- Cause semantics documented in prose at
  `fyd-build/src/fyd/regen/regenerate.ts:190-200`

### 1f. Refresh observation/snapshot provenance (TypeScript)
- `Observation.provenance: "real" | "synthetic"` and
  `Snapshot.provenance: "real" | "synthetic"` — observation-level label,
  not a {kind, ref} record. `fyd-build/src/fyd/refresh/types.ts:46,73`
- `SourceKind = "website" | "facebook" | "synthetic"`;
  `ClaimGrade = "website_statement" | "provider_statement" | "synthetic_fixture"`
  `fyd-build/src/fyd/refresh/types.ts:15-21`
- website-observe.ts stamps `provenance: "real"` (`:146`); facebook-source.ts
  stamps `"synthetic"` (`:107`) and `"real"` (`:162`) per source.

### 1g. Content classification bridge (TypeScript, FYD-038)
- `ContentClassification = "WEBSITE_STATEMENT" | "DEMO_SYNTHETIC"`,
  `contentClassificationOf(kind)`: `"overlay-authored"` -> DEMO_SYNTHETIC,
  else WEBSITE_STATEMENT.
  `fyd-build/src/fyd/components/renderer.tsx:165-173`
- `claimClassificationForContent(content, {ownerAuthored})`: explicit typed
  bridge from content-provenance to claim classification (NOT the same
  vocabulary; the FYD-026 lesson).
  `fyd-build/src/fyd/claims/claims.ts:190-215`

### 1h. Evidence ref conventions (TypeScript)
- Observation sourcePointer is always `"web:sha256:<digest>"`; citing
  object's `fields.source_digest` is `"sha256:<digest>"`; equality rule
  `sourcePointer === "web:" + source_digest`
  `fyd-build/src/fyd/evidence/refs.ts:28-33`, validator at `:222`
- `BUSINESS_CITATION_REF = "<business>"` sentinel
  `fyd-build/src/fyd/evidence/refs.ts:49`
- `SERVICE_CARDS_PREFIX = "service-cards:"`
  `fyd-build/src/fyd/evidence/refs.ts:51`
- why-this field triple: `sourceRef: object.provenance.ref` (the triple
  consumes the 1c record directly)
  `fyd-build/src/fyd/why/field-triple.ts:82,214`
- sitespec: `FYDSpecProvenance { source: "website-ingestion",
  claimKind: "website_statement", eventSequences?, note }`
  `fyd-build/src/fyd/sitespec/types.ts:110-116`

### 1i. Explicitly different capabilities (same word, different authority;
the design NAMES them so no future pass absorbs them by accident)
- absorb binding-verifier: `provenance?: number | null` — an EVIDENCE RANK
  WEIGHT (confidence x provenance), not source provenance.
  `fyd-lane/absorb/src/binding-verifier.ts:54,242-243`
- claim/ identity: `authNote: string` — "honest provenance: how this
  identity was established" — identity establishment, different authority
  (recon: claim/ vs PING identity are different capabilities).
  `fyd-lane/claim/types.ts:36-37`
- h2-build social: `FydSocialState.source: "ping_events"` — whole-state
  projection-source marker, different granularity (state, not fact).
  `fyd-lane/h2-build/readers.ts:207-211`

### Ref schemes observed (complete)
`ping-event:<event_id>` | `website-ingestion:<url>` | `fyd-media:<url>` |
`web:sha256:<digest>` | `obs-<id>` | `owner-decision:<digest>` |
`derivation:<inputs>` | `service-cards:<...>` | `<business>` |
`pending-emit` (placeholder; must fail closed under the authority)

## 2. The authority design

### 2.1 Module and language decision
- Canonical authority: `fyd-lane/provenance_ref.py`, version
  `provenance-ref@1.0.0` — the substrate operator plane, following the Gap-3
  precedent exactly (journal_identity.py). Justification: the write-side
  forcing producer (dump.py, which also computes the graph digest every
  other surface re-verifies) is Python; the authority that types what the
  dump forces belongs next to the dump.
- Served port: `fyd-build/src/lib/ping/provenance-ref.ts` (co-located with
  the existing PingObjectProvenance in `src/lib/ping/types.ts`, the module
  the served object shape already imports). The served code cannot import
  Python at runtime and the operator scripts cannot import TS; two
  implementations are unavoidable.
- The Gap-1 failure (competing implementations, zero conformance pin) is
  prevented structurally: the Python module is the constitutional
  definition; the TS port MUST pass the cross-language conformance probe
  (Section 4, probe P3) asserting byte-identical canonical strings and
  identical typed error codes for the full fixture corpus. Drift fails the
  probe, not the review.
- Alternative recorded and rejected: TS-canonical (10+ TS producers vs 3
  Python). Rejected because the forcing producer and the digest boundary
  are Python; the write side owns the contract, the read side conforms.
  The conformance probe makes the choice low-stakes.

### 2.2 The record shape
The authority owns ONE record: the answer to "where did this fact come
from?" at object and directive granularity.

```python
class ProvenanceRef:            # immutable value object
    kind: ProvenanceKind        # closed vocabulary, Section 2.3
    ref: str                    # ref-scheme-typed pointer, Section 2.4
    derived_at: str | None      # ISO 8601 derivation time; None only when
                                # the producer never recorded one
    updated_refs: tuple[str, ...]  # mutation trail; only for kind
                                # canonical-journal; schemes restricted to
                                # ping-event: (covers dump.py 1a set_field path)
    def canonical(self) -> str  # Section 2.6
    def to_record(self) -> dict # the served dict form, Section 2.7
```

The served dict form (`to_record`) reproduces the existing shapes
byte-identically: `{"kind", "ref", "derivedAt"}` plus optional
`"updatedRefs"`. Key order is irrelevant (canonicalize sorts recursively),
so existing projections are reproduced exactly. The composite
owner-presentation-intent BLOCK (`{"kind","note","eventIds"}` at
dump.py:543-548) is a separate constructor (Section 2.5), not a ProvenanceRef.

### 2.3 Closed kind vocabulary
Kinds name the ASSERTING AUTHORITY (who stands behind the fact), never the
file format. Closed: the authority's constructor rejects anything else
(typed UNKNOWN_KIND).

| kind | meaning | ref schemes allowed |
|---|---|---|
| `canonical-journal` | asserted by a PING journal event | `ping-event:` |
| `website-derived` | extracted from the business's own website or its fetched media | `website-ingestion:`, `web:sha256:`, `obs-`, `fyd-media:` |
| `owner-authored` | owner correction/authored content | `owner-decision:`, `ping-event:` |
| `owner-presentation-intent` | directive, NOT a source fact (block form only) | `ping-event:` (eventIds list) |
| `generated` | derived/computed, no new observation behind it | `derivation:` |
| `synthetic` | demo/test content, never presented as real | `fixture:`, `synthetic:` |
| `unknown` | changed but unattributable; `unknown_reason` REQUIRED, ref MUST be empty | (none) |

Design notes:
- `media-derived` was considered and FOLDED into `website-derived`: the
  distinction is evidentiary (fetch pipeline vs parse pipeline), preserved
  in MediaProvenance (1d) and distinguishable by the `fyd-media:` scheme;
  the graph-bound record does not need a separate kind, and
  contentClassificationOf's WEBSITE_STATEMENT branch is correct for media.
- No `facebook-derived` kind: facebook-source stamps real observations from
  the business's authorized page — that is `website-derived` with
  `obs-`/URL refs under the refresh SourceKind="facebook" label, which the
  mapping table preserves. A new kind is added only with a new asserting
  authority, never for a new transport.
- `owner-presentation-intent` exists ONLY in block form (note + eventIds);
  it must never appear as an object-level kind (it is a directive layer,
  dump.py's PRESENTATION INTENT comment is the rationale).

### 2.4 Constructors (the only way to build a record)
Every constructor validates scheme + non-emptiness and raises typed
ProvenanceError on violation (Section 2.8).

- `journal_event(event_id: str) -> ProvenanceRef`
  kind=canonical-journal, ref=`ping-event:<event_id>`. Replaces the inline
  dict at dump.py:446-450 and emit-overlay.py:173-174.
- `journal_updated(event_id: str) -> ProvenanceRef` (mutation-trail form)
  returns a ProvenanceRef with updated_refs=(`ping-event:<event_id>`,);
  the dump's `setdefault("provenance", {})` untyped path is replaced by
  appending to `updated_refs` through the authority. Replaces
  dump.py:436-439, 468-470.
- `website_ingestion(url: str) -> ProvenanceRef`
  kind=website-derived, ref=`website-ingestion:<url>`. Replaces
  proceduralizer.ts:382-386.
- `website_observation(obs_id: str) -> ProvenanceRef`
  kind=website-derived, ref=`obs-<obs_id>`. For regen "source" evidence and
  ask-composer V2 observation refs.
- `website_snapshot(digest: str) -> ProvenanceRef`
  kind=website-derived, ref=`web:sha256:<digest>`. For acquisition/evidence
  sourcePointer vocabulary (1h).
- `media_source(url: str, observed_at: str) -> ProvenanceRef`
  kind=website-derived, ref=`fyd-media:<url>`. Replaces media/attach.ts:45-49.
- `owner_decision(digest: str) -> ProvenanceRef`
  kind=owner-authored, ref=`owner-decision:<digest>`. For regen "owner"
  evidence and owner corrections.
- `owner_intent(event_ids: list[str], note: str) -> dict`
  the composite intent BLOCK, byte-identical to dump.py:543-548.
- `generated(derivation_inputs: str) -> ProvenanceRef`
  kind=generated, ref=`derivation:<inputs>`. For regen "generated".
- `synthetic(fixture_id: str | None) -> ProvenanceRef`
  kind=synthetic, ref=`fixture:<id>` or `synthetic:fixture`. For refresh
  synthetic observations and ClaimGrade synthetic_fixture content.
- `unknown(reason: str) -> ProvenanceRef`
  kind=unknown, ref="", unknown_reason=reason. Raises
  UNKNOWN_REASON_MISSING if reason is empty — the FYD-022 honesty rule
  ("ambiguous cause is an honest unknown + reason, never a guess") is
  enforced by the constructor, not by prose.
- `parse(canonical: str) -> ProvenanceRef` — inverse of `canonical()`;
  raises UNPARSEABLE / UNKNOWN_KIND / MALFORMED_REF.
- `validate(record: dict) -> ProvenanceRef` — validates a deserialized
  record (from a journal event or a projection JSON) and returns the typed
  form; raises on any violation. This is the read-side gate.

### 2.5 Legacy mapping table (the ONLY translation layer)
Lane-local vocabularies are NOT rewritten; they translate through ONE
mapping owned by the authority. No caller translates kinds itself.

- `from_legacy("refresh", "real", ref_hint) -> ProvenanceRef`:
  "real" -> website-derived, ref=`ref_hint` (the observation's
  sourcePointer or sourceUrl; required, else MALFORMED_REF).
  "synthetic" -> synthetic(fixture_id=ref_hint).
- `from_legacy("regen-cause", cause, evidence_ref, unknown_reason=None)`:
  "source" -> scheme dispatch on evidence_ref prefix:
  `obs-` -> website_observation; `ping-event:` -> journal_event;
  `web:sha256:` -> website_snapshot; empty/unmatched -> MALFORMED_REF.
  "owner" -> owner_decision(digest after `owner-decision:`).
  "generated" -> generated(inputs after `derivation:`).
  "unknown" -> unknown(unknown_reason) (UNKNOWN_REASON_MISSING if absent).
- `from_legacy("content-classification", "WEBSITE_STATEMENT"|"DEMO_SYNTHETIC",
  {owner_authored})`: WEBSITE_STATEMENT -> website-derived
  (ref required from the object); DEMO_SYNTHETIC ->
  owner_authored ? owner-authored : synthetic.
- `from_legacy("claim-grade", "synthetic_fixture", fixture)` -> synthetic.
  ("website_statement"/"provider_statement" are claim grades, not
  provenance; they do not map — recorded so a future pass does not try.)
- `from_legacy("sitespec", {source:"website-ingestion", ...})` ->
  website-derived (ref required from the spec's ingestion record).

### 2.6 Canonical string form
`"<kind>::<ref>"` — kind from the closed vocabulary (which never contains
`::`, so the first `::` split is unambiguous), ref verbatim. Examples:
`canonical-journal::ping-event:9f3a…`, `website-derived::website-ingestion:https://…`,
`unknown::`. The intent block canonical form is
`owner-presentation-intent::ping-event:<id>,ping-event:<id>` (eventIds
sorted). updated_refs canonical form appends `;;updated=ping-event:<id>,…`.
Round-trip property: `parse(x.canonical()) == x` for every kind and every
legacy-mapped record. The form is stable across languages by construction
(no floats, no unicode edge cases in kinds; refs are opaque strings).

### 2.7 Served-dict compatibility
`to_record()` emits exactly the shapes the read seam already consumes:
`{"kind","ref","derivedAt"}` (+ `"updatedRefs"` when present). No new keys
in the graph objects. The TS port's `toRecord()` is asserted
byte-identical to the current literals in the adoption tests (Section 4b).

### 2.8 Typed failure modes (fail closed)
All raised as `ProvenanceError(code, detail)` (Python) /
`ProvenanceError` with `.code` (TS); codes are part of the contract and
are asserted identical across languages:

- `UNKNOWN_KIND` — kind not in the closed vocabulary.
- `MALFORMED_REF` — ref empty, or scheme not allowed for the kind
  (e.g. canonical-journal with a URL ref).
- `UNKNOWN_REASON_MISSING` — kind=unknown without a non-empty reason.
- `PENDING_PLACEHOLDER` — ref is `pending-emit` or any value on the
  placeholder denylist (emit-overlay's placeholder becomes a typed error
  at op-construction time instead of a silent convention).
- `UNPARSEABLE` — canonical-string parse failure (missing `::`, empty kind).
- `EMPTY_RECORD` — validate() given a non-dict or a dict with no kind.
- `INTENT_AS_OBJECT` — owner-presentation-intent used at object level
  (it is block-only by Section 2.3).

Callers: dump.py's apply_overlays keeps its existing ValueError-on-bad-op
behavior; the authority's errors propagate before any write (the dump
never writes on failure — existing atomicity invariant). emit-overlay.py
must resolve the real event id before constructing ops; the
PENDING_PLACEHOLDER error makes the current silent placeholder impossible
to emit.

## 3. Adoption plan (per producer; byte-identical where digests involved)

1. `fyd-lane/dump.py` (Python, first adopter per recon):
   - add_object forcing -> `provenance_ref.journal_event(eid).to_record()`
     with derived_at=ev["timestamp"]. Byte-identical dict expected.
   - set_field/deactivate updatedRefs path -> build/extend via
     `journal_updated(eid)`; replaces the `setdefault` untyped dicts.
   - intent block -> `owner_intent(event_ids, note)`; byte-identical block.
   - Proof: dump the same fixture + events before/after refactor;
     sha256 of the emitted projection JSON identical (reuse the
     check-stable.py normalize-dumpedAt pattern).
2. `fyd-lane/lane-e/emit-overlay.py`: replace the `pending-emit` literal
   with a call that raises PENDING_PLACEHOLDER unless the real event id is
   supplied; the emit path resolves the id first (behavior change is
   fail-closed: unresolvable emits abort instead of emitting placeholders
   the dump silently rewrites).
3. `fyd-build/src/fyd/refresh/types.ts` (TS, second adopter per recon):
   `provenance: "real"|"synthetic"` stays as the observation label; a typed
   `provenanceRefOf(observation)` via the mapping table is added. Round-trip
   test: every Observation maps and parses back.
4. `fyd-build/src/lib/ping/types.ts`: `PingObjectProvenance["kind"]` widens
   to the authority's closed union; existing literals unchanged. The legacy
   lane-C `ObjectProvenance` (`fyd-lane/lane-c/work/ping-types.ts:91-97`)
   is re-typed as an alias of the authority (it is a stale mirror; the
   narrower union is the drift this design kills).
5. `media/attach.ts`, `proceduralizer.ts`, `owner/corrections.ts`:
   construct via the TS port constructors; adoption tests assert
   byte-identical served dicts (existing fyd-038 tests keep passing:
   DEMO_SYNTHETIC badge rendering is unchanged).
6. `regen` ValueProvenance: unchanged as a TYPE (it is change metadata, not
   an object provenance record); its `evidenceRef` construction routes
   through the mapping table's scheme dispatch so every evidenceRef the
   regen emits is a well-formed authority ref.
7. `evidence/refs.ts`, `acquisition/*`, ask composer: NOT re-typed in this
   pass; they consume the ref schemes (web:sha256:, obs-) which the
   authority now owns. Named as follow-up (Section 6, Q2).

## 4. Falsification plan

### P1. Round-trip property probe (both languages)
Fixture corpus: every kind x every allowed ref scheme x the full legacy
mapping table x every malformed case. For each: `parse(canonical(x)) == x`;
`validate(to_record())` succeeds. Malformed cases (unknown kind, wrong
scheme, empty ref, unknown-without-reason, pending-emit, unparseable
string, intent-as-object): assert the EXACT typed code from Section 2.8.
Exit 0 = PASS. This is the Gap-3 probe pattern (stub technique, no
network, no Pig).

### P2. Bypass / single-owner audit (the "no competing authority" proof)
A lint over the adoption set, run in CI/probe:
- grep for raw kind-literal construction: `"kind":\s*"` in fyd-lane/*.py
  and `kind:\s*"` in fyd-build/src/fyd — every hit must be inside
  `provenance_ref.py` / `provenance-ref.ts`, the mapping table, or the
  documented test allowlist. Any producer-side literal fails the lint.
- grep for `setdefault("provenance"` (the untyped-dict path): zero hits
  outside the authority after adoption.
- grep for `pending-emit`: zero hits in producer code (only in the probe's
  malformed corpus and this design doc).
- grep for `from_legacy` call sites: the mapping table is the only
  translator; no caller hand-rolls a kind translation (check against the
  bridge functions in claims/why-this: they keep their domain mapping
  CONTENT->CLAIM, which is explicitly not provenance translation).
- Bypass paths explicitly audited and recorded:
  (a) `fyd-lane/lane-c/work/ping-types.ts` stale ObjectProvenance mirror
      — absorbed as an alias in adoption step 4, then the lint covers it;
  (b) dump.py's `setdefault` updatedRefs path — absorbed in adoption
      step 1;
  (c) emit-overlay.py placeholder — typed error in adoption step 2;
  (d) ask-fyd composer writing evidenceRef strings — out of scope this
      pass (Section 6), but the lint records its ref-writing sites as
      known-future;
  (e) MC/Lane D dispatch minting website content — must use the synthetic/
      owner-authored constructors per the wiring grounding doc's Ask FYD
      evidence boundary; adoption is the wiring lane's job, the authority
      gives it the constructor (out of scope here);
  (f) absorb `provenance: number` rank weight — explicitly NOT absorbed
      (different capability); the lint asserts no new `provenance:` numeric
      fields appear in graph-object types, preventing silent collision.
Lint exit code is the verdict: 0 = single owner holds.

### P3. Cross-language conformance probe (the Gap-1 pattern)
The same fixture corpus as P1 is serialized to JSON; a runner feeds it to
the Python module and the TS port and asserts byte-identical canonical
strings and identical error codes for every case. Any divergence fails.
This is what makes the TS port a conformance-pinned twin rather than a
competing authority.

### P4. Byte-identical adoption proof (dump.py)
Run the current dump.py and the refactored dump.py over the same fixture +
event set (stub journal, Gap-3 probe technique); sha256 the emitted
projection JSON after normalizing `dumpedAt`; assert equal. Then run the
existing `fyd037-dump-wrong-journal-probe.py` against the refactored dump
-> GUARD VERIFIED (regression: the FYD-037 pre-flight behavior is
untouched by the provenance refactor).

### P5. Fail-closed probe (malformed provenance in the wild)
- Poisoned journal event: an add_object op carrying a malformed provenance
  dict (unknown kind). The dump's forcing path constructs via the
  authority -> ProvenanceError(UNKNOWN_KIND) -> ValueError before any
  write; assert no projection file is written (atomic-write invariant).
- emit-overlay.py invoked without a resolvable event id -> 
...[truncated 2245 chars]