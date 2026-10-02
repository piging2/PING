# UI Harvest — Mission Control projection surfaces + FYD website projections

Date: 2026-09-30. Worker: UI-harvest survey, 99-hour PING/FYD convergence program.
Access date for all web sources: 2026-09-30.

## Scope

(a) Mission Control as a truthful projection surface: WHAT EXISTS / WHAT IS RUNNING /
WHAT IS STUCK / WHY / WHO AUTHORIZED IT / WHAT EVIDENCE EXISTS.
(b) FYD website projections: evidence-bound rendering, owner correction affordances
(CONFIRM / CORRECT / HIDE).

Focus: CRM-like surfaces and projection patterns — run-observable cards, evidence chains,
approval queues, status consoles, claim/ledger viewers.

Non-negotiables: no new UI authority (Mission Control stays a projection, never an
authority); no new stores or engines; no duplicate of the MC-serve worker's completed
work (serve-up DONE at commit 51831c61, live at http://100.79.154.43:3100/mission-control).

## Prior art inventoried (not re-done)

- `~/workspace/ping-overnight/UI_HARVEST_SPEC_2026-09-17.md` (96KB, ~60 UI ideas, IDs
  X-1..X-59): covers LangSmith agent observability (X-12..X-20), CoWork OS control room
  (X-21..X-29), open-source MC panel inventory (X-30..X-38), HubSpot campaign canvas
  (X-39..X-46), Neo4j graph UX (X-47..X-53), n8n/Make/Zapier execution history
  (X-54..X-59), plus a "Patterns NOT to copy" list. This survey does not re-classify any
  X-item; it harvests NEW patterns and points back where overlap exists.
- `~/workspace/research_notes/crm-agentic-harvest-20260930/` (34 systems): harvested
  mechanisms, several already carrying UI primitives — Fin debugger trace->root-cause->
  replay-proof loop (ADOPT #1), Lindy approval gates + draft-by-default (approval section
  #7), Gumloop per-node run observability (ADOPT the pattern), n8n failure localization,
  Copy.ai dry-run-first + write-protected computed cells, 6sense evidence-carrying scores.
  These are referenced below as ALREADY HARVESTED, not re-classified.
- `~/workspace/research_notes/crm-archaeology-10-20/` (Attio/Clay/Apollo/HubSpot):
  HubSpot Agent Hub live status console, Attio version-pinned runs with per-attempt retry
  records, HubSpot approved-content grounding envelope, Attio least-privilege "Run as"
  identity. Referenced below as ALREADY HARVESTED.

## Method / reproducibility

8 targeted web searches, recorded verbatim below. Any agent can replicate this survey
from the queries + URLs alone.

1. `Langfuse observability UI traces sessions evals dashboard features`
2. `Temporal Web UI workflow execution history event history UI features`
3. `HumanLayer agent approval queue UI approve deny edit patterns`
4. `Perplexity AI citations UI design inline sources answer interface`
5. `Google Business Profile owner review suggested edits confirm update interface`
6. `GitHub pull request review approve changes requested UI queue workflow`
7. `Twenty CRM open source UI timeline activity record cards kanban features`
8. `PagerDuty incident dashboard UI timeline responder status design`
9. `Google Fact Check Explorer ClaimReview markup UI claim rating display`
10. `Vercel deployment dashboard UI build status preview deploy summary page design`
11. `Wikipedia pending changes review queue interface design moderation`

Evidence grades used: CONFIRMED (official docs / product documentation),
STRONG INDICATION (multi-source corroboration), WEAK INDICATION (single source),
UNKNOWN (not established). Grades here are on the FACT THAT THE PATTERN EXISTS in the
named product, not on its quality.

Classification legend: ADOPT NOW = maps to an existing PING primitive, fills a real gap,
build-ready; ADAPT LATER = take the shape, rebuild our way, scheduled for a later block;
PATTERN ONLY = file as reference vocabulary, do not build; REJECT = do not take, with
one-line rationale.

---

## Patterns table

### A. Mission Control projection surfaces (EXISTS / RUNNING / STUCK / WHY / WHO / EVIDENCE)

| ID | Pattern | Source | Grade | Class | One-line rationale |
|----|---------|--------|-------|-------|--------------------|
| MC-1 | Stuck-work hero surface: OPEN/ACK counter cards that drill into filtered queues ("Needs Immediate Attention" + "Recently Updated or Resolved") | PagerDuty dashboard research: https://github.com/penserai/acteon/blob/HEAD/docs/admin-ui/research/ui-research.md ; https://github.com/santheesh73/pagerduty/blob/HEAD/transcripts/phase-10-product-polish.md | STRONG INDICATION | ADOPT NOW | The #1 known failure is 25 stuck claim-missions with no consumer; MC's served shell lacks a WHAT-IS-STUCK hero. Counts are pure projections over existing mission events. |
| MC-2 | "Pending Activities" view + Compact history grouping (logical grouping of activities/signals/timers) alongside full Timeline | Temporal Web UI docs: https://github.com/temporalio/documentation/blob/HEAD/docs/web-ui.mdx | CONFIRMED | ADOPT NOW | Pending work with retry/failure metadata is the exact shape of stuck PING runs; compact grouping scales past the 100K-file run log problem. |
| MC-3 | Execution-detail header contract: status badge + run identity persistent above every detail view; stable tabs History / Relationships / Workers / Pending / Call Stack / Queries / Metadata | Temporal Web UI docs (same as MC-2); observed in https://github.com/tylergannon/gimble/blob/HEAD/ephemeral/design/research-execution-interfaces.md | CONFIRMED | ADAPT LATER | Adapt the tab taxonomy to Mission -> Run -> Execution -> Evidence; do not import Temporal's workflow nouns. |
| MC-4 | Deployment header: colored status dot (Ready=pill green; Building=animated pulse; Error; Queued; Cancelled=strikethrough), environment pills, metadata grid (commit, branch, duration), actions Redeploy / Cancel / Promote | Vercel deployment inspector research: https://github.com/browser-use/browser-harness/blob/HEAD/agent-workspace/domain-skills/vercel/vercel.md ; https://github.com/fazleyrabby/prompts/blob/HEAD/src/content/inspirations/vercel-deploy.md ; https://github.com/lnavarrocarter/kuadashboard/blob/HEAD/docs/features/vercel.md | STRONG INDICATION | ADAPT LATER | Pulsing "building" and greyed "cancelled" states give at-a-glance run liveness; adapt to mission/run state vocabulary (never silent zeros — UNKNOWN stays UNKNOWN). |
| MC-5 | Score-badge tooltip -> judge execution trace: hovering any score reveals "View execution trace" linking to the judge's full reasoning | Langfuse eval explainability: https://github.com/aledlie/aledlie.github.io/blob/HEAD/_reports/2026-02-06-llm-explainability-research-otel-observability.md | STRONG INDICATION | ADAPT LATER | Every scored run in MC gets zero-click access to its evaluation evidence; our version links to the immutable event record, not a vendor trace. |
| MC-6 | Trace-to-fixture: one-click "pull this production call into the eval harness as a new fixture" | Community observability practice: https://github.com/emirerben/nova/blob/HEAD/src/apps/api/OBSERVABILITY.md | WEAK INDICATION | PATTERN ONLY | Vocabulary only until the eval lane is reached; do not build a fixture pipeline from a UI idea. |
| MC-7 | Session replays for conversational agents (play back what the agent did/said) | Langfuse platform coverage: https://www.marktechpost.com/2026/08/09/top-llm-observability-and-evaluation-platforms-in-2026-langfuse-langsmith-braintrust-arize-and-more-compared/ | STRONG INDICATION | PATTERN ONLY | Relevant to Ask FYD conversation observability later; not a Mission Control P0. |
| MC-8 | Operations console with configurable columns, server-side filtering, side detail panel | PagerDuty research (same as MC-1) | STRONG INDICATION | PATTERN ONLY | Spec X-15 already covers faceted run filtering; no new pattern here beyond the console metaphor. |
| MC-9 | "Promote preview to production" as an explicit first-class action (hidden for already-production items) | https://github.com/lnavarrocarter/kuadashboard/blob/HEAD/docs/features/vercel.md | STRONG INDICATION | ADAPT LATER | Matches the PROPOSAL -> AUTHORIZATION -> APPROVAL -> EFFECT arrow: the UI renders the promotion decision event; it never performs promotion itself. |
| MC-10 | Wall-mounted kiosk mode dashboards | https://github.com/justynroberts/pagerduty-cyd | WEAK INDICATION | REJECT | Operational theater; violates the standing no-vanity-metrics rule (every number must resolve to underlying runs/evidence). |
| MC-11 | Kanban pipeline ordering with stage transitions persisted as timestamped history rows | Twenty CRM internals: https://github.com/lift42/framework/blob/HEAD/discussion/2026_09_14_discussion_corpus_crm.md ; https://github.com/kristapsgoncoronoks-ship-it/bid_it/blob/HEAD/docs/design/crm-module-research.md | STRONG INDICATION | PATTERN ONLY | Spec X-26 already covers the review-lane kanban; only the timestamped-transition-row primitive is worth noting. |
| MC-12 | Run ID + Call ID per-action attribution in every approval request, response, and audit log | HumanLayer agent-native primitives: https://github.com/haoruilee/awesome-agent-native-services/blob/HEAD/services/oversight-and-approval/humanlayer.md | CONFIRMED | ADOPT NOW | WHO AUTHORIZED WHAT must name the exact run and call; the action-intent ledger already carries this, the MC approval UI must display it. |
| MC-13 | Approval request card: impact at top, reasoning collapsed-but-expandable, policy trace as sidebar, expiry shown; expiry fails closed to DENY (never silently expires into yes); reviewer rationale recorded with identity + timestamp | Approval-gate design essay: https://medium.com/@creativemindsdev/agent-action-approval-gates-designing-the-human-in-the-loop-that-scales-8fead13e4270 | WEAK INDICATION | ADOPT NOW | This is the complete approval-queue item contract for the digest-pinned approval authority already in-repo (approval_request.py); "approvals do not silently expire into yes" is exactly PING's silence-is-never-approval law. |
| MC-14 | "The agent never merges": hard boundary line where approval records a decision but the protected effect stays a human action in a human tool; default-fallback policy (any action with no matching rule requires approval) | https://github.com/nasimuddinbd02/agentic-engineering-platform/blob/HEAD/docs/processes/07-human-approval.md | WEAK INDICATION | ADAPT LATER | The boundary phrasing is worth adopting as UI copy; the default-gated policy shape is for the ORCA actions block, not this lane. |

### B. Approval queues (WHO AUTHORIZED IT, WHEN, THE EXACT ARTIFACT)

| ID | Pattern | Source | Grade | Class | One-line rationale |
|----|---------|--------|-------|-------|--------------------|
| AQ-1 | Three formal review outcomes — Approve / Request Changes / Comment — with mechanical effects (N approvals unlock merge; changes-requested blocks it); new pushes dismiss stale approvals | GitHub review model: https://github.com/parshukumar/claude-notes/blob/HEAD/git-github/topic-16-pull-requests-code-review.md ; https://github.com/wrangleworks/wranglespy/blob/HEAD/docs/pull-request-workflow.md ; https://github.com/aiskillstore/marketplace/blob/HEAD/skills/dnyoussef/when-reviewing-pull-request-orchestrate-comprehensive-code-review/SKILL.md | CONFIRMED | ADOPT NOW | The canonical approval-queue UX; maps 1:1 to the existing digest-pinned approval authority. "An old approval is not evidence the concern was resolved" (wrangleworks, WEAK) is our correction-survival law in UI form. |
| AQ-2 | Pending (draft) reviews stored server-side per PR per user: comment now, submit later, cross-session resume free | https://github.com/kitlangton/ghui/blob/HEAD/plans/queued-reviews.md | WEAK INDICATION | ADAPT LATER | Reviewer-side batching for multi-item approval queues; do not import the GitHub review API noun, keep our approval-event shape. |
| AQ-3 | Approval routed by urgency to Slack / email / SMS / RCS as delivery channels | HumanLayer primitives (same source as MC-12) | CONFIRMED | REJECT | External-channel routing is platform machinery; approvals live in the Mission Control surface. Multi-channel delivery also collides with the cold-outreach holds. |
| AQ-4 | Pending-changes review queue: diff between latest accepted revision and last revision; accept, reject, or edit-from-review; pending edits visible only to logged-in users until reviewed | Wikipedia: https://en.wikipedia.org/wiki/Wikipedia:Reviewing_pending_changes ; https://en.wikipedia.org/wiki/Wikipedia:PC | CONFIRMED | ADAPT LATER | This is the owner-correction review arrow in production at planetary scale: unreviewed changes never reach the public; review is accept/reject/edit against the accepted baseline. |
| AQ-5 | "Does this look right to you?" owner notification: suggested change shown with context, owner answers Yes-correct / No-incorrect (optionally with reason), 4-day response window | Google Business Profile: https://gbppromote.com/blog/news/google-business-profiles-now-ask-owners-to-review-suggested-edits/ ; https://www.seroundtable.com/google-business-profiles-4-days-42139.html ; https://learn.nearbycalls.com/blog/google-business-profile-edit-four-day-deadline | STRONG INDICATION | PATTERN ONLY | Adopt the review-card shape (change + context + two-choice + reason field) for FYD owner correction; REJECT Google's auto-publish-on-expiry policy — PING never applies a correction on owner silence. |

### C. Evidence chains / claim-ledger viewers (WHAT EVIDENCE EXISTS)

| ID | Pattern | Source | Grade | Class | One-line rationale |
|----|---------|--------|-------|-------|--------------------|
| EV-1 | Inline citation chips anchored to the sentence they back (shortened-domain labels, +N badge for multi-source sentences), hover previews the exact backing sentence, Sources panel with count, Links tab with full URLs | Perplexity citation UI: https://github.com/klapom/aegis_rag/blob/HEAD/docs/adr/ADR-021-perplexity-inspired-ui-design.md ; https://github.com/pupok462/open-geo/blob/HEAD/engines/perplexity.md ; https://www.datastudios.org/post/how-to-use-perplexity-ai-for-effective-research-with-real-time-sources-file-uploads-and-citation-t | STRONG INDICATION | ADOPT NOW | The best production evidence-binding renderer in the wild: claim-to-sentence anchoring with zero-click evidence preview is exactly Ask FYD's evidence-before-eloquence contract rendered. |
| EV-2 | Claim card: the claim at top, who made it, verdict badge (True / False / Misleading / Partially True), fact-checker identity, date, click-through to the full assessment; topic and publication label filters | Google Fact Check Explorer: https://www.androidpolice.com/google-fact-check-explorer-guide/ ; https://gizmodo.com/how-to-use-google-s-fact-check-to-verify-claims-1851166049 ; (note: ClaimReview rich results retired June 2025 — https://github.com/01clauding/claude-seo-skill/blob/HEAD/references/schema-types.md) | STRONG INDICATION | ADAPT LATER | The shape of a claim-ledger viewer; our version adds the support set (the evidence events that earned the verdict) and replay, which Google's explorer does not have. |
| EV-3 | Full event history exportable as JSON from the UI (copy/download the execution's evidence bundle) | Temporal Web UI: https://github.com/temporalio/documentation/blob/HEAD/docs/web-ui.mdx ; https://github.com/temporalio/temporal-learning/blob/HEAD/docs/tutorials/go/background-check/durable-execution.mdx | CONFIRMED | ADAPT LATER | Replay-as-proof needs a portable evidence bundle; the UI just exposes what the authority already owns. |

### D. FYD website projections (evidence-bound rendering, owner correction CONFIRM / CORRECT / HIDE)

| ID | Pattern | Source | Grade | Grade note | Class | One-line rationale |
|----|---------|--------|-------|------------|-------|--------------------|
| FYD-1 | Refusal-to-hallucinate: no answer generated until retrieval succeeds; unanswerable renders as explicit UNKNOWN | Perplexity design (https://www.datastudios.org/post/how-to-use-perplexity-ai-for-effective-research-with-real-time-sources-file-uploads-and-citation-t) ; mirrors D365 Copilot "explicit unknowns" from the prior survey | STRONG INDICATION | — | ADAPT LATER | Ask FYD's evidence-boundedness rendered: a site that says UNKNOWN instead of inventing content is the product promise made visible. |
| FYD-2 | Pending edits visible only to logged-in users until reviewed; the public always sees the last accepted revision | Wikipedia pending changes (same sources as AQ-4) | CONFIRMED | — | ADAPT LATER | Owner corrections that are mid-review stay owner-visible; the public site never renders unreviewed claims. No new authority — the same correction event drives both projections. |
| FYD-3 | Suggested-edit review card: the change, its context, Accept / Reject, brief reason field; queue surfaced as "Edits from Google" cards | Google Business Profile queue mechanics: https://weproms.com/blog/stop-google-changing-your-business-listing-pakistan/ ; https://www.citedy.com/blog/gbp-suggested-edits-how-to-reject-google-changes-fast | STRONG INDICATION | — | ADAPT LATER | The CONFIRM/CORRECT/HIDE card: CONFIRM accepts, CORRECT edits-in-place (still an event), HIDE suppresses from projection with the event logged — never a deletion. |
| FYD-4 | Structured proposals: fields-delta + search-verified reason; undo / restore / roll-back as first-class actions that never erase history (an undo is itself just another saved version) | https://github.com/deicyde/wikilean/blob/HEAD/docs/propose-then-approve.md ; https://github.com/mde-pach/wiki-n-go/blob/HEAD/content/trust-and-moderation.md | WEAK INDICATION | — | ADAPT LATER | Owner corrections are proposals carrying a concrete delta and a reason; every reversal is a new event, so regen can never silently lose the correction. |
| FYD-5 | Record timeline as a VIEW over existing audited events (notes/tasks/calendar merged, reverse-chronological, derived not curated) | Twenty CRM timeline service: https://github.com/lift42/framework/blob/HEAD/discussion/2026_09_14_discussion_corpus_crm.md ; https://github.com/kristapsgoncoronoks-ship-it/bid_it/blob/HEAD/docs/design/crm-module-research.md | STRONG INDICATION | — | PATTERN ONLY | Any customer-facing "what happened" surface on an FYD site is a projection over the evidence plane — no separate history store. |
| FYD-6 | Staleness as a first-class signal: "rotting" flag (red after N days without movement), time-in-stage persisted as timestamped history rows | Pipedrive stalled-deal pattern + Twenty transition rows (same sources as FYD-5 / MC-11) ; prior survey Pipedrive ADOPT | STRONG INDICATION | — | ADAPT LATER | FYD claims get freshness rendering (stale claim flagged, not silently trusted); MC gets the same for stuck missions. Same primitive, two projections. |

### E. Run-observable cards (CRM-like record cards)

| ID | Pattern | Source | Grade | Class | One-line rationale |
|----|---------|--------|-------|-------|--------------------|
| RC-1 | Pipeline state as a status attribute on the record (no separate Lead entity, no hard conversion step); lifecycle = column, not table | Twenty CRM design consensus: https://github.com/kristapsgoncoronoks-ship-it/bid_it/blob/HEAD/docs/design/crm-module-research.md | STRONG INDICATION | REJECT | Data-model concern, not UI; and FYD/MC already have their own entity vocabulary — do not import a CRM lead model. |
| RC-2 | Saved filter-defined buckets feeding a drain-the-queue cadence ("drain the queue" Smart Views) | Close CRM, prior survey (ADAPT) | STRONG INDICATION | PATTERN ONLY | Vocabulary for MC queue views; the filter mechanism is spec X-15's faceted filtering. |
| RC-3 | Staleness SLA: no-activity-in-7-days flagged stalled; mandatory triage inbox with 48h age SLA | Pipedrive (prior survey, ADOPT the pattern) + Linear triage (prior survey, ADOPT) | STRONG INDICATION | ADAPT LATER | Derived-staleness SLAs for MC queues must be explicit policy events with an owner, never magic numbers. |

### F. Already harvested in prior lanes (reference only — NOT re-classified)

| Pattern | Prior verdict | Why no re-classification |
|---------|---------------|--------------------------|
| Fin failure-trace debugger: trace -> root-cause -> proposed edit -> replay proof -> standing monitor | crm-agentic-harvest report ADOPT #1 ("single strongest steal") | Mechanism-level harvest already done; UI shape is EV-3-adjacent. |
| Lindy approval gates + draft-by-default + request/draft/approval in one thread | report section 7, ADOPT the primitives | Already the approval policy; MC-13/AQ-1 are its rendering. |
| HubSpot Agent Hub live status console (per-agent identity, permission scope, spend budget, live status) | archaeology SYNTHESIS, best agent-governance surface | Mechanism captured; UI shape is the MC-1 console pattern. |
| Attio version-pinned runs with per-attempt retry records | archaeology C3 (folded into evidence chain) | Defer full run-versioning to ORCA 20-30. |
| HubSpot approved-content grounding envelope (content-source registry + citation invariant) | archaeology | The citation-invariant half is EV-1's contract; grounding envelope is content-policy, not UI. |
| Gumloop per-node run observability with cost accounting | report ADOPT the pattern | Superseded by the stronger Temporal/Langfuse shapes above. |
| n8n failure localization (failing step highlighted, upstream grey, error on click) + per-execution detail | UI_HARVEST_SPEC X-54/X-55 | Already in the spec. |

---

## Counts

- ADOPT NOW: 6 (MC-1, MC-2, MC-12, MC-13, AQ-1, EV-1)
- ADAPT LATER: 15 (MC-3, MC-4, MC-5, MC-9, MC-14, AQ-2, AQ-4, EV-2, EV-3, FYD-1, FYD-2, FYD-3, FYD-4, FYD-6, RC-3)
- PATTERN ONLY: 7 (MC-6, MC-7, MC-8, MC-11, AQ-5, FYD-5, RC-2)
- REJECT: 3 (MC-10, AQ-3, RC-1)

30 patterns classified in total (excl. the 7 reference-only prior harvests).

## Top 3 (ADOPT NOW, build-ready)

1. **Stuck-work hero surface (MC-1 + MC-2).** PagerDuty-style OPEN/ACK counter cards that
   drill into filtered queues, backed by Temporal's "Pending Activities" view with
   retry/failure metadata. This answers WHAT IS STUCK / WHY — the exact shape of the 25
   stuck claim-missions failure. Pure projection over existing mission events; no new
   authority, no new store.
2. **Inline evidence citations (EV-1).** Perplexity-style citation chips anchored to the
   sentence they back, hover-preview of the exact backing sentence, Sources panel with
   count. This is Ask FYD's and the FYD website's evidence-before-eloquence contract
   rendered as product; our version binds chips to immutable journal events, which
   Perplexity does not do.
3. **Approval queue item contract (MC-13 + AQ-1).** GitHub's three formal outcomes
   (Approve / Request Changes / Comment) with mechanical effects, rendered as an
   approval card with impact at top, reasoning collapsed-expandable, policy trace in a
   sidebar, expiry shown, expiry failing closed to DENY, reviewer rationale recorded
   with identity + timestamp, Run ID / Call ID attribution. This is the rendering of the
   existing digest-pinned approval authority (approval_request.py) and PING's
   silence-is-never-approval law.

## Search record (for replication)

Queries 1-11 listed under Method, all run 2026-09-30 via browser.search. All source URLs
above are verbatim from the search-result `Full URLs` sections; no URLs were constructed
or shortened.

## Open questions for the parent coordinator

- MC-1's hero surface will duplicate some served MC-shell panels; confirm whether the
  served shell (commit 51831c61) already has a stuck-missions view before building, to
  avoid duplicating the MC-serve worker's work.
- EV-1 on FYD websites: claim-to-sentence anchoring assumes rendered claims carry stable
  claim IDs — confirm the Ask FYD claim ledger emits claim IDs the projection can bind to.
- AQ-5's 4-day expiry shape is PATTERN ONLY deliberately; Google's auto-publish-on-expiry
  is REJECTED as policy for PING (no correction on owner silence) — flag if the owner
  wants any expiry behavior at all on owner-correction review.
