# Clay — Deep Study (2026)

Date: 2026-09-30. Researcher: ecosystem-archaeology subagent.
Evidence grades: **CONFIRMED** (independent sources, incl. official docs + practitioner corroboration) / **VENDOR-DESCRIBED** (their docs/marketing only) / **UNCLEAR** (no evidence found or conflicting).

Primary sources: Clay's official public docs repo (clay-run/public-docs, synced 2026-05-11), Clay's official agent-plugins repo (clay-run/agent-plugins, CLI v1.0.0, Sep 2026), Clay University (university.clay.com), practitioner skill repos (clay-workbench, clay-engineer, gtm-master-skill, sales-clay).

Context note: as of Sep 11 2026 Clay raised $115M Series D at $7.1B, 17,000+ customers, self-describes as "the infrastructure that go-to-market teams use to build a revenue system" and is pitching a "self-learning AI revenue engine." Their product surface has materially expanded since the prior survey (Jun 2026): Claygents builder, Workflows (graph automations, alpha), Audiences (CRM-like entity store), Signals product, Sequencer, CLI + MCP.

---

## 1. DATA MODEL

- **Table/Row/Column with typed columns**: manual, enriched, computed (formula), AI-generated. CONFIRMED (official docs + multiple practitioner repos).
- **Enrichment columns**: per-field waterfall over 150-200+ providers (Hunter → Dropcontact → Apollo → PDL etc.). Query Provider 1; on no-result try Provider 2, etc. Each provider hit costs Data Credits; coverage compounds (~85-95% across 3 providers at 60% each). CONFIRMED (practitioner skill repos, independent reviews, Metabase modeling advice).
- **AI columns**: two modes — (a) Web research (Claygent): scraped page content fetched per-row; (b) Create/modify content: table-data-only, no web access. Scraped content lives in its own column; not shared unless referenced. VENDOR-DESCRIBED / CONFIRMED (official docs).
- **Formula columns**: deterministic computed values (ICP scores, routing, `sending_gate_eligible`). Always recompute from source fields. CONFIRMED.
- **Claygent (saved agent)**: prompt + instructions + model + output JSON schema + version. Deployable across tables; row-scoped inputs only (cannot query other tables directly; workaround = Lookup Multiple Rows column, capped at 100 matches/row). CONFIRMED (official docs).
- **Audiences**: CRM-like entity store — People and Companies entities, custom objects incl. Opportunities (deals). Records have activities feed; fields filterable. CONFIRMED (official agent-plugins).
- **Merge column**: coalesce best value from multiple columns into one. CONFIRMED (official docs).
- **Confidence indicator**: Clay auto-injects a `confidence` field (low/medium/high/very high) into AI output schemas, driving red/yellow/green cell indicators. CONFIRMED (official docs).
- Native mutable tables; snapshots are per-workflow (see §8), not per-table. Grade: CONFIRMED snapshot-amnesiac at the table level (prior survey's continuity C stands).

## 2. TRIGGER MODEL

What fires work:
- **Signals**: standing watches on daily/weekly cadence over (a) a table view or (b) audience segments. Taxonomy: JobChange, NewHire, Promotion, JobPost, News (funding/M&A), LinkedinPostMentions, PersonTopicIntent, CompanyTopicIntent, WebsiteVisitorTracking, plus Custom. New signal starts **Paused**; must be resumed. Default filters exist (job change/promotion start at confidence ≥ 90). CONFIRMED (official skills).
- **Workflow triggers** (nodeType "trigger"): signals, audience segments, schedules, webhooks, Clay tables (UI-only), CSV uploads, Find-leads searches (Clay's GTM database search). One run per record. CONFIRMED (official skills).
- **Table auto-run / "Keep existing results"**: with keep-existing on, auto-run fires only on empty or errored cells; rows with results are skipped. Prevents re-spend. CONFIRMED (official docs FAQ).
- **Webhooks inbound**: every table has a unique webhook URL; every POST = a new row (NO dedupe by identity — see §11). CONFIRMED (official docs).
- **HTTP API enrichment columns**: outbound POST from a table to middleware (Zapier etc.). Rate limit 100 req/s/workspace; retry on 408/413/429/network, 1 retry default, configurable to 5. CONFIRMED (official docs).
- **Draft vs live**: workflow edits live on draft; `clay workflows publish` ships live; runs against a CSV trigger run from creation. CONFIRMED (official skills).

## 3. AGENT MODEL — Claygent

- **Scope**: one agent column = one row at a time; explicit variables from table columns (`{Clay Variable}` syntax); cannot loop records or query workspace on its own. Chained agents communicate via the shared table (Agent roster pattern: qualifier → researcher → copywriter writing typed columns). CONFIRMED.
- **Tools**: web search (toggle; mandatory-always-on for Clay's parallel models), built-in "Find contacts and jobs" tool, custom MCP servers (Enterprise only; requires non-Clay model + your own API key; OAuth not supported; Bearer key transmitted). Models: Clay parallel (Argon/Neon/Helium — Argon 3 credits/row, Helium 1 credit/row), plus Claude/GPT/Gemini/Grok/Mistral via Clay-managed account (variable credit charge) or own API key (1 Action, 0 Data Credits). CONFIRMED (official docs).
- **Reasoning is fixed LOW for every model**, including third-party models via own keys; not configurable. CONFIRMED (official docs — sharp determinism note: Clay *caps* reasoning depth, they do not make it deterministic).
- **Practitioner discipline**: one task per column; always include fallback ("Unknown"/"Not Found"); test 3 rows before scale; budget-per-row ceilings; cite-source-inline requirement to kill fabrication. CONFIRMED (practitioner repos).
- **Version history**: explicit Save creates a version; version panel lists prompt/model/inputs/outputs/tools per version; revert restores instantly; update propagates to all tables; in-flight runs keep the version they started with. No automated diff. CONFIRMED (official docs).
- **Test harness**: up to 10 test cases free (test runs cost no credits); save as reusable suite; compare across versions/models. CONFIRMED.
- **Sculptor**: conversational agent builder that drafts prompt + variables + output format + test cases. CONFIRMED (VENDOR-DESCRIBED, official docs).
- Centralized Agents home shows every table each agent runs in. CONFIRMED.

## 4. PERMISSION MODEL

- **Roles**: Admin (full workspace control, billing), Editor (create/edit tables, workflows, integrations, run actions), Viewer (Enterprise only; view-only; can be granted per-table/per-workbook edit as collaborator). CONFIRMED (official docs).
- **Per-connection access settings**: each connected account (OpenAI, Salesforce, HubSpot, …) is set to "Anyone in the workspace" or "Specific people and groups." Without access you can *run the column and view run info* but cannot configure it, edit its logic, duplicate it, or use it in waterfalls/Claygent context. CONFIRMED (official docs).
- **Workbook credit spend limits**: manageable by admins/editors, not by viewers/collaborators. CONFIRMED (official docs).
- **Signal control**: pause/resume/delete are the cost levers; pause stops checking and spending. CONFIRMED.
- No per-row or field-level ACLs; no named approver roles on sends. Permission granularity is workspace/table/connection, not record. CONFIRMED (no contrary evidence).

## 5. WORKFLOW MODEL

- **Two execution surfaces**: (a) Table: left-to-right column order is the pipeline; conditional execution via formula gates and filters. (b) Workflows: graph of typed nodes — agent (Claygent), tool (single Clay action or Clay function), conditional (rules / agentic / code modes), code (deterministic Python, no LLM), delay, map/reduce (fan-out with maxConcurrency/maxRetries), trigger. CONFIRMED (official skills).
- **Step ordering**: tables run columns left-to-right; workflows run graph edges. Conditional nodes have explicit default route (`isDefaultRoute`) or `endRunOnNoMatch`; no-match without a route fails the run. CONFIRMED.
- **Formulas as gates**: practitioner standard — gate columns upstream of every paid step (`endRunOnNoMatch: true` conditional, or table filters hiding rows); `sending_gate_eligible` TRUE/FALSE formula before any sequencer/CRM push. CONFIRMED (practitioner global rules).
- **Data passing**: explicit input schemas with sourceNodeId/sourcePath pins; JSON output schemas on AI nodes; output contract per terminal node. CONFIRMED.
- **Cost control**: gate nodes upstream of paid nodes (verify gate exits on 5-record test runs before scaling); batching on tool nodes (batchRunSettings, maxBatchSize). CONFIRMED.

## 6. HUMAN APPROVAL MODEL

- **No first-class approval/review node exists in Clay workflows** (node types are agent/tool/conditional/code/delay/map/reduce/trigger — no "wait for human" node found in official node-type list). CONFIRMED absence (official skills enumerate node types exhaustively).
- **What exists instead** (practitioner layer):
  - `sending_gate_eligible` formula = *automated* qualification gate (email present, verified, ICP band, suppression, seniority, recency, first-line quality) — a rule, not a human.
  - Human-in-the-table: generated copy sits in columns; operator reads/reviews before export; launch gated on "explicit approval in that session" (clay-wave-runbook pattern: Draft + critic PASS + human approval → launch).
  - **Sequencer replies**: "A drafted reply approved in Slack" — Clay drafts, rep approves/edits in Slack, then sends. CONFIRMED (Clay University).
  - Sequencer campaign-level safety: just-in-time enrollment check right before each send (if lead books a meeting / becomes customer / stops matching, sends stop mid-sequence), exclusions, cooldown windows, global blocklist. CONFIRMED (Clay University).
- Prior survey framed the gate as "send-gate formula" — accurate; it is NOT a human approval gate. Human approval in Clay is social/procedural (review the table, approve in Slack), not a typed workflow primitive. CONFIRMED.

## 7. OBSERVABILITY MODEL

- **Workflow run analysis** (gated: workspace must enable run analysis, else `auth_forbidden`): `traffic` (node-to-node transition counts, reach/failure/duration, dead branches), `aggregate` (grouped counts, failure rates, duration p50-p99, **credits** — by node, error, workflow, trigger, snapshot_version, time), `runs` (list runs w/ error text, filterable by status/trigger/version/time), `steps` (real step executions with truncated inputs/outputs), `search` (token search across recorded run content incl. prompts, **agent reasoning**, tool results). CONFIRMED (official skills).
- **Version scoping**: every workflow edit creates an immutable snapshot; each run pins its snapshot; analysis defaults to the latest version that has run; can group by snapshot_version for before/after. CONFIRMED.
- **Table level**: run summary panel; per-column run info; credit consumption per provider in table settings; webhook test with signing secret. CONFIRMED.
- **Audiences activities**: cursor-paginated activity feed per segment (activity types, sources, time-bounded); `summary` for grouped counts. Signal events land as activities on records. CONFIRMED (official skills, experimental flag).
- Per-row lineage (which step produced which cell) exists at run level via `runs steps`, not as a persistent per-cell provenance record on the table. Strengthened from prior C: workflow observability is genuinely strong (B+), table-cell lineage remains weak.

## 8. REPLAY / RETRY MODEL

- **Retry**: failed requests retried on HTTP API columns (configurable 1–5); table rows can be re-run (stop run, fix, re-run); workflow runs can be paused/resumed; runs can be re-tested against draft or `--live` version. CONFIRMED.
- **No determinism**: LLM steps are nondeterministic (fixed low reasoning effort ≠ deterministic). Re-running a Claygent column costs full credits again — "Clay does not compare the incoming result against the existing value before charging." CONFIRMED (official docs FAQ).
- **Config versioning, not execution replay**: snapshots are immutable workflow *definitions*; runs pin them. There is no "replay this run's decisions against new evidence" primitive, and no event log to replay from. Version revert exists for Claygents; no per-cell history.
- Prior continuity grade **C** (tables) stands; workflows get a **B** on config observability but still no replayable substrate.

## 9. CONNECTOR / API / MCP MODEL

- **No public REST API**: `api.clay.com/v3` is internal, session-cookie auth. CONFIRMED (practitioner research).
- **Programmatic surface = CLI + MCP**: official `clay` CLI v1.0.0 (tables, workflows, signals, audiences, functions, routines, webhooks, searches, claygents); local MCP proxy (`clay mcp`) with tools: `read`, `edit_node`, `validate_workflow`, `execute_clay_action` (single-shot, ~25 runs/day/user cap), `table` (schema/query/export). CONFIRMED (official + practitioner).
- **Inbound**: per-table webhook URLs; `clay webhooks create/list/delete/test` with signing secret. **Outbound**: HTTP API enrichment columns; native CRM integrations (HubSpot, Salesforce sync with skip-already-seen); sequencer integrations; Zapier/Make.
- **200+ data providers** via waterfall catalog (incl. Intentsify intent data partnership Aug 2026 — 1.1T intent signals). CONFIRMED (press coverage + docs).
- **Custom MCP servers as Claygent tools** (Enterprise; bring your own API key; your own first-party data accessible). CONFIRMED (official docs). Clay agents can thus reach Salesforce/HubSpot/Gmail/Calendar via MCP catalogs.
- CRM sources (HubSpot/Salesforce) track every imported record and skip already-seen ones — identity-aware import, unlike webhooks. CONFIRMED (official docs).

## 10. CONTENT MODEL

- **AI research outputs**: stored as table cell values (typed by output JSON schema). Cell overwrite on re-run; prior value discarded (no cell history surfaced). VENDOR-DESCRIBED/CONFIRMED boundary: columns hold current values; "Keep existing results" prevents overwrite.
- **Message personalization**: built modularly (first-line columns, subject-line columns) from enriched fields + Claygent outputs; assembled line-by-line (practitioner best practice: never generate whole emails in one AI call). Sequencer campaigns: up to 4 messages, variables, **AI snippets** (context-guided generation), spintax, live spam check, A/B testing, cost visible while building. CONFIRMED (Clay University + practitioner).
- **Copy QC**: practitioner pattern of code-node QC (length, format, banned punctuation) plus companion critic Claygent; 5/25/100 tuning loop with PASS/BLANK/FABRICATED scoring. CONFIRMED (practitioner).
- **Context assets**: Claygent builder holds business context (company description, ICP, personas auto-populated from workspace settings), document uploads (up to 10 files, 50MB, 1000 pages/PDF) as persistent agent context. CONFIRMED (official docs).

## 11. IDENTITY MODEL

- **Auto-dedupe** (official): per-table, on a Text/Email/URL column; fires on row add and on dedupe-column value change; keep-oldest (default) or keep-newest; **row-level delete of the loser — no field merging**; blanks/stale/>200-char cells excluded. CONFIRMED (official docs).
- **Webhooks do NOT dedupe by identity**: every POST = new row. **CRM sources DO**: track all imported records, skip seen even after row deletion. CONFIRMED (official docs).
- **Signal population identity**: signals watch a *table view* or *audience segments* by identifier field (domain/email/etc.); what a signal watches is fixed at creation (repointing = new signal). CONFIRMED.
- **Practitioner dedupe**: confidence-layered matching (exact email → variants → personal identifiers → name+company fuzzy), survivor-picked by rule ladder, dry-run merge plan for human approval. CONFIRMED (practitioner) — but this is user-built, not native.
- No native cross-source entity resolution / identity graph of Clay's own; resolution is per-table column matching. Prior "do not take" on identity authority stands; Clay's dedupe is deliberately shallow (exact-column).

## 12. ATTRIBUTION MODEL

- **Signal events are queryable**: `signal_events` dataPath root filterable by type, window, and specific `sig_…` id; aggregate-occurrences keys per type. So "companies with a JobPost in last 30 days" is expressible, and campaigns can be built on it. CONFIRMED (official skills).
- **Native closed-loop attribution (signal → reply → meeting → revenue) is NOT evidenced**: campaign stats exist in the Sequencer; audience activities show email/call activity; but no published mechanism binds "this meeting came from that signal event." Practitioners export to warehouses (Metabase/Snowflake modeling advice) and join themselves. UNCLEAR-to-absent natively.
- **Cost attribution**: credits groupable by node/workflow/trigger/snapshot in run analysis; per-provider credit consumption in table settings; per-signal billing model (per-record-checked vs per-event-landed) documented. CONFIRMED.
- Credit events carry record/provider/credits/time (Metabase models `credit_events`). CONFIRMED (independent modeling advice).

## 13. LEARNING LOOP

- **Human-driven iteration loop**: test cases (10 free, reusable suites), version compare, 5/25/100 rollout, prompt version bumps after reading prior wave's replies (practitioner wave-runbook: "Learnings go into the MessageGen prompt (bump the version)"). CONFIRMED (practitioner).
- **Vendor claim (Sep 2026 Series D)**: agents "remember information from prospect interactions, identify recurring questions and update future sales materials accordingly"; "self-learning AI revenue engine." **VENDOR-DESCRIBED only** — no published mechanism (no training loop, weight-update log, or learning API found in docs/CLI/skills).
- No cross-customer learning documented; no automatic weight changes; memory claims ("remembers context across runs") remain unverifiable as prior survey noted.
- **Verdict: no verified learning loop.** Learning = humans editing prompts between waves. The Series D "self-learning" language is positioning, not a mechanism — treat as UNCLEAR until a mechanism ships.

---

## SIGNAL INTELLIGENCE MACHINERY (charter focus)

- **Signal creation sources**: (1) first-party: CRM/audience records watched by signals; (2) enrichment-provider data (BuiltWith tech stack, hiring data, firmographics); (3) Claygent AI web research (news, funding, company sites — Argon deep research); (4) native signal types incl. LinkedIn post mentions and **web intent** (WebsiteVisitorTracking — though one official skill flags "web intent is out of scope" as a current limitation in the CLI surface; native page copy claims real-time monitoring); (5) topic intent via provider catalogs (Bombora etc., resolved via `search-topics`); (6) Intentsify partnership (Aug 2026) injecting 1.1T intent signals. CONFIRMED for 1–4; web-intent CLI limitation flagged CONFIRMED.
- **Signal composition**: natively — multiple signals per account combined into "a single account score" (Clay page); signals filterable and countable via `signal_events` dataPath (aggregate occurrences, time windows, per-signal-id scoping). Practitioner — composite intent scores fuse 8+ sources with time decay + job-change day-window multipliers + count heuristics (1 signal = standard, 2 = high, 3+ = same-day). CONFIRMED (vendor page + practitioner).
- **Signal → enrichment → route**: canonical practitioner pipeline SIGNAL DETECTION → ENRICHMENT (waterfall) → QUALIFICATION GATE (formula/conditional, `endRunOnNoMatch`) → CRM SYNC (native HubSpot/Salesforce, push only qualified+verified) → SEQUENCE ENROLLMENT → MONITORING (reply tracking, signal-to-meeting conversion dashboards). Every signal passes the enrichment+gate before any outreach — "automating bad signals at speed is worse than manual." CONFIRMED (practitioner, multiple).
- **Strongest signal-native mechanics**: signals write **events as activities onto audience records** (typed, timestamped, filterable) — the closest Clay gets to an event plane; created-signals start paused (deliberate confirmation gate before spend); pause is the cost lever; delete keeps captured events but loses the baseline. CONFIRMED.

---

## WHAT CLAY DOES BETTER THAN PING

1. **Provider marketplace depth**: 200+ enrichment providers behind one waterfall abstraction with per-provider cost/coverage data. (PING has no provider pipeline.)
2. **Credit-economics instrumentation**: per-signal billing models, per-node credit attribution in run analysis, per-provider consumption, budget ceilings, test runs free. Cost is a first-class observable, not an afterthought.
3. **Practitioner workflow canon**: the gated cheapest-first order (filter → qualify → enrich → personalize → send-gate) is battle-tested across thousands of teams with published credit math. PING has the pattern documented but not production-burned.
4. **Signal product surface**: typed, scheduled, pausable watches with confidence filters and per-type billing — a real "watch the world" primitive PING does not have.
5. **Just-in-time enrollment**: the "check membership right before the send" semantic (stop mid-sequence on state change) is a genuinely good safety pattern.
6. **Official agent tooling**: CLI + MCP proxy + published skill docs that third parties extend — an integration surface PING's side hasn't matched.

## WHAT PING DOES BETTER THAN CLAY

1. **Continuity**: append-only event plane, deterministic replay, owner corrections surviving regeneration — Clay is snapshot-amnesia at the table level by design; workflow snapshots version *config*, not *decisions*.
2. **Approval as an event**: Clay has no typed approval primitive at all (approval is social/procedural — Slack messages, table review); PING's approval is a digest-pinned, replayable event where silence is never approval.
3. **Evidence binding**: Claygent outputs are cells with a confidence color; the reasoning trace is searchable in run logs but not bound to the claim. PING binds every derived claim to its support set.
4. **Dedupe/merge semantics**: Clay deletes the losing row (no merge, no record of the merge decision). PING's identity convention is append-only with evidence and never-false-merge.
5. **Per-attempt cost events**: Clay logs credits consumed but discards losing providers' non-resolutions silently; PING's design keeps the expensive miss in history and resolves conflicts by evidence precedence.
6. **Learning honesty**: Clay's "self-learning" is a press-release claim; PING's correction arrow (owner correction as governed overlay surviving regeneration) is an actual mechanism.

---

## PRIMITIVES WORTH HARVESTING (exactly two)

### P1. Signal-as-event with scored composition (ADAPT)
**The steal**: a *standing watch* primitive that (a) declares a watched population (records/segments, identifier field, fixed at creation), (b) emits **typed events with confidence scores** that land as activities on the bound entity (Clay's "signals write activities onto records" + `signal_events` queryability), (c) **starts paused** and only runs after human confirmation, (d) bills **per-event-landed** rather than per-record-checked so cost scales with signal volume not watch size, and (e) supports **composition**: multi-signal scores with time decay and count heuristics (1 signal standard / 2 high / 3+ same-day) over the same event stream.

**Why smallest**: it's a schema + scheduling discipline, not a product: `watch(population, type, filter, schedule) → events(entity, type, confidence, evidence, ts)` with pause-first activation and per-event cost accounting. Our version lands on ping_events with entity binding (Common Room's rule), keeps every event forever (Clay deletes nothing on signal-delete — we go further: the watch config is also an event), and composes deterministically from the log so a score replays.

**What we do NOT take**: Clay's provider feeds as dependencies; the mutable-table destination; snapshot semantics; the unverified "self-learning" claim.

### P2. Pre-send safety triple: send-gate + just-in-time enrollment + per-event cost lever (ADAPT)
**The steal**: three coupled mechanics: (a) a **send-gate formula** evaluated before any external push (email present + verified + ICP band + suppression + recency + content quality — the `sending_gate_eligible` canon), (b) **just-in-time enrollment**: re-check eligibility at the moment before the send, so a state change (meeting booked, became customer, opted out) cancels mid-sequence, and (c) **pause-as-cost-lever**: pausing a watch/workflow stops spend instantly and reversibly, preferred over deletion.

**Why smallest**: it's a gate *shape* plus a recheck *timing rule*, not infrastructure. Our version: the gate is a typed node whose PASS/FAIL decision is an event on the evidence plane (Clay's gate is a formula cell — ours records who/what evaluated, when, against which evidence); the just-in-time recheck is a pre-effect invariant check; the pause is an owner-governed state transition, not a vanished row. This pairs directly with PING's existing approval authority: gate = machine check, approval = human event, just-in-time = last-moment re-verification.

**What we do NOT take**: Clay's formula-cell implementation (no provenance); the social/procedural "approval" (we keep typed approval events); credit-metering as the internal cost unit.

---

## GRADE CHANGES vs PRIOR SURVEY

1. **Claygent gates (M1): CONFIRMED, strengthened.** The prior survey graded the gated cheapest-first pattern "independent" via practitioner repos. Now additionally CONFIRMED in Clay's own official docs: `endRunOnNoMatch` conditional gates, "Keep existing results" skip semantics, budget-per-row ceilings, 5/25/100 rollout discipline, and credit pricing per model (Argon 3/row, Helium 1/row). The mechanism is deeper and more production-instrumented than the prior survey saw. ADOPT verdict stands; the PING adaptation (gate decisions as events) is unchanged.
2. **Shared blackboard (M2): CONFIRMED, with a sharp new limitation.** Claygent builder docs prove versioning/propagation is real (update once, propagate everywhere; in-flight runs keep their version — genuine config provenance). But docs also prove the hard limit: Claygent is row-scoped, cannot query other tables, cannot loop; the "blackboard" is strictly the table. ADAPT verdict stands; "unverifiable remembers-context claims" DO-NOT-TAKE stands and extends to the Sep 2026 "self-learning AI revenue engine" positioning (VENDOR-DESCRIBED only, no mechanism).
3. **Waterfall provenance (M3): CONFIRMED, one correction.** Per-attempt cost events CONFIRMED (credit_events modeling, run analysis credits by node, per-provider consumption). **Correction**: native *per-cell* resolving-provider attribution is UNCLEAR — no in-app per-cell provider display was found; the "keep resolving provider per field" advice comes from practitioner modeling (Metabase), i.e., you build it yourself. The seed is thinner than the prior survey implied. ADAPT verdict stands.
4. **Human approval: DOWNGRADED in specificity.** Prior survey (via Lindy/Copy.ai entries) implied review-node patterns exist in the space; for Clay specifically there is **no native approval node** — human approval is procedural (Slack approve, table review). This *increases* PING's differentiation on the approval arrow: the field's best GTM product has no typed approval primitive.
5. **Observability: UPGRADED.** Prior survey graded Clay continuity C (correct for tables). New: Clay **workflows** carry immutable config snapshots, run-pinned versions, step-level IO, duration percentiles, credit attribution, and token search across agent reasoning — a genuinely strong run-observability surface (B+ for workflows). It still isn't an event plane (no replay of decisions against evidence), but it's the closest a snapshot product gets, and its *version scoping* discipline (runs pin snapshot; analysis defaults to latest-run version; before/after by snapshot_version) is worth studying for our own replay UX.
6. **Permission model: UPGRADED in detail.** Prior survey noted only credit caps. New: 3 roles + per-connection access allowlists + workbook credit spend limits + signal pause-as-lever. Still no record-level ACLs or named approvers — fine for harvest, which only needs the gate shapes.
7. **Continuity grade: C (tables) / B (workflow config observability).** The A slot stays empty.

---

## Sources

- https://github.com/clay-run/public-docs (docs: claygent-builder.md, use-ai-integration-overview.md, roles-and-permissions.md, access-settings-for-connections.md, table-management-settings.md, send-table-data.md, webhook-integration-guide.md, email-sequencer.md)
- https://github.com/clay-run/agent-plugins (clay/skills: signals/SKILL.md, workflows/SKILL.md + run-analysis.md, audiences/SKILL.md + filters.md + custom_objects.md, campaigns-sequence-writing/SKILL.md; CLI v1.0.0 release notes)
- https://university.clay.com/lessons/your-crash-course-on-clays-sequencer ; https://university.clay.com/lessons/replies-and-routing
- https://github.com/guerrilla2799/clay-workbench (SKILL.md, resources/global-rules.md, skills/clay-outbound/SKILL.md, skills/clay-workflow-build/SKILL.md, skills/clay-claygent-iterator/SKILL.md, resources/execution-surface.md)
- https://github.com/mariosworkflows/clay-engineer (clay/claygent.md, clay/table-mechanics.md)
- https://github.com/neversight/learn-skills.dev/blob/HEAD/data/skills-md/sales-skills/sales/sales-clay/SKILL.md
- https://github.com/pushcx/sales/blob/HEAD/skills/sales-clay/SKILL.md
- https://github.com/miksh21/gtm-master-skill (clusters/enrichment/clay-engineer/, clusters/_external-takes/swan-signals.md)
- https://github.com/sungwanjo-clay/clay-skill-creator (skills/clay/monitor-buying-signals/, dedupe-contacts/, clean-email-list/)
- https://github.com/realjaymes/marketingagentskills (skills/clay-gtm-outbound/)
- https://github.com/bulldozer-collective/bulldozer-claude-marketplace (plugins/bulldozer-external/skills/growth-automation/SKILL.md)
- https://github.com/dallasandrews1/intradiem-gtm-engineer (coordinator/skills/clay-wave-runbook/SKILL.md)
- https://www.clay.com/tools/intent-signals-outbound-sales
- https://ppc.land/clay-gains-intentsifys-1-1-trillion-intent-signals-via-new-partnership/
- https://pulse2.com/clay-raises-115-million-series-d-at-7-1-billion-valuation-to-build-ai-growth-engine/
