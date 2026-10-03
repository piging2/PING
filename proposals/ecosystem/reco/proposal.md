# HARVEST PROPOSAL: Reco (agent ecosystem graph)

**Target:** Reco (reco.ai) - agent ecosystem graph: identity + permissions + connectivity + activity as a "living map"
**Worker:** harvest leaf worker, 2026-10-02
**Verdict: ADAPT** (take the mechanism, rewrite to PING semantics; zero proprietary code copied, nothing copied at all - closed-source SaaS)
**Authority owner:** projection-kernel (with object-kernel supplying node identity semantics)
**Proof IDs:** 3, 6, 13, 14

---

## 1. What was read (URLs + SHAs)

Reco is closed-source commercial SaaS. No source code repository exists publicly.
All material below was read from official reco.ai pages and official Reco announcements
via browser_open on 2026-10-02. Nothing was copied from any codebase.

1. https://www.reco.ai/blog/introducing-ai-agent-security ("AI Agents Are Creating Security Blind Spots in SaaS", Reco official blog, launching the AI agent security capability)
2. https://www.reco.ai/use-cases/shadow-agent-discovery-offboarding ("Shadow Agent Discovery & Offboarding", Reco official use-case page with FAQ)
3. https://itbusinessnet.com/2026/06/reco-mitigates-ai-agent-risk-across-claude-and-the-enterprise/ (Reco official announcement text, quoted verbatim: Claude Compliance API governance, agent mapping across models/version history/tools/permission policies/MCP servers/connected apps, natural-language investigation via Reco MCP server over the Reco Graph)
4. https://iteuropa.com/news/ai-agent-security-firm-reco-builds-channel-europe (quotes Reco: Knowledge Graph mapping identities, permissions, connectivity and activity in real time; 1,000+ detection controls; 235+ apps)
5. https://thehackernews.com/2025/01/product-review-how-reco-discovers.html?hl=ru (third-party product walkthrough, used ONLY for the authority-boundary finding that Reco operates agentless/read-only; labeled non-official)

Concatenated verbatim fetch text of sources 1-5 (plus the two search-result snippets that led to them) was saved to `sources-read.txt` in this directory.
**SHA:** `sha256:ff4fb85f7564be08b72e0c7bf143ffc0f3ff85594dd148557a030bf7e5bc31be`

Explicit honesty note: Reco publishes NO object model, NO ID scheme, NO persistence semantics, NO retry/failure semantics, and NO tests. Every field below that cannot be grounded in the docs is marked [UNPUBLISHED - clean-room definition proposed] rather than invented as fact.

---

## 2. Object model (clean-room re-derivation from official docs)

The "Reco Graph" / "Reco Knowledge Graph" as described in official sources is a
continuously rebuilt, real-time relationship map over these node types:

**Node types (derived from docs):**
- `Identity`: human (employee, owner) OR non-human (service account, bot, AI agent instance). Docs: "associated identities from both humans and machines", NHI = "service accounts, API keys, OAuth tokens, bots, and AI agents".
- `Agent`: an AI agent operating across SaaS apps. Docs: discovered from "ChatGPT, Claude, and Copilot to the embedded agents within platforms like Salesforce, ServiceNow, and HubSpot", plus "n8n workflows, ChatGPT integrations, Copilot connections, Cursor accessing repositories, Agentforce agents in Salesforce", and agents on Anthropic infra described by "models, version history, tools, permission policies, MCP servers and connected applications".
- `Application`: a SaaS app or integration (235-280+ integrations).
- `Grant`: a permission grant. Docs: "OAuth grants, API keys, delegated access, and role-based permissions"; "Every token grant is tracked across 200+ applications".
- `Connection`: SaaS-to-SaaS link, MCP server link, API integration. Docs: "SaaS-to-SaaS mapping: Identifies automated workflows connecting multiple apps"; "every MCP connection creates a new trust boundary between systems".
- `Activity`: observed actions/events of an identity. Docs: "what actions has each identity taken across SaaS and AI applications and when"; "Claude Enterprise activity through Claude's Compliance API".
- `Finding`: a detection control result (1,000+ pre-built detection rules). Docs: "alerts on exposure from misconfigurations, over-permission users, compromised accounts, and risky user behavior".

**Edge types (derived from docs):**
- `AGENT_CONNECTED_TO` (agent -> application, with connection type: OAuth / MCP / API; docs: "which SaaS applications it connects to", "filter by connection type")
- `AUTHORIZED_BY` / `CREATED_BY` (agent/NHI -> human owner; docs: "who authorized it", "maps these non-human identities to the humans who created them")
- `HOLDS_GRANT` (identity -> grant; docs: "what permissions it holds", "what credentials it uses")
- `APP_CONNECTS_APP` (application <-> application via SaaS-to-SaaS or MCP; docs: "An MCP server created a connection between Slack and Cursor")
- `PERFORMED` (identity -> activity; docs: "actions" attached to identities, "changes in these vectors over time")
- `CAN_ACCESS` (DERIVED edge: agent -> application/data, computed by traversing AGENT_CONNECTED_TO + HOLDS_GRANT; docs: "what data it can access", "what systems and data it can access")
- `VIOLATES` (node -> finding; docs: detection controls firing)

**The load-bearing derived construct: "toxic combination."**
Docs define it precisely: "AI agents create relationships between systems, and those relationships can produce permission breakdowns that no single application owner would authorize... a permissions breakdown where two applications share a trust relationship that neither was designed to support."
Formally (clean-room): a toxic combination is a derived path A -[agent]-> B in the graph whose implied trust relation is not a member of the explicitly authorized policy set. The aggregate is the risk: "Each connection is individually rational, but the aggregate effect is a web of trust relationships that no security policy explicitly defined and no traditional tool can map." This is path/reachability analysis over the lineage graph, not per-node scoring.

**Query surface (docs):**
- Inventory views: graph-based agent inventory, filterable by connection type, application, risk level.
- "Who did what with which permission": per-identity action history with timestamps.
- Risk prioritization: "correlates risk factors to prioritize offboarding: permission levels, data access, activity patterns, and age of credentials".
- Natural-language investigation: "Reco's MCP server enables Claude to query the Reco Graph so security teams can investigate access, ownership, anomalies, application connections and agent risk in natural language" - i.e., the graph is exposed as a read-only query interface.

---

## 3. ID scheme

**[UNPUBLISHED]** Reco publishes no ID scheme. Clean-room definition proposed for the ADAPT (must live in object-kernel):
- Node IDs: content-addressed from (node_type, provider, provider_native_id); e.g. agent nodes keyed by the issuing platform's native identity (OAuth client_id, service-account id, MCP server id). Human nodes keyed by IdP subject.
- Grant edges: keyed by (identity_node, grant_native_id) - one edge per observed grant.
- Activity edges: keyed by content digest of (actor, action, target, provider_timestamp, provider_event_id) for dedupe.
This mirrors Reco's observable behavior (per-grant tracking, per-identity action history) without asserting anything about their internals.

---

## 4. State transitions

**Agent/NHI lifecycle (from docs):**
DISCOVERED -> CLASSIFIED (shadow vs sanctioned; "discovered, classified, and assessed automatically") -> SANCTIONED | RESTRICTED | BLOCKED (governance decisions; docs: "determine which agents should be sanctioned, restricted, or blocked entirely").

**Credential/grant lifecycle (from docs):**
ACTIVE -> STALE (no activity, 90+ day threshold published) -> ORPHANED (creator departed; "tokens that outlive the humans who created them", "service accounts created by former employees") -> OFFBOARDED (revoked/deactivated via workflows).

**Finding lifecycle (from docs):**
Detected (detection control fires) -> Prioritized (risk correlation: permission level, data access, activity, credential age) -> Remediated (Jira ticket / IdP deactivation / Slack notification to owner).

**Graph update model (from docs):** "maps relationships ... in real time"; "continuously discovers"; "looks for changes in these vectors over time". The graph is a continuously re-ingested, time-windowed projection: each sync cycle re-pulls identity/grant/activity state from 230+ API connectors and recomputes edges. Whether deltas are event-sourced or snapshot-diffed is [UNPUBLISHED]; the ADAPT specifies event-sourced ingestion over the PING event spine (append-only, replayable) so the graph is a deterministic projection, not a mutable snapshot store.

---

## 5. Authority boundary

This is the most precisely documented part, and it is unusual: **Reco is a decision-support authority, NOT an enforcement authority.**

From the official product walkthrough (third-party, describing Reco's own stated architecture): "Reco operates in an agentless, read-only capacity... cannot change user permissions or revoke access... as it only has read-only access to the data and doesn't have write access to SaaS applications... Ultimately, Reco is a visibility and detection tool."

So the authority split is:
- OBSERVATION + DETECTION + PRIORITIZATION authority: Reco's graph and 1,000+ detection controls. Ingest is read-only via SaaS APIs (no agents, no browser extensions required).
- ACTION authority: remains with the customer's IdP, ticketing, SIEM/SOAR. Remediation is orchestrated outward: "One-click Jira ticket creation", "Integration with identity providers for coordinated account deactivation", "Slack notifications to app owners", "Findings can be routed into existing SIEM, SOAR and ticketing workflows".
- QUERY authority: the graph is queryable in natural language via Reco's MCP server - read-only interrogation ("investigate access, ownership, anomalies, application connections and agent risk in natural language").

For PING this boundary is a design lesson, not just a constraint: the lineage graph's authority is epistemic (what is true about actor/permission/action relationships), and enforcement flows through capability-kernel allow/deny at dispatch time plus human approval (proposal-kernel). The graph never mutates grants itself.

---

## 6. Persistence semantics

**[UNPUBLISHED]** Reco publishes nothing about storage, durability, or consistency. Observable behavior ("continuously", "in real time", deploy in 48h, compliance reports) implies a managed SaaS backend, nothing more. The ADAPT does not need their persistence: the graph is a projection over the PING event spine (Postgres-backed append-only journal per doctrine), recomputable by replay. No second canonical store.

---

## 7. Evidence / receipts

From official docs, Reco produces:
- Compliance reports: "Reco generates compliance reports showing NHI inventory, lifecycle status, and offboarding evidence" (SOC 2, ISO 27001, GDPR, PCI-DSS).
- Audit trails: "maintain audit trails as AI systems make real-time decisions" (Agentic AI Security).
- Per-identity action history: "What actions has each identity taken ... and when did this happen?"
- SIEM/SOAR/ticketing export: findings routed with context to existing workflows.
- Remediation evidence: ticket creation records, IdP deactivation records, owner notifications.

The evidence model is: every derived claim (finding, risk rank, toxic combination, offboarding priority) traces back to observed nodes/edges (grant records, activity timestamps, creator mappings). This is exactly the "evidence before eloquence" shape: claim -> supporting observations -> source connector. For the ADAPT: every lineage edge carries an `evidence_ref` to the source event(s) in the PING journal. Proof 3 and proof 6 depend on this binding.

---

## 8. Retries / failures

**[UNPUBLISHED]** No public statement. The ADAPT inherits PING's existing retry/reconciliation posture: ingestion connectors retry with backoff; UNKNOWN observations stay UNKNOWN (never silently converted to "no risk"); a connector outage yields a typed "coverage gap" finding, not an empty graph. This matters: an empty-looking graph must be distinguishable from a genuinely quiet environment (per SOUL #11: never confuse "nothing exists" with "the system failed to find it").

---

## 9. Revocation model

Docs describe a full offboarding workflow, but with the authority boundary above, revocation is **delegated**:
- Detection: stale/orphaned/overprivileged NHIs flagged by the graph ("Admin-level tokens with no activity in 90+ days"; "Service accounts created by former employees").
- Prioritization queue: HIGH (admin + stale 90d, ex-employee), MEDIUM (overprivileged API keys), LOWER (read-only, recent legitimate activity).
- Execution: via IdP integration (coordinated account deactivation), Jira tickets, Slack notifications to app owners.
- Completeness guarantee: "When an employee leaves, Reco shows every non-human identity they created so nothing is missed" - i.e., creator-mapping makes offboarding enumerable.

For PING/FYD: the revocation analogue is capability-kernel grant withdrawal + proposal-kernel approval for revoking an agent's grant, with the lineage graph providing the enumerable blast-radius list ("everything this agent touched via this grant"). Reco proves the value of the enumerable-creator-mapping primitive; PING already has the grant mechanism, it lacks the enumerable lineage view.

---

## 10. Tests

**[UNPUBLISHED]** No tests are publicly available; there is no open-source repository. (A third-party demo repo, christrudeau2021/reco-agent-security-lab, references Cartography's graph approach as an analogue, but that is non-official and was not used as evidence.) The ADAPT ships its own tests: deterministic replay tests (same event history -> byte-identical lineage graph), reachability tests (toxic-combination detection on fixture graphs), and evidence-binding tests (every edge resolves to a journal event).

---

## 11. Dependency analysis

**DEPENDENCIES: [] (zero). DEPENDENCY_COST: zero.**

The mechanism is a pure projection: events in (existing PING event spine), deterministic graph out. No graph database, no ML library, no vendor SDK. Reachability/toxic-combination detection is bounded graph traversal over in-memory edge sets derived from the journal; at FYD scale (one tenant, dozens of agents, hundreds of objects) this is trivial compute. If scale ever demands it, the projection is partitionable by tenant and by time window with no semantic change. No dependency names a proof_id because no dependency is needed - per the harvest rule, every dependency must name a proof_id or be rejected; here the set is empty, so the rule is satisfied vacuously.

---

## 12. License finding

Reco is closed-source commercial SaaS. There is no open-source license to verify because there is no source to harvest. **Nothing was copied: no code, no schema, no binaries.** The mechanism was re-derived clean-room from public documentation (what nodes/edges exist, what queries are answered, what the authority boundary is). This introduces zero license contamination: no GPL/copyleft/SSPL/BSL anywhere in the chain. The only flag for Nolan is the negative one: because Reco's internals are unpublished, fields marked [UNPUBLISHED] above are our definitions, not theirs - which is precisely why the verdict is ADAPT, not ADOPT. There is nothing to adopt as-is.

---

## 13. Proof mapping (why this is not OPTIONAL)

- **Proof 3 (deterministic evidence-backed graphs):** The lineage graph IS the evidence-backed graph for the mission lane. Same event history -> identical graph, every edge carrying an evidence_ref to the journal. Ask FYD's object graph (proof 3's website side) and the mission lane's actor graph are the same mechanism applied to two node vocabularies.
- **Proof 6 (Ask FYD answers from evidence):** "Who did what with which permission" is a first-class query: (actor) -[USED_GRANT]-> (grant) -[PERFORMED]-> (action) -[ON]-> (target), each hop evidence-bound. Ask FYD can answer lineage questions about owner corrections, regenerations, and mission executions from this graph instead of narrating from logs.
- **Proof 13 (mission VERIFIED only after independent verification):** The verifier checks the worker's claimed result against the lineage graph: did this worker actually perform the claimed actions, under which grant, and do the observations match? A false-success claim (the ORCA proof that already landed) is detectable exactly this way: claim with no corresponding lineage edges fails closed.
- **Proof 14 (replay reconstructs relevant state):** Replay rebuilds the lineage graph deterministically from the event spine, including time-T snapshots ("what could agent X reach on date D?"). Post-hoc reconstruction of an incident is replay over the same projection.

No proof_id -> REJECT does not apply: four proof_ids attach.

---

## 14. Verdict: ADAPT, with reason

**ADAPT.** The mechanism Reco proves valuable is real and well-evidenced by official docs: maintain a living, real-time graph of (agent identity) -> (permission grants) -> (connections) -> (observed actions), compute derived reachability ("what can this agent touch"), detect cross-boundary paths no single policy authorized ("toxic combinations"), keep the graph strictly read-only/epistemic while enforcement flows through separate authority (grants, approvals, IdP), and answer "who did what with which permission" with evidence refs.

ADOPT is impossible (closed-source, unpublished internals) and REJECT is wrong (the mechanism maps to four proofs and addresses the FYD/PING event-spine archaeology question: the spine records what happened; nothing currently projects *actor lineage with effective-permission reachability* as a deterministic, replayable, evidence-bound view).

Adaptation to PING semantics:
- Nodes/edges become a **projection-kernel** adapter over the existing event journal. No new event store, no second truth model (per doctrine: JSONL never canonical, Postgres implements the spine).
- Node identity uses **object-kernel** identity semantics (content-addressed, no remint).
- Grant edges reference **capability-kernel** grants (WHO may do WHAT to WHICH OBJECT); the graph's CAN_ACCESS edges are the *effective* permission set, enabling the toxic-combination check: effective reach minus explicitly approved reach = drift to surface.
- Enforcement stays where it belongs: capability-kernel allow/deny at dispatch, proposal-kernel approval for grant changes. The graph never mutates state.
- Ingestion is event-sourced from the journal (not Reco-style API polling of SaaS apps, which is their enterprise context, not ours); the *graph semantics* transfer, the *connector fleet* does not.

Out of scope (explicitly not harvested): the 230+ SaaS connector fleet, the 1,000+ detection-control catalog, the SaaS App Factory, natural-language investigation UX. Those are product, not primitives.

---

## 15. SMALLEST MISSING PRIMITIVE

**Grant-anchored actor lineage edge with temporal reachability.**

One derived edge type, maintained as a deterministic projection over the existing event spine:

`(actor_identity, grant_id, action, target, t_observed, evidence_ref)`

plus two derived computations:
1. **Effective-reach query:** the transitive closure of (actor -> grant -> connection -> target) at time T - "what could this agent reach?"
2. **Drift detection:** effective reach MINUS explicitly approved reach = candidate "toxic combinations" (cross-boundary paths no approval authorized).

PING already has: the event spine (what happened), capabilities (what is allowed), missions (what was attempted). What it does NOT have is this first-class, time-indexed, evidence-bound projection that answers "who did what with which permission, and what paths did that open" - the exact capability Reco's entire company is built on, and the exact view the verifier needs for proof 13 and replay needs for proof 14. Everything else (UI, detection catalogs, connectors) is product built on top of this one primitive.

Implementation shape: a projection-kernel module, zero dependencies, fed by journal replay, tested by determinism fixtures. Estimated: one small module, not a subsystem. Per the harvest doctrine: harvest the primitive, not the product.

---

## 16. Risks and open questions

1. Reco's internals are unpublished, so the re-derivation is from behavioral description, not source. The mechanism (graph + reachability + read-only epistemic authority) is simple enough that independent re-derivation is low-risk, but any claim about Reco's actual implementation beyond the docs would be fabrication - none is made here.
2. Temporal reachability at scale needs time-windowed edge validity (grants revoked at T2 must not appear in reachability at T3). The projection must treat edges as interval-valid, not point facts. This is a design requirement for the ADAPT, flagged now.
3. The drift detector ("toxic combinations") needs the "explicitly approved reach" set to diff against; that set comes from proposal-kernel approvals. If approvals are not yet graph-addressable, drift detection degrades to reachability-only. Reachability alone still serves proofs 6/13/14.
