# PHASE 1 (25-phase): Call graph reverify — the four HPP business authorities (2026-09-19)

Objective: find the producer migration seam (Phase 7: migrate producers not data). Traced by actual call sites in the Phase 0 worktree (/home/nolan/worktrees/constitutional-convergence-authority-law @ 98ef51c9c). Read-only; no mutations.

## The seam: constructor injection in gateway_runtime.js

All four HPP business authorities receive the CanonicalEventEnvelope by constructor injection:

| Authority | Injection site | Envelope handle | executeEmitEvent call sites | Event types | Status |
|---|---|---|---|---|---|
| ReviewAuthority | gateway_runtime.js:416 | this._events (constructor arg canonicalEventEnvelope, :15-17) | review_authority.js:78 | review.flagged | EFFECTIVE writer |
| ProjectAuthority | gateway_runtime.js:428 | constructor arg canonicalEventEnvelope | project_authority.js:150,197,301 | project.created, project.updated, project.artifact_added | EFFECTIVE writer |
| CustomerAuthority | gateway_runtime.js:420 | this._eventEnvelope via _emitEvent helper (:541) | customer_authority.js:153,204,253,413 (via :541) | CUSTOMER_IMPORTED, CUSTOMER_EMAIL_SYNCED, CUSTOMER_CALENDAR_SYNCED, CUSTOMER_UPDATED, CUSTOMER_CREATED | EFFECTIVE writer |
| AIWorkspaceAuthority | gateway_runtime.js:410 | constructor arg (canonicalEventEnvelope) | ai_workspace_authority.js:88 (via :115,136,155,175) | none (throws) | WIRED but FALSIFIED as a writer: passes legacy-shaped params (aggregateId/aggregateType/eventData/authority); executeValidateEvent requires source/actor/payload; every call throws |

Fifth producer surface: POST /canonical-events (gateway/routes/canonical_events.js:19, mounted :696) — HTTP ingress, any producer-supplied type.

## The envelope call contract (what producers depend on)

executeEmitEvent({tenantId, eventType, source, actor, payload, causationId, correlationId, metadata}) (canonical_event_envelope.js:126):
1. getNextSequence(tenantId) -> per-tenant MAX(sequence)+1
2. timestamp = constitutionalTimeAuthority.nowAsISOString()
3. eventId = generateEventId(tenantId, eventType, timestamp, sequence) -> UUID v5
4. executeValidateEvent (shape validation; throws on missing source/actor/payload)
5. INSERT INTO canonical_events (single SQL writer, :174)

Producer-visible behavior the migration must preserve: synchronous receipt (the caller gets an event id back), tenant scoping, shape validation errors, causation/correlation passthrough.

## The registry gap (critical for Phase 7)

The UER governance registry (gateway/generated/event_registry.json, 233 types) was checked:

| Event type | Registry status |
|---|---|
| review.flagged | absent |
| project.created | absent |
| project.updated | absent |
| project.artifact_added | absent |
| CUSTOMER_IMPORTED | absent |
| CUSTOMER_CREATED | REGISTERED |
| REPLAY_COMPLETED | REGISTERED |
| WITNESS_CREATED | REGISTERED |

Consequence: if the HPP authorities migrate to emit through UnifiedEventRuntime directly today, the dotted types fail closed with UNREGISTERED_EVENT (event_governance.js:185) at the emit choke point. Phase 7 therefore requires, for each migrated type, one of: (a) registry addition (governance policy change), (b) extension of the capability-bound compatibility exception (the adapter's phase-2 pattern), or (c) envelope-side delegation. This is also why the adapter's documented compatibility exception exists: canonical_events.event_type is producer-controlled and unbounded, so no registry pre-registration was possible on the ingress path.

## What "migrate producers not data" means at this seam

- Migrate: the 4 constructor injection sites + the envelope call sites above + POST /canonical-events. The producers' call shape ({tenantId, eventType, source, actor, payload, causation/correlation, metadata}) is preserved; what changes is the authority behind the call.
- Not data: no rewrite of historical canonical_events rows, no identity rewrites, no table deletion. Historical UUIDs are era-marked as representation identities, never rewritten (Phase 6: historical data law).
- The envelope is NOT deleted in this migration (Phase 3: preserve intelligently). Its mechanisms (validation, envelope construction, tenant metadata, serialization, provenance, read APIs) are harvested behind the constitutional boundary; its independent truth decisions (UUID as event identity, MAX+1 as canonical order) are refactored away.
- The bridge is NOT removed (Phase 10: remove reminting without removing bridges). LegacyIngressAdapter stays as the preserved convergence path for the legacy surface.

## Identity seam (feeds Phase 4)

Today one logical business event gets two identities: the envelope's UUID v5 at ingress, then the adapter's event_<16hex> at convergence. Per the corrected law: one logical event -> one canonical identity (event_id, IdentityAuthority via UER). If canonical_events rows carry their own identifier, it must be explicitly envelope_id (certified representation identity), never presented as another identity for the logical event. The cross-reference (Phase 5) makes the mapping deterministic both directions without inventing a second random identity.

## Out of scope for this phase (sequenced, not dropped)

Phase 2: decision ownership matrix reworked under the corrected law (the existing phase2 matrix's per-decision UER ownership stands; the canonical_events role characterization moves toward the preferred order: certified event representation / immutable envelope / compatibility journal / domain projection / audit / migration-legacy). Phase 8: consistency model choice (same-transaction vs durable-derived with retry-same-identity). Phase 12/13: collision law and exactly-once fanout tests.
