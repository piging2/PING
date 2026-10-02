# INTEGRATION NOTE — Lane S -> Lane G (capability visibility / no-leak semantics)

**Date:** 2026-09-23. **From:** Lane S. **For:** Lane G (Ask FYD context compiler).

## What lane S guarantees
1. Only `status=resolved` records that pass `resolveForPrincipal` for the viewer are
   offered. Candidates, withdrawn, and needs_review records are invisible to consumers.
2. Denials carry a `reason` and a `rule` id. Where `existenceSensitivity=high`, the
   denial is deliberately generic: reason = "not available to this principal",
   rule = `visibility.owner.no-leak`, and the capability's id/kind/description are
   NOT named anywhere in the denial object.
3. Withdrawn records are tombstones; the compiler MUST filter `status != resolved`
   before packet assembly. A withdrawn capability reaching the concierge is a bug
   (see lane-s spike tests PROOF-6, RED-5).

## What lane G must do
- Include only granted records in the ContextPacket; never include a denial as a claim.
- When the packet must explain a refusal, quote the resolution `reason` verbatim.
  For no-leak denials the packet carries exactly "not available to this principal"
  and NOTHING else about that capability.
- The `surfaces` field on the record lists allowed consumers ("object_view",
  "ask_context", "sitespec_section", "owner_console"); treat it as advisory, with
  `resolveForPrincipal` as the enforcement point.

## Open question for G
If the concierge is asked "what can this business do?" by a visitor, the honest
answer lists granted public capabilities only. Should the answer ALSO disclose that
owner-only capabilities exist in generic terms ("the owner has additional tools")?
Lane S default: no — silence, unless the owner opts in. Your call; record it in the
compiler design.
