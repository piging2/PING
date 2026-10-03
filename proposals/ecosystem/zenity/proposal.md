# Harvest Proposal: Zenity (Agent Governance/Security)

**Status:** Harvest worker deliverable — DO NOT COMMIT (coordinator commits).
**Date:** 2026-10-02
**Authority owner:** capability-kernel
**Verdict:** ADAPT (mechanism only, clean-room re-derived; platform itself REJECTED)

> Zenity is closed-source proprietary SaaS (no public repo, no source license).
> Everything below is re-derived from official public docs. NO proprietary code
> was copied or reconstructed.

---

## 1. What was read (primary sources only)

| # | URL | Read on | Content |
|---|-----|---------|---------|
| 1 | https://zenity.io/platform | 2026-10-02 | Surface/Enforce/Protect layer model; AI Observability, AISPM, AI Exposure Management |
| 2 | https://zenity.io/platform/runtime-boundaries | 2026-10-02 | Boundaries enforcement engine: allow/block/shut-down decisions; policy authoring; conflict detection; session-chained evaluation inputs |
| 3 | https://zenity.io/platform/ai-security-posture-management | 2026-10-02 | AISPM posture layer: discovery, per-agent config/permission/tool-access, ownership ties |
| 4 | https://zenity.io/blog/securing-the-ai-that-runs-the-enterprise-zenity-servicenow-secops | 2026-10-02 | Per-agent inventory field list; AISPM finding classes; drift detection; risk scoring |
| 5 | https://zenity.io/platform/agentic-identity-and-access-management | 2026-10-02 | Agentic Identity: identity/data/behavior/posture/environment signal correlation |
| 6 | https://zenity.io/use-cases/agent-type/home-grown | 2026-10-02 | Runtime controls on cloud/homegrown agents; credential-correlation; exposure→runtime loop |
| 7 | https://zenity.io/company-overview/newsroom/company-news/zenity-extends-ai-agent-security-and-governance-to-claude-enterprise | 2026-10-02 | Remediation primitives: click-to-fix delete of risky agents/files/conversations |
| 8 | https://www.businesswire.com/news/home/20260727514033/en/Zenity-Introduces-the-Industrys-First-AI-Security-Platform-for-Autonomous-Agents | 2026-10-02 | Surface/Enforce/Protect continuous loop; proceed/block/terminate; DFIR + Guardian Agents learning loop |

Source bundle (exact excerpts, concatenated): `sha256:6f9cd8d26a3003c8c4c5d9156fea994f138b07fe37935106ad03afeafebbc5b3`
over `/tmp/zenity-src/source-bundle.txt` (all 8 sources' quoted/paraphrased content, no code).

---

## 2. Object model (re-derived mechanism, not Zenity's code)

### AgentRecord (discovery)
Per discovered agent:
- `agent_id` — identity assigned at discovery (platform-internal; see ID scheme)
- `discovery_source` — how found: `saas-scan` (Copilot/ChatGPT Enterprise/Agentforce...), `framework-scan` (Foundry/Bedrock/homegrown), `endpoint-device-agent` (agentic browsers: Atlas, Comet, Dia), `shadow` (never signed off)
- `configuration` — the agent's declared config (topics, workflows, actions, prompt logic)
- `tool_access` — tools, APIs, integrations, external systems, MCP servers/plugins/skills
- `identity_bindings` — credentials: Okta/Entra identities, roles, hardcoded static keys found, non-human identities acting beyond the user
- `data_reach` — data sources and data flows touched (PII, financial, customer records)
- `ownership` — owner + related-resource ties

### PostureAssessment (posture model)
Computed per agent, pre-deployment AND continuously:
- `findings[]` — from a fixed finding taxonomy: excessive/misconfigured permissions, unsafe prompt logic or construction, data exposure risks, compliance gaps, broken or risky integrations, dependency and orchestration weaknesses, misconfigurations and drift
- `risk_score` — scalar prioritization; exposure-validated (AI Exposure Management distinguishes theoretically risky vs actually exploitable attack paths)
- `drift` — config/permissions changes since last approved snapshot
- assessed_at, assessment_version

### RuntimeBoundaryPolicy (policy attachment)
- Rule library: prebuilt snippets (e.g., "block confidential project by name", "gate agent identity") + plain-language authoring compiled to a rule
- Conflict detection at rule-activation time: flags duplicate/contradictory rules before they go live
- Attachment point: decision layer of the agent execution path; one rule set enforced across all platforms

### RuntimeDecision (runtime controls)
Per agent action, the engine evaluates a decision tuple:
- inputs: `intent`, `identity` (who is acting), `on_behalf_of` (who the agent acts for — Agentic Identity), `requested_action`, `accessed_data`, `tools`, `session_history` (prior steps in this execution), `enterprise_policy`
- output: exactly one of `ALLOW` | `BLOCK` | `TERMINATE` (shut the agent down)
- session-chaining: decisions consider earlier steps; individually-benign steps in sequence can trigger BLOCK/TERMINATE

### RemediationAction (runtime controls, post-violation)
- Inline prevention in the execution path (Foundry native integration)
- Click-to-fix: `delete-agent`, `delete-file`, `delete-conversation`
- ServiceNow SecOps integration: vulnerability workflows remediate high-risk exposures
- Protect loop: DFIR decision-chain reconstruction + Guardian Agents learn from investigations to sharpen future policy decisions (feedback: exposure → runtime decisions → investigations → policy)

---

## 3. ID scheme
Zenity does not document a public ID scheme (closed platform). Discovery assigns
platform-internal agent records; identity correlation uses the customer's
existing IdP identities (Okta/Entra). For piging2 purposes, agent identity is
implicit, not a specified scheme — worth noting as a gap, not a primitive to copy.

## 4. State transitions

**Agent lifecycle:** `discovered` → `inventoried` (config/permissions/tools captured) →
`posture-assessed` (risk scored, findings) → `live` (under continuous posture +
Runtime Boundaries) → `blocked`/`terminated` (runtime violation) or
`remediated` (click-to-fix / SecOps workflow) → back to `posture-assessed`.

**Per-action runtime:** `proposed_action` → `evaluated(decision tuple)` →
`ALLOW` (proceed) | `BLOCK` (action denied, agent continues) | `TERMINATE`
(agent shut down).

**Policy lifecycle:** `drafted` (plain-language or snippet) → `conflict-checked`
(duplicates/contradictions flagged) → `active` (enforced everywhere) →
`sharpened` (Guardian-Agent learning from DFIR investigations).

**Posture lifecycle:** continuous re-assessment; drift from approved snapshot
generates findings; exposure validation re-scores exploitable paths.

## 5. Authority boundary
Enforcement sits **at the decision layer inside the agent execution path** —
not at the network edge, not at pre-deployment config review. Policy is authored
by the enterprise security team (or their plain-language intent), evaluated by
Zenity's engine, but execution remains the agent platform's (Foundry/Copilot/
Agentforce). Zenity can *deny* or *terminate*; it does not itself perform the
agent's work. Authority boundary: Zenity owns the allow/block/terminate
verdict; the underlying platform owns execution and identity issuance (Okta/
Entra). This maps cleanly to PING's capability-kernel: capability evaluation
owns the verdict, workers own execution.

## 6. Persistence semantics
Not publicly specified (closed SaaS). Observable behavior implies: durable agent
inventory with config snapshots (drift detection requires before/after),
append-only-ish audit trail (regulatory traceability: who interacted with which
agent, what data exchanged, what downstream tools invoked), posture finding
history. **No documented cryptographic receipts** — third-party technical
comparison (github.com/sanjaynandanj/custos docs/COMPETITIVE.md, 2026-09) notes
for Zenity's MCP security: "No public OSS/self-hosted runtime or documented
signed audit chain / offline verifier found." Their audit value is
traceability + decision-chain reconstruction, NOT signed evidence.

## 7. Evidence/receipts
- Audit trail: user↔agent interactions, data exchanged, downstream tool
  invocations — built for regulators
- Decision-chain reconstruction in DFIR when something gets through
- Issues intelligence layer: correlates posture findings + runtime anomalies +
  identity relationships + graph insights into incident narratives
- **Gap (PING's opportunity): no signed, offline-verifiable receipts.** PING's
  trust-kernel (digests, signatures) can do strictly better than Zenity here.

## 8. Retries/failures
Not documented as a primitive. Failure model is enforcement-centric: when a
decision cannot be safely allowed, it is blocked or the agent terminated —
fail-closed at the decision point, not retried. Remediation is a separate
workflow (click-to-fix, SecOps), not an automatic retry of the action.

## 9. Revocation model
- Runtime: BLOCK (single action) and TERMINATE (kill the agent/session)
- Administrative: delete risky agent / file / conversation
- Credential-correlated: deactivated or over-scoped role caught before
  exploitation via Agentic Identity correlation
- No documented key/certificate revocation protocol; revocation is by
  enforcement verdict and deletion, not by cryptographic means

## 10. Tests
None available (closed-source, no public test suite). Validation is by vendor
claim + analyst recognition (Gartner "Company to Beat" in AI Agent Governance,
per LinkedIn company profile). Treat all behavior claims as vendor-described,
not independently verified.

---

## 11. Verdict: ADAPT (mechanism) / REJECT (platform)

- **REJECT the platform**: closed-source, proprietary, no license, no source,
  no tests, no signed receipts. Nothing to adopt as-is.
- **ADAPT the mechanism**: three re-derivable ideas worth taking into PING
  semantics —
  1. **Decision-layer enforcement inputs**: the decision tuple
     (intent, identity, on_behalf_of, action, data, tools, session_history,
     policy) is a stronger capability-evaluation context than PING's current
     actor/target/action/constraints. In particular `on_behalf_of` (who the
     agent acts FOR, distinct from who it IS) and `session_history` (chained
     steps) are missing from PING's capability evaluation.
  2. **Posture continuity**: posture is not a one-time pre-check; drift from an
     approved snapshot continuously re-scores the agent, and exposure findings
     feed runtime decisions ("exposure informs runtime decisions").
  3. **Remediation as first-class transition**: BLOCK/TERMINATE plus
     delete/quarantine actions, distinct from the action outcome.

## 12. SMALLEST MISSING PRIMITIVE

**AgentPostureRecord** — a canonical, versioned per-agent posture object in the
capability-kernel that PING does not have:

```
AgentPosture {
  agent_id,                       // stable agent identity (WorkerRuntime id)
  discovered_via,                 // provenance of the agent's registration
  approved_snapshot_digest,       // digest of the capability/constraint set
                                  // the owner approved (trust-kernel digest)
  posture_version,                // increments on every re-assessment
  risk_score,                     // scalar, recomputed on drift/new findings
  findings[],                     // typed: PERMISSION_DRIFT, UNSAFE_TOOL,
                                  // DATA_EXPOSURE, CREDENTIAL_SCOPE, ...
  session_history_digest,         // rolling digest of recent evaluated actions
  last_assessed,
}
```

Why this is the smallest valuable thing: PING's capability-kernel evaluates
actor/target/action/constraints at decision time, but it has **no persistent
per-agent posture state** that (a) records what was approved, (b) detects drift
from it, (c) accumulates findings across runs, and (d) binds the decision-time
posture into the intent record via digest so independent verification (proof 13)
can replay "was this agent in good posture when it acted?" Zenity proves the
value of the posture→runtime loop; PING can implement it better because its
trust-kernel gives the one thing Zenity lacks: the approved-snapshot digest is
**signed**, making posture drift cryptographically detectable rather than
dashboard-detectable. Zero new stores needed: it is an object-kernel object
with event-kernel transitions, evaluated by capability-kernel, digested by
trust-kernel. That cross-kernel binding is exactly what "exposure informs
runtime decisions" means, made replayable.

This primitive directly serves proofs 9–14 (mission agent oversight): mission
creation (9) stamps the worker's posture digest into the intent; a bad result
(11) or failed verification (13) writes a finding and re-scores the agent;
fallback (12) re-checks posture before re-dispatch.

## 13. Dependency analysis
- Dependencies: **none**. Mechanism re-derived from public docs; zero code taken.
- DEPENDENCY_COST: **zero**.
- Every concept maps to an existing or proposed PING kernel; no third-party
  library, SDK, or service required.

## 14. License finding
- Zenity platform: **closed-source proprietary SaaS**. No public repository,
  no open license, no source available. Company founded 2021, privately held,
  New York (per LinkedIn company profile).
- Nothing was copied: the harvest is mechanism-only, clean-room, from public
  documentation. **No GPL/copyleft/SSPL/BSL material involved** — there is no
  licensed code at all.
- FLAG for Nolan: if PING ever wants the actual Zenity product behavior
  (inline Foundry/Bedrock enforcement), that is a commercial procurement
  decision, not a harvest. This proposal imports only re-derived mechanism
  shapes into PING-owned code.

## 15. Proof mapping
- proof_ids: **[9, 10, 11, 13]**
  - 9 (create one mission): mission intent stamps worker's posture digest
  - 10 (worker returns result): result bound to posture-version at dispatch
  - 11 (injected bad result rejected): bad result → posture finding + re-score
  - 13 (VERIFIED only after independent verification): verifier replays
    posture-at-dispatch via the stamped digest
- 12 and 14 are served indirectly (posture re-check before fallback; replay
  includes posture transitions) but the primitive is not required for them.
- No proof_id → REJECT applied: the Zenity platform itself and its
  vendor-specific integrations (Foundry/Copilot/Agentforce) are REJECTED (no
  proof needs them; closed-source anyway).

## 16. Recommendation to coordinator
Implement **AgentPostureRecord** as an object-kernel object with:
- registration transition (discovery provenance + approved capability snapshot)
- reassessment transitions (findings appended, version incremented, digest by
  trust-kernel)
- capability-kernel evaluation rule: dispatch requires
  `posture_digest == approved_snapshot_digest` OR a recorded, owner-approved
  reassessment; drift = fail closed (UNKNOWN posture → do not dispatch)
- runtime: every evaluated action updates `session_history_digest`; findings
  from verification failures (proof 11/13) feed re-scoring

Estimated shape: one object schema + one evaluation rule + two event
transitions. No new kernel, no new store, no dependencies.
