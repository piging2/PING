# CRM / Agentic Harvest Notes — 2026-09-30

Researcher: isolated web-research subagent. Method: browser_search + browser_open-style text fetch.
Evidence grades: **vendor-described** (vendor pages/blogs), **independent** (official docs, engineering blogs, GitHub repos, independent reviews, multi-source), **unreplicated** (single-source only).

## 1. Attio

### Mechanism 1: Lists — curated, single-object collections that carry per-entry stage/process state
Stated generically: a data-model primitive where a *List* is a collection of records from one object (People, Companies, Deals, custom objects), and each list *entry* carries its own stage/status fields independent of the underlying record. The CRM pipeline view is a list with entry-stage attributes; the record's attributes (email, phone) stay separate from the process state (deal stage, list membership, priority). Custom objects + custom relationships let you model Investors/Partners/Jobs alongside Companies/People without shoehorning. Idempotent entry ops (`assert` entry = upsert into list) are first-class API semantics.

Evidence grade: **independent**. Technical evidence in the wild: `attio-cli` open-source CLI docs show `entries assert` (idempotent add), `entries put` (full replace), attributes archivable not deleted (soft-delete), webhooks on `record.created` (https://github.com/leadgrowgtm/attio-cli/blob/HEAD/docs/workflows/skill-workspace-snapshot.md); deepline GTM playbook documents the upsert-first pattern (`attio_assert_record` by email/domain, then auto-enrich, then poll) (https://github.com/getaero-io/gtm-eng-skills/blob/HEAD/skills/deepline-gtm/provider-playbooks/attio.md); independent reviews (https://www.craftt.io/blog/why-attio-crm, https://clonepartner.com/blog/ultimate-guide-attio-crm-2025). Marketing framing ("most flexible CRM") on vendor site is vendor-described.

### Mechanism 2: Workflow trigger/action algebra on record + list-entry events
Stated generically: automations keyed off typed events — record created/updated/deleted, list entry created/updated — with a small fixed action set (create list entry, add note, update record, create task, delete entry). Trigger enumeration is public and stable enough that third-party orchestrators (Zapier, viaSocket) enumerate it as the integration surface. This makes the CRM a *reactor* on its own state changes rather than a passive store.

Evidence grade: **independent (unreplicated per trigger list)**. Trigger list enumerated by viaSocket (https://viasocket.com/integrations/attio/microsoft-outlook): Record created / updated / deleted, List Entry created / updated, New Task created; actions: Create List Entry, Add Note, Update Record, Create Task, Delete Entry. Same semantics echoed in the deepline playbook above (pipeline qualification: query → create entry → create task → create note).

### Continuity grade: **B**
Per-record interaction history, `last_interaction_at`, tasks, notes, and webhooks on record.created give a real activity timeline with event plumbing; but field-level history is vendor-claimed and migration notes show historical activity (emails/notes/call logs) is stored separately from record data and must be backfilled via a second import pass (https://theautomationsguide.com/blog/2026-09-02-migrate-from-pipedrive-to-attio-without-losing-deal-history/). No immutable event log or replay semantics evident. One-line: real timeline + event webhooks, but snapshot record model with history kept in a sidecar, not an event-sourced ledger.

### Harvest pipeline
- Mechanism 1: REACH — yes, generic data-model idea, zero dependency. NEED — for technical buyers, the record-attributes vs process-state split is the exact distinction PING's owners care about (owner-governed current fact vs evidence trail); for trades owners, a "list = today's job list with stage per entry" maps 1:1 to a day's work. TESTED — production, large third-party ecosystem (attio-mcp-server, CLI tools). SMALLEST — the primitive: **process state lives on the membership edge (record-in-list entry), not on the record**. Verdict: **ADAPT**.
- Mechanism 2: REACH — yes. NEED — medium; PING already has an event plane. The value is the small fixed trigger/action vocabulary, not the workflow product. TESTED — production (Zapier/viaSocket surface). SMALLEST — **typed triggers (record.x, entry.x) + bounded action set** as an event-projection grammar. Verdict: **ADAPT** (fold into PING's event vocabulary, not as a new engine).

### Differentiation note
We do this differently by making the list entry itself evidence-bound: membership and stage changes are *events with causal links* (who, when, from what evidence) that replay into the entry's state, not overwrites of a stage column. Attio's entry state is still a snapshot with a timeline bolted on; ours regenerates the same stage from the same evidence deterministically. That is better because an owner correcting a stage is a governed act, not a lost overwrite.

### Do not take
Do not adopt Attio's whole custom-object/LDS as a schema authority; do not take the snapshot-record assumption (attributes as mutable slots with soft-delete attributes); do not take the marketing claim of flexibility as a license to let owners freeform-schema the world without governance.

---

## 2. Folk

### Mechanism 1: Magic Fields — AI-derived attributes as first-class schema with per-use budget
Stated generically: a record schema can contain *derived fields* whose values are computed by an AI (or enrichment) function — email finder, website import, categorization, data cleanup, personalized draft generation — with a metered credit budget (e.g. 2,000 uses/mo on Standard) and an explicit audit path for AI-generated fields. The derived field is stored on the record but marked as generated, separating observed data from inferred data. Reviews note folk's own UI includes dashboards to "audit AI-generated fields."

Evidence grade: **independent (unreplicated for the audit-UI claim)**. Feature described across folk.app vendor pages (vendor-described: https://folk.app/crm-for-x/lp/home, https://folk.app/crm-for-x/lp/folk-the-crm-assistant) but corroborated by independent reviewers: https://github.com/lyze6254/folk (Magic Fields used for cleanup/categorization/website import), https://www.therundown.ai/tools/folk ("audit AI-generated fields" in dashboards, MCP connection documented).

### Mechanism 2: Hosted MCP server as the AI integration surface
Stated generically: the CRM ships a vendor-hosted MCP server so AI clients (Claude, ChatGPT, Cursor) can read and write CRM data without SDK work; CRM objects (people, companies, groups, notes) become tools. Third-party MCP servers exist for the same API, proving the surface is genuinely open.

Evidence grade: **independent**. Vendor page confirms hosted MCP (vendor-described). Third-party evidence: https://github.com/fuego-wtf/folk-mcp (16 tools: people/companies/groups/notes), https://vinkius.com/pdf/folk-mcp.pdf (independent hosted MCP endpoint docs), folk API key at folk.app/settings/developers.

### Continuity grade: **B**
Premium plans keep "full interaction history" and campaigns/dashboards audit AI-generated fields; email/calendar sync captures the interaction timeline. But the record model is current-state + timeline, no event replay or immutable change log evident. One-line: derived-field auditing and interaction history exist, but corrections still overwrite state rather than append evidence.

### Harvest pipeline
- Mechanism 1: REACH — yes. NEED — high for both audiences: trades owners never clean data; tech buyers want provenance on inferred fields. TESTED — production (metered credits, thousands of customers). SMALLEST — **derived-field provenance marker: every AI-inferred value carries generator identity + audit queue**. Verdict: **ADAPT** — PING's owner-correction arrow (X stays evidence, Y becomes owner-governed fact) maps directly onto Magic Fields; we add replay/survival, which folk lacks.
- Mechanism 2: REACH — yes, open API. NEED — high for technical buyers (MCP is the agent protocol of record in 2026). TESTED — production, third-party servers exist. SMALLEST — **the CRM's write surface as tools, with per-call permission model**. Verdict: **ADOPT** as pattern — PING already heads this way; treat folk as validation that CRM-as-MCP-tools is the standard surface.

### Differentiation note
We do Magic Fields differently: derived values are *evidence-bound projections* — the inference keeps its support set (which email, which website fetch), and an owner correction supersedes it without rewriting the history that the inference was made. Folk audits the generated field; we regenerate it deterministically from its evidence and let the owner govern the override. Better because the same input always regenerates the same derived value until the owner explicitly rules otherwise.

### Do not take
Do not take folkX-style capture magic as an excuse for capture-without-consent UX; do not take the metered-credit model as a design for our internal pipelines (credits are a pricing surface, not an architecture); do not adopt folk as a tenant store (dependency trap: CRM-as-database reverses our substrate relationship).

---

## 3. Clay (as CRM-enrichment layer)

### Mechanism 1: Waterfall enrichment with per-field resolving-provider attribution and cost accounting
Stated generically: an enrichment primitive that, for each field, queries providers in priority order (cheap → expensive) until one resolves, with "only if empty" guard logic; every resolved field records *which provider resolved it* (provenance per field), and every provider hit records a *credit event* (record, provider, credits, time) so cost-per-record and provider hit-rate are first-class metrics. Coverage compounds multiplicatively across providers (single finder ~40%, waterfall 85%+).

Evidence grade: **independent**. Multiple corroborating sources: https://www.metabase.com/integrations/clay (explicit modeling advice: keep resolving provider per field; model credit_events; keep verification status), https://www.cleanlist.ai/blog/clay-data-enrichment-review (waterfall mechanics: provider A → B → C; Claymation AI agent), https://www.explorium.ai/blog/data-for-gtm/clay-alternatives-for-b2b-data-enrichment-api/ (independent strengths/weaknesses), https://github.com/frontal-so/outbound-skills/blob/HEAD/skills/clay-enrichment-9step/SKILL.md (9-step workflow: 85%+ coverage claim, 1,000 prospects in 2–3h vs 40h manual).

### Mechanism 2: Column-type data model + reusable AI agents (Claygent) with prompts-as-versioned-assets
Stated generically: a table whose columns are typed as manual / enriched / computed / AI-generated, plus reusable AI agent definitions (Claygent: prompt, instructions, version) that can browse the web and extract data into columns, and signal objects (job change, funding, visit) that fire on conditions. The *prompt that produces a field* is itself a versioned asset.

Evidence grade: **independent (unreplicated)**. Column-type model from https://github.com/neversight/learn-skills.dev/blob/HEAD/data/skills-md/sales-skills/sales/sales-clay/SKILL.md (Table/Row/Column/Enrichment/Claygent/Sculptor/Signal objects); Claygent/Sculptor/Sequencer layering from explorium (above). Vendor pages confirm the concepts (vendor-described) but the structural decomposition comes from third-party sources.

### Continuity grade: **C**
Clay is a spreadsheet-snapshot engine: async table runs populate current-state fields; history exists only if you build it (land rows in your warehouse first, snapshot credit/usage events over time — Metabase's own advice concedes this is user-built). No immutable history, no replay; stale async refresh windows break sub-2s agent loops (explorium). One-line: enrichment-provenance per field is a good seed, but the product is snapshot-amnesia by design — the current table is the truth.

### Harvest pipeline
- Mechanism 1: REACH — yes, no dependency (the waterfall pattern is vendor-neutral; 150+ providers are Clay's moat, the *pattern* is free). NEED — high for technical buyers (enrichment with provenance + cost accounting is exactly the "what did this fact cost and who resolved it" question PING must answer); medium for trades owners (they benefit via cleaner records). TESTED — production at scale; coverage numbers are industry-corroborated. SMALLEST — **per-field resolver attribution + per-attempt cost event**: every enriched fact names its provider, every attempt logs its cost. Verdict: **ADAPT**.
- Mechanism 2: REACH — yes. NEED — medium (versioned prompts for extraction agents is a real need; PING's agent machinery can borrow the "prompt as versioned asset" shape). TESTED — production. SMALLEST — **the extraction prompt is a versioned, named artifact bound to the fields it produced**. Verdict: **ADAPT** — maps onto PING's evidence-bound generation: an extraction run is an event carrying prompt-version + inputs + outputs.

### Differentiation note
We do waterfall enrichment differently: the enriched fact is an *observation event with a support set* (provider, query, timestamp, credit cost) that lands on PING's evidence plane; when a cheaper provider later resolves the same field, the conflict is resolved by evidence precedence, not by overwrite order — and the expensive miss still exists in history. Clay keeps the resolved value and discards the losing providers' non-resolution silently. Better because PING can re-run the same waterfall deterministically and get the same attribution, and an owner can see *why* a phone number was chosen over another.

### Do not take
Do not take Clay's credit-metering as the internal cost model (it's a billing surface, opaque per G2 reviews); do not take the async table-run architecture (timeout mismatch with agent loops); do not take the table as the store — Clay-hosted tables are a dependency trap and snapshot-amnesiac; use Clay-the-pattern, never Clay-the-database.

---

## 4. Streak

### Mechanism 1: Magic Columns — derived attributes auto-computed from communication activity, zero data entry
Stated generically: a pipeline-row schema supports *magic columns* — 50+ automatically maintained derived fields (Date Last Updated, Total Emails Sent, last point of contact, sender name) computed from the linked communication history with no user action, even when the computer is off. Coupled with *special data types* (Email, Call Log, Meeting Note objects attached inside a record) that expose rich magic columns, so teams use typed communication objects instead of hand-maintained "last contact" date fields.

Evidence grade: **independent**. The Streak team itself documented this mechanism (engineering/marketing, but a primary technical source): https://medium.com/streak/streak-theory-elements-of-a-successful-pipeline-8476a93a0924 ("Magic Columns tracking 50+ different data points… hard at work, even if your computer is off"; explicit guidance to prefer Email/Call/Meeting special types over manual date columns). Corroborated by third-party reviewers: https://www.androidpolice.com/gmail-add-ons-for-inbox-control/ (single click adds email to pipeline, box moves through stages), Chrome Web Store listing (https://chromewebstore.google.com/detail/streak-crm-for-gmail/pnnfemgpilpdaojpnkjdgfgbnnjojfik?hl=en: 750k+ users, AI co-pilot).

### Mechanism 2: Inbox-native pipeline — the CRM record IS the email thread
Stated generically: pipelines live inside Gmail; a "box" (record) is created from an email with one click and every subsequent email in the thread automatically appears inside the box. Stage movement happens on the same surface as the conversation, so logging is free and the CRM fills itself as a side effect of work.

Evidence grade: **independent**. Corroborated across reviews: https://gizmodo.com/download/streak-crm-for-gmail ("Emails are logged automatically, deals are updated when conversations happen"), androidpolice, Chrome Web Store.

### Continuity grade: **B**
The communication thread inside each box is a genuine chronological, append-only-ish history (emails cannot be edited; they accrue), so there is a real activity timeline with full provenance (who emailed, what was said, when). But structured field edits are still snapshots with no replay, and Streak does not expose an event log of state changes. One-line: email-thread history gives near-append-only provenance for *conversations*, while record state remains snapshot-amnesiac.

### Harvest pipeline
- Mechanism 1: REACH — yes. NEED — high for trades owners (they live in email/text; magic columns mean "no CRM homework"); high for technical buyers (derived fields from the event stream is the PING projection pattern). TESTED — production, 750k+ users. SMALLEST — **derived columns computed deterministically from the communication event stream** (e.g. last-touch, touch count), never hand-typed. Verdict: **ADOPT** as pattern (PING projections already do this; Streak validates that users prefer it over manual logging).
- Mechanism 2: REACH — yes as pattern. NEED — high for trades owners (meet them in the inbox, not in a CRM tab). TESTED — production. SMALLEST — **record anchored to its communication thread; activity auto-attaches**. Verdict: **ADAPT** — PING's evidence plane is the analog of the thread: every interaction is an event, the record view is derived.

### Differentiation note
We do Magic Columns differently: the derived value is a *projection over an immutable event log*, so "Date Last Updated" is recomputable from the same events on any machine, and a corrected timestamp is itself an event (owner-governed) rather than a recompute that hides the correction. Streak's magic columns are server-side derivations over a mutable store. Better because PING's derived fields survive regeneration: refresh the pipeline and you get the same numbers, with corrections preserved and visible.

### Do not take
Do not take Gmail/Chrome-extension lock-in as the architecture (dependency trap: extension DOM breakage, Google policy risk); do not take the box-equals-row data model as a PING primitive (it's a fine UI, not an authority); do not inherit Streak's implicit assumption that thread presence equals truth (threads get misfiled; provenance needs the source-event identity, not the inbox view).

---

## 5. Copper

### Mechanism 1: Bidirectional Google Workspace sync as zero-entry capture
Stated generically: contacts are created from Gmail activity and email signatures, meetings from Google Calendar auto-appear on contact timelines, Drive files sync to records — record assembly happens as a side effect of normal work, with Copper suggestions (Google Contacts + activity) proposing new leads and updates. AI (Gemini) transcribes meetings and adds transcripts in one click; suggested follow-ups appear inside Gmail.

Evidence grade: **independent**. Vendor-described on https://copper.com/google-workspace-crm; corroborated by independent review: https://nethunt.com/blog/google-crm/amp/ ("Contacts are created from Gmail activity and email signatures, meetings from Google Calendar appear on contact timelines, and new records take one click from the Gmail sidebar"; G2 4.5), https://www.fahimai.com/freshsales-vs-copper-crm (auto-fills records from Gmail, syncs emails/meetings/contact data automatically).

### Mechanism 2: Suggestion-driven record maintenance
Stated generically: the CRM proposes record creations and updates from observed interaction (Google Contacts, email patterns) rather than requiring manual entry — "Add new leads and update old ones based on your email interactions, Google Contacts and Copper suggestions." The human approves or ignores; the system never silently rewrites.

Evidence grade: **vendor-described (unreplicated)**. From https://copper.com/google-workspace-crm ("Add new leads and update old ones based on your email interactions, Google Contacts and Copper suggestions. Manual data entry is a thing of the past."). No independent source found that isolates this mechanism; treat as vendor-described until corroborated.

### Continuity grade: **B**
Contact timelines are genuinely fed by the email/calendar stream (a real activity timeline with system provenance), but there is no public immutable history or replay; record edits are snapshots. One-line: auto-populated timelines from the workspace stream, no event-sourced state transitions.

### Harvest pipeline
- Mechanism 1: REACH — yes as pattern (needs user's own Gmail API scopes). NEED — high for trades owners (zero-entry capture is the difference between a CRM they use and one they abandon). TESTED — production, 30,000+ companies (vendor claim), G2 4.5 independent. SMALLEST — **capture from the communication stream with one-click confirm; every auto-created record carries its source (email signature, calendar event)**. Verdict: **ADAPT** — PING's observation layer should do exactly this: observation events with source identity, owner-confirmed promotions.
- Mechanism 2: REACH — yes. NEED — medium-high (suggested updates lower the cost of data hygiene for both audiences). TESTED — production (vendor-described). SMALLEST — **suggested-update queue: system proposes, human approves; suggestion carries evidence link**. Verdict: **ADAPT** — this is PING's owner-intent governance shape already; Copper validates the UX.

### Differentiation note
We do capture differently: auto-created/updated records are *observations*, not record writes — they land on the evidence plane with source (email id, calendar event id, signature parse) and sit in a proposed state until owner intent promotes them. Copper writes them to the record and shows a timeline; we keep the observation distinct from the fact so regeneration never silently inherits a mis-parsed signature. Better because a bad auto-parse is evidence you can see and reject, not a fact that polluted the record.

### Do not take
Do not take Google-Workspace-only lock-in (PING must be channel-neutral); do not take the "manual data entry is a thing of the past" assumption that capture equals correctness (it conflates observation with fact); do not adopt Copper as a data store (dependency trap).

---

## 6. Close

### Mechanism 1: Smart Views + Power/Predictive Dialer — dynamic saved lead-buckets feeding a call stream
Stated generically: *Smart Views* are saved, filter-defined, live-updating lead buckets (hot prospects, stalled deals, new inbound) that feed a *dialer queue*: one-call-at-a-time stream (Power) or pre-dialed live-connection handoff (Predictive). The playbook is to empty the views daily so no lead sits untouched; reported gains of ~60% more outbound calls and 28% longer conversations from eliminating click-through steps. Custom Activities (pre-formatted logging templates: Demo Completed, Proposal Sent) force typed event logging so activity rolls up into reporting.

Evidence grade: **independent**. https://www.pulse.bot/sales/news/3-ways-to-call-in-close-power-dialer-predictive-dialer-and-chloe-0c70390d-87dc-4f61-aeeb-750525cb90b8/ (60%/28% figures, Power vs Predictive mechanics), https://www.authencio.com/blog/close-crm-review-power-dialer-pricing-pros-cons-competitors (dialer features: one-click calling, listen/whisper/barge coaching, local presence, voicemail drop; G2 4.7/2073 reviews corroboration in https://martal.ca/cold-call-dialers-lb/).

### Mechanism 2: Chloe — in-CRM AI voice agent that keeps the CRM updated
Stated generically: an AI sales agent operating natively inside the CRM with access to customer history, previous conversations, deal context, and workflow automation; it calls leads, qualifies prospects, handles objections per a playbook, books meetings, follows up automatically, and writes outcomes back to the CRM — a system of action, not a system of record. Beta: 818,000+ calls across 306 businesses, 6,400+ conversation hours; GA June 9, 2026 on all plans (US/CA).

Evidence grade: **independent**. GlobeNewswire press release syndicated through multiple outlets with numbers: https://markets.financialcontent.com/ibtimes/article/gnwcq-2026-6-9-close-launches-chloe-an-ai-sales-agent-built-directly-into-the-crm. Corroborated by https://compixels.com/best-crm-for-sales-teams/close-review-built-around-the-dialer/ (Chloe described in hands-on review context: calls back cold leads that would otherwise depend on a rep remembering).

### Continuity grade: **B**
Full call activity history with recordings, transcriptions, and typed Custom Activities give a genuine chronological action record with actor + outcome; but it is an activity log, not an event-sourced ledger — no replay of state from events, and agent-written updates are ordinary record writes. One-line: strongest action-history in the survey (voice is logged as first-class activity), still snapshot state underneath.

### Harvest pipeline
- Mechanism 1: REACH — yes. NEED — medium for trades owners (follow-up discipline is their #1 revenue leak; the "empty the bucket daily" cadence is the mechanism), high for technical buyers (typed events feeding queues is a clean pattern). TESTED — production, volume numbers reported independently. SMALLEST — **typed activity templates + dynamic saved-filter queues + a drain-the-queue cadence**: Smart View = saved query, Custom Activity = typed event. Verdict: **ADAPT** — PING already wants typed events; steal "saved queries as work queues" and "typed activity templates" as primitives.
- Mechanism 2: REACH — yes as pattern (voice agent stack is buildable). NEED — medium-high for trades owners (speed-to-lead on inbound calls; automated follow-up on cold leads). TESTED — production beta numbers are real (818k calls is a hard count). SMALLEST — **an agent that acts against CRM state and writes outcomes back as typed activities, with full conversation history attached**. Verdict: **ADAPT** — but with our constraint: agent actions must be evidence-bound and owner-governed (Chloe writes like a human rep; we'd require the proposal→approval→attempt→result→effect→verification chain).

### Differentiation note
We do the voice agent differently: every agent action is a *proposal with an evidence trail* — the call attempt, the conversation, the outcome write-back are all events, and the CRM state change is a governed projection of those events, replayable. Chloe writes to the record like a trusted employee; we treat the agent as a worker whose actions are witnessed. Better because when the agent books the wrong meeting, you can see exactly which instruction and which call produced it and roll the state forward correctly, not discover a bad snapshot.

### Do not take
Do not take Close's outbound-call-centrism as the universal model (trades owners do inbound, not cold-dialing); do not take telephony as a new authority (it's a channel, not a knowledge primitive); do not adopt Close the product (dependency trap) — steal the queue/event primitives, not the dialer.

---

## 7. Pipedrive

### Mechanism 1: Activity-based selling — every deal must carry a next scheduled action; staleness is a first-class signal
Stated generically: the pipeline is organized around *activities* (calls, emails, meetings) rather than deal values; every deal is expected to have a next scheduled activity, and deals without one (no activity in 7+ days) are flagged as stalled. The AI Sales Assistant reads stage + history and proposes the specific next action ("This deal hasn't moved in 10 days, want to nudge it?"). The mechanism turns follow-up from a memory problem into a state property.

Evidence grade: **independent**. Multiple corroborating reviews: https://medium.com/@julian325/pipedrive-review-the-crm-i-recommend-to-solo-founders-b1b724443065 ("Deals without a next activity get flagged"; founder found it the difference between pipeline and graveyard), https://sonary.com/b/pipedrive/pipedrive+crm/ (assistant flagged quiet deals 7+ days; reviewer says "most practically useful AI feature"), http://crm.org/news/pipedrive-crm-review (side-panel alerts, stalled-deal nudges; notes it does not weight by deal value — honest limitation).

### Mechanism 2: Native MCP server — CRM workflows addressable from any AI assistant in natural language
Stated generically: a vendor-shipped MCP server exposing deal/contact/org search, record create/update, lead→deal conversion, pipeline insights, meeting-notes→structured-record conversion, and multi-step workflow automation — so the CRM is operable from Claude/ChatGPT/Gemini with OAuth-scoped access. Explicit positioning: CRM as "trusted data backbone" for AI agents.

Evidence grade: **independent (single-source)**. Business Wire press release June 30, 2026: https://www.businesswire.com/news/home/20260630723066/en/Pipedrive-Launches-Native-MCP-Server-Bringing-CRM-Workflows-Directly-Into-AI-Assistants (natural-language search, record CRUD, meeting notes to structured records; PD Experts consultant quote on enrichment/lead discovery through MCP). Unreplicated as of research date — no third-party implementation reviews found.

### Continuity grade: **B**
Every entity (contact, org, deal, lead) carries a full activity history + open tasks + documents in a single timeline view; the activity feed is the spine of the product. But activities are a log bolted onto snapshot records — no immutable event log, no state replay, no correction semantics. One-line: best-in-class activity-timeline UX among the survey, still a timeline-on-snapshot architecture.

### Harvest pipeline
- Mechanism 1: REACH — yes. NEED — very high for trades owners (their revenue leak is literally "no next action on the quote"; staleness-as-state is the mechanism that fixes it). TESTED — production, independently praised as the most useful feature. SMALLEST — **staleness as a derived property: deal = {state, next_action_due}; a missing next_action is itself a signal with an owner**. Verdict: **ADOPT** as pattern — this maps directly onto PING's "first broken step" reporting: a deal/job with no next action is an open outcome window, never silently closed.
- Mechanism 2: REACH — yes. NEED — high for technical buyers. TESTED — demo-grade to early production (June 2026 launch, unreplicated). SMALLEST — **meeting-notes → structured-record as a typed transformation tool**. Verdict: **ADAPT** — validate against folk's more mature MCP surface; take the tool-shape, not the product.

### Differentiation note
We do activity-based selling differently: the "next action" is an *outcome window with an owner and a deadline*, and staleness is computed by replaying the event stream — an honestly open window is never turned into a negative or a success metric (no-signal discipline). Pipedrive nudges with a panel alert over snapshot state; we make the open window a first-class, governable object with evidence of every prior nudge. Better because the owner can see the full history of what was tried, not just the current "stalled" badge.

### Do not take
Do not take the deal-value-blindness (assistant treats $500 and $50,000 deals alike — a known limitation); do not take the passive Smart Contact Data enrichment (70% hit rate, no verify prompt, misattributed B2B records per crm.org — a provenance failure to learn from, not copy); do not adopt Pipedrive as the store.

---

## 8. Freshsales

### Mechanism 1: Freddy AI scoring 0–100 trained on engagement + conversion history
Stated generically: contact/deal scoring on a 0–100 scale learned from the tenant's own historical conversion patterns (which leads became customers and what they had in common), requiring a minimum data floor (~100 contacts) before it activates. Scores drive saved views ("Hot Leads") and routing rules (score >80 → senior rep). Honest limitation documented independently: useless without history — a startup with 12 deals gets nothing.

Evidence grade: **independent**. https://www.comparebiztech.com/ai-crm/ ("depends entirely on your data… Don't expect month-one magic"; cross-vendor comparison Zoho Zia / Freddy / Einstein with pricing), https://www.eweek.com/artificial-intelligence/freshsales-review/ (Freddy scores, predicts deal risk, duplicate resolution, auto profile enrichment; Pro/Enterprise gating), https://www.fahimai.com/fr/how-to-use-freshsales-crm (setup steps: enable, review scores, act on >70, routing rules).

### Mechanism 2: Lifecycle stages as API-addressable events + omnichannel built-in comms
Stated generically: contact lifecycle stages that can be triggered by external events via API, webhooks on deal stage changes, and scoring that can be fed external engagement signals — i.e., the funnel stage is a transitionable state the outside world can move, with a webhook emitted on each move. Built-in phone/email/chat/SMS/WhatsApp in one inbox means the engagement signals that feed scoring are captured natively.

Evidence grade: **independent (unreplicated)**. From https://github.com/zaidmomin2003/cleanmails-blogs/blob/HEAD/content/posts/freshsales-crm-cold-email-unified-pipeline.md (lifecycle stages triggerable by external events via API; webhooks on deal stage changes; Freddy scoring fed external engagement signals). Single technical source; the stage-webhook behavior is standard CRM fare but the external-triggerability claim is unreplicated.

### Continuity grade: **B**
Chronological activity timeline per contact including website activity, email responses, and brand interactions; 360-degree view. But history is a timeline view over snapshot records; no event replay. One-line: rich timeline including behavioral signals, state remains current-value only.

### Harvest pipeline
- Mechanism 1: REACH — yes as pattern (scoring models are buildable). NEED — medium for trades owners (they need "who do I call first" more than they need a number); medium-high for technical buyers (evidence-graded scoring is a differentiator). TESTED — production, with honestly documented data-floor limits. SMALLEST — **score = f(own conversion history) with a published minimum-data floor and a "not enough data" state instead of a fake number**. Verdict: **ADAPT** — the honest part to steal is the data-floor gating and the no-signal discipline (no score without evidence); we'd bind the score's features to cited events.
- Mechanism 2: REACH — yes. NEED — high for technical buyers (external systems moving lifecycle state via API + webhook-on-transition is clean event grammar). TESTED — production (vendor + one independent technical source). SMALLEST — **stage transition as a named event emitted on every move, triggerable from outside**. Verdict: **ADAPT** — PING's event plane already generalizes this; take the "webhook on every transition" discipline.

### Differentiation note
We do scoring differently: the score is a *projection with a cited support set* — every contributing signal is an event the owner can inspect, the model version is recorded, and "insufficient history" is a first-class state, not a low number. Freddy gives you 73 with no drill-down; we give you the score, the evidence, and the honest UNKNOWN. Better because a trades owner deciding who to call deserves to know *why* the system thinks so, and a wrong call can be traced to the signal that caused it.

### Do not take
Do not take the native-sequence tooling (designed for warm opted-in contacts, throttled — not a cold-outreach engine); do not take Freshworks-suite lock-in; do not take scoring-as-black-box (the exact failure mode PING's evidence plane exists to fix).

---

## 9. HubSpot — Breeze AI / Smart CRM agent layer ONLY

### Mechanism 1: Agent Hub + Agent Builder — governed agent fleet with per-agent access controls and credit run limits
Stated generically: a single console showing live status and performance for every active agent, with customers able to build custom agents in plain language over existing CRM data (deal history, contact records, buying signals). Each agent carries *per-agent access controls* and *credit run limits*; prebuilt agents (Customer, Prospecting, Data, Content, Social, AEO) run multi-step workflows with configurable guardrails and approval steps. September 2026 Spotlight: the Breeze Assistant takes a stated goal and *coordinates* specialized agents against a self-updating Smart CRM.

Evidence grade: **independent**. https://github.com/uroshp/scout-ci/blob/HEAD/v2/battlecards/salesforce__vs__hubspot__ai-agents-agentforce-vs-breeze/current.md (Agent Hub + Agent Builder public beta July 23, 2026, per-agent access controls, credit run limits, Spotlight Sept 16 2026 relaunch, ZoomInfo-via-GTM.AI grounding for Prospecting Agent), https://mountainise.com/blog/hubspot-breeze-ai-readiness/ (three-layer 2026 architecture: Assistant / Agent Hub / Breeze Intelligence; credit pricing), https://huble.com/blog/enterprise-ai-in-hubspot (governance framing: "what is allowed to act on it?", approval steps, Customer/Prospecting/Data/Deal-progression agents).

### Mechanism 2: Breeze Intelligence + Data Agent — self-updating CRM via continuous enrichment and record maintenance
Stated generically: an enrichment/intent engine that sweeps public sources to populate company profiles, fill missing form data, and surface buyer-intent signals; a dedicated *Data Agent* whose job is to enrich and maintain CRM records ("keep the others fed with good data"). Basic firmographic enrichment is free on Core seats; advanced behind paid tiers. Notably, HubSpot attempted (July 2026) to pool customers' business-card-level contact data into a shared enrichment dataset by default and reversed it within four days after public backlash — an instructive trust-layer failure.

Evidence grade: **independent**. Architecture from mountainise (above); Data Agent role from huble; ZoomInfo as Breeze Prospecting Agent data provider via GTM.AI headless context layer: https://markets.financialcontent.com/ibtimes/article/marketersmedia-2026-6-9-zoominfo-selected-as-a-data-provider-for-hubspots-breeze-prospecting-agent. ToS reversal: https://github.com/uroshp/scout-ci battlecard (above) citing cmswire; Duncan Lennox "We made a mistake" July 5, 2026.

### Continuity grade: **B**
The agent layer is the most governance-serious in the survey (per-agent access controls, credit budgets, approval steps, a Data Agent explicitly tasked with record quality), and HubSpot CRM has record history. But agent actions are still writes against snapshot records; no event-sourced replay of what agents changed and why. One-line: best agent-governance surface in the survey, record continuity still snapshot + timeline.

### Harvest pipeline
- Mechanism 1: REACH — yes as pattern. NEED — high for technical buyers (per-agent access controls + run budgets are exactly the "what is allowed to act" question); medium for trades owners (they benefit via safer automation). TESTED — production (public beta July 2026, Spotlight Sept 2026). SMALLEST — **per-agent identity with its own permission scope and spend budget, plus a live status console**. Verdict: **ADAPT** — PING's agent machinery should adopt per-agent governed identity; this validates our direction and adds the spend-budget primitive we lack.
- Mechanism 2: REACH — yes as pattern; the ToS incident is a free lesson. NEED — high (continuous enrichment with provenance is core to PING's knowledge freshness problem). TESTED — production. SMALLEST — **a maintenance agent whose explicit job is record hygiene, with every enrichment citing its source**. Verdict: **ADAPT** — but with explicit opt-in provenance: HubSpot's July 2026 reversal proves enrichment data-pooling must be transparently opt-in; our evidence plane makes the source of every enriched fact visible by construction.

### Differentiation note
We do the agent layer differently: agents act on PING's event/evidence plane, so every agent write is a witnessed event with a causal chain (proposal → authorization → attempt → result → effect → verification → outcome) — replayable and falsifiable. HubSpot's agents write to the Smart CRM like privileged employees with good guardrails; we treat them as workers whose actions are evidence. Better because when an agent enriches a record badly, we can replay the exact retrieval-and-action sequence that produced it, and the owner's correction survives regeneration by construction.

### Do not take
Do not take the unified-record Smart CRM itself (already covered; snapshot model); do not take outcome-based per-resolution pricing ($0.50/resolved conversation) as an internal cost primitive; do not take default-on data pooling (the July 2026 ToS reversal is a cautionary tale — enrichment must be opt-in with visible provenance); do not adopt HubSpot as the agent substrate (dependency trap, per-seat credit metering).

---

## 10. Salesforce Agentforce

### Mechanism 1: Topics → Instructions → Actions — bounded agent scope with explicit routing
Stated generically: an agent is authored as *Topics* (intent domains: "order status inquiries") → *Instructions* (business rules, policies per topic) → *Actions* (the only functions the agent may invoke: Flows, Apex, APIs, MCP tools). A fast routing model classifies input to a topic; the agent's reasoning scope is constrained to that topic's instructions and allowed actions. The Atlas Reasoning Engine runs a bounded ReAct loop (plan → retrieve → reason → act → refine; reported bound ~7 reasoning loops per message, ~6 turns of conversational memory), expands the query before retrieval ("what's the status?" → "what is the status of opportunity 006…"), and re-plans rather than failing when results are insufficient. Atlas itself is not configurable — you author the agent *around* it via subagents, topics, actions, and scripted reasoning blocks.

Evidence grade: **independent**. https://salesforcedictionary.com/blogs/what-is-agentforce-360-complete-2026-guide (four-step lifecycle: query evaluation → expansion → context refinement → planning & execution; latency expectations 2–15s), https://github.com/daniel-deepak-dev/mylearning/blob/HEAD/SF_Agentforce/atlas-reasoning-engine.md (loop bound, subagent routing by description in v3.0, Atlas-not-configurable), https://aiautomationglobal.com/blog/salesforce-agentforce-360-enterprise-ai-agents-2026 (Topics→Instructions→Actions layers, Spring '26 MCP integration, 11.14T tokens/quarter scale).

### Mechanism 2: Einstein Trust Layer — grounding enforcement + zero-retention + PII masking as platform guarantees
Stated generically: a cross-cutting trust plane that (a) *enforces* grounding — the agent cannot answer customer-data questions from model training data alone, enforced by the layer not by model behavior; (b) guarantees zero data retention with third-party LLM providers; (c) masks PII before data leaves the org; (d) applies toxicity/hallucination guardrails with configurable policies. Retrieval is RAG over Data Cloud (structured) + Data Library (unstructured), with the trust layer sitting across retrieval and generation.

Evidence grade: **independent**. Same sources as above; RAG blueprint: https://github.com/sfdc-hermes/sfdc-hermes/blob/HEAD/_posts/2026-08-30-agentforce-data-cloud-RAG.md (ingestion→chunking→vector DMOs→hybrid search→grounded generation), cirra.ai Atlas explainer: http://cirra.ai/articles/salesforce-atlas-ai-reasoning-engine (ReAct loop, topic classification, knowledge retrieval steps). Vendor docs confirm the Trust Layer exists (vendor-described); the *mechanisms* (zero retention, grounding enforcement, PII masking) are described consistently across independent technical sources.

### Continuity grade: **B**
Salesforce has field-history tracking and audit trails, and the grounding requirement is a provenance-adjacent guarantee (answers must come from retrieved org data). But Agentforce does not expose an event-sourced model of what the agent did — no replay of the reason-act-observe trace as a durable, attributable record. One-line: strongest grounding-enforcement in the survey, but the agent's reasoning trace is ephemeral; state changes are still snapshot writes.

### Harvest pipeline
- Mechanism 1: REACH — yes as pattern. NEED — high for technical buyers (bounded agent scope is the answer to "what is this agent allowed to do"); medium for trades owners (they get safer automation). TESTED — production at massive scale (11T+ tokens/quarter). SMALLEST — **topic-scoped action allowlists + bounded reasoning loop + query expansion before retrieval**. Verdict: **ADAPT** — PING's agent work should adopt topic-bounded action scopes and pre-retrieval query expansion; the "Atlas is not configurable, author around it" lesson maps to our constitutional-authority discipline (the engine is fixed, the governance is authored).
- Mechanism 2: REACH — yes as pattern. NEED — very high for technical buyers (zero-retention, grounding enforcement, PII masking are table stakes for enterprise trust). TESTED — production. SMALLEST — **grounding as an enforced invariant, not a prompt suggestion: no customer-data answer without retrieved evidence**. Verdict: **ADOPT** as principle — this is PING's "evidence before eloquence" and Ask-FYD evidence-boundedness, independently validated at Salesforce scale; adopt the invariant, implement it our way (evidence binding, not a trust-layer product).

### Differentiation note
We do grounding differently: the requirement is structural — the answer is *generated from* a cited evidence set and the citation chain is replayable, with the retrieval query, the retrieved chunks, and the model version all recorded as events. Agentforce enforces "grounded or silent" at the trust layer; we go further: grounded *and* reproducible, with owner corrections surviving regeneration. Better because "the layer blocked an ungrounded answer" is a runtime property, while "here is the evidence this answer was built from, and you can re-run it" is a verifiable one.

### Do not take
Do not take the Salesforce platform (dependency trap of the highest order); do not take Data Cloud zero-copy streams as the data architecture (it's their moat, and it recentralizes on their store); do not take "Atlas is not configurable" as permission for opaque engines — PING's engine must be inspectable, not a black box we author around; do not adopt Topics as a new authority noun (topics are scopes, not sovereigns).

---

## 11. Microsoft Dynamics 365 Copilot

### Mechanism 1: Cowork over governed MCP plugins — propose, don't silently act; permission enforced per call
Stated generically: the AI composes over a *small set of vendor-published MCP plugins* (D365 Sales, D365 Customer Service, Dataverse read/query/create/update) rather than touching the database directly; the existing identity and permission model is enforced on *every call*; the agent *proposes* record updates, drafted emails, and case resolutions for approve/edit/dismiss — it does not silently act; answers are grounded in source data with direct links, and when data is missing or ambiguous the intended behavior is to say so rather than fabricate.

Evidence grade: **vendor-described (official, single-source)**. https://www.microsoft.com/en-us/dynamics-365/blog/it-professional/2026/06/16/copilot-cowork-dynamics-365/ — official Microsoft blog, detailed and mechanism-specific (plugin table, "Humans approve the writing and actions", "grounds answers in source data and links them directly", "intended behavior is to say so, not to fabricate"). No independent implementation review found; grade as vendor-described.

### Mechanism 2: Dataverse semantic layer — schema-aware agentic search for business-data understanding
Stated generically: Dataverse Search enriched with an intelligent semantic layer that understands the business data schema, so agents retrieve records the way business logic does (schema + keywords), giving Copilot "business understanding" — adaptive reasoning over accounts, opportunities, leads, activities, and custom entities. Work IQ reconciles enterprise data and work signals across M365 apps, D365 apps, and Power Platform as the reasoning layer.

Evidence grade: **independent (official engineering blog)**. https://devblogs.microsoft.com/microsoft365dev/build-business-understanding-with-dataverse-in-microsoft-365-copilot/ (Dataverse Agentic AI-powered search, semantic layer, Work IQ reasoning layer). Engineering-blog grade: vendor-authored but technically specific and falsifiable; treat as independent-unreplicated. Corroborating architecture: https://cloudonhire.medium.com/configure-copilot-in-microsoft-dynamics-365-sales-909fae0c7bcc (five-layer architecture: UX / Copilot AI / Data&Context / Integration / Security; Copilot respects existing CRM security roles).

### Continuity grade: **B**
Dataverse has audit history on tables, and the Cowork pattern (propose-not-act, source-linked answers) is provenance-friendly; but the underlying record model is snapshot-based and there is no event-sourced replay of agent or user actions. One-line: the *governance* posture is the most PING-aligned in the survey (no silent acts, say-so on missing data), while state continuity is still audit-log-on-snapshot.

### Harvest pipeline
- Mechanism 1: REACH — yes as pattern. NEED — very high for both audiences: "propose, don't silently act" is exactly the owner-approval product proof; per-call permission enforcement is the constitutional shape. TESTED — production (vendor-described; Cowork announced June 2026). SMALLEST — **agent writes are proposals with approve/edit/dismiss; every tool call re-checks the caller's permissions; missing data → explicit unknown**. Verdict: **ADAPT** — this is nearly PING's owner-intent governance already; adopt the per-call permission check and the propose-not-act default as standing law for our agents.
- Mechanism 2: REACH — yes as pattern. NEED — high for technical buyers (schema-aware retrieval is the difference between keyword search and business understanding). TESTED — production (vendor-described, engineering-blog detailed). SMALLEST — **a semantic layer over the schema so retrieval understands business entities, not just text**. Verdict: **ADAPT** — PING's Ask path needs exactly this over the object graph; steal the shape (schema + keywords adaptive retrieval), implement over our own graph.

### Differentiation note
We do Cowork differently: proposals, approvals, and actions are all *events on the evidence plane* — the approval itself is attributable and replayable, and the resulting state is a deterministic projection of the approved events. Microsoft enforces permission per call and surfaces proposals in the UI; we make the proposal→approval→action chain itself the durable record. Better because "who approved what, on what evidence, and what happened next" is answerable forever, not just visible in the moment.

### Do not take
Do not take the Microsoft stack (Dataverse/Power Platform dependency trap); do not take the "small set of vendor-published plugins" as a closed ecosystem model — PING's tool surface must be open and tenant-composable, not vendor-published; do not adopt Work IQ as an authority noun (it's a reasoning layer, and ours must be inspectable).

---

## Cross-cutting harvest ranking (PING lens)

| Rank | Mechanism | Source system | Verdict |
|---|---|---|---|
| 1 | Propose-don't-act + per-call permission enforcement + explicit UNKNOWN | D365 Cowork | ADAPT (standing law) |
| 2 | Grounding as enforced invariant (no customer answer without retrieved evidence) | Agentforce Trust Layer | ADOPT (principle) |
| 3 | Per-field resolver attribution + per-attempt cost events on enrichment | Clay waterfall | ADAPT |
| 4 | Process state on the membership edge (list entry), not on the record | Attio Lists | ADAPT |
| 5 | Staleness as a derived state property (no next action = signal) | Pipedrive activity-based selling | ADOPT (pattern) |
| 6 | Derived columns computed from the event stream, never hand-typed | Streak Magic Columns | ADOPT (pattern) |
| 7 | Per-agent identity with permission scope + spend budget + status console | HubSpot Agent Hub | ADAPT |
| 8 | Topic-scoped action allowlists + bounded ReAct loop + pre-retrieval query expansion | Agentforce Atlas | ADAPT |
| 9 | Capture-from-stream with source identity; suggestions as approvable queue | Copper / Folk | ADAPT |
| 10 | Typed activity templates + saved-query work queues | Close Smart Views | ADAPT |
| 11 | Score with published data-floor + first-class UNKNOWN instead of fake numbers | Freshsales Freddy | ADAPT |
| 12 | Extraction prompt as versioned artifact bound to the fields it produced | Clay Claygent | ADAPT |

No system surveyed is event-sourced (all continuity grades are B or C). The universal gap: nobody replays. That remains PING's open lane.
