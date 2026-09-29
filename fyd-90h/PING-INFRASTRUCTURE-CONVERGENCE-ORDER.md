# PING INFRASTRUCTURE CONVERGENCE ORDER

Issued by Nolan Geske, 2026-09-29. Binding. This order refines the
free-tier infra thesis (2026-09-29, `421e1fc`): the thesis's ToS and
limit findings stand, but the architectural decision is now
Cloudflare-first. Oracle is NOT the primary control plane.
"Decentralized" does NOT mean blockchain-first.

---

## The architecture decision

For exploratory PING, do not make Oracle the primary control plane and do
not make "decentralized" mean blockchain-first. The easiest scalable design
is a **portable PING control state + disposable/reconstructible execution
cells**. Cloudflare is currently unusually strong as the first managed
edge/durability substrate; S3-compatible storage gives the portability
seam; ordinary VPS/Oracle/Akash become interchangeable heavy-compute
workers.

The existing TenantOS law already contains the right abstraction:
capability is durable, provider is implementation detail, and tenant state
must survive provider replacement.

## What to actually run for PING

**Control/edge:** Cloudflare Workers + Durable Objects + Workflows +
Queues. Cloudflare Workflows now gives durable steps, persisted progress,
automatic retries, waits for external events/approvals, and failure
recovery. Critically, completed steps don't simply restart after
infrastructure failure.

**Blob/evidence/media:** R2 behind an S3-compatible ObjectStore contract.
R2 currently includes 10 GB-month, 1M Class-A and 10M Class-B operations
monthly free, with no Internet egress charge. For an actual decentralized
second placement, Storj exposes S3-compatible distributed object storage,
making it a much cleaner optional replica/backup target than embedding
IPFS semantics into FYD.

**Canonical relational state:** keep the existing reached PING Postgres
initially. Do not migrate canonical truth to D1 just because Cloudflare
is convenient. Cloudflare Hyperdrive can front existing Postgres/MySQL,
including AWS, Neon and other compatible databases, without changing the
underlying DB contract.

**Coordination:** first determine whether Durable Objects/Workflows
eliminate the need for Upstash. Durable Objects are explicitly intended
for coordination/stateful distributed applications, and SQLite-backed DOs
are available on Free. Don't provision Redis because the old diagram
contained Redis.

**Heavy/background compute:** make it an interchangeable worker pool:

existing Pig/Oracle → cheap VPS → Cloudflare Container → Akash → future worker

Cloudflare Containers now scale to zero and are billed only while active;
Akash provides a genuine marketplace where independent providers bid to
host specified CPU/RAM/storage workloads. Do not put canonical state on
Akash. Use it as another execution target. Compute should be disposable.

## Target architecture

```
                         PING TENANT
                             │
                     MISSION CONTROL
                             │
                            ORCA
                             │
                    deterministic plan
                             │
                    ┌── TenantOS ──┐
                    │              │
              CAPABILITY MAP   PLACEMENT MAP
                    │              │
          ┌─────────┼──────────────┼─────────┐
          │         │              │         │
       STATE     OBJECTS        EXECUTION   EDGE
          │         │              │         │
      Postgres    S3 API        Worker API   CF
          │         │              │
          │     ┌───┴────┐    ┌────┼────────────┐
          │     │        │    │    │            │
          │     R2     Storj Pig/Oracle   CF Containers
          │                       │            │
          │                     Akash      future VPS
          │
          └──────── CANONICAL TENANT STATE
```

## The reconciler (self-healing mechanism)

PING doesn't synchronize providers. PING records desired state.
Reconcilers compare:

```
DESIRED STATE
     ↓
OBSERVED STATE
     ↓
DIFF
     ↓
AUTHORIZED ACTION
     ↓
WORK ORDER
     ↓
EXECUTION
     ↓
INDEPENDENT OBSERVATION
     ↓
VERIFIED STATE
```

That is the self-healing mechanism. A dead worker doesn't damage PING. A
dead provider doesn't redefine PING. A timed-out API call doesn't become
"failed, retry blindly." It becomes:

UNKNOWN → HOLD → OBSERVE → RECONCILE → RETRY/MIGRATE

That is vastly more important than whether the worker happens to run on
Oracle or Akash.

## Don't build distributed consensus

This is the trap. You don't need PING running Raft across Oracle + AWS +
Akash + Cloudflare. You need central logical authority with decentralized
replaceable execution and replicated content-addressed artifacts. Those
are different things.

For the exploratory tenant: one authority, many placements. Later, if PING
actually discovers a product requirement for multi-writer/offline
sovereignty, then CRDT/consensus work earns consideration. Right now
distributed consensus would be architecture theater.

## Cloudflare got more interesting since the earlier thesis

Cloudflare Workflows now supports durable multi-step execution, retries,
waits, and human approval. It also added saga-style rollback handlers
specifically for multi-step external operations such as provisioning
resources. That's remarkably close to part of ORCA's required execution
semantics.

But don't replace ORCA with Workflows. Harvest this relationship:

ORCA owns: intent, plan, authority, semantics, verification policy.
Workflow engine owns: sleep, wake, checkpoint, retry scheduling, durable
execution mechanics.

That separation is excellent. And Cloudflare explicitly warns that
retryable steps should be idempotent. That's compatible with the PING law
rather than replacing it.

## Where decentralization belongs

Use decentralization selectively.

- **Storage:** strongest candidate. Immutable evidence/media/artifacts can
  be content-addressed, checksummed, replicated across multiple
  S3-compatible destinations, and reconstructed from a manifest.
- **Compute:** second strongest. WorkOrder doesn't care whether Worker A
  is Pig, Oracle, Akash, Cloudflare Container, or some future customer's
  own server, provided eligibility and verification are equivalent.
- **Read projections:** easy to distribute because they're rebuildable.
- **Canonical authority:** don't decentralize yet.
- **Secrets:** definitely don't spray across providers.
- **Owner identity:** portable, but one semantic authority.
- **Mission state:** durable and exportable, not multi-master simply for
  philosophical decentralization.

The sweet spot: decentralized placement without decentralized truth.

Don't equate decentralization with a specific decentralized-storage
protocol. The first useful property is replaceability. A tenant whose
state is exportable, content-verifiable, provider-independent, and
reconcilable across multiple placements is substantially more sovereign
than one whose "decentralized" app is nevertheless coupled to one
gateway, one indexer, or one vendor.

## Feedback into PING

Every placement should teach TenantOS. Not with an LLM memory blob. With
structured outcomes:

```
PlacementDecision
  requested_capability
  requirements
  candidates_considered
  selected_provider
  expected_cost
  expected_latency
  reason

ExecutionOutcome
  actual_cost
  actual_latency
  success
  retries
  availability
  failure_class
  recovery_time
  migration_cost
  verification_result
```

Now ORCA's next placement can improve. Eventually:

"R2 has been cheaper and more reliable for this workload class."

doesn't need to remain an AI observation. Compile it into deterministic
policy:

```
if workload == PUBLIC_IMMUTABLE_MEDIA
and r2.health == GREEN
and projected_usage <= budget
and portability == S3_COMPATIBLE:
    prefer R2
```

That fulfills the deeper objective: intelligence leaves software behind.

## Akash note

Akash Network is interesting specifically because it gives TenantOS a
fundamentally different compute substrate rather than another hyperscaler
adapter: PING declares CPU/memory/storage requirements, independent
providers bid, and a lease supplies the compute. That makes it an
excellent later portability adversary. But don't start there. For PING
right now, the highest-leverage combination is: existing Postgres
authority + Cloudflare edge/durable execution + S3-compatible portable
artifacts + replaceable compute workers. Then prove failure recovery.

---

## PING INFRASTRUCTURE CONVERGENCE ORDER

PING remains the only exploratory tenant.
Do not build infrastructure for hypothetical tenants.

TARGET: Make PING survive loss/replacement of execution and storage
infrastructure without making PING itself responsible for operating every
server.

Before writing: FYD CURRENT IMPLEMENTATION / PING EXISTING IMPLEMENTATION
/ HARVESTABLE CODE / DUPLICATION RISK / SMALLEST REQUIRED DELTA. Search
both canonical repos first.

ARCHITECTURAL LAW:
- TENANT ≠ HOST
- CAPABILITY ≠ PROVIDER
- LOGICAL STATE ≠ PLACEMENT
- WORK ORDER ≠ WORKER
- PROVISIONING RECEIPT ≠ VERIFIED EFFECT
- REPLICATION ≠ AUTHORITY
- DECENTRALIZED EXECUTION ≠ DECENTRALIZED TRUTH

PING CONTROL STATE: Keep existing reached PING Postgres as canonical
relational state until a reached failure justifies migration. Do not
rewrite canonical truth into D1. Do not introduce another event store.

EDGE / DURABLE EXECUTION HARVEST: Read-only investigate Cloudflare
(Workers, Durable Objects, Workflows, Queues, R2, Hyperdrive, Containers).
Search PING/TenantOS/ORCA first for existing equivalents. Harvest only
missing mechanics. ORCA retains semantic ownership. External workflow
engines may provide checkpoint, sleep, wake, retry scheduling, rollback
mechanics. They do not become authority.

STORAGE: Establish one provider-neutral S3-compatible object boundary if
an equivalent does not already exist. First implementation: R2. Second
proof target: another S3-compatible destination (candidate: Storj, or an
already-owned/local S3-compatible target). Do not migrate production
merely to demonstrate portability. Use a disposable PING artifact set.
Prove: same logical object ID, same digest, same provenance, same
consumer behavior after placement changes.

COMPUTE: Worker execution must be replaceable. Existing Pig/Oracle
compute is allowed. Research Cloudflare Containers and Akash only as
alternative worker placements. A worker receives a bounded WorkOrder. A
worker does not own mission truth. A worker disappearing leaves UNKNOWN,
not FAILED. Reconciliation determines whether execution occurred. Only
then redispatch or migrate.

SELF HEALING: Do not implement self-healing as "process crashed →
restart." Implement: DESIRED STATE → OBSERVE → DIFF → CLASSIFY →
AUTHORIZE → RECONCILE → VERIFY. Provider failure is just another
observation. If R2 becomes unavailable: PING remains PING. If Oracle
dies: PING remains PING. If Akash lease disappears: PING remains PING. If
Cloudflare has an outage: PING's canonical portable state remains
recoverable.

FEEDBACK: Every provider execution records expected versus actual: cost,
latency, success, retries, failure class, availability, recovery time,
verification result. Mission Control must eventually answer: WHAT POWERS
PING? WHAT IS UNHEALTHY? WHAT CAN MOVE? WHAT WOULD MOVING COST? WHAT DID
WE LEARN FROM PREVIOUS PLACEMENTS?

FIRST PING PROOF: Do not build the whole matrix. Pick one noncanonical
artifact class (recommended: FYD media/evidence derivative). Put it
through: logical artifact → placement → R2 → independent digest
verification → second S3-compatible placement → independent digest
verification → switch active placement → application behavior unchanged.
Then deliberately make one placement unavailable. Prove: DEGRADED/UNKNOWN
→ OBSERVE → RECONCILE → SECOND PLACEMENT without changing
business/object/evidence identity. THAT IS THE FIRST SELF-HEALING
TENANTOS INFRASTRUCTURE ARROW. Commit it. Stop. Reassess. Do not build
more infrastructure until that arrow proves which abstraction is real.

---

## TENANTOS — STOP ARCHITECTING. PROVE PORTABILITY.

The architecture thesis is accepted:

- TENANT OWNS AUTHORITY + BUSINESS STATE.
- FYD/PING OWNS PORTABLE LOGICAL STATE.
- TENANTOS OWNS PLACEMENT DECISIONS.
- PROVIDERS OWN PHYSICAL RESOURCES.
- HOST ≠ OWNER. CAPABILITY ≠ PROVIDER. PLACEMENT ≠ IDENTITY.
- FREE TIER ≠ ARCHITECTURE.

NOW PROVE IT WITH ONE REAL CAPABILITY.

DO NOT start with databases. DO NOT move ping_events. DO NOT build
generic multi-cloud orchestration. Use FYD's immediate media requirement
as the forcing function.

Requirement: PING needs durable public media/assets for generated FYD
experiences. Search existing PING/FYD/ORCA/TenantOS first for: artifact
stores, blob stores, media stores, S3 adapters, R2 adapters, object
storage, content-addressed storage, digest utilities, provider
registries, secret adapters, resource manifests, health checks,
migration, replication, verification. HARVEST BEFORE WRITING.

Derive the smallest existing-compatible contract capable of: PUT, GET,
HEAD, DELETE where authorized, LIST only if actually required, VERIFY
DIGEST, COPY/MIGRATE.

Application semantics must deal in: ASSET ID, DIGEST, MEDIA TYPE, SIZE,
PROVENANCE, VISIBILITY, LOGICAL PURPOSE. Not: R2 bucket key, S3 ARN,
Oracle namespace. Provider coordinates belong beneath the capability
boundary.

Media evidence/projection rule (coordinator recommendation ACCEPTED,
implementation DEFERRED — circle back when everything else finishes):
for media legitimately authorized for the FYD/PING exploratory tenant,
acquire and serve FYD-managed derivatives rather than depending on
permanent hotlinks. BUT preserve: ORIGINAL SOURCE URL, OBSERVED_AT,
CONTENT DIGEST, MEDIA TYPE, RIGHTS/AUTHORIZATION BASIS, DERIVATIVE
DIGEST, TRANSFORMATION RECIPE, CURRENT PLACEMENT. Do not pretend that
public visibility automatically grants arbitrary reuse rights. Do not
make remote URLs canonical media identity. SEPARATE THEM. EVIDENCE SIDE:
what bytes were observed, where, when, digest, provenance,
authorization/rights basis. PROJECTION SIDE: which optimized derivative
the FYD experience currently serves. Join through stable digest/asset
identity. Changing JPEG → AVIF, R2 → another object store, thumbnail
dimensions, or CDN URL does NOT rewrite source evidence.

For this proof, implement only enough planning to choose among resources
that ACTUALLY EXIST in the authorized test environment. Conceptually
evaluate: CAPABILITY FIT, SECURITY, DURABILITY, PORTABILITY, AVAILABLE
QUOTA, CURRENT COST, EXPECTED COST, HEALTH, TENANT POLICY. Do not build
an AI cloud optimizer. Selection should initially be deterministic.

Take the SAME FYD media asset. Place it through the SAME capability
contract into TWO independently replaceable storage implementations.
Prefer an existing authorized S3-compatible/local implementation plus the
best existing authorized object store. Do not create accounts merely for
the experiment. Prove: SAME LOGICAL ASSET ID, SAME SOURCE DIGEST, SAME
APPLICATION API, SAME FYD PAGE BEHAVIOR, DIFFERENT PHYSICAL PLACEMENT.
Then switch placement. FYD renderer must not change. SiteSpec must not
change merely because storage provider changed. Ask FYD must not care.
THAT is provider optionality.

Then make one disposable placement unavailable. Expected: PLACEMENT
HEALTH → FAILED / UNKNOWN. Tenant capability remains DURABLE_PUBLIC_MEDIA
but fulfillment becomes degraded. TenantOS should: detect, hold unsafe
writes if necessary, select authorized recovery target, copy/restore,
verify digest independently, activate replacement placement.
Business/object identity does not change. No provider outage is allowed
to redefine the business.

Do not use "self-healing" vaguely. For this proof it means: DESIRED
CAPABILITY STATE + OBSERVED PLACEMENT STATE → DIFF → RECONCILIATION PLAN
→ AUTHORIZED EFFECT → INDEPENDENT VERIFICATION → UPDATED CAPABILITY
STATE. This is reconciliation. Do not invent another workflow system.
Search the existing reconciler, mission scheduler, execution authority,
capability machinery and event infrastructure first.

Every infrastructure effect must produce observations/receipts useful to
PING. Examples: PLACEMENT_SELECTED, PROVISIONING_ATTEMPTED,
PROVIDER_RECEIPT_OBSERVED, CAPABILITY_VERIFIED, HEALTH_DEGRADED,
MIGRATION_PROPOSED, MIGRATION_COMPLETED, VERIFICATION_FAILED. Use
existing event semantics where they fit. DO NOT invent event names
blindly. The important rule: PROVIDER RECEIPT ≠ VERIFIED EFFECT. PING
independently observes the result.

Owner controls: budget ceiling, ownership mode, allowed providers,
regions where relevant, migration authorization policy, data/export
preferences. TenantOS controls implementation only inside that
authorization envelope. Example: Owner "Keep this free if possible."
Policy: max_monthly_cost = 0, allowed ownership = PING_MANAGED,
portability required = true. TenantOS can move between eligible zero-cost
placements without asking about implementation trivia IF existing
authorization permits it. But crossing the cost ceiling, changing
ownership mode, moving into a prohibited jurisdiction, or performing a
consequential migration outside delegated policy requires approval.

Agent proposes: "Move public media to placement B." It does NOT receive:
AWS keys, Cloudflare token, Oracle credential. Execution capability
performs the bounded provider operation. Secrets stay behind execution
adapters.

Add/read the SMALLEST useful sanitized view:

```
PUBLIC MEDIA
Capability: Durable public media
Status: Healthy
Placement: <provider class/name>
Ownership: PING-managed
Assets: N
Usage: ...
Budget: within policy
Portable: YES / PARTIAL / NO
Last verified: ...
```

Do not build a cloud dashboard. Then support "Why is this stored here?"
and eventually "What can we move?"

We do NOT need blockchain. We do NOT need IPFS merely to say
decentralized. We do NOT need peer-to-peer storage tonight. The important
decentralization property is: NO SINGLE PROVIDER DEFINES THE TENANT. FYD
logical state + digests + evidence + export + replaceable placements
already give meaningful infrastructure sovereignty. Later evaluate
content-addressed/P2P replication only when it solves an actual
availability/distribution problem.

Keep scope exactly as previously decided. PING = exploratory tenant. Do
not generalize to 50 hypothetical customers. If PING cannot survive one
resource-placement change cleanly, TenantOS is not ready for tenant
provisioning.

FYD product loop remains the forcing function. The TenantOS proof may
support FYD media. It may NOT become a prerequisite for: Ask FYD,
correction survival, site generation, owner customization. TenantOS earns
priority only when it makes the current product CHEAPER, SAFER, MORE
PORTABLE, MORE AUTONOMOUS, or EASIER TO OPERATE.

The current product arrow remains: RENDERED EXPERIENCE → ASK FYD →
EVIDENCE → OWNER CORRECTION → REGENERATION → CORRECTION SURVIVES. Do not
let infrastructure exploration interrupt closing it.

Keep the proposed order: 1. TURN-ORIGIN TAGGING. 2. ACCEPTED/CORRECTED
OUTCOME LEDGER + CONFIDENCE DECAY. Reason: turn-origin protects authority
semantics immediately. Outcome learning is valuable after origin is
trustworthy. But neither outranks the current correction-survival arrow.

Do NOT ask Nolan for a giant manually curated source list before
archaeology. Build the initial PING source manifest from already-known
legitimate sources: existing PING/FYD website, current PING public
materials, authorized repository/docs, approved product materials,
existing canonical objects/evidence. For provenance vocabulary, SEARCH
existing PING evidence/provenance semantics first. Do not invent a new
vocabulary if one exists. Minimum distinctions needed conceptually:
DIRECT_OBSERVATION, OWNER_ASSERTION, VERIFIED_EXTERNAL_CLAIM, DERIVED,
INFERRED, GENERATED_PRESENTATION. Map onto existing primitives rather
than creating another ontology.

CREDENTIAL CONTAINMENT: security lane; do not ignore.
ACCIDENTAL HAPPY PLACE COMMIT: preserve evidence; resolve without
reset/clean/rewrite.
CORRUPT REF: repair only after exact ref/worktree impact is understood.
Do not mix any of these into the TenantOS semantic commit.

ONE boring proof wanted:

PING has one media capability. Asset A is evidence-backed. FYD renders
Asset A. Physical placement changes. Asset ID does not. Digest does not.
SiteSpec semantics do not. FYD behavior does not. Provider credentials
never enter agent context. Old placement can disappear. PING detects it.
Reconciliation restores capability. Independent verification proves the
recovered bytes. Mission Control can explain: WHAT EXISTS, WHERE IT
CURRENTLY LIVES, WHY, WHAT IT COSTS, WHETHER IT IS HEALTHY, WHETHER IT
CAN MOVE. THAT proves the architecture.

Report format for the proof:

```
EXISTING CODE HARVESTED: ...
CAPABILITY: ...
LOGICAL ASSET: ...
PLACEMENT A: ...
PLACEMENT B: ...
SAME CONTRACT: PASS/FAIL
SAME DIGEST: PASS/FAIL
FYD BEFORE: PASS/FAIL
FYD AFTER: PASS/FAIL
PROVIDER FAILURE DETECTED: PASS/FAIL
RECOVERY: PASS/FAIL
INDEPENDENT VERIFICATION: PASS/FAIL
SECRETS EXPOSED: 0 / DETAILS
MISSION CONTROL EXPLANATION: PASS/FAIL
HAND-WRITTEN FYD/TENANTOS CODE: ...
FIRST BROKEN STEP: ...
NEXT: ...
COMMIT: ...
```

DO NOT BUILD TENANTOS. MAKE ONE PING CAPABILITY PORTABLE. IF THAT WORKS:
MAKE THE NEXT REAL CAPABILITY PORTABLE. LET TENANTOS EMERGE FROM PROVEN
CONTRACTS. PING FIRST. PRODUCT FIRST. CAPABILITY DURABLE. PLACEMENT
DISPOSABLE. GO.

---

## Mode

Per Nolan 2026-09-29 ~11:55 MDT: FINISH ALL THE OTHER FOUNDATIONAL
BACKLOGS YOU CAN WITHIN THIS PARADIGM. Let the storage/compute/sandbox
architecture crystallize in PLANNING MODE for a while. STAY IN EXECUTION
MODE FOR EVERYTHING ELSE. The storage/compute/sandbox areas are still
being perfected.

Concretely: the portability proof above is the bounded experiment to
execute before drawing another infrastructure diagram. Broader TenantOS
architecting stays in planning. The product arrow (correction survival),
turn-origin tagging, outcome ledger, acquisition rebuild, and other
foundational backlogs stay in execution mode.
