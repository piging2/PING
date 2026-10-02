# C1 Evidence Package V2: The Receipts Are the Product

MarketingOS Sprint 2, Block 45-60. Revision 2 (2026-09-30): moat crystallized,
human-observable rewrite per Nolan. Thesis/evidence package for opportunity C1.
Revision 1 preserved unchanged at C1-EVIDENCE-PACKAGE.md. No commit; Nolan
approval pending per block 60-70 lane law.

## Layer 0: The moat, in one paragraph

Every CRM on the market writes down what happened. None of them can prove what
they decided. PING is being built to a different standard: every important
decision is replayable from pinned evidence, so any answer can be re-derived on
demand and shown to hold. If you correct it, the correction sticks and history
explains the change. If a decision is contested, the evidence replays and the
derivation either holds or it doesn't. The moat is not a feature. It is the
property that every answer carries its own proof.

## Layer 1: The hook (read this in 20 seconds)

We graded 34 production CRM and agentic systems on one question: can any of
them replay a past decision from an immutable record and prove it would decide
the same way again? Zero can. They all ship audit logs. An audit log tells you
who edited the record and when. It cannot tell you why the system recommended
what it did, and it cannot prove it would say the same thing twice. The best in
the field are Linear's signed event webhooks and Intercom Fin's debugger that
replays a fixed answer against the original conversation to prove the fix
worked. One system outside the category proves the standard is engineerable:
Temporal replays workflow decisions from a complete event history in production
today. Our own system does not claim the grade either. This piece argues for
the standard, and names what it does for the customer: answers you can check,
corrections that stick, and decisions that survive being questioned.

## Layer 2: The mechanism, in plain language (read this in 3 minutes)

What the customer sees, first. You ask PING a question about your business. You
get an answer with its evidence attached, not a black box. You correct a fact.
The correction becomes today's truth, the old answer stays in history with its
reason for being wrong, and the next answer uses the correction. Nobody has to
trust that the fix took. You can ask "why do you believe this" and get the
evidence chain, not a shrug. If a claim is disputed, the system replays the
decision from the pinned evidence and the derivation either holds or it
doesn't. That is what continuity-A feels like from the outside. The technical
name for it is replayable deterministic derivation from a pinned immutable
event plane plus artifact-level regression for the parts that involve
generation. The customer never needs those words. They need the behaviors:
checkable answers, sticky corrections, provable decisions.

Why the industry cannot offer this. A CRM keeps its audit trail on mutable
current-state storage. The log is a feature of the record system, not an
immutable source of truth. You can list what changed, when, and by whom. You
cannot pin the inputs at decision time and re-derive the decision later,
because the inputs were never pinned and the derivation was never recorded as
a deterministic function of pinned events. "We have an audit log" is true and
insufficient, the way a bank statement is true and insufficient as proof of a
risk decision. The 2026 agentic wave adds generation on top of the same mutable
state. Agents are not replay.

The survey ceiling, stated plainly. Genuine timelines and audit logs on mutable
storage (grade B). Lossy consolidated stories like Asana's (grade B lossy,
independently confirmed: the web app consolidates multiple changes by one user
to one data element within 24 hours and reports only the last). Draft-then-
execute like D365 Copilot Cowork (grade C, vendor-described). No surveyed
system pins an immutable event plane and replays decisions from it. The
narrowed standard is not bit-identical replay of LLM generation, which is a
strawman. It is replayable deterministic derivations (scores, projections,
state transitions) from pinned events, plus artifact-level regression for the
nondeterministic layer: replay the original input artifact against a fix and
verify the fixed output. That is the Fin pattern, the category's only
production example of replay-as-proof, independently corroborated.

The counterevidence that strengthens the claim. Temporal's Event History is a
complete ordered log that workers re-run workflow code against;
non-determinism is policed mechanically. That is the deterministic layer the
thesis asks for, running in production workflow infrastructure today, confined
to the workflow-orchestration domain, with retention limits and no
cryptographic tamper-evidence (both verified by our hostile review). The
primitive exists. The CRM/agentic category has not adopted it. Tamper-evidence
alone is not the standard: immudb 1.11 ships immutable audit logging with
PostgreSQL compatibility, which is tamper-evidence of a data plane, not replay
of a decision plane. Conflating the two is exactly how audit-log marketing
works.

The reckoning stays. Our own trigger seal binds only non-owner non-superuser
roles; our production app role is a superuser outside the seal; production
holds by app discipline, not the database. This package argues for the
standard, not that we have met it. The standard would mean nothing if we
exempted ourselves.

What falsifies this piece. One surveyed vendor demonstrates deterministic
replay of a decision from an immutable event plane, and the survey-bounded
claim dies the same day. A production CRM ships continuity-A, and the slot is
occupied. Five kill criteria in section 8 of revision 1, unchanged. The first
one that fires ends the thesis.

## Layer 3: What this does for you (the observable behaviors)

These are the behaviors a business owner can see and check, each tied to the
evidence in Layer 3 of revision 1:

1. Checkable answers. Every important answer arrives with its evidence
   attached. You see what the system knew and what it based the answer on.
2. Corrections that stick. You correct a fact. The current answer changes, the
   history keeps the old answer with its reason, and regeneration never
   resurrects the stale claim as today's truth.
3. Honest uncertainty. When evidence is thin, the system says what it does not
   know and where the evidence is incomplete, instead of filling the gap with
   confidence.
4. Contradictions surfaced, not smoothed over. When sources disagree, the
   answer says so and names the disagreement. A premise you supplied in your
   question is never treated as a supported fact.
5. Provable decisions. When a decision is contested, it replays from the
   pinned evidence. Either the derivation holds or it doesn't, and you see
   which.
6. Fixes you can verify. When an answer is fixed, the fix is replayed against
   the original question and shown to work, not just shipped.

## Engineering proof (compressed)

Revision 1, Layer 3 stands unchanged and is incorporated by reference:
Fowler's event sourcing formulation and its costs; Temporal Event History
semantics and bounds; immudb 1.11 as tamper-evidence without replay; the
34-system scoreboard with grades (Linear HMAC webhooks B derivable, Fin
debugger B derivable, Asana stories B lossy, D365 Copilot Cowork C, Common Room
B lossy unreplicated); HubSpot's July 2026 terms incident as observed trust
demand; QLDB dead (end of support July 31, 2025); the GDPR Article 17 vs
immutability tension with EDPB Guidelines 02/2025 avoidance posture and
crypto-shredding hollowing replay for personal data. Nothing in this revision
exceeds those grades or bounds.

## What the standard would require, unchanged

(1) an immutable event plane where append is a system property, not app
discipline; (2) deterministic derivations recorded as functions of pinned
events, with replay-safe primitives enforced; (3) artifact-level regression
for the nondeterministic layer as shipped product behavior; (4)
crypto-shredding or equivalent erasure engineering for Article 17; (5) replay
demonstrated end-to-end, not asserted in architecture prose.

## Follow-up experiments, unchanged

E-1 pinned replay proof from our journal. E-2 Fin-pattern replication on a
public artifact. E-3 cost of immutability quantified. E-4 scoreboard refresh
after the 99h convergence lane archaeology.

## Evidence grades and bounds (do not exceed)

Unchanged from revision 1. Survey bound: 34 systems, 2026-09-30. Audience
bound: Cluster B (external senior technical audience) remains UNKNOWN; this
piece is written for Cluster A (Nolan) as the operative approver, with the
human-observable layer aimed at the business owner as the eventual reader.

Word count: ~1,900. No em dashes.
