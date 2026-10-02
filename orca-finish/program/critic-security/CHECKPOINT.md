# CRITIC-SECURITY Checkpoint — ORCA FINISH Wave 2+

**Lane:** CRITIC-SECURITY (independent security critic). **Status:** SPUN 2026-09-23 ~20:05 MDT (retry after transient spawn DB lock timeout; first attempt did not start).
**Posture:** READ-ONLY everywhere. Never certify. Falsify. No commits. No production writes. No em dashes.
**Evidence grades:** STATIC (read source) / TEST (ran code) / LIVE (witnessed).
**Scope note:** do not duplicate W2-REDTEAM code attacks or Agent 19 conclusion falsification; their checkpoints read 20:08 MDT. My dimension = security posture of program outputs and claims.

## Binding inputs absorbed
- W2-REDTEAM CHECKPOINT.md (20:05 MDT): attack plan + findings BR-A1..A9 on `feature/orca-autonomy` @ ae55b77ff. Deconfliction: their surface = W2-IMPL-STATE / W2-IMPL-SAFETY code + branch integration code. My surface = security claims made by lanes (Missions, Gauntlet, Impl-State, Impl-Safety, Program), secret handling, tenant isolation claims, auth bypasses, projection seams (XSS), scratch-to-prod harness leakage.
- Agent 19 CHECKPOINT.md (20:02 MDT): claims-level falsification. I do not touch conclusions; I touch security-relevant claims only.

## Attack plan
- T1: XSS projection seam (W2-MISSIONS): `src/fyd/object/view.ts` buildCapabilities `javascript:` URLs; DisplayMedia src ungated. Verify fix landed? Is `resolveSafeLink` a complete choke point? Probe /o page and sibling render paths. (Pig-side; read-only via `~/workspace/pig/pigwsl-run.sh '<bash>'`.)
- T2: Secret handling audit: program outputs + new code for raw credentials/tokens/bearer values in files. Pig bearer tokens must never be in files.
- T3: Tenant isolation claims: `tenant_id` carried but single-tenant loop — is the claim honest? Cross-tenant read/write via projection seams, memory, run records.
- T4: Auth bypasses: EventGovernance `_skipGovernance`, IdentityAuthority bypassed by inline minting (C4), approval schemes that don't bind arguments.
- T5: New code as it lands: W2-IMPL-STATE `orca_run_record.js`/`orca_ready_set.js`, W2-IMPL-SAFETY output, program-lane harnesses (scratch -> production leakage?).

## Log
- 20:08 MDT: checkpoint file created. Starting T1 (XSS seam) + T2 (secret sweep) in parallel.

## Log (continued)
- 20:08-21:00 MDT: T1 XSS seam investigation started; Pig exec intermittently hit "failed to store metadata for session ... timed out" (transient, same as spawn failure; retried unchanged, succeeded). fyd-factory repo location not yet pinned (QA-HOSTILE A35/A36/A44 evidence lives Pig-side; W2-MISSIONS artifacts saved locally at wave2/missions/artifacts/).
- 21:00-21:30 MDT: parent follow-on tasks executed: (a) P-7 fabrication-surface assessment (C5 PHANTOM-HUNT), (b) ORCA-A verdicts security assessment (fencing detect-not-prevent + complete() ABA). Deliverable SECURITY-CRITIQUE.md written. Findings: F1 P-7 LIVE (unauthenticated endpoint, disk-persisted fabrication, canonical journal NOT contaminated); F2 LATENT (detect-not-prevent confirmed, zero production callers); F3 LIVE (complete() ABA on mainline, C3 convergence). Deconfliction with W2-REDTEAM noted (their A6/E2 attacks not yet run; no duplication).
- Next: re-verify XSS fix when constitutional sprint lands it; audit new impl landings for F2 fix; probe tenant isolation on run record; continue XSS projection-seam hunt (T1).
