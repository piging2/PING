# FYD / PING — 24-HOUR PRODUCT PROOF SPRINT

Charter issued by Nolan, 2026-09-24 ~18:12 MDT. Clock starts now.
This file is the canonical sprint source. The coordinator recomputes the critical path from evidence every 4 hours; the hour plan below is the starting plan, not a cage.

## NATURE

One 24-hour proof campaign, not 24 hours of parallel feature accumulation.
One complete customer journey forced through the system we already have.
Organized by BROKEN ARROWS: find first broken arrow, fix, re-run journey, move to next.

## 24-HOUR NORTH STAR

On Coppersmith, by hour 24:

PASTE / SELECT REAL BUSINESS -> ACQUIRE REAL SOURCE -> EVIDENCE -> STABLE OBJECT GRAPH
-> TRADESMAN -> BEAUTIFUL MOBILE SITE -> FUNCTIONAL EDGE OBJECTS -> OPEN OBJECT
-> TRAVERSE RELATIONSHIP -> ASK FYD -> INSPECT WHY / EVIDENCE -> OWNER REQUESTS CHANGE
-> REVIEW -> APPROVE -> JOURNAL -> REGEN -> BROWSER REFLECTS CHANGE -> SOURCE REOBSERVED
-> OWNER INTENT SURVIVES.

Plus: HPP vs TRADESMAN(HPP) vs TRADESMAN(COPPERSMITH) side by side.
No fiction. No customer-specific template fork. No privacy leak. No unsupported public claim.
No blind retry of unknown external effect.

## NOLAN'S FIVE LOCKED DECISIONS (2026-09-24)

1. WINDOW: start now. No delay; state drifts if we wait.
2. MERGE: fyd/edge-port stays isolated initially. Prove against the served tree first.
   Merge only on coordinator evidence that the edge-object journey is green and :3100 will not regress.
   Never merge merely because the branch is ready.
3. ASK FYD SCOPE: include the single SitePatch path in the 24h: "move emergency plumbing first"
   -> proposal -> approval -> journal -> regeneration -> browser. This proves understand -> explain -> change.
   No general conversational editing beyond that one semantic change.
4. NOW-1 ACQUISITION CONTRACT: include, minimum only. Freeze the contract the proof actually needs:
   source identity/digest, observation/evidence provenance, deterministic extraction result,
   visibility, acquisition status, temporal identity for re-observation. Formalize the existing path;
   never create a second acquisition system.
5. DEVICE PROOF: one scheduled human checkpoint. Nolan tests both real sites on his actual phone
   once the visitor journey is green enough to use. Automation covers 320/360/375/390/430 first;
   the phone checkpoint catches what browser assertions don't. Not continuous.

## OPERATIONAL DECISIONS

- Wake lock: per-run scoped lock (acquire -> run -> release), never a global power-policy change. (FYD-028)
- :3100 is protected production. It serves pure HEAD demo-owner mode. It was down ~16 min on 2026-9-24
  (~17:46 broad pkill); recovered via /home/nolan/start-3100.sh, verified healthy. Never broad-pkill again.
- Scratch :3101 is the sprint's mutable surface. Exact-PID targeting only.

## DEEPEST ARCHITECTURAL OBJECTIVE

Prove that one evidence-backed object can travel through the whole system without changing
its identity, authority, provenance, privacy, or meaning:

acquisition -> evidence -> canonical object -> relationship -> SiteSpec -> edge/card
-> expanded object -> Ask FYD -> citation -> owner proposal -> approval -> event
-> projection -> regeneration -> source re-observation

If the chain works, PING has earned its architecture. If it breaks, the break location tells us
which architecture actually matters.

## LANE POSTURE

Demote to cheap read/falsification watch (report P0 security/authority defects only, no writer contention
with the customer journey): TenantOS isolation, Git-ingestion, broad PING archaeology, large swarm harvest.
Wiring beats discovering more capability right now.

## FROZEN UX INVARIANT (whole sprint)

The same object must remain recognizable and useful across:
circle/card -> expanded state -> relationships -> Ask -> owner editing -> history.
Every UI worker targets this one invariant. No competing interpretations.

## REVIEW PRIORITY ORDER (no circle-polishing first)

mobile composition / static scrolling -> unified opening / traversal / dismissal / state ->
media / visual hierarchy -> Ask -> durable owner controls -> source-linked editing.

## HARD FREEZE (no during sprint)

theme marketplace, drag/drop builder, new SiteSpec language, new object authority,
new action authority, new scheduler, new event bus, new memory framework,
generalized FYD Social, second acquisition system, customer-specific renderer,
speculative architecture.

## HOUR PLAN (starting plan; coordinator recomputes every 4h from evidence)

- H0-1 FREEZE REALITY: capture HEADs, worktrees, uncommitted changes, containers, deployed revisions,
  :3100 state, gateway state, routes, test baseline, failing suites, screenshots. Classify old reports:
  CURRENT / SUPERSEDED / REGRESSED / UNKNOWN. One hour max.
- H1-4 MAKE THE EDGES REAL (P0): fix normal mobile margin objects, no objectDebug=1, trace the real
  eligibility path. One complete object experience: edge -> tap -> expand -> relationship ->
  related object -> Ask -> back -> original position. Fix backdrop dismissal, focus containment,
  focus restoration, scroll preservation, relationship direction, traversal callbacks, Ask state.
  No new object framework.
- H4 GATE (375x812): service object at edge, tap, expand, semantic content, relationship, related object,
  Ask knows object, close/back restores position. If not green: no visual polish, keep attacking.
- H4-7 COPPERSMITH COVERAGE + TRADESMAN: inventory material (Business, Services, Projects, People,
  Locations, ServiceAreas, Media, Reviews, Contact, Capabilities, Relationships, Evidence, Unknowns);
  classify RENDERED / REPRESENTABLE_NOT_RENDERED / UNSUPPORTED_SCHEMA / UNSUPPORTED_RELATIONSHIP /
  UNSUPPORTED_PRESENTATION / PRIVATE / CONFLICTED / LOW_CONFIDENCE / IRRELEVANT. Fix only generic
  high-value gaps. No customer-specific branches.
- H7 GATE: HPP vs TRADESMAN(HPP) vs TRADESMAN(COPPERSMITH) share renderer/components/template rules/
  WARM-CRAFT grammar; differ only in objects/relationships/media/capabilities/owner intent.
  Run no-hardcode search.
- H7-9 MEDIA + MOBILE COMPOSITION: wire real object-specific media (Service/Project/Person/Business),
  responsive candidates/crops, test 320/360/375/390/430. Native stable phone scroll, no content dancing.
  Motion only for open/close/select/edit/reorder.
- H9-11 ASK FYD USEFUL: real Coppersmith questions (services? emergency? where? contact? how do you know?
  what don't you know?). Current object follows conversation. Responses distinguish SUPPORTED / PARTIAL /
  UNKNOWN / CONFLICTED / RESTRICTED. UNKNOWN != NO. Use the API's existing classification/unknowns/
  citations/suggested actions/proposals. No new Ask pipeline.
- H11 GATE: service edge -> Ask answers about THAT service; service -> project -> Ask preserves context;
  leave Ask -> return preserves conversation.
- H11-13 PRIVACY / CLAIM SAFETY: HIDE address X; attack recovery through Business, Location, Service,
  Project, traversal, Ask, search, All Objects, serialized state, metadata, citations, image descriptions.
  Public disclosure must be ZERO. Do not delete evidence. Then prove which boundary prevents unsupported
  material claims from going public (audit != enforcement). Bar: 1.000 on golden set + negative adversarial
  proof. Failure blocks the public release path.
- H13-16 OWNER LOOP: real change "Move emergency plumbing first": conversation -> exact semantic proposal
  -> preview -> approve -> journal -> affected projection -> bounded regen -> readback -> browser.
  No manual regen as final product. No optimistic UI. Show PREVIEWED / APPROVED / APPLIED honestly.
- H16 DURABILITY ATTACK: refresh, restart app path, re-observe source, regen again. Owner intent survives;
  source evidence stays source evidence; owner override stays override; generated stays generated.
- H16-18 IDEMPOTENCY / UNKNOWN / SECRETS: hammer approval (duplicate, concurrent, lost response, timeout,
  restart after acceptance): one logical approval, one durable semantic change, UNKNOWN when unprovable.
  ORCA attacks: effect -> worker dies -> UNKNOWN -> HOLD -> no redispatch -> reconcile; try to produce
  two physical effects (P0 if possible). Secret proof via sanctioned injection only; post-proof leak audit
  must show zero secret material in argv/stdout/stderr/reports/chat/scripts/fixtures.
- H18-20 ONE-CLICK OPERATOR FLOW: only if core journey green enough to package. Wrap the existing factory,
  don't build another. URL content is hostile; minimum real SSRF boundary; no second fetch path.
- H20-21 PING DOGFOOD: PING through the same pipeline. Generic failure -> fix; PING-specific desire ->
  express through objects/intent/presentation config. No special renderer.
- H21-22 CROSS-SYSTEM SWARM HARVEST: harvest only P0/P1/high-confidence deletion/broken authority/live
  regression/security isolation/stranded capability. No new features in the final two hours.
- H22-23 FULL GAUNTLET: complete journey at 320/360/375/390/430/desktop (visitor + owner + security paths).
- H23-24 FALSIFICATION / DEMO / NEXT FRONTIER: no new features; run all critics; fix only release-blockers;
  prepare the demo.

## HOUR-24 DEMO (26 beats)

HPP, TRADESMAN(HPP), TRADESMAN(COPPERSMITH) side by side; Coppersmith on phone; edge object; tap; expand;
relationship; related object; Ask FYD; "how do you know?"; evidence; back to exact position; owner
"Move emergency plumbing first"; preview; approve; site changes; refresh; change survives; reobserve source;
regenerate; intent survives; hide address; ask/traverse for address; zero disclosure; one-click operator
preview if core journey cleared.

## COMMAND STRUCTURE

One integration coordinator. Five decision queues: P0 SAFETY, BROKEN END-TO-END ARROW, PRODUCT UX,
RELIABILITY, CLEANUP. Writers claim from queues; one writer per mutable unit. Readers/falsifiers fan out
massively. Coordinator recomputes the critical path from evidence every 4 hours.

## SCOREBOARD (only these)

- end-to-end arrows green / total
- safety seams green / total
- presentation golden pass rate
- customer-specific template code count (target: 0)
- public privacy leak count (target: 0)
- unsupported public claim count (target: 0)
- duplicate consequential effect count (target: 0)
- owner intent survival (boolean per regen)
- cross-tenant leak count (target: 0)
- secret leak count (target: 0)
- mobile journey pass matrix
- one-click e2e status

Never use commits/files/agents/lines as success metrics.

## STOP CONDITIONS

A lane stops mutating when its invariant is proven AND merged state is proven AND no higher-priority
failure remains. Then it becomes cheap watch. Capacity moves. The program does not stop.

## HUMAN INTERRUPTION (escalate only)

credential/authorization action requiring Nolan; irreversible/destructive action; production P0 without
safe repair; canonical production corruption risk; external contact/publication; real financial spend;
material product/business fork not already decided. One question, one action, then execution resumes.

## DEFINITION OF WIN

Coppersmith feels like a great website. The edges reveal a real graph. The objects actually work.
Ask FYD knows what it is talking about. The user can see why. Private means private.
Owner changes are durable. Regeneration does not erase intent. HPP and Coppersmith use the same system.
One-click wraps that system instead of rebuilding it. PING can enter the same factory.
ORCA does not duplicate unknown effects. Tenants do not leak. Proofs do not leak secrets.
Every claim above has evidence.
