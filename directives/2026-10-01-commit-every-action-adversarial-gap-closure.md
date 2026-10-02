# PING / FYD — COMMIT-EVERY-ACTION + ADVERSARIAL GAP-CLOSURE MODE

Nolan directive, 2026-10-01 ~17:58 MDT. Filed verbatim.

We are changing operating discipline.

**EVERY MATERIAL IMPLEMENTATION ACTION MUST TERMINATE IN A COMMIT.**

This applies even when the work is incomplete.

The purpose is not Git cleanliness.

The purpose is:

`EVERY CHANGE`
`→ DURABLE IDENTITY`
`→ REVIEWABLE DIFF`
`→ REPRODUCIBLE STATE`
`→ AUDITABLE CAUSAL HISTORY`.

## COMMIT LAW

For every writer:

`INSPECT STATUS`
`→ RECORD BEFORE SHA`
`→ IDENTIFY OWNED FILES`
`→ IMPLEMENT ONE SEMANTIC UNIT`
`→ RUN THE CHEAPEST RELEVANT TEST`
`→ REVIEW DIFF`
`→ STAGE ONLY OWNED FILES`
`→ COMMIT`
`→ RECORD AFTER SHA`
`→ ONLY THEN CONTINUE`.

If unfinished but valuable:

**COMMIT IT AS HONEST WIP.**

Do not leave useful implementation floating because it is not complete.

Commit message must state the truth:

`wip: ...`

`fix: ...`

`wire: ...`

`test: ...`

`converge: ...`

`falsify: ...`

as appropriate.

Never:

`git add .`

`git add -A` around unrelated dirty state

commit another lane's files

hide failing tests

silently amend another lane's commit

squash away forensic boundaries during active development

reset/clean unrelated work

stash shared worktree state

push merely because a commit exists.

**COMMIT ≠ PUSH.**

**COMMIT ≠ COMPLETE.**

**COMMIT ≠ VERIFIED.**

**COMMIT ≠ INTEGRATED.**

**COMMIT ≠ REACHED.**

**COMMIT ≠ DEPLOYED.**

## MAKE COMMITS SMALLER THAN THE FAILURE DOMAIN

Do not produce another 29-file "everything so far" commit unless preserving an emergency checkpoint.

Prefer:

`one defect`
`→ one semantic correction`
`→ tests`
`→ one commit`.

A reviewer should be able to answer:

**What proposition does this commit claim is now true?**

If that cannot be expressed in one sentence, consider splitting it.

---

# NOW ATTACK THE SYSTEM ADVERSARIALLY

Stop asking:

**What should we build next?**

Ask:

**What does the product currently claim it can do, and what is the cheapest experiment that could prove that claim false?**

Every lane begins with:

`CLAIM`
`→ REACHED PATH`
`→ AUTHORITY`
`→ FAILURE HYPOTHESIS`
`→ ADVERSARIAL TEST`
`→ OBSERVATION`
`→ SMALLEST CORRECTION`
`→ COMMIT`
`→ RE-RUN`.

No speculative repairs.

No architecture from intuition.

**REPRODUCE BEFORE REPAIR.**

---

# GAP ATTACK ORDER

Attack gaps in this order:

**SECURITY / AUTHORITY**

Can a caller forge tenant, actor, capability, approval, origin, placement, or verification?

**EFFECT SAFETY**

Can a potentially successful external effect be retried because the response disappeared?

**TRUTH**

Can unsupported information become canonical knowledge?

**DURABILITY**

Can an accepted decision disappear after restart?

**REPLAY**

Can canonical history actually reconstruct the same semantic state?

**REACHABILITY**

Is supposedly working code actually called by the served product?

**DEPLOYMENT**

Is tested source actually the source producing served behavior?

**OBSERVABILITY**

Can Mission Control distinguish UNKNOWN from FAILED, unwired from broken, and source state from deployed state?

**DUPLICATION**

Are two implementations claiming the same semantic authority?

**STRANDED VALUE**

Does better implementation already exist in a worktree/stash/branch but remain disconnected?

**MARKETINGOS**

Can observation become evidence, evidence become thesis, thesis become approved action, action become verified outcome, and outcome improve the next decision?

---

# SEARCH BEFORE WRITING

Before every material implementation decision:

inspect FYD;

inspect PING;

inspect relevant existing CRX primitive only when the reached defect justifies it.

Report:

`FYD CURRENT IMPLEMENTATION`

`PING EXISTING IMPLEMENTATION`

`HARVESTABLE CODE`

`DUPLICATION RISK`

`SMALLEST REQUIRED DELTA`.

If existing code already solves 80% of the problem:

**WIRE IT.**

Do not write a prettier duplicate.

If two implementations exist:

determine reached owner;

harvest useful semantics;

converge;

supersede the loser.

Do not build an adapter merely to preserve duplicate architecture.

---

# REQUIRE PROOF AT MULTIPLE LEVELS

Every meaningful feature should eventually climb:

`SOURCE`
`→ UNIT TEST`
`→ INTEGRATION TEST`
`→ CLEAN CHECKOUT`
`→ BUILD`
`→ DEPLOYMENT`
`→ PROCESS`
`→ SERVED PATH`
`→ REAL EFFECT`
`→ INDEPENDENT OBSERVATION`
`→ OUTCOME`.

Report the highest level actually proven.

Never promote:

`TESTED → REACHED`

`REACHED → DEPLOYED`

`DEPLOYED → VERIFIED`

`RESULT → EFFECT`

`EFFECT → OUTCOME`

without evidence.

---

# MARKETINGOS GAP ATTACK

While we're focused on MarketingOS, attack this exact chain:

`REAL WORLD`
`→ ACQUISITION`
`→ OBSERVATION`
`→ EVIDENCE`
`→ CLAIM`
`→ KNOWLEDGE`
`→ OPPORTUNITY`
`→ THESIS`
`→ CONTENT ARTIFACT`
`→ CLAIM VERIFICATION`
`→ HUMAN APPROVAL`
`→ DISTRIBUTION`
`→ INDEPENDENT EFFECT VERIFICATION`
`→ METRICS`
`→ RESPONSE`
`→ OUTCOME`
`→ CANDIDATE LEARNING`
`→ NEXT MISSION`.

For every arrow ask:

**Does it exist?**

**Is it reached?**

**Who owns it?**

**Is it durable?**

**Can it lie?**

**Can it be forged?**

**Can it be replayed?**

**Can Mission Control explain it?**

**What happens after restart?**

**What happens after duplicate delivery?**

**What happens after timeout?**

**What happens after partial success?**

**What happens with conflicting evidence?**

**What happens with wrong tenant/actor?**

**What happens when the model hallucinates?**

**What happens when the external platform lies?**

**What happens when nothing happens?**

The first RED arrow owns the next writer.

---

# MISSION CONTROL IS THE AUDIT SURFACE

Mission Control should make these commits and proofs intelligible.

For a real mission eventually show:

`SOURCE SHA`

`BUILD`

`DEPLOYMENT`

`MISSION`

`AUTHORITY`

`WORKORDER`

`ATTEMPT`

`RESULT`

`VERIFICATION`

`OUTCOME`

`LEARNING`

`UNKNOWN`.

But Mission Control remains projection.

**Never repair missing canonical truth by fabricating prettier UI state.**

UNKNOWN is a successful projection when reality is unknown.

---

# ORCA IS THE PLANNER, NOT THE TRUTH

ORCA should continuously ask:

`WHAT IS THE OBJECTIVE?`

`WHAT ALREADY EXISTS?`

`WHAT IS THE FIRST BROKEN REACHED EDGE?`

`WHAT EVIDENCE PROVES IT?`

`WHAT IS THE SMALLEST ACTION?`

`WHAT AUTHORITY IS REQUIRED?`

`WHAT WOULD FALSIFY SUCCESS?`

`WHAT SHOULD MISSION CONTROL SHOW AFTERWARD?`

ORCA does not get to create architectural primitives because planning would be easier with them.

---

# AUDIT THE COMMITS THEMSELVES

Every few commits, assign a reader/falsifier that did not write them.

Give it the SHAs only.

Have it reconstruct:

`WHAT CHANGED`

`WHAT CLAIM EACH COMMIT MAKES`

`WHAT TEST SUPPORTS THE CLAIM`

`WHAT REMAINS UNPROVEN`

`WHAT NEW FAILURE MODE WAS INTRODUCED`

`WHETHER THE NEXT COMMIT DEPENDED ON UNCOMMITTED STATE`.

Then run from clean checkout.

This is why committing constantly is useful.

The history becomes an experimental notebook.

---

# COMMIT REPORT FORMAT

Every writer reports:

`VERDICT:`

`REPO:`

`BRANCH:`

`BEFORE SHA:`

`AFTER SHA:`

`SEMANTIC CLAIM:`

`FILES:`

`TEST COMMAND:`

`RESULT:`

`REACHED PATH:`

`HIGHEST PROOF LEVEL:`

`KNOWN UNPROVEN BOUNDARY:`

`DIRTY FILES LEFT UNTOUCHED:`

`PUSHED: NO` unless explicitly authorized.

---

# FAILURE IS USEFUL

If an adversarial test breaks something:

**DO NOT IMMEDIATELY PATCH AROUND THE TEST.**

First classify:

`SPEC WRONG`

`TEST WRONG`

`IMPLEMENTATION WRONG`

`AUTHORITY WRONG`

`PROJECTION WRONG`

`DEPLOYMENT WRONG`

`UNKNOWN`.

Then identify the semantic owner.

Then smallest repair.

Then commit.

Then rerun the original hostile test unchanged.

---

# STORAGE DISCIPLINE

C: is guarded, not emergency.

Development continues.

Avoid gratuitous:

duplicate worktrees;

dependency reinstallations;

Docker rebuild loops;

retained screenshots;

giant proof bundles;

model downloads;

generated artifacts.

Do not compromise testing merely to save disk.

No storage architecture work unless thresholds trip again.

---

# SUCCESS

I do not want the next report to say:

`17 AGENTS RAN`.

I want:

`12 CLAIMS ATTACKED`

`5 FALSIFIED`

`5 SMALLEST FIXES COMMITTED`

`5 RE-RUN GREEN`

`2 REMAIN UNKNOWN`

`0 UNCOMMITTED VALUABLE WRITER STATE`

`1 CLEAN CHECKOUT REPRODUCED THE COMPLETE REACHED CHAIN`.

**Turn Git history into the audit trail.**

**Turn hostile tests into the roadmap.**

**Turn every discovered gap into either a tiny proven correction or an explicit UNKNOWN.**

**Attack all reached gaps. Do not manufacture new territory.**

## ORCHESTRATOR REFINEMENTS (Nolan, same message)

- **A writer commits before being reassigned.** If an agent fixes A, discovers B, and gets redirected to C while A sits uncommitted in its worktree, the forensic boundary is lost. Pattern: `A → test → commit A → investigate B`.
- **Independent commit-sequence auditor.** Periodically, a reader/falsifier that did not write the commits gets the SHAs only, no narrative. If it cannot infer why SHA2 follows SHA1, reproduce the claimed test, and identify exactly what remains unproven, the history isn't doing its job.
- **The optimal atomic unit is a semantic proposition**: one commit claims one new thing about the system is true. Small enough to bisect and audit, large enough to include the implementation and its supporting evidence. Not every keystroke; not a 29-file checkpoint.
