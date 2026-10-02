# HISTORICAL COMPATIBILITY
2026-10-01. Era inventory per WS2 §3; compatibility argument per P0-A §4.

## Persisted eras (6 total, per WS2)

**ping_events (live, 3611 rows): 1 era** — 64-char lowercase hex,
`sha256(JSON.stringify(identity material))`. Zero `evt_*` rows.
`canonical_events`, `repository_events`, `mission_events`, `event_outbox`,
`event_processing`: 0 rows.

**Canonical FYD journal (:18199, 80+ rows and growing): 5 eras** —
`fyd-seed-ovl-NNN` (7 seeded), `fyd-ovl-<base36ms>-<12hex>`
(gateway-minted, `Date.now().toString(36)` + 6 random bytes — no
content-collision class; idempotency rides on `request_id`),
`mc-bf-<12hex>` (emit.py `mint_event_id`), `mc-apr-<16hex>` (emit.py
`mint_approval_event_id`), `mc-d-<12hex>` (mc-dispatch.ts `mintEventId`).

**Dormant-but-coded (zero persisted rows): `evt_<16hex>` family**
(`IdentityAuthority.generateId` -> generateEventId/generateObjectId/...
in `runtime/kernel/authorities/identity_authority.js:66`; deployed copy
identical). Live callers in the deployed image: `capability_scheduler.js`
— but CapabilityScheduler is never instantiated by the deployed gateway
bootstrap, and `appendEvent` has no implementation in the image. Dormant
path. Recommendation: carry RECOGNITION (`eraOf` classifies `evt_*` as
v1-evt so any stray row verifies), deprecate the minting path for new
use. Final RETIRE is Nolan's call (morning flag).

## Why the 3611 rows are safe (and always will be)

1. **Persisted event identity depends on the MINTING path, not on
   CanonicalBytes.** The spine minter is `sha256(JSON.stringify(identity))`
   — plain `JSON.stringify`, which never had the adjacent-scalar
   concatenation defect (`[1,2]` -> `"[1,2]"`, brackets preserved). The
   `[1,2]`≡`[12]` collision lives in CanonicalBytes, whose blast radius is
   digest/verification consumers (witness, replay audit, `evt_*` family) —
   NOT the `ping_events.event_id` values. No `ping_events` row's ID can be
   affected by the serializer replacement, because the serializer never
   minted those IDs.
2. **The V1 minter is golden-locked.** `mintV1` in this lane is
   byte-identical to `generateSpineEventId` @20528ee18, verified against
   the 2026-09-24 golden vectors (P-21). Any persisted-replay of the 3611
   rows recomputes the same IDs — proven on scratch PG (R2).
3. **No remint, no rewrite, no upgrade.** V1 rows keep their exact
   historical bytes forever. The V1 preimage schemes are pinned per
   producer: spine = sha256(JSON.stringify({eventType, source,
   [namespace], [tenant_id], [logical_id|payload]})) WITH
   JSON.stringify semantics (NaN->null, -0->0, undefined-drop,
   key-order-sensitive, toJSON honored) as accepted-for-history. Applying
   V2 canonicalization to a V1 row is a defect (it breaks replay).
4. **Known V1 collision classes are DOCUMENTED as accepted-for-history,
   not fixed.** The conflict-semantics hardening (§4.5/WS2) applies at
   write time regardless of era — it changes what happens ON collision,
   not the IDs themselves.

## Replay / witness / digest consumers

- `CanonicalAuthority.hashReplayEvent` / `hashWitnessBlock`: digest over
  {id, data, previousHash, authority, timestamp}. Only in-image caller:
  `gateway/replay_kernel_audit.js` (audit tooling, not the live path).
  `CanonicalBytes.serialize` stays FROZEN for its existing consumers and
  is marked deprecated for NEW identity use.
- WitnessAuthority create/verify: dormant in the deployed image (not
  instantiated). Live replay/witness traffic is verdict EVENTS carrying
  `upstreamEventId` opaquely; no digest verification on the live path.
- 3611 rows = 99 replay + 99 witness + 99 projection + 2771
  mission-runtime + others.

## Signatures containing event IDs

MC_APPROVAL_* journal events (`mc-apr-<16hex>` over approval_id,
event_type, proposal_digest, stamp; proposal digests are
`sha256-canonical-json-v1` — pinned semantics, NOT an event-ID minter);
WITNESS_CREATED/REJECTED payloads (`upstreamEventId` + attestation);
bridged events (`metadata.original_event_id` +
`payload._repository_event_id` — the join key is `metadata.original_event_id`,
NOT `event_id`; EventBridge re-mints and never preserves source IDs).
