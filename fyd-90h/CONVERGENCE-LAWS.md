# Convergence — Hard Coordinator Laws
**From Nolan, 2026-09-29 ~09:29 MDT. Binding. These are the refinements that turn the convergence directive into enforceable law.**

## 1. Harvest-candidate law: no arrow, no write

Every CRX harvest candidate must map to a broken/reached MVP arrow before it gets writer time. The ledger must require, per candidate:

CRX primitive → existing implementation(s) → reached PING arrow → observed defect → evidence that defect blocks arrow → harvest/converge/wire/reject → target semantic owner → proof after integration

No arrow, no write. This prevents constitutional-trunk from becoming the project again.

Refined arrow mapping (corrects the earlier version): OBSERVATION → EVIDENCE is not primarily an event-schema problem. Event-schema convergence makes history trustworthy, but the epistemic boundary is stronger:

SOURCE → OBSERVATION → EVIDENCE QUALIFICATION → CLAIM/OBJECT → AUTHORIZED TRANSITION → EVENT HISTORY

Observed fact, owner claim, derived claim, AI inference, and presentation copy are never interchangeable. Presentation must never promote itself into evidence. Map as: event schema + provenance/qualification semantics → OBSERVATION → EVIDENCE. Never let a canonical event imply evidence.

## 2. Provenance certification invariant

SOURCE_ID → BUILD_ID → ARTIFACT_DIGEST → DEPLOYMENT_ID → PROCESS_ID → SERVED_DIGEST → REQUEST/RESPONSE EVIDENCE

Law: no runtime claim may inherit the status of source code merely because that source exists, is committed, or passed tests.

Permanent separations:
SOURCE GREEN != BUILD GREEN
BUILD GREEN != DEPLOYED
DEPLOYED != SERVING
SERVING != EXPECTED BYTES
EXPECTED BYTES != EXPECTED BEHAVIOR
EXPECTED BEHAVIOR != VERIFIED OUTCOME

For every live PING/FYD surface, mechanically answer: SOURCE SHA? BUILD ID/DIGEST? IMAGE/ARTIFACT DIGEST? RUNNING INSTANCE? SERVED VERSION? No more "this commit should be running."

## 3. Epistemic law quad (frozen)

EVENT INTEGRITY ≠ WORLD TRUTH
AUTHORITY ⟂ VERIFICATION
PROVENANCE ≠ PERMISSION
RESULT INTEGRITY ≠ EFFECT CORRECTNESS

PROVENANCE ≠ PERMISSION: authentic, evidence-backed external content can still contain dangerous executable interpretation (e.g. a javascript: URL). Evidence establishes where data came from; it cannot authorize executing that data.
RESULT INTEGRITY ≠ EFFECT CORRECTNESS: connects directly to UNKNOWN. UNKNOWN is a first-class external-action outcome and requires reconciliation, never blind retry.

## 4. P0 is the falsification queue first, not the writer queue

Do not let the CRX P0 list automatically become the writer queue. For each P0, prove:

P0 suspected → reached? → competing implementations? → which implementation actually owns runtime? → reproduced defect? → existing stronger implementation elsewhere? → smallest convergence action?

Only then does it graduate to writer-ready. A duplicate implementation is not automatically today's defect if only one is reached; the immediate defect may instead be uncertain authority over which implementation is reached.

Mandatory dependency ordering:
RUNTIME IDENTITY / PROVENANCE FIRST
then REACHABILITY
then SEMANTIC AUTHORITY
then CONVERGENCE
then MUTATION

## 5. Brutally binary ledger

Every interval ends with states, not activity:
HARVESTED / WIRED / REACHED / PROVEN / REJECTED / STRANDED / BLOCKED — not "worked on."

Stranded value, defined narrowly: implementation value already paid for that is not presently contributing to a reached MVP arrow.

STRANDED-READY — strong implementation, integration edge known
STRANDED-PARTIAL — useful semantics/tests, incomplete implementation
STRANDED-DUPLICATE — valuable only as comparison/falsification evidence
STRANDED-UNKNOWN — cannot yet establish authority/reachability
STRANDED-OBSOLETE — historical value only

The metric pair: stranded valuable implementation ↓ alongside reached MVP arrows ↑. That is convergence.

## 6. Harvest statuses (one per harvested primitive)

Every harvested CRX primitive receives exactly one:
CONSTITUTIONAL / EXECUTABLE / REFERENCE / HISTORICAL / REJECTED

A beautiful implementation may be REFERENCE, not executable. A valuable law may be CONSTITUTIONAL while its implementation is REJECTED. A working implementation may be EXECUTABLE without becoming constitutional. This prevents implementation details from accidentally acquiring law-like status.

## 7. Product hold (reaffirmed)

Parking the new-business radar while customer pursuit/outreach is held is the coherent interpretation. The coordinator must not use "external validation" as an excuse to leave the integration frontier. Real owner correction becomes valuable after the held product loop is ready and the hold is deliberately changed — not before.

## 8. Coordinator north star

Find the code that actually runs. Bind source→build→served. Prove the broken reached arrow. Search every existing implementation. Harvest the smallest stronger semantic unit. Independently falsify it. Integrate it into the reached PING loop. Count stranded value down and verified product capability up. Do not reward architecture, code, commits, tests, or activity unless they change that ledger.
