# INTERVAL 08 — SINGLE COHERENT ORDER

Date: 2026-09-29 (MDT). Authority: Nolan Geske.
Status: BINDING. This order supersedes all conflicting sequencing in prior
forensic/infrastructure drafts. Those drafts are preserved as reference only;
they are not execution documents and will not be patched.

Repo check (Nolan, 2026-09-29): GitHub shows CRX at 6c4b531, PING at 81b3248;
piging2/fyd remains unavailable through the connected API. 0981cd3 and the
served :3100 proof are Pig-local facts, not independently GitHub-visible facts.

## The threshold crossed

Correction survival is no longer the frontier. It is a proven primitive.
Interval 07 closed P0. DO NOT REOPEN IT. Do not keep testing it while harder
uncertainty sits behind it.

Proven and now regression invariants:
- OWNER CORRECTION -> REGENERATION -> SOURCE REOBSERVATION -> OWNER INTENT SURVIVES
- Why This preserves source/owner distinction
- Turn-origin enforcement
- Acquisition rebuild with zero semantic drift
- Bounded portability proof (passed and stopped)

The reconciled product chain (proven, no longer theoretical):

SOURCE -> EVIDENCE -> OBJECT GRAPH -> WEBSITE
                                 \-> ASK FYD -> WHY THIS -> OWNER CORRECTION
                                     -> AUTHORIZED OWNER STATE -> REGENERATION
                                     -> SURVIVES

Extend it one step (the Interval 08 frontier):

OWNER / MISSION INTENT -> AUTHORIZED ACTION -> ATTEMPT -> OBSERVED RESULT
-> VERIFIED OUTCOME -> DID IT ACTUALLY HELP? -> LEARNING -> REPEATED PATTERN?
-> DETERMINISTIC CAPABILITY

## Decisions

1. CREDENTIAL INCIDENT: authorize immediate REVOKE + ROTATE. Do NOT authorize
   history purge yet. Do not wait for the X rerun (already complete).
2. f21ba933: HOLD. No merge, cherry-pick, delete, or rewrite to eliminate
   ambiguity. Classify unique capability and whether it is already superseded
   on the served line. Then HARVEST or SUPERSEDE.
3. CORRUPT REF: HOLD until archaeology establishes intended target. No deletion
   or repointing of an ambiguous ref. Reflog/object reachability/ancestry first.
4. THREE LANE BRANCHES: converge toward the served line, semantic unit by
   semantic unit. No wholesale merges. Harvest nonduplicated capability with
   explicit-file commits, testing after each group. Duplicated work becomes
   SUPERSEDED, not remerged.
5. WHY THIS + REGEN WHITELIST: open YES, narrowly, for ping-fyd only. Only the
   capability demonstrated in Interval 07. No tenant wildcard, no broader
   mutation privilege.
6. P2 IN INTERVAL 08: YES, but P2 means outcome learning, not infrastructure
   expansion.

## INCIDENT ZERO — CREDENTIAL CONTAINMENT

token.json and .env.base remain live on public constitutional-trunk.
AUTHORIZED NOW: REVOKE + ROTATE. Do not wait for normal lane scheduling.

If the exposed credential can be revoked immediately without breaking the
ability to issue a replacement, revoke first. If service continuity requires
replacement-first, minimize overlap and revoke immediately after consumers
switch. Deleting working-tree files is not containment. Exposed values are
compromised.

Required sequence per credential:
IDENTIFY CREDENTIAL -> IDENTIFY PROVIDER/SCOPE -> IDENTIFY LIVE CONSUMERS
-> ISSUE REPLACEMENT -> UPDATE AUTHORIZED SECRET LOCATION
-> VERIFY CONSUMERS -> REVOKE OLD CREDENTIAL -> PROVE OLD CREDENTIAL FAILS
-> PROVE REPLACEMENT WORKS -> SECRET SCAN -> INCIDENT RECEIPT

Never print replacement secrets into logs, commits, reports, prompts, or
agent context.

HISTORY PURGE IS NOT YET AUTHORIZED. After containment, produce for separate
authorization: AFFECTED COMMITS, AFFECTED REFS, FORK/CACHE EXPOSURE, REWRITE
BLAST RADIUS, RECOMMENDED PURGE, POST-PURGE VERIFICATION.

Rotation is security containment. History rewriting is repository surgery.
Do not conflate them.

## P0 — P2 OUTCOME LEDGER

Build only the smallest reached outcome loop. Before writing, establish:
PING current implementation, FYD current implementation, CRX harvestable
primitive, external harvestable primitive, duplication risk, smallest required
delta. Search first.

Distinguish, never collapse:
PLAN vs AUTHORIZATION vs ATTEMPT vs RESULT vs EFFECT vs VERIFICATION vs OUTCOME.
RESULT is not EFFECT. EFFECT is not SUCCESS. SUCCESS is not BENEFICIAL OUTCOME.

Example: worker says promotion published (RESULT); independent observation sees
promotion (VERIFIED EFFECT); promotion generated qualified inquiries (OUTCOME).

Start with one PING action whose outcome can actually be observed.
No generic analytics platform. No universal reward model.
No autonomous self-modification.

LEARNING LAW: the outcome ledger records observations. It does not
automatically rewrite policy.
OBSERVED OUTCOME -> CANDIDATE LEARNING -> EVIDENCE/SAMPLE SUPPORT -> PROPOSAL
-> PROMOTION AUTHORITY -> DETERMINISTIC POLICY/CAPABILITY.
Owner assertions never decay. Verified facts do not decay merely because time
passed. Learned probabilistic preferences may expire/decay. A model cannot
promote its own inference into authority.

## EVENT FORENSIC — ONE READ-ONLY LANE

Retire the contradictory Event/Matrix orders. One rule: TRACE FIRST, MATRIX
SECOND.

Start at the served bootstrap. Follow one real reached path. Classify
encountered components using exactly this taxonomy and no other:
REACHED-AUTHORITY / REACHED-NONAUTHORITY / UNREACHED-CANDIDATE / COMPETING /
SUPERSEDED / UNKNOWN.

Do not begin from class names. Names discovered along the reached path may
then be searched for competing implementations. The Authority Matrix is an
output, not an input. No patches. No commits required from this lane; its
durable output is incorporated into the coordinator ledger/reference commit.

EVENT PROOF BAR: read-only forensic does not perform destructive replay. It
establishes SOURCE -> REACHABILITY -> EXECUTION -> PERSISTENCE -> CONSUMER.
If an existing test/harness can rebuild a disposable projection without source
modification, run it separately as bounded verification. Otherwise report
REPLAY UNPROVEN. Use precise language: PROJECTION REBUILD PROVEN is not
MISSION REPLAY PROVEN.

## PORTABILITY

Interval 07 already passed the boring portability proof. STOP BUILDING
PORTABILITY. Record exactly what was proven: provider(s), artifact class,
logical identity, digest behavior, application-equivalence checks,
failure/recovery behavior. Anything not exercised remains UNKNOWN. Do not add
Storj, Akash, Hyperdrive, Redis, another storage provider, or another workflow
engine merely to broaden the matrix.

## WHY THIS / REGEN WHITELIST

AUTHORIZED: open narrowly for ping-fyd. Only the capability demonstrated in
Interval 07. Preserve SOURCE X / OWNER Y / Y CONTROLS PRESENTATION while source
provenance remains intact. Regression-test the exact served proof.

## BRANCH CONVERGENCE

Destination: THE SERVED, INTERVAL-07-PROVEN LINE. For each semantic group,
classify: ONLY SOURCE BRANCH / ONLY SERVED LINE / IDENTICAL / SUPERSEDED /
MUST HARVEST / COLLISION. Harvest MUST-HARVEST groups individually. Test.
Explicit stage. Commit. Continue. A branch does not deserve merging because
work happened there. Capability earns convergence.

## f21ba933 — HOLD

Determine: UNIQUE CAPABILITY / REACHED? / ALREADY SUPERSEDED? / MUST HARVEST?
No merge/cherry-pick/delete until answered.

## CORRUPT REF — HOLD

Read-only archaeology: REFLOG / OBJECT EXISTS? / UNIQUE COMMITS? / INTENDED
ANCESTRY? / VALUABLE UNREPRESENTED WORK? If exactly one reconstruction is
supported, propose repoint. If proven obsolete with zero unique value, propose
delete. Otherwise preserve.

## THREE LOOPS (contradiction resolved)

PRODUCT TRUTH LOOP: source -> evidence -> object graph -> owner intent -> projection.
MISSION EXECUTION LOOP: intent -> mission/run -> authorized execution -> evidence/result.
RESOURCE RECONCILIATION LOOP: desired resource state -> observation -> reconciliation
-> authorized effect -> resulting state.

A loop owning semantics is different from a boundary owning side effects.
Product Truth owns business truth. Mission Execution owns authorization and
execution of consequential external effects. Resource Reconciliation owns
desired-versus-observed infrastructure state and may REQUEST an effect; it
does not gain authority to PERFORM it. Routing resource effects through the
execution boundary does not make Mission Execution the owner of resource
semantics.

## NO GIANT SWEEP

Search only in response to a named falsification question. No 60-keyword
inventory. No architecture census. Search breadth expands only when evidence
requires it.

## INTERVAL 08 LEDGER — must answer

1. INCIDENT: Are the exposed credentials revoked? Does independent
   verification prove old authority is dead?
2. OUTCOME: Can one PING action now be traced intent -> authorization ->
   attempt -> result -> verified effect -> outcome?
3. AUTHORITY: What event/execution components are actually reached? What
   remains UNKNOWN?
4. CONVERGENCE: Which lane capabilities reached the served line? What was
   superseded instead of merged?
5. PRODUCT: Did PING gain one visible capability because of this interval?
   If not: NO SUBSTANTIATED INTEGRATION PROGRESS THIS PERIOD.
