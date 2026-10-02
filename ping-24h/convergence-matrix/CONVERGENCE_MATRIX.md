# CONVERGENCE MATRIX

**Date:** 2026-09-28. **Mode:** read-only archaeology synthesis. **Owner order (~15:44 MDT):** stop customer pursuit; build one synchronized PING system.

**Target invariant:** change ONE object and watch Mission Control, the FYD website, Ask FYD, search, and Circle converge on the same new truth.

**Locked architecture:** Mission Control operates and projects existing PING authorities; it creates no new backend or task database. FYD is the customer product on that operating environment. The website builder is a high-value compiler/projection of the same object world. Intelligence layers stay deterministic software, then System One/Jev, then frontier intelligence, then human authority, with PING's state, authorization, evidence, outcome, and replay substrate beneath all layers. Jev selects only; it does not authorize, establish truth, execute, erase evidence, merge identities, or weaken deterministic safety requirements.

**Evidence base (six completed lanes):**
- Lane A (PING ORCA / Mission Control): `~/workspace/ping-24h/lanes/laneA-orca-mc/report.md`
- Lane B (Codex and orchestration patterns): `~/workspace/ping-24h/lanes/laneB-codex-orch/report.md`
- Lane C (website builder/editor): `~/workspace/ping-24h/lanes/laneC-builder/report.md`
- Lane D (design system / block registries): `~/workspace/ping-24h/lanes/laneD-designsys/report.md`
- Lane E (schema to UI): `~/workspace/ping-24h/lanes/laneE-schema-ui/report.md`
- Lane F (current FYD implementation, canonical tree `/home/nolan/projects/ping @ 0264d517ea53358d9246ddbbba66bb9dd0beb0d4`): `~/workspace/ping-24h/lanes/laneF-fyd/report.md`

**Verdict tags used below:** PING ALREADY BETTER (the mechanism exists in PING and is stronger than the harvested alternative), HARVEST (adopt the pattern), ADAPT (adopt the pattern, change the mechanism), REJECT (do not adopt).

**The single most important sentence in this matrix:** The human-authority layer has no working door. Ask FYD already emits exact digest-bound proposals, but no owner-facing surface exists to review and approve them, so the one decision that gives every other convergence meaning cannot be made.

---

## 1. PING HARVEST

Everything harvested below adapts to these; nothing replaces them.

- One semantic authority. The Constitutional Rule of One stands: one identity, canonicalization, hash, evidence, observation, configuration, knowledge, replay, projection, witness, and constitutional authority. Verdict: PING ALREADY BETTER.
- PING's event, authority, tenant, evidence, and replay model. All six lanes land on this substrate. Verdict: PING ALREADY BETTER.
- Determinism doctrine: same causal history produces same replay ordering, same canonical state, same canonical bytes, same hash. Every harvested mechanism gets a determinism check before adoption. Verdict: PING ALREADY BETTER.
- Fail-closed behavior: gates, timeouts, credentials, lints, and UNKNOWN-state handling all default to denial and typed failure. Verdict: PING ALREADY BETTER.
- Tenant isolation at every read/write/capability boundary. Customer data belongs to the tenant; PING operates the persistent runtime; Mission Control/ORCA is a capability-filtered tenant operating surface, not a second runtime. Verdict: PING ALREADY BETTER.
- Provider optionality and model optionality; no provider lock-in. Verdict: PING ALREADY BETTER.
- Structured job envelopes as the canonical shape for dispatched work. Verdict: PING ALREADY BETTER.
- Clean-checkout verification: a lane's green claim counts only after an independent replay from a clean checkout. Verdict: PING ALREADY BETTER.

## 2. ORCA HARVEST

Clean stack, from Lane A: journal event plane, then mission-control model, then `/api/mc/*` projections, then `page.tsx` operator surface, then orca-adapter dispatch.

- Keep the mission-control Python repo as the mission/approval domain model. Verdict: HARVEST.
- Keep `/api/mc/*` routes as projection/command seam, never a state owner. The seam boundary must be declared; a command becomes an intent/action and canonical transitions use existing authorities. Verdict: HARVEST.
- Keep `src/app/mission-control/page.tsx` as the current MC frontend. Verdict: HARVEST (with dirt noted in section 11).
- Keep `orca-adapter` as the sole live dispatch path. Verdict: HARVEST.
- REJECT: the Gateway ORCA ExecutionEngine. It is an orphan with `executor: null`. Mark do-not-revive. A second dispatch path is a sovereignty violation.
- Freeze/archive the old cockpit UIs. They are superseded; zombies compete with page.tsx as the one surface. Verdict: FREEZE.
- ADAPT: mechanically vendor `mc-approval` before any edit to its deployment copy, so deployment stays reproducible and the copy stops drifting.
- Carried gap: the approval backend exists but no approval UI consumes it; UNKNOWN missions show reconciliation language with no reconciler and no HOLD projection. No recovery may be claimed until a real reconciliation/HOLD mechanism exists.

## 3. CODEX LESSONS

Codex is DORMANT/HOLD (owner decision 2026-09-28 ~15:35 MDT). These are mechanics to harvest, not a resurrection. No build work on Codex, no authentication plumbing, no FYD/PING dependence.

Top 10 primitives, all HARVEST:

1. File-first, append-only typed run transcript. Run identity survives the process; the transcript is the run's durable memory.
2. Hash-bound propose/apply split: exact diff hash plus base HEAD binds every proposal to its apply. This is the primitive that makes digest-bound proposals real.
3. Typed interrupt and steer transitions. Interrupts are typed state transitions, not side channels.
4. Per-run budget with named exhaustion state and a pre-run estimate. Exhaustion is a first-class state, not a crash.
5. Typed review gate with structured verdict and reject-by-default timeout. The gate that the approval door in section 14 is built from.
6. Server-enforced spawn contract; collisions trigger worktrees, not errors. The server owns the contract, not the agent.
7. Orchestration-as-code with memoized replay and no wall-clock dependence. Replays are deterministic because time is not load-bearing.
8. Diff-native edit objects. Changes are typed diffs, not prose about changes.
9. Explicit worktree lineage, build-blind review, subtree teardown. HARVEST; adapt the teardown discipline to PING's isolation model.
10. Evidence-marked rollback and side-channel snapshots. Rollbacks carry evidence; snapshots are typed and addressed.

PING ALREADY BETTER on: one semantic authority, determinism doctrine, clean-checkout verification, fail-closed behavior, tenant isolation, provider optionality, structured job envelopes. These are not replaced; the Codex primitives adapt into them.

Binding external caveats: MCP Tasks is useful only behind capability negotiation, because versions differ. Never copy Codex's broad read posture around credentials. Any adapted hook mechanism fails closed on timeout; fail-open-on-timeout is rejected as a defect class.

## 4. EXTERNAL MISSION CONTROL LESSONS

Harvested from Lane A's field survey of the current MC surface plus the orchestration patterns in Lane B.

- A mission/run record must be durable and typed, never ephemeral or display-only. Lane A found dirty, partly-untracked routes and frontend; the record layer is the mission-control model, and it must be the strongest thing in the system. Verdict: PING ALREADY BETTER (event plane plus mission-control model); enforce it.
- Approval is a first-class transition with a structured verdict, never a side effect of a message. Lane A: the approval backend exists; the missing piece is the surface. The typed review gate (Codex lesson 5) is the pattern to adapt: typed verdict, evidence ref, reject-by-default timeout. Verdict: HARVEST.
- UNKNOWN/HOLD is a legitimate state only with a real mechanism behind it. Lane A found reconciliation language rendered for UNKNOWN missions with no reconciler and no HOLD projection; display text without a mechanism is a defect. Rule: any UNKNOWN/HOLD projection must cite the mechanism that owns the transition. Verdict: ADAPT.
- Dispatch goes through exactly one adapter. `orca-adapter` is that adapter; the orphan Gateway ExecutionEngine is a second path with `executor: null`. Verdict: REJECT the second path.
- Event-store ownership must be declared per stream. Two stores with undeclared ownership (`fyd-journal-gateway/events.jsonl` for MC writes, gateway Postgres `ping_events` for other reads) is the duplication to kill first in MC. Verdict: HARVEST the declaration rule; the stores themselves stay.
- Cost/quota ownership that is not version-controlled is not a real boundary. The Copilot broker owns cost/quota and is not version-controlled. Verdict: ADAPT (version-control it; do not rebuild it).
- MCP is research-only: no live PING MCP server was found. Harvest only the Zod-to-JSON-Schema projection pattern for agent tool surfaces (section 7); do not wire external tool surfaces into the authority layer. Verdict: ADAPT the projection, REJECT the wiring.

## 5. WEBSITE BUILDER HARVEST

Lane C, the strongest current builders (FYD planner/registry/renderer, json-render catalog, Puck/OpenPage editor patterns, Payload config-as-code).

- json-render catalog-as-agent-contract. The agent's legal moves are the catalog, never free invention. Verdict: HARVEST.
- One typed JSON document shared by visual UI, agent API, and renderer. One semantic unit, one writer. Verdict: HARVEST.
- Flat ID-to-element map with ordered child references. Stable IDs are the substrate every patch format converges on. Verdict: HARVEST.
- Registry record combining editable fields, defaults, render implementation, and declared data dependencies. Verdict: HARVEST.
- First-class `variant`, declarative `visible`, and typed theme tokens in the IR. Verdict: HARVEST.
- Draft/preview/apply lifecycle with policy hooks. This is the builder-side approval door; it meets the Codex review-gate primitive halfway. Verdict: HARVEST.
- Reusable field fragments and a singleton site record. Verdict: HARVEST.
- Version-pinned, owned component registry with token-only styling. Blocks arrive as owned code, never an opaque dependency; the registryVersion pin makes replay resolve exact bytes. Verdict: HARVEST.
- Sharpest SiteSpec gap (section 12): the IR lacks a first-class typed intent-resolution layer, specifically `variant`, declarative `visible`, an addressable `site` singleton, and a `registryVersion` pin. Without these, conversational edits become whole-tree rewrites instead of small typed operations.
- REJECT: React/Tailwind/Payload framework lock-in; full CMS adoption; arbitrary CSS emitted by agents; unbounded spec expressions; editor blobs as canonical truth; variant sprawl; client-only undo as durable history. The protocol shapes harvest; the frameworks do not.

## 6. CURRENT DUPLICATION

Each item is a concrete sovereignty violation with a named owner to declare or a weaker copy to retire. One semantic unit gets one writer.

1. Two event stores: `fyd-journal-gateway/events.jsonl` (MC writes) vs gateway Postgres `ping_events` (other reads). Per-stream canonical ownership undeclared. Kill by declaring ownership per stream; the other side projects. Evidence: Lane A.
2. Two Ask context compilers: `src/fyd/ask/context-builder.ts` vs `src/fyd/ask/context-projection.ts`. The stronger `compileAskContext()` is not wired into the served Ask route (`POST /api/fyd/ask/[siteId]` via `src/app/api/fyd/ask/ask-pipeline.ts`, then `visitor-answer.ts`, `answer.ts`, `ask-composer.ts`, `contract.ts`). Converge on the stronger compiler; retire the weaker file. Evidence: Lane F.
3. Fragmented identity: FYD identity, MC dispatch identity, Copilot broker identity configuration, PING IdentityAuthority. Converge all identity consumers under PING IdentityAuthority; no new identity generator survives. Evidence: Lane A.
4. Conversational customization has separate doors for presentation, truth correction, visibility, and media/tokens. Media is absent and design directives are refused. Merge the doors into one typed intent-resolution layer that emits one unified SitePatch. Evidence: Lane F.
5. Copilot broker owns cost/quota but is not version-controlled. Invisible state in a money-adjacent boundary. Version-control it. Evidence: Lane A.
6. Current MC routes and frontend are dirty, partly untracked. Truth of what is shown is unbound from source/build/serve. Commit-or-revert decision required before further work. Evidence: Lane A.
7. Orphan Gateway ORCA ExecutionEngine (`executor: null`) competes with `orca-adapter`. Freeze as do-not-revive. Evidence: Lane A.
8. Concierge exists only in tests and is unwired. Either wire it or freeze it; no middle state. Evidence: Lane F.
9. DEHPP customer/demo chrome separation lives on branch `fyd-dehpp @ eb28d3aa`, not on HEAD. The separation itself is worth keeping (Lane F harvest); merge discipline must bring it onto HEAD so it is not a second truth. Evidence: Lane F.

## 7. SCHEMAS TO KEEP

These are the schema-shaped decisions that survive convergence. Each is one authoritative owner, not a competing copy.

- PING event, authority, tenant, evidence, and replay model. The semantic authority; everything else projects from it.
- The mission-control Python mission/approval domain model. The strongest mission/approval semantics found (section 2).
- PING IdentityAuthority as the sole identity owner. Enforcement, not naming, establishes sovereignty.
- Zod-first single schema source (Lane E P1): author once in a shared package, `z.infer` generates TS types, the same schema validates API inputs. Never hand-write interfaces or match a schema to a pre-existing interface (drift).
- Three-tier token hierarchy with tier rules (Lane D harvest 2): primitive to semantic to component. Primitives never referenced by block code; semantic tokens named by role, the only vocabulary blocks may use; alias chain depth capped at 3.
- DTCG 2025.10 token shape (Lane D harvest 6): `$value`/`$type` objects, `{group.token}` aliases, composite types, `$extends` for theme inheritance. Future-proofs interop (Style Dictionary, Figma); handles OKLCH/P3 natively.
- shadcn-like registry-item manifest shape (Lane D harvest 1): `{ name, type, dependencies, registryDependencies, files, cssVars, css }`. Explicit block-to-block dependency graph; `registry:theme`-style presets as shippable token overrides. The protocol, not the React stack.
- CVA-style variant axes as block metadata (Lane D harvest 5): named axes with enumerated values and defaults (`intent`, `density`, `media`), resolved to token-bound utilities. Gives agents typed, finite block APIs and kills free-form class invention.
- slop_lint as a build gate (Lane D harvest 4): raw hex/px in block files is a build failure; contrast pairs checked in CI; every semantic color token must have a value in every mode or the build fails. This is the single most load-bearing enforcement harvest.
- Seed-based theme derivation with named radius-style presets (Lane D harvest 3): about seven owner-legible seeds (`brand`, `radius-style`, `density`) derive the full semantic layer. The owner edits seeds; the agent proposes token patches, never arbitrary CSS.
- JSON Forms tester-priority renderer dispatch (Lane E P3): `(uischema, schema)` to number; component eligibility is the same tester function. The json-render catalog-as-agent-contract, formalized.
- UI schema kept separate from the canonical domain schema (Lane E P6). Presentation annotations never alter canonical bytes.
- Confluent-style versioned registry (Lane E P4): events and objects carry `schema_name` plus `schema_version` (or content hash); the registry pins canonical JSON Schema bytes per version; compatibility (BACKWARD default) is gated at registration in CI; NONE is forbidden in production.
- Zod to JSON Schema to agent/MCP tool surface (Lane E P5): `.describe()` strings become the model's field hints; validation runs against the same schema before dispatch; authorization stays outside the schema.
- Schema-derived search projection (Lane E P7): the same content fields emit schema.org JSON-LD (`LocalBusiness`, `Service`, `Article`/`BlogPosting`). Search indexing consumes schema output, not hand-written markup.

## 8. SCHEMAS TO MERGE

Each merge declares one owner and retires the weaker copy. No architecture essay; the list is the plan.

1. The two Ask context compilers merge into one. Wire `compileAskContext()` into the served Ask route and retire the weaker file. The served path is `POST /api/fyd/ask/[siteId]` through `ask-pipeline.ts`, `visitor-answer.ts`, `answer.ts`, `ask-composer.ts`, `contract.ts`. Evidence: Lane F sharpest gap 2.
2. Identity consumers merge under PING IdentityAuthority. FYD identity, MC dispatch identity, and the Copilot broker identity configuration converge; no second identity generator survives. Evidence: Lane A.
3. The two event stores merge by declaring per-stream canonical ownership. `fyd-journal-gateway/events.jsonl` and gateway Postgres `ping_events` each get exactly one owner; the other side projects. Evidence: Lane A.
4. SiteSpec vNext merges the builder harvests into one minimal IR: flat stable IDs, an addressable `site` singleton, first-class `variant`, declarative `visible`, typed theme tokens, a `registryVersion` pin, object references, and typed capability-bound actions. Evidence: Lane C gap, Lane D harvests, Lane F.
5. The conversational customization doors merge into one intent-resolution layer emitting one unified SitePatch. Presentation, truth correction, visibility, and media/token edits all become typed operations on the same IR instead of separate doors. Evidence: Lane F sharpest gap 3.
6. MC and FYD approval mechanisms merge into one approval surface: one review gate, typed verdicts, reject-by-default timeout, evidence-marked transitions into the event plane. The approval backend exists in MC and the proposal machinery exists in Ask FYD; both currently lack the surface. Evidence: Lane A, Lane F, Codex lesson 5.
7. The schema registry merges with git as a projection of it. Git HEAD is the authority; the registry only indexes registered versions. Registration is a CI gate (canonical bytes, content hash, BACKWARD compatibility against prior versions before merge). No second truth store. Evidence: Lane E registry rules.

## 9. CODE TO DELETE-FREEZE

- Gateway ORCA ExecutionEngine: REJECT, do-not-revive. Orphan with `executor: null`; `orca-adapter` is the sole dispatch path.
- Old cockpit UIs: FREEZE, archived. Superseded by `src/app/mission-control/page.tsx`.
- The weaker Ask context compiler file: DELETE after convergence on `compileAskContext()`. One compiler, one owner.
- Duplicate/untracked MC route and frontend drift: FREEZE until the commit-or-revert decision is made. No new work lands on dirty state.
- Concierge: either wire into the served path or FREEZE. Exists-only-in-tests is not a state.
- CascadeProjects: not found in the tree. No action; recorded so nobody hunts it again.
- No live PING MCP server was found; MCP stays research-only. Nothing to freeze; nothing gets wired into the authority layer.
- Speculative PERSON schema: do not build. PERSON enters only when a renderer or capability needs person-shaped data. (Lane E)
- Compatibility mode NONE: forbidden in production for every subject. Breaking changes are new major versions with migrations. (Lane E P4)
- Full CMS adoption (Payload as a system, not the config-as-code pattern), React/Tailwind framework lock-in, agent-emitted arbitrary CSS, editor blobs as canonical truth, variant sprawl, client-only undo as durable history: REJECT all as directions, per Lane C and Lane D.

## 10. MISSION CONTROL BACKEND GAP

- `/api/mc/*` is a projection/command seam with no declared state owner behind it. The mission-control Python model is the strongest candidate for that owner, but the seam boundary is undeclared; commands must become intents/actions and canonical transitions must use existing authorities.
- Two event stores with undeclared per-stream ownership (`fyd-journal-gateway/events.jsonl` for MC writes, gateway Postgres `ping_events` for other reads). Declaration is the fix; a new event bus is not.
- The approval backend exists and nothing consumes it. Approval is currently unreachable in the product.
- UNKNOWN missions render reconciliation language; there is no reconciler and no HOLD projection. A real reconciliation/HOLD mechanism must exist before any recovery is claimed.
- The Copilot broker owns cost/quota and is not version-controlled. Invisible state in a money-adjacent boundary.
- The `mc-approval` deployment copy is edited in place; it must be mechanically vendored so deployment is reproducible.
- Identity is fragmented across FYD identity, MC dispatch identity, Copilot broker identity configuration, and PING IdentityAuthority. Consumers must converge under PING IdentityAuthority.
- Net: the backend has the strongest domain model in the system (section 2) but its seams are undeclared, its approvals unreachable, its UNKNOWN states decorative, and its money boundary invisible.

## 11. MISSION CONTROL FRONTEND GAP

- `src/app/mission-control/page.tsx` is the strongest operator surface, but it is dirty and partly untracked. Source, build, and serve are unbound; per the standing source/build/serve binding rule, nothing it shows is certified until all three are bound.
- No approval UI exists despite the approval backend. The typed-verdict path (Codex lesson 5) has no door.
- No live timeline/DAG of missions and runs. The durable run model (Codex lessons 1-3) is unprojected.
- No agent/run inspector. Operators cannot see what a run did, which authority decided, and what evidence backs it.
- UNKNOWN state renders reconciliation language with no mechanism behind it. Per section 4, the projection must cite the mechanism or the language comes out.
- The old cockpit UIs compete as zombies; freezing them archived makes page.tsx the unambiguous surface.
- Net: the frontend can display, but it cannot decide, inspect, or recover. Approval and gate surface (item 7 of the implementation list) is the first surface gap to close.

## 12. SITESPEC GAP

- Sharpest gap: the IR has no first-class typed intent-resolution layer. Missing: first-class `variant`, declarative `visible`, an addressable `site` singleton, and a `registryVersion` pin. Consequence: conversational edits become whole-tree rewrites instead of small typed operations. This is the gap Lane C named and Lane D's harvests fill.
- Strongest current pieces, verified on `/home/nolan/projects/ping @ 0264d517ea53358d9246ddbbba66bb9dd0beb0d4`: `src/fyd/sitespec/types.ts` (current SiteSpec), `src/fyd/builder/planner.ts` (planner), `src/fyd/components/renderer.tsx` and `src/fyd/components/registry.ts` (renderer and registry), `src/app/sites/_shared/spec-pipeline.ts` (shared pipeline). Lane C calls this the strongest current SiteSpec and renderer; Lane F concurs.
- Conversational customization currently has separate doors for presentation, truth correction, visibility, and media/tokens. Media is absent and design directives are refused. One typed intent layer must absorb all four doors.
- Correction/customization/regeneration pieces exist and are the raw material: `src/fyd/owner-mode/corrections.ts`, `src/fyd/customize/owner-proposal.ts`, `src/fyd/customize/intent.ts`, `src/fyd/customize/owner-command-compiler.ts`, `src/fyd/customize/apply-layer.ts`, `src/fyd/builder/source-refresh.ts`.
- Related harvests not yet on HEAD: `fyd-dehpp @ eb28d3aa` (customer-site/demo-chrome separation, worth preserving), `decision-fabric/contextpack-wire-2026-09-28 @ 9a555021` (evidence packet wiring pattern), `/home/nolan/projects/ping-ask-loop` (honest-answer fixes for conflicts and holiday hours), `fyd/builder-rebuild-v1` (deterministic planner plus DTCG token compiler), `design/lane-render-wire @ 832b0148` (composition, media, typography, motion mechanisms).
- Minimal SiteSpec vNext IR (the merge target from section 8.4): flat stable IDs, an addressable `site` singleton, first-class `variant`, declarative `visible`, typed theme tokens, a `registryVersion` pin, object references, and typed capability-bound actions.

## 13. THREE TEMPLATE FAMILY PLAN

One registry, three composition policies. Cross-family invariants: the same block registry, the same token grammar, the same lint gate. A block authored for one family works in all three; only the preset, the eligible-section list, and the composition rules differ. The generator may only emit a section sequence from the eligible list, axis values from declared axes, and token patches to the preset. It may never emit raw CSS values, new class names, or off-catalog sections; the lint gate enforces this at build time.

**SERVICE BUSINESS** (plumber, HVAC, electrician, tree service). Policy: conversion-first, low cognitive load. Eligible sections: hero with phone CTA plus service area, services grid, trust signals (reviews, licenses, guarantees), pricing/estimates, service-area map, FAQ, contact/quote form, footer. Composition rules: exactly one primary CTA per viewport; phone number always above the fold; trust block within the first two screens. Token preset: high-contrast action color, generous control sizes (phone-tappable, 52px+), `radius-style` subtle or default, `density` comfortable, motion reduced-leaning (fast, minimal effects). Variant defaults: CTAs default to `intent: primary`; heroes default to `media: with-image`. No decorative sections (no logo clouds, no bento experiments).

**PROFESSIONAL/PERSON** (lawyer, consultant, therapist, realtor, trades personal brand). Policy: credibility-first, editorial rhythm. Eligible sections: hero (portrait plus positioning statement), about/bio, credentials, services or practice areas, testimonials, process/how-it-works, content/articles, contact, footer. Composition rules: generous whitespace, one idea per section, photography-forward, typography carries the design (display serif or strong grotesk). Token preset: refined type scale with larger display steps, `radius-style` sharp (legal) or rounded (wellness), `density` spacious, motion slow and quiet (300-480ms, decelerate). Variant defaults: cards default to `intent: quiet` (hairline borders, no heavy shadows); CTAs default to `intent: secondary` with one primary per page. No aggressive conversion chrome (no sticky call bars, no countdowns).

**ORGANIZATION/PRODUCT** (church, nonprofit, local product, venue). Policy: narrative-first, community proof. Eligible sections: hero (mission statement), impact stats, programs/features, stories/testimonials, events/calendar, team, partners/logo-cloud, pricing/membership, FAQ, newsletter signup, contact, footer. Composition rule: story arc ordering (mission, then proof, then participation), richer media (galleries, video), dense social proof. Token preset: expressive brand color allowed more surface area, `radius-style` rounded, `density` comfortable, motion full (aurora/marquee-class effects from the curated effect catalog permitted). Variant defaults: stats default to animated counters; heroes default to `media: full-bleed`. This is the only family where decorative sections (logo clouds, bento grids) are eligible by default.

Owner changes seeds and the preset; the agent proposes preset diffs and section sequences; the build fails closed on anything outside the contract. Motion volume differs per family by design; effect keyframes live in the registry, parameterized by tokens, with reduced-motion as a mode-level override.

## 14. #1 IMPLEMENTATION

**One owner proposal/approval surface for Ask FYD digest-bound proposals.**

Why this one: Ask FYD already generates an exact digest-bound proposal, but the served widget has no proposal/approval UI (Lane F sharpest gap 1). Mission Control has an approval backend with no approval UI (Lane A). The two gaps are the same hole: agent-generated change has no working door to owner authority. This is the smallest convergence change that restores a real product invariant instead of starting another framework. It is also the product thesis made visible: Nolan's plain-language intent becomes a bounded proposal that stops exactly at owner authority.

Scope, minimal:

- Render an Ask FYD digest-bound proposal for owner review as ONE DECISION, ONE SENTENCE, ONE EVIDENCE LINK, APPROVE or DENY. The surface presents the exact proposal bytes and digest, the evidence packet, and the source it would change.
- An APPROVE emits a typed, evidence-marked transition into the event plane carrying identity, evidence ref, and pre/post hashes. This is the hash-bound propose/apply primitive (Codex lesson 2) meeting the draft/preview/apply lifecycle (Lane C harvest).
- A DENY, or a timeout (reject-by-default per Codex lesson 5), leaves state untouched and is journaled with the same evidence shape.
- Reuses existing pieces, no new backend: the Ask pipeline proposal generation (`ask-pipeline.ts` and below), `src/fyd/owner-mode/corrections.ts`, `src/fyd/customize/owner-proposal.ts`, `src/fyd/customize/intent.ts`, and the builder draft/preview/apply lifecycle. The approval backend in Mission Control converges into this one gate (section 8.6) rather than growing a second UI.
- Fail-closed: a missing proposal digest, an unbound source, or a gate timeout is a DENY, never an apply.
- What it deliberately does not do: no new event bus, no new authority, no builder rewrite, no second approval system for missions. One gate, one surface, wired to the pieces that already exist.

## 15. TEST

Executable acceptance test for the #1 implementation, replayed from a clean checkout with no human in the loop and no mock MC data presented as real:

1. Seed a fixture tenant with a BUSINESS object and a recorded evidence packet.
2. Drive Ask FYD to produce a proposal. Assert the proposal artifact carries the exact digest bound to the source bytes, and that mutating one byte of the source changes the digest.
3. Assert the proposal renders in the approval queue as ONE DECISION, ONE SENTENCE, ONE EVIDENCE LINK, APPROVE or DENY, with the exact proposal bytes and the evidence link inspectable.
4. Approve. Assert the object transition applied; assert the journal records the approval with identity, evidence ref, and pre/post hashes; assert Ask FYD, the FYD website projection, and Mission Control all reflect the new value (the first convergence proof at small scale).
5. Deny on a fresh proposal, and separately exercise the timeout path. Assert zero state change in both cases; assert the journal records the denial; assert timeout defaults to reject.
6. Replay determinism: re-run the same causal history and assert identical canonical bytes and hashes.

Pass bar: all six steps green. Anything less is a hypothesis, not a shipped door.

## 16. FIRST BROKEN INVARIANT

**First broken invariant: one agent-generated proposal has no single owner decision point.**

Ask FYD emits exact digest-bound proposals and the approval domain model exists, yet no owner-facing surface renders a proposal for review and no typed approval transition carries a decision into the event plane. The human-authority layer of the stack (deterministic software, then System One/Jev, then frontier intelligence, then human authority) has no working door.

Why this is the first broken invariant and not a symptom: every other convergence move presupposes a change worth approving. Schema registries, SiteSpec vNext, merged context compilers, MC timelines, and the three template families are all machinery for producing and projecting change; without an owner decision point, that machinery has no product boundary to stop at. The owner-questions default makes this explicit: if infrastructure is growing faster than product proof, the wave stops and collapses onto the first broken customer boundary. The approval door IS the first broken customer boundary. The deeper target invariant (one object changes, and Mission Control, the FYD website, Ask FYD, search, and Circle converge on the same new truth) is what this fix unlocks: an approval transition is the only authorized way an object changes, so every projection's invalidation path begins at this door.

## 17. NEXT

The 17-item implementation list, in dependency order. Authority before surface, seams before features, proof last.

**Phase 1, the door:** 7 Approval and gate surface, 15 Ask FYD/evidence. The #1 implementation (sections 14-15).

**Phase 2, the seams:** 4 One MC backend seam (declare `/api/mc/*` ownership under the mission-control model, declare per-stream event-store ownership, converge identity consumers under PING IdentityAuthority, version-control the Copilot broker, mechanically vendor `mc-approval`, build the real reconciliation/HOLD mechanism). 1 MC domain schema reconciliation (declare the mission/approval/run schemas as the one domain model; freeze competing copies). 2 Executable invariants (write the invariants the test enforces as executable assertions: digest binding, typed verdicts, reject-by-default, replay determinism, per-stream ownership, one dispatch path).

**Phase 3, the run model:** 3 Orca durable run model (typed durable runs, file-first append-only transcript, hash-bound propose/apply, typed interrupt/steer, per-run budget with named exhaustion). 5 MC live timeline/DAG and 6 Agent/run inspector (projections of the run model, not new stores).

**Phase 4, the object world:** 8 FYD schema registry reconciliation (BUSINESS, SERVICE, POST authored once as Zod-first modules; PERSON only if required; registry as a projection of git; BACKWARD compatibility gates in CI). 9 SiteSpec vNext minimal IR (flat stable IDs, site singleton, variant, visible, theme tokens, registryVersion pin, object references, typed capability-bound actions). 10 Component registry (manifest shape, variant axes, tokens_consumed contracts, slop_lint gate, DTCG tokens, seed presets). 11 Three template families (composition policies plus presets from section 13).

**Phase 5, the edit paths:** 12 Unified SitePatch (direct UI, visual UI, and agent edits all emit one patch type against the IR). 13 Visual editing and 14 Conversational editing (both emit SitePatch; both route through the approval door from Phase 1; the conversational intent layer absorbs the four separate customization doors).

**Phase 6, the convergence proof:** 16 Projection dependency invalidation (one approved object change invalidates and rebuilds every dependent projection: MC, FYD website, Ask FYD, search, Circle). 17 Browser/mobile/performance gates (served-bytes verification with source/build/serve binding; the product courtroom is the rendered page).

**Standing rules for all phases:** read-only is over; plan-then-act. No new authority, event bus, graph database, runtime, or duplicate backend. One semantic unit, one writer. Mission Control UI reads projections; commands become intents/actions; canonical transitions use existing authorities. Codex stays DORMANT/HOLD. No customer pursuit: the sidelined dossiers (`~/workspace/ping-24h/first-owner-candidates/dossiers-2026-09-28.md`) remain future regression and ingestion fixtures only.

---

*Matrix compiled 2026-09-28 by the convergence coordinator from six completed archaeology lanes. No implementation performed in this wave; this document is the decision input to Nolan's implementation list.*
