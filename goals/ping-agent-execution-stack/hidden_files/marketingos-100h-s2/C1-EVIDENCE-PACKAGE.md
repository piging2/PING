# C1 Evidence Package: Your Audit Log Is Not Evidence

MarketingOS Sprint 2, Block 45-60. Thesis/evidence package for opportunity C1.
Research date: 2026-09-30. Verdict: ADVANCE, narrowed. No commit; Nolan approval
pending per block 60-70 lane law.

## Layer 1: The Hook (read this in 20 seconds)

We graded 34 production CRM and agentic systems on one question: can any of them
replay a past decision deterministically from an immutable event plane? The
scoreboard says zero. Everybody ships audit logging. Nobody ships replay. The
best in field are Linear's HMAC-signed webhooks and Intercom Fin's debugger
back-test. One system outside the category already proves the standard is
engineerable: Temporal. Our own system does not claim the grade either. This
piece argues FOR the standard, not that we have met it.

## Layer 2: The Mechanism (read this in 3 minutes)

Audit logs answer "what changed." Replay answers "can you prove this decision
would be made again, identically, from the same evidence." These are different
questions, and the industry only answers the first.

The mechanism gap is architectural. A CRM keeps its audit trail on mutable
current-state storage: the log is a feature of the record system, not an
immutable source of truth. You can list what changed, when, and by whom. You
cannot pin the inputs at decision time and re-derive the decision later,
because the inputs were never pinned and the derivation was never recorded as
a deterministic function of pinned events. "We have an audit log" is true and
insufficient, the way a bank statement is true and insufficient as proof of a
risk decision.

The survey (34 systems, graded this sprint) found the ceiling of the category:
genuine timelines and audit logs on mutable storage (grade B), lossy
consolidated stories like Asana's (grade B lossy, independently confirmed),
draft-then-execute like D365 Copilot Cowork (grade C, vendor-described). No
system in the survey pins an immutable event plane and replays decisions from
it. The 2026 agentic CRM wave adds generation on top of the same mutable
state; agents are not replay.

The standard we argue for is narrower than the draft wording, because the
honest version survived the steelman. It is NOT bit-identical replay of LLM
generation (a strawman; conceding that was a narrowing, not a retreat). It is
two things: (a) replayable deterministic derivations (scores, projections,
state transitions) from a pinned immutable event plane, and (b) artifact-level
regression for the nondeterministic layer, the Intercom Fin pattern: back-test
a fix against the original conversation and prove it worked, not just ship it.
Fin's debugger is the category's only production example of replay-as-proof,
and it is independently corroborated. Everything else is audit logging with
better fonts.

The strongest counterevidence proves the standard is engineerable, not that
the category has it. Temporal's Event History is a complete ordered log that
workers re-run workflow code against; non-determinism is policed mechanically
(banned `Date.now()`, banned random, replay-safe APIs return recorded values).
That is the deterministic layer the thesis asks for, running in production
workflow infrastructure today. The primitive exists. The CRM/agentic category
has not adopted it. QLDB, one of the named candidates, is dead (end of support
July 31, 2025). immudb 1.11 and KurrentDB (formerly EventStoreDB) are
infrastructure, not CRM/agentic systems, and neither offers deterministic
replay of decisions.

Then the reckoning. Our own trigger seal, demonstrated in mission
8924ebeeb4094c37 (verdict SCOPED), binds only non-owner non-superuser roles.
Our production app role `ping` is a superuser sitting outside the seal.
Production holds by app discipline, not the database. We do not claim
continuity-A. The standard would mean nothing if we exempted ourselves, so
the S-2 reckoning is in the package, not in an appendix.

What falsifies this piece is stated up front: one surveyed vendor demonstrates
deterministic replay of a decision from an immutable event plane, and the
survey-bounded claim dies the same day. A production CRM ships continuity-A,
and the slot is occupied. Five kill criteria live in section 8. The first one
that fires ends the thesis.

## Layer 3: Engineering Proof (for the reader who drills)

### 2. Common knowledge (established, attributed)

Event sourcing is textbook architecture, not an invention. Martin Fowler's
formulation: capture all changes to application state as a sequence of events,
rebuild state by re-running the log, and get the audit trail and
reconstruction "for free." The costs are equally established: eventual
consistency, event schema evolution (history is never rewritten, so old events
must stay readable forever), and more moving parts. Fowler's guidance is to
apply it where the benefits justify the cost, not as a blanket mandate.

Deterministic replay is a described standard in workflow infrastructure,
per Temporal's own documentation. Temporal's Event History is "a complete,
ordered log of everything that has already happened in a Workflow" and "the
source of truth for everything that happens in a Workflow"
(docs.temporal.io/encyclopedia/event-history). Workers do not restore
snapshots; they re-run workflow code against recorded events, which forces
workflow code to make the same decisions given the same history. The Temporal
Swift SDK's `WorkflowReplayer` replays a workflow against a recorded history
to verify that code changes stay deterministic. Banned primitives
(`Date.now()`, `Math.random()`, direct network calls) plus replay-safe APIs
are the enforcement mechanism. Two bounds, verified by our hostile review:
Temporal histories have retention limits, and they carry no cryptographic
tamper-evidence. This is the closest existing engineering to the thesis's
standard, as described by its own vendor, and it is confined to the
workflow-orchestration domain.

Tamper-evidence is a solved primitive; replay is not. immudb 1.11 (released
2026-05-05) added immutable audit logging with PostgreSQL compatibility
(vendor press release, syndicated). That is tamper-evidence of a data plane,
not deterministic replay of a decision plane. The two capabilities solve
different problems, and conflating them is exactly how audit-log marketing
works.

### 3. Our observation (the scoreboard, graded)

The 34-system survey grades every in-category system on the continuity axis.
Zero systems reach continuity-A, defined as deterministic replay of a decision
from an immutable event plane. Conjunction caveat, stated plainly: the
definition's two halves are individually occupied elsewhere. Temporal
describes replay (workflow domain, vendor-described); immudb ships
tamper-evidence of a data plane (vendor-described). The claim is that no
surveyed in-category CRM/agentic system combines both, and the demand for the
combination is unobserved: the survey does not establish how many buyers
would pay for it. The best results, with this session's evidence grades:

- **B (derivable):** Linear's HMAC-signed webhooks for every create, update,
  and remove event (`Linear-Signature` header, HMAC-SHA256 over the raw body,
  hex-encoded, verified against a signing secret; three independent sources
  this session). Derived stream, not immutable source; the mechanism itself
  is confirmed independent.
- **B (derivable):** Intercom Fin's debugger skill: traces internal reasoning
  steps, finds the root cause, proposes a rewrite, back-tests the change
  against the original conversation, and suggests a production monitor
  (VentureBeat interview ~138 days before this session; corroborated by
  DevRev's competitive piece and myaskai operational detail). Vendor-described
  and corroborated; not independently tested.
- **B (lossy):** Asana's task stories. Phil Seeman's canonical explanation on
  the Asana forum: the web app "consolidates" multiple changes by one user to
  one data element within 24 hours, reporting only the last; the API returns
  only what the web app shows. Independently sourced this session (three
  forum threads). Genuinely lossy.
- **C (propose-don't-act):** Microsoft D365 Copilot Cowork's draft actions
  shown before they execute. Microsoft engineering blog only; vendor-described.
- **B (lossy), unreplicated this session:** Common Room's mandatory entity
  binding. Official-docs claim; this session's search drowned in noise and
  Common Room was acquired by Zoom in July 2026, so docs may have moved.
  Vendor-described, pending doc recovery.

The convergence pattern is real: everyone ships audit logging, nobody ships
replay. A "CRM built on event sourcing" search returned only hobby and OSS
repos (jtiemann/crm, 5queezer/nexus-crm design doc, a Laravel CRM). No
production CRM claims event sourcing as its architecture. The negative result
is itself a finding.

The pain this addresses is observed, not invented. HubSpot's July 2026 terms
incident (effective July 1, contact-data pooling into a shared enrichment
dataset, opt-out; fully reversed July 5 after four days of public backlash,
CPTO Duncan Lennox's "We made a mistake") shows trust is the category's
currency, and the trust failure was precisely about unaccountable data
derivation. HubSpot has since moved fast on agents (Agent CLI public beta
June 23, 2026; Agent Hub/Builder public beta July 23, 2026; Spotlight agent
rebuild September 16, 2026). Agents are not replay.

### 4. The narrowed standard, defined precisely

**continuity-A:** given a pinned immutable event plane, a system can
deterministically replay (a) its derivations (scores, projections, state
transitions) and (b) artifact-level regression for nondeterministic
generation (replay the original input artifact against a fix, verify the
fixed output; the Fin pattern). What the standard does NOT require:
bit-identical replay of LLM generation. Model weights, sampling seeds,
prompt text, tool results, and world state drift between runs; demanding
bit-identical generation replay is the wrong standard, like demanding
bit-identical replay of a human decision. The deterministic layer (pinned
inputs, recorded derivations, ordered transitions) is where the guarantee
lives. The nondeterministic layer gets artifact regression as proof.

Survey-bounded claim: across the 34 surveyed CRM/agentic systems (surveyed
2026-09-30), zero ship continuity-A. This is not a universal claim. It dies
the moment any in-category system demonstrates it.

### 5. S-2 reckoning (mandatory, not an appendix)

Our own trigger seal, demonstrated on a disposable PG 15 instance in mission
8924ebeeb4094c37, binds exactly the non-owner, non-superuser role class.
U2-C1 through C7 CONFIRMED; thesis E verdict SCOPED. The demonstrated
boundaries: superusers bypass via `session_replication_role=replica`
(U2-C5, verbatim post-trial row `bypassed`); the table owner can DROP TRIGGER
(U2-C6). Sprint-1 C8 established that the deployed Oracle app role `ping` is
a superuser. Combined: the production journal's append-only guarantee holds
via app discipline, never via the database.

This package argues FOR the standard, not that we have met it. What we can
honestly claim: append-only events as observed in the journal reads of
2026-09-30 (production app behavior unverified), causality wiring (per S-7),
and a class-bound trigger seal, all scoped to the roles they bind. What we
cannot claim: deterministic replay demonstrated end-to-end in our journal.
Pinned replay proof is follow-up work (experiment E-1 below). This honesty is
the point; the standard would mean nothing if we exempted ourselves.

### 6. The Temporal counterargument, answered

The steelman: Temporal proves replay is engineerable, so "nobody ships it in
CRM" is not a discovery, just a backlog item. Bit-identical replay of agent
generation is a gold-plated strawman; buyers pay for tamper-evidence (SOC 2,
SOX), not replay; audit logs plus per-decision reasoning artifacts (6sense
style) get 90% of the accountability at 10% of the cost; immutability carries
a real GDPR Article 17 cost.

Where the objection is right: bit-identical replay of LLM generation is
indeed a strawman, and conceding it narrowed this thesis. The cost argument
is real and belongs in the standard's own documentation, not as a
refutation: Fowler's schema evolution, more moving parts, and crypto-shredding
engineering are genuine adoption costs.

Where our evidence differs: Temporal's own design separates the
deterministic orchestration layer (replayed) from nondeterministic
activities (recorded, not replayed), which is exactly the two-layer standard
we now argue for. That does narrow our novelty claim to category
non-adoption rather than a missing primitive, and we say so. Fin's back-test,
as described and corroborated, shows artifact-level regression is achievable
and valuable, and the survey shows nobody else describes even that. The
"90% at 10% cost" argument fails where decisions are contested
(compliance, disputes, audits), which is precisely where the standard
matters. HubSpot's July 2026 reversal shows the trust demand is rising, not
hypothetical. The primitive exists; the category has not adopted it. That is
the slot.

### 7. The GDPR vs immutability tension

GDPR Article 17 erasure versus append-only history is a direct legal
contradiction, and the industry's pragmatic reconciliation is crypto-shredding:
per-subject data-encryption keys, key destroyed on erasure. But the EDPB
Guidelines 02/2025 (adopted 2026-04-08) posture is avoidance, not endorsement:
the guidance says it is not advisable to register personal data on an
immutable structure in the first place. The "near-equivalent to erasure"
reading is industry gloss. Worse for the standard, crypto-shredding hollows
replay for personal data: once the key is destroyed, the events exist but the
personal fields inside them are unrecoverable, which is most CRM data. Any
honest standard must include erasure engineering, not hand-wave it, and admit
that erasure and replay are in tension by design. This is a cost of the
standard, stated here so nobody has to discover it after adopting.

### 8. What the standard would require, and what falsifies the thesis

What adopting continuity-A would require, stated plainly: (1) an immutable
event plane where append is a system property, not app discipline (see our
own S-2 failure for why this is hard); (2) deterministic derivations recorded
as functions of pinned events, with replay-safe primitives enforced the way
Temporal enforces them; (3) artifact-level regression for the
nondeterministic layer (the Fin pattern) as a shipped product behavior, not
an internal debugger; (4) crypto-shredding or equivalent erasure
engineering for Article 17; (5) replay demonstrated end-to-end, not asserted
in architecture prose.

The five kill criteria. The first one that fires kills or narrows the claim:

1. **One surveyed vendor demonstrates deterministic replay of a decision
   from an immutable event plane.** KILL the survey-bounded claim; republish
   the scoreboard.
2. **The 99h convergence lane's archaeology (Attio/Clay/Apollo/HubSpot)
   surfaces event-sourced internals in an in-category system.** Internals
   only: update the counterevidence section and narrow. Shipped as product
   behavior: criterion 1 applies.
3. **A production CRM ships continuity-A.** KILL outright; the slot is occupied.
4. **A CRM rebuilds its core state machine on an event-sourced core the way
   Temporal rebuilds workflows.** KILL; the category has adopted the primitive.
5. **Weaker falsifier:** immudb/KurrentDB-class infrastructure gains
   decision-replay semantics and a surveyed vendor adopts it as its decision
   plane. Narrow or KILL depending on shipped behavior.

### 9. Follow-up experiments (named, bounded)

- **E-1 (pinned replay proof, ours):** demonstrate one deterministic
  derivation replayed end-to-end from our journal's pinned events. The
  honesty gap in section 5, closed or not; either result is reportable.
  No new store; uses the existing event plane.
- **E-2 (Fin-pattern replication):** reproduce artifact-level regression on a
  public conversation artifact (fix, back-test, verify) and publish the
  reproduction path. Demonstrates the achievable layer, not the strawman.
- **E-3 (cost of immutability):** quantify Fowler's costs on a reference
  build (schema evolution overhead, crypto-shredding for Article 17) so the
  standard ships with its price tag, not without one.
- **E-4 (scoreboard refresh):** re-run the 34-system survey after the 99h
  convergence lane's archaeology lands; falsification criterion 2 is the
  trigger. QLDB stays off the list; it is dead.

## Evidence grades and bounds (do not exceed)

Independent this session: Linear HMAC webhooks, Asana story
consolidation, HubSpot July 2026 incident, QLDB end of support.
Vendor-described: Fin back-test, Temporal Event History semantics, KurrentDB
rebrand, D365 propose-don't-act, Common Room entity binding
(unreplicated), 6sense score reasoning, immudb PG compatibility. Survey bound:
34 systems, 2026-09-30. Audience bound: Cluster B (external senior technical
audience) remains UNKNOWN; this piece is written for Cluster A (Nolan) as the
operative approver, per AUDIENCE-S2-15-30.md.

Word count: ~2,300. No em dashes.
