# PRODUCT PASS (FRESH): CRITICS-SWEEP

**Critic:** CRITIC-PRODUCT (fresh pass) | **2026-09-24 ~04:50 MDT**
**Scope:** new artifacts only, produced since PRODUCT-CRITIQUE.md
(2026-09-23 22:05 MDT). Read-only. No em dashes used.

## P1. The prior product critique is physically truncated

- DOMAIN: program ops / product critique deliverable
- COMPONENT: program/critic-product/PRODUCT-CRITIQUE.md
- CLAIM: the prior deliverable is complete: six records, a scoreboard, and a
  follow-on queue, per its checkpoint entry at 2026-09-23 22:05 MDT
- EVIDENCE: STATIC. The file on disk ends mid-Target-5 with the literal text
  `...[truncated 6902 chars]`. The tail reads:

      - CLAIM: "The loop does NOT close... a commentary pipeline, not an improvement
        pipeline." Six distinct breaks; recommendations never execute (highest
        leverage).
      - EVIDENCE: LIVE (DB counts: 18 each of OBSERVATION/C
      ...[truncated 6902 chars]

  The last complete record is Target 4; Target 5 is cut mid-sentence.
- CALLER: CRITICS-SWEEP / CALLEE: critic-product lane
- WRITER: critic-product / READER: parent orchestrator, downstream lanes
- AUTHORITY: file bytes on disk vs the lane's own CHECKPOINT.md claim
- CLASSIFICATION: DELIVERABLE-INTEGRITY FAILURE (contradiction between the
  checkpoint's "complete" claim and the file's physical state)
- CONFIDENCE: HIGH
- BROKEN BOUNDARY: checkpoint discipline: the checkpoint recorded a
  completed deliverable that was never fully written
- DEPENDENCIES: any lane that cites PRODUCT-CRITIQUE targets 5+ is citing
  content that does not exist
- AFFECTS AGENTS: parent orchestrator (must not treat the critique as
  complete), any lane building on product targets 5 and 6

The honest statement is: four product targets have written records; the
record for Target 5 is incomplete; Target 6 and the scoreboard and follow-on
queue described in the checkpoint are not present in the file. Nothing about
this pass certifies targets 5 or 6. The truncation marker hides 6,902
characters of unknown content; no one can cite what is not there.

## P2. HS-1 through HS-7 remain unbuilt specs: zero product-felt value yet

- DOMAIN: product value / COMPONENT: wave2/impl-safety-finish/stage-out/
- CLAIM: the seven harvested specs represent operational safety improvements
- EVIDENCE: STATIC. Every spec file carries the header "SPEC ONLY. Not
  built, not wired, no production callers." SAFETY-LAYER.md is explicit.
- CALLER: CRITIC-PRODUCT / CALLEE: impl-safety-finish lane
- WRITER: impl-safety-finish / READER: parent orchestrator
- AUTHORITY: spec file headers
- CLASSIFICATION: HONEST BUT VALUABLESS. The specs are honest about their
  status, which is good. Their product value is zero until built, wired, and
  exercised.
- CONFIDENCE: HIGH
- BROKEN BOUNDARY: none (honest labeling). The boundary to watch is any
  future claim that cites an HS spec as mitigation for a live defect.
- DEPENDENCIES: the five test suites that must run on the Pig; the PING
  lane that owns sequence allocation (HS-2), scheduler integration (HS-6),
  and the provenance column (HS-7)
- AFFECTS AGENTS: parent orchestrator (do not close live defects on the
  basis of specs)

No product claim may cite HS-1 through HS-7 as fixes, mitigations, or
recovery guarantees until each is built, wired, and tested on its target
surface. Today they are design documents.

## P3. TEST-A6 proves recovery correctness, not mission completion

- DOMAIN: product value / COMPONENT: wave2/gauntlet/GAUNTLET-RESULTS.md
  TEST-A6 record
- CLAIM: the A6 re-proof demonstrates that crashed missions get rescued
- EVIDENCE: TEST. Six gates passed: kill mid-dispatch, lock re-acquired,
  reconcile-before-dispatch, no duplicate delegation, honest terminal
  WORKER_FAILED, durable budget 1/2. But the real Hermes worker produced
  zero output across the full 180-second dispatcher timeout, so the work
  order ended FAILED (honestly) and the budget exhausted at 2/2 with an
  escalate-to-human exit.
- CALLER: CRITIC-PRODUCT / CALLEE: W2-GAUNTLET-INFRA lane
- WRITER: W2-GAUNTLET-INFRA / READER: parent orchestrator
- AUTHORITY: GAUNTLET-RESULTS.md TEST-A6 record + checkpoint entry 20:05
- CLASSIFICATION: MECHANISM PROVEN, MISSION NOT COMPLETED. The recovery
  path works; the mission did not. A product claim must say "the system
  correctly detects the crash, reclaims the work, and reports honest
  failure" rather than "the mission was rescued."
- CONFIDENCE: HIGH
- BROKEN BOUNDARY: the worker itself (Hermes CLI hangs; environmental,
  outside A6 scope). The product cannot complete missions through a hung
  worker; the recovery layer only reports the failure cleanly.
- DEPENDENCIES: the Hermes hang (environmental), the 180s coordinator
  timeout
- AFFECTS AGENTS: parent orchestrator (product narrative for the morning
  brief must not overclaim)

For a user, the felt difference is between "your work was lost" (2026-09-18
A6 FAIL) and "your work failed and the system told you so" (TEST-A6 PASS).
That is real progress. It is not a completed mission.

## P4. ORCA-B's timeout-after-effect "harvest" does not close the product hole

- DOMAIN: product value / COMPONENT: program/orca-b/VERDICTS.md
  (timeout-after-effect record)
- CLAIM: ORCA STRONGER to HARVEST for the timeout-after-effect mechanism
- EVIDENCE: STATIC. ORCA-B's own timeout matrix (T1-T4) says the T2/T3
  timeout-after-effect cases remain broken until OUTCOME_UNKNOWN is wired
  (H5). H5 is an unbuilt spec. The branch's own choice is at-least-once
  with honest attempt records; a late effect from a killed dispatcher can
  still double-execute in the exterior agent.
- CALLER: CRITIC-PRODUCT / CALLEE: ORCA-B lane
- WRITER: ORCA-B / READER: parent orchestrator
- AUTHORITY: ORCA-B VERDICTS.md timeout matrix vs the verdict classification
- CLASSIFICATION: OVERCLASSIFIED. Until H5 exists operationally, the
  harvestable mechanism is a PATTERN ONLY (the attempt-scoped rendezvous +
  last_attempt_id nulling), not a closed product hole.
- CONFIDENCE: MEDIUM-HIGH
- BROKEN BOUNDARY: the exterior agent (Hermes/Windows side) where the late
  effect executes; no fence exists there
- DEPENDENCIES: H5 (OUTCOME_UNKNOWN wiring), HS-6 (takeover) as specified
- AFFECTS AGENTS: parent orchestrator, impl lanes that would wire the pattern

Recommendation: reclassify the timeout-after-effect record to PATTERN ONLY
or MIXED until H5 is built and the unknown-execution path is operational.

## P5. CHAOS-A's 1,531 missions are class evidence, not product evidence

- DOMAIN: product value / COMPONENT: program/chaos-a/CHAOS-RESULTS.md
- CLAIM: 164/180 SURVIVED with 7 WEDGED (FC-2), 6 LOST-STATE (FC-3),
  3 DUPLICATED (FC-1 counterfactual)
- EVIDENCE: TEST-BEH. The lane is explicit (section 5): the requested source
  paths did not exist on the Hatch host, so the campaign re-proved A6
  semantics on a file-backed SQLite harness implementing the same documented
  semantics. "Confidence 0.94 in the failure CLASSES; confidence that the
  real implementation contains them is UNKNOWN until the source-specific
  probes run."
- CALLER: CRITIC-PRODUCT / CALLEE: CHAOS-A lane
- WRITER: CHAOS-A / READER: parent orchestrator
- AUTHORITY: CHAOS-RESULTS.md section 5 caveat
- CLASSIFICATION: HONEST, LIMITED SCOPE. The failure classes are real and
  the repros are runnable. But "1,531 missions survived" must not be read as
  "the production system survives these failures." The gauntlet lane
  (W2-GAUNTLET-INFRA) ran against the real sources on the Pig; CHAOS-A did
  not.
- CONFIDENCE: HIGH
- BROKEN BOUNDARY: harness fidelity (documented semantics vs real sources)
- DEPENDENCIES: the Pig SSH copy of the real sources for source-specific
  probes (CHAOS-B queue)
- AFFECTS AGENTS: parent orchestrator (product narrative must keep the
  class-level vs source-level distinction)

## P6. Memory harvest: 34 candidates, zero written to real memory

- DOMAIN: product value / COMPONENT: program/mem-b/MEMORY-HARVEST.md
- CLAIM: the harvest is complete with 34 candidate entries
- EVIDENCE: STATIC. The file states plainly: "No entries were written to
  the real memory system this pass." All H-1 through H-34 remain candidates.
- CALLER: CRITIC-PRODUCT / CALLEE: MEM-B lane
- WRITER: MEM-B / READER: parent orchestrator
- AUTHORITY: MEMORY-HARVEST.md header
- CLASSIFICATION: HONEST BUT UNREALIZED. The extraction work is done; the
  product value (agents actually retrieving these lessons) is zero until the
  entries are written and the index serves them.
- CONFIDENCE: HIGH
- BROKEN BOUNDARY: the real memory index (which was stalled the night of
  the prior pass; MEM-B re-probed forget-at-index and cadence)
- DEPENDENCIES: memory system write path, index ingestion recovery
- AFFECTS AGENTS: parent orchestrator (decide when candidates get written)

Combined with the prior pass's T4 (index stalled 70+ minutes, FORGET-index
serves deleted content): even once written, these entries are only as
useful as the index that serves them.

## Scoreboard (fresh pass only)

| # | Finding | Severity |
|---|---------|----------|
| P1 | Prior product critique physically truncated; checkpoint overclaims | HIGH (deliverable integrity) |
| P2 | HS specs honest but unbuilt: zero product value until wired | MEDIUM (watch) |
| P3 | TEST-A6: recovery proven, mission not completed; do not overclaim | MEDIUM (narrative) |
| P4 | Timeout-after-effect harvest overclassified; hole open until H5 | MEDIUM |
| P5 | CHAOS-A missions are class-level, not source-level, evidence | LOW (lane is honest; narrative risk only) |
| P6 | 34 memory candidates, none in real memory yet | LOW (staged, not lost) |

No prior product finding is closed by this pass. P1 is the only new
blocking-grade finding: the product critique itself cannot be cited as
complete.
