# HubSpot Deep Study

CRM archaeology, 99-hour convergence program. Observed 2026-09-30. Evidence grade legend used throughout:
CONFIRMED (independently corroborated by at least one non-vendor source or live artifact),
VENDOR-DESCRIBED (vendor docs, press releases, or partner recaps of vendor announcements),
UNCLEAR (claimed but not verifiable in this pass, or contradicted by caveats).

Prior survey grades from the 2026-09-30 CRM sweep (for the confirm/change record at the end):
continuity B; Mechanism 1 Agent Hub + Agent Builder ADAPT; Mechanism 2 Breeze Intelligence + Data Agent ADAPT.
July 2026 ToS data-pooling reversal (independently corroborated); Warmly acquired by HubSpot.

## 1. Agent model

**Prospecting Agent.** Monitors target accounts for buying signals (40+ per the Fall '26 Spotlight announcement, VENDOR-DESCRIBED), scores them against the rep's ICP, assembles a buying group, drafts personalized outreach (hubspot.com/spotlight, VENDOR-DESCRIBED). Practitioner-confirmed mechanics (insidea.com recap of the HubSpot catalog, verified 2026-09-05, CONFIRMED): the agent runs on **plays**, each play declaring audience segments, the intent signals it watches, personas (up to 3 matching contacts per company), selling context, outreach style (sequence or adaptive), **guardrails** (what it may not say: pricing, competitors, discounts), and automation level. The play is tested against a real contact, then published; the rep approves recommendations and enrolls them. Contact data is BYOK: the agent requires a connected provider (ZoomInfo, Apollo, Surfe); HubSpot ships no contact data of its own (orangemarketing March 2026 recap, CONFIRMED). Daily limits on new contact suggestions apply. Fall '26 Spotlight refresh (businesswire 2026-09-16, VENDOR-DESCRIBED): the agent now researches target companies and generates outreach on its own rather than needing rep-fed talking points; it sources contacts on demand from top data providers; partner recap of UNBOUND26 adds that "emails improve with every rep edit" and that outbound matches brand voice (spitfireinbound, VENDOR-DESCRIBED via partner recap of vendor announcements).

**Customer Agent.** Points at an owner-curated content registry and answers only from that content, with citations per claim (see Content model for the registry mechanics). CONFIRMED via official knowledge base docs: content sources are KB articles, website pages, landing pages, blogs, uploaded files, imported public URLs, and manually authored short answers; per-source citation toggles; private content never cited; weekly re-sync for most sources, auto re-sync on KB article updates. Models per HubSpot AI Model Cards: GPT-4.1, 4.1-mini, 5.1, 4o, 4o-mini (eesel.ai, VENDOR-DESCRIBED). Roles: Customer Support, Marketing Specialist, Sales Representative; selectable personality and brand voice; channels: WhatsApp, Facebook, Live chat, Email (beta); configurable human handoff (keep agent assigned or transfer to a user/team) (man.digital, VENDOR-DESCRIBED). Post-sale: generates KB articles from resolved tickets, i.e. closed-loop content production (spitfireinbound UNBOUND26 recap, VENDOR-DESCRIBED). Practitioner guardrail pattern observed in the wild (GitHub skill, CONFIRMED as a real deployed pattern): never quote exact figures, explicit sanctioned-country decline list, never name competitors, never expose KB names, and fallback never says "I don't know" but bridges to a human.

**Other agents.** Revenue Agent: monitors open invoices, sends personalized payment reminders, answers billing questions, adapts or escalates (routine late payment vs support issue vs billing dispute); in public beta on all plans (spitfireinbound UNBOUND26 recap, VENDOR-DESCRIBED). Breeze Assistant: the conversational entry point on every plan including Free, now able to delegate to other agents (e.g. "tell it what you need done, like prospecting... it can then pull in the updated Prospecting Agent") (Fall Spotlight, VENDOR-DESCRIBED). Deal Loss agent and Call Recap agent are runnable as workflow steps (official KB, CONFIRMED). Deal Progression (public beta, paid Sales/Service seats): transcripts feed automatic CRM updates with one-click approval (VENDOR-DESCRIBED). Mobile Notetaker and Revenue Hub (auto-generated quotes) round out the Fall '26 agent surface (VENDOR-DESCRIBED).

**Agent Builder production guardrails (official HubSpot partner guide, CONFIRMED via offers.hubspot.com):** keep the first version narrow; prefer deterministic properties/branches after an agent step; use Unknown/Review when evidence is incomplete; never let the agent change ownership, deal stage, amount, close date, or customer-facing communications without an explicit reviewed action; least-privilege tools/data; a human approval step for high-impact CRM writes until trust is earned; monitor false positives/negatives, missing-data rates, duplicate runs, task completion. Sample instruction from the guide: "Do not treat silence as positive. Do not infer sentiment without evidence. Every conclusion is tied to available CRM evidence or marked uncertain."

**Governance surface.** UNBOUND 2026 (bluleadz recap, VENDOR-DESCRIBED): Agent Hub + Agent Builder GA for Pro/Enterprise with Starter rolling out; "manual edits always override automation; AI suggestions need approval before touching a record"; Breeze Assistant on every plan including Free; Context Home scores context completeness; Growth Context is the shared context layer across agents. Context tiers with blast-radius boundary tests: public-safe / team-operational / customer-specific (record-level permissions, source citations) / restricted decision context (hackernoon, Sept 2026, CONFIRMED as independent analysis). Custom assistants were deprecated (no new creation from 2026-06-19; read-only, auto-migrated to Breeze projects 2026-07-13) (imisofts, CONFIRMED). Breeze Agents can consume external MCP servers (Linear, Gong, Amplitude, G2) via plain language (imisofts June 2026, CONFIRMED). Readiness audit from an independent partner: field completeness target 80%+, custom property governance, KB freshness <=12 months, written governance policy with kill-switch ownership (mountainise, CONFIRMED).

**Credits.** Prospecting Agent: 100 credits per outreach recommendation ($1.00); Customer Agent: 50 credits per resolved conversation ($0.50); Data Agent: 10 credits per response ($0.10). Workflow AI actions: 10 credits per run (insidea.com transcribed from the HubSpot catalog 2026-09-05, CONFIRMED).

**Warmly.** Agreement to acquire announced June 30, 2026 by co-founder/CEO Maximus Greenwald; terms undisclosed; described as closed/past-tense in the Sept 16, 2026 Spotlight release (CONFIRMED). HubSpot's stated intent: embed Warmly's Inbound Agent and TAM Agent into the Smart CRM and Data Hub (martal.ca summary, CONFIRMED as a characterization of stated intent). What Warmly brings: person-level website visitor identification (50%+ of anonymous visitors resolved to named individuals per vendor characterization), turning company-level intent (HubSpot's existing reverse-IP Buyer Intent tools) into person-level contact data (designrush, automatedsalesmachine, onlinesalesguidetip, CONFIRMED as the acquisition's rationale). Caveats: person-level identification is US-only (IP must resolve inside the United States); integration timeline post-acquisition remains open-ended (CMSWire via getbreakout.ai, CONFIRMED).

## 2. Data model

Uniform REST API: `/crm/v3/objects/{objectType}`; standard objectTypeIds: contacts 0-1, companies 0-2, deals 0-3, tickets 0-5; custom objects as `2-<n>` or `p_<name>`; date-versioned paths rolling out (`/crm/objects/2026-03/...`); v4 unsupported after 2027-03-30 (anthropics claude-tag-plugins SKILL.md, CONFIRMED). Properties are opt-in on reads. Rate limits: 100 requests/10s per OAuth token (axia research, CONFIRMED). Scopes: `crm.objects.*`, `crm.schemas.*`, `automation`, `settings.users.*`.

Dedup semantics (terraform-provider research, CONFIRMED): contacts dedupe on email (a create with an existing email returns 409 with the existing ID, which is a discovery primitive); companies on domain; deals/tickets have no dedup. Batch upsert via `idProperty` is the idempotent path (chunk 100). DELETE is archive: a 90-day recycle bin, restore is UI-only.

Associations are typed, labeled, many-to-many: up to 50 labels per object pair; single labels (one-directional) vs pair labels (bidirectional). Live proof from a real portal (ampliorcloud, pulled via HubSpot MCP 2026-06-27, CONFIRMED): contacts-to-companies associations carry Primary and Billing Contact labels. Custom objects: up to 10 definitions (Enterprise), roughly 1,000 custom properties per object (ledger-ai prism, CONFIRMED). Dedup API endpoints: `/crm/v3/objects/contacts/duplicates/preview` (returns match_score and matched_fields), `/merge` (craftos-dev, CONFIRMED).

## 3. Trigger model

**Agent Hub workflows (official KB, CONFIRMED).** The 2026 builder supports: Property value changed, Record created, Form submission, Records match criteria (NEW), Run manually, Run on a schedule (NEW), Webhook event is received (NEW), plus app triggers from Slack and Google Sheets (~1-min poll; identical rows do not re-trigger) (resonatehq live portal replica, CONFIRMED). Differences vs legacy workflows, verbatim from the official differences table (CONFIRMED): setup may start with actions OR triggers (legacy: triggers first); triggers and object type can be changed at any time (legacy: object type immutable); triggering does not require an enrolled record (manual/scheduled/external triggers supported; legacy requires an enrolled record); scheduled workflows trigger same-day if the time has not passed (legacy begins checking the next day); external event triggers from Slack/Google Sheets/Webhooks supported (legacy: not supported); action targeting via Find one record / Find one associated record (legacy: enrolled and associated only, less precise); tokens can combine different CRM records and external sources like a Google Sheet row (legacy: enrolled record tokens only); agent actions can create AND run custom agents plus Agent Marketplace agents (legacy: only installed agents via Run agent). Re-enrollment is a "Records can repeat runs" toggle under the Rules tab, not available for manual/scheduled triggers. One limitation: you cannot manually enroll records in Agent Hub workflows; the manual trigger runs actions with no enrolled record.

**Legacy workflows (skill-research, CONFIRMED).** Enrollment criteria: LIST_BASED, EVENT_BASED, MANUAL; filter types PROPERTY, FORM_SUBMISSION, IN_LIST, and more (hubspot-workflow-documenter, CONFIRMED). Flow types CONTACT_FLOW vs PLATFORM_FLOW. Re-enrollment is opt-in (`shouldReEnroll`); default is enroll-once.

## 4. Permission model

Field-level permissions exist: view+edit / view-only / no-access per property per user or team (Enterprise) (ledger-ai prism, CONFIRMED). **Caveat: they are UI-only and not enforced on API writes** (terraform-provider research, CONFIRMED but single-source; treat as strong indication, not multi-corroborated). Permission sets became stackable in May 2026, multiple per user (Enterprise) (spitfireinbound, CONFIRMED).

**User-Level Apps (shipped 2026-09-15, platform 2026.09+, CONFIRMED via sidekickstrategies):** app actions are evaluated against the intersection of the app's permissions AND the triggering user's CRM permissions at action time, and actions are attributed to the user in audit logs. This is the sharpest permission primitive found: least-privilege is computed at execution time from both the app and the human, and the human is named in the log.

Official MCP access is limited by the connecting user's permissions (templated.io, CONFIRMED). Audit logs: Enterprise-only, 30-day window (terraform, CONFIRMED). AI governance settings: admins can manage AI feature access and configure what data is shared; AI Trust FAQs and AI Model Cards publish named models and security controls (official KB, CONFIRMED).

Privacy boundary worth noting (official Customer Agent docs, CONFIRMED): private content is never cited by the agent, but it still appears in responses; HubSpot's own docs warn not to include personal, confidential, sensitive information, or private customer data. Citations are suppressed but content is not withheld.

## 5. Workflow model

The enrollment engine with sequential actions, delays, branches, loops (andrewm621 skill, CONFIRMED). Action shapes key on `type` first: SINGLE_CONNECTION, LIST_BRANCH (filterBranch + defaultBranch), STATIC_BRANCH, WEBHOOK (hubspot-workflow-documenter, CONFIRMED). Agentic actions: Run custom agent (create and run custom agents or Agent Marketplace agents); "Create new agent" takes a plain-language prompt describing the agent's actions (official KB, CONFIRMED). The Run manually trigger can run a set of agents with no enrolled record.

Custom code actions: sandboxed Node.js (Python in beta); **cannot call the HubSpot API during execution**; use output properties instead (mx-hubspot-automation skill, CONFIRMED). AI actions in workflows: summarize, and Data Agent: Research (VENDOR-DESCRIBED). Unconnected "placeholder actions" may be saved when an action is not fully configured (official KB, CONFIRMED). Webhook trigger/action requires Data Hub Pro/Enterprise (CONFIRMED). Workflow goals exist (early exit on goal met).

Breeze-generated workflows have documented limitations from practitioner playbooks (growth-today, CONFIRMED): they create event-based OR triggers but not AND filters; cannot do "is unknown" branches, re-enrollment, or goals. Practitioner verdict: AI-generated workflows are a starting scaffold, not production logic.

## 6. Human approval model

**There is no native approval-step workflow action.** The only "Approval step before an action -> Send Approval (Slack, Email)" in the ecosystem is a third-party app (0CodeTools), per the resonatehq trigger/action mapping (CONFIRMED). Approval lives at the agent layer and in posture, not in the workflow engine:

- Agent Builder production guidance (official, CONFIRMED): human approval step for high-impact CRM writes until trust is earned; never let an agent change ownership, deal stage, amount, close date, or customer-facing communications without an explicit reviewed action.
- UNBOUND posture (VENDOR-DESCRIBED): "AI suggestions need approval before touching a record"; "manual edits always override automation."
- Prospecting Agent: drafts go to rep review before enrollment (review-before-sending recommended at Seed stage; hubspot.com/startups, VENDOR-DESCRIBED); test a play against a real contact before publishing (CONFIRMED).
- Customer Agent: preview before go-live; scale from a small percentage of conversations (eesel.ai practitioner, CONFIRMED).
- Deal Progression: automatic CRM updates land with one-click approval (VENDOR-DESCRIBED); MCP landing-page publish requires explicit confirmation (CONFIRMED).
- Practitioner approval pattern in the wild (jorgedss discount-card repo, CONFIRMED): approval = a human edits a property in the CRM UI; the workflow re-enrolls; authorization is checked server-side via `propertiesWithHistory.updatedByUserId` (only human UI edits count as approval); idempotency via immutable `*_original` snapshots. External-agent pattern (promptmetrics skill, CONFIRMED): pause at the first write, human approves an action_id, then verify by re-reading.

## 7. Observability

Agent Hub workflow run history: 30 days only, with Started / Done / Action required counts, per-record run history, and filters for date triggered, version, status, and errors-only (official KB, CONFIRMED). The version filter confirms workflows retain versioned definitions. Legacy workflow History tab confirms custom code execution including timeout details (absmartly, CONFIRMED). Agent Hub provides a live status console for agents (prior survey, CONFIRMED). Audit and security logs require Enterprise (tidalcontrol, CONFIRMED), with a 30-day window. Gaps: 30-day run history is short; audit is Enterprise-gated; deleted-then-archived records restore only through UI.

## 8. Replay/retry

Custom code action retry semantics (absmartly quoting HubSpot docs, CONFIRMED): 20-second timeout, 128MB memory; 429/5xx errors are automatically retried for up to 3 days; try/catch must re-throw or the retry never happens. Re-enrollment is opt-in (default enroll-once) in both legacy and Agent Hub workflows (CONFIRMED). Workflow revert is blocked for workflows containing webhook or custom-code actions; audit trail is Enterprise-only with a 30-day window (terraform, CONFIRMED). Merges are permanent with no un-merge, which makes identity changes one-way (mountainise, CONFIRMED). No published semantics for full deterministic replay of an agent run were found; observability is counts + per-record logs, not execution traces.

## 9. Connector/API/MCP

**Official remote MCP (GA 2026-04-13, CONFIRMED via shawnla90, templated.io, promptmetrics):** `mcp.hubspot.com`, OAuth 2.1 + PKCE, roughly 12 generic tools; writes CRM objects and engagements; reads marketing, content, and org context; landing-page create/edit with explicit confirmation required before publish. Microsoft's agents-toolkit measured a 401 with `resource_metadata` on the unauthenticated surface (CONFIRMED). Gaps as of July 2026 (CONFIRMED): no custom objects, no marketing writes, no Conversations, no multi-portal. Community servers fill the gaps: shinzo-labs (~112 tools), axonops (76 tools, custom objects + marketing) (CONFIRMED). Separately, Breeze Agents can consume EXTERNAL MCP servers (Linear, Gong, Amplitude, G2) via plain language (imisofts June 2026, CONFIRMED): HubSpot agents read third-party context, not just expose HubSpot data.

**Webhooks/API.** Subscription-based webhooks: journal API at 100 req/s, subscriptions at 50 req/s (axia research, CONFIRMED). GraphQL is limited (HubDB, associations). App Marketplace: 1,000+ apps (marketplace count) / 2,000+ integrations claimed in Spotlight (VENDOR-DESCRIBED). First-party connectors noted for the Customer Agent: Confluence, Jira, Notion (eesel.ai, CONFIRMED).

## 10. Content model

This is the Customer Agent grounding envelope, documented in the official knowledge base (CONFIRMED). Content sources are added under Train > Knowledge:

- **From HubSpot sync:** knowledge base articles, website pages, landing pages, blogs (checkbox select).
- **Upload a file:** docx, htm, xhtml, cfg, pptx, mpg, conf, mpeg, csv, json, html, text, txt, mp4, pdf, rst, avi, mov, md, webm, xml, xls.
- **Import from public URLs:** up to 5,000 URLs per domain crawled and synced, with path include/exclude filtering and subdomain scoping (all pages on domain, path-matching only, subdomain only); individual imported URLs can be excluded from refresh, and an Excluded tab lists them.
- **Short answers:** manually authored question/answer pairs (supports links and images).

Freshness mechanics: KB article updates trigger automatic re-sync; all other sources re-sync weekly; manual Refresh is available; sync status and error troubleshooting are exposed in the UI. Citation policy: a per-source citations toggle controls whether the agent cites that source; private content has citations auto-disabled (but still appears in responses, per the Section 4 caveat).

Staleness risks documented by practitioners (eesel.ai, CONFIRMED): imported help centers (Zendesk, Help Scout) are **one-time copies, not live sync**; login-gated pages fail the crawler (workaround: upload a PDF); weak operating context produces shallow-feeling AI ("AI is going to feel shallow because it is working from weak operating context"). Independent partner readiness rule: KB freshness <=12 months, field completeness >=80% (mountainise, CONFIRMED). Closed loop: the Customer Agent generates KB articles from resolved tickets (UNBOUND26, VENDOR-DESCRIBED), so resolved conversations can become approved content.

## 11. Identity model

**Duplicates.** A daily scan surfaces duplicates with High/Medium/Low confidence ranked suggestions; there is no auto-merge by default (mountainise 2026 guide, CONFIRMED). Programmable auto-merge requires Data Hub Pro/Enterprise; bulk merge up to 50 via UI. Merges are **permanent with no un-merge** (CONFIRMED). At merge: the primary keeps its original source and first-touch attribution; the secondary's original source and first-touch attribution are deleted (real data loss, CONFIRMED); property values default to the primary; timeline and associations are combined.

**Merge Rules (Data Hub Pro/Enterprise, Aug 2026, CONFIRMED via sidekickstrategies):** waterfall of up to 5 conditions plus a tiebreaker to pick the surviving record; invoked manually via the "Merged by" dropdown; automated bulk merging is a planned future capability; property-value override coming soon. Duplicate preview API (`/duplicates/preview` with match_score and matched_fields) and `/merge` exist (craftos-dev, CONFIRMED); the agent-cli skill gates merges behind dry-run/digest/confirm because they are irreversible. Duplicate/dedupe rules themselves are UI-only with no public API (terraform, CONFIRMED).

**Discovery primitives.** Creating a contact with an existing email returns 409 with the existing ID (idempotent discovery path, CONFIRMED). Companies dedupe on domain. Association labels (up to 50 per object pair, single vs pair direction) let one identity carry many roles (Primary, Billing Contact) (CONFIRMED). Warmly's person-level identification (US-only) is the newest enrichment input into identity (Section 1).

## 12. Attribution model

Nine documented models (metricasoftware, CONFIRMED, all with published credit math):

- First Interaction, Last Interaction, Linear (equal credit).
- U-shaped: 40% first interaction, 40% lead conversion, 20% rest.
- W-shaped: 30% first interaction, 30% lead conversion, 30% deal creation, 10% rest; **deal-based only, returns null when the deal create date predates the contact create date** (documented null trap, CONFIRMED).
- Time Decay: 7-day half-life.
- Full Path: 22.5% x 4 (first interaction, lead conversion, deal creation, closed won) + 10% middle; revenue reports only, Enterprise-only.
- J-shaped: 20/60/20; Inverse J-shaped: 60/20/20.

Data collection: emails, form submissions, page visits, social clicks, ad engagement feed contact-to-deal association reports (CONFIRMED). Tiering: free CRM tier has basic first/last-touch; Pro ($800/mo) / Enterprise ($3,600/mo) unlock multi-touch (factors.ai, CONFIRMED). Native CRM integration means no sync is needed; coverage is limited to HubSpot-tracked interactions; independent analysis (cometly, CONFIRMED) rates it stronger at campaign/channel attribution than at ad/creative-level attribution.

## 13. Learning loop

This is the weakest-evidenced dimension in this pass. Vendor claims (VENDOR-DESCRIBED, not independently verified): "The more your team uses it, the better the outreach gets" (Fall Spotlight); "emails improve with every rep edit" and Prospecting matches brand voice (partner recap of vendor announcements); "Breeze Assistant customers generate 2.2x more leads"; "Prospecting Agent influenced 27% pipeline increase." The plausible concrete mechanisms: brand voice selection (manual), rep edits to drafts (manual, and the vendor framing is that the HUMAN learns from reading drafts, per hubspot.com/startups), KB articles generated from resolved tickets (closed-loop content production, vendor announcement via partner recap), and practitioner monitoring of false positives/negatives, missing-data rates, duplicate runs, task completion (manual governance).

**UNCLEAR:** no independent evidence was found in this pass of an automated learning mechanism: no documented thumbs up/down feedback feeding future behavior, no outcome-based weight updates, no published description of what "gets better" or how. The one honest independent observation on the whole topic: weak operating context caps agent quality regardless of the model (eesel.ai, CONFIRMED).

## What HubSpot does better than PING

- **Evidence-grounded answers as a product contract.** The Customer Agent's approved-content registry (named sources with owner, re-sync cadence, citation policy), answers-only-from-retrieved-content behavior, per-claim citations, and private-sources-never-cited rule is a shipped mechanism, not a design aspiration. PING has evidence chains but no enforced grounding envelope with a citation policy per source.
- **Specialized-agent decomposition over one shared CRM.** Prospecting (signal monitor), Customer (support), Revenue (collections), Data (hygiene) are scoped agent identities with distinct guardrails and budgets, coordinated by Breeze Assistant, instead of one general agent doing everything. PING runs fewer, more general agents.
- **Play-shaped bounding contracts.** A Prospecting play is a single document: audience, signals watched, personas, selling context, outreach style, guardrails, automation level. Test it against a real contact, then publish. The bounding contract is data, not code, and it is the thing that gets reviewed.
- **Approval posture embedded in the agent UX.** Review-before-send as the default, one-click approval on Deal Progression, manual edits always override automation, AI suggestions need approval before touching a record. Approval is the product's default setting, not a bolted-on step (especially notable because there is no native approval workflow action at all).
- **Governance surface maturity.** AI feature access settings, AI Trust FAQs, published AI Model Cards naming the models, Context Home scoring context completeness, context tiers with blast-radius boundary tests, readiness audits with kill-switch ownership. This is the most complete agent-governance surface in the CRM sweep.
- **Action-time permission intersection.** User-Level Apps evaluate every action against the intersection of app permissions AND the triggering user's CRM permissions at execution time, and attribute the action to the user in audit logs. PING's authorization is strong at the proposal layer; HubSpot's is computed per action at the point of effect.
- **Attribution as built-in math.** Nine models with published credit splits and a documented null trap (W-shaped). PING does not have a comparable built-in multi-touch credit model.

## What PING does better than HubSpot

- **History is a constitutional guarantee, not a 30-day window.** HubSpot workflow run history is 30 days; audit logs are Enterprise-only with a 30-day window; workflow revert is blocked for webhook/custom-code workflows; merges are irreversible and delete the secondary's attribution. PING's append-only event plane, evidence layer, and replay semantics have no analogue.
- **Deterministic replay.** PING guarantees same causal history produces same state. HubSpot has no published replay semantics; Agent Hub scheduled triggers fire same-day-if-time-remains while legacy checks next-day, a genuine nondeterminism footgun across the two engines.
- **Permissions actually enforced.** PING enforces its authority boundaries; HubSpot's field-level permissions are UI-only and not enforced on API writes (single-source, flagged).
- **Approval is an explicit event.** PING has AUTHENTICATED ACTOR to PROPOSAL DIGEST to AUTHORIZATION to APPROVAL EVENT to EFFECT. HubSpot has no native approval-step workflow action; approval is posture and practitioner convention (human UI edits as the authorization signal), enforced by discipline rather than by the system.
- **Unknown is first-class.** PING renders UNKNOWN as UNKNOWN. HubSpot's Agent Builder has to warn practitioners explicitly not to treat silence as positive and not to infer sentiment without evidence, because the product's default posture leans toward inference.
- **Honest learning claims.** PING's learning loop is MarketingOS: real observations, claim ledgers, falsification. HubSpot's "the more you use it the better it gets" has no published mechanism and no independent verification.

## Harvest primitives (exactly 2)

### Primitive 1. The approved-content grounding envelope (evidence-grounded answers)

Smallest steal: a content-source registry per PING knowledge domain (named sources with owner, re-sync cadence, citation policy) plus an invariant: answers may only be generated from retrieved approved content, every claim carries a source citation, private sources are never cited, and unanswerable questions resolve to explicit unknown-or-human-handoff instead of fabrication. This directly strengthens the Ask FYD evidence-boundedness contract, which is already product law; it gives that law a mechanism instead of a principle. Evidence: official HubSpot Customer Agent content-source and citation management docs (CONFIRMED).

### Primitive 2. The play-shaped agent bounding contract (specialized-agent decomposition)

Smallest steal: each PING agent is declared in one play-shaped document: identity, scope, tool allowlist, guardrail list (what it may not say or touch), automation level, spend budget, and human-approval threshold; the play is tested against a real record before publish; a live status console shows per-agent state. Multiple specialized agents (signal monitor, support, hygiene) operate over one shared object graph instead of one general agent with ambient authority. Evidence: Prospecting Agent play mechanics, Agent Builder production guardrails, Agent Hub live status console (all CONFIRMED).

## Confirm/change record vs the prior survey

- **Continuity B: CONFIRMED.** Agent Hub run history + live status console + approval posture confirm the best agent-governance surface in the sweep. The qualification stands and sharpened: agent writes still hit snapshot records; merges remain irreversible with attribution data loss; private Customer Agent content appears in responses uncited; field-level permissions are UI-only on API writes.
- **Mechanism 1 (Agent Hub + Agent Builder, ADAPT): CONFIRMED and sharpened.** User-Level Apps (2026-09-15) adds action-time permission intersection with human attribution; the official Agent Hub vs legacy differences table and the play-shaped bounding contract give the harvest a crisper shape than the survey had.
- **Mechanism 2 (Breeze Intelligence + Data Agent, ADAPT): CONFIRMED and sharpened.** The content-source registry with per-source citation policy and weekly re-sync is the concrete harvest shape; Data Agent: Research as a workflow AI action at 10 credits/run is the automation entry point.
- **July 2026 ToS data-pooling reversal:** no new evidence in this pass; neither confirmed nor contradicted.
- **New since the survey:** Warmly acquisition closed (June 30, 2026 agreement; past-tense by Sept 16), feeding person-level intent into signal monitoring; Revenue Agent (public beta); Prospecting test-against-real-contact before publish; custom-code retry semantics (429/5xx, up to 3 days, re-throw required); official MCP GA details plus gaps (no custom objects, marketing writes, Conversations, multi-portal as of July 2026); Merge Rules (Aug 2026, manual-only, automated bulk planned); 2026 trigger set (Records match criteria, Run on schedule, Webhook event); no native approval workflow action (third-party only); Zendesk/Help Scout imports are one-time copies, not live sync.
- **Weakened or caveated vs the survey:** field-level permissions are UI-only on API writes (single-source caveat); private Customer Agent content is not cited but still appears in responses (privacy boundary is citation-only, not content-withholding); W-shaped attribution returns null when the deal create date predates the contact create date; Agent Hub scheduled triggers fire same-day while legacy checks next-day (cross-engine nondeterminism).
