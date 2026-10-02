# Hermes Decision Brief — Sweep Defects (2026-09-25)

Source: Hermes (Pig desktop agent) via prompt-hermes.sh, analysis only, no code changes.
Filed for the four sweep defects awaiting Nolan's ownership calls.

---

**Decision Brief – Read-Only Sweep Findings (2026-09-25)**
*Analysis only – no file changes, no patches.*

---

### 1. tenanos-int-tree (tenant-isolation gates stripped)

**Strongest argument to fix now**
Restoring the gates eliminates a class of privilege-escalation bugs that could let one tenant read or mutate another's data. The defect is isolated to an unmerged branch, so fixing it now prevents the insecure code from ever entering mainline and avoids a future hot-fix when the branch is eventually picked up.

**Strongest argument to leave alone**
The branch is experimental and may be abandoned; investing effort to revert or re-apply gates could be wasted if the work is discarded. The current trunk already has correct isolation, so the risk is confined to a dead-end branch.

**Recommendation and required decision**
*Revert the branch to the last known-good state that contains the gates.*
Nolan must decide whether to reset the tenanos-int-tree branch to the commit that still has the gates (or equivalently create a new branch from that commit and delete the old one).

**Blast radius if wrong**
- *If left unfixed*: Should the branch be merged later, the system would lose tenant isolation, enabling cross-tenant data leaks and potential compliance violations.
- *If reverted unnecessarily*: Minimal – only the experimental work is lost; the trunk remains safe, and any valuable changes can be re-ported after gates are re-added.

---

### 2. ORCA port branch (competing HOLD implementation)

**Strongest argument to fix now**
Two independent implementations of the same constitutional HOLD semantics create ambiguity, increase maintenance burden, and risk divergent behavior during incident response. Consolidating now prevents future bugs where one path is updated and the other is not.

**Strongest argument to leave alone**
The branch may be exploring a performance or ergonomic improvement that the canonical HOLD lacks. Discarding it could discard a useful optimization that would need to be re-implemented later.

**Recommendation and required decision**
*Retire the branch and migrate any unique, non-conflicting improvements into the canonical HOLD via a small, focused patch.*
Nolan must decide whether to close the ORCA port branch and, if desired, open an issue to track extracting any novel changes (no code written now; just record the intent).

**Blast radius if wrong**
- *If left alive*: Parallel implementations will drift, causing confusion in code reviews and possibly inconsistent HOLD behavior at runtime, increasing debugging effort and risk of incorrect state transitions.
- *If retired prematurely*: Any genuine optimization in the branch would need to be rediscovered and re-added later, a modest overhead compared with the ongoing cost of maintaining duplicate logic.

---

### 3. post-effect-hold (uncommitted WIP conflicts F-01 spec)

**Strongest argument to fix now**
The WIP's semantics directly contradict the authoritative F-01 state-machine prose, meaning any future commit would introduce a spec-code mismatch that could cause state-machine misinterpretation, incorrect effect ordering, or test failures. Aligning now keeps the spec as the single source of truth.

**Strongest argument to leave alone**
The WIP may be an intentional experiment to evolve the F-01 model; committing it as-is and then updating the spec could capture a legitimate improvement that the current prose lacks.

**Recommendation and required decision**
*Drop the WIP (discard the uncommitted changes) and preserve the F-01 prose as the definitive reference.*
Nolan must decide whether to wipe the uncommitted work, leaving the branch clean and the F-01 document unchanged.

**Blast radius if wrong**
- *If committed as-is*: The codebase would contain a spec-violating implementation, likely causing failing tests, incorrect runtime behavior, and a need for a later spec change that could have been avoided.
- *If dropped unnecessarily*: Any genuine improvement would be lost; however, because the work is uncommitted, it can be re-created from scratch if later deemed valuable, making the cost low.

---

### 4. Gateway integration (routes unscoped to tenants)

**Strongest argument to fix now**
Scoping routes now eliminates a latent multi-tenant security flaw that will manifest as soon as a second tenant is onboarded. Addressing it early avoids a costly, emergency patch under production pressure and guarantees the system is safe by design.

**Strongest argument to leave alone**
The current production environment runs a single tenant, so the defect is not exploitable today. Fixing now adds scope to a change that could introduce routing regressions if the scoping logic is imperfect.

**Recommendation and required decision**
*Scope the routes to tenants now, using the existing tenant-ID extraction middleware.*
Nolan must authorize a scoped-routing patch and ensure the change passes the existing test suite before merging. The decision is whether to proceed with the scoping change now or accept the latent defect with an explicit trigger (second tenant onboarding) for fixing it.

**Blast radius if wrong**
- *If left latent*: Upon addition of a second tenant, requests could leak across tenants, leading to data exposure, privilege escalation, and potential breach notifications. The fix would then be required under urgency, increasing risk of errors.
- *If scoped incorrectly*: Mis-scoped routes could block legitimate traffic or cause 403/404 errors for the existing tenant, impacting availability. However, because the change is confined to routing logic and can be tested against the current single-tenant traffic, the blast radius is limited and reversible.

---

*End of brief – total words approx 860.*
