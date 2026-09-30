# BLOCK S2 45-60 SCRIPT DRAFT (evidence-native, opportunity C1)

**Headline [PARAMETERIZED : Nolan has not picked. Slot his pick in on his word only. Candidates below are the three from the evidence package; do not invent a stronger headline than the evidence map supports.]**

Candidate headlines (offer these three verbatim):
- H1: Your audit log is not evidence: 34 CRM/agentic systems, zero with replayable decision history
- H2: We surveyed 34 systems for deterministic replay. Zero shipped it, and we do not claim it either.
- H3: The missing continuity primitive: audit logs answer what changed; replay answers prove it

Register: technical credibility for senior engineers. Spoken draft; every atomic claim is ledgered in `claim-ledger-s2-45-60.json` (CLS2-01 … CLS2-20). No sentence asserts anything with no ledger row. Lines whose support is vendor-described are marked [vendor-described] so TTS never overstates them. Unreplicated findings are marked [unreplicated]. No em dashes anywhere.

---

## Part 1 The scoreboard, in twenty seconds. [CLS2-01]

We surveyed 34 CRM and agentic systems for one behavior: can they replay a past decision deterministically from an immutable event plane? Zero could. [CLS2-01]

Every one of them ships audit logging. Not one ships replay. [CLS2-01]

That claim is survey-bounded, not universal: as of 2026-09-30, across the 34 systems we graded, zero meet the definition. [CLS2-01]

The best in field is grade B: genuine timelines and audit logs, on mutable current-state storage. [CLS2-01]

## Part 2 Two different questions. [CLS2-16]

Audit logs answer "what changed." [CLS2-16]

Replay answers a different question: "prove this decision would be made again, identically, from the same evidence." [CLS2-16]

Your audit log is not evidence for that second question. The log lists what changed, when, and by whom. [CLS2-16]

It cannot pin the inputs at decision time and re-derive the decision later, because the inputs were never pinned and the derivation was never recorded as a deterministic function of pinned events. [CLS2-16]

That second question is the unoccupied slot. And it is the question buyers ask after a trust failure. [CLS2-16]

## Part 3 The standard we are actually arguing for. [CLS2-03]

Precision matters here, because the loose version of this claim is a strawman. [CLS2-03]

We are not asking for bit-identical replay of an AI's generation. The standard does not require that, and that reading is explicitly disclaimed. [CLS2-03]

The standard is narrower: deterministic derivations, meaning scores, projections, and state transitions, replayable from a pinned immutable event plane. [CLS2-03]

For the agent's own nondeterministic output, the honest standard is replay-the-artifact: back-test a fix against the original input and prove the fix worked. The replay question is about the deterministic layer around the agent, not the agent's own output. [CLS2-03]

## Part 4 The primitive is described, in another domain. [CLS2-02, vendor-described]

Per Temporal's own documentation, deterministic replay exists in workflow infrastructure. It is called Temporal. [CLS2-02, vendor-described]

Temporal's Event History is the complete ordered log of everything that happened in a workflow. [CLS2-02, vendor-described]

Workers do not restore snapshots. They re-run workflow code against recorded events. [CLS2-02, vendor-described]

Non-determinism is policed mechanically: Date dot now, Math dot random, and direct network calls are banned, and replay-safe APIs return recorded values instead of fresh ones. [CLS2-02, vendor-described]

The WorkflowReplayer replays a workflow against a recorded history to verify that code changes stay deterministic. [CLS2-02, vendor-described]

This is the closest existing engineering to the thesis's standard, in the workflow-infrastructure domain, as described by its own vendor. [CLS2-02, vendor-described]

It shows the primitive is described and shipped in another domain. It does not show CRM or agent adoption. [CLS2-02, vendor-described]

Two bounds our hostile review verified: Temporal histories have retention limits, and they carry no cryptographic tamper-evidence. [CLS2-02, vendor-described]

## Part 5 The category's only described replay-as-proof. [CLS2-04, vendor-described]

A VentureBeat interview describes Intercom's Fin debugger: it traces internal reasoning steps, finds the root cause, proposes a rewrite, back-tests the change against the original conversation, and suggests a production monitor. [CLS2-04, vendor-described]

That is artifact-level regression: replay the artifact as proof of fix. [CLS2-04, vendor-described]

As far as our survey can establish, it is the only described production example of replay-as-proof in the category. Three sources corroborate the description; none independently tested it. [CLS2-04, vendor-described]

It is not bit-identical generation replay. It is the achievable layer, and nobody else describes even that. [CLS2-04, vendor-described]

## Part 6 The grade B inventory: what "best in field" actually looks like. [CLS2-05, CLS2-06]

Start with Asana. Its activity stories are lossy. [CLS2-05]

Per Phil Seeman's canonical forum explanation, the web app consolidates multiple changes by one user to one data element within 24 hours into only the last change. [CLS2-05]

The API team has no separate story stream, so the API returns only the same consolidated stream as the web app. [CLS2-05]

Independently sourced across three forum threads. Genuinely lossy. [CLS2-05]

Now Linear. Linear's webhooks are cryptographically signed for every create, update, and remove event: Linear-Signature header, HMAC-SHA256 over the raw body, hex-encoded, verified against a signing secret. [CLS2-06]

Confirmed by three independent sources. [CLS2-06]

That is real integrity on a derived stream. And it is still not an immutable event plane. [CLS2-06]

## Part 7 The vendor-described ceiling, stated honestly. [CLS2-19, vendor-described]

The best accountability story in the category that we cannot independently verify is 6sense's: every score ships with its reasoning. [CLS2-19, vendor-described]

That is vendor-described, not confirmed, and we are labeling it as such. [CLS2-19, vendor-described]

Audit logs plus per-decision reasoning artifacts are the category's accountability ceiling as described by its vendors. We do not promote vendor descriptions to confirmations. [CLS2-19, vendor-described]

## Part 8 One claim we could not replicate. [CLS2-17, unreplicated]

Common Room's mandatory entity binding is documented only in its official docs. [CLS2-17, unreplicated]

This session's search could not recover or corroborate it; the search drowned in noise, and Common Room was acquired by Zoom in July 2026, so the docs may have moved. [CLS2-17, unreplicated]

We keep it at vendor-described, not confirmed. An unreplicated finding stays unreplicated. [CLS2-17, unreplicated]

## Part 9 One more vendor-described pattern, honestly labeled. [CLS2-20, vendor-described]

Microsoft's Copilot Cowork proposes draft actions and shows them before they execute. [CLS2-20, vendor-described]

That is propose-don't-act: a UI sequencing choice, not replay from an immutable plane. [CLS2-20, vendor-described]

It comes from Microsoft's engineering blog describing Microsoft's own product. We did not independently test it. [CLS2-20, vendor-described]

## Part 10 The negative result that is itself a finding. [CLS2-18]

Search for a production CRM built on event sourcing and you find hobby projects and design docs: a small repo, a Nexus CRM design doc, a Laravel CRM. [CLS2-18]

No production CRM claims event sourcing as its architecture. [CLS2-18]

That is a search-bounded negative result, corroborated by the survey's own per-system architecture review. [CLS2-18]

## Part 11 The ledger-like detour, and why it dead-ends. [CLS2-08, CLS2-09]

Amazon QLDB was the most ledger-like database in the category. It reached end of support on July 31, 2025, announced July 18, 2024. [CLS2-08]

Existing ledgers went read-only, then were deleted. AWS now points customers at Aurora PostgreSQL with pgaudit; Microsoft points at Azure SQL ledger. [CLS2-08]

QLDB is off the harvest list permanently. A discontinued ledger service cannot re-enter the category. [CLS2-08]

What about the tamper-evident infrastructure that survived? immudb 1.11, released 2026-05-05, added immutable audit logging with PostgreSQL compatibility, per vendor press. [CLS2-07, vendor-described]

That is tamper-evidence of a data plane, not deterministic replay of a decision plane. And immudb is infrastructure for builders, not a CRM. Out of category for the survey claim. [CLS2-07, vendor-described]

EventStoreDB was rebranded as KurrentDB in 2025, version 25.0, per the project's own repository. It is event-native infrastructure, not a CRM, and it does not replay decisions either. [CLS2-09, vendor-described]

If immudb-class or KurrentDB-class infrastructure ever gains decision-replay semantics and a surveyed vendor adopts it as its decision plane, the claim narrows or dies depending on shipped behavior. Until then, the falsifier does not fire. [CLS2-09]

## Part 12 The pain is observed, not invented. [CLS2-10]

Why does any of this matter to buyers? Because the trust failure already happened. [CLS2-10]

Effective July 1, 2026, HubSpot's terms would have pooled customers' business-card-level contact data into a shared enrichment dataset, on an opt-out basis. [CLS2-10]

After four days of public backlash, CPTO Duncan Lennox posted "We made a mistake" on LinkedIn on July 5 and pulled the change completely. [CLS2-10]

The trust failure was precisely about unaccountable data derivation. That is the pain a replayable derivation chain answers. [CLS2-10]

HubSpot has since moved fast on agents, but agents are not replay, and this incident stays what it is: pain evidence, not a continuity claim. [CLS2-10]

## Part 13 The costs, carried in the open. [CLS2-11, CLS2-12]

The honest version of this standard ships with its price tag. Event sourcing is textbook architecture, not a new invention: capture all changes as a sequence of events, rebuild state by re-running the log, get the audit trail for free. [CLS2-11]

The costs are equally textbook: eventual consistency, event schemas you must keep readable forever because history is never rewritten, and more moving parts. [CLS2-11]

Apply it where the benefits justify the cost, not as a blanket mandate. The cost caveat is part of the standard, not a refutation of it. [CLS2-11]

The second cost is legal. GDPR Article 17 erasure directly contradicts append-only history. [CLS2-12]

The industry's pragmatic reconciliation is crypto-shredding: per-subject data-encryption keys, key destroyed on erasure. But EDPB Guidelines 02/2025, adopted 2026-04-08, posture is avoidance, not endorsement: do not register personal data on immutable structures in the first place. And crypto-shredding hollows replay for personal data, since the personal fields become unrecoverable. [CLS2-12]

Immutability therefore carries a real legal engineering cost, and it is one reason CRMs avoid it. [CLS2-12]

No surveyed vendor is claimed to ship crypto-shredding. This is the engineering the standard would require, stated up front so nobody discovers it after adopting. [CLS2-12]

## Part 14 The reckoning: our own seal is class-bound. [CLS2-13, CLS2-14]

Now the part where we grade ourselves. [CLS2-13]

Our own append-only trigger seal, demonstrated on a disposable PG 15 instance in mission 8924ebeeb4094c37, binds exactly one role class: non-owner, non-superuser. [CLS2-13]

Seven claims confirmed, thesis verdict SCOPED. The demonstrated boundaries: superusers bypass via session_replication_role equals replica, and the table owner can DROP TRIGGER. [CLS2-13]

Open questions stay open: PG 17 parity, the pooler, the table owner, the extent of disk writes. They bound the claim. They do not un-confirm the trials. [CLS2-13]

And here is the part that hurts. Our production database role, ping, is a superuser. [CLS2-14]

Combined with the class-bound seal, that means our production journal's append-only guarantee holds by app discipline, never by the database. [CLS2-14]

The app's actual behavior is unverified, and we do not assert it. We say that out loud. [CLS2-14]

## Part 15 What we argue for, and what we do not claim. [CLS2-15]

This piece argues for the standard. It does not claim we have met it. [CLS2-15]

The same scoreboard that gives the industry zero grade A gives us no grade A either. [CLS2-15]

What we can honestly claim: append-only events as observed in our journal reads, wired causality, and a class-bound trigger seal, each scoped to the roles they bind. [CLS2-15]

What we cannot claim: deterministic replay demonstrated end-to-end in our journal. Pinned replay proof is follow-up work. [CLS2-15]

That honesty is the point. The standard would mean nothing if we exempted ourselves. [CLS2-15]

## Part 16 The falsifiers. [CLS2-01, CLS2-18]

This thesis carries its own kill criteria, stated up front. [CLS2-01]

One: any surveyed vendor demonstrates deterministic replay of a decision from an immutable event plane. The survey-bounded claim dies the same day; we republish the scoreboard. [CLS2-01]

Two: a production CRM ships continuity-A. The slot is occupied; the thesis ends. [CLS2-01]

Three: a CRM rebuilds its core state machine on an event-sourced core the way Temporal rebuilds workflows. The category adopted the primitive; the slot is occupied. [CLS2-01]

Four: the 99h convergence lane's archaeology surfaces event-sourced internals in an in-category system. Internals only narrows the claim; shipped product behavior kills it. [CLS2-18]

Five, weaker: immudb-class or KurrentDB-class infrastructure gains decision-replay semantics and a surveyed vendor adopts it as its decision plane. Narrow or kill depending on shipped behavior. [CLS2-09]

The first one that fires ends the thesis. We would rather be refuted than vague. [CLS2-01]

## Part 17 The close.

We are not asking for bit-identical replay of an AI's generation. [CLS2-03]

We are asking for this: deterministic derivations replayable from a pinned immutable event plane, and artifact-level regression for the nondeterministic layer. [CLS2-03]

The primitive is described and shipped in another domain, per Temporal's own docs. [CLS2-02, vendor-described]

The category has not adopted it. Thirty-four systems surveyed, zero shipping it, one described production back-test at Intercom, and we do not claim it either. [CLS2-01, CLS2-04, CLS2-15]

The costs are real: schema evolution forever, more moving parts, crypto-shredding for erasure law. They belong in the standard's own documentation, not in the fine print. [CLS2-11, CLS2-12]

Audit logs answer what changed. Replay answers prove it. [CLS2-16]

Everybody ships the first. Nobody in our survey ships the second. That is the slot. [CLS2-16]

---

*Compiler notes: every bracketed CLS2-id resolves in `claim-ledger-s2-45-60.json`. Ledger rows covered: all 20 (CLS2-01 through CLS2-20; 18 CONFIRMED, 2 UNCLEAR). Lines marked [vendor-described] must never be reworded upward by TTS or the compiler. Lines marked [unreplicated] must never be presented as confirmed. The headline slot is the only parameterized element. Nolan approval required per block 60-70 lane law before publication.*
