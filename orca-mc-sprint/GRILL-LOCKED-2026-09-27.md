# GRILL — LOCKED OPERATOR DECISIONS (Nolan, 2026-09-27 ~20:02 MDT)

Status: LOCKED. These items are removed from the active Grill. Do not re-ask.
Single consequential operator-decision surface: the Grill. Parallel decision inboxes are prohibited.

## 1. FYD MISSION — GO, WITH EXACT-TRANSITION BINDING

APPROVED: proposal `p0prop-ac04480a6d1809fd`
Digest: `5c1d873706c14c7c3c7b5ded02bb73924419e4cdf3e17f6dc6bc98795731e7aa`
Mission: "Analyze my website and make emergency services more prominent."

The system may autonomously: observe the current site, read the current object
graph/SiteSpec, collect evidence, analyze prominence, create the mission/run,
execute bounded research and tooling, produce a proposed SiteSpec patch, render
previews, screenshot, test, falsify, compare, and prepare the canonical transition.

Binding: PROPOSAL A -> DIGEST A -> APPROVAL A -> EXECUTE A. No agent may change A
after approval. No equivalent-patch substitution. No regenerated patch after
approval. No approval against "whatever the newest proposal is."

Do not ask Nolan this mission question again. Return only if the exact transition
materially changes after approval or reveals a new consequential issue.

## 2. STANDING DELETION AUTHORITY — GRANTED, NARROW

The coordinator does not need individual approval for each deletion that satisfies
ALL of:
- REACHABILITY INVENTORIED
- ALL KNOWN CONSUMERS INVENTORIED
- NO UNIQUE SEMANTIC VALUE
- REPLACEMENT REACHED AND PROVEN
- RELEVANT TESTS GREEN
- INDEPENDENT FALSIFIER AGREES
- CURRENT WORKTREES REOBSERVED
- NO OTHER ACTIVE WRITER OWNS IT
- ROLLBACK VIA PINNED GIT STATE PROVEN/UNDERSTOOD
- DELETION RECORDED WITH BEFORE/AFTER EVIDENCE

Scope: proven-dead, Git-recoverable source duplication and generated/disposable
engineering artifacts ONLY.

NEVER covered: canonical data, database rows, customer/business data, evidence
required for audit/provenance, credentials or credential stores, external accounts,
cloud resources, production deployments, DNS/domain state, media whose only
authoritative copy is local, uncommitted work belonging to another active worker,
unknown files, unknown worktrees, backup sets, canonical events, identity history,
owner assertions, legal/compliance records, or anything where Git is not actually
the authoritative recovery mechanism. Those remain under existing authority rules.

Rule: PROVEN DEAD + GIT RECOVERABLE + NO UNIQUE STATE = DELETE WITHOUT
INTERRUPTING NOLAN. UNKNOWN = PRESERVE AND INVESTIGATE. EXTERNAL/CANONICAL/
IRREVERSIBLE = EXISTING AUTHORITY RULES APPLY.

## 3. HOLD / UNKNOWN — LOCKED AS CONSTITUTIONAL RUNTIME BEHAVIOR

UNKNOWN EFFECT -> HOLD -> RECONCILE -> NEVER LEASE-EXPIRY REDISPATCH.

A lease expiring is evidence that ownership of execution became stale. It is not
evidence that an external effect did not occur. Redispatching a HOLD mission on
lease expiry is a P0 correctness defect whenever the previous attempt may have
crossed an effect boundary.

State machine:
- NOT_STARTED -> safe dispatch permitted
- STARTED / NO EFFECT POSSIBLE YET -> retry may be allowed per idempotency policy
- EFFECT_PROVEN_NOT_OCCURRED -> safe redispatch
- EFFECT_PROVEN_OCCURRED -> reconcile the durable result; do not repeat effect
- EFFECT_UNKNOWN -> HOLD

HOLD exits only through deliberate reconciliation producing PROVEN_OCCURRED,
PROVEN_NOT_OCCURRED, MANUAL_RESOLUTION, or another explicitly modeled safe
terminal state. Never through: timeout, lease expiration, worker disappearance,
scheduler sweep, process restart, "probably failed", lack of acknowledgement, or
model confidence.

Action: patch the lease reaper (narrowest authority-owning layer), not the meaning
of HOLD. The scheduler/reaper must treat HOLD as non-dispatchable. The reconciler
owns movement out of HOLD. Test with the nastiest possible rendezvous kill.

## Locked execution order (immediate)

GO FYD MISSION (exact digest above) ->
Q-P0-04 WRONG_JOURNAL (synthetic; EMIT and DUMP against misconfigured gateway
  lacking the overlay marker; required: typed WRONG_JOURNAL, ZERO canonical writes,
  ZERO partial/fallback/secondary-journal writes, ZERO projection changes from the
  rejected operation, proven by authoritative storage query + projection check +
  independent falsifier bypass attempts; any write = P0 FAIL, freeze Q-J-12, trace
  the earliest boundary where the overlay invariant disappeared, patch the smallest
  authority-owning layer, fail-before/pass-after) ->
Q-P0-05 SECRET-LEAKAGE AUDIT (mission input, run/attempt records, executor
  invocation, Hermes bridge, env, stdout/stderr, structured result, artifact
  metadata, evidence, canonical events, Mission Control, Ask FYD, browser payloads,
  logs, temp scripts, crash dumps, screenshots, replay, test artifacts; secret
  classes not just known literals; broker narrowly, minimum necessary access, no
  secret in result/artifact/evidence/event/MC/model-context/logs; scrub proof
  artifacts afterward) ->
Q-P0-06 TENANT ISOLATION MATRIX (A object->B, A mission->B object, A proposal->B
  SiteSpec, A approval->B proposal, A artifact/evidence lookup->B, A Ask context->B
  private context, A replay->B events, A projection->B state, body says tenant=B
  while trusted context=A, missing trusted tenant + request says B, agent output
  requests tenant B, Jev suggests B (irrelevant), admin without explicit cross-tenant
  capability: all DENY; only explicit trusted cross-tenant administrative capability
  crosses) ->
Q-J-01..03 ACTUAL BROWSER OBJECT/DOORWAY PROOF on the served route (SOURCE EXISTS
  != TESTS PASS != IMPORTED != MOUNTED != ROUTE REACHES != BROWSER RENDERS !=
  DISCOVERABLE != USABLE != SURVIVES REFRESH != SURVIVES RESTART; desktop sparse /
  far-right / page-anchored / not sticky; mobile right-edge or generic drawer/sheet,
  no customer-specific branch) ->
FYD OWNER JOURNEY -> RESTART -> REPLAY -> CONCURRENT IDEMPOTENCY ->
UNKNOWN RENDEZVOUS KILL -> RECONCILIATION -> MISSION CONTROL TRUTHFUL PROJECTION ->
HAPPY PLACE -> COPPERSMITH -> WORKTREE CONVERGENCE -> PROVEN DUPLICATION RETIREMENT ->
NEXT FIRST BROKEN BOUNDARY -> NEXT -> NEXT -> NEXT.

## Continuous loop (no sprint termination)

At every 24h checkpoint: CHECKPOINT. REPORT. REOBSERVE. REPRIORITIZE. CONTINUE.
No artificial backlog generation. No busywork. If genuinely nothing eligible:
QUIESCENT UNTIL NEW EVIDENCE.

Coordinator closure states (only): FIXED + RUNTIME PROVEN / PASS EXISTING /
SUPERSEDED / RETIRED WITH EVIDENCE / DEFERRED WITH EXPLICIT REOPEN CONDITION /
UNKNOWN WITH THE EXACT MISSING EVIDENCE.

Priority forever: P0 security/privacy/data-loss/dup-external-effect ->
P0 authority/tenant/identity/wrong-journal/secret ->
P0 unknown-effect/idempotency/reconciliation ->
P1 real product path -> P1 ORCA/MC reached-path -> P1 event/artifact/evidence/replay ->
P1 FYD owner journey -> P1 website quality ->
P2 duplication/convergence -> P2 harvesting -> P2 perf/accessibility/visual ->
P3 docs/provenance/dependency/license -> RESEARCH. New P0 preempts.

## :3101 permanent operating law

AVAILABILITY IS PART OF PRODUCT CORRECTNESS. No worker may restart a served
runtime, kill a process, replace the active build, commit into the served tree,
change runtime configuration, or swap the serving SHA merely because its local
task would become easier. Requires a runtime mutation lease/capability: reason,
affected service, current PID/build/SHA, expected outage, rollback,
authorization, other active workers, checkpoint. After: process health, route
health, browser health where applicable, build identity, projection/data
integrity, event/evidence record. A curl 200 does not retroactively erase an
outage.

## Monument View — keep ready, do not contact

Behind Q-J-12: Q-P0-04 -> Q-P0-05 -> Q-P0-06 -> Q-J-01..03 real browser green ->
owner journey replay green -> then explicit external-contact authority.

## Data-capitalization mission — preserve, do not hijack P0

Preserved as strategic product research. Do NOT encode "data as a capital asset",
"on balance sheets", "equity for data", or a generalized "data marketplace" as
PING constitutional truth. Do not build marketplace machinery into ORCA. Do not
centralize raw human data for a future economic model. Do not turn PING's
outcome-learning into a shared identifiable-data corpus. OWNER CONTROL FIRST.
ECONOMIC MODEL LATER. Immediate architectural lesson: DATA MUST REMAIN CONTROLLED
BY ITS AUTHORIZED PRINCIPAL THROUGH PROVENANCE, PURPOSE, CAPABILITY, CONSENT,
REVOCATION, AND AUDIT.

## Empirical-question discipline

Before interrupting Nolan: CAN EVIDENCE ANSWER THIS? -> investigate. DOES EXISTING
POLICY ANSWER IT? -> execute the policy. IS IT REVERSIBLE AND NON-CONSEQUENTIAL? ->
run the experiment. CAN JEV CLASSIFY IT WITHOUT AUTHORITY? -> use Jev as evidence.
CAN AN INDEPENDENT FALSIFIER RESOLVE IT? -> falsify. Only after all fail does it
become a human question. The Grill shrinks as ORCA improves. An empty Grill is
success.

## Swarm discipline

16 lanes stay fed. ONE WRITER PER SEMANTIC UNIT. MANY READERS. MANY FALSIFIERS.
No idle worker just because the P0 writer is busy. Non-conflicting concurrent work:
secret-leakage recon, tenant-attack prep, archaeology, executor reachability,
event-writer inventory, HOLD/reaper falsification, reconciliation archaeology,
Hermes reached-path verification, Jev shadow calibration, FYD browser
falsification, HPP read-only harvesting, Coppersmith generalization,
dependency/license harvesting, clean-checkout proof prep, restart/replay prep,
visual/product critique.
