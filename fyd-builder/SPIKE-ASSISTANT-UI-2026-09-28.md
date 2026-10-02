# ASSISTANT-UI — DELETION-FIRST ANALYSIS (2026-09-28, read-only)

Nolan's 06:23 bar: adoption condition is "can FYD remove bespoke conversational
chrome while preserving its own semantics?" Deletion-first, not adoption-first.

## What actually exists (measured, not estimated)

The current Ask FYD UI is five bespoke single-turn Q&A widgets, ~1,190 LOC total:

- `ask-fyd-widget.tsx` 170 — site-section Q&A, fetch POST → answer + citations
- `ask-object-panel.tsx` 291 — object panel Q&A
- `global-ask-dock.tsx` 271 — global dock Q&A
- `ask-ping.tsx` 363 — PING ask component
- `fyd-ask-demo.tsx` 95 — demo harness

There is NO streaming (no SSE/ReadableStream anywhere in the ask surface), NO thread
state, NO message list, NO composer state machine. Every widget is: input → POST
/api/fyd/ask → render answer + Why-this citation disclosure.

## Honest deletion math

The earlier 1,200–2,000 LOC deletion estimate assumed commodity chat chrome (thread
state, streaming, composer, message rendering) that does not exist. Replacing the
five widgets with assistant-ui primitives would require:

- adapter + primitive wiring: ~300–500 LOC (est.)
- FYD-specific rendering that stays regardless: Why-this disclosure, citation cards
  with FactClass labels, theme tokens, mobile constraints, DEMO_OWNER_MODE gating

Net deletion: near zero, possibly negative. The library would ADD dependency weight
(and a second component worldview to audit) while deleting almost no bespoke code.

## Verdict: REJECT now — deletion-first bar not met

This is not a criticism of assistant-ui; it is the bar working as designed. The
value unlocks when Ask FYD becomes genuinely multi-turn: streaming answers, thread
state, tool-call presentation, inline approvals. None of that is a demonstrated need
today — the concierge differentiator is ANSWER + HOW FYD KNOWS + WHAT FYD DOES NOT
KNOW + WHAT ACTION IS AVAILABLE, all of which the current widgets already deliver.

REVISIT when conversational threading is demonstrated. Same posture as Puck:
keep the seam in mind, adopt nothing until the need is proven.

## What stays outside the library (whenever adoption happens)

business truth · evidence · citations/provenance · tenant identity · capabilities ·
approvals · proposal digest · canonical transitions · external effects ·
conversation authority. The library may own thread rendering, message composition,
streaming UX, tool-result presentation, approval component ergonomics — presentation
only. If integration requires converting FYD into assistant-ui's worldview: reject.

## AI SDK 7 — transport-only (no further read-only work needed)

Boundary already designed: allowed = provider abstraction, streaming, generation
invocation, structured outputs/tool-call transport, provider normalization. Forbidden
= authorization, capability selection, mission/business state, canonical tool effects,
external-effect retry semantics, approval semantics, tenant authority, outcome truth.
Model emitting "call publishSite" = PROPOSED TOOL INTENT; PING resolves capability
and authority. Live-phase checks: Node >= 22 (Pig portable node is v22.23.2; verify
the WSL runtime FYD actually runs on), ESM compatibility, version pin, one
provider-swap test if cheap.
