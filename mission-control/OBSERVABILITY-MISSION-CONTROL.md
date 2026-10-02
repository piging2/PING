# Observability Mission Control

**Status:** design thinking, 2026-09-25 ~21:00 MDT. Not built. This doc is the thinking; the MVP section is the smallest real proof.

## 1. The actual problem

Nolan is the convergence and review layer for a growing machine fleet: FYD product lanes, ORCA coordination, falsifier lanes, the outreach engine, security lanes, cron sweeps, the Pig's power holder. He has no live shell in chat. He judges everything from returned evidence on his phone.

Tonight produced the exact failures a mission control exists to prevent:

- **False green.** The privacy lane self-reported GREEN (3 commits, suites green). It was false: the branch never merged, its objects are gone. Nothing independently verified the claim before it reached Nolan.
- **Silent freeze.** The outreach engine hit an authority ambiguity and froze the campaign without raising a visible HOLD. The ambiguity was discovered by accident, hours later.
- **Stale numbers.** "23 dirty files" lived in context long after the live inventory said 1489 untracked / zero modified. No timestamp, no source link, nobody noticed.
- **Ambiguous failure.** A sleeping or unreachable worker looks identical to application failure from chat. ("A sleeping worker machine must not masquerade as application failure.")
- **Path-only handoffs.** Evidence exists but isn't openable where Nolan reads it.

Mission control is the fix: one truthful window over everything, where every claim links to its evidence, every number carries an as-of, and silence is never mistaken for health.

## 2. What it is not

- Not a vanity metrics dashboard. No commit counts, no token burn graphs, no activity theater.
- Not a new event store, journal, or database. PING already has the event/evidence plane. Mission control is a **projection** over it.
- Not an alert firehose. Paging follows Nolan's standing reporting discipline: prospect replies, real mistakes, genuine decisions, failures, security/privacy findings, completed proofs, consequential HOLDs. Everything else stays quiet.
- Not a replacement for chat. Chat is where Nolan decides; mission control is where he sees.

## 3. Principles (Nolan's laws, applied)

1. **Truth has layers.** Source truth (append-only events) -> derived truth (projected state) -> presented truth (the panel). Drill-down always reaches source. Never conflate.
2. **Failure is information.** A lane that hasn't reported is UNKNOWN, never green, never failed. "Nothing exists" and "the system failed to find it" are different states and render differently.
3. **Evidence before eloquence.** Every status row links to the artifact, log, gate output, screenshot, or diff that proves it. "Show me," not "trust me."
4. **Falsification-first.** Worker claims and falsifier verdicts sit side by side. Worker says GREEN, falsifier says DIVERGED: the panel shows the conflict, not the claim.
5. **Protect attention.** Quiet by default. The panel pages only on the categories Nolan named. A healthy night is a dark panel.
6. **Determinism where it matters.** State changes are typed events with correlation IDs. The panel is replayable: same event history -> same displayed state.

## 4. Architecture

```
LANES / WORKERS / CRONS / ENGINES
        |  emit typed events (already produce handoffs; formalize it)
        v
PING EVENT PLANE (append-only journal, existing)
        |  projector (small, deterministic)
        v
LIVE STATE (one JSON document)
        |  served privately (Tailscale, same pattern as demo sites)
        v
MISSION CONTROL PAGE + paging rules
```

**Event schema (minimal):** `LANE_STARTED, CHECKPOINT, GATE_RESULT, ARTIFACT_PUBLISHED, HOLD_RAISED, HOLD_CLEARED, ESCALATION, LANE_COMPLETED, LANE_FAILED, HEARTBEAT`. Each carries: lane id, correlation id (night-scoped parent), timestamp, and a link to evidence. That is the whole schema to start.

**No new persistence, ever.** The 2026-09-13 continuity guardrail stands: the missing layer was always instrumentation + correlation IDs + projection, not another store. If a proposal needs a new database, it is wrong.

**Liveness.** Every long-running worker emits HEARTBEAT on a cadence. Missing heartbeat past threshold renders the lane STALE/UNKNOWN with last-seen time, never failed, never green. The Pig's keep-awake holder heartbeat is the existing model. Power/reachability is a first-class row: if the Pig goes dark, the panel says THE PIG IS DARK instead of letting every lane time out mysteriously one by one.

**Freshness.** Every number on the panel carries as-of + source link. Stale figures become impossible by construction.

## 5. The seams: tied into everything

**FYD product loop.** Lane status -> gate results (visitor-regression-check, suites) -> proof package assembly (SHA, screenshots, URL, owner-mode status) -> Nolan's verdict recorded as an event ("would I choose this?" yes/no + note) -> outcome feeds the learning loop. The 05:00 proof is not a chat message; it is a mission-control card that goes green only when gate=ALL PASS, screenshots=3, URL=live. Nolan taps the card, sees the screenshots, records the verdict. The verdict is evidence for the next iteration.

**ORCA coordination.** QUEUE.md and HOLD-UNKNOWN.md stop being static files and become live projections of the event stream. Leases render with expiry; a lease that expires without a checkpoint flags itself. Falsifier verdicts appear next to the worker claims they check. The "never manufacture patches" rule gets a visible counterpart: lanes with no falsifiable output render as IDLE, not busy.

**Outreach engine.** Cap gauge (x/10 UTC day), sweep status, ladder states, freeze state with reason and expiry. Tonight's authority ambiguity would have been a HOLD card the moment the engine froze, with the conflicting directives cited. Prospect replies are the one outreach row that pages.

**Security and privacy.** The identity/quota verdicts render as a standing panel: identities, spendability classification, task_counts, reclassification triggers as watch rules (task_count>0 on 5-10 -> page immediately). The five privacy behaviors render as a matrix (EQUIVALENT / DIVERGED / UNTESTABLE) per branch. No branch is ever described as carrying guarantees the matrix doesn't show.

**Machine and cron.** Keep-awake holder status, battery, reachability, cron next-runs and last outcomes. A failed cron is a row with its log linked, not a silent gap.

**Ask FYD and the owner loop (the product tie-in).** Visitor question -> retrieved evidence -> answer + citations -> owner correction -> regen -> outcome. Each loop is a traced, timestamped thread. This is where mission control stops being ops tooling and becomes product: the compounding asset (business graph -> outcomes -> learning) is visible as it compounds.

## 6. Two customers, one substrate

**Customer 1: Nolan, the operator.** "Is the machine healthy? What needs me?" Lanes, gates, holds, blockers, proofs, security posture. Quiet by default, paging on his categories.

**Customer 2: the business owner.** "Is my site healthy? What are visitors asking? What changed?" They never see lanes or gates. They see: your site is live, 3 visitors asked about emergency service this week, you corrected your hours Tuesday, here's what changed and why. Same event substrate, different projection, different authorization boundary.

This is the deepest tie-in: observability is not overhead on the product. For FYD, **the observable loop is the product**. An owner who can see what visitors ask, what FYD understood, and what changed when they corrected it will trust the system. Provenance stops being a debug feature and becomes the trust surface ("Why this?" -> the website services page -> observed date -> direct evidence).

## 7. MVP: the smallest real proof

1. Formalize the event schema (the 10 types above) and give every lane a single emit helper. Lanes already write handoffs; this just types them.
2. One deterministic projector: journal -> one JSON state document.
3. One privately-served page: lanes, gates, holds, blockers, proofs. Phone-first layout.
4. Heartbeat + staleness rendering.
5. Paging wired to exactly Nolan's categories, nothing more.

No auth system yet (private Tailscale surface, same as the demo sites). No historical analytics. No owner-facing projection until the operator view is truthful for a full week. If the operator view ever shows a false green, that is a P0 against mission control itself: the one system that is never allowed to lie is the one that reports on truthfulness.

## 8. Anti-patterns, learned tonight

- **Self-reported GREEN without a gate or falsifier sign-off.** Every green needs one of the two, else UNKNOWN.
- **Numbers without as-of and source.** Impossible by construction in the new panel.
- **Silent freezes.** Every freeze is an explicit HOLD event with reason + expiry, or it didn't happen.
- **Path-only evidence.** Every row opens its evidence where Nolan reads it. No bare WSL paths.
- **Activity as health.** A lane emitting checkpoints with no falsifiable output is IDLE, not productive.

## 9. Open questions for Nolan

1. Paging is currently your seven categories (replies, mistakes, decisions, failures, security/privacy, proofs, consequential HOLDs). Anything to add or cut before I wire it?
2. Phone-first single page, or do you also want a desktop-dense view? (Default: phone-first; the dense view is cheap later.)
3. Should the owner-facing projection be in scope for v1, or strictly after the operator view survives a truthful week? (Recommendation: after.)
4. Do you want tonight's lanes retrofitted to emit the typed events (backfill the journal from the handoffs and artifacts), or start the journal fresh at 05:00? (Recommendation: backfill; tonight's evidence is too good to lose.)
