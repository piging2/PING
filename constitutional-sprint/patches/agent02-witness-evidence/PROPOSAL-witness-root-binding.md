# PROPOSAL — bind the kernel witness root into the live WITNESS_CREATED attestation

**Target:** `/home/nolan/ping`, file `ping-runtime/workers/canonical_workers.js` (WitnessWorker, lines ~490-499)
**Status:** PROPOSE ONLY. No patch applied. `/home/nolan/ping` is propose-only; per WRITER-OWNERSHIP
rule 4, fleet workers are propose-only. Dependency: Agent 03 (replay) owns `ReplayWorker`/kernel
semantics; Agent 01 owns the event/mission pipeline. Do not create a new witness authority.
**Accountability:** Agent 02 did not create the unreviewed WIP in the adapter worktree; this proposal
touches only the live core file named above and has not been applied.

## WHY

The live `WITNESS_CREATED` attestation is a label, not a commitment. The kernel replay engine computes
a real Merkle `witness_root` over (canonical_bytes, fingerprint, lineage, state, violations) and carries
it in `REPLAY_COMPLETED.payload.replay.witness_root`; `WitnessWorker` then discards it and emits
`attestation: 'witness-<16 hex of triggering event_id>'` with no hash, no root, no fingerprint.
Full chain in `../agent02-witness-evidence/WITNESS-EVIDENCE.md` (M1/M2, first broken boundary).
Consequence: the 66 persisted attestations cannot be recomputed or verified against the replays they
claim to certify, and `ConstitutionalVerificationAuthority.verifyWitness` (which requires
`witness.canonical_hash`) would reject every one of them. The fix is not new cryptography — it is
carrying the existing commitment through the boundary instead of dropping it.

## EVIDENCE

- `gateway/replay/kernel/witness_authority.js:40-50,94+` — compiled live copy computes the Merkle root.
- `ping-runtime/workers/canonical_workers.js:320-329` — `ReplayWorker` embeds `witness_root` in
`REPLAY_COMPLETED.payload.replay` and emits the event.
- `ping-runtime/workers/canonical_workers.js:490-499` — `WitnessWorker` emits `WITNESS_CREATED` with
`witness: { documentId, eventType, timestamp, attestation }`; no `witness_root`, no hash.
- `ping-runtime/workers/canonical_workers.js:467-476` — the W7 gate verifies the INPUT
(`payload.replay.verified === true`), never the output.
- `gateway/routes/mission_control.js:568-587` — `/mc/witness/stats` derives 66/0 from the events.
- `ping-runtime/evidence/constitutional_verification_authority.js:444-449` — `verifyWitness` requires
`artifact.witness.canonical_hash`; current emissions would fail this.

## MINIMUM CHANGE

In `WitnessWorker.handle()`, when the event is `REPLAY_COMPLETED` and the replay is verified:
reject unless `payload.replay.witness_root` is present and well-formed (object with a root/hash field);
emit `WITNESS_CREATED` whose `witness` object carries the kernel commitment alongside the existing
label. Do not invent a second root. Do not add a signature. Preserve `causation_id`, `upstreamEventId`,
`correlation_id` wiring unchanged. The `WITNESS_REJECTED` path is unchanged except that a missing or
malformed `witness_root` on an otherwise "verified" replay now rejects (fail-closed on the commitment
itself, not just the boolean flag).

Field naming must follow the kernel's own shape (`witness_root` as emitted by
`DeterministicReplayEngine`, including its `root` and `leaves` members) so a verifier can recompute
the root from the leaf set. If the kernel shape is later canonicalized, map fields there, not here.

```diff
--- a/ping-runtime/workers/canonical_workers.js
+++ b/ping-runtime/workers/canonical_workers.js
@@
       if (eventType === 'REPLAY_COMPLETED') {
         const replay = payload && payload.replay;
         const verified = replay && replay.verified === true;
-        if (!verified) {
+        // The kernel replay engine produces the witness commitment; the worker must
+        // carry it, not re-derive it. Reject if the commitment is missing or malformed
+        // even when the verified flag is set (a flag without a commitment is unverifiable).
+        const witnessRoot = replay && replay.witness_root;
+        const witnessRootValid =
+          !!witnessRoot &&
+          typeof witnessRoot === 'object' &&
+          typeof (witnessRoot.root || witnessRoot.hash) === 'string';
+        if (!verified || !witnessRootValid) {
           return this._emit('WITNESS_REJECTED', {
             witness: {
               documentId: event.event_id,
               eventType,
               timestamp: new Date().toISOString(),
-              reason: 'replay not verified'
+              reason: !verified ? 'replay not verified' : 'replay missing witness_root commitment'
             },
             upstreamEventId: event.event_id,
             correlationId: this._correlationId(event)
           }, event.correlation_id, event.event_id);
         }
         return this._emit('WITNESS_CREATED', {
           witness: {
             documentId: event.event_id,
             eventType,
             timestamp: new Date().toISOString(),
-            attestation: `witness-${event.event_id.slice(0, 16)}`
+            attestation: `witness-${event.event_id.slice(0, 16)}`,
+            // Bind the attestation to the kernel-generated witness commitment. This is
+            // the SAME object the replay engine produced; the worker does not invent one.
+            witness_root: witnessRoot,
+            replay_fingerprint: replay.fingerprint,
+            replay_violations: replay.violations || [],
+            replay_event_id: replay.upstreamEventId || event.event_id
           },
           upstreamEventId: event.event_id,
           correlationId: this._correlationId(event)
         }, event.correlation_id, event.event_id);
       }
```

Notes on the diff:
- `this._correlationId(event)` — verify the helper's exact name in `BaseWorker` before applying
(the live file computes the correlation id inline; the proposal uses the name as a placeholder —
the coordinator must resolve it against the file).
- `replay.upstreamEventId` — verify the exact field name in the kernel result object
(`canonical_workers.js:320-329`); the fallback keeps the emit well-formed if absent.
- Nothing in this diff changes `ReplayWorker`, the bridge map, the scheduler, or the kernel.
- Shape of the emitted `witness` object is deliberately still NOT `artifact.witness` as required by
`ConstitutionalVerificationAuthority.verifyWitness` (that authority's `witness.canonical_hash`
contract covers repository artifacts, not event attestations); renaming the event field to match
would conflate two contracts. If the coordinator wants event attestations verifiable by that
authority, that is a separate proposal (minting `witness.canonical_hash` on the event path) and
needs Agent 01/03 sign-off on the canonical shape.

## TEST

1. Extend the existing witness negative-path test (`gateway/test_witness_negpath.js`, which requires
`canonical_workers`) or add `gateway/test_witness_root_binding.js`:
   - `REPLAY_COMPLETED` with `payload.replay.verified === true` but NO `witness_root` → expect
`WITNESS_REJECTED` with reason `replay missing witness_root commitment`.
   - `REPLAY_COMPLETED` with `verified === true` and a well-formed `witness_root` →
`WITNESS_CREATED` whose `witness.witness_root` deep-equals the input object (identity, not a
re-derivation) and whose `attestation` label is unchanged.
   - `verified === false` (existing behavior) → `WITNESS_REJECTED`, reason `replay not verified`.
2. Replay the M1/M2 chain end-to-end in a scratch runtime: kernel replay → REPLAY_COMPLETED →
WITNESS_CREATE mission → `WITNESS_CREATED`; assert the persisted event's witness contains the
kernel root and `/mc/witness/stats` still counts it.

## RESULT

NOT RUN / PROPOSED. Core is propose-only; fleet workers are propose-only. The diff above has not
been applied to `/home/nolan/ping` and no test has been executed. Test result must be recorded by
whichever agent the coordinator authorizes to apply and run it. No rollback needed: no change exists.
