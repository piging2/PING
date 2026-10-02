# OWNER QUESTIONS REGISTER

One living register. Every question carries: QUESTION, RECOMMENDED DEFAULT,
WHY OWNER DECISION IS REQUIRED, COST OF DEFAULT BEING WRONG, DEADLINE,
WHAT CONTINUES WITHOUT THE ANSWER. Batch them. Do not repeatedly interrupt.
If the default is reversible and inside standing authority: TAKE THE DEFAULT
AND KEEP MOVING. Classify: PRODUCT BLOCKER / CORRECTNESS / SECURITY /
TECH DEBT / RESEARCH / IDEA.

## OPEN

### Q1: Does brutal execution continue after 2026-09-29?
- RECOMMENDED DEFAULT: YES. No artificial stand-down merely because a date passed.
- WHY OWNER DECISION IS REQUIRED: it sets the program's horizon and resourcing.
- COST OF DEFAULT BEING WRONG: if the evidence shows infrastructure being generated faster than product proof, continued execution burns attention on motion instead of compounding. Mitigation: reassess from evidence at T+24.
- DEADLINE: 2026-09-29 14:26 MDT (T+24 evidence package).
- WHAT CONTINUES WITHOUT THE ANSWER: the program continues on the default; at T+24 we reassess against the chain URL -> UNDERSTANDING -> FYD PRESENCE -> ASK -> EVIDENCE -> OWNER CHANGE -> PERSISTENCE. If converging, keep going. If not, STOP THE WAVE and collapse onto the first broken customer boundary.
- CLASS: PRODUCT BLOCKER (horizon-setting)

## ANSWERED / SUPERSEDED

### Q2: MC routes/frontend dirty — commit or revert before further MC work? — RESOLVED 2026-09-28
- RESOLUTION: FROZEN as-is (the recommended default was taken). Dirty canonical Mission Control is preserved untouched; preservation record at ~/workspace/ping-24h/dirty-mc-freeze-2026-09-28.md. Phase 1 approval-door work proceeded in the isolated worktree off 0264d517. The commit-or-revert decision itself is deferred to before Phase 2 (MC backend seam) begins. Nothing may reset, revert, merge over, or build on the frozen tree.

### Q-gate-order: Approval gate ordering policy (STALE_SUPERSEDED vs terminal decisions) — RESOLVED 2026-09-28
- RESOLUTION: Owner ratified terminal-first semantics: lookup proposal -> verify identity/access sufficient to inspect the decision -> if TERMINAL, return the immutable terminal result with ZERO MUTATION -> otherwise capability -> digest -> base/current-state -> transition rules -> authorize/apply -> canonical event -> projection. STALE_SUPERSEDED applies only while a proposal is still pending; ALREADY_DECIDED applies after the terminal boundary. Brief and acceptance test updated to match; 17/17 required on both the implementation worktree and pristine replay checkout; convergence lane frozen after green. No further architecture waves in this lane.
