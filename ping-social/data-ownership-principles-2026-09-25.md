# PING / TenantOS Data Ownership Principles
*Distilled 2026-09-25 from Nolan's data architecture directive.*
*Status (2026-09-25 ~10:32 MDT, Nolan): ACCEPTED AS TARGET PRODUCT LAW. Do not weaken the product idea. Every public promise must be falsified against the running system before the copy is called true. Permanent principle: Marketing claim <= product proof <= architectural invariant.*

## The two constitutional rules

1. **TenantOS owns tenant/customer truth. PING owns execution truth and system learning.** Access to tenant data does not transfer ownership. Cross-boundary information must have an explicit purpose, provenance, transformation policy, and retention policy.
2. **PING learns from governed outcomes by default, not raw customer identity.**

These scope the earlier "PING is the canonical knowledge authority" lock: PING is canonical for execution and learning knowledge; TenantOS is canonical for tenant customer truth. No conflict once scoped.

## The architecture

```
TenantOS (tenant/customer truth)
   |
   | authorized event projection
   v
Feedback Contract / Learning Gateway
   |  canonical tenant event
   |  -> feedback policy
   |  -> PII classification
   |  -> purpose / consent check
   |  -> transformation
   v
PING (execution truth + system learning)
   |
   v
Evidence -> Evaluation -> Knowledge -> Playbook -> Automation
```

Never: TenantOS -> copy everything -> PING.

## The twelve principles

1. **Constitutional data classification.** Every datum entering TenantOS carries machine-enforceable metadata: data_class (PII, CUSTOMER_CONTENT, BUSINESS_CONFIDENTIAL, OPERATIONAL, DERIVED, AGGREGATE, PUBLIC), owner (tenant:<id>, ping, shared), purpose (customer_service, scheduling, marketing, analytics, product_improvement, security), feedback_policy (NEVER, DERIVED_ONLY, AGGREGATE_ONLY, OPERATIONAL, EXPLICIT_CONSENT). The boundary is enforced by policy, not developer memory.

2. **Identity separated from learning identity.** PING learns "a missed-call lead from Google Local Services got a 41-second response, booked HVAC, quote band $1,500-2,000, converted" without ever seeing the name, number, or address. Tenant-scoped pseudonymous references (e.g., tenant-keyed HMAC), never a global customer identifier. No accidental "Jane at Coppersmith = Jane at another shop."

3. **PING Feedback Event.** An explicit event transformation: Tenant Event -> FeedbackAuthority/FeedbackPolicy -> PII redaction -> purpose enforcement -> PING Feedback Event -> UnifiedEventRuntime. Carries tenant_id, interaction_type, channel, service_category, response_latency, agent_type, resolution, booking_outcome, confidence, source_event_hash, policy_version. Do not create another database authority; this rides the existing event architecture.

4. **Replayable transformations.** Record tenant_event_hash, feedback_event_id, transformation_policy, policy_version, transform_version, timestamp, purpose. The proof linking the transformation, not the PII. When policy changes, replay tenant events under the new policy instead of inheriting mysterious historical training data.

5. **Operational access is not learning access.** Use != ownership != retention != training permission. When PING must contact a customer ("text Sarah the tech is 20 minutes late"), it gets temporary authorized PII through the TenantOS Customer API, sends the message, discards the execution copy, and records only non-PII evidence/outcome.

6. **Tenant Data Capability, not database access.** PING agents get capabilities (customer.lookup, customer.contact, appointment.create, quote.follow_up, review.request, conversation.respond, campaign.target) with principal, tenant, scope, purpose, and expiry. Never broad SQL access. This is CapabilityAuthority's job.

7. **Learn from outcomes.** The valuable signal is: what action, which playbook, which model, human approved?, customer responded?, booked?, bought?, how much?, how fast?, reviewed?, returned? Cross-tenant learning needs "HVAC heating lead + symptom category + November + 47-second response + follow-up strategy X -> booked," not the raw conversation.

8. **Three feedback levels, formalized.** LEVEL 0 PRIVATE (never leaves TenantOS). LEVEL 1 OPERATIONAL (temporary access to provide the contracted service). LEVEL 2 LEARNING (approved transformed/de-identified signals). LEVEL 3 AGGREGATE (cross-tenant statistics not reasonably tieable to an individual).

9. **Tenant-aware learning before global.** Tenant Memory -> Tenant Playbooks -> Tenant Evaluations, plus separately Cross-Tenant Aggregate Learning -> PING Global Playbooks. One customer's business intelligence does not casually become another's proprietary advantage.

10. **Tenant deletion/export sovereignty.** EXPORT customer, EXPORT tenant, DELETE customer, DELETE tenant, REVOKE PING access, ROTATE tenant credentials. Deletion propagates through identifiable derived material. Provenance (derived_from: tenant:<id>/event:<hash>) makes lifecycle reasoning possible; without it, deletion is archaeology.

11. **No training on production exhaust.** Production -> FeedbackAuthority -> Learning Dataset -> Evaluation -> Candidate improvement -> Replay -> Certification -> Promotion. Never production conversation -> model learns -> behavior changes. Self-improvement consumes governed feedback, per the constitutional convergence work.

12. **One canonical upstream path.** Acquisition -> Identity -> Hash -> Event Authority -> Persistence -> Sequence -> Replay. TenantOS is the upstream sovereign domain for customer truth; PING is canonical for operational/learning events. Not mutually authoritative stores.

## Commercial consequence

The shop isn't renting its customers from PING. TenantOS protects their customer relationships; PING is the intelligence and execution layer that makes those relationships more valuable. This is the honest version of the pitch, and it goes on the website verbatim in owner language.

## Nolan's calls (2026-09-25 ~10:37 MDT): MAXIMIZE with explicit boundaries

Direction: maximize useful, lawfully obtained business data. Do NOT retreat to "collect almost nothing." Separate collection from retention from learning from authority. PING observes a lot; far stricter about what becomes durable canonical knowledge.

| Question | Call |
|---|---|
| Model deletion | Versioned datasets + lineage + future exclusion. No magical unlearning promises. Retrain only where required by contract/law or supported by model architecture. |
| Backups | Tenant-keyed crypto-shredding + bounded backup expiry. Both. Key destruction handles practical accessibility; expiry eventually removes ciphertext. |
| Aggregation floor | Start conservative: no cross-tenant derived learning below >=10 independent tenants; suppress uniquely identifying slices. Revisit statistically; 10 is a floor, not anonymity. |
| 7 vs 4 taxonomy | Layer them. Seven data classes describe what the datum IS; four operational classes describe how it may be HANDLED. |
| Immediate controls | Four: (1) no raw PII in logs/vectors/traces; (2) tenant-scoped pseudonyms; (3) purpose record for crossings; (4) provenance/retention metadata at ingestion. |
| FeedbackContract | Explicitly blessed as the narrow architecture exception to "no new architecture." Otherwise agents will treat it as prohibited. |
| Break-glass | Added: explicit invocation, time-bounded, least-privilege, auditable. |
| Providers | Subprocessors/external processors with explicit retention boundaries, not invisible extensions of PING. |

### Observation architecture

RAW OBSERVATION (source, tenant, purpose, data classification, retention policy, consent/legal basis, provenance)
  -> TENANT-PRIVATE CANONICAL EVENT
       -> TASK-EPHEMERAL VIEW (provider/tool -> receipt -> expiry)
       -> TENANT KNOWLEDGE
       -> LEARNING GATE (identity reduction -> aggregation threshold -> materiality check -> provenance retained) -> SYSTEM LEARNING

PING may observe richly (call happened, who answered, timestamp, latency, disposition, booking outcome, service category, channel, job value, workflow steps, agent actions, failures, corrections, response patterns). Global playbooks need the reduced form (HVAC / after-hours / inbound-call / response<60s / booked / $1-2k / intervention=X), not the identified form.

### Event identity survives payload deletion

Retain: event_id, tenant, timestamp, event_type, payload_hash, policy_version, retention_class, deletion_state. The raw customer payload may disappear; the identity and proof do not.

### Replay redefined

Replay is deterministic over the evidence available under the applicable policy and deletion state. Stronger than pretending deletion and infinite replay coexist.

### Copy changes (applied to DataPractices.tsx)

- KILLED: "then it's gone." Replaced with: customer info used only where a defined operational purpose and retention policy exist; on expiry or deletion request, removed or rendered inaccessible under PING's control; audit evidence may remain without retaining deleted customer content.
- CHANGED: "we don't pool it" -> "PING doesn't pool identifiable customer records across businesses. Cross-business learning uses identity-reduced, policy-approved patterns that pass aggregation and provenance controls."

### Crypto-shredding warning

Key destruction only solves copies encrypted exclusively under that key. It does not retract plaintext sent to providers, leaked into logs, copied into traces, embedded in derived datasets, or learned by a model. Provenance and crossing records must exist alongside encryption. Never let the team turn it into a magic deletion claim.

### Event Authority forensic track

Stays strictly read-only. Do not contaminate that audit with this privacy architecture yet. Once Event Authority is resolved, determine where policy/provenance attributes belong instead of prematurely inventing another event system.

## Nolan's finish-line decisions (2026-09-25 ~10:42 MDT)

Six calls locked:
1. ORCA: PASS its own scope after fresh 17/17 rerun. Mission-layer reaper = separate P0. Never describe the system as auto-retry-safe until the reaper lands. Component verdicts follow component boundaries.
2. Fresh independent rerun: YES. Current SHA, clean state, exact command, 17/17 or no terminal PASS.
3. Freeze proof lanes: YES until Nolan tests Happy Place + Coppersmith. Exceptions: active security/integrity P0, data-loss risk, direct product blockers.
4. Arrow 2: YES, but only if the two-site path still depends on fixtures at the customer boundary. Don't rebuild real acquisition.
5. Edge objects: don't wait. Test now; placement verification downstream.
6. Ask FYD: test now. Evidence-boundedness over vocabulary.

Privacy posture: do NOT let privacy/data-doctrine metastasize into FYD's critical path. Real architectural truths, but contract boundaries to preserve now, not subsystems to finish before testing two websites. Technical grounding: NIST (de-identification reversible, aggregation alone weak especially small groups); crypto-erasure is a real deletion mechanism; Postgres RLS insufficient alone (BYPASSRLS, table owners) so continuous tenant-isolation testing warranted.

Refinements: secrets/credentials NEVER learning/embedding/model-context eligible (except explicit secret-handling tool boundary not exposed to the model). No magical "10 tenants = safe" threshold; later documented release policy + formal techniques (differential privacy) where justified. Controller/processor/subprocessor/DPA conventional language. Break-glass = explicit capability (identity, reason, scope, expiration, audit).

Signal compounding invariants: preserve every lawful provenance-backed signal (evidence/identity/learning never silently collapsed); negative evidence first-class (anti-survivorship-bias); provenance is the moat (explainable recommendation chains); Event Authority convergence = converge authority, UNION information, no unique info lost; every interaction compounds knowledge or evidences nothing permissible to retain. Four standing invariants: one authority per decision; no unique info lost in convergence; every retained signal has provenance + policy context; outcomes incl. negative flow back into graph.
