# MarketingOS Sprint 2, Block 45-60: Claim Ledger for Opportunity C1

**Opportunity:** "Your audit log is not evidence: 34 CRM/agentic systems, zero replayable histories"
**Research date:** 2026-09-30 | **Ledger date:** 2026-09-30
**Source docs:** `DEEP-RESEARCH-C1-REPLAYABLE-EVIDENCE.md` (verdicts, grades, scope, falsifiers, S-2 reckoning),
`OPPORTUNITIES-S2-30-45.md` (C1 scoring + counterevidence), `SIGNALS-S2-15-30.md` (S-2, S-4 support sets)
**Machine-readable:** `claim-ledger-s2-45-60.json` (20 rows, 13 fields each)
**L6 pass (2026-09-30 ~21:46 UTC):** CLS2-02/CLS2-04/CLS2-09 demoted to vendor-described per the ledger's own
rule (a vendor's claim about itself is never independent); CLS2-12 EDPB wording corrected to the guideline's
actual avoidance posture; CLS2-15 append-only claim narrowed to observed journal reads; CLS2-20 added (D365).

Grading rule used throughout: **independent** means first-party or third-party direct observation (own trials,
own inspections, third-party primary sources), never a vendor's claim about itself. **vendor-described**
means a vendor claim not independently confirmed; it is never promoted to independent. **unreplicated**
means attempted this session and not confirmed.

Headline candidates are parameterized (see JSON `headline` block); all three carry the self-scoping (CLS2-15).

---

## CLS2-01: Survey-bounded zero continuity-A [CONFIRMED, independent]

**Claim:** Across the 34 surveyed CRM/agentic systems, zero reach continuity-A: deterministic replay of a
decision from an immutable event plane. Best in field is grade B (genuine timelines/audit logs on mutable
current-state storage).

**Support set:** survey `report.md` section 5 scoreboard; sections 2-4 per-system reasoning; S-4.

**Scope:** 34 systems surveyed 2026-09-30. Does not establish the market size that would pay for A.

**Counterevidence (falsifiers):** F1: any one surveyed vendor demonstrating deterministic replay of a decision
from an immutable event plane kills this claim; republish the scoreboard. F3: a production CRM shipping
continuity-A kills outright. F4: a CRM rebuilding its core state machine on an event-sourced core the way
Temporal rebuilds workflows kills it. F2 (dependency): the 99h convergence lane's archaeology may surface
event-sourced internals; internals-only narrows, shipped product behavior kills. Conjunction caveat (L6
review): the definition's two conjuncts are individually occupied elsewhere (Temporal for replay, immudb for
tamper-evidence); the claim is that no surveyed in-category system combines both, and the demand for the
combined standard is unobserved (the survey does not establish market size that would pay for continuity-A).

**Maximum defensible wording:** "As of 2026-09-30, across the 34 CRM/agentic systems surveyed, zero systems meet
the continuity-A definition (deterministic replay of a decision from an immutable event plane). The claim is
survey-bounded, not universal."

---

## CLS2-02: Temporal precedent: the standard is described in another domain [CONFIRMED, vendor-described]

**Claim:** Per Temporal's own documentation, Event History is the complete ordered log of everything in a
workflow; workers re-run workflow code against recorded events; non-determinism is policed mechanically;
WorkflowReplayer verifies code changes stay deterministic.

**Support set:** Temporal event-history docs; Swift SDK WorkflowReplayer docs (the vendor's own docs/repo;
no independent test this session).

**Scope:** Workflow orchestration only. Bounds (L6 review): Temporal histories have retention limits and carry
no cryptographic tamper-evidence. Shows the primitive is described and shipped in another domain; it does not
show CRM/agent adoption.

**Counterevidence:** F4 kills the C1 slot, not this precedent. The narrowed two-layer standard of C1 is
literally Temporal's documented agent architecture (LLM calls as Activities, recorded results returned during
replay), which reduces the novelty to category non-adoption, not a missing primitive.

**Maximum defensible wording:** "Per Temporal's own documentation, Event History provides replay of workflow
execution: workers re-run code against recorded events and non-determinism is policed mechanically. This is
the closest existing engineering to the thesis's standard, in the workflow-infrastructure domain. It is not
independently tested here; histories have retention limits and no cryptographic tamper-evidence. It shows the
primitive is described and shipped in another domain; it does not show CRM/agent adoption."

---

## CLS2-03: The narrowed standard (definition) [CONFIRMED, independent]

**Claim:** The operative standard is deterministic derivations (scores, projections, transitions) replayable
from a pinned immutable event plane. Bit-identical replay of LLM-agent generation is explicitly excluded as
the wrong standard. Agent generation gets the Fin-grade honest standard: replay-the-artifact as proof of fix.

**Support set:** C1 evidence doc sections 3 (narrowed claim) and 5 (adversarial answer).

**Maximum defensible wording:** "The standard C1 argues for is deterministic derivations replayable from a
pinned immutable event plane. It does not require bit-identical replay of LLM-agent generation; that reading
is explicitly disclaimed."

---

## CLS2-04: Intercom Fin debugger back-test [CONFIRMED, vendor-described]

**Claim:** Fin's debugger traces internal reasoning steps, finds the root cause, proposes a rewrite,
back-tests the change against the original conversation, and suggests a production monitor. The category's
only described production example of replay-as-proof (artifact-level regression).

**Support set:** VentureBeat interview (the vendor describing its own product through third-party press);
corroborated (not independently replicated) by a DevRev competitive piece and myaskai operational detail.

**Scope:** Artifact-level regression, not bit-identical generation replay. Not independently tested
end-to-end this session.

**Maximum defensible wording:** "A VentureBeat interview describes Fin Operator's debugger: traces internal
reasoning steps, finds the root cause, proposes a rewrite, back-tests the change against the original
conversation, and suggests a production monitor. Corroborated by two additional sources, none of which
independently tested it. The category's only described production example of replay-as-proof."

---

## CLS2-05: Asana lossy story consolidation [CONFIRMED, independent]

**Claim:** The web app consolidates multiple changes by one user to one data element within 24 hours into only
the last change; the API returns only the same stream as the web app (no separate story stream).

**Support set:** Asana forum thread 55127 (Phil Seeman canonical explanation); threads 41521, 22045.

**Maximum defensible wording:** "Per Phil Seeman's canonical forum explanation, multiple changes by one user to
a data element within 24 hours get consolidated so only the last change is reported; the API team has no
separate story stream. The B (lossy) grade stands, independently sourced."

---

## CLS2-06: Linear HMAC-signed webhooks [CONFIRMED, independent]

**Claim:** Every create/update/remove webhook event is signed with HMAC-SHA256 over the raw body, hex-encoded,
verified against a signing secret in the `Linear-Signature` header. A signed derived stream, not an immutable
source.

**Support set:** hookdeck/webhook-skills; gen-intelligence; webhooks-cc (three independent sources agree).

**Maximum defensible wording:** "Linear's webhook mechanism is confirmed. This is a signed derived stream for
create/update/remove events, not an immutable event source."

---

## CLS2-07: immudb: tamper-evidence, not replay [CONFIRMED, vendor-described]

**Claim:** immudb 1.11 (released 2026-05-05) added immutable audit logging with PostgreSQL compatibility. This is
tamper-evidence of a data plane, not deterministic replay of a decision plane; immudb is infrastructure, not
a CRM, so it is out of the survey's category.

**Support set:** immudb 1.11 vendor press (syndicated); opensourceforu; StorageNewsletter.

**Counterevidence:** F5 (weaker falsifier): if immudb-class infrastructure gains decision-replay semantics and
a surveyed vendor adopts it as its decision plane, narrow or kill depending on shipped behavior. Does not fire
while immudb offers tamper-evidence only.

**Maximum defensible wording:** "Per vendor press (syndicated), immudb 1.11 added immutable audit logging with
PostgreSQL compatibility. That is tamper-evidence of a data plane, not deterministic replay of a decision
plane. Out of category for the survey claim."

---

## CLS2-08: Amazon QLDB is dead [CONFIRMED, independent]

**Claim:** End of support July 31, 2025 (announced July 18, 2024); existing ledgers went read-only, then were
deleted; AWS points at Aurora PostgreSQL with pgaudit; Microsoft points at Azure SQL ledger. One of the three
named counterevidence candidates is eliminated outright.

**Support set:** AWS EOS announcement; chrishuffman5/awscliskills; devinwatson/claudemax; Microsoft Tech
Community; TutorialsDojo.

**Maximum defensible wording:** "Amazon QLDB reached end of support on July 31, 2025. Existing ledgers went
read-only and were deleted. The QLDB counterevidence candidate is eliminated; remove QLDB from any harvest
list."

---

## CLS2-09: KurrentDB/EventStoreDB out of category [CONFIRMED, vendor-described]

**Claim:** Per the project's own repository, EventStoreDB was rebranded as KurrentDB in 2025 (v25.0) and is
current. An event-native database, infrastructure for builders, not a CRM; no deterministic replay of
decisions. Out of category for the survey claim.

**Support set:** kurrent-io/kurrentdb.

**Counterevidence:** F5 (weaker falsifier): if KurrentDB-class infrastructure gains decision-replay semantics
and a surveyed vendor adopts it as its decision plane, narrow or kill depending on shipped behavior.

**Maximum defensible wording:** "Per the project's own repository, EventStoreDB was rebranded as KurrentDB in
2025 (v25.0) and is current. It is an event-native database, infrastructure for builders, not a CRM; neither
it nor immudb offers deterministic replay of decisions. Out of category for the survey claim."

---

## CLS2-10: HubSpot July 2026 trust incident as pain evidence [CONFIRMED, independent]

**Claim:** Effective July 1, 2026, HubSpot's terms would have pooled customers' business-card-level contact data
into a shared enrichment dataset, opt-out; after four days of public backlash, CPTO Duncan Lennox posted
"We made a mistake" (LinkedIn, July 5) and pulled the change completely. Evidence for the pain the thesis
addresses: trust failures about unaccountable data derivation.

**Support set:** Lennox LinkedIn post July 5, 2026; ppc.land; mi-3.com.au; onlinesalesguidetip.com; cmswire;
martech.org.

**Scope:** The July 2026 terms incident only. HubSpot's later agent moves (Agent CLI June 23, Agent Hub/Builder
July 23, Fall 2026 Spotlight rebuild September 16) are agent surface, not replay, and do not convert this
pain evidence into a continuity claim.

**Maximum defensible wording:** "Effective July 1, 2026, HubSpot's terms would have pooled customers'
business-card-level contact data into a shared enrichment dataset on an opt-out basis. After four days of
public backlash, the change was pulled completely. The survey's 'trust failures' section is corroborated; this
is evidence for the pain the thesis addresses, not a continuity-A claim."

---

## CLS2-11: Fowler cost caveat [CONFIRMED, independent]

**Claim:** Event sourcing: capture changes as an event sequence, rebuild state by re-running the log, audit
trail comes free. Costs equally established: eventual consistency, permanent schema evolution burden, more
moving parts. Apply where benefits justify the cost, not as a blanket mandate.

**Support set:** martinfowler.com/eaaDev/EventSourcing.html.

**Maximum defensible wording:** "Fowler's formulation and its costs (eventual consistency, permanent schema
evolution burden, more moving parts) are established. The cost caveat is real and is part of the standard, not
a refutation of it."

---

## CLS2-12: GDPR/crypto-shredding tension [CONFIRMED, independent]

**Claim:** GDPR Article 17 erasure directly contradicts append-only history. The industry's pragmatic
reconciliation is crypto-shredding (per-subject data-encryption keys, key destroyed on erasure). EDPB
Guidelines 02/2025 (adopted 2026-04-08) posture is avoidance of registering personal data on immutable
structures, not endorsement of crypto-shredding; the "near-equivalent to erasure" reading is industry gloss.
Worse for the standard: crypto-shredding hollows replay for personal data (only non-PII fields remain in
plaintext for replay), which is most CRM data. Immutability carries a real legal engineering cost; one reason
CRMs avoid it.

**Support set:** GDPR Article 17; EDPB Guidelines 02/2025 (actual text, verified against the guideline by
the L6 review); handbook-academy engineering handbook; fractonicmind/ternarylogic; trilamsr/regatta#548.

**Scope:** The legal-engineering tension only. Does not claim any surveyed vendor ships crypto-shredding.

**Maximum defensible wording:** "GDPR Article 17 erasure directly contradicts append-only history. The
industry's pragmatic reconciliation is crypto-shredding; the EDPB's 02/2025 posture is avoidance, not
endorsement, and crypto-shredding hollows replay for personal data. Immutability therefore carries a real
legal engineering cost."

---

## CLS2-13: Our trigger seal is class-bound [CONFIRMED, independent]

**Claim:** U2 mission 8924ebeeb4094c37 CONFIRMED U2-C1..C7 and verdict thesis E SCOPED on a disposable PG 15
instance with triggers recreated verbatim from the Oracle capture. The append-only triggers bind exactly the
non-owner, non-superuser role class; superusers bypass via `session_replication_role=replica` (U2-C5 verbatim
post-trial row "bypassed"); the table owner can DROP TRIGGER (U2-C6 CONFIRMED).

**Support set:** BLOCK-S2-0-15-U2-REPORT.md verbatim trial output; journal mission row 8924ebeeb4094c37;
knowledge nodes marketingos::s2-block0-15.

**Scope:** The trigger/function text on the disposable instance. Open: PG17 parity (U3), Oracle pooler and
table owner (U4/U6), disk-write extent (U5). These bound the claim; they do not un-confirm the trials.

**Maximum defensible wording:** "U2 mission 8924ebeeb4094c37 CONFIRMED U2-C1..C7 and verdict thesis E SCOPED:
the append-only triggers bind exactly the non-owner, non-superuser role class; superusers bypass via
session_replication_role=replica; the table owner can DROP TRIGGER. Open: PG17 parity, Oracle pooler/table
owner, disk-write extent."

---

## CLS2-14: Production app role sits outside the seal [CONFIRMED, independent]

**Claim:** The production app role `ping` is a superuser (sprint-1 C8). Combined with the class-bound seal,
the production journal's append-only guarantee holds via app discipline, never via the database.

**Support set:** S-2; sprint-1 C8 (claim-ledger-40-60.json CL-10); CLS2-13.

**Scope:** Pig journal as of 2026-09-30. The app's actual behavior is unverified and must not be asserted
(gateway code unread this lane).

**Maximum defensible wording:** "Combined with sprint-1 C8 (deployed Oracle app role ping is a superuser) and
the class-bound seal, the production journal's append-only guarantee holds via app discipline, never via the
database. The app's actual behavior is unverified and must not be asserted."

---

## CLS2-15: We argue for the standard; we do not claim grade A [CONFIRMED, independent]

**Claim:** This piece argues FOR the standard, not that we have met it. Zero grade A across the survey, and our
own system claims no grade A either. Honest claim set: append-only events as observed in the journal reads of
2026-09-30 (production app behavior unverified per CLS2-14), causality wiring (per S-7), a class-bound trigger
seal, each scoped to the roles they bind. Deterministic replay demonstrated end-to-end in our journal is not
claimed; pinned replay proof is follow-up work.

**Support set:** C1 evidence doc section 7 (S-2 reckoning); S-7; CLS2-13; CLS2-14.

**Counterevidence:** F1/F3 applied symmetrically: if our journal is later shown to lack even the claimed
append-only/causality properties, this self-scoping claim must narrow further. The honesty is the point; the
standard would mean nothing if we exempted ourselves.

**Maximum defensible wording:** "The C1 piece argues for the continuity-A standard without claiming to have
met it: zero grade A across the survey, and our own system claims no grade A. Honest claim set: append-only
events as observed in the journal reads of 2026-09-30, causality wiring, class-bound trigger seal, each
scoped to the roles they bind."

---

## CLS2-16: Audit answers "what changed"; replay answers "prove it" [CONFIRMED, independent]

**Claim:** Audit trails answer "what changed." Replay answers "can you prove this decision would be made again,
identically, from the same evidence." Everyone ships audit logging; nobody in the survey ships replay. The
second question is the unoccupied slot, and the question buyers ask after a trust failure.

**Support set:** survey convergence map; CLS2-01; CLS2-10.

**Counterevidence:** The L6 steelman's "90% of the accountability at 10% of the cost" (audit logs plus
per-decision reasoning artifacts) is recorded as failing where decisions are contested (compliance, disputes,
audits). If contested-decision buyers demonstrably accept audit-plus-reasoning as sufficient, this claim
weakens.

**Maximum defensible wording:** "The survey's convergence pattern: every surveyed system ships audit logging;
none ships deterministic replay. The replay question is the unoccupied slot and the one buyers ask after a
trust failure."

---

## CLS2-17: Common Room binding: unreplicated this session [UNCLEAR, unreplicated]

**Claim:** Common Room's mandatory entity binding is claimed only in its official docs; this session's search
drowned in noise (Common Room was acquired by Zoom in July 2026; docs may have moved). Stays at
vendor-described, unreplicated this session, pending doc recovery.

**Support set:** survey vendor-described claim; this session's failed search.

**Maximum defensible wording:** "Common Room mandatory entity binding is documented only in official docs; this
session's search could not recover or corroborate it. Marked unreplicated this session; the survey grade stays
at vendor-described pending doc recovery."

---

## CLS2-18: Negative search: no production CRM claims event sourcing [CONFIRMED, independent]

**Claim:** A "CRM built on event sourcing" search returned only hobby and OSS repos. No production CRM claims
event sourcing as its architecture. The negative result is itself a finding.

**Support set:** this session's search results; survey architecture review.

**Counterevidence:** F4 kills this alongside CLS2-01. F2: convergence-lane archaeology may surface
event-sourced internals; internals-only narrows, shipped product behavior kills.

**Maximum defensible wording:** "A 'CRM built on event sourcing' search returned only hobby and OSS repos; no
production CRM claims event sourcing as its architecture. A search-bounded negative result, corroborated by
the survey's per-system architecture review."

---

## CLS2-19: 6sense reasoning artifacts: vendor-described, not converted [UNCLEAR, vendor-described]

**Claim:** 6sense's "every score ships with reasoning" remains vendor-described, unchanged from the survey.
Audit logs plus per-decision reasoning artifacts are the category's current ceiling alongside lossy audit
trails.

**Support set:** survey vendor-described claim.

**Maximum defensible wording:** "6sense's claim that every score ships with reasoning is vendor-described,
unchanged from the survey. It stands as the category's vendor-described accountability ceiling, not as
independently confirmed evidence."

---

## CLS2-20: D365 Copilot Cowork propose-don't-act [CONFIRMED, vendor-described]

**Claim:** Microsoft D365 Copilot Cowork's draft actions are shown before they execute (propose-don't-act),
graded C in the survey. Described only in Microsoft's engineering blog; not independently tested and
unreplicated this session. (Added by the L6 pass: the package named this behavior without a ledger row.)

**Support set:** Microsoft engineering blog (vendor).

**Scope:** As described by the vendor. Propose-don't-act is a UI sequencing choice, not replay; it does not
reach continuity-A.

**Maximum defensible wording:** "Microsoft describes D365 Copilot Cowork as showing draft actions before
execution. Vendor-described only; unreplicated this session. It does not reach continuity-A."

---

## Verdict distribution

- **CONFIRMED:** 18 (CLS2-01 through CLS2-16, CLS2-18, CLS2-20)
- **UNCLEAR:** 2 (CLS2-17 Common Room unreplicated; CLS2-19 6sense vendor-described)
- **REFUTED:** 0

## Evidence grade distribution

- **independent:** 13 (including our own trials/inspections as first-party observation)
- **vendor-described:** 6 (CLS2-02 Temporal, CLS2-04 Fin, CLS2-07 immudb, CLS2-09 KurrentDB, CLS2-19 6sense, CLS2-20 D365)
- **unreplicated:** 1 (CLS2-17 Common Room)

## Falsifier map

| Falsifier | Attaches to |
|---|---|
| F1: surveyed vendor demonstrates deterministic replay from an immutable event plane | CLS2-01, CLS2-15 |
| F2: convergence lane surfaces event-sourced internals in an in-category system | CLS2-01, CLS2-18 (dependency, unresolved here) |
| F3: a production CRM ships continuity-A | CLS2-01, CLS2-15 |
| F4: a CRM rebuilds its state machine on an event-sourced core a la Temporal | CLS2-01, CLS2-02, CLS2-18 |
| F5 (weaker): immudb/KurrentDB-class infrastructure gains decision-replay semantics + vendor adoption | CLS2-07, CLS2-09 |
