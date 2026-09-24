# REPAIR-NOTES.md — known timestamp-in-identity repair sites (P1/P2, DO NOT MODIFY HERE)

The port law says: identity is caller-supplied and attempt-derived; wall-clock
and randomness must never enter an op key. The adapter layer enforces this via
`deriveOpKey()` / `deriveAttemptKey()` in adapter_core.js. Three pre-existing
sites in the wider codebase violate the law. They are noted here for the
P1/P2 repair lane. THIS LANE DOES NOT TOUCH THEM.

## R1. commit_authority._generateCommitId (PING convergence lane)
- Location: the convergence runtime's CommitAuthority (exact path to be
  confirmed by the P1 lane against the current refactor/runtime-authority-
  convergence tree).
- Violation: the commit id hashes wall-clock time, so two identical logical
  commits produce different ids and replay cannot re-derive the id.
- Repair direction: derive the commit id from (source revision, canonical
  inputs, sequence position) only; move the wall-clock timestamp into a
  separate observed-at field that is excluded from the identity hash.

## R2. canonical_event_envelope UUID v5 (PING canonical layer)
- Location: the canonical event envelope builder (path to be confirmed by
  the P1 lane).
- Violation: the UUID v5 name input embeds a timestamp, so the "deterministic"
  UUID is only deterministic per millisecond and cannot be re-derived from
  the logical event.
- Repair direction: UUID v5 name = namespace + canonical logical payload
  (event type, causal parents, payload hash). Timestamps stay in envelope
  metadata, never in the name input.

## R3. fyd-journal-gateway server.mjs intentId dedup
- Location: fyd-journal-gateway server.mjs.
- Violation: intent ids are random (event_id style), so the dedup window
  cannot distinguish "same logical intent retried" from "two different
  intents". Combined with the timeout-after-accept pattern, emitOverlayEvent
  can leave duplicate overlay events that look distinct.
- Repair direction: derive intentId from the logical intent (object, field,
  patch hash, attempt index); keep the random value only as a transport
  correlation id, never as the dedup key.

General repair principle for all three: PROVEN-AT-THE-BOUNDARY. The repair
must demonstrate that (a) the same logical operation re-derives the same id
across process restarts, and (b) the old timestamp-bearing value is either
preserved as a non-identity field or migrated with a documented mapping.
No destructive migration of historical ids.
