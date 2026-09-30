# Attio — Deep Archaeology Study

Date: 2026-09-30. Researcher: ecosystem-archaeology subagent (depth 2).
Method: official docs (docs.attio.com, attio.com/help), official MCP reference, Attio changelog, independent practitioner repos (attio-agent-builder, attio-cli, attio-mcp-server, gtm skills), migration guides, product reviews.
Evidence grades per claim: **CONFIRMED** = independently corroborated (official docs + third-party) / **VENDOR-DESCRIBED** = Attio's own docs/pages only / **UNCLEAR** = searched, no solid evidence (absence of evidence is reported as such, never as a negative claim).
Research only. No signups, no code changes.

Prior survey reference: `~/workspace/research_notes/crm-agentic-harvest-20260930/` (Attio: notes/crms.md §1, report.md §1 "Attio", HARVEST-CANDIDATES.md #18). Grade reconciliation is at the bottom of this file.

## TL;DR

Attio in 2026 is an agent-ready CRM: custom objects, attribute-level AI fields, a workflow engine with **agent blocks** (prompt/model/tool-scoped agents, web access, structured output), JS/SQL code blocks, and an official OAuth MCP server where reads are auto-approved and writes require confirmation. Its two genuinely load-bearing mechanisms for PING are (1) **version-pinned retry semantics** (a run binds the definition version it executed; retries re-run the pinned version; every attempt is preserved as a record under the run) and (2) **least-privilege agent tool scoping with a named "Run as" identity for external tools** (agents get read-only CRM tool categories + web toggle; external MCP tools execute as a specific user's credential; writes happen in deterministic downstream blocks). Its weaknesses vs PING: snapshot-record model with timeline sidecars, no immutable event plane, no deterministic replay, no native approval node (HITL is practitioner-built via drafts + Slack buttons), no documented learning loop, no native multi-touch attribution.

---

## 1. DATA MODEL

- Objects: standard objects (People, Companies, Deals, Tasks, Notes, Workspaces, Users) plus user-created custom objects. Object schema addressed by API slug (e.g. `people`, `companies`, `deals`); custom objects appear under `.api_slug`. **CONFIRMED** (attio-cli object listing + open-source CLI docs + official REST API docs).
- Lists: single-object collections of records; each list **entry** carries its own stage/status attributes independent of the parent record (the pipeline view is a list with entry-stage columns). Entries are upsertable idempotently (`PUT /lists/{id}/entries` = "assert": create-or-update by parent record). **CONFIRMED** (independent; already in prior survey).
- Attributes: typed (text, select, multi-select, status, relationship, date, number, etc.). All attribute values are arrays of objects in the API, never bare strings (e.g. email must be `[{"email_address": "..."}]`, name `[{"full_name": "..."}]`). **CONFIRMED** (independent practitioner docs).
- Attributes are **archivable, not deleted** (soft-delete of schema; history preserved). **CONFIRMED** (prior survey + open-source CLI docs).
- Status attributes: constrained single-select used as kanban columns on lists; the predefined `stage` status lives on the deal object. Writing a status value with an unknown ID/title errors rather than creating a new status. Status values expose `active_from`, so automations can filter on "when this status was entered". **VENDOR-DESCRIBED** (official attribute-types docs).
- Relationships: records link across objects via relationship attributes (e.g. person → company); API supports relationship-based search (`search_records_by_relationship`). Custom objects + custom relationships let tenants model arbitrary domains (investors, portfolio companies, properties). **CONFIRMED** (independent: MCP relationship-search tooling, migration playbooks).
- Records: `record_<id>` identity scheme. **CONFIRMED** (independent CLI/MCP docs).

## 2. TRIGGER MODEL

Workflow triggers (official help center + official block reference):
- Record created / record updated / attribute changed value. **VENDOR-DESCRIBED** (attio.com/help "Overview of workflows"; independently echoed by viaSocket trigger enumeration: Record created/updated/deleted, List Entry created/updated, New Task created — **CONFIRMED** via third party).
- Recurring schedule. **VENDOR-DESCRIBED**.
- Incoming webhook (external trigger). **VENDOR-DESCRIBED**.
- Manual run (user-triggered). **VENDOR-DESCRIBED** (Attio's own triggers explainer video).
- Record command (run a workflow from a record's command menu). **VENDOR-DESCRIBED** (Attio's own triggers explainer video).
- Multi-trigger (one workflow with multiple trigger blocks, new in 2026). **CONFIRMED** (independent practitioner video + skill repos document multi-trigger support).
- Integration triggers (connected-app events). **VENDOR-DESCRIBED**.
- Conditional gates inside the flow: a **filter** block stops the run when conditions aren't met; an **if/else** block routes down different paths. **VENDOR-DESCRIBED** (official help overview).

## 3. AGENT MODEL

Agents run as **blocks inside workflows** (the "Custom Agent" block), not as free-roaming assistants:

- **Custom Agent block**: full custom prompt, **model selection** (user can pick the model), web-access toggle, structured output (JSON schema auto-generated from a sample object), and **tool access**: CRM data the agent can *read* — Call recordings, Emails, Lists, Meetings, Notes, Tasks, Workspace members, Records — plus **Connected apps** (external MCP integrations such as Granola, Google Calendar, Notion). **CONFIRMED** (independent attio-agent-builder skill repo, 11 days old, documents the exact 5 config fields in UI order).
- **Connected apps require a "Run as" user credential**: the agent acts against external tools under a named user's stored credential. **CONFIRMED** (same independent source). This is the permission-inheritance point for agents.
- Agent **tool access is read-only by design**; writes happen in downstream deterministic blocks (Update Record, Create Task, etc.). **CONFIRMED** (independent practitioner architecture docs: "Tool access — CRM data the agent can read").
- Lighter AI blocks: **Prompt Completion** (cheap fixed cost; custom prompt on record data; no web, no structured output, no model choice), **Classify Text** (cheap; maps text to select options; no custom prompt), plus **AI Attributes** — custom fields that auto-fill via AI (classify / summarize / research / recalculate when underlying data changes). **CONFIRMED** (independent practitioner docs + hands-on 2026 review describing AI Attributes in production).
- Block outputs chain by name: a block's output is available to later blocks as a variable named after the block (e.g. `{{research_company}}`). **CONFIRMED** (independent skill repo).
- **Ask Attio** (the conversational assistant): searches across records, notes, emails, calls and lists; can build workflows from NL, create/update records, create tasks, draft emails; supports `@` mentions, saved prompts, model selection, conversation history. **VENDOR-DESCRIBED** (official help center). Independent reviews confirm it works well on simple queries and misses on complex ones.
- Agent steps are billed by token usage per model ("similar to how Ask Attio works"); the run viewer shows credits consumed by each agent step after a run. **VENDOR-DESCRIBED** (official credit-management help page).

## 4. PERMISSION MODEL

- **OAuth scopes are per-operation and declared in a public OpenAPI spec**: `record_permission:read/read-write`, `object_configuration:read`, `list_configuration:read`, `list_entry:read/read-write`, `note:read/read-write`, `task:read/read-write`, `user_management:read`, `webhook_configuration:read/read-write`, `call_recording:read`, `meeting:read`. Third-party docs extracted per-endpoint scope blocks from Attio's canonical OpenAPI spec. **CONFIRMED** (multiple independent sources converging on the same scope names).
- API keys are **scoped at generation time** (minimum-object-type scoping, not blanket workspace access); API keys are workspace-scoped, never expire by default, and are revocable. OAuth 2.0 is used for multi-workspace apps; new OAuth apps require publication approval to work across workspaces. **CONFIRMED** (independent).
- **Official MCP server authenticates the agent as the connecting Attio user**: "authenticated as your Attio user with access to your workspace data" — reads auto-approved, writes request confirmation. Permission inheritance is **user-identity-based**: the agent's access is bounded by that user's workspace permissions. **CONFIRMED** (official docs.attio.com/mcp/overview + two independent writeups agreeing on the read-auto-approve / write-confirmation behavior).
- Custom-agent connected apps act under a named **"Run as" user credential**. **CONFIRMED** (independent).
- Whether native *workflows* execute under the publishing user's permissions (as some platforms do) was **not found in Attio's public docs** — **UNCLEAR**. No evidence of a published workflow identity/permission-inheritance rule; treat as unknown, not as absent.
- Attio publishes an App SDK: custom extensions (React UI, webhook-reactive, external service calls, write-back into fields/workflows). **VENDOR-DESCRIBED** (independent expert review citing the Apps SDK).

## 5. WORKFLOW MODEL

- Canvas builder with trigger + step blocks; NL construction via Ask Attio. Available to all workspace members on all plans. **VENDOR-DESCRIBED** (official help).
- Block vocabulary includes: create/update record, add record to list, update/delete list entry, create/complete task, enroll/exit sequence, send HTTP request, integration blocks (Slack, connected apps), **Execute code** (JS block), **SQL query**, classify/summarize blocks, Web agent, Custom agent, if/else, filter, find list entries. **VENDOR-DESCRIBED** (official credit table enumerates the block list); JS code block existence **CONFIRMED** independently.
- **JS Code Block is free** (no credits): "Deterministic logic, mappings, transforms. No AI reasoning, no web." Practitioner law: "Deterministic logic in code blocks, not prompts" — lookup tables, mappings, if/else on known values go in code, never in the agent prompt. **CONFIRMED** (independent).
- Credit model: triggers, logic, and data lookups are free; credits are consumed only when a block **writes data, sends/receives externally, or uses AI**. Fixed write blocks cost 1 credit; Execute code / SQL query / Classify / Summarize / Web agent / Custom agent are variable. If a run fails partway, the failed block and later blocks consume no credits. **VENDOR-DESCRIBED** (official credit-management help page).
- Agent blocks and code blocks compose: agent → code block (deterministic mapping of agent output), agent → if/else gate → agent (cheap gating before expensive work). Practitioners split agents by tool needs, model, and gating to control cost. **CONFIRMED** (independent).
- Sequences (outbound email cadences) are a separate but related product, positioned for warm outreach, not high-volume prospecting; no dialer, no SMS, no A/B testing. **VENDOR-DESCRIBED** (independent product comparison citing Attio positioning).

## 6. HUMAN APPROVAL MODEL

- **No native approval node exists in Attio workflows** as of the public docs. What exists instead:
  - **MCP write confirmation**: the official MCP server auto-approves reads but **requires user confirmation for every write**. **CONFIRMED** (official MCP docs + two independent corroborations).
  - **Ask Attio mutation proposals require confirmation**: "Ask Attio proposals to create/update/delete notes do nothing until confirmed." **CONFIRMED single-source** (independent UI-deep-dive doc quoting official Attio docs).
  - Practitioners implement HITL by convention: **draft-first routing** — workflows write email drafts into a `Draft` attribute and only a separate send workflow fires when an `Approved` attribute is set (owner flips it); or **Slack approve/skip buttons** gating a Gmail draft send. No email ever sends without human eyes-on. **CONFIRMED** (independent: Upwork spec, revops repo, attio-cli follow-up skill states "Every message requires Mitch's explicit approval before anything sends").
- Verdict: approval exists at the **MCP/agent boundary** (confirmation-required writes) and as a **practitioner pattern** (draft + owner flag), but not as a typed workflow node. This is a real gap vs PING's digest-pinned approval authority.

## 7. OBSERVABILITY MODEL

- **Run viewer**: every workflow has a Runs tab; you can open a run and see what each block executed and debug errors. Agent blocks can be opened post-run to see **credits used by each step the agent took**. **CONFIRMED** (official help center ×2: troubleshooting page + credit page).
- **Attempt history**: after rerun/retry, "a new attempt is created under the same run. Click the Attempt dropdown next to the run number to switch between attempts. Each attempt shows its status and execution time so you can compare results across retries." **CONFIRMED** (official troubleshooting-workflows help page).
- API rate limits: 100 req/sec reads, 25 req/sec writes (independent skill doc; also 100 req/min + 1,000/hr quoted elsewhere — **UNCLEAR which is current**; sources disagree, so don't quote a number as fact).
- No evidence found of pausing/resuming a mid-flight run, or of a live run-inspection API. **UNCLEAR** (not found in docs; not claimed absent).

## 8. REPLAY/RETRY MODEL

- **Rerun / Retry** (official troubleshooting docs):
  - **Rerun**: execute any completed run again.
  - **Retry from start**: re-executes the entire workflow from the beginning **using the version of the workflow that was published when the original run triggered** — version-pinned replay. **CONFIRMED** (official).
  - **Retry from failed**: re-executes starting from the block that failed, skipping blocks that already completed. **CONFIRMED** (official).
  - **Retry with live workflow**: re-executes against the currently published version (for validating a fix); keeps the original trigger's new/previous values, but all other values are read in their current state. **CONFIRMED** (official).
  - Attempts are preserved per run (attempt dropdown with status + execution time). **CONFIRMED** (official).
- Determinism: retries are re-executions, not deterministic replays — no claim that re-running the pinned version against the same inputs reproduces identical outputs (agent steps are token-billed LLM calls). No immutable event plane behind runs. **Inferred from the billing model** (variable per-token billing implies non-deterministic generation); no vendor claim of determinism exists.
- Continuity grade for workflows: run inspection + attempt history + version-pinned retry is the strongest workflow observability in this survey after Lindy's approval provenance — but it remains **B**: logs of what ran, not an immutable, replayable event record.

## 9. CONNECTOR/API/MCP MODEL

- Public REST API (`api.attio.com/v2`), JSON over HTTPS, public OpenAPI spec, `llms.txt` published. Surface: objects, attributes, records, lists, entries, notes, tasks, comments, threads, meetings, call recordings, transcripts, files, workspace members, webhooks. **CONFIRMED** (official docs + independent).
- **Official hosted MCP server** (`mcp.attio.com/mcp`), GA February 2026, OAuth only, no API keys: authenticated as the user's Attio user; reads auto-approved; writes require confirmation; MCP safety annotations used; ~41 tools across ten sections per Attio's own MCP docs (a directory listing counted 23 at an earlier snapshot — the count moved; quote by source date, not as a fixed number). **CONFIRMED** (official docs + independent).
- Official MCP tool list includes records CRUD, **upsert-record** (matching attribute), **merge-records**, lists/entries, comments, notes (incl. **semantic-search-notes**), tasks, meetings, **call recordings + transcripts (incl. semantic search)**, emails (incl. semantic search), workspace members/teams, `run-basic-report`, and **`query-particle-sql`** — a **read-only SQL query tool against workspace data** ("Particle" appears to be the query/index engine name). **VENDOR-DESCRIBED** (official MCP docs).
- Open-source `kesslerio/attio-mcp-server` came first (API-key based, universal tools, ~41 tools); Attio's official server sits alongside it. **CONFIRMED** (independent).
- Webhooks: subscriptions on record/list-entry events (independent evidence: `record.created`); official docs have a webhook setup guide. **VENDOR-DESCRIBED** (official guide exists; event-type enumeration is third-party).
- Note (dated): one independent skill doc (46 days old) claimed "no API-level record merge endpoint" while the official MCP now documents `merge-records` — the merge surface may be newer than that claim. Treat API-level merge as **UNCLEAR**; MCP-level merge as **VENDOR-DESCRIBED**.

## 10. CONTENT MODEL

- **Notes**: attached to records, markdown-capable, semantic search across note content; `update-note` appends/prepends rather than silent overwrite. **CONFIRMED** (official MCP docs).
- **Emails**: synced from connected inboxes/calendars; searchable by metadata and by semantic search; full body retrievable. Email/calendar sync auto-creates People and Company records and enriches "who spoke to whom, when" — the interaction timeline is fed from the communication stream, not hand-entry. **CONFIRMED** (official MCP docs for search; independent review for auto-creation behavior).
- **Call recordings + transcripts**: native **Call Intelligence** (Pro tier) records, transcribes, and summarizes calls; recordings auto-linked to relevant records; AI surfaces buying signals/blockers/requests; clips, summaries, handoffs; "trigger key actions" from calls. Searchable by metadata and semantic topic search. **VENDOR-DESCRIBED** (official Call Intelligence page); transcript/search surface **CONFIRMED** via official MCP docs.
- **Meetings**: first-class meeting objects with participant/record linkage. **CONFIRMED** (official MCP docs).
- **Comments & threads**: threaded comments on records and list entries, with replies. **CONFIRMED** (official MCP docs).
- **Tasks**: tasks with deadlines, assignees, linked records. **CONFIRMED** (official).
- **Files**: file upload/download/metadata API. **CONFIRMED** (independent CLI docs).
- Content is queryable by agents through the same tool surface (semantic search over notes/emails/call recordings), which is exactly what the workflow Custom Agent's tool-access panel exposes. **CONFIRMED** (both docs agree).

## 11. IDENTITY MODEL

- **Record identity**: `record_<id>`; records are instances of objects with array-of-object attribute values. **CONFIRMED**.
- **Upsert identity**: `PUT /records` with a `matching_attribute` (people: `email_addresses`; companies: `domains`) — exact match creates-or-updates; **ambiguous matches abort without writing** (no write on ambiguity — a fail-safe identity rule). Custom objects support custom unique-constraint attributes; standard People/Companies do **not** support custom unique attributes (only email/domain match keys), which migration engineers call out as the hard part of dedup. Match comparison is exact/case-sensitive. **CONFIRMED** (independent migration guides + MCP server behavior docs).
- **Merge semantics** (`merge-records`, MCP): "Merge two records of the same object into one **new** record. Where both records have a value for the same attribute, the **primary record's value takes precedence**." Merge is same-object only and creates a new record identity (the merged entity gets a new ID; the originals' fate post-merge is **UNCLEAR** from the docs). **VENDOR-DESCRIBED** (official MCP docs).
- **Dedup**: no native duplicate-detection UI found in docs; practitioners rely on upsert-first patterns (`assert` by email/domain) and manual review of flagged duplicates. **UNCLEAR** whether any native auto-dedupe exists — none documented; do not claim it's absent, but the practitioner ecosystem behaves as if it's absent.
- Auto-created records from email sync carry their source implicitly (the sync is the creator), but I found no claim of provenance fields on auto-created records. **UNCLEAR**.

## 12. ATTRIBUTION MODEL

- Attio's reporting covers pipeline/funnel views, cohort reports, funnel and time-in-stage analytics, ARR cohorts, stage velocity, forecast views, and a basic-report aggregation tool. **CONFIRMED** (independent product breakdowns).
- **No native multi-touch / campaign → opportunity attribution product was found** in current docs, help center, or marketing. What practitioners do: custom objects for campaigns + SQL reporting (`query-particle-sql`) to join touchpoints to deals. I searched specifically for Attio attribution and found no first-party attribution feature. Grade: **UNCLEAR** (searched, absent from all surfaces I could reach; treat as "no evidence of native attribution," not "proven absent").
- Causal linkage that does exist: activity timeline per record (`last_interaction_at`), entry-stage history on lists, webhook events on state changes — the raw material for attribution exists, the model on top does not (natively).

## 13. LEARNING LOOP

- **No documented learning loop.** Nothing in Attio's docs, changelog, or practitioner ecosystem describes outcomes feeding back into future behavior (no per-tenant model tuning, no prompt auto-improvement, no "what worked" feedback into agents). Ask Attio has conversation history within a chat; AI Attributes recalculate when underlying data changes (reactive, not learning). Treat as **UNCLEAR/absent-from-evidence**: I found no positive evidence of any learning mechanism.
- Practitioner pattern that *approximates* a loop: users iterate agent prompts against test records manually (the attio-agent-builder skill is built around this iterate-on-failures loop), and run-attempt history lets you compare before/after. But the iteration is human-driven. **CONFIRMED** as a practitioner pattern, not a platform mechanism.

---

## WHAT ATTIO DOES BETTER THAN PING (today)

1. **Zero-entry capture from the communication stream**: email/calendar sync auto-creates People/Company records, enriches "who spoke to whom, when," and feeds the interaction timeline without hand-entry. PING's observation ingestion is agent- and integration-driven; Attio's is ambient. (Their model: capture-first, enrich-later.)
2. **Agent-ready data model with stable API grammar**: custom objects + relationships + attribute types + array-of-objects values + a public OpenAPI spec + read-only SQL over the workspace. An external agent can learn the whole surface from docs in minutes.
3. **Workflow retry semantics**: version-pinned retry (retry runs the *published-at-trigger* version), retry-from-failed with completed-step skipping, per-run attempt history. This is production workflow-operability most workflow engines never ship.
4. **Cost transparency per execution**: fixed vs variable block costs shown in the builder; failed blocks don't burn credits; agent steps report per-step token cost in the run viewer. Economic observability is first-class.
5. **Write-confirmation at the MCP boundary**: reads auto-approved, every write asks. The trust surface is in the protocol defaults, not in each agent's prompt.
6. **Content depth**: native call recording/transcription with semantic search across calls, emails, and notes as a queryable surface for agents — a richer per-record context than PING's current content plane.

## WHAT PING DOES BETTER THAN ATTIO (today)

1. **Continuity substrate**: PING's append-only evidence plane with centralized event identity and deterministic replay. Attio has run logs and attempt history, but records are snapshots, timelines are sidecars, agent steps are non-deterministic LLM calls, and corrections are overwrites. Attio cannot prove what it believed last Tuesday; PING is built to.
2. **Approval as authority**: PING's digest-pinned approval authority (silence is never approval) is an enforced, replayable event. Attio has MCP write-confirmation and practitioner draft-routing, but no typed approval node and no durable approval record.
3. **Owner corrections that survive regeneration**: Attio's owner-governed fact is a mutable field; a re-run of an AI Attribute overwrites it. PING's correction arrow keeps source evidence and owner fact separate with regeneration survival.
4. **Evidence binding**: every Attio derived value (AI Attribute, agent output, score) is a value with no support set. PING binds claims to their support sets and model versions.
5. **Explicit UNKNOWN**: Attio's agents are instructed by practitioners to emit "Unknown" as a string convention; PING makes unknown a first-class state.
6. **Deterministic-vs-agentic separation as law**: Attio practitioners converged on the same pattern (JS code blocks for deterministic work), but it's convention, not enforcement. PING can enforce it structurally.

---

## PRIMITIVES WORTH HARVESTING (exactly two)

### Primitive 1: Version-pinned runs with per-attempt retry records

**The mechanism.** Every workflow run binds the definition *version* it executed. Retries default to re-executing the pinned version (not the live one); "retry from failed" skips already-completed blocks; "retry against live" is an explicit, separately-named choice; every attempt is preserved as a record under the same run with status + execution time, comparable across attempts.

**Evidence:** CONFIRMED (official Attio help center, troubleshooting-workflows page; "Retry from start ... using the version of the workflow that was published when the original run triggered"; attempt dropdown semantics).

**Smallest steal.** A run record carries `definition_version` (the exact definition it ran). Retry is a first-class operation with three named modes (from-start-pinned, from-failed, against-live). Attempts are records, never overwritten.

**Why it fits PING.** This is PING's replay story in miniature and it's already production-proven. Our MissionRuntime replays against the recorded event artifact; version-pinned retry gives us the missing vocabulary: re-run *this exact definition* against *this exact trigger event*, with every attempt preserved as evidence. It also composes with our correction arrow: "retry against live" after an owner correction becomes a provable before/after pair instead of a silent fix.

**What we deliberately do NOT take.** Attio's non-deterministic re-execution (their agent steps are LLM calls; re-running is not reproducing). We keep our deterministic-replay requirement; we take only the version-binding + attempt-record shape.

### Primitive 2: Least-privilege agent tool scoping with a named "Run as" identity

**The mechanism.** An agent block declares its entire action surface up front: (a) CRM tool access as read-only categories (call recordings, emails, lists, meetings, notes, tasks, members, records) — enabled per category or disabled entirely; (b) web access as a binary toggle; (c) connected apps (external MCP tools) bound to a **named "Run as" user credential**, so external tool calls execute as that specific user's identity. The agent never writes directly; writes happen only in downstream deterministic blocks (update-record, create-task) that the workflow author placed explicitly.

**Evidence:** CONFIRMED (independent attio-agent-builder skill repo documents the exact config fields and the "Run as" requirement; practitioner architecture docs show read-only tool access + downstream deterministic writes as the standard composition).

**Smallest steal.** Every agent step declares: read scopes (enumerated categories), web on/off, and for each external tool, the named user identity it runs as. Agent steps are read/compute-only; all state changes are separate deterministic steps.

**Why it fits PING.** This is the concrete shape of three things PING already believes: per-agent identity with permission scope (cf. HubSpot per-agent identity, D365 per-call permission checks), the deterministic/agentic split (cf. Gumloop), and propose-don't-act. Attio's version is valuable because it's *minimal*: three toggles and a named identity, no policy language, no new authority. It also gives us the permission-inheritance answer for agents: the agent doesn't inherit ambient workspace permissions — it gets declared read categories, and external tools get a named human identity.

**What we deliberately do NOT take.** Attio's workspace model, its credit metering, and the assumption that declared scopes are enforced only by the block UI. Our enforcement is structural: the scope declaration is itself an event, and a write outside the declared surface is a fail-closed violation, not a UI limitation.

---

## PRIOR SURVEY GRADE RECONCILIATION

Where this deep study confirms, extends, or changes the 2026-09-30 CRM harvest survey's Attio grades:

- **"Lists: process state on the membership edge" (was ADAPT, independent)** — **CONFIRMED, unchanged.** Official MCP docs now show `update-list-entry-by-id/by-record-id` and list-entry attribute definitions; the idempotent entry semantics hold.
- **"Workflow trigger/action algebra" (was ADAPT, independent/unreplicated)** — **CONFIRMED and significantly EXTENDED.** The trigger list is richer than the survey knew: multi-trigger, manual run, record-command trigger, integration triggers, attribute-change triggers. The survey also missed the entire retry/versioning model and the credit model. The ADAPT verdict stands; the smallest steal is now specified as version-pinned retry + typed trigger vocabulary.
- **Continuity B ("real timeline + webhooks; field history a sidecar")** — **CONFIRMED, unchanged.** The run viewer + attempt history strengthens the B (it's the best workflow observability in the survey), but nothing found suggests an immutable event plane or deterministic replay. Still B, not A.
- **MCP ("large third-party ecosystem: attio-mcp-server, CLI tools")** — **CONFIRMED and UPGRADED in importance.** The survey predates or underweights the **official hosted MCP server** (mcp.attio.com, OAuth, GA Feb 2026): reads auto-approved, writes confirmation-required, authenticated as the user's identity, ~41 tools incl. semantic search over notes/emails/call recordings and read-only SQL. This is now the primary agent-integration surface, not the open-source server.
- **Permission model** — **NEW, not graded in the survey.** Findings: per-operation OAuth scopes in a public OpenAPI spec; user-identity inheritance for MCP; "Run as" named identity for connected apps in agent blocks; workflow-level permission inheritance **UNCLEAR** (not documented).
- **Human approval** — **NEW, not graded in the survey.** No native approval node (a real gap); approval exists as MCP write-confirmation + practitioner draft-routing. This *lowers* Attio on the approval axis relative to systems with typed approval nodes (Lindy, Copy.ai).
- **Identity/merge** — **NEW, not graded in the survey.** Upsert-by-matching-attribute with fail-safe ambiguity abort; merge creates a new record with primary-wins conflicts (MCP); dedup is practitioner-handled, no native duplicate detection found.
- **Attribution** — **NEW, not graded in the survey.** No native multi-touch attribution found; raw material (timelines, entry history) exists without the model. Grade: no evidence.
- **Learning loop** — **NEW, not graded in the survey.** No learning mechanism found; iteration is human-driven. Grade: no evidence.
- **AI agent blocks in workflows (Custom Agent with model choice, web toggle, tool access, structured output; JS code blocks; AI Attributes)** — **NEW, not in the survey.** The survey's Attio section predates or missed the agent-block workflow generation. This is Attio's biggest 2026 product change and the source of both harvested primitives.
- **DO-NOT-BUILD posture** — unchanged: do not adopt Attio's custom-object schema as an authority, the snapshot-record assumption, or the product as a dependency (counterparty: independent company as of this writing, but the Inconvo team joined Attio July 2026 — watch for consolidation).

## Open questions (for the parent, not blockers)

1. Whether Attio workflows execute under the publishing user's permissions (searched, not found in public docs) — matters for the permission-inheritance comparison.
2. Whether an API-level merge endpoint exists beyond the MCP `merge-records` tool (one independent source says no; the MCP tool is newer).
3. Whether native duplicate detection / campaign attribution exist behind paywalled tiers (no evidence in public docs).
4. The current API rate-limit numbers (sources disagree: 100 req/sec vs 100 req/min) — do not quote either as fact.
