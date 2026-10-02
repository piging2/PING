# Homepage Report: Truth Matrix + Homepage Work

Date: 2026-09-16 (MDT). Repo: `/home/nolan/projects/ping`, main at f6386ee. All work uncommitted, as required. No commits, no pushes, no deploys.

## TRACK O: Truth Matrix (done first)

Written to `~/workspace/ping-overnight/website/TRUTH_MATRIX.md` and mirrored to the repo at `research/website-truth-matrix.md`.

23 claims checked against the PING runtime repo (`/home/nolan/ping`, main at c5f7808b2) with read-only source inspection plus read-only HTTP probes of the live gateway. Status results:

- PROVEN (5): canonical events, gateway live and healthy, tenant-config site is a tenant, build journal posts, newsletter form.
- BUILT_NOT_LIVE (9): continuity across sessions, the full loop, tenant registry, generic knowledge graph, capability authority, evidence and witness, JS workers, missions, PING Social applied integration.
- EXPERIMENTAL (5): agent workers (IntelligenceWorker registered dormant), Python workers, deterministic replay machinery, Neo4j adapter, Oracle execution.
- DIRECTION (4): playbooks and institutional memory, multi-runtime convergence, business-domain graph, cloud execution.
- UNPROVEN (1): the old "Codex and Hermes operate under capability grants" card. The Sep-17 audit found they are exterior agents, not PING subsystems. Fixed on the page (see below).

Site label mapping, applied structurally: PROVEN = Live, BUILT_NOT_LIVE = Built, EXPERIMENTAL = Experimental, DIRECTION = Direction, UNPROVEN = Unproven. The label system ships regardless of audit outcomes, per the redesign plan.

## TRACK Q: Homepage implementation

Rebuilt `src/app/page.tsx` around the harvest hierarchy. 14 equal-weight sections compressed into 10 beats:

1. **Hero (living system moment)** /live. Nolan's H1 kept ("Systems that remember, agents you can trust"). The static HeroSystem visual replaced with a new `HeroEvidenceCard`: a captured PING commissioning run (LEAD_CREATED event e9591d72...ce5864c5, mission 51009ceae9ef316a LEAD_FOLLOWUP, 150 worker executions, captured 2026-07-28) plus a real live status line (ping-gateway healthy, constitution 1.0.0, auth enforced, probed 2026-09-16). Captured is labeled captured, live is labeled live. Dual CTAs kept, plus a scope note that the site is a live TenantOS tenant while the runtime is under construction.
2. **Continuity problem (compressed)** /truth. One contrast couplet plus two lines. The old three cards were folded into the loop beats.
3. **Closed compounding loop (Moment 2)** /observe /remember /connect /act /prove. Five beats in an identical template (verb headline, one-line mechanism, three bullets, maturity labels) plus a sixth card where the loop closes. KnowledgeLoop component kept as the loop visual. BusinessGraph folded into the Connect beat with an "illustrative model, not live data" caption (its "E-01J" node ID is invented; now labeled as illustrative).
4. **Intelligence is not authority (Moment 3)** /govern. Three numbered layers (default deny = Live, scoped grants = Built, audit and replay = Experimental), a real honest OFF (IntelligenceWorker registered dormant, never constructed), the AgentAuthority flow visual, and TenantOS folded in as the tenancy frame (TenantModel kept, "one authority per tenant").
5. **Every answer comes with receipts (Moment 5)** /prove. An annotated captured event record with real IDs, timestamp, source, caused mission, and worker executions, labeled captured 2026-07-28. ReplayEvidence component kept.
6. **One authority, many runtimes (Moment 4)** /run. MultiRuntime component fixed: the false "Codex and Hermes operate under capability grants" card replaced with an honest "Exterior agents" card (experimental, not PING subsystems); Python workers moved from "active development" to Experimental; Oracle moved to Experimental (active development per audit); convergence as a whole labeled Direction. Three-beat copy: workers run, the event plane holds truth, authority decides.
7. **Built on PING** /applied. PING Social moved out of section 10 into the applied gallery with the stack diagram, the three benefit cards, the contact CTA, and a scope note ("currently onboarding Western Colorado home-service businesses"). Build journal adjacent: a changelog strip with three real dated commits from the PING repo (2026-09-16) plus the three blog cards.
8. **What is real** /status. The old roadmap folded into a compact 13-row maturity strip (live through direction). No stages without evidence.
9. **Follow the build** /follow. Newsletter kept, shortened.
10. **Contact**. CTASection with the scope note in the subtitle.

Supporting changes:
- New `src/components/maturity-label.tsx`: the five-status label system with hover definitions.
- New `src/components/architecture/hero-evidence-card.tsx`: the living evidence card.
- `src/config/seo.ts`: fixed a pre-existing em dash in the page title template (the og:title separator is now a hyphen).
- Eyebrow taxonomy picked once: /live /truth /observe /remember /connect /act /prove /govern /run /applied /status /follow.
- Purpose clause on every section. No claim without an adjacent receipt or label. No em dashes anywhere in rendered HTML (verified). No copied branding or artwork.
- Dev server (tmux ping-dev, :3000) compiles the page: HTTP 200, stylesheet 200, /technology still 200.

## Labels applied

Every capability and runtime on the page now carries a maturity label: Live (gateway, canonical events), Built (loop stages, tenant registry, generic knowledge graph, evidence and witness, JS workers), Experimental (agents, replay, Python workers, Oracle, Neo4j), Direction (multi-runtime convergence, business-domain graph, cloud, playbooks). Captured evidence carries as-of dates. The old BUILT/ACTIVE DEVELOPMENT/IN DEVELOPMENT/DIRECTION badges are gone.

## Still unproven (needs runtime work, not website work)

- A live or fresh end-to-end loop run with real IDs across all five beats.
- A captured mission with a capability grant and one recorded denial.
- Two live tenants with isolated data.
- A recorded replay run with a MATCH or DIVERGENCE verdict.
- One canonical event handled by two or more runtimes with shared evidence (this is what would move multi-runtime convergence off Direction).
- A Python worker executing under PING authority with evidence.
- A business-domain graph subsystem, or an explicit decision to keep the claim on the generic graph.
- A live Oracle deployment target with a health check.
- One real business workflow running through PING events (this is what would make "Built on PING" more than architectural intent).

## Mobile

Every new section uses responsive grids that stack on mobile (matching the existing components, which already ship mobile treatments: AgentAuthority has a mobile list, BusinessGraph has a mobile node list, KnowledgeLoop has a mobile stepper). No hover-only interactions in new components; the evidence card replay is timer-based with a reduced-motion static fallback. Visual mobile QA (rendered screenshots at phone widths) was not possible from this agent and should be done in a live browser pass before the page is considered finished.

## Morning Deliverable

### Website Truth Matrix

Each claim classified: VERIFIED (proven live or built with source evidence) / PARTIAL (partly built, gaps named) / BLOCKED (needs another agent's runtime work) / FALSIFIED (the claim as worded was wrong) / UNKNOWN (no evidence found).

| Claim | Classification | Note |
|---|---|---|
| Events are canonical; knowledge derives from events | VERIFIED | Live gateway enforces auth; 770 captured events 2026-07-28 |
| Gateway live and healthy | VERIFIED | Probed 2026-09-16: healthy, constitution 1.0.0 |
| This site is a TenantOS tenant | VERIFIED | tenant-config drives the live page |
| Build journal posts are real | VERIFIED | Dated commits from the PING repo |
| Continuity across sessions | PARTIAL | Store built; no cross-session trace captured |
| Capability grants for agents | PARTIAL | Authority modules built; no captured grant plus denial |
| Tenant registry multi-tenancy | PARTIAL | Registry built; isolation not evidenced live |
| Generic knowledge graph | PARTIAL | Class built; no live query captured |
| Evidence and witness | PARTIAL | Modules built; no witness record with real IDs captured |
| JS workers | PARTIAL | Runtime built; 150 captured executions, none live |
| Missions | PARTIAL | Route built; one captured mission, none live |
| IntelligenceWorker agents | BLOCKED | Registered dormant; needs a real mission to activate |
| Python workers | BLOCKED | Components only; needs a registered worker runtime |
| Deterministic replay | BLOCKED | 34 kernel files; needs a recorded replay run |
| Neo4j adapter | BLOCKED | Thin adapter; needs a connected instance |
| Oracle execution | BLOCKED | Schema ready; needs a deployment target |
| Playbooks and institutional memory | BLOCKED | Needs a playbook store from real runs |
| Multi-runtime convergence | BLOCKED | Needs one event handled by 2+ runtimes |
| Business-domain graph | BLOCKED | Needs a subsystem or a relabel decision |
| Cloud execution | BLOCKED | Needs any deployment target |
| PING Social applied on PING | BLOCKED | Needs one real business workflow through events |
| Codex/Hermes as PING subsystems | FALSIFIED | They are exterior agents; card removed and relabeled |
| Newsletter signup works end to end | UNKNOWN | Form renders; submission path not exercised |

### Homepage Work

- VERIFIED: new hierarchy implemented and compiling; all 10 beats render; audit corrections applied (Codex/Hermes card gone, Python workers and Oracle relabeled, convergence labeled Direction); maturity labels on every claim; captured evidence labeled with as-of dates; no em dashes in rendered HTML; no commits or pushes.
- PARTIAL: mobile compositions are structural (responsive markup, tap-first, reduced-motion fallbacks) but not visually QA'd; the receipts section uses one captured run as its specimen and would be stronger with a second, fresher run.
- BLOCKED: nothing on the website side. Every remaining gap is runtime work owned by other agents (see "still unproven" above).
- FALSIFIED: one claim caught and fixed (Codex/Hermes card).
- UNKNOWN: whether Nolan wants to overrule any of the harvest's open questions (hero verb wording, the business graph as beat vs. moment, the eyebrow taxonomy). Defaults were picked and documented; his word governs.

Files:
- [TRUTH_MATRIX.md](sandbox://workspace/ping-overnight/website/TRUTH_MATRIX.md)
- [HOMEPAGE_REPORT.md](sandbox://workspace/ping-overnight/website/HOMEPAGE_REPORT.md) (this file)
- Repo mirror: `/home/nolan/projects/ping/research/website-truth-matrix.md` (uncommitted)
- Homepage: `/home/nolan/projects/ping/src/app/page.tsx` (uncommitted, verified live on the dev server)
