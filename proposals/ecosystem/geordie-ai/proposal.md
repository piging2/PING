# Harvest Proposal: Geordie AI — evidence-backed agent governance

**Verdict: ADAPT** (mechanism only, clean-room re-derivation to PING semantics; no upstream code taken)
**AUTHORITY_OWNER: capability-kernel**
**proof_ids: [10, 11, 13]**
**Date: 2026-10-02**

## 1. What Geordie AI is (verified)

Geordie AI is a **CLOSED, proprietary commercial product**: a London-based agent-security/governance startup founded early 2025 by Henry Comfort (CEO), Hanah Marie-Darley (Chief AI Officer), and Benji (founders ex-Darktrace/Snyk). $30M Series A led by Balderton Capital announced 2026 (total raised $36.5M). No public source repository, no developer documentation, no public API docs, no published license. Distributed via AWS Marketplace as a SaaS platform ("Geordie Agentic Security Platform"). Per the binding harvest rule, **no proprietary code was copied**; everything below is re-derived clean-room from public official disclosures.

## 2. What was read (official sources only, with SHAs)

SOURCE_SHA inputs (sha256 over concatenated material actually read):
`sha256:76174fb37099b0445fcb638f8ecadbb110bb9892c08b126d042384899333071c`

Inputs (listed in the hashed file `/tmp/geordie-sources.txt` used for the digest):
1. `https://www.geordie.ai/product/agent-discovery/` — official product page, fetched 2026-10-02 (302 lines). Key disclosures: agent identity definition, register schema, permission map shape, skill-config discovery, posture/drift tracking, risk dimensions.
2. `https://www.geordie.ai/` — official homepage, fetched 2026-10-02 (85 lines). Key disclosures: behavioral observability record shape, Beam deterministic intervention claim.
3. `https://www.geordie.ai/how-it-works` — via search snippet (geordie.ai). Key: three vantage points (code, cloud, endpoint), behavioral layer vs MCP-gateway protocol layer distinction, "agentic fingerprinting".
4. `https://lodinews.marketminute.com/article/gnwcq-2026-3-23-geordie-ai-introduces-beam-the-first-ai-agent-remediation-suite-with-context-engineering` — official Beam launch press release (Geordie press, 2026-03-23), via search snippet. Key: "Beam deterministically assesses the appropriate context and security policies to provide back to the agent".
5. `https://www.geordieai.net/downloads/claude-compliance-api-onepager.pdf` — official Geordie one-pager PDF (geordieai.net is Geordie's domain), via search snippet. Key: agentic fingerprinting description, Claude Compliance API ingestion, "Beam operates at the endpoint layer".
6. `https://www.securityweek.com/geordie-raises-30-million-for-ai-security-and-governance-platform/` — SecurityWeek reporting on the official $30M raise. Key: founding date, London base, product category confirmation.

Unrelated GitHub results were screened out: `colin-geordieai/*` is an unrelated personal account (forks of GitHub Security Lab projects); no Geordie AI company repo exists publicly.

## 3. Object model (clean-room re-derivation)

Geordie's platform is evidence for **three distinct objects** worth harvesting:

### 3a. AgentRecord (the register entry)
- Fields disclosed: `owner` (named human, mandatory — "100% of agents with a named owner"), `platform`, `origin`, `configuration` (attached verbatim), `tools[]`, `data_reach`, `last_activity`.
- Agent identity criterion (their "minimum viable definition"): **an LLM reasoning core plus at least one tool connection**. That is the discovery predicate: no tool connection, no agent.

### 3b. CapabilityMap (the tool/permission map)
- Per agent, the set of everything it can reach: every function, MCP server, API, **skills, extensions, plug-ins**, knowledge sources, system prompts, models, sub-tools.
- Critical mechanism disclosed: **skills are discovered by reading the agent's own configuration natively, not by intercepting traffic** — because skills live inside the agent's context and generate no outbound traffic a gateway can see. This is the "agent-out" vantage: configuration-reading beats boundary-sniffing. MCP gateways "govern access, not agent behavior across workflows"; Geordie claims to "read the configuration, so skills appear natively."

### 3c. BehaviorRecord (the behavioral record)
- "A continuous, auditable record of every **prompt, plan, response, and tool invocation**" per agent.
- Two operations over it: **behavioral baselining** and **anomaly detection** (drift from baseline), plus **configuration drift tracking** ("pr-review-agent gained repository write access" → severity Medium/High). Scores "move when the configuration moves, not on a quarterly review cycle."
- Normalization: heterogeneous sources (endpoint telemetry, Claude Compliance API conversations/files/projects/audit events) normalized into "a unified behavioural picture" — same schema regardless of source.

### 3d. RiskAssessment (their proprietary layer — DO NOT HARVEST)
- Inputs disclosed: data sensitivity, action reversibility (weighted — "a write that cannot be undone outranks a read"), reach breadth, human oversight, regulatory exposure, department/data classification as first-class inputs ("Two identical agents in different departments get different answers").
- This is a proprietary, non-deterministic scoring model. PING does not need it; PING's capability-kernel already does allow/deny. **REJECT this component.**

## 4. ID scheme
- Not disclosed. No identifier scheme is published anywhere in the materials read.
- Clean-room choice consistent with PING semantics: `agent_id = digest(configuration canonical bytes)` — the agent's identity is its configuration fingerprint. Rationale: Geordie's whole posture model is configuration-driven (drift detection = config change detection), so config-digest identity makes drift a first-class ID transition (old agent → new agent on material config change). This is our invention, not theirs.

## 5. State transitions
Disclosed transitions (behavioral layer, not a formal state machine):
- `DISCOVERED` → `REGISTERED` (with owner attached; "every discovered agent arrives with an owner, an origin and a configuration attached")
- `REGISTERED` → `DRIFT_DETECTED` (configuration change: new skill, widened permission, copied configuration)
- `DRIFT_DETECTED` → `SEVERITY_CROSSED` (7 agents "crossed a severity threshold" this week, on their dashboard)
- Intervention paths under Beam: `STEERED` (context/policy injected, agent keeps running) or `ADVISORY` (human-in-the-loop mitigation surfaced)

No transitions published for deletion/revocation of an agent registration; revocation model is undisclosed (gap noted below).

## 6. Authority boundary
- **What observes:** agent-out sensors (endpoint agent, cloud config readers, code scanners, Compliance API poller) — "inside the execution environment, across cloud, code and endpoint." Positioned *next to identity, not inside it*: "Attribution sits next to identity rather than inside it."
- **What decides:** the behavioral layer (risk engine + Beam). This is their authority: behavioral telemetry → deterministic policy decision.
- **What enforces:** Beam, "at the endpoint layer" — inline, inside the agent's execution path, explicitly *not* a proxy/gateway ("without gateway latency").
- PING-mapped boundary: observation (event-kernel events) → decision (capability-kernel) → effect (deterministic intervention contract). The lesson is architectural: **governance that sits inside the execution environment observing decisions is not the same as a boundary proxy; and steering (context injection) is not the same as gating (allow/deny).**

## 7. Persistence semantics
Not disclosed for their platform internals. From disclosed behavior:
- The register is **continuously current** ("stays current without anyone having to fill in a form") — a projection rebuilt from live reads, not a manually maintained record.
- The behavioral record is **append-only by description** ("continuous, auditable record") — we treat this as the requirement: the behavior log must be append-only so baselining/anomaly detection cannot silently rewrite history.
- Clean-room PING mapping: BehaviorRecord lives on the event-kernel as an append-only stream; AgentRecord/CapabilityMap are projection-kernel views over the stream plus config reads.

## 8. Evidence / receipts
- What they claim: "clear logs for any board or security audit"; findings "map to OWASP, NIST, ISO42001, the EU AI Act, and AIUC-1"; posture changes listed as a dated ledger ("posture changes, last 7 days").
- No disclosed evidence digest/signature scheme. Nothing to adopt.
- For PING: every harvested record must carry source + timestamp + config digest (the trust-kernel evidence binding they lack).

## 9. Deterministic intervention — what it is mechanically (the core extraction)
"Deterministic intervention" at Geordie = **Beam**. From the official disclosures, mechanically it is:
1. **Observe:** continuous behavioral trace (what the agent is trying to do, what it has already done, its environment).
2. **Deterministically assess:** "Beam deterministically assesses the appropriate context and security policies to provide back to the agent" — a **deterministic function** of (agent configuration + behavioral state + policy) → (context/policy fragment), *not* fixed rules, and *not* an LLM judgment call.
3. **Inject, don't kill:** the output is **context engineering** — the assessed policies are provided *back to the agent's own context* so it steers itself back into compliance. "Prevents system exploits without forcing security teams to shut down the underlying AI tool entirely." Enforcement runs "at the endpoint layer," inline with the agent, not as a gateway proxy adding latency.
4. **Advisory fallback:** alongside real-time steering, "advisory mitigations for teams who want human oversight in the loop."

So: intervention ≠ kill/pause. Intervention = **deterministic policy-context injection into the agent's working context at runtime, computed from its behavioral trace and capability map.** This is the novel primitive: PING's capability-kernel does allow/deny at dispatch; Geordie proves the value of a third mode — **STEER** — where the governance layer deterministically computes and injects the constraint context the agent needs to self-correct, and the agent keeps executing.

## 10. Retries / failures
Not disclosed. No failure semantics published (what happens when Beam injection fails, when a sensor drops, when the behavioral stream lags). **Gap:** any PING implementation must define STEER-failure semantics fail-closed (a failed intervention must not degrade to ungoverned execution).

## 11. Revocation model
Not disclosed. No published mechanism for revoking an agent registration, invalidating a BehaviorRecord, or withdrawing a delegated tool permission. **Gap:** PING's version must include explicit revocation (capability-kernel constraints already support time bounds; the AgentRecord needs a REVOKED terminal state).

## 12. Tests
None published. No test artifacts disclosed. All proof of behavior is vendor case study (Owkin, Forge Holiday Group) and press coverage — treated as marketing claims, not evidence. The harvest therefore rests only on the *mechanism shapes* disclosed in official product materials, not on any verified performance claim.

## 13. Verdict: ADAPT — with explicit REJECT sub-parts

- **ADAPT** (mechanism → PING semantics, clean-room):
  1. **AgentRecord** — identity = config digest; mandatory named owner; origin + verbatim config attached. → object-kernel.
  2. **CapabilityMap** — per-agent set of reachable functions/MCP servers/APIs/skills/extensions/knowledge sources, discovered by **reading agent configuration natively** (the skill blind-spot lesson: config-read beats traffic-sniff). → capability-kernel input.
  3. **BehaviorRecord** — append-only stream of (prompt, plan, response, tool invocation) per agent; normalized across sources; supports baselining + drift detection. → event-kernel.
  4. **Deterministic steer contract** — `steer(agent_record, behavioral_state, policy) → context_fragment | ADVISORY | DENY`, deterministic, injected into the agent's context at runtime rather than killing the agent. This is the harvested novelty. → capability-kernel.
- **REJECT**:
  - The proprietary risk model/scoring (non-deterministic, proprietary, unneeded — PING has capability allow/deny).
  - All marketing performance claims (327% discovery uplift, $12-13M averted risk) — unverifiable vendor case studies, not harvestable.
  - Any notion of adopting their platform (closed SaaS; nothing to adopt).

## 14. SMALLEST MISSING PRIMITIVE

**`deterministic_steer(agent_id, behavioral_state) → context_fragment` — a deterministic policy-injection primitive on the capability-kernel.**

Why this is the smallest and why it is missing: PING's capability-kernel today answers {actor, target, action, constraints} with ALLOW/DENY. It has no STEER: no mechanism by which the governance layer deterministically computes a constraint-context and injects it into a running agent's context so the agent self-corrects without being killed. Geordie's entire Beam product is evidence that STEER (deterministic assessment → context back to the agent) is the operationally valuable intervention mode — it preserves mission continuity while enforcing policy, which is exactly what proofs 10-14 (worker returns result; bad result rejected; verification independent) need when a worker goes off-rails: you don't want to just kill the mission, you want to deterministically constrain-and-continue or fail-closed with evidence.

Signature sketch (clean-room, PING semantics):
```
steer(agent_id: digest, trace: [BehaviorEvent], policy: Policy) ->
    INJECT(context_fragment)   # deterministic from (trace, policy)
  | ESCALATE(advisory)         # human-in-the-loop
  | DENY(reason)               # fail-closed
```
Determinism requirement: same (config digest, trace prefix, policy version) → same output, always. The BehaviorRecord append-only stream and the CapabilityMap are its inputs; both are independently useful, but the steer function is the primitive PING lacks.

## 15. Dependency analysis
- **Zero dependencies.** This proposal introduces no libraries, no SDKs, no services. The mechanism is re-derived; the Claude Compliance API ingestion and endpoint sensors described by Geordie are *their* implementation detail — PING's equivalent is its own event-kernel streams and config readers, already in-house.
- DEPENDENCIES: []. DEPENDENCY_COST: zero.

## 16. License finding
- **Geordie AI: proprietary, closed source. No public license. No code harvested.** Nothing in this proposal is derived from Geordie source code (none is public). All mechanism descriptions are clean-room re-derivations from public official product/marketing disclosures. **No GPL/copyleft/SSPL/BSL material involved; no license decision required from Nolan.** If Nolan later wants deeper detail, it would require a commercial relationship with Geordie — not a harvest action.

## 17. proof_id mapping
- **proof 10** (worker returns result): BehaviorRecord is the append-only trace that a worker *did* return a result and what it did along the way.
- **proof 11** (injected bad result is rejected): behavioral baselining + anomaly detection over the BehaviorRecord is the mechanism that flags the injected bad result; the deterministic steer contract gives DENY/ESCALATE its deterministic teeth.
- **proof 13** (mission VERIFIED only after independent verification): the behavioral layer is *independent* of the worker's own claims ("attribution sits next to identity rather than inside it") — verification reads the BehaviorRecord, not the worker's self-report.
- Proofs 1-9 (FYD website loop) are not served by this harvest; this is a mission-infrastructure primitive.

## 18. Open questions / risks for the coordinator
1. Geordie discloses no failure semantics for Beam (what happens when steering fails) — PING must define STEER-failure as fail-closed.
2. No revocation model disclosed — PING must add REVOKED as a terminal AgentRecord state.
3. Their "agentic fingerprinting" is undisclosed mechanism; the harvest substitutes config-digest identity, which is our own invention and needs its own proof (does config-digest stably identify an agent across benign restarts?).
4. Owner-attribution ("named human accountable") is a governance requirement, not a mechanism; PING missions already have owners — map agent owner to mission owner.
