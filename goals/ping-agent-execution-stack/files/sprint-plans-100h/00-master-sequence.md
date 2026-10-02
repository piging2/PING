# 600-HOUR PROGRAM: MASTER SEQUENCE (Revision 2, 2026-09-30 ~18:47 MDT)

Binding: CEO-ORDER-600H-MASTER-DIRECTIVE-2026-09-30.md. PLAN ONLY. No execution.

This revision supersedes the wave plan of Revision 1. The decomposition (six 100-hour
sprints) stands. The structure changes: six VERTICALS OVER ONE PING SEMANTIC/CONTROL
PLANE, not six islands. The program is judged by the seventh deliverable
(07-integrated-proof.md): six green dashboards with no lossless
TENANT -> MISSION -> ORCA -> JEV -> APPROVAL -> FYD EFFECT -> VERIFICATION -> OUTCOME
path is a failed program.

## 1. The shared contract spine

Every sprint extends the same lifecycle. No sprint owns the lifecycle; each owns
contracts within it:

SOURCE / HUMAN INTENT
-> OBSERVATION
-> EVIDENCE
-> OBJECTS + RELATIONSHIPS
-> MISSION / PLAN
-> ROUTING
-> EXECUTION
-> RESULT
-> JUDGMENT
-> AUTHORIZED EFFECT
-> VERIFICATION
-> OUTCOME
-> LEARNING / NEXT ACTION
-> MULTIPLE PROJECTIONS

Governing rules: PING OWNS MEANING. RENT COMMODITY MACHINERY. WRAP PROTOCOLS.
ISOLATE EXPERIMENTS. Readability is separated from actuation: reading an object
never implies permission to act on it. HTML, Markdown, structured JSON, MCP/WebMCP
tools, search documents, and social representations are projections from governed
semantic state, never independent truth stores.

No sprint invents a parallel identity authority, mission authority, event authority,
capability authority, object authority, judgment authority, scheduler, event store,
workflow engine, or tenant model.

Two architecture calls are locked:
(a) Finding-set persistence is the immediate shared dependency, above UI work in
the Mission Control and ORCA plans. Until the scheduler seam is lossless, ORCA
chaining, JEV judgment, Mission Control inspection, and evidence-driven follow-up
are partly fictional.
(b) JEV starts as a typed shadow judgment plane. Baseline behavior remains
authoritative while JEV is measured against real ORCA findings and the Ask FYD
gold set. Only a later convergence decision grants it more influence.

## 2. Contract / mutation-owner map

Exactly one mutation owner per contract. Other lanes READ and PROPOSE; one writer
merges contract changes. Within a sprint that owns multiple contracts, one writer
per contract, serialized; max 3-4 writers per sprint.

| Contract | Mutation owner | Readers / proposers |
|---|---|---|
| tenant contract | 01 TenantOS | 02 (projection), 03 (scoping), 06 (falsifies isolation) |
| capability contract | 01 TenantOS | 02 (approval UX), 03 (eligibility), 05 (policy dimension) |
| mission contract | 02 Mission Control | 03 (consumes), 06 (falsifies lifecycle) |
| route contract | 02 Mission Control | 03 (consumes), 06 (falsifies routing) |
| brief contract | 02 Mission Control | 03 (consumes), 06 (falsifies staleness) |
| result/finding contract | 02 Mission Control | 03 (writes content via canonical mission system only), 05 (judges), 06 (falsifies loss) |
| event transition contract | 02 Mission Control | all (emit via canonical transitions only) |
| verification/outcome contract | 02 Mission Control | 04 (verifies regen), 06 (defines gates against it) |
| judgment contract | 05 JEV | 02 (projects shadow verdicts), 03 (receives), 06 (falsifies) |
| SiteSpec contract | 04 Website Building | 05 (judges proposals), 06 (falsifies), 02 (projects) |
| integrated test harness | 06 Tests (coordination surface, not a semantic contract) | all six contribute seam tests |

03 ORCA owns no shared contract: it reads mission/route/brief contracts and writes
finding content only through the canonical mission system. The awaiting-approval
interrupt, if required, belongs to the MissionRuntime lineage owner, never ORCA.
06 Tests owns no product contract: it reads all ten and proposes; its authority is
the gate, never the semantics.

## 3. Dependency map (hard edges only)

- Tests P0 gate (ONE SHA, ONE CLEAN WORKTREE, ONE COMMAND, ONE ENVIRONMENT
  CONTRACT, ONE EXIT CODE) resolves the current test-suite contradiction before
  any sprint's gate is trusted. No sprint declares green on a disputed suite.
- 02 P0 (finding-set persistence seam: typed research contract, deterministic
  stateless route compiler, losslessness gate, finding-set persistence by
  digest/reference, extended plan validator, typed executor briefs; plus the trace
  tenant projection fix) is the immediate shared dependency. It sits above UI work.
- 03 ORCA P0 starts AFTER the 02 seam is proven lossless. Hard gate.
- 05 JEV needs the Ask FYD gold set (from 04) and real ORCA finding sets (via the
  02 seam) before shadow evaluation is meaningful.
- 04 Website Building has no dependency on the P0 worker contract; it builds the
  product path while 06 owns the gold set and falsification.
- 01 TenantOS runs the capability test matrix on the EXISTING system; attenuation
  machinery is built only if a concrete matrix case fails. The v0 credential
  boundary must be located and confirmed before the attenuation experiment.
- Phase A capability vocabulary archaeology (priority 5) produces the one vocabulary
  decision that 02 (compileRoute), 03 (executor binding), and 05 (policy dimension)
  all consume.

## 4. PHASE A: contract freeze / archaeology

All six sprints identify EXISTING semantic owners first. No writer starts
implementation before the pre-sprint authority-overlap search (standing law) covers
the full repo, history, and every worktree.

Output of Phase A: one dependency map, one writer map, one contract map
(sections 2 and 3 above are their first drafts; Phase A freezes them).

Priorities, in order:
1. Finding-set persistence (the scheduler seam; 02 owns the contract).
2. Typed research contract (02 owns; 03 consumes).
3. Route compiler / losslessness gate (02 owns; DO NOT ROUTE is fail-closed).
4. Tenant trace propagation (payload carries tenant; trace must not show UNKNOWN;
   02 fixes, 01 defines the tenant contract).
5. Capability vocabulary archaeology (one owner decision; 01 runs the matrix on
   the existing system first).
6. Integrated test harness around these seams (06 coordinates; every sprint adds
   tests around the semantic owner it changes).

WHY: ORCA and JEV cannot become real if Mission Control loses the worker result.

Phase A exit: the contract map is frozen, the writer map is assigned, and the
priority-1 seam has a failing-then-fixed acceptance test (the scheduler drops a
finding set today; the test proves it, then the fix proves lossless).

## 5. Tracks (after Phase A contracts hold)

TRACK 1: TenantOS isolation/capabilities. Archaeology-first; the two-tenant
isolation P0 proof; CG-001 machine-observable decision authority; capability test
matrix on the existing system. Exit: a tenant owns an identity/object graph,
operates agents against it, delegates bounded capabilities, maintains private
context, and proves cross-tenant isolation.

TRACK 2: Mission Control + ORCA. 02 implements the D1-D6 seam, the trace tenant
fix, then the full identity-to-outcome chain projection with consequence-tiered
approval UX. 03 runs the ORCA loop (typed brief -> acquire -> observe -> analyze ->
findings -> claims -> uncertainty -> next-action proposal) with acquisition
evidence for every claim, hard-gated on the 02 seam. Exit: a real user runs a
mission end to end in MC without logs or DB; ORCA hands persisted, traceable
findings back through the canonical mission system.

TRACK 3: FYD + Ask FYD. The compiler, not Wix. P0 Ask FYD gold set (unsupported
answer: UNKNOWN, no plausible filler), P1 WHY THIS, P2 CONFIRM/CORRECT/HIDE,
P3 typed SiteSpec patch from conversational change, P4 second observation with
correction survival, P5 readability proof: HUMAN_HTML, AGENT_MARKDOWN,
STRUCTURED_JSON, AVAILABLE_CAPABILITIES from the SAME object graph. Exit: paste
URL -> trusted presence -> Ask FYD -> evidence -> correction -> conversational
change -> regeneration, human and agent representations from one semantic state.

TRACK 4: JEV shadow evaluation. Taxonomy archaeology first (no canonized labels
until lineage is known). Baseline harness, then shadow evaluation on the Ask FYD
gold set and real ORCA findings with typed output (verdict, dimensions,
evidence_refs, failures, uncertainty, recommended_disposition). Owner-attributed
calls with per-tier budgets so the ownerless-call failure class cannot recur.
Exit: JEV judges real outputs in shadow, explains each judgment with evidence,
and produces a measured lift-or-honest-no-lift verdict before any routing or
effect authority.

TRACK 5: Hostile tests continuously attack all tracks. The eleven lifecycle seams
(SOURCE->OBSERVATION through VERIFICATION->OUTCOME) against the hostile classes
(nondeterminism, tenant leakage, visibility bypass, capability bypass, lost
finding sets, fabricated research, stale briefs, duplicate effects, partial
success, UNKNOWN outcomes, replay divergence, source conflicts, prompt injection,
malicious source URLs, unsupported factual claims, dirty-worktree contamination,
restart/sleep interruption, credential leakage, provider failure, projection
drift). Every sprint adds tests around the semantic owner it changes. Exit: the
integrated golden path survives hostile tests with its green replayed from a
clean checkout.

Stop adding features. Run the master scenario (07-integrated-proof.md). Every
broken seam becomes the queue. First broken seam wins.

## 6. Parallelism and collision analysis

After Phase A: TRACK 1 (01), TRACK 3 (04), and TRACK 5's harness work (06) can
run in parallel on disjoint mutation surfaces (tenant/capability vs SiteSpec vs
harness). 01 may trail by days if the tenant-field freeze from Phase A priority 4
is late; that is a schedule slip, not a redesign.

TRACK 2 (02 then 03) and TRACK 4 (05) run once their gates land. 03 has the
hardest gate (the 02 seam plus the capability vocabulary). 05 can pull forward
into late TRACK 2/3 once the gold set and the first real finding sets exist.
06's hostile suite runs continuously against every track; it never blocks a
track's wiring work, but no track declares its exit green until its hostile gate
passes.

Single decisions consumed by many (decide once): the capability vocabulary
(Phase A-5), the gold-set corpus (06 corpus keeper, 04 and 05 consume), the
worker contract (02 owns, all consume read-only), the canonical test gate
(06 owns).

## 7. Start-gate checklist (the program waits on these)

1. The six revised plans are filed and conform to the per-plan template (done,
   2026-09-30).
2. This master sequence and the contract map are reviewed and frozen.
3. Tests P0 gate resolves the suite contradiction: one SHA, one clean worktree,
   one command, one environment contract, one exit code.
4. Phase A priorities 1-6 are staffed with named writers per the writer map.

## 8. Program acceptance

The program is accepted when the seventh deliverable's scenario runs end to end
with every step's acceptance test green, replayed from a clean checkout, and
every broken seam found along the way is recorded as permanent regression
knowledge. Per-sprint exits are necessary but not sufficient.

## 9. Program risks (named up front)

- Phase A lateness cascading into TRACK 2 and TRACK 4. Mitigated: roughly half
  the hours are Phase-A-independent (04 product path, 01 archaeology, 06 harness).
- Capability-vocabulary deadlock (one decision, many consumers). Mitigated: the
  decision is archaeology-first and time-boxed in Phase A-5; token-name routing
  stays until the vocabulary lands.
- Gold-set contention between 04 (builds the path), 05 (judges against it), and
  06 (owns the corpus and hostile expansion). Mitigated: single corpus keeper
  (06); consumers read, never fork.
- 02 owns six contracts; writer discipline is the risk. Mitigated: one writer per
  contract, serialized; no parallel mutation of shared semantics.
- JEV non-determinism leaking into gates. Mitigated: JEV never enters PR gates;
  shadow only until the convergence decision.
- The 04 extraction gap (service facts as free prose). Mitigated: bounded
  fallback is explicitly typed INFERRED, never silent prose-as-fact.
- x-mc-tenant is assert-not-authorize (found by 01 revision). Scopes the P0
  wiring; it is a measured gap, not a surprise.

## 10. What this program explicitly will not do

No parallel authorities, stores, schedulers, event stores, workflow engines, or
tenant models. No new capability attenuation machinery until a concrete matrix
case fails. No JEV production authority before measured lift. No test repository;
the actual owners are tested. No mock Mission Control. No scraping our HTML back
into Markdown. No declaring any sprint green on a disputed suite. No six
impressive subsystems in place of one coherent PING.
