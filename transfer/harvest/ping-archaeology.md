# PING Repo Archaeology: Existing Machinery to Repurpose

Lane C, read-only. Searched /home/nolan/ping on branch refactor/runtime-authority-convergence (HEAD fd5539948) for like/follow/reaction/relationship machinery, provider adapters, proposal/approval flows, identity claims, and evidence/provenance. Verdicts below tell Lane A what to REPURPOSE instead of writing new code.

## Top repurpose candidates

### 1. ping_relationships projection table — REPURPOSE (highest value)

Path: database/ping_objects.sql (lines 55-90)

Already exists with EXACTLY the social predicates Lane A needs:
- subject, predicate, object, status, metadata, created_at
- CHECK (predicate IN ('follows', 'replies_to', 'references', 'likes', 'mentions'))
- CHECK (status IN ('active', 'inactive'))
- UNIQUE (subject, predicate, object)

Status: live projection. Comment says "PROJECTION: Rebuildable from canonical event history". The PingProjector (runtime/constitutional/src/ping-projector.ts) already has rebuildRelationships() reading canonical events and inserting into ping_relationships (relationship_id, subject, predicate, object, created_at, status, metadata).

Verdict: DO NOT create a like table, a follow table, or any social edge table. Lane A must project follows and likes here. Unlike/unfollow = status 'inactive' (revocation), never row deletion. The table already encodes the ActivityPub Undo lesson (canonical history stays, projection flips status).

### 2. Canonical Relationship object shape — REPURPOSE

Path: runtime/kernel/identity/relationship.ts

Live kernel type:
- RelationshipPayload { relationship_type, source, target, properties }
- Relationship extends CanonicalObject with identity { id, authority, namespace, kind: Relationship, version, hash }

Status: kernel-level, touched 2026-06-27 (constitutional replay kernel import). No importers found in the current tree, so it is dormant-but-canonical: the shape exists in the identity kernel, nothing currently consumes it.

Verdict: Lane A RELATIONSHIP_CREATED events should adopt this payload shape (relationship_type/source/target/properties) rather than inventing a new one. Note the naming difference: kernel uses source/target while ping_objects.sql uses subject/object and predicate vs relationship_type. Lane A must reconcile naming once and document the mapping; do not carry both vocabularies.

### 3. OAuth provider framework — REPURPOSE for Facebook adapter

Path: ping-runtime/connectors/oauth_provider.js

Live: imported and initialized in gateway/bootstrap/gateway_runtime.js (OAuthFlowManager, TokenStore), routes mounted at /connectors. Supports OAuth 2.0 authorization code, PKCE, API key, Basic auth. Has a PROVIDER_OAUTH_CONFIGS map INCLUDING facebook:
- authUrl: https://www.facebook.com/v19.0/dialog/oauth
- tokenUrl: https://graph.facebook.com/v19.0/oauth/access_token
- scopes: reviews -> pages_show_list,pages_read_engagement; pages -> pages_manage_posts,pages_read_engagement

Verdict: Lane B should build the Facebook adapter ON this framework, not hand-roll OAuth. Two caveats: (a) Graph API v19.0 is dated (current is v21+); verify the version still works or bump carefully at integration time; (b) the config is page-scoped, which matches PING Social business use (pages, not personal profiles). Token storage already exists (TokenStore); never persist tokens in ping_events.

### 4. Proposal admission + approval authority — REPURPOSE for agent proposal flow

Paths: gateway/proposal_admission.js, gateway/approval_authority.js, gateway/proposal_objects.js

Existing machinery:
- ProposalAdmission: proposals pass admission validation before becoming constitutional objects; rejected proposals never reach MissionAuthority; accepted proposals become immutable. Has a quarantine table.
- ApprovalAuthority: approvals table (approval_id, patch_id, policy, status pending/approved, conditions JSONB, witness_hash, approved_by, approved_at). Policies: automatic, manual, constitutional, protected branch, production.

Status: last touched 2026-08-09 (M3 migration). The gateway runtime references approval in the knowledge-promotion path (line 585: human approval promotes to knowledge). Dormant for the social flow but the tables and classes are real.

Verdict: Lane A agent-proposal flow should reuse this pattern: agent proposal -> ProposalAdmission quarantine -> human (Alice/Nolan) approval -> ApprovalAuthority record with witness hash -> canonical event. Do NOT create a ProposalAuthority class. The existing naming already avoids an authority where an admission gate suffices.

### 5. Claim worker event pattern — ADAPT the pattern, not the semantics

Paths: workers/claim_worker.py, claim_worker.py

Existing flow: consumes OBSERVATION_CREATED, produces CLAIM_GENERATED. BUT the semantics are knowledge claims (propositions generated from observations by a local model), not identity claims.

Verdict: reuse the OBSERVATION_CREATED -> claim event pipeline shape for the Facebook observation -> identity claim flow, but do NOT reuse claim_worker's proposition semantics. The identity claim needs its own schema: provider, provider_subject (opaque ID), claim_type (account_link), status, observed_at, evidence_ref, visibility. No identity-claim machinery exists yet; that schema is genuinely new and small.

### 6. Evidence authority — REPURPOSE for claim provenance

Path: ping-runtime/evidence/evidence_authority.js (plus constitutional_verification_authority.js)

Verdict: provider observations and identity claims should carry evidence_ref values produced by the existing evidence machinery. Do not invent a parallel provenance store.

## Do NOT repurpose (wrong domain)

### gateway/provider_interface.js — LLM only
Interface is generate/embed/health/listModels/streaming for LLM providers (Ollama, vLLM, OpenAI, Anthropic, DeepSeek, Kimi). Verdict: do not stretch it into a social provider adapter. The Facebook adapter needs its own small boundary (observeIdentity/observeObjects/performAuthorizedAction); generalize only after a second social adapter exists.

### runtime/kernel/providers/provider-authority-interface.ts — execution providers
IProviderAuthority registers ExecutionProvider with ProviderType enum (llm, regex, sql, python, filesystem, git, ast, hasher, parser). This is execution routing, not social adapters. Verdict: do not conflate. ProviderTrait has no social traits; do not add any tonight.

### gateway/relationship_objects.js + gateway/relationship_runtime.js — code lineage edges
RelationshipEdgeObject with edge types CALLS/IMPLEMENTS/DEPENDS_ON/DERIVED_FROM/USES/OWNS. This is repository/code-graph lineage (Milestone 5 Relationship Runtime), not social relationships. Verdict: different domain, do not touch for Lane A.

### cir/relationship.ts, cir/builders/relationship-builder.ts — CIR payload layer
CIR Relationship is explicitly "a CIR payload type, not a canonical object". Verdict: leave the CIR layer alone; Lane A works at the canonical kernel layer.

### archive/obsolete/object_relationships.sql — archived
Verdict: archaeology only. Do not revive, do not delete.

### gateway/witness_relationship_prover.js — witness domain
Verifies edge ordering/IDs/proposal hashes for witness purposes. Verdict: the witness/proof path is relevant to Lane D's replay verification, but the file's edge model is the code-lineage one. Use WitnessAuthority for PING object replay proofs, not this prover directly.

## Single most valuable find

database/ping_objects.sql ping_relationships. It already has follows, replies_to, references, likes, mentions with active/inactive revocation semantics, a uniqueness constraint on (subject, predicate, object), and a live projector rebuild path from canonical event history. Lane A's entire follow/like/reply projection layer exists. The work is: write canonical RELATIONSHIP_CREATED events through the governed path and let the existing projector fill this table. No new schema, no new authority, no new table.

## Open checks for Lane A (not blockers)

1. Reconcile naming: kernel relationship.ts uses source/target + relationship_type; ping_objects.sql uses subject/object + predicate. Pick one mapping and document it in the event payload contract.
2. The ping_transitions table comment mentions transitions (create, relate, propose, approve, publish, tombstone); check whether RELATIONSHIP_CREATED should also emit a transition row, or whether transitions are derived. Do not decide in this lane.
3. The PingProjector's rebuildRelationships reads specific payload fields (payload->>'relationship_id'); Lane A's event payload must match the fields the projector selects, or the projector gets a narrow, reviewed update.
