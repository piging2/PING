# PRODUCT CRITIQUE — ORCA FINISH PROGRAM

Critic: CRITIC-PRODUCT (independent). Date: 2026-09-23, NIGHT SHIFT.
Stance: I falsify; I certify nothing. Writers never certify themselves.
Method: read-only. Evidence graded STATIC / TEST / LIVE. No commits, no repo writes.

## The critic's test

For every deliverable: who needs this, what painful problem does it solve, what
happens without it? Rendered as: WOULD NOLAN FEEL THIS? (YES / NO / PARTIAL)

Verdict scale: PRODUCT-VALUABLE / ARCHITECTURAL-VANITY / HONEST-BUT-USELESS /
MISLEADING.

---

## TARGET 1: W2-MISSIONS contracts and dry run

### Record: FYD-MISSION-CONTRACT.md (v1.0)

- DOMAIN: product-acceptance
- COMPONENT: FYD mission acceptance contract
- CLAIM: The contract defines what counts as a "verified FYD experience" and closes the mechanism map's UNKNOWN item "FYD mission acceptance."
- EVIDENCE: STATIC (contract text read in full). The dry run (LIVE recon, 2026-09-23 19:35-20:25 MDT) honestly recorded UNKNOWN_WITH_EXACT_BLOCKER for "two authorized business URLs": "No mission brief, state file, memory entry, or factory record supplies two authorized business URLs. None exist on record. Do NOT invent authorization." INPUT CLASS C (new real business URL) is FORBIDDEN without a written authorization record, and there is none. Browser verification and Ask FYD stages are recorded as explicit BLOCKED (lane boundaries honored), and the mission verdict is stated as "would currently stop at NEEDS_OWNER_INPUT / READY_WITH_WARNINGS at best — never READY."
- CALLER: the FYD mission executor (human lane, A5 loop, or ORCA runtime)
- CALLEE: 7 stage gates (acquisition through Ask FYD)
- WRITER: W2-MISSIONS lane
- READER: the mission executor, the independent red-team reviewer, Nolan
- AUTHORITY: the contract itself (versioned, 2026-09-23)
- CLASSIFICATION: **HONEST**
- CONFIDENCE: 0.9
- BROKEN BOUNDARY: none found
- DEPENDENCIES: the two authorized tenants (Happy Place Productions, Coppersmith) for Class A inputs; factory lanes for browser/Ask FYD stages
- AFFECTS AGENTS: every future FYD mission executor; the A7 runner when built

Product call: the framing IS honest about the authorization gap. It does not
imply more than it proves. The dry run refused the obvious cheat (inventing
authorization, contacting a business, publishing) and said so in writing. That
is the behavior Nolan needs from a certification gate, because his business
runs on trust: one unverified "verified" demo shown to a business owner costs
him the relationship. A contract that says "never READY" when evidence is
missing is product protection, even though Nolan will never feel the contract
itself. WOULD NOLAN FEEL THIS? NO directly; he feels it when a bad demo does
NOT reach him.

One sentence overreaches, and it is the single weakest claim in the package:
DRY-RUN-REPORT.md section 5: "the A5 loop is a proven-capable, dormant
coordinator that can run both missions TODAY as supervised single runs."
Proven-capable and dormant since 2026-09-18 is a tension the report admits but
the headline papers over: no A7 runner, no browser capability profile, A6
re-proof unwitnessed, and the loop has never actually run either mission end
to end. "Can run TODAY" implies a demonstrated capability; the evidence proves
a wired-enough design, not a run. Verdict on that sentence: MISLEADING at low
severity. Fix: "can be supervised through both missions as single runs, with
the listed gaps" — same facts, no overclaim.

### Record: CODING-MISSION-CONTRACT.md + dry-run first-broken-step

- DOMAIN: product-acceptance / security
- COMPONENT: coding mission acceptance contract; dry-run broken-step hunt
- CLAIM: "Find the first broken step in the FYD golden path and fix it," with a
  smallest-fix rule and 10 evidence gates.
- EVIDENCE: TEST + LIVE. The dry run executed the lane suites on the Pig
  (branch fyd-factory @ e48ef710): 53 suites / 524 tests, 0 failures — the
  unit level is green, so the contract did not chase a phantom. It then
  located the FIRST broken step by stage order: RENDER stage,
  projection-seam safe-link bypass on the /o object page (QA-HOSTILE evidence,
  reviewed not duplicated): BYPASS A35/A36 — `buildCapabilities` in
  `src/fyd/object/view.ts` interpolates raw contact values into hrefs with no
  safe-link gate; `website: "javascript:alert('A35')"` rendered as a LIVE
  `<a href="javascript:alert('A35')">Website</a>` end to end. BYPASS A44 —
  `<img src="javascript:alert('A44')">` on the hero. A genuine XSS-class hole,
  located to file and line. TD-001 was FALSIFIED under reproduction (recorded
  as MISDIRECTED with evidence, not "fixed"). A smallest-fix plan was handed
  to the owning lane instead of applied across a lane boundary.
- CALLER: coding-mission executor
- CALLEE: golden-path stage order (ACQUISITION -> ASK FYD)
- WRITER: W2-MISSIONS lane
- READER: constitutional sprint (owns golden-path forensics), Nolan
- AUTHORITY: the coding contract v1.0
- CLASSIFICATION: **PRODUCT-VALUABLE**
- CONFIDENCE: 0.85
- BROKEN BOUNDARY: none (lane boundaries honored; implementation handed off)
- DEPENDENCIES: QA-HOSTILE evidence; the constitutional sprint for the fix
- AFFECTS AGENTS: factory coordinator, constitutional sprint

Product call: this is the one deliverable in target 1 that changes what a
business owner experiences: a visitor-facing /o object page that executes
`javascript:` URLs from contact fields is an exploitable product, full stop.
The contract's stage-order discipline ("first broken step," falsified false
positives recorded as MISDIRECTED not fixed) prevented two classic wastes:
fixing a phantom (TD-001) and fixing a later louder bug while an earlier
security hole stood. WOULD NOLAN FEEL THIS? YES — the day a prospect opens the
demo and it does not get them hacked, or the day the sprint applies the fix
and the probe suite goes green. The contract machinery itself: NO; the hole it
found and the phantom it refused: YES.

---

## TARGET 2: Mission Control audit (/mc API)

### Record: the /mc API as an operator product

- DOMAIN: operator-observability
- COMPONENT: `gateway/routes/mission_control.js` (681 lines, mounted at /mc),
  the only live Mission Control (API-only; no rendered run-dashboard UI exists
  in either repo)
- CLAIM (implied): /mc projects real mission state for operators.
- EVIDENCE: STATIC (source reads across mission_control.js, mission_runtime.js,
  mission_scheduler.js, worker_runtime.js, event_to_mission_bridge.js,
  dashboard.js, ui-next MissionControlHeader.tsx; ~30 bounded inspections).
  Field-by-field: 23 fields checked. REAL-backed: objective (creator-dependent),
  principal (often null), run status, ready/running work (direct SQL),
  completed counts (no list endpoint), failures, retries. SYNTHESIZED (must be
  removed or re-backed): ExecutiveDashboard `closure_rate`/`engineering_velocity`
  evaluate to 0 when there is no data (reader cannot distinguish "0% closure"
  from "no merge data"); MissionControlHeader.tsx simulates runtime updates
  with `Math.random()` latency and hardcoded model/gateway status (pure
  fabrication, on the only "Mission Control"-named UI surface); /mc/dashboard
  negative-clamps business metrics, masking anomalies. MISSING: work graph,
  blocked work, attempts (retries counter counts failures not claims; two
  executions indistinguishable), model, tools, per-run capabilities,
  checkpoints, effects, receipts, unknowns, mission-linked artifacts, tests,
  commits. Plus row-vs-journal divergence risk (G-03): complete() writes the
  row before emitting the event; /mc/missions/* and /mc/activity can disagree
  silently.
- CALLER: any operator querying /mc/*
- CALLEE: ping_missions / ping_events in PostgreSQL
- WRITER: gateway team (mainline repo)
- READER: Nolan, future dashboards, audit consumers
- AUTHORITY: the /mc route handlers (no single projection authority; the
  convergence notes specify the typed projection as invention-required)
- CLASSIFICATION: **HONEST-BUT-USELESS** (as an operator product)
- CONFIDENCE: 0.9
- BROKEN BOUNDARY: row-vs-journal divergence (G-03); the fabricated header UI
  is a separate surface misusing the Mission Control name
- DEPENDENCIES: ping_missions schema; the convergence sprint's lineage/
  canonicalization authority for the missing fields
- AFFECTS AGENTS: scheduler, coordinator, any future /mc UI

Product call: Nolan's 7am question is "what ran overnight, what failed, what
is blocked, what needs my decision?" /mc answers the first two at the count
level and cannot answer the last two at all: there is no `blocked` status, no
attempts record, no artifact/test/commit linkage, and the one field that looks
like an answer (retries) has wrong semantics. The SYNTH fields are worse than
missing: a 0% closure rate that means "no data" and a header that invents
latency are the exact failure mode (vibes-as-metrics) the program exists to
kill. The API is honest at its SQL core and useless at its operator surface.
WOULD NOLAN FEEL THIS? NO. There is no rendered UI, and the fields he would
need to act on (blocked, attempts, what the last attempt did) do not exist.

### Record: the audit document itself

- CLASSIFICATION: **PRODUCT-VALUABLE**
- CONFIDENCE: 0.9
- EVIDENCE: STATIC, ~30 inspections, per-field table with one-line evidence each

Product call: the audit prevents real bad decisions. Without it, someone builds
a dashboard on `closure_rate: 0` and reports "engineering velocity is zero," or
treats `retries` as attempts and miscounts recovery. Naming SYNTH vs REAL vs
MISSING before anyone builds on it is the cheapest high-value work in this
target. WOULD NOLAN FEEL THIS? PARTIAL — he feels it as the absence of a
confident wrong number in a future briefing.

---

## TARGET 3: ORCA mechanism verdicts (ORCA-A VERDICTS.md) and C6 mechanism map

### Record: the verdicts documents

- DOMAIN: mechanism-forensics
- COMPONENT: ORCA-A VERDICTS.md (57 probes, 57/57 PASS) and the C6
  ORCA-MECHANISM-MAP.md (22 criteria, 262 mechanism records + 23 red-team
  verdicts consumed)
- CLAIM: ORCA STRONGER->HARVEST on 4 mechanisms, PING STRONGER on 2,
  EQUIVALENT on 2, NOT APPLICABLE on 1; C6: 16 of 22 adoptable, 2 satisfied by
  PING, 3 UNKNOWN with exact blockers, 1 pattern-only harness.
- EVIDENCE: TEST (probe.js/probe2.js, 57 checks, all against scratch temp dirs)
  + STATIC (source reads on both branches). Falsifications with teeth:
  orca-cli's MCP surface is a 4-line stub (README claim falsified); O-1's
  run identity NEEDS-HARDENING; the run-record fencing CAS is detect-not-prevent
  (H4a/H4b: stale holders can still write after losing the lease); zero
  production callers of claimRun/transitionRun/checkpointRun ("shape is proven,
  wiring is not"); PING's payload hash is not key-order stable (H1j: same
  logical payload mints two missions — a real bug); the hung-worker lease hole
  persists (GAP 5: _dispatch awaits with no timeout, Arrow 0 renews forever).
- CALLER: the ORCA FINISH implementation lanes
- CALLEE: the 22 finish criteria
- WRITER: ORCA-A lane, C6 lane
- READER: implementation lanes, Nolan
- AUTHORITY: the verdicts (with probe artifacts) and the map's binding rules
  (README != IMPLEMENTATION; red-team verdicts binding)
- CLASSIFICATION: **PRODUCT-VALUABLE**
- CONFIDENCE: 0.9
- BROKEN BOUNDARY: none (limits stated: U1 run-record wiring unwitnessed,
  U2 wedged-coordinator policy needs Nolan's call)
- DEPENDENCIES: the A5 branch worktree, W2-IMPL-STATE, mainline PING
- AFFECTS AGENTS: every lane that would harvest a mechanism

Product call: these documents are falsification machinery and they worked.
Killing the orca-cli MCP harvest (a stub masquerading as an adapter layer)
before anyone built on it is a decision that would have cost weeks. The
detect-not-prevent caveat on fencing and the zero-production-callers caveat on
the run record stop the program from declaring victory on paper. The
key-order-instability bug (H1j) is a real duplicate-mission defect with a real
operator symptom. WOULD NOLAN FEEL THIS? PARTIAL — he feels it as harvested
code that does not contain a privilege-escalation path (ranks 2/4/8 hardening
was load-bearing, not decorative) and as missions that do not silently
duplicate. He does not feel the verdict documents.

### Record: harvest specs HS-1 through HS-6 (from ORCA-A VERDICTS.md)

- DOMAIN: infrastructure-harvest
- COMPONENT: six specs targeting /home/nolan/ping
  (mission_runtime.js create(); new ping_runs table; ping_attempts table;
  lease_epoch in SQL WHERE clauses; scheduler advisory lock; liveness-checked
  reaper)
- CLAIM: each spec converts an ORCA STRONGER win into a PING change with a
  stated smallest proof.
- EVIDENCE: STATIC (the specs as written). Status: specs only. HS-2's run
  record has zero production callers (U1 open: does the file-substrate CAS
  survive a real multi-process race?); HS-5's scheduler claim has no
  TTL/heartbeat for a wedged holder (U2: needs Nolan's call). The specs are
  explicit that HS-4 must enforce the epoch in the SQL WHERE clause (atomic),
  not copy claimRun's non-atomic read-check-write shape — the harvest learned
  from the probe, which is the honest direction.
- CALLER: future implementation lanes
- CALLEE: PING mission runtime / scheduler
- WRITER: ORCA-A lane
- READER: implementation lanes, coordinator
- AUTHORITY: the verdicts' harvest-spec section
- CLASSIFICATION: **HONEST-BUT-USELESS (today)**
- CONFIDENCE: 0.8
- BROKEN BOUNDARY: none
- DEPENDENCIES: U1 and U2 resolution; the coordinator/scheduler lanes
- AFFECTS AGENTS: scheduler, coordinator, worker supervisor

Product call: are these architectural vanity or measurable product value?
Vanity would be specs that serve the architecture's elegance. These serve the
ordered objective: the 22 finish criteria exist because Nolan ordered "two
real missions through ORCA," and missions through ORCA cannot be honest without
durable run identity (HS-2), attempt records (HS-3), and fencing that survives
a stale worker (HS-4). Each has a stated smallest proof tied to a failure mode
of the actual mission (kill the worker mid-run; race two claims; let a stale
worker complete). HS-1 fixes a demonstrated bug (H1j). So: not vanity. But
product-felt value today is zero: they are paper, unwired, unwitnessed, and
two carry open UNKNOWNs that need real runs or Nolan's call. The honest
version of "which would Nolan feel": HS-1 (fewer duplicate missions) is the
only one with a symptom he would recognize; HS-2 through HS-6 are felt only as
missions that survive interruption instead of corrupting state — invisible
until the night a worker dies mid-mission and the resume is clean instead of
doubled. WOULD NOLAN FEEL THESE? NO today. If implemented and proven under the
interruption drill: PARTIAL (felt as reliability, never as features).

The C6 map's three UNKNOWN_WITH_EXACT_BLOCKER records (13 browser death
recovery, 18 real FYD mission, 19 real coding mission) are the map's most
product-honest output: they name the exact four unspecified items each
(e.g. browser session identity format, profile durability contract, CDP
reattach protocol, side-effect classification) instead of a vague research
note. The W2-MISSIONS contracts have since closed 18/19's blocker (acceptance
contracts now exist); 13 remains genuinely open. That is the correct shape of
an honest unknown.

---

## TARGET 4: FYD factory claims and constitutional sprint forensics

### Record: the owner trust loop (constitutional sprint forensics, FYD-GOLDEN-PATH.md)

- DOMAIN: product-trust
- COMPONENT: owner correction machinery (append-only owner events,
  projection/read-seam composition, refresh digest proof, conflict preservation)
- CLAIM: "The trust loop holds. Owner corrections survive regeneration;
  evidence is never mutated; the two are kept structurally separate."
- EVIDENCE: STATIC + LIVE grep/curl verification against the worktree and the
  deployed app. Corrections are append-only (`object/owner-events.ts:622`);
  source re-ingestion cannot erase owner intent; `refreshSource` returns a
  sha256 digest proof that the owner layer crossed the refresh byte-identical;
  losing claims are preserved with decision trails, not deleted; Ask FYD
  citations distinguish "the owner says X; the site lists Y."
- CALLER: business owner correcting their site
- CALLEE: projection read seam, owner overlay, digest verifier
- WRITER: constitutional sprint / factory lanes
- READER: the business owner (Monument View Coffee Shop conversation is the
  pending real test), the visitor
- AUTHORITY: the binding verifier + owner store (adapter-local)
- CLASSIFICATION: **PRODUCT-VALUABLE**
- CONFIDENCE: 0.85
- BROKEN BOUNDARY: the customize arrow's durability depends on a phantom demo
  journal (127.0.0.1:18199) on the deployed path — approve journals to a
  journal that does not exist, fail-closed with 502 (honest, but the feature is
  inert in production)
- DEPENDENCIES: a real journal; auth credentials (below)
- AFFECTS AGENTS: factory coordinator, future owner-facing surfaces

Product call: this is the capability the Monument View Coffee Shop conversation
depends on. A business owner who corrects their hours and finds them reverted
after a refresh will never trust the product again. Corrections surviving
regeneration with a digest proof is the single most business-owner-felt
mechanism in the factory. WOULD NOLAN FEEL THIS? YES — the moment he tests an
owner correction on a real tenant and it sticks.

### Record: Ask FYD evidence-boundedness (forensics section 3)

- DOMAIN: product-trust
- COMPONENT: Ask FYD answer path (`ask-composer.ts`, `visitor-answer.ts`)
- CLAIM: the answer path consults evidence; there is no LLM in the loop to
  hallucinate from; no-evidence produces honest refusal.
- EVIDENCE: STATIC (grep-verified: zero LLM/AI-SDK references in src/fyd; the
  composer is a pure function of bounded context + question; `noEvidenceAnswer`
  refuses to guess; three non-conflated classification vocabularies).
  Corroborated by factory LANE-ASK: 152/152 ask tests green, 14
  question/site results PASS, UNKNOWN surfaced honestly.
- CALLER: site visitor asking a question
- CALLEE: projection read seam + owner overlay
- WRITER: factory lanes
- READER: the business's customers
- AUTHORITY: the binding verifier (emission gate: UNKNOWN atoms throw)
- CLASSIFICATION: **PRODUCT-VALUABLE**
- CONFIDENCE: 0.9
- BROKEN BOUNDARY: TD-002 (Ask FYD privacy leak) still in flight — the
  visitor-mode privacy boundary is under active investigation, so the
  "evidence-bounded" claim is proven for accuracy, not yet for privacy
- DEPENDENCIES: TD-002 resolution
- AFFECTS AGENTS: factory QA lanes, the Ask lane

Product call: a concierge that cannot invent the business's hours is the
product. An LLM that hallucinates a phone number costs the business real
customers. The LLM-free deterministic composer plus the emission gate is a
capability a business owner experiences directly: every answer is either
cited or an honest "I do not know." WOULD NOLAN FEEL THIS? YES — in any demo
where he asks a question the graph cannot answer and gets refusal instead of
invention.

### Record: the onboarding funnel (auth, verification, BuildBusiness, publish)

- DOMAIN: product-onboarding
- COMPONENT: Google OIDC auth leg, Facebook auth leg, ownership verification
  seam, BuildBusiness operation, publish path
- CLAIM (as implemented): Google auth code-complete (PKCE, JWKS, typed
  failures); Facebook auth absent; ownership verification has exactly one
  implemented method (operator-attestation, honestly labeled "a statement, not
  a cryptographic proof"); BuildBusiness does not exist (pipeline is
  components, not one operation); no publish route exists (demo denies
  owner.publish as an external effect).
- EVIDENCE: STATIC + LIVE. Live 2026-09-23: `/api/fyd/auth/google/start` →
  503 AUTH_NOT_CONFIGURED; session → `{"authenticated":false}`. Provider-console
  credentials not installed. No Facebook Login anywhere in src/fyd. Five real
  verification methods declared `implemented:false`.
- CALLER: a business owner trying to claim their site
- CALLEE: n/a (absent)
- WRITER: constitutional sprint / factory lanes
- READER: any prospective real business owner
- AUTHORITY: the forensics (which labeled these BROKEN/absent honestly)
- CLASSIFICATION: **HONEST-BUT-USELESS** (for a real business today)
- CONFIDENCE: 0.95
- BROKEN BOUNDARY: the funnel's front half is code-complete but operationally
  hollow; the forensics are honest about every gap
- DEPENDENCIES: Google provider credentials (procedural); a real verification
  method; BuildBusiness orchestration (Phase 17); a publish gate with human
  sign-off
- AFFECTS AGENTS: factory orchestration lane, Nolan (credential install is his
  procedural step)

Product call: this is the gap between "verified in code" and "usable product."
No owner can onboard today: no working auth on the deployed app, no real
ownership verification, no single build operation, no publish. The forensics
are exemplary in their honesty (every arrow labeled VERIFIED / PARTIAL /
BROKEN / BROKEN-BY-DESIGN with file:line evidence), which is why the verdict
is HONEST-BUT-USELESS and not MISLEADING: the documents never claim an owner
can use this. But the product truth is stark: the factory can render honest
demo sites for fixtures; it cannot take a single real business from URL to
live site. Nolan's actual need (Monument View Coffee Shop, then real
outreach prospects) is blocked here, not in the mechanism map. WOULD NOLAN
FEEL THIS? YES — the moment he tries to onboard a real owner and hits the
503.

### Record: LANE-ASK concierge (built, unwired)

- DOMAIN: product-capability
- COMPONENT: `src/fyd/ask/concierge.ts` (pure deterministic concierge, 28
  tests) + `patches/ask-concierge-wire.patch` (unapplied)
- CLAIM: minimal evidence-backed concierge answering 7 canonical questions;
  every claim graded; throws rather than render uncited claims.
- EVIDENCE: TEST (28/28 concierge tests, 152/152 full ask suite) + STATIC
  (MISSION-STATE.md: "WIRING GAP BY DESIGN: concierge not wired into live
  surface. Shared src/fyd/ask/answer.ts untouched.")
- CALLER: the ask pipeline (not yet)
- CALLEE: the visible object graph
- WRITER: LANE-ASK
- READER: site visitors (not yet)
- AUTHORITY: the patch proposal (coordinator integrates)
- CLASSIFICATION: **HONEST-BUT-USELESS** (until wired)
- CONFIDENCE: 0.9
- BROKEN BOUNDARY: none (the gap is declared)
- DEPENDENCIES: coordinator applying the patch (git apply + suite re-run)
- AFFECTS AGENTS: factory coordinator

Product call: a tested capability that changes no visitor's experience is
potential energy, not product. The honesty ("wiring gap by design," patch
verified git-apply-clean) keeps it from being misleading, but until the
coordinator applies it, the 28 green tests are a private victory. This is the
factory's recurring pattern to watch: building capabilities faster than wiring
them. WOULD NOLAN FEEL THIS? NO — until the patch lands.

### Record: visual-critic FAIL + factory QA posture

- DOMAIN: product-quality
- COMPONENT: VISUAL-CRITIC desktop/mobile harness (VQ-001 motion gates
  content, VQ-002 contrast, VQ-004 zero media, +6 more); Nolan's 2026-09-23
  steering: "QUALITY BEFORE PURITY," "tests pass never proves looks," visual QA
  aggressive
- CLAIM: demos are not gate-ready; visual quality is judged by the critic, not
  by test counts.
- EVIDENCE: TEST (critic JSON) + STATIC (MISSION-STATE.md). The dry run
  corroborated: "any demo grades against this [contract], nothing else" and
  screenshots without critique JSON are not evidence.
- CALLER: the factory QA swarm
- CALLEE: rendered demo routes
- WRITER: VISUAL-CRITIC lanes
- READER: Nolan, the coordinator
- AUTHORITY: the critic harness + Nolan's steering
- CLASSIFICATION: **PRODUCT-VALUABLE** (the honesty, not the demos)
- CONFIDENCE: 0.85
- BROKEN BOUNDARY: none
- DEPENDENCIES: the render fixes the critic demands
- AFFECTS AGENTS: factory build lanes

Product call: a visual critic that FAILs the demos is more valuable than a
test suite that passes them, because Nolan's product courtroom is the rendered
page on his phone. The steering ("tests pass never proves looks") is the
correct product instinct, and the critic enforces it mechanically. WOULD NOLAN
FEEL THIS? YES — as demos that stop looking broken before he sees them.

---

## TARGET 5: Agent 10 self-improvement audit

### Record: the audit document

- DOMAIN: meta (the loop that improves the system)
- COMPONENT: SELF-IMPROVEMENT-AUDIT.md (13 stages traced across 3 substrates,
  live DB queried 2026-09-23 ~20:30 MDT)
- CLAIM: "The loop does NOT close... a commentary pipeline, not an improvement
  pipeline." Six distinct breaks; recommendations never execute (highest
  leverage).
- EVIDENCE: LIVE (DB counts: 18 each of OBSERVATION/C
...[truncated 6902 chars]