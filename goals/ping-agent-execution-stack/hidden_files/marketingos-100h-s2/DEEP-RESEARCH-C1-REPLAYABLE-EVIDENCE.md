# Deep Research C1: Replayable Evidence, the Missing Continuity Primitive

Candidate C1, MarketingOS Sprint 2 Block 30-45. Research date: 2026-09-30.
Evidence grades: **independent** (third-party primary source), **vendor-described** (vendor claim, not independently confirmed), **unreplicated** (attempted this session, not confirmed).

## 1. Common knowledge (established, attributed)

**Event sourcing is textbook architecture, not a new invention.** Martin Fowler's formulation: capture all changes to an application state as a sequence of events; rebuild state by re-running the log; audit trail and reconstruction "come for free" (martinfowler.com/eaaDev/EventSourcing.html). The pattern's costs are equally established: eventual consistency, event schema evolution (history is never rewritten, so old events must stay readable forever), and more moving parts. Fowler's own guidance: apply it where the benefits justify the cost, not as a blanket mandate.

**Deterministic replay is a shipped standard in workflow infrastructure.** Temporal's Event History is "a complete, ordered log of everything that has already happened in a Workflow" and "the source of truth for everything that happens in a Workflow" (docs.temporal.io/encyclopedia/event-history). Workers do not restore snapshots; they re-run workflow code against recorded events, which requires workflow code to make the same decisions given the same history. The Temporal Swift SDK's `WorkflowReplayer` replays a workflow against a recorded history to verify that code changes stay deterministic (apple/swift-temporal-sdk, Sources/Temporal/Documentation.docc). Non-determinism is policed mechanically: `Date.now()`, `Math.random()`, direct network calls are banned in workflows; replay-safe APIs return the recorded values. This is the closest existing engineering to the thesis's standard, and it is real.

**Tamper-evidence is a solved primitive; replay is not.** immudb 1.11 (released 2026-05-05) added immutable audit logging (who/what/when recorded tamper-proof) with PostgreSQL compatibility (Business Wire vendor press, opensourceforu, StorageNewsletter). That is tamper-evidence of a data plane, not deterministic replay of a decision plane.

**Immutability conflicts with erasure law.** GDPR Article 17 erasure versus append-only history is a direct legal contradiction; the accepted reconciliation is crypto-shredding (per-subject data-encryption keys, key destroyed on erasure), treated as a pragmatic near-equivalent to erasure in EDPB Guidelines 02/2025 (adopted 2026-04-08) (handbook-academy engineering handbook, fractonicmind/ternarylogic, adversarial review in trilamsr/regatta#548). Immutability therefore carries a real legal engineering cost. One reason CRMs avoid it.

**Amazon QLDB is dead.** End of support July 31, 2025 (announced July 18, 2024); existing ledgers went read-only and were then deleted; AWS points customers at Aurora PostgreSQL with pgaudit; Microsoft points at Azure SQL ledger (GitHub skill repos chrishuffman5/awscliskills and devinwatson/claudemax, Microsoft Tech Community, TutorialsDojo). One of the three named counterevidence candidates in OPPORTUNITIES-S2-30-45 is eliminated outright.

**EventStoreDB lives on as KurrentDB.** Rebranded in 2025 (v25.0); event-native database, current (kurrent-io/kurrentdb). It is infrastructure for builders, not a CRM.

## 2. Our observation (the survey scoreboard, the slot)

The 34-system survey (report.md section 5) grades every in-category system on the continuity axis. Zero systems reach continuity-A, defined as deterministic replay of a decision from an immutable event plane. The best results:

- **B (derivable):** Linear's HMAC-signed webhooks for every create/update/remove event; Intercom Fin's debugger skill that back-tests a fix against the original conversation.
- **B (lossy):** Asana's task stories, which are consolidated and degraded; Common Room's mandatory entity binding.
- **C (propose-don't-act):** Microsoft Dynamics 365 Copilot Cowork's draft actions shown before they execute.

The convergence map notes a real pattern: everyone ships audit logging, nobody ships replay. Audit trails answer "what changed." Replay answers "can you prove this decision would be made again, identically, from the same evidence." The second question is the unoccupied slot, and it is the question buyers ask after a trust failure.

A "CRM built on event sourcing" search returned only hobby and OSS repos (jtiemann/crm, 5queezer/nexus-crm design doc, a Laravel CRM). No production CRM claims event sourcing as its architecture. This negative result is itself a finding.

## 3. The difference (what we do, what's missing, narrower)

The survey's claim, narrowed by this session's evidence, is:

- **The survey-bounded claim holds:** across the 34 surveyed CRM/agentic systems, zero ship continuity-A. None of this session's counterevidence candidates is in-category. QLDB is dead. immudb and KurrentDB are infrastructure, not CRM/agentic systems, and neither offers deterministic replay of decisions.
- **The standard must be narrower than the draft wording.** "Deterministic replay" as stated could be read as bit-identical replay of LLM-agent generation. That reading is wrong, and the adversarial section below explains why. The operative standard: **deterministic derivations (scores, projections, transitions) replayable from a pinned immutable event plane.** Agent generation itself gets the Fin-grade honest standard: replay-the-artifact as proof of fix, not bit-identical generation replay.
- **Temporal proves the standard is engineerable.** This is not a discovery of the impossible; it is a discovery of the unadopted. The primitive exists in workflow infrastructure. The category has not adopted it. That strengthens the thesis.

## 4. Evidence (re-verification, graded)

### Re-verified independent (primary or third-party sources, this session)

**Intercom Fin debugger back-test: independent.** A VentureBeat interview (138 days before this session) describes Fin Operator's debugger skill: it traces every internal reasoning step, finds the root cause (often user guidance creating a loop), proposes a rewrite, **back-tests the change against the original conversation**, and suggests a production monitor. Corroborated by DevRev's competitive piece and by myaskai operational detail (reproduce the exact exchange, fix guidance, re-run, verify, deploy monitor). The survey's grade-B claim stands as re-verified independent.

**Linear HMAC-signed webhooks: independent.** Three independent sources (hookdeck/webhook-skills, gen-intelligence, webhooks-cc) agree: `Linear-Signature` header, HMAC-SHA256 over the raw body, hex-encoded, verified against a signing secret. The survey's "derived stream, not immutable source" assessment stands; the mechanism itself is confirmed independent.

**Asana 24-hour story consolidation: independent.** Three Asana forum threads, including forum.asana.com/t/is-there-a-truthful-audit-trail/55127, carry the canonical explanation from Phil Seeman (recognized Asana API community authority): "the Asana web app performs story 'consolidation' in the attempt to avoid massively long activity streams... if one user changes a data element multiple times within a 24-hour period without other users changing it in between, those multiple changes by the user get consolidated so only the last change is reported"; and "the API team doesn't have access to any separate story stream other than that of the web app... what the API returns is at the mercy of the web app." Corroborated by two additional threads (41521, 22045). The B (lossy) grade stands, independently sourced.

**HubSpot July 2026 terms incident: independent.** Effective July 1, 2026, HubSpot's terms would have pooled customers' business-card-level contact data into a shared enrichment dataset, opt-out. After four days of public backlash, CPTO Duncan Lennox posted "We made a mistake" (LinkedIn, July 5) and pulled the change completely (ppc.land, mi-3.com.au, onlinesalesguidetip.com, cmswire, martech.org). The survey's "trust failures" section is corroborated; this is evidence for the pain the thesis addresses. Note: HubSpot has since moved fast on agents (Agent CLI public beta June 23, 2026; Agent Hub/Builder public beta July 23, 2026; Fall 2026 Spotlight agent rebuild Sept 16, 2026). Agents are not replay.

### Vendor-described (not independently confirmed)

- **D365 Copilot Cowork propose-don't-act:** Microsoft engineering blog only. Grade stands as vendor-described.
- **Common Room mandatory entity binding:** official docs claimed; this session's search drowned in noise and Common Room was acquired by Zoom in July 2026 (docs may have moved). Mark **unreplicated this session**; keep at vendor-described pending doc recovery.
- **immudb 1.11 immutable audit logging + PG compatibility:** vendor press release, syndicated. Out of category; irrelevant to the survey claim.
- **6sense "every score ships with reasoning":** vendor-described (unchanged from survey).

## 5. Adversarial counterargument (steelman of the L6 objection)

The strongest objection, steelmanned:

**"Deterministic replay is a gold-plated strawman for agentic systems."** LLM outputs are nondeterministic in principle: model weights, sampling seed, prompt text, tool-call results, and world state all drift between runs. Bit-identical replay of an agent decision is not merely unshipped; it is the wrong standard, like demanding bit-identical replay of a human decision. What Fin does (replay-the-artifact as proof of fix) is the achievable honest standard, and buyers do not pay for replay; they pay for tamper-evidence (SOC 2, SOX). Immutability additionally carries a GDPR Article 17 cost requiring crypto-shredding engineering. And the strongest form: audit logs plus per-decision reasoning artifacts (6sense-style) get you 90% of the accountability at 10% of the cost. The thesis asks for infrastructure nobody in the category has needed.

**Answer.** The objection is half right, and the half it gets right reshapes the thesis. Bit-identical replay of LLM generation is indeed a strawman; conceding that is a narrowing, not a retreat. But the objection's own premises support the deterministic layer: Temporal proves replay of the deterministic orchestration around nondeterministic activities is real and valuable. The thesis's standard was always about that layer: pinned inputs, scored derivations, state transitions. What Fin proves is that artifact-level regression (back-test the fix against the original conversation) is achievable and valuable; what the survey proves is that nobody else ships even that. As for "nobody has needed it": HubSpot's July 2026 reversal shows trust is the category's currency, and the trust failure was precisely about unaccountable data derivation. The "90% at 10% cost" argument fails where decisions are contested (compliance, disputes, audits), which is where the standard matters. The cost argument (Fowler: schema evolution, more moving parts) is real and belongs in the standard's own documentation, not as a refutation.

## 6. Falsification criteria (tests that would KILL)

1. **One surveyed vendor demonstrates deterministic replay of a decision from an immutable event plane.** KILL the survey-bounded claim immediately; republish the scoreboard.
2. **The 99h convergence lane's archaeology (Attio/Clay/Apollo/HubSpot) surfaces event-sourced internals in an in-category system.** If it is internals-only, update this counterevidence section and narrow; if it ships as product behavior, criterion 1 applies.
3. **A production CRM ships continuity-A.** KILL outright; the slot is occupied.
4. **A CRM rebuilds its core state machine on an event-sourced core the way Temporal rebuilds workflows.** KILL; the category has adopted the primitive.
5. **Weaker falsifier:** immudb/KurrentDB-class infrastructure gains decision-replay semantics and a surveyed vendor adopts it as its decision plane. Narrow or KILL depending on shipped behavior.

## 7. S-2 reckoning (mandatory, honest)

Our own trigger seal (mission 8924ebeeb4094c37, U2 thesis E, verdict SCOPED) binds only non-owner non-superuser roles. U2-C1 through C7 were CONFIRMED, but on a disposable PG 15 instance where triggers were recreated verbatim from the Oracle capture. The production app role `ping` is a superuser and sits outside the seal (SIGNAL S-2, anchor in OPPORTUNITIES-S2-30-45). The 34-system scoreboard reports zero grade A; our own system does not claim grade A either.

This piece argues **for the standard, not that we have met it.** What we can honestly claim: append-only events, causality wiring (per S-7), and a class-bound trigger seal, all scoped to the roles they bind. What we cannot claim: deterministic replay demonstrated end-to-end in our journal. Pinned replay proof is follow-up work, and it belongs in the 45-60 evidence package. This honesty is the point; the standard would mean nothing if we exempted ourselves.

## 8. Why it matters (who feels pain)

- **Compliance and audit buyers** (SOC 2, SOX, regulated industries) need to answer "prove this decision would be made again identically from the same evidence." Audit logs answer "what changed"; they do not answer this.
- **Buyers burned by vendor data practices** (HubSpot, July 2026) are asking where their data goes and what derives from it. Replayable derivation chains are the technical answer to that trust question.
- **Agent operators** (Intercom Fin's debugger exists because of this) need to prove a fix worked, not just ship it. Fin's back-test is the category's only production example of replay-as-proof.
- **Legal/compliance reviewers** need erasure-compatible immutability (crypto-shredding), which is engineerable (EDPB 02/2025) but unshipped in the category.
- The unoccupied slot is a product differentiator precisely because the infrastructure cost is real (Fowler's caveat) and the trust demand is rising. The category's current ceiling is vendor-described reasoning artifacts and lossy audit trails.

## 9. Cross-lane overlap (convergence dependency)

**Recorded dependency, not resolved here.** The 99h convergence lane (Attio/Clay/Apollo/HubSpot deep archaeology) may surface event-sourced internals in an in-category system. Per OPPORTUNITIES-S2-30-45, if it does, this counterevidence section must be updated (see falsification criterion 2). **Handoff for that lane:** QLDB is dead (remove from any harvest list); immudb 1.11's immutable audit logging with PostgreSQL compatibility is relevant to their harvest primitives (tamper-evident audit plane, not replay); HubSpot's recent agent moves (Agent CLI, Agent Hub/Builder, Sept 2026 Spotlight rebuild) are agent surface, not continuity behavior. S-4 remains the continuity anchor (the A slot is unoccupied); S-2 is this piece's honesty constraint (our own seal is class-bound). Overlap is tracked, not duplicated.

## Verdict: ADVANCE, narrowed

The thesis survives the counterevidence round with three explicit narrowings: (1) the standard is deterministic derivations replayable from a pinned immutable event plane, not bit-identical replay of LLM generation; (2) the claim is survey-bounded (34 systems), not universal; (3) Asana's B (lossy) is now independently sourced while Common Room's remains vendor-described/unreplicated. The strongest counterevidence (Temporal) proves the standard is engineerable, which supports rather than weakens the thesis: the primitive exists, the category has not adopted it. Falsifiers are named above; the first one that fires kills the claim.
