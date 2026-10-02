/**
 * C1 — deterministic transition identity + idempotent append.
 *
 * HARVESTED PATTERN (not copied code):
 *   SOURCE: /home/nolan/ping, ping-runtime/events/unified_event_runtime.js
 *           (emit(): event_id = SHA-256(JSON.stringify({eventType, source,
 *           [namespace], logical_id|payload})); INSERT ... ON CONFLICT
 *           (event_id) DO NOTHING — rowCount>0 persisted, else deduplicated)
 *   EVIDENCE: ~/workspace/fyd-lane/harvest-wave1/code-evidence/unified_event_runtime.js
 *
 * ADAPTATIONS for FYD (per harvest report):
 *   1. Canonical serializer from ./canonical.ts (fixes the key-order flag —
 *      PING's spine used raw JSON.stringify; FYD uses the Patch-7B pattern).
 *   2. generator_version is bound into the identity: FYD's determinism contract
 *      is SiteSpec = f(ObjectGraph, OwnerPolicy, ViewerContext, GeneratorVersion),
 *      so a transition ID must change if the generator that interprets it changes.
 *      PING's IdentityAuthority binds constitutional_version the same way.
 *   3. Persistence is an in-memory journal (staged; PG wiring is future work).
 *      The dedup contract (second emit is a no-op, state unchanged) is what
 *      the tests prove.
 *
 * Use: the owner transition journal — PROPOSED -> APPROVED -> ACCEPTED ->
 * OBSERVED_COMPLETE. Re-running the same approval cannot double-apply it.
 */

import { createHash } from 'node:crypto';
import { canonicalBytes } from './canonical.js';

/** FYD generator version bound into every transition identity. */
export const FYD_GENERATOR_VERSION = '0.1.0';

/** Identity era: content-hash. No UUIDs, no timestamps, no randomness in the hash. */
export interface TransitionIdentity {
  /** Transition stage, e.g. 'PROPOSED' | 'APPROVED' | 'ACCEPTED' | 'OBSERVED_COMPLETE'. */
  stage: string;
  objectId: string;
  ownerId: string;
  /** Timestamp-stripped logical payload — two emissions of the same logical
   *  transition hash identically even if wall-clock fields differ. */
  logicalPayload: unknown;
}

/**
 * Stable, content-derived transition ID: sha256 hex of the canonical bytes of
 * { stage, object_id, owner_id, logical_payload, generator_version }.
 */
export function fydTransitionId(
  t: TransitionIdentity,
  generatorVersion: string = FYD_GENERATOR_VERSION
): string {
  const identity = {
    stage: t.stage,
    object_id: t.objectId,
    owner_id: t.ownerId,
    logical_payload: t.logicalPayload,
    generator_version: generatorVersion,
  };
  return createHash('sha256').update(canonicalBytes(identity), 'utf8').digest('hex');
}

export interface TransitionRecord {
  id: string;
  stage: string;
  objectId: string;
  ownerId: string;
  payload: unknown;
}

export type AppendStatus = 'persisted' | 'deduped';

/**
 * Idempotent transition journal. append() is safe to retry: the second emit of
 * the same logical transition returns 'deduped' and changes no state.
 */
export class TransitionJournal {
  private readonly _seen = new Map<string, TransitionRecord>();

  append(t: TransitionIdentity): { status: AppendStatus; id: string } {
    const id = fydTransitionId(t);
    if (this._seen.has(id)) return { status: 'deduped', id };
    this._seen.set(id, {
      id,
      stage: t.stage,
      objectId: t.objectId,
      ownerId: t.ownerId,
      payload: t.logicalPayload,
    });
    return { status: 'persisted', id };
  }

  get size(): number {
    return this._seen.size;
  }

  has(id: string): boolean {
    return this._seen.has(id);
  }

  get(id: string): TransitionRecord | undefined {
    return this._seen.get(id);
  }
}
