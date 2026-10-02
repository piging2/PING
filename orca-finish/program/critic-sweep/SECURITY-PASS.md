# SECURITY PASS (FRESH): CRITICS-SWEEP

**Critic:** CRITIC-SECURITY (fresh pass) | **2026-09-24 ~05:20 MDT**
**Scope:** new artifacts only, produced since SECURITY-CRITIQUE.md.
Read-only. No em dashes used. Prior live issues are carried, not
re-litigated; new attack surface from the HS specs and the gauntlet
harness is the focus.

## Standing live issues (carried, not new)

These remain open from the prior pass and nothing in the new artifacts
closes them:

1. Unauthenticated `/orchestration` fabrication surface. Production gateway
   (Jev candidate held at the promotion gate; the deployed Sep 16 and Sep 20
   images lack the P0 gate) still accepts unauthenticated POST
   /orchestration/engine/loop. The MEMORY.md Jev/promotion entry confirms
   the gate is not proven in the running 8080 image.
2. Stale-worker ABA on the mainline scheduler (TEST-PROVEN by ORCA-B's
   hung-worker harness; independently re-attacked by Agent 19's
   wedge-test.js, whose run result is not yet in a falsification record).
3. `orca_approval.js` ships with the GC-7 token flaw; redteam GO/NO-GO
   gates any live use (WAVE-LEDGER.md, CMD-OPS cycle 3 backlog).

## SEC1. HS-6 accepts any present rendezvous as completion evidence

- DOMAIN: security / COMPONENT:
  wave2/impl-safety-finish/stage-out/hs-6-takeover-liveness.md, decision
  rule 1 (lines 24-29)
- CLAIM: a present rendezvous file is safe to adopt as the attempt's result
- EVIDENCE: STATIC. The rule: "rendezvousPresent (a result artifact exists
  for the current attempt): action accept, adopt the result, do not reset,
  do not re-dispatch." The spec requires NONE of: attempt freshness (is
  this rendezvous from THIS attempt or a stale one?), digest verification
  (does the artifact match what the attempt was supposed to produce?),
  producer identity (did the current holder write it, or a previous
  holder / a zombie / an unrelated process with write access to the
  rendezvous path?), or verification status (has the result passed any
  verification?). ORCA-B Record 11 already flags the stale-rendezvous
  collection hazard on the A5 branch; HS-6 as specified does not close it.
- CALLER: CRITIC-SECURITY / CALLEE: impl-safety-finish lane
- WRITER: impl-safety-finish / READER: parent orchestrator
- AUTHORITY: hs-6-takeover-liveness.md:24-29 vs ORCA-B VERDICTS.md Record 11
- CLASSIFICATION: SPEC-LEVEL VULNERABILITY. Attack shapes:
  (a) a late rendezvous from attempt N arrives after attempt N+1 was
  dispatched; the takeover for a subsequent failure could adopt the stale
  artifact as the new attempt's result. (b) any process with write access
  to the rendezvous directory can forge a completion that the next
  takeover adopts without question. (c) a zombie worker (killed dispatcher's
  Windows child, per ORCA-B's timeout-after-effect hole) writes a late
  drop that a later takeover accepts as fresh.
- CONFIDENCE: HIGH for the spec gap; exploitability is MEDIUM until the
  rendezvous path's writer set and permissions are specified
- BROKEN BOUNDARY: result acceptance (existence check vs authenticity check)
- DEPENDENCIES: HS-3 attempt-scoped rendezvous identity, HS-4 fencing,
  the rendezvous directory's access control (unspecified)
- AFFECTS AGENTS: impl-safety lane (spec must require, at minimum:
  attempt-id binding on the artifact, digest check, holder match, and a
  staleness bound before "accept" is allowed)

This is the most consequential new security finding. The decision rule is
correct to prefer not destroying evidence; it is incorrect to treat
"a file exists" as "this attempt completed correctly."

## SEC2. HS-6 liveness-before-reset is a TOCTOU boundary

- DOMAIN: security / COMPONENT: hs-6-takeover-liveness.md (ordering with
  HS-4) + hs-4-fencing-epoch.md
- CLAIM: the liveness probe result is valid at reset time
- EVIDENCE: STATIC. HS-6 runs the three-way decision BEFORE the
  reapExpiredLeases reset; only `re-authorize` proceeds to the reset.
  The liveness probe (`alive` / `unknown` / `dead`) is evaluated, then
  (for `dead-no-result`) the reset re-authorizes the mission with an HS-4
  epoch bump. Between the probe and the reset, the worker's state can
  change: a worker probed `dead` may have actually completed effects that
  have not yet materialized as a rendezvous, or a worker probed `unknown`
  (action `leave` + alarm) may be acted on by an operator who resets
  outside the spec's ordering.
- CALLER: CRITIC-SECURITY / CALLEE: impl-safety-finish lane
- WRITER: impl-safety-finish / READER: parent orchestrator
- AUTHORITY: hs-6-takeover-liveness.md (ordering section) +
  hs-4-fencing-epoch.md
- CLASSIFICATION: TIME-OF-CHECK/TIME-OF-USE. The epoch bump fences the
  canonical WRITE (a stale holder's completion is refused at the SQL WHERE),
  but it does not undo EXTERNAL EFFECTS the worker already produced. The
  spec's threat model covers the database; the exterior agent (where
  effects happen) is outside the fence. This is the same class as ORCA-B's
  timeout-after-effect hole, now present in the takeover path by
  construction.
- CONFIDENCE: MEDIUM-HIGH
- BROKEN BOUNDARY: liveness observation vs reset execution (no atomicity)
- DEPENDENCIES: HS-4 epoch fencing (covers writes, not effects), HS-5
  scheduler (the alarm consumer, unresolved U2)
- AFFECTS AGENTS: impl-safety lane (the spec should state the TOCTOU
  explicitly and bound the probe-to-reset window, or require re-probing
  immediately before the reset write)

Note: the `leave` + alarm path for `alive`/`unknown` is the safe choice
(never steal a possibly-live claim), but without HS-5 or a bound operator
response, it can wedge a mission indefinitely (see PERFORMANCE-PASS.md).

## SEC3. Gauntlet harness contacts production by default (read-only, but porous)

- DOMAIN: security / COMPONENT: wave2/gauntlet harness observe() helper
- CLAIM: the chaos harness is scratch-only
- EVIDENCE: STATIC. wave2/gauntlet/CHECKPOINT.md (19:52 entry): "One
  read-only incidental: observe() GETs http://127.0.0.1:8080/health
  (production gateway) in try/catch, documenting, not blocking."
  GAUNTLET-RESULTS.md caveat 2 confirms: "the loop performed a read-only
  GET to the production gateway health endpoint." The brief said
  scratch-only; the harness reached production on its own.
- CALLER: CRITIC-SECURITY / CALLEE: W2-GAUNTLET-INFRA lane
- WRITER: W2-GAUNTLET-INFRA / READER: parent orchestrator
- AUTHORITY: wave2/gauntlet/CHECKPOINT.md + GAUNTLET-RESULTS.md caveat 2
- CLASSIFICATION: POROUS TEST BOUNDARY. Tonight the contact was a
  read-only health GET: no state changed, no credentials sent (health
  endpoint). The hazard is structural, not tonight's instance: a harness
  that reaches production by DEFAULT will, on some future run, carry a
  helper with write capability or a misconfigured target. The lane
  documented it honestly; the harness was not fixed.
- CONFIDENCE: HIGH
- BROKEN BOUNDARY: scratch/production network egress (no egress allowlist
  on the harness)
- DEPENDENCIES: none
- AFFECTS AGENTS: parent orchestrator, any future chaos lane (CHAOS-B/C)

Requirement before the next chaos run: the harness must either remove the
production health GET or run behind an explicit egress allowlist (scratch
hosts only). "Documenting, not blocking" is not a control.

## SEC4. HS specs' security properties must not be counted as operational

- DOMAIN: security / COMPONENT: wave2/impl-safety-finish/stage-out/ (all)
- CLAIM: the safety layer provides epoch fencing, idempotent effects,
  takeover liveness, and provenance
- EVIDENCE: STATIC. Every spec file is headered "SPEC ONLY. Not built, not
  wired, no production callers." SAFETY-LAYER.md confirms.
- CALLER: CRITIC-SECURITY / CALLEE: impl-safety-finish lane
- WRITER: impl-safety-finish / READER: parent orchestrator
- AUTHORITY: spec file headers
- CLASSIFICATION: STATUS CLARIFICATION. The specs DESCRIBE good controls
  (fencing tokens on attempt records, insert-or-ignore effect keys,
  never-steal-a-live-claim). None of them RUN anywhere. Any threat model,
  risk register, or morning-brief claim that lists these as mitigations
  is wrong until build + wire + test.
- CONFIDENCE: HIGH
- BROKEN BOUNDARY: specification vs implementation
- DEPENDENCIES: the five test suites, the Pig transfer, PING-side sequence
  and provenance work
- AFFECTS AGENTS: parent orchestrator (risk register must keep every
  HS-covered defect OPEN)

This is the security counterpart to PRODUCT-PASS P2. It is listed here
because the failure mode is specific: a reviewer reading the HS specs
could conclude the hung-worker, ABA, and takeover hazards are handled.
They are not. They are specified.

## Scoreboard (fresh pass only)

| # | Finding | Severity |
|---|---------|----------|
| SEC1 | HS-6 accepts any present rendezvous (no freshness/digest/identity) | HIGH (spec vuln) |
| SEC2 | HS-6 liveness-before-reset TOCTOU; epoch fences writes, not effects | MEDIUM-HIGH |
| SEC3 | Gauntlet harness egresses to production health by default | MEDIUM (structural) |
| SEC4 | HS security properties are specified, not operational | MEDIUM (register hygiene) |

Standing (unchanged): unauthenticated /orchestration fabrication surface
(live in production), mainline stale-worker ABA (TEST-PROVEN), GC-7 token
flaw in orca_approval.js (redteam gate). Nothing in this pass closes any
of them.
