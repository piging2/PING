# SitePatch v1: the canonical op set

Version: sitepatch/v1. Date: 2026-09-28.
Status: design record. Nothing here is wired to an editor, agent, mobile UI, API,
or MCP surface yet; that wiring is explicitly blocked until this set is adopted.

## Why this exists

Three vocabularies describe the same changes in the tree today (see
PATCH_VOCABULARY_INVENTORY.md): proceduralize SiteIntent, Ask FYD SitePatchOperation,
and the customize overlay ops. Every editing surface must emit the same SitePatch[]
contract: visual editor, plain English, Ask FYD, API, MCP, agent, mobile UI.
sitepatch/v1 is the smallest op set that expresses every operation already proven
in the tree. Nothing here is hypothetical.

## Rules

- Facts (the object graph) are never written by a SitePatch. Presentation intent only.
- The design system (theme tokens, component registry) is not customizable through
  this set. SET_DESIGN_TOKEN is a typed refusal, not an op.
- Agent output is typed, schema-bounded data, never JSX.
- Undo is never an imperative UI stack. Undo is a new authorized append-only
  transition whose desired result corresponds to a prior version.
- Digest algorithm: sha256-canonical-json-v1 (sorted keys, compact JSON, UTF-8,
  volatile keys excluded: version_id, created_at, nonce, signature fields).

## The ops

Each op carries op_version "sitepatch/v1" plus the addressing it needs so the
pipeline never guesses a target.

1. MOVE_SECTION { pageSlug, sectionId, toIndex }
   Proven by: reorder_section (proceduralize tests, structured editor, pipeline tests).
   Validation: page exists; section exists; toIndex in range.
   Authorization: owner capability owner.customize-approve; exact-digest approval.
   Reversibility: MOVE_SECTION to the prior index.
   Maps: reorder_section, ParsedIntent.promote_first (section case).

2. SET_VISIBILITY { pageSlug, sectionId, hidden }
   Proven by: toggle_section.
   Validation: page and section exist.
   Authorization: same as MOVE_SECTION.
   Reversibility: SET_VISIBILITY with the inverse boolean.
   Maps: toggle_section, hide_section, show_section.

3. SET_FEATURED_OBJECT { pageSlug, sectionId, objectIds }
   Proven by: set_featured; Ask FYD feature_object intent.
   Validation: page and section exist; ids deduped and sorted.
   Authorization: same as MOVE_SECTION.
   Reversibility: SET_FEATURED_OBJECT with the prior id list.
   Maps: set_featured, feature_object, set_presentation(field=featuredIds).

4. REORDER_OBJECTS { pageSlug, sectionId, objectIds }
   Proven by: reorder_object; Ask FYD reorder_section_objects; customize e2e tests.
   Validation: page and section exist; at least one id; full desired order.
   Authorization: same as MOVE_SECTION.
   Reversibility: REORDER_OBJECTS with the prior order.
   Maps: reorder_object, reorder_section_objects, promote_first (object case).

5. HIDE_OBJECT { pageSlug, sectionId, objectId }
   Proven by: deactivate_object.
   Validation: page and section exist; objectId non-empty.
   Authorization: same as MOVE_SECTION.
   Reversibility: SHOW_OBJECT { pageSlug, sectionId, objectId } (op 6).
   Maps: deactivate_object, hide_object.

6. SHOW_OBJECT { pageSlug, sectionId, objectId }
   Proven by: inverse of deactivate_object (apply-layer idempotency: rewrite of the
   same hidden set is a no-op, so show is the tested complement).
   Validation, authorization: same as HIDE_OBJECT.
   Reversibility: HIDE_OBJECT.

7. SET_PRESENTATION_COPY { pageSlug, sectionId, heading?, copy? }
   Proven by: edit_copy (draft-until-approved lane rule).
   Validation: page and section exist; at least one of heading/copy present.
   Authorization: same as MOVE_SECTION; stays a draft until the digest is approved.
   Reversibility: SET_PRESENTATION_COPY restoring prior values.
   Maps: edit_copy.

8. SET_PRESENTATION_FIELD { pageSlug, sectionId, field, value }
   Proven by: Ask FYD professionalize intent (field "tone").
   Validation: field in the allowlist { "tone" }; page and section exist.
   Authorization: same as MOVE_SECTION.
   Reversibility: SET_PRESENTATION_FIELD restoring the prior value.
   Maps: set_presentation (bounded). The open-ended field string is deleted.

9. ADD_SECTION { pageSlug, component, query, heading?, copy?, atIndex? }
   Proven by: sitepatch-pipeline.test.ts (16 tests) via applyExtendedSitePatch.
   Validation: page exists; component in the registry; query is a valid FYDQuery;
   atIndex in range when given; slug collision check for the derived section id.
   Authorization: same as MOVE_SECTION.
   Reversibility: REMOVE_SECTION of the added section.
   Note: not yet bound into the canonical apply-layer; documented Phase-2 work.

10. REMOVE_SECTION { pageSlug, sectionId }
    Proven by: sitepatch-pipeline.test.ts.
    Validation: page and section exist; refusing to remove the last section of a page.
    Authorization: same as MOVE_SECTION.
    Reversibility: ADD_SECTION restoring the removed section's component, query, and
    presentation intent (facts are never needed; presentation only).
    Note: same Phase-2 binding caveat as ADD_SECTION.

11. ADD_PAGE { slug, title, navLabel }
    Proven by: sitepatch-pipeline.test.ts.
    Validation: slug unique across pages; title and navLabel non-empty.
    Authorization: same as MOVE_SECTION.
    Reversibility: REMOVE_PAGE of the added page.
    Note: same Phase-2 binding caveat.

12. REMOVE_PAGE { slug }
    Proven by: sitepatch-pipeline.test.ts.
    Validation: page exists; refusing to remove the last page.
    Authorization: same as MOVE_SECTION.
    Reversibility: ADD_PAGE restoring slug, title, navLabel.
    Note: same Phase-2 binding caveat.

13. CHANGE_QUERY { pageSlug, sectionId, query }
    Proven by: sitepatch-pipeline.test.ts.
    Validation: page and section exist; query is a valid FYDQuery.
    Authorization: same as MOVE_SECTION.
    Reversibility: CHANGE_QUERY restoring the prior query.
    Note: same Phase-2 binding caveat.

Refused (typed, never coerced): SET_DESIGN_TOKEN. The frozen Lane D layer law stands.

Deleted wire shapes (semantics kept above): SitePatchBody propsDiff free-form,
SitePatchOperation before/after as the mutation contract (before/after remain in
review cards), PresentationIntentOverlayOp as a second patch language,
clear_presentation_intent as a standalone op (superseded by undo-as-transition).

## The transition record

Every accepted SiteSpec transition durably records:

- version_id: "spv-" + sha256(parent_version_id + patch_digest + actor_id + approved_at).slice(0, 20)
- parent_version_id: version_id of the spec this transition applies to
- base_digest: digest of the exact spec bytes the patch was proposed against
- result_digest: digest of the new spec bytes after apply
- patch_digest: digest of the canonical op bytes (volatile keys excluded)
- actor: actor_id
- authorization: proposal reference (proposal_id + proposalDigest) and the
  approval lineage (approvedBy, approvedAt, note)
- canonical event reference: the journal event id carrying this transition

Apply rule: apply re-verifies base_digest against the live spec. A stale base is a
409 (STALE_SUPERSEDED while pending; ALREADY_DECIDED after the terminal boundary),
never a silent apply.

## Undo

Undo of version V_n to the result of V_k: the pipeline computes the op list that
transforms the current spec into V_k's result bytes (using the reversible ops
above), authorizes it as a new proposal, and appends V_{n+1} with parent V_n,
result_digest equal to V_k's result_digest. The journal stays append-only;
history is never rewritten.

## Equivalence proof design (visual drag vs plain English)

Goal: prove that a Puck drag and an equivalent plain-English request emit
semantically equivalent canonical patches, both flowing into sitepatch/v1.

Setup: a pinned fixture spec with two sections, "Hero" at index 0 and "Services"
at index 2 (section ids are position-derived, so the fixture pins them).

Surface A (visual): Puck adapter maps the drop event "Services dropped above Hero"
to { op_version: "sitepatch/v1", op: "MOVE_SECTION", pageSlug: "home",
sectionId: "<services section id>", toIndex: 0 }.

Surface B (plain English): "Move Service above Hero." parses to ParsedIntent
{ kind: "promote_first", target: "Service" }, resolves against the spec to
reorder_section { pageSlug: "home", sectionId: "<services section id>", toIndex: 0 },
and maps to the identical MOVE_SECTION op.

The exact assertion:

```
const base = fixtureSpec();                       // same pinned spec
const dragOp   = puckAdapter.drag({ component: "Services" }, { above: "Hero" });
const speechOp = plainEnglish("Move Service above Hero.");
assert.deepEqual(canonical(dragOp), canonical(speechOp));
// both: { op: "MOVE_SECTION", op_version: "sitepatch/v1",
//          pageSlug: "home", sectionId: "<services id>", toIndex: 0 }
const r1 = applySitePatchV1(base, [dragOp]);
const r2 = applySitePatchV1(base, [speechOp]);
assert.equal(r1.result_digest, r2.result_digest);
```

Notes: canonical() strips volatile fields (version_id, timestamps). The assertion
compares (pageSlug, sectionId, toIndex) plus the result digest, which is the
semantic equivalence bar: same op, same target, same outcome. Section ids shift
after moves, so a longer sequence of ops must re-resolve ids against the current
spec before comparing; the fixture test pins a single move where ids are stable.

When this test passes for both surfaces, Puck (or any replacement editor) is
proven to be interaction machinery only: it emits sitepatch/v1 and owns nothing
else. The same proof shape applies to Ask FYD, API, MCP, agent, and mobile UI
inputs.
