# CRM Archaeology Synthesis — block 10-20 (2026-09-30)

Ecosystem archaeology, in charter order: Attio → Clay → Apollo → HubSpot.
13 dimensions each, evidence-graded. Full studies in this directory
(attio.md, clay.md, apollo.md, hubspot.md). This file is the synthesis:
what changed vs the prior survey, and the 9-question checklist verdicts.

Prior survey: research_notes/crm-agentic-harvest-20260930/ (34 systems,
no continuity grade A). The A slot stays empty after this pass too.

## Grade changes vs the prior survey

- Attio: trigger/action algebra CONFIRMED and greatly extended (multi-
  trigger, manual run, record-command, retry/version model new). MCP
  UPGRADED in importance: the survey missed the official hosted MCP
  server (mcp.attio.com, OAuth, GA Feb 2026; reads auto-approved, writes
  confirmation-required, authenticated as the user's identity). No native
  approval node found (gap; HITL is practitioner draft-routing + MCP
  confirmation). No learning loop found.
- Clay: gated cheapest-first CONFIRMED and strengthened (official docs:
  endRunOnNoMatch gates, per-model credit pricing, 5/25/100 rollout
  canon). Workflow observability UPGRADED to B+ (immutable config
  snapshots, run-pinned versions, step-level IO). Waterfall per-cell
  attribution corrected to UNCLEAR (practitioner modeling advice, not an
  in-app feature). No native approval node (node types: agent/tool/
  conditional/code/delay/map/reduce/trigger). Learning loop graded
  ABSENT.
- Apollo: NOT in the prior survey. Additive entry. Official CLI +
  official remote MCP (registry io.github.apolloio/apollo-mcp v0.1.1),
  one permission envelope, effect-labeled tools, deny-by-default
  enrollment, Bounce Guard auto-halt with mandatory remediation.
- HubSpot: continuity B CONFIRMED (Agent Hub run history + live status
  console = best agent-governance surface in the sweep). Sharpened:
  User-Level Apps (2026-09-15) add action-time permission intersection;
  approved-content grounding envelope is the concrete harvest shape
  (content-source registry + citation invariant). Caveats: field-level
  permissions UI-only on API writes; private Customer Agent content
  appears in responses uncited; no native approval workflow action;
  learning loop UNCLEAR (all self-improvement claims vendor-described).

## What they do better than PING (confirmed)

- Attio: version-pinned runs with per-attempt retry records; least-
  privilege agent tool scoping with named "Run as" identity.
- Clay: signal-as-event with scored composition; workflow version
  scoping (runs pin their snapshot).
- Apollo: execution accessibility (CLI + MCP, one permission envelope,
  effect-class transparency); platform-side auto-halt with mandatory
  remediation; agent onboarding as shipped artifacts (SKILL.md/AGENTS.md).
- HubSpot: approved-content grounding envelope (citation invariant);
  play-shaped agent bounding contracts; Agent Hub live status console.

## What PING does better (confirmed)

- Evidence-bounded knowledge: every claim traces to evidence; none of
  the four has a real provenance surface on AI-generated content.
- Replay and determinism: append-only event plane; Attio/Clay/Apollo/
  HubSpot all report "what happened", none replays "why".
- SIGNAL != FACT != INTENT != AUTHORIZATION: Apollo conflates signal
  detection with automation logic ("the detection is Apollo's product,
  not the automation's logic"); PING separates them constitutionally.
- Approval as a first-class event: none of the four has a native
  approval node/primitive; PING's approval gate (block 0-10) is ahead.

## 9-question checklist verdicts (charter rule)

### C1. Entity-bound intent events — ADAPT (building in 10-20)
Common Room mandatory entity binding + Clay signal-as-event.
1. FYD current: Ask FYD exists; customize/intent.ts is owner-presentation
   intents only; no visitor-intent capture.
2. PING existing: demo journal gateway POST /events (Bearer, tenant-
   validated, request_id dedup); FYD_SITE_OVERLAY precedent.
3. ORCA/TenantOS: tenant identity = site id; TENANT_ID_PATTERN.
4. External best: Common Room (unbound signals quarantined); Clay
   (signals land on bound entities).
5. Primitive: write-time entity-binding rule on FYD_VISITOR_INTENT;
   unknown siteId -> QUARANTINED projection, never a lead.
6. Duplication risk: none (no existing visitor-intent vocabulary).
7. Authority risk: none (existing journal writer; read-only projection).
8. Smallest delta: event schema + projection reader + one proof event.
9. Reached arrow: VISITOR INTENT -> LEAD projection (lead proof).

### C2. Evidence-carrying lead cards — ADAPT (building in 10-20)
6sense support sets + HubSpot grounding envelope.
Primitive: every lead field carries its evidence ref (journal event id /
graph object ref); unanswerable -> explicit UNKNOWN. Extends the MC
shell's existing provenance-line contract. No duplication, no authority
risk. Reached arrow: CRM projection.

### C3. Run-observable lead lifecycle — ADAPT (folded into C2)
Attio version-pinned runs. The lead card's evidence chain + journal event
timeline covers this block. Full run-versioning deferred to ORCA 20-30.

### C4. Typed programmatic CRM surface — WIRE (building in 10-20)
Apollo one-system pattern. The CRM projection IS a typed GET API; the UI
reads the same data. No separate agent data plane. Effect-class labeling
noted for the 60-70 actions work.

### C5. Least-privilege agent tool scoping — REFERENCE
Attio P2. No agent writes in this block (read-only route). For ORCA
20-30: scope declarations as events, fail-closed on out-of-scope writes.

### C6. Platform-side auto-halt with mandatory remediation — REFERENCE
Apollo P2. No execution in this block. For ORCA 20-30: bounded guards
on missions with external effects, pause/resume as journaled events.

### C7. Cheapest-first gated execution — REJECT (this block)
Prior-survey ADOPT stands, but no costly agent steps exist in a read
projection. Revisit in ORCA 20-30.

### C8. Play-shaped agent bounding contracts — REJECT (this block)
HubSpot P2. No agents in this block. Revisit in ORCA 20-30.

### C9. Full signal radar — REFERENCE
Clay P1 full form belongs to the MarketingOS lane (the radar). Not
absorbed into CRM.

### C10. Pre-send safety triple — REFERENCE
Clay P2. No sends in this block; outreach held. For the outreach
machinery when authorized.

## What was NOT taken (deliberate)

- No contact-database import, no enrichment waterfall, no prospect data
  plane (Apollo's 270M contacts stay outside; external systems are
  sensors, not sovereign).
- No workflow engine transplant (n8n/Dify/Clay/HubSpot engines stay
  reference material for UX patterns only).
- No agent framework (HubSpot Agent Builder, Attio agent blocks stay
  patterns; PING's MissionRuntime remains the execution substrate).
- No attribution model (none of the four has a verifiable multi-touch
  model; nothing to harvest).
- No learning-loop machinery (all four graded ABSENT/UNCLEAR; PING's
  OUTCOME -> LEARNING seam stays the design).
