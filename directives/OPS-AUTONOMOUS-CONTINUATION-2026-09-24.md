# Operations + Effect Port — Autonomous Continuation (2026-09-24, Nolan)

KEEP GOING AUTONOMOUSLY. THIS WORK ITEM IS VERIFIED. IT IS NOT A STOP.
THE VERIFIED OPERATIONS BASELINE NOW BECOMES INPUT TO THE NEXT FRONTIER.

## 0. RECORD THE VERIFIED BASELINE — turn it into cheap continuous checks
RPCBIND → CLOSED → NO LISTENER → DELAYED RE-PROBE PASS.
GATEWAY HEALTH → REAL HTTP READINESS → INITIAL HEALTH ~10s → RESTART HEALTH ~21s → PROVEN.
MEMORY CONTAINMENT → PROVEN.
POSTGRES → AUTOMATED DAILY BACKUP → LATEST ~15 MIN AT VERIFICATION → ISOLATED RESTORE PROVEN → ALL 2,557 JOURNAL ROWS RECOVERED → RPO 24H → RTO 7S IN WITNESSED DRILL.
QDRANT → AUTOMATED SNAPSHOT → BYTE-IDENTICAL RESTORE PROVEN → POINTS TRACE TO CANONICAL EVENTS → CLASSIFIED REBUILDABLE PROJECTION → POSTGRES REMAINS AUTHORITATIVE.
Do not turn these into permanent assumptions. Turn them into cheap continuous checks.

## 1. TWO RESIDUAL OPERATIONS RISKS — keep visible
A. BACKUPS ARE STILL SAME-HOST. Local backup + restore proof solves restorability, NOT host loss. Bounded mission: OFF-HOST BACKUP DESTINATION DISCOVERY → existing available destinations → authorization requirements → encryption → retention → copy → restore from off-host copy → evidence. DO NOT INVENT A DESTINATION. If Nolan must authorize or provide the destination, prepare everything else and escalate that ONE action.
B. GATEWAY IS NOT ACTUALLY COMPOSE-MANAGED. Do not leave this as an annotation forever. Trace: declared deployment vs actual deployment vs restart procedure vs release procedure. Converge them WITHOUT destabilizing the proven instance. NO surprise container replacement.

## 2. EFFECT PORT IS NOW P0 AUTONOMY INFRASTRUCTURE
The effect-class inventory changed the implementation. Good. Follow the evidence. Do NOT build a generic effect framework. Build the SMALLEST SHARED SEMANTICS that the real effect classes actually share. The ten class specs at ~/workspace/orca/effect-classes/ are the contract corpus.

## 3. FIX IDENTITY BEFORE RETRY
The recurring defect: TIMESTAMP / RANDOMNESS INSIDE LOGICAL-OPERATION IDENTITY. That breaks SAME LOGICAL OPERATION → SAME IDENTITY → SAME IDEMPOTENCY KEY. Remove attempt-time entropy from logical effect identity where the real path requires retry stability. Distinguish: logical_operation_id / attempt_id / dispatch_id / provider_receipt_id. THE ATTEMPT MAY CHANGE. THE LOGICAL OPERATION MUST NOT.

## 4. CALLER-SUPPLIED EFFECT IDENTITY
The caller that knows the semantic intent supplies the stable operation identity, derived from canonical semantics: mission identity + effect class + target + canonical input/proposal digest + relevant authority scope. NOT: current timestamp, random UUID, process identity, worker identity, retry count. Then: logical_operation_id → deterministic idempotency key. DISPATCHER AND WORKER MUST INDEPENDENTLY ARRIVE AT THE SAME RESULT.

## 5. PLACEHOLDER SUCCESS IS NOW A HARD FAILURE CLASS
`_gitPush` reporting success without performing the effect is NOT a successful effect, not even a failed effect. It is NO VERIFIED EFFECT EVIDENCE. Find every similar path. Attack: stub returns success; dry-run represented as live; queued represented as sent; accepted represented as completed; HTTP 200 represented as business success; timeout-after-accept represented as failure; process existence represented as health; command exit 0 represented as external effect proof. RESULT != VERIFIED OUTCOME. Make this a cross-domain semantic audit.

## 6. MESSAGE EXECUTION FIRST
Port the proven unknown-outcome semantics into real message execution. Required flow: INTENT → LOGICAL OPERATION ID → IDEMPOTENCY KEY → AUTHORIZATION → DISPATCH → DURABLE RENDEZVOUS → PROVIDER/EXTERNAL EFFECT → RECEIPT OR UNKNOWN → RECONCILIATION → VERIFIED RESULT.
Attack: send succeeds/response lost; send succeeds/worker dies; send succeeds/coordinator dies; send succeeds/DB write fails; provider returns timeout after accepting; duplicate dispatch; duplicate worker; late response; restart; reconciliation race.
PROVE: ONE LOGICAL SEND NEVER BECOMES TWO MESSAGES MERELY BECAUSE PING LOST ACKNOWLEDGEMENT.

## 7. SOCIAL / CAMPAIGN PUBLICATION SECOND
Then port: social post, campaign publication, external content publication.
IMPORTANT: retry safety is ACTION-SPECIFIC. POST: duplicate may create duplicate content. LIKE: retry may invert/toggle depending on provider semantics. DELETE: repeating may have different semantics. UPDATE: target may have changed between attempts.
Therefore: retry_safe = f(effect class, provider semantics, current observed provider state, idempotency support, reconciliation evidence). NO GLOBAL "RETRY EXTERNAL EFFECT" BOOLEAN.

## 8. FINANCIAL ACTION HARD GATE — standing rule, keep it
NO FIRST REAL FINANCIAL EFFECT UNTIL THIS MECHANISM IS WIRED AND PROVEN FOR THAT FINANCIAL EFFECT CLASS. Before real money: stable logical operation identity, idempotency semantics, provider reconciliation, unknown-outcome handling, receipt, durable evidence, authority, amount/currency/target binding, duplicate-effect chaos proof. This is a real release gate.

## 9. HARVEST EXISTING SAFETY MECHANISMS
Do NOT reimplement what the system already knows. Harvest from: Threads, Instagram, Facebook Marketplace rule 19, Spotify, mail batcher, engagement guard — the existing fail-closed behavior, verify-before-retry behavior, provider probes, duplicate prevention, state checks. Give them: durable state, stable logical identity, reconciliation evidence. REFACTOR AUTHORITY. PRESERVE MECHANISM.

## 10. AUTONOMOUS NEXT-WORK GENERATION
The verified operations results should create NEW WATCHES: backup age exceeds policy; restore drill becomes stale; Qdrant snapshot stale; gateway health degrades; unexpected listener appears; container loses memory containment; deployment drifts from declared config. Those watches create missions ONLY when material. NO hourly noise.

## 11. MISSION CONTROL — make all this visible
TODAY should now include: active missions, effect operations, UNKNOWN outcomes, reconciliation, agents, website factory, business imports, owner corrections, source changes, marketing opportunities, deployments, backup health, projection health, risks requiring authority. NO ENGINEERING FICTION. Click an effect operation → logical operation, effect class, mission, run, attempts, idempotency key, target, criticality, authority, dispatch evidence, provider evidence, receipt, outcome, reconciliation, retry eligibility, history. IF UNKNOWN: DISPLAY UNKNOWN. Do not turn red UI into false certainty.

## 12. SUCCESSOR ORDER (no "what next", discover N)
A. finish real-runtime unknown-outcome port
B. prove integrated 17-scenario chaos suite
C. message execution
D. social/campaign publication
E. merge + merged-state proof
F. Mission Control UNKNOWN/reconciliation visibility
L. off-host backup once destination/authorization exists
M. deployment-management convergence
N. next highest-value discovered failure — DISCOVER N.
(G-K are the FYD lane; do not duplicate that lane's work.)

## 13. THE PERMANENT LAW
THIS WORK ITEM IS VERIFIED. THEREFORE: RECORD IT. REDUCE ITS ACTIVE COMPUTE. KEEP A CHEAP WATCH. MOVE THE FLEET FORWARD.
PROVEN → WIRE. WIRED → LIVE. LIVE → DURABILITY TEST. DURABLE → ADVERSARIAL TEST. SAFE → OBSERVE. OBSERVATION CHANGES → REOPEN. FAILURE → REPRODUCE. GENERIC FAILURE → REPAIR THE SHARED MECHANISM. SUCCESS → FIND THE NEXT BOTTLENECK.
NO "DONE." NO "WHAT NEXT?" NO BLIND RETRY. NO FAKE SUCCESS. NO SECOND AUTHORITY. NO BUSYWORK.
KEEP GOING AUTONOMOUSLY. ALWAYS.
