# UX policy: Decision 3 consequence tiers on the existing conversational proposal/approval surface
**WS4, 2026-09-29. DOC ONLY. No machinery built, none proposed.**

## The existing surface (unchanged)
`POST /api/fyd/customize` with actions `parse` (plain English -> typed intent -> resolution -> digest-bound proposal + review card; commits nothing), `approve` (re-derives the chain from the text against the CURRENT spec, re-verifies every digest, journals the directive; stale/tampered/timeout/deny fail closed with journal evidence), `clear` (removes a directive); `GET ?siteId=&view=inspect` (current presentation-intent state, section order, directives). Gates: `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1` AND localhost/private-network host AND capability `owner.customize-approve`. Every approve response stamps `consequenceTier` and the demo-owner marker.

## Tier mapping

### LOW — presentation reorder, section visibility, edit copy
(What the lane demonstrably handles today: `reorder_section`, `toggle_section`, `set_featured`, edit-copy; the lane's layer law REFUSES theme-token directives, so "theme token" from Decision 3 maps to LOW-but-refused on this surface until a lane explicitly supports it.)
- Surface behavior: `parse` returns the proposal + review card (before/after, operation count) stamped `consequenceTier:"LOW"`; `approve` journals a presentation-intent overlay and (preview chain) regens. Undo exists via `clear`.
- UX policy: lightweight confirmation — the review card IS the confirmation. No separate preview step required, no second approval. Rationale: presentation-only, instantly undoable, zero fact impact (proven: `graphDigest == baseDigest` after apply).

### MEDIUM — change a public factual claim, publish generated copy, alter contact info
- Surface behavior TODAY: **refused before a proposal exists.** The layer law is frozen: an intent that would manufacture a factual claim resolves to `unresolved` (422), never a claim; the conversational surface has no path to `set_field`/`add_object` fact writes. The 422 `unresolved` response IS the policy enforcement.
- UX policy (when a future surface handles MEDIUM): explicit preview + explicit confirmation required — the owner must see the exact factual diff (field, old value, new value, evidence basis) before approving. No machinery specified here; the policy point is that today's surface correctly refuses rather than silently coercing.

### HIGH — external social action, campaign, message, purchase, cross-network publish, destructive
- Surface behavior TODAY: **refused before a proposal exists.** The parse layer stamps the lane as LOW-only ("Anything consequential (HIGH class) is refused before a proposal exists"); the ask-lane agent boundary law strips `FORBIDDEN_AGENT_EFFECTS` from anything an agent may suggest. Consequential denials belong in the denial journal (Decision 7) with who/what/digest/decision/why/when — never as silent no-ops, never as journaled approvals.
- UX policy: explicit authorization with strong evidence and a receipt — the approval must name the external effect, its target, and its reversibility, and the decision (approve or deny) is journaled. This tier never rides the lightweight LOW path.

## What the mapping proves
The existing surface already implements the Decision 3 UX policy as code: LOW gets the light path it earned, MEDIUM has no path (honest refusal, not coercion), HIGH is refused before proposal. The tiering is a property of the vocabulary the surface accepts, not of a new approval system. Extending MEDIUM/HIGH coverage later means extending the vocabulary and its confirmation UX — not building a parallel approval machine.
