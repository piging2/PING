# Sprint decisions — 2026-09-25 ~19:56 MDT (Nolan)

## Q4 power policy (FINAL, supersedes the 19:45 battery-holding lock)

- Keep the Pig PLUGGED IN for the full 24h sprint.
- The battery-holding sprint wake lock (PIG-SPRINT-WAKELOCK-20260925) was RELEASED at ~19:58 MDT per this directive.
- Do not deliberately make battery-discharge policy part of the sprint. Do not intentionally drain battery to keep the host awake.
- SleepStudy evidence stands: the existing keep-awake behavior does what it was designed to do; the failure mode is power source, not wake-lock correctness.
- If AC power is lost: record transition, checkpoint active work, stop launching expensive browser/build jobs, allow existing safe shutdown/sleep policy, resume on AC.
- Battery-resilient wake behavior is a SEPARATE bounded experiment later: measure drain, prove a safe threshold. Not a sprint dependency.

## 30 question answers (LOCKED for the sprint)

Nolan issued two answer blocks; the second (refined) block is authoritative. Deltas from the first block are noted. One direct conflict flagged.

1. Nolan is stand-in owner. NO real Coppersmith owner contact. (Not equivalent to external owner validation.)
2. Prepare owner outreach package only after product proof. Do not contact without explicit authorization.
3. HPP must be genuinely compositionally different where evidence/design signals justify it. Same grammar OK; byte-identical skeleton is failure.
4. Six gates are INDIVIDUAL pass/fail. REFINED: a safety/security/grounding red is blocking; aesthetic losses can be backlog. (Block 1 said any red must-win blocks; block 2 narrows the blocking class.)
5. Automated performance numbers + real-browser experience. Record LCP/CLS/INP where practical; do not game one Lighthouse score.
6. REFINED: capture changed/failing canonical viewports plus final proof set. Do not warehouse redundant screenshots. Keep failed screenshots.
7. CONFLICT: block 1 said written proof package first, then live walkthrough; block 2 says LIVE WALKTHROUGH first, proof package behind it. Working default: block 2 (walkthrough first). Nolan to confirm.
8. Ask FYD visitor-visible only after grounding, isolation, and abuse controls are proven.
9. INSUFFICIENT_EVIDENCE: stop cleanly; offer capability-driven contact/lead path only if owner enabled it. Never invent answers or owner-routing workflow.
10. Session context acceptable if explicitly bounded, ephemeral, not mistaken for durable business truth.
11. Suggested chips only after core grounded Ask works, derived from supported graph capabilities. Not a blocker.
12. NATURAL-LANGUAGE OWNER CHANGE MUST WORK. UI controls optional.
13. REFINED: PREVIEW → APPROVE for consequential/public changes. Low-risk reversible cosmetic changes may later support apply+undo. Undo stays backlog unless cheap.
14. REFINED: source changes PROPOSE/RECONCILE when they collide with owner overrides. Safe unmodified facts may eventually auto-refresh by policy. Never silently overwrite owner intent.
15. REFINED: conflicting evidence stays conflicting. Use verified precedence where available; otherwise surface uncertainty and request owner resolution. Public projection uses only resolved/authorized claims.
16. Treat any real-looking phone as sensitive enough to test rigorously. Do not rely on "probably synthetic."
17. REFINED: business-owned website publication is strong evidence of intended publicity, but FYD visibility policy remains explicit and owner-overridable. Observation and publication policy stay separate.
18. Yes: field/object visibility must be granular enough to expose street address without exposing unrelated location/private data. Publication binds to exact entity/field/value revision.
19. FYD may depart substantially from source appearance. Preserve useful brand signal, not source CSS authority.
20. REFINED: multi-page when the graph warrants it; do not force pages to a quota. Single-page proof first.
21. Zero media: designed non-broken fallback. No fake stock imagery.
22. Yes: hero selection is schema/intent/capability driven. Plumber, restaurant, creator need not lead identically.
23. Real privacy/security bypass SHIPS IN SPRINT before external demo. Cosmetic privacy improvements can follow.
24. Prefer local derivative with provenance where authorized. Hotlink only as explicit observation/demo policy, never the foundation.
25. Use low-quality source media only when treatment makes it credible; otherwise designed fallback. Never unrelated stock presented as the business.
26. Do not clutter facts with dates by default. Expose freshness via WHY THIS/details and stale warnings where meaningful.
27. REFINED: stay at two proof businesses until the loop works; then deliberately select a THIRD DIFFERENT BUSINESS TYPE to falsify overfitting.
28. REFINED: for this sprint treat FYD as a PRODUCT an owner can use. (Longer term: both product and service.)
29. Tenant isolation BLOCKS real external owner data. Credential-shaped history remediated per actual secret-exposure risk. Neither hand-waved for a public demo; neither blocks a private/internal demo.
30. At 24h: stop feature expansion. Finish the dimension only if narrowly bounded and near completion. Never leave a security/correctness invariant half-implemented to beat the clock.

## CRX-runtime harvest doctrine (ngesk2/crx-runtime, pulled via GitHub connector)

- It is a constitutional/forensic corpus with a thin runtime, NOT a finished runtime to import wholesale.
- Harvest IDEAS and discipline; do not reorganize PING around it, do not import its constitution as a new PING constitution.
- Harvest: agents-are-workers-not-authorities (bounded capability contracts), reuse-before-create (search PING/TenantOS/FYD/ORCA/old worktrees/CRX archaeology first), explicit permission matrix (READ/WRITE/PATCH/TEST/COMMIT/DEPLOY/EXTERNAL_EFFECT/SECURITY_ADMIN mapped onto existing CapabilityAuthority, no second permissions system), proposal != execution (intent → proposal → policy/capability → authorization → execution → receipt → outcome evidence), replayable evidence per task, worktree isolation (one mutable semantic unit → one writer), anti-shadow-system discipline (but multiple implementations != duplicate authority; trace decision ownership first), event/replay ideas as comparison source only (UER/ping_events stays the live authority), provider-neutral agent task/result contract (do not freeze until providers inventoried).
- Do NOT harvest its mistakes: shadow repos, parallel event schemas, broken agent scaffolds, architecture-ahead-of-implementation, spec/runtime drift, empty infrastructure. PING current reality wins.

## 24h convergence swarm (authorized 19:56 MDT)

Ten lanes: FYD compiler (already running), FYD privacy P0 (already running), TenantOS archaeology, ORCA hold convergence, GitHub ingestion, Mission Control closed loop, self-improvement loop, primitive convergence, backlog falsification (the 49 proposals get classified, NOT bulk-added), frontend unification.

Operating rules: many readers, many falsifiers, few writers, one writer per mutable semantic unit, one owner per decision. Copilot fleet via `copilot -p` is READ/ANALYSIS ONLY (writes/patch/shell denied by the CLI environment). Evidence-backed HOLD is a valid lane outcome. No convergence lane rewrites working FYD code without proven benefit. Coordinator owns power-watch per Q4 policy.

---

## Batch 2 — 30 decisions locked 2026-09-25 ~20:01 MDT (Nolan)

Framing (standing): FYD is NOT a website builder. It is a compiler from messy evidence into an owner-controlled, executable digital object. The website is one renderer. Architecture: EVIDENCE -> OBJECT GRAPH -> OWNER INTENT -> DECLARATIVE SPECS -> DETERMINISTIC EXECUTION -> OUTCOMES -> NEW EVIDENCE. Objects preserve optionality. Intelligence makes choices; software owns mechanical truth. SiteSpec is an IR. Harvest broadly, implement narrowly. Novel budget: evidence semantics, object resolution, owner intent, capability authority, concierge context, spec compilation, outcome learning. NOT commodity plumbing (crawlers, React, LLM calls, federation).

- Q7 conflict RESOLVED: LIVE WALKTHROUGH FIRST. Proof package is GENERATED FROM walkthrough evidence.
- Holds: coordinator resolves routine holds. Escalate only: constitutional/authority change, production destructive action, external consequential action, secret/key custody change, legal/licensing judgment, irreversible migration, product decision with materially different user semantics.
- P0 found by swarm in FYD code: HAND TO MAIN FYD LANE. Swarm must not modify product code. Return: reproduction, evidence, severity, suspected owner, smallest likely fix. One writer per semantic unit.
- Copilot: FULL BURN WITH VALUE DISCIPLINE. No arbitrary quota. Readers for archaeology/falsification/test-gen/dependency research/diff analysis/duplicate detection/security review. Knowledge must compound into harvest artifacts; no repeated tree summarization.
- Visual checkpoint: NOW, not end of sprint. Private dev server, both sites, manageable demo owner controls.
- Questions: BATCH. Interrupt only for genuine hard stops.
- Canonicality: earned by actual responsibility + persisted contracts, not discovery order. Archaeology answers callers/state/invariants/authority overlaps/migration cost first.
- ORCA: neither wins by name. Trace callers+state+semantics. Semantically identical -> converge onto better-tested/smaller authority. Different -> rename concepts before merging.
- GitHub: SOURCE POLICY owns cadence (manual/scheduled/webhook/staleness-triggered). Adapter observes.
- Mock UI: DELETE or quarantine mock behavior impersonating live truth. Keep reusable presentation components. Never fix fake data without a real read model.
- Duplicate event stores on FYD hot path: CONVERGE. Dormant/unrelated: record and defer.
- Primitive ABSENT: deliberate disposition, recorded (primitive/why absent/handler/evidence/reopen condition). No signature ceremony unless constitutional policy requires.
- Permission matrix: do NOT create merely because CRX has it. Map into CapabilityAuthority if expressible (external target/operation/constraints/approval). If impossible: extend minimally. HOLD external execution until expressible.
- Provider inventory: ONE read-only harvest lane (providers/callers/request+result shapes/streaming/tool use/errors/cancellation/usage accounting). No contract freeze from docs alone.
- Proposal/approval: NO to every-change-needs-proposal. Authority UX tracks consequence. Direct apply (event/history+undo) for local/reversible/non-external/non-destructive. Proposal for: agent-originated, external effects, batch, destructive, identity/security, ambiguous high-impact.
- Self-improvement approval: initially human. Future: policy auto-promotes bounded reversible classes only after evidence proves the class safe. Never blanket "AI improvements" authority.
- Evaluation window belongs to the outcome metric, not global. Store metric/baseline/window/expected direction/result/confidence.
- Ask FYD hostile suite (minimum, then visitor Ask opens): A answerable->cites evidence; B unsupported->unknown/refuse; C conflicting->expose disagreement; D private fact->visitor cannot retrieve; E cross-tenant->no leak; F prompt injection in acquired site->cannot override policy; G external action->needs capability; H provenance->correct source; I secret/journal request->denied; J malformed evidence->not authoritative.
- Low-risk (POLICY, not agent): spacing, non-semantic design tokens, safe typography, section presentation where meaning unchanged. NOT low-risk: visibility, address publication, claims, pricing, contact endpoints, capabilities, external links, legal copy, identity, SEO metadata, publishing external content.
- Heroes: 8 semantic (IDENTITY/BUSINESS/SERVICE_LED/LOCATION_LED/CONTENT_LED/PRODUCT_LED/EVENT_LED/GENERIC). Deterministic selection from graph/site objective. No 20 aesthetic templates.
- Demo media without owner relationship: NO assumed authorization to copy/rehost. Default: reference/hotlink where appropriate or licensed/owned demo assets. No durable derivatives without authorization basis. Internal demo may mark DEMO/SOURCE-REFERENCED but notice != rights. Prefer omission.
- Third proof business: RESTAURANT (attacks home-service assumptions). Not until two-site owner loop closed.
- Citations: SHORT SOURCE LABELS default ("Source: Services page · observed Sep 25"). WHY THIS expands to full provenance. No internal evidence IDs on customers.
- Proposal review: SHARED PRODUCT UI. Compiler emits typed proposal/diff; one reusable surface renders requested change/before/after/affected objects/consequence/evidence/Approve/Reject.
- Pages: SEMANTICS not object count. Page exists on coherent navigational intent + enough evidence.
- Tenant isolation hostile suite: A cannot read B private by ID; search; Ask FYD; mutate; cross-tenant relationships; projection caches; malformed viewer fails closed; missing tenant fails closed; agent tool context cannot substitute tenant; BFF cannot accept client authority claims; replay does not cross-associate. Test at API AND Ask FYD layers.
- Mission Control first mission: SOURCE REFRESH / FYD REGENERATION ("re-observe this owned website, tell me what changed").
- Backlog disputes: COORDINATOR resolves evidence-level. Nolan only true product/constitutional forks.
- Backlog grouping: BOTH. Epics for shared outcome/invariant; standalone for independently testable. Never bury security/correctness in giant epics.
- Power: software cannot prove the physical plug; machine reports AC now = observable fact. Policy stands (AC: stay awake; AC lost: checkpoint, stop expensive work, normal sleep). No further work.

Ecosystem notes (harvest, not import): ATProto granular resource/action permissions + human-readable progressive permission sets (evidence for capability bundles; HARVEST the UX model, keep PING authority); Lexicon schema->record/API/event/permission derivation; Automerge later for local-first owner editing (must not replace PING canonical event authority); schema-driven UI (compact declarative specs, deterministic render); Crawl4AI (do NOT own commodity crawler complexity; security fixes warn against embedding crawler servers in trusted core); Lightpanda reusable agent-generated scripts (learn once -> replay deterministically).

---

## Batch 3 — 30 answers locked 2026-09-25 ~20:17 MDT (Nolan)

1. "Nothing is a blocker" does NOT waive tenant isolation, real external-owner safety, secret handling, irreversible actions. Those remain gates for the affected path. Work on something else instead.
2. Deferred work: canonical backlog if actionable and evidenced; HOLD/UNKNOWN register if unresolved; not memory-only.
3. Forever: continuous coordinator operation while authorized infrastructure/cost policy allows it. No invented quiet hours tonight. Full useful burn, not waste.
4. :3105: do NOT send Nolan to known-broken v2. Keep out of review until the 05:00 build.
5. Manageable owner controls tonight: Ask FYD, Customize with FYD, visibility/trust inspection where already safe. Not the giant debug console.
6. Walkthrough server: keep the reviewed private build available while actively tested. No mystery stale servers. Record SHA/build provenance.
7. Consumption map: engineer/dev artifact. Owner sees normal UX, not the ledger.
8. Dead CSS import: prefer eliminating the unnecessary layer if the direct canonical token path is cleaner; correct it if the indirection has real compositional purpose. Decide from CSS architecture.
9. Screenshot judgment: Nolan may judge from phone and desktop. Canonical screenshots still required for reproducible evidence.
10. HPP difference: same grammar, meaningfully different composition when objects/media/intents justify it. No difference for its own sake.
11. Phone leak: already fixed in isolated privacy lane. New real leaks: contain/fix immediately in owning lane, don't queue behind cosmetic work.
12. HIDE/SHOW: search for canonical existing semantics first. Don't write a new spec; if genuinely absent, record the minimal effective-resolution invariant from proven behavior.
13. Harvest artifacts: existing canonical convergence/harvest artifact if one exists, else one bounded sprint artifact. No scattered harvest/ trees.
14. Backlog: real defect becomes candidate first, deduped. Promote automatically only under established backlog policy; otherwise coordinator promotes evidence-backed accepted items.
15. Copilot read-only: may run read-only tests/analysis if tool policy permits. No mutation in read-only lanes.
16. HOLD log: yes, compact (hold/evidence/disposition/reason/reopen trigger). Nolan sees material ones unless requested.
17. Owner Ask: owner may get richer authorized private context. Visitor only public evidence. Same pipeline, different ViewerContext.
18. Suggested chips: 3-5, derived from supported object roles/capabilities. Refresh only on material context change.
19. Insufficient-evidence wording: deterministic product template. Example: "I couldn't verify that from this business's published information." Then offer owner-enabled contact capability if available.
20. Owner change: typed text first. Voice later as input adapter to the same Intent.
21. Reject proposal: reason optional; preserve if supplied as evidence/feedback.
22. Preview: rendered preview for presentation changes + semantic before/after diff. Live isolated preview URL if cheap.
23. canonicalEntityUrl: preserve canonical identity semantics exactly. Compiler may derive navigation/projected URLs separately.
24. feedRenderableSchemas: determine contract owner. Fix the side that violates; no blanket answer without reproduction.
25. Session context: bound to visit/session initially. No implicit durable personal memory.
26. Powered by FYD: yes, subtle footer-level attribution for the demo family. Don't let it dominate the business.
27. Demo disclosure: yes for internal/private demo (subtle "FYD demo" / controlled private environment). Don't imply endorsement.
28. Restaurant: do NOT select tonight. No third site until HPP + Coppersmith pass.
29. Follow edge: later. Preserve relationship model; don't build social graph UX tonight.
30. Clock stop: coordinator calls feature-expansion stop at 24h. Bounded safety/correctness work may finish. Truthful status, no half-applied work.

## Night directive change 2026-09-25 ~20:17 MDT (Nolan) — PRODUCT VERDICT
Current HPP generated page NOT ACCEPTABLE: reads as acceptance harness + database browser + provenance UI + owner console + website instead of an excellent carpentry website. Product law: THE DATA MODEL CAN BE RIGHT AND THE PRODUCT CAN STILL BE BAD.
Until 05:00 MDT: (1) HPP template/design family archaeology, (2) object/relationship/presentation-binding work, (3) ONE Coppersmith proof build at 05:00. NOTHING else. No third business, no restaurant, no generic pages, no federation/social/campaign/architecture-frontier work.
Coppersmith: NOT CURRENTLY REVIEWABLE. Do not claim product green. 05:00: exactly ONE new Coppersmith build from the finalized HPP-derived family (375/390/1440 + live private URL). Nolan judges "Would I choose this over the current Coppersmith site?" If no: fix the family, don't generate another business.
Harvest, don't copy: trishnikitha-art/happy-place-platform (Next.js 16/React 19, configuration-first, stable domain objects, estimate funnel) is the quality reference. Reusable: IA, service presentation, conversion hierarchy, gallery behavior, trust presentation, estimate flow, mobile nav, CTA placement, SEO, responsive behavior, domain types, config model, component composition. NOT: name/copy/phone/photos/services/locations/branding/facts.
Three surfaces, never mixed: VISITOR (beautiful website), OWNER (customize/visibility/corrections/proposals), ENGINEERING (IDs/digests/bindings/journal/diagnostics). Provenance: progressive disclosure, quiet trust UI. No fake reviews/licenses/years/FAQ. Phone: human-readable format, canonical E.164 underneath.
Power: do NOT disable system sleep globally for FYD. Scoped wake inhibition while workers run; checkpoint for recoverability.
