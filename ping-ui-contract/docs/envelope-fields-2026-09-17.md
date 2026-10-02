# Envelope-field audit: candidate additions to the maturity/proof envelope

Date: 2026-09-17. Question: does the envelope (envelope.json, carried by all 17 schemas) need schema_version, projection_version, authority_ref, generated_at, expires_at/freshness semantics, correlation_id, namespace? For each candidate: is there real backend semantics to support it, or would it be invented metadata? Recommend include vs defer. No em dashes are used in this document.

## Standing context

The current envelope carries: maturity, stage, source, verified_at, evidence_ref, proof_status. `source` is defined as "the authority the projection reads, e.g. 'ping_missions via MissionRuntime'". verified_at + evidence_ref are fail-closed required when maturity is PROVEN, BUILT_NOT_LIVE, or EXPERIMENTAL (index.mjs withEnvelope). The governing rule is UI CLAIM <= BACKEND PROOF: every envelope field is a claim about the backend and must have backend semantics behind it.

## Per-candidate verdicts

### schema_version: DEFER

Backend support: none at per-schema granularity. The ADR records that packages/schemas versions independently as a package, but the per-schema semver policy is DIRECTION (ADR section 10 open question 7). No backend authority versions its projections per schema, and no gateway endpoint advertises a schema version. Adding schema_version now would be invented metadata: a field with no producer able to set it truthfully and no consumer able to act on it. Revisit when the semver policy moves past DIRECTION; at that point derive it from the package version or a schema registry, not from hand-set strings.

### projection_version: DEFER

Backend support: none. Projections are derived views; no authority versions its derivation logic, and projection.json has no registered kinds to version against. Same invented-metadata problem as schema_version, with even less to anchor to. The stage axis (HARVESTED through DEPLOYED) already tracks implementation progress of the surface, which is the honest version of "how mature is this projection". Do not add.

### authority_ref: DEFER (source already covers it)

Backend support: real. The ADR names the canonical authorities (MissionRuntime/MissionScheduler, UnifiedEventRuntime, ExecutionAuthority, DeadLetterAuthority, KnowledgePromoter, WitnessWorker, ReplayWorker), so a constrained authority_ref vocabulary could be built. But envelope.source already carries exactly this ("the authority the projection reads"). Adding authority_ref alongside source creates two fields for one fact and invites them to disagree. Recommendation: defer a separate field; instead tighten source by convention: require source values to name a canonical authority from the ADR list or state UNKNOWN explicitly. If a structured ref is ever needed, it should replace the free-text portion of source, not sit beside it, and that replacement is a breaking change (see versioning.md).

### generated_at: INCLUDE (optional)

Backend support: real. Projections are built at a time; automation-health.json already requires its own generated_at, which proves the concept is meaningful and producible. generated_at is distinct from verified_at: generated_at says when this projection document was assembled; verified_at says when the underlying backend claim was last verified. Conflating them is a current soft spot (several schemas rely on verified_at alone to imply document freshness). Recommendation: add optional generated_at to the envelope. Optional, not required, because backfilling it for all producers is unnecessary; required verified_at already gates the proven rungs. Document the distinction: generated_at = document build time; verified_at = claim verification time.

### expires_at / freshness TTL semantics: DEFER

Backend support: none. No backend authority publishes TTLs or freshness guarantees for its projections; inventing expires_at would manufacture a promise the backend cannot honor and would let a stale projection look fresh until its invented expiry. The honest staleness mechanism is the one that exists: verified_at as the as-of timestamp, with consumers interpreting age. If freshness policy is ever needed, it belongs in consumer-side configuration (e.g. mission-control rendering "stale" badges past N minutes for specific surfaces), not in the contract envelope. Do not add.

### correlation_id: DEFER for the envelope (keep on the schemas that have it)

Backend support: real but scoped. correlation_id is a genuine event field (event.json, mission.json, correlation.json all carry it; the ADR confirms events carry correlationId). But most projections (authority, capability, namespace, worker, pagination, error) have no correlation context; putting correlation_id on every envelope would invite producers to invent correlation keys or overload the field as a run surrogate, which ADR boundary B explicitly forbids. The field already lives exactly where it is semantically real. Do not promote it to the envelope.

### namespace: DEFER (actively risky to include)

Backend support: syntax validation exists at the gateway (/events validates syntax), but per-principal entitlement is unproven and tenant identity does not exist (ADR boundaries A and I). Adding namespace to the shared envelope would stamp every projection with a namespace claim, and consumers would inevitably read per-tenant scoping or isolation into it. That is precisely the misreading boundary A exists to prevent. The audit confirms every schema is currently, correctly, silent on namespace except namespace.json itself. Keep it that way. Revisit only when per-principal namespace authorization is proven, at which point it should arrive with an entitlement receipt, not a bare string.

## Summary table

| Candidate | Backend semantics exist? | Verdict | Rationale in one line |
|---|---|---|---|
| schema_version | No (semver policy is DIRECTION) | DEFER | Invented metadata; no producer can set it truthfully. |
| projection_version | No | DEFER | No authority versions derivations; stage axis already tracks this. |
| authority_ref | Yes, but source covers it | DEFER | Would duplicate source; tighten source conventions instead. |
| generated_at | Yes (automation-health proves it) | INCLUDE (optional) | Build time is distinct from verified_at; both are real. |
| expires_at / freshness TTL | No | DEFER | Would manufacture a freshness promise the backend cannot honor. |
| correlation_id | Yes, but scoped to events | DEFER for envelope | Real where it lives (event/mission/correlation); envelope-wide it invites run-surrogate misuse. |
| namespace | Syntax only; entitlement unproven | DEFER (risky) | Envelope-wide namespace implies isolation claims boundary A forbids. |

## Recommended envelope change set

One additive, non-breaking change: add optional `generated_at` (date-time, "when this projection document was assembled; distinct from verified_at, which is when the underlying claim was last verified") to envelope.json. No other candidate clears the UI CLAIM <= BACKEND PROOF bar today. Everything else stays deferred until its backend semantics are proven, at which point each addition follows the additive rules in versioning.md and the operator-review gate in ADR section 0 resolution 3.
