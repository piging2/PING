# PING Agent Network

**Document Purpose:** Explain where PING is going.

**Status:** Canonical Architecture Document

**Date:** 2026-09-12

---

## Executive Summary

PING starts as an automation business for home-service businesses but is architected to become an agent-driven operational network. The architecture connects deep infrastructure to practical business outcomes: fewer missed leads, fewer interruptions, reliable customer information capture, less administrative work, faster follow-up, better operational memory, and systems that do not silently fail.

The agent network is a trajectory, not a completed product. PING Social is a possible client-facing application that strengthens owners and workers rather than replacing their judgment.

---

## Current State vs Future Trajectory

### Current State

**Implemented:**
- Constitutional law foundation (Canonicalization Law, Hash Law, Lineage Law, Policy Law)
- Live event spine (UnifiedEventRuntime in curious-squid)
- Exterior-agent capability boundary (gateway with filesystem and Git authorities)
- Proposal/consensus/merge/replay/witness infrastructure (calm-garden)
- Partial projection sovereignty (Qdrant verification in /constitution/search)
- Partial authority consolidation (Identity Authority, CanonicalHash Authority)
- Business event types (LEAD_CREATED, ESTIMATE_CREATED, INVOICE_CREATED, PROJECT_CREATED, REVIEW_RECEIVED)
- Customer data table with Gmail/Calendar sync
- Project authority with hpp_projects table
- Review authority with Google sync

**Audited but not yet consolidated:**
- Multiple event construction paths (6 violations)
- Multiple hashing mechanisms (P0-1 violation)
- Multiple authority classification schemes (3 competing schemes)
- Divergent constitutional documents (constitution/ vs vault/laws/)
- Runtime nondeterminism sources (JSON dumps, os.listdir, wall clock)

**Missing business capabilities (from opportunity audit):**
- Lead capture intake forms, landing pages, web-to-lead
- Lead scoring and qualification
- Follow-up automation and drip campaigns
- Scheduling and calendar system
- Dispatch board and GPS tracking
- Estimate builder and proposal templates
- Invoice builder and payment processing
- Job costing and financial reporting
- Customer portal
- Mobile app for field workers
- Pricebook management
- Time and expense tracking

**Planned:**
- Infrastructure consolidation (infra/ directory, single docker-compose.yml)
- Event schema consolidation (single canonical event envelope)
- Authority consolidation (migration to canonical authorities)
- Deterministic replay kernel integration with live event spine
- Full projection sovereignty enforcement (ContextPack mandatory)
- Policy-scoped execution capabilities (test.run, build.run, command.run)
- Cross-worktree integration (curious-squid + calm-garden)

**Unknown:**
- WSL2 migration completion date
- Infrastructure consolidation timeline
- Full authority consolidation timeline

---

## Future Trajectory

### Phase 1: Automation Platform

PING becomes a complete field service management and business automation platform for home-service businesses.

**Capabilities:**
- Lead capture and qualification
- Scheduling and dispatch
- Estimate and proposal generation
- Invoicing and payment processing
- Job costing and financial reporting
- Customer portal and communication
- Mobile app for field workers
- Time and expense tracking
- Review management and reputation building

**Constitutional foundation:**
- All business records as immutable events
- Deterministic replay of any past state
- Cryptographic evidence of execution
- Lineage tracking of all business entities
- Projection sovereignty for all dashboards and reports

---

### Phase 2: AI Concierge

AI agents assist owners and workers with daily operations while keeping judgment with humans.

**Capabilities:**
- AI call answering for lead capture
- AI follow-up sequences for lead nurturing
- AI review request automation
- AI-powered estimate assistance
- AI scheduling suggestions
- AI job costing analysis
- AI customer communication assistance

**Constitutional control:**
- AI outputs tagged as REASONING_ARTIFACT with _verified: false
- Unverified AI outputs blocked from business records
- AI must pass verification gates before affecting business state
- AI execution bounded by fail-closed capability boundaries
- Human owner approval required for high-impact decisions

---

### Phase 3: Agent Orchestration

Multiple specialized agents coordinate to automate complex workflows.

**Capabilities:**
- Lead capture agent (web forms, phone intake, chat-to-lead)
- Lead qualification agent (scoring, BANT analysis, ranking)
- Follow-up agent (drip campaigns, re-engagement, seasonal triggers)
- Scheduling agent (calendar sync, appointment reminders, route optimization)
- Dispatch agent (GPS tracking, ETA calculation, automated assignment)
- Estimating agent (material/labor costing, margin calculation, change orders)
- Invoicing agent (line-item generation, progress billing, payment reminders)
- Review agent (auto-request, response templates, sentiment analysis)

**Constitutional control:**
- Event-driven agent execution (all actions produce events)
- Agent coordination through canonical event spine
- Agent lifecycle managed by event-sourced registry
- Human authorization gates for critical workflows
- Witness generation for all agent decisions

---

### Phase 4: Autonomous Lead Capture and Follow-Up

Agents autonomously capture and nurture leads while maintaining human oversight.

**Capabilities:**
- Autonomous web-to-lead capture
- Autonomous phone intake and AI answering
- Autonomous lead scoring and qualification
- Autonomous follow-up sequences
- Autonomous lost-lead recovery
- Autonomous seasonal campaign triggers

**Constitutional control:**
- All lead events verified against canonical source
- Lead attribution tracked through lineage
- AI decisions replayable for audit
- Human owner can override any autonomous decision
- Evidence ledger tracks all autonomous actions

---

### Phase 5: Decentralized Advertising

Agents manage advertising campaigns across channels with ROI tracking.

**Capabilities:**
- Multi-channel campaign management (email, SMS, direct mail)
- Budget tracking and optimization
- A/B testing and performance analysis
- Lead source attribution (UTM tracking, call tracking)
- ROI by channel analysis

**Constitutional control:**
- Campaign spend as immutable events
- Attribution analysis through lineage
- ROI calculations replayable for verification
- Human owner sets budget constraints
- Agent recommendations require approval

---

### Phase 6: Service-Business Network Effects

Successful interactions become reusable operational knowledge across the network.

**Capabilities:**
- Operational memory shared across businesses
- Best practices extracted from successful jobs
- Failure patterns identified and avoided
- Pricing intelligence from similar jobs
- Technician performance benchmarking

**Constitutional control:**
- Knowledge derived from verified events only
- Projection sovereignty prevents confusion between acceleration and truth
- Businesses control what they share
- Human-in-the-loop for knowledge adoption
- Evidence ledger tracks knowledge provenance

---

### Phase 7: Advertisers to Businesses to Agents

Three-sided marketplace emerges.

**Advertisers:**
- Promote services to targeted business segments
- Pay for qualified leads or impressions
- Track ROI through attribution

**Businesses:**
- Receive qualified leads from advertisers
- Use agents to manage lead workflows
- Share operational knowledge in exchange for benefits

**Agents:**
- Coordinate advertiser-to-business lead flow
- Automate lead qualification and routing
- Provide operational intelligence to businesses

**Constitutional control:**
- All marketplace transactions as events
- Attribution tracked through lineage
- Financial records replayable for audit
- Each participant controls their data
- Regulatory compliance through evidence generation

---

## Reputation and Evidence

### Reputation System

Reputation becomes evidence-based rather than claim-based.

**Capabilities:**
- Reviews backed by job evidence (photos, timestamps, materials)
- Technician reputation derived from verified job outcomes
- Business reputation derived from customer satisfaction data
- Marketplace reputation derived from transaction evidence

**Constitutional control:**
- Reputation derived from verified events only
- Evidence ledger supports reputation claims
- Fake reviews prevented through event verification
- Reputation manipulation detected through lineage analysis

---

### Evidence Ledger

All business decisions backed by cryptographic evidence.

**Capabilities:**
- Every decision has an event trail
- Every claim has supporting evidence
- Every audit produces a witness
- Every dispute resolved with data

**Constitutional control:**
- Evidence generation automatic for all events
- Witness roots cryptographically signed
- Evidence ledger append-only
- Replay verifies evidence integrity

---

## Operational Memory

### Individual Business Memory

Each business accumulates operational memory over time.

**Capabilities:**
- Job history with full context
- Customer interaction timeline
- Technician performance data
- Pricing intelligence by job type
- Failure pattern analysis

**Constitutional control:**
- Memory derived from verified events only
- Memory reconstruction through replay
- Memory searchable through verified projections
- Memory exportable for business continuity

---

### Network-Wide Memory

Aggregated operational memory shared across the network.

**Capabilities:**
- Industry benchmarks for job types
- Regional pricing intelligence
- Best practices from successful businesses
- Failure patterns to avoid
- Technician performance distribution

**Constitutional control:**
- Aggregation requires explicit business consent
- Network memory derived from verified events only
- Privacy preserved through projection sovereignty
- Businesses control what they contribute
- Network recommendations are advisory, not authoritative

---

## Individual Automation to Multi-Business Network to Agent Economy

### Individual Automation

**Current trajectory:** Single business automation platform.

**Value:** Reduce administrative overhead, improve operational efficiency, capture lost information.

**Constitutional foundation:** Deterministic state, replay verification, evidence generation.

---

### Multi-Business Network

**Future trajectory:** Multiple businesses sharing operational intelligence.

**Value:** Benchmarking, best practices, pricing intelligence, failure pattern avoidance.

**Constitutional control:** Consent-based sharing, projection sovereignty, privacy preservation.

---

### Agent Economy

**Long-term trajectory:** Agents operate as economic participants in the marketplace.

**Value:** Autonomous lead capture, intelligent dispatch, optimized pricing, automated compliance.

**Constitutional control:** Agent decisions as events, human authorization gates, evidence-based reputation, regulatory compliance through audit trails.

---

## PING Social

### Possible Client-Facing Application

PING Social is a possible client-facing application that demonstrates the agent network trajectory.

**Planned capabilities:**
- AI concierge for lead capture and follow-up
- AI scheduling assistance
- AI review management
- Customer portal for self-service
- Operational memory dashboard

**PING Social does NOT:**
- Replace owner judgment
- Replace worker judgment
- Pretend to have perfect knowledge
- Make autonomous decisions without oversight
- Hide errors or failures

**PING Social DOES:**
- Capture customer information reliably
- Preserve evidence of all interactions
- Provide operational memory
- Enable faster follow-up
- Reduce administrative friction
- Strengthen owner and worker judgment with evidence
- Fail visibly and auditably
- Replay interactions for verification and training

The client buys trustworthy operations, not "constitutional architecture." The architecture is the means to the end.

---

## Human/Owner/Trade-Professional Control

### Control Principles

Human control is preserved throughout the agent network trajectory.

**Principles:**
- Owners approve high-impact decisions
- Workers can override agent recommendations
- Human-in-the-loop for critical workflows
- Humans set policy boundaries
- Humans control data sharing

**Constitutional enforcement:**
- Policy Authority defines human authorization gates
- Event Authority records all human decisions
- Replay verifies human control was exercised
- Evidence Ledger proves human involvement

---

## What PING Does NOT Claim to Have Built Yet

**NOT yet built:**
- Complete lead capture system (no intake forms, no landing pages, no web-to-lead)
- Scheduling and dispatch system (no calendar, no dispatch board, no GPS tracking)
- Estimate and proposal builder (no professional templates, no line-item estimates)
- Invoice and payment processing (no invoice builder, no payment gateway)
- Job costing and financial reporting (no cost aggregation, no P&L reports)
- Customer portal (no customer-facing UI)
- Mobile app for field workers (no mobile application)
- Pricebook management (no material cost database, no labor rate calculator)
- Time and expense tracking (no clock-in/out, no expense logging)
- AI concierge (no AI call answering, no AI follow-up)
- Agent orchestration (no multi-agent coordination)
- Autonomous lead capture (no autonomous intake)
- Decentralized advertising (no campaign management)
- Service-business network effects (no network-wide memory)
- Agent economy (no marketplace)

**Current reality:** PING has constitutional infrastructure, partial business event types, and validated architectural components. Business capabilities are planned, not implemented.

---

## Roadmap Through May 2027

### Current Capabilities (September 2026)

**Shipped:**
- Constitutional law foundation (4 frozen laws)
- Live event spine (curious-squid)
- Exterior-agent capability boundary (filesystem and Git authorities)
- Proposal/consensus/merge/replay/witness infrastructure (calm-garden)
- Partial projection sovereignty (verification in /constitution/search)

**Implemented:**
- Identity Authority (partial)
- CanonicalHash Authority (partial)
- Event Authority (partial, violations exist)
- Projection Authority (partial)
- Business event types (LEAD_CREATED, ESTIMATE_CREATED, INVOICE_CREATED, PROJECT_CREATED, REVIEW_RECEIVED)
- Customer data table with Gmail/Calendar sync
- Project authority with hpp_projects table
- Review authority with Google sync

**Audited:**
- Duplicate systems identified
- Authority violations documented
- Nondeterminism sources documented
- Constitutional repository audit complete (257 documents, 3 competing schemes)
- Business opportunity audit complete (comprehensive gap analysis across sales, marketing, operations, finance, customer success, field service, recruiting, training)

**Validated:**
- Exterior-agent MVP (filesystem and Git capabilities verified)
- Qdrant → Postgres verification (5/5 constitutional docs verified)
- Authority resolution (CONSTITUTIONAL_LAW classification working)

**In progress:**
- Infrastructure consolidation (infra/ directory planning)
- Event schema consolidation
- Authority consolidation migration
- Cross-worktree integration planning

**Planned:**
- Full projection sovereignty enforcement (PATCH-009: ContextPack mandatory)
- Deterministic replay kernel integration
- Policy-scoped execution capabilities
- Single production entrypoint
- Canonical IR definition
- Observation queue freeze
- Drive canonicalization

**Unknown:**
- WSL2 migration completion
- Infrastructure consolidation timeline
- Full authority consolidation timeline

---

### Near-Term Engineering (October 2026 - December 2026)

**Planned priorities:**
1. Infrastructure consolidation (infra/ directory, single docker-compose.yml)
2. Event schema consolidation (single canonical event envelope)
3. Authority consolidation migration (6 files to canonical event authority)
4. Hashing authority specification and patching (P0-1 violation)
5. Nondeterminism fixes (PATCH-010: JSON dumps, os.listdir)
6. ContextPack mandatory enforcement (PATCH-009)

**Expected outcomes:**
- Single canonical infrastructure stack
- Single canonical event envelope
- All events route through canonical event authority
- All hashes route through canonical hash authority
- Projections fully verified against canonical source
- Reduced architectural entropy

---

### Business Capability Development (January 2027 - March 2027)

**Planned priorities:**
1. Lead capture system (intake forms, landing pages, web-to-lead)
2. Scheduling and calendar system
3. Estimate builder and proposal templates
4. Invoice builder and payment processing
5. Policy-scoped execution capabilities (test.run, build.run, command.run)
6. Exterior-agent workspace isolation production hardening
7. Cross-worktree integration (curious-squid + calm-garden)
8. Deterministic replay kernel integration with live event spine

**Expected outcomes:**
- Functional lead capture and qualification
- Basic scheduling and dispatch
- Estimate and invoice generation
- Governed execution capabilities
- Production-ready exterior-agent boundary
- Unified pipeline across worktrees
- Replay verification in production

---

### Agent Development (April 2027 - May 2027)

**Planned priorities:**
1. AI concierge for lead capture and follow-up
2. Multi-agent coordination infrastructure
3. Agent registry and lifecycle management
4. Human authorization gates
5. Proposal workflow implementation
6. Witness generation in production
7. Job costing and financial reporting
8. Customer portal

**Expected outcomes:**
- Governed multi-agent execution
- Event-sourced agent lifecycle
- Human-in-the-loop authorization
- Constitutional proposal workflow
- Cryptographic witness verification
- Basic job costing
- Customer self-service portal

---

### Longer-Term Architecture (Beyond May 2027)

**Planned priorities:**
1. Provider portability (infrastructure independence)
2. Constitutional compiler implementation
3. Authority graph validators
4. Signed snapshot format
5. Verification worker
6. Rust migration for replay/security/kernel
7. Go migration for infra/control plane
8. Mobile app for field workers
9. Dispatch board and GPS tracking
10. Time and expense tracking
11. Pricebook management
12. Review management automation
13. Network-wide operational memory
14. Decentralized advertising
15. Agent economy marketplace

**Expected outcomes:**
- Infrastructure independence
- Automated constitutional validation
- Signed constitutional snapshots
- Independent verification worker
- Performance-critical kernel in Rust
- Scalable control plane in Go
- Complete field service management platform
- Agent-driven operational network

**No claims about exact completion dates.** Roadmap uses milestone ranges and labels targets as planned.

---

## Technical Trajectory

### From Current State to Agent Network

**Current state:** Constitutional infrastructure with partial implementation, multiple worktrees, identified violations, audited gaps, business event types, partial business capabilities.

**Trajectory:** Consolidate authority → implement business capabilities → deploy AI concierge → orchestrate agents → build network effects → enable agent economy.

**Not:** Build autonomous agents → deploy to customers → figure out architecture later.

PING is building infrastructure first, business capabilities second, AI agents third, network effects fourth. This is the opposite of the typical AI agency approach.

---

## Business Trajectory

### From Infrastructure to Client Value

**Current state:** Constitutional infrastructure for deterministic, replayable, auditable cognition. Partial business event types and data structures.

**Trajectory:** Infrastructure → business capabilities → AI assistance → agent orchestration → network effects → agent economy.

**Business outcomes:**
- Fewer missed leads
- Fewer interruptions
- Reliable customer information capture
- Less administrative work
- Faster follow-up
- Better operational memory
- Clearer evidence of what happened
- Systems that do not silently fail

The client does not need to care about Qdrant, PostgreSQL, event sourcing, or constitutional law. The client cares about business outcomes. The architecture is the means to achieve those outcomes.

---

## Risk Mitigation

### Architectural Risks

**Risk:** Infrastructure consolidation fails or takes longer than expected.

**Mitigation:** AGENT.md mandates "REUSE BEFORE CREATE." Consolidation is planned with audit-based prioritization. WSL2 migration is controlled with rollback mirror.

**Risk:** Authority consolidation introduces bugs.

**Mitigation:** P0/P1 verification before patching. Constitutional specification required before changes. Rollback capability preserved.

**Risk:** Cross-worktree integration is complex.

**Mitigation:** Clear interface boundaries defined in CROSS_WORKTREE_PIPELINE_INTEGRATION_ANALYSIS.md. Integration is planned, not speculative.

**Risk:** Business capability development outpaces constitutional control.

**Mitigation:** Business capabilities built on constitutional event spine. All business operations produce events. Constitutional enforcement retrofitted where missing.

---

### Business Risks

**Risk:** Clients do not understand the value of constitutional infrastructure.

**Mitigation:** Position PING as strengthening owner and worker judgment, not replacing it. Focus on business outcomes, not architecture. Use concrete examples (missed leads, lost information, administrative work).

**Risk:** Timeline slips beyond May 2027.

**Mitigation:** Roadmap uses milestone ranges, not exact dates. Status clearly labeled as planned targets. No claims about completion dates.

**Risk:** Competitors copy the architecture.

**Mitigation:** The moat is implementation, not ideas. Constitutional law foundation, frozen specifications, and consolidated authorities are hard to replicate without the same audit discipline.

**Risk:** Home-service businesses resist new technology.

**Mitigation:** Focus on reducing administrative burden and capturing lost revenue. Position technology as strengthening owner control, not replacing workers.

---

## Cross-References

- See [PING_CONSTITUTIONAL_ARCHITECTURE.md](PING_CONSTITUTIONAL_ARCHITECTURE.md) for what is technically different about PING.
- See [PING_BUILD_JOURNEY.md](PING_BUILD_JOURNEY.md) for why Nolan is qualified to build this.
