# Competitive Technology Plan: Western Colorado

Nolan's directive, 2026-09-14. First: the plan on the software intelligence.
Nolan holds the git side. This plan covers intelligence, rollout, and messaging.

## Objective

Build a living competitive model of the Western Colorado home-service market,
reproduce the highest-value mechanisms at near-zero marginal cost, and turn
proven capabilities into funny, truthful marketing. Expand integration work
beyond Orca frameworks: finish and improve the incomplete integration specs,
not just the Orca ones.

Ordering, always: REUSE -> COMPOSE -> ADAPT -> AUTOMATE -> BUILD.

## What software intelligence we already hold

1. `~/workspace/outreach/software-playbook.md` — ~40 tools across FSM/CRM,
   estimating/quoting, accounting/payments/financing, answering services, call
   tracking, reviews, agencies, lead marketplaces, chat/booking, AI answering
   competitors. Every tool graded on what it does well, its gaps, and the PING
   pitch tailoring. Top-3 universal leaks named: missed/after-hours calls,
   dead estimates, web leads waiting on busy humans.
2. `~/workspace/marketing-intel/capability-map.md` — 21 capabilities, each with
   who does it well, tools, costs, mechanism, piggyback route, current
   capability, gap, and worth-closing verdict. Summary: highest-leverage gaps
   are missed-call text-back, review-request loop, reactivation, referral ask,
   competitor watch, and the client reporting template.
3. `~/workspace/marketing-intel/discoveries.md` — D1 (missed-call text-back,
   accepted with revisions), D2 (marketplace arbitrage, hypothesis), D3
   (review loop, accepted), D4 (competitor watching, accepted), D5 (no-glue
   rejection for internal stack, accepted), D6 (AI voice answering, hypothesis).
   Binding cross-cutting rules: Nolan-hours budget, capacity check, Quo
   concentration with exit sketch.
4. `~/workspace/marketing-intel/arbitrage-queue.md` — Q1-Q9 experiments, all
   pre-registered with falsification criteria and Nolan-hours. Explicit rejects:
   n8n/Zapier/Make (internal), Podium, CallRail (pending Q9), Postiz, paid
   lead marketplaces, cold SMS.

## Execution sequence (not a roadmap)

### Phase 0: enablers, no authorization boundary, do first
- Q7: standard client reporting template (calls, conversations, booked jobs,
  revenue, source). ~2 hours, one-time. No template, no pilot. DO NOW.
- Q9: Quo native attribution check (recording, transcription, source/number
  tracking, webhooks). 30 minutes. Closes capability #17 or states the gap.
  DO NOW.
- Q8: AI voice answering research (Sona pricing/capability/failure modes,
  independent options, disclosure rules, homeowner appetite, voice-vs-text
  head-to-head data). Promotes or kills D6. DO NOW, research only.

### Phase 1: competitive map seed
Top-3 visible winners per trade per town, starting Grand Junction, then
Fruita/Palisade/Montrose/Delta/Durango/Glenwood. For each: OBSERVED only at
first (website stack via headers/inspection, GBP presence, review cadence,
photo cadence, offers, response signals). INFERRED and UNKNOWN kept separate
and labeled. Output: the living map file (see below). Existing machinery:
the h-brief rotation already hunts; the map file becomes its target artifact.

### Phase 2: mechanism decomposition
For each strong competitor, decompose one capability at a time:
CAPABILITY -> MECHANISM -> SOFTWARE (observed/inferred/unknown) ->
COMMERCIAL COST (public evidence only) -> OPEN-SOURCE/FREE SUBSTITUTE ->
PING/PIG/ORCA SUBSTITUTE -> CURRENT CAPABILITY (proven from our system) ->
GAP -> LEVERAGE -> TEST (smallest experiment).
Never record "competitor has good marketing." Record the mechanism.

### Phase 3: arbitrage rollout, in this order
1. Q1 missed-call text-back client pilot (eligible clients only: missed-call
   volume AND unmet capacity; 10DLC registered; falsification pre-registered).
2. Q3 review-request + referral-ask combined loop (dogfood mechanics, then
   client pilot, 60 days, universal solicitation, no review gating ever).
3. Q4 competitor watch (host proven first; 10 non-Google surfaces; 30-day
   decision-changing bar; Google surfaces excluded per ToS).
4. Q5 reactivation template (needs a client customer list).
Q2 stays blocked until a demand-side signal per trade is named.

### Phase 4: messaging from proven capabilities only
No joke ships without a proven capability behind it. Recurring devices live in
`competitive-messaging.md`. Each device draft carries: the absurdity (public
evidence), the mechanism, what we composed, what it actually did. The PING
Social content queue draws from this file, never the reverse.

### Phase 5: the ultimate test
Fresh Business Agent, same mission: WITHOUT PING vs WITH PING. Compare
research, decision, action, speed, personalization, opportunity quality,
outcome, evidence, explainability. If PING makes no difference, say so. That
is a failed hypothesis, not a reason to manufacture success.

## Spec-completion workstream (beyond Orca)

There are incomplete integration specs beyond the Orca frameworks. Standing
rule: finish and improve them in place, in priority order of the arbitrage
rollout. No new integration framework. No second automation authority. A
spec moves to done only when a live deployment proves it.

## The living artifacts

- `competitive-tech-plan.md` (this file): the plan.
- `competitive-tech-map.md`: the 14-section living map Nolan specified.
  Updated by the existing marketing-intel rotation; no new schedule.
- `competitive-messaging.md`: the competitive-messaging evidence base with
  the recurring devices, voice rules, and the evidence-only rule.
- `arbitrage-queue.md`: unchanged as the experiment ledger; new experiments
  enter it with falsification criteria and Nolan-hours before starting.

## Hard constraints (Nolan's list, binding)

No second marketing authority. No second event spine. No new knowledge store.
No duplicate CRM. No SaaS bought because competitors use it. Build only after
checking open source. No copying competitor content. No unsupported
performance claims. No fabricated competitor technology. Vendor claims are
never evidence. No vanity metrics. No sacrificing PING sovereignty for
marketing convenience. Research exists to identify a deployable advantage;
endless research is not the job.

## First automatic moves (executed now, no boundary crossed)

1. Q7 reporting template: built (see `client-report-template.md`).
2. Q9 Quo attribution check: run now.
3. Q8 Sona/voice research: delegated now.
4. Competitive map seed: delegated now (Grand Junction trades, OBSERVED-only).
5. Messaging devices: seeded in `competitive-messaging.md`; first jokes enter
   the PING Social queue only after a capability is proven.
