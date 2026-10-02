# ProviderObservation to IdentityClaim Mapping (Design Only)

Lane B design. No repo writes. Lane A owns implementation.

## Model

Facebook is rented digital real estate. The canonical model is:

```
            PING NOLAN (canonical identity, Lane A)
                 |
      +----------+----------+
      |          |          |
  Facebook   ActivityPub   future ATProto
   claim       actor         claim
```

A Facebook connection is an IdentityClaim attached to the PING identity,
never the identity itself. The claim carries: provider=facebook,
provider_subject=opaque provider ID, claim_type=account_link,
status=connected, observed_at, evidence_ref, visibility.

## Reused PING machinery (all found read-only in /home/nolan/ping)

1. `runtime/kernel/identity/evidence.ts` (Evidence interface).
   The raw connector response becomes an Artifact; the extracted record is an
   Evidence with evidence_type="provider_identity_observation". Evidence
   content holds a sanitized summary (field names and counts), never the
   access token and never verbatim private content.

2. `cir/observation.ts` (Observation interface: type, id, kind, timestamp,
   entity_id, data).
   The observation shape: kind="provider_identity_observation",
   entity_id=opaque provider subject ID, data={provider, endpoint, fields
   observed, retrieved_at}.

3. `runtime/kernel/identity/fact.ts` (Fact interface, FactPayload).
   The account-link fact: fact_type="provider_account_link",
   subject=<PING Nolan identity id, assigned by Lane A>,
   predicate="linked_provider_account", object="100000536018898",
   evidence_ids=[evidence id from step 1].

4. `runtime/kernel/identity/relationship.ts` (Relationship interface).
   The claim as a relationship: relationship_type="provider_claim",
   source=<PING Nolan identity id>, target="100000536018898",
   properties={provider:"facebook", claim_type:"account_link",
   status:"connected", observed_at, evidence_ref, visibility}.

5. `runtime/kernel/identity/canonical-provenance.ts` (CanonicalProvenance).
   source_id=connector tool_call_id, origin="facebook",
   lineage=["facebook-cli", evidence_id, fact_id], parents=[].

6. `ping-runtime/evidence/evidence_authority.js` (EvidenceAuthority).
   ADD-only accumulator/verifier. The claim evidence is accumulated and
   hash-verified against ping_events; this authority never mutates events.

7. `workers/observation_worker.py` (OBSERVATION_CREATED) and
   `workers/claim_worker.py` (CLAIM_GENERATED).
   The existing observation-to-claim pipeline pattern. Currently
   document-chunk oriented; the same two-stage shape (observe, then derive
   claims) applies to provider observations. Repurpose the pattern, do not
   duplicate it.

## Data flow

```
facebook-cli read (bounded, authorized)
  -> raw response (transient, never persisted whole)
  -> Artifact (factual) + Evidence (sanitized summary)
  -> Observation (kind=provider_identity_observation)
  -> Fact (provider_account_link) + Relationship (provider_claim)
  -> EvidenceAuthority.accumulate/verify (ADD-only)
  -> PingObjectReader / Circle badge projection
```

## Hard rules for this mapping

- The access token is NEVER stored: not in ping_events payloads, not in
  Evidence content, not in projection tables, not in logs. It is a private
  secret reference only. Store status, opaque IDs, and evidence hashes.
- Provider observations are claims about an external surface, not canonical
  identity truth. A Facebook name change does not change PING Nolan.
- Revocation: if the grant disconnects, the claim status transitions to
  disconnected via a new observation. Canonical history is never deleted.
- Visibility: provider subject ID and "Facebook connected" badge may be
  public-projectable. Profile fields (bio, birthdate, education) follow the
  user's visibility policy; birthdate and similar fields default to private
  and are summarized, not copied, in evidence records.
- No new canonical authority is created. Facebook stays an adapter; the
  existing identity, evidence, fact, and relationship machinery absorbs it.
