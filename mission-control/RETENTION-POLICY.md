# Retention policy: audit metadata vs erasable payload

Batch 6 adjudication (2026-09-26, Nolan, authoritative): append-only does not
mean store everything forever. Audit metadata is immutable; sensitive
payloads live behind revocable references with a retention lifecycle:

ACTIVE -> STALE -> SUPERSEDED -> SUPPRESSED -> ERASURE_REQUESTED -> ERASED

## What is immutable

The journal event. Each audit-split event carries metadata only:

action, actor, capability, object_ref, evidence_digest, result, timestamp

plus metadata_digest (sha256 over the canonical metadata). The payload
itself is never in the immutable history, except small NON_SENSITIVE
inline payloads (counts, digests, policy names).

## What is erasable

Payload content in the PayloadStore, addressed by payload_ref. The store
manifest records subject_digest, payload class, state, and state history.
It never records raw subjects or secret content.

## Durations are chosen by policy, not by code

The code has no hardcoded retention durations. A RetentionPolicy supplies
dwell seconds per lifecycle state; any state with no configured dwell
never transitions automatically, and every transition is then explicit.

Three ways to configure:

1. JSON file (default path mission-control/retention-policy.json):
   {"name": "pilot", "dwell_seconds": {"ACTIVE": 2592000, "STALE": 7776000}}
2. Environment: MC_RETENTION_ACTIVE_S, MC_RETENTION_STALE_S, ...
3. Constructed in code: RetentionPolicy({"ACTIVE": 86400}, name="test")

Sweep semantics: PayloadStore.sweep(policy) moves a payload to the next
lifecycle state when its configured dwell has elapsed. ERASURE_REQUESTED
is never reached automatically; erasure is always an explicit
request_erasure() call (legal request, owner request, incident response).
ERASED is terminal; no transition leaves it.

## Classification taxonomy

Borrowed from the Batch 6 data-classification answer:

- PUBLIC: publishable business facts. May be inline, NON_SENSITIVE.
- OWNER: owner-scope operational data. NON_SENSITIVE inline only if small
  and non-identifying; otherwise behind a reference.
- CONFIDENTIAL: behind a reference (SENSITIVE), bounded dwell.
- SECRET: provider tokens, credentials. Behind a reference, shortest
  dwell; never in metadata (the secret-shape guard fails the build/test
  if one appears).
- REGULATED/SENSITIVE: visitor PII, identity documents, visitor
  messages. Behind a reference, erasure on request; the audit trail keeps
  only the digest.

## Erasure

request_erasure(subject, policy_name):

1. Compute subject_digest = sha256("subject:" + subject).
2. For each live payload_ref for that digest: drop content, move
   ACTIVE/... -> ERASURE_REQUESTED -> ERASED, record a tombstone with
   policy and timestamp (no content).
3. Emit DATA_ERASURE_COMPLETED with inline NON_SENSITIVE payload
   {subject_digest, policy, erased_refs, erased_at} and full audit
   metadata. The journal proves the erasure happened; the sensitive
   material is gone.

Redaction (PAYLOAD_REDACTED) is the lighter sibling: content replaced
behind the reference while the payload_ref stays resolvable to a
tombstone. Use it for partial incidents (one secret leaked into a
payload); use erasure for subject-level deletion requests.

## Superseding

Corrections are new events, never edits. The superseding event carries
supersedes: <old event_id>; the old payload moves to SUPERSEDED in the
store. The old journal event stays; history is never rewritten.
