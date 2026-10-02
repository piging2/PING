# Swarm correction: fix confirmed P0s without waiting for 30 probes (2026-10-01 ~18:31 MDT, Nolan, binding)

Nolan's verbatim correction to the 30-probe truth-swarm plan:

"The pasted directive is internally coherent, and I agree with its priority: breadth goes into falsification, not more product surface. The two already-confirmed failures — split durable truth and unauthenticated /tenants mutation — are enough to justify temporarily putting the truth/security swarm ahead of visual expansion."

## The correction

Do NOT wait for all 30 probes before fixing confirmed P0s. Run independent probes broadly, but serialize integration around the invariants. Critical order:

1. canonical truth
2. authority
3. privacy / effect safety
4. durability
5. product

"A gorgeous FYD demo built while approvals or journal writes can bypass authority would produce misleading confidence."

## The architectural test (unchanged, confirmed)

PING only earns its weight if these separations survive hostile testing:

- observation ≠ claim
- claim ≠ presentation
- proposal ≠ approval
- approval ≠ execution
- execution ≠ verified effect
- canonical history ≠ projection
- identity ≠ provider account
- relationship ≠ provider action
- agent ≠ authority

## Asymmetric swarm (binding)

Many readers/attackers, very few writers. Give Copilot, Goose, OpenCode, Codex, and existing workers independent propositions and evidence requirements; then let one isolated implementation worker own each minimal patch and a different worker attack it afterward. Preserved from the uploaded directive: clean worktrees, one-proposition commits, dirty-tree protection, hard stops around destructive/external actions.

## The 30-probe exercise is not the product (binding)

"Most importantly, don't let the 30-probe exercise become the new product. Once the canonical-truth and authority P0s are closed, FYD's target remains brutally simple:

Understand my business → build my presence → keep it true → let me change it → connect my world → let agents help safely.

Everything in PING either makes that sequence more trustworthy, portable, and replaceable — or it should eventually be harvested, demoted, or deleted."

## Current P0 state at filing

- Journal truth split: CONVERGED 2026-10-01 ~18:29 MDT (dispatch + approvals + emit.py routed to canonical journal #1, fail-closed; hostile test 9/9). Commits local, unpushed.
- Unauthenticated /tenants write surface: OPEN. Next P0 fix — proceeds immediately, does not wait for the 30 probes.
