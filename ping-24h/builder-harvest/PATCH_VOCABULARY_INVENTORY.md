# SitePatch Vocabulary Inventory

Date: 2026-09-28. Tree: /home/nolan/projects/ping at f877c391 (read-only scan).
Three fragmented vocabularies found, plus one convergence naming layer that delegates
to them (not a fragment). No Puck/drag-and-drop vocabulary is wired in the tree;
the Puck spike lives outside it (see builder-harvest/puck-spike).

## Vocabulary F1: proceduralize SiteIntent (the structured-editor vocabulary)

Source: src/fyd/proceduralize/patch.ts. Type lines 27-40, proposal lines 107-243,
apply lines 245-298. Produces SitePatchBody { kind: "site_patch", proposalDigest,
targetPage, targetSection, component, propsDiff, reason } with digest law
sha256-canonical-json-v1 (lines 59-101).

## Vocabulary F2: Ask FYD SitePatchOperation (the agent-drafted vocabulary)

Source: src/lib/ping/types.ts lines 307-340 (SitePatchOperation, SitePatchPayload),
drafting in src/fyd/ask/site-patch.ts lines 78-349. Ops carry before/after so the
reviewer sees the exact change. Drafted by the agent only; applied through the
governed event path (OBJECT_UPDATED carrying the digest-bound patch), never by
the agent.

## Vocabulary F3: customize overlay ops (the projection-journal vocabulary)

Sources: src/fyd/customize/types.ts lines 44-148 (ParsedIntent, PresentationIntentDirective,
PresentationIntentOverlayOp), intent.ts lines 60-80 and 205-280 (parse regexes,
evidence grounding), server.ts lines 689-705 (set_presentation_intent build),
src/app/api/fyd/customize/route.ts lines 628-720 (parse / approve / clear actions).
Directives apply OVER the compiled spec at render time via apply-layer.ts,
never merged into facts.

## Convergence layer (not a fragment): TRACK C 10-op vocabulary

Source: src/fyd/sitepatch/types.ts lines 34-120. Names 10 typed ops and maps each
with an ADOPT/ADAPT/REFUSE disposition onto F1/F3 machinery. Pipeline stages
PATCH -> VALIDATE -> CAPABILITY -> PREVIEW -> APPROVAL -> EVENT -> NEW SPEC VERSION
in src/fyd/sitepatch/pipeline.ts lines 1-110. Approval seam mirrors the Phase 1
OwnerProposal contract in src/fyd/sitepatch/approval-seam.ts lines 60-180.

---

## Per-op inventory

Columns: CURRENT OP / SOURCE / SEMANTICS / TARGET / VALIDATION / AUTHORIZATION /
REVERSIBILITY / CURRENT CALLERS / KEEP-MAP-DELETE.

### F1 ops

1. reorder_section
   SOURCE: patch.ts lines 30, propose ~155-168, apply ~251-259.
   SEMANTICS: move a section to toIndex within its page; section ids re-derived after move.
   TARGET: FYDSiteSpec copy (pure applySitePatch); demo preview state in site-client.tsx.
   VALIDATION: page exists; section exists; toIndex in [0, len).
   AUTHORIZATION: ownerConsole-gated EditorPanel (demo preview); propose path needs exact-digest owner approval; pipeline capability owner.customize-approve.
   REVERSIBILITY: inverse reorder_section to the original index, as a new authorized transition.
   CALLERS: customize/propose.ts, site-client.tsx EditorPanel, sitepatch/pipeline.ts (delegated), tests.
   VERDICT: KEEP. Maps to canonical MOVE_SECTION.

2. toggle_section
   SOURCE: patch.ts lines 31, propose ~170-180, apply ~260-262.
   SEMANTICS: set presentation.hidden on a section (fact preserved, visibility only).
   TARGET: spec copy / overlay journal.
   VALIDATION: page and section exist.
   AUTHORIZATION: same as reorder_section.
   REVERSIBILITY: toggle_section with the inverse boolean, new transition.
   CALLERS: same as reorder_section.
   VERDICT: KEEP. Maps to canonical SET_VISIBILITY.

3. set_featured
   SOURCE: patch.ts lines 32, propose ~182-196, apply ~263-265.
   SEMANTICS: replace presentation.featuredIds with a deduped sorted id list.
   TARGET: spec copy / overlay journal.
   VALIDATION: page and section exist; ids deduped and sorted.
   AUTHORIZATION: same as reorder_section.
   REVERSIBILITY: set_featured with the prior id list, new transition.
   CALLERS: same as reorder_section.
   VERDICT: KEEP. Maps to canonical SET_FEATURED_OBJECT.

4. reorder_object
   SOURCE: patch.ts lines 33-39, propose ~198-216, apply ~266-268.
   SEMANTICS: set the full desired display order (presentation.objectOrder) for a section.
   TARGET: spec copy / overlay journal.
   VALIDATION: page and section exist; at least one object id; order significant, deduped preserving sequence.
   AUTHORIZATION: same as reorder_section.
   REVERSIBILITY: reorder_object with the prior order, new transition.
   CALLERS: same as reorder_section.
   VERDICT: KEEP. Maps to canonical REORDER_OBJECTS.

5. deactivate_object
   SOURCE: patch.ts lines 40-45, propose ~218-238, apply ~269-271.
   SEMANTICS: hide one object within a section; digest binds the full resulting hidden set.
   TARGET: spec copy / overlay journal.
   VALIDATION: page and section exist; objectId non-empty.
   AUTHORIZATION: same as reorder_section.
   REVERSIBILITY: a new transition restoring the prior hiddenObjectIds list.
   CALLERS: same as reorder_section.
   VERDICT: KEEP. Maps to canonical HIDE_OBJECT (paired with SHOW_OBJECT restore).

6. edit_copy
   SOURCE: patch.ts line 46, propose ~240-260, apply ~272-277.
   SEMANTICS: propose presentation.heading and/or copy edits; drafts only until the digest is approved.
   TARGET: spec copy.
   VALIDATION: page and section exist; at least one of heading/copy present.
   AUTHORIZATION: same as reorder_section, plus the lane rule that copy stays a draft until approval.
   REVERSIBILITY: edit_copy restoring prior heading/copy, new transition.
   CALLERS: same as reorder_section.
   VERDICT: KEEP. Maps to canonical SET_PRESENTATION_COPY.

7. set_theme_token
   SOURCE: patch.ts line 47, propose ~120-140, apply ~245-250.
   SEMANTICS: set a design-system token (accent, surface, ink, radius, fonts).
   TARGET: spec themeTokens block.
   VALIDATION: token in the allowlist; value a non-empty string.
   AUTHORIZATION: refused at CAPABILITY by the frozen Lane D layer law; never coerced.
   REVERSIBILITY: n/a (refused).
   CALLERS: structured editor UI text mentions tokens; capability test asserts refusal.
   VERDICT: DELETE from the canonical op set. Keep the typed refusal as a verdict.

### F2 ops

8. reorder_section_objects
   SOURCE: types.ts lines 308-314; drafted in site-patch.ts lines 130-158.
   SEMANTICS: full before/after object order for a section (agent-computed).
   TARGET: SiteSpec transition via the governed OBJECT_UPDATED event path.
   VALIDATION: grounding checks (service match exists, section exists, no-op refusal when already first).
   AUTHORIZATION: requires grant site.propose (sitePatchRefusal, lines 108-122); agent drafts only; owner approves the exact proposal digest.
   REVERSIBILITY: a new proposal carrying the prior order.
   CALLERS: src/fyd/ask/answer.ts line 73.
   VERDICT: MAP to canonical REORDER_OBJECTS. DELETE the before/after wire shape as the mutation contract (before/after stay in the review card only).

9. set_presentation
   SOURCE: types.ts lines 315-322; drafted in site-patch.ts lines 160-218.
   SEMANTICS: generic presentation field write { field, before, after }. Proven fields: tone (professionalize), featuredIds (feature_object).
   TARGET: governed event path.
   VALIDATION: grounding checks; no-op refusals (already featured, already professional).
   AUTHORIZATION: same as reorder_section_objects.
   REVERSIBILITY: new proposal restoring the prior field value.
   CALLERS: src/fyd/ask/answer.ts line 73.
   VERDICT: MAP field=featuredIds to canonical SET_FEATURED_OBJECT; MAP field=tone to canonical SET_PRESENTATION_FIELD with an allowlist. DELETE the open-ended field string as a canonical shape.

### F3 ops and intents

10. set_presentation_intent
    SOURCE: types.ts lines 119-148; built in server.ts lines 689-705.
    SEMANTICS: journal op recording an approved directive (intentId, siteIntent, proposal, approval lineage) into the projection overlay.
    TARGET: projection presentationIntent block; dump.py reads it.
    VALIDATION: server.ts lines 419-512 (per-op proposal digest matches, approvedBy is the demo owner marker, digest covers overlay-format bytes only).
    AUTHORIZATION: /api/fyd/customize approve action re-verifies the exact digest; stale base is a 409, never a silent apply.
    REVERSIBILITY: clear_presentation_intent removes the directive; underlying facts untouched.
    CALLERS: /api/fyd/customize route.ts, sitepatch/pipeline.ts (emits on APPROVE), dump.py.
    VERDICT: MAP to the canonical transition event (versioned SitePatchOp plus approval lineage). The overlay journal record stays as the projection mechanism, not as a second patch language.

11. clear_presentation_intent
    SOURCE: types.ts lines 137-148; route.ts clear action.
    SEMANTICS: remove one directive from the overlay journal.
    TARGET: projection overlay.
    VALIDATION: intentId required and must exist.
    AUTHORIZATION: same approve-path authority as set_presentation_intent.
    REVERSIBILITY: itself a reversal primitive; superseded by undo-as-transition in canonical v1.
    CALLERS: /api/fyd/customize route.ts.
    VERDICT: MAP into canonical undo (a new authorized transition toward a prior version). DELETE as a standalone op kind.

12-16. ParsedIntent kinds: promote_first, feature_object, hide_section, show_section, hide_object
    SOURCE: types.ts lines 44-50; intent.ts lines 60-80 (regexes), 205-280 (grounding).
    SEMANTICS: plain-English parse targets that resolve to F1 SiteIntents (promote_first -> reorder_section or reorder_object; feature_object -> set_featured; hide/show_section -> toggle_section; hide_object -> deactivate_object). Unmatched targets are honest UnresolvedIntent failures, never reinterpreted.
    TARGET: resolution only; no direct mutation.
    VALIDATION: evidence grounding against the live spec and graph.
    AUTHORIZATION: none at parse time; the resolved proposal follows the standard approval path.
    REVERSIBILITY: n/a (no mutation).
    CALLERS: /api/fyd/customize route.ts parse action; conversational-customization-e2e tests.
    VERDICT: KEEP as the plain-English front door. They already resolve to F1 kinds, so no new mapping is needed once F1 maps to canonical.

### Convergence-layer ops (TRACK C 10-op)

17. MOVE_SECTION: ADOPT of reorder_section (op 1). Pipeline validate/capability/preview at pipeline.ts. KEEP.
18. SET_VISIBILITY: ADOPT of toggle_section (op 2). KEEP.
19. SET_FEATURED_OBJECT: ADOPT of set_featured (op 3). KEEP.
20. SET_PRESENTATION_COPY: ADOPT of edit_copy (op 6). KEEP.
21. SET_DESIGN_TOKEN: REFUSE (frozen layer law). DELETE from canonical set; refusal stays typed.
22. ADD_SECTION: ADAPT, additive logic in pipeline.ts applyExtendedSitePatch. Proven by sitepatch-pipeline.test.ts (16 tests). KEEP, pending canonical apply-layer binding (documented Phase-2 work).
23. REMOVE_SECTION: ADAPT. Same status as ADD_SECTION. KEEP.
24. ADD_PAGE: ADAPT. Same status. KEEP.
25. REMOVE_PAGE: ADAPT. Same status. KEEP.
26. CHANGE_QUERY: ADAPT. Same status. KEEP.

## Fragmentation findings

- The same reorder semantics exist in three shapes: SiteIntent.reorder_section (F1),
  SitePatchOperation.reorder_section_objects (F2), and ParsedIntent.promote_first
  resolving to reorder_section or reorder_object (F3). All three are real and tested.
- Copy edits exist as edit_copy (F1) and as F2 set_presentation field writes; F2 also
  covers tone, which F1 cannot express.
- Hard add/remove of sections and pages exist ONLY in the convergence layer (ADAPT ops
  22-26); F1 has no equivalent (it only hides). These are proven by pipeline tests
  but not yet bound into the canonical apply-layer (customize/apply-layer.ts).
- The site-client.tsx EditorPanel approve path applies to local demo preview state
  without a server gate; it is explicitly labeled demo preview, not the governed path.
- Digest law is consistent within each vocabulary but the two canonicalizers differ by
  design (TS overlay canonicalizer vs MC approval canonicalizer); the pinned rule is
  never to feed one domain's bytes to the other's canonicalizer (patch.ts lines 59-80,
  types.ts lines 99-120).
