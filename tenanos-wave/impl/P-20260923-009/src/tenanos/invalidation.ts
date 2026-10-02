/**
 * invalidation.ts — bitemporal memory supersession, never delete (P-20260923-009).
 *
 * Graphiti pattern. A fact carries two time axes:
 *  - valid time:  valid_at (when the fact became true in the world) ..
 *                 invalid_at (when a newer fact superseded it; null = current)
 *  - record time: created_at (when this record was written),
 *                 expired_at (record-level expiry; null = not expired)
 *
 * Contradictions are resolved by timestamp surgery, never by deletion:
 *   old.invalid_at = new.valid_at; old.expired_at = now.
 * The old record stays in the store forever; bitemporal reads (asOf) decide
 * which facts were true at a given instant.
 *
 * Separation of concerns (binding):
 *  - DETECTION is heuristic and advisory. A Detector proposes Contradiction
 *    candidates; a wrong detection corrupts nothing because detection alone
 *    mutates no state.
 *  - INVALIDATION is deterministic and requires confirmed=true. Only an
 *    explicit confirmation turns a candidate into timestamp surgery.
 *
 * Tenant scoping: invalidation never crosses tenants. A contradiction whose
 * old and new facts belong to different tenants is rejected fail-closed.
 *
 * Coordination: P-20260923-099 (transition log) owns the event/replay level;
 * this module owns the store-side bitemporal representation and consumes
 * 099's supersedes_node_id link as the supersedes/superseded_by pair.
 *
 * Pure apart from the injected clock/now parameter. No I/O, no imports.
 */

export interface MemoryFact {
  id: string;
  /** Tenant namespace, e.g. 'tenant::hpp'. Invalidation never crosses it. */
  tenant: string;
  content: string;
  /** ISO-8601. When the fact became true in the world. */
  valid_at: string;
  /** ISO-8601 or null. Set to the superseding fact's valid_at. Null = current. */
  invalid_at: string | null;
  /** ISO-8601 or null. Record-level expiry. Null = not expired. */
  expired_at: string | null;
  /** ISO-8601. Transaction time: when this record was written. */
  created_at: string;
  /** Id of the fact this one supersedes (set on the new fact). */
  supersedes?: string | null;
  /** Id of the fact that superseded this one (set on the old fact). */
  superseded_by?: string | null;
}

/**
 * A contradiction candidate from heuristic detection. Advisory only:
 * applyInvalidation requires confirmed=true before touching the store.
 */
export interface Contradiction {
  oldFactId: string;
  /** The superseding fact. invalid_at/expired_at/created_at are assigned
   *  by applyInvalidation; the detector must not set lifecycle fields. */
  newFact: {
    id: string;
    tenant: string;
    content: string;
    valid_at: string;
  };
  reason: string;
  confirmed: boolean;
}

/** Heuristic, pluggable contradiction detection. Proposes; never mutates. */
export type Detector = (
  facts: readonly MemoryFact[],
  tenant: string,
) => Contradiction[];

export type InvalidationErrorCode =
  | 'UNKNOWN_FACT'
  | 'TENANT_MISMATCH'
  | 'ALREADY_SUPERSEDED'
  | 'UNCONFIRMED'
  | 'NON_MONOTONIC_VALID_TIME'
  | 'DUPLICATE_ID';

export type InvalidationResult =
  | { ok: true; oldFact: MemoryFact; newFact: MemoryFact }
  | { ok: false; error: InvalidationErrorCode; detail: string };

function fail(error: InvalidationErrorCode, detail: string): InvalidationResult {
  return { ok: false, error, detail };
}

function isIso(s: string): boolean {
  return !Number.isNaN(Date.parse(s));
}

/**
 * Deterministic invalidation. On success the store grows by exactly one
 * record and no record is removed or altered except the old fact's
 * invalid_at/expired_at/superseded_by lifecycle fields.
 */
export function applyInvalidation(
  store: MemoryFact[],
  contradiction: Contradiction,
  nowIso: string,
): InvalidationResult {
  if (!isIso(nowIso)) {
    return fail('NON_MONOTONIC_VALID_TIME', 'nowIso is not a valid ISO-8601 timestamp');
  }
  const old = store.find((f) => f.id === contradiction.oldFactId);
  if (!old) {
    return fail('UNKNOWN_FACT', `no fact with id '${contradiction.oldFactId}'`);
  }
  if (!contradiction.confirmed) {
    return fail(
      'UNCONFIRMED',
      'detection is advisory: a contradiction must be explicitly confirmed before invalidation',
    );
  }
  if (old.tenant !== contradiction.newFact.tenant) {
    return fail(
      'TENANT_MISMATCH',
      `invalidation never crosses tenants: old='${old.tenant}' new='${contradiction.newFact.tenant}'`,
    );
  }
  if (old.invalid_at !== null) {
    return fail('ALREADY_SUPERSEDED', `fact '${old.id}' was already superseded`);
  }
  if (store.some((f) => f.id === contradiction.newFact.id) || contradiction.newFact.id === old.id) {
    return fail('DUPLICATE_ID', `fact id '${contradiction.newFact.id}' already exists in the store`);
  }
  if (!isIso(contradiction.newFact.valid_at)) {
    return fail('NON_MONOTONIC_VALID_TIME', 'newFact.valid_at is not a valid ISO-8601 timestamp');
  }
  // Supersession moves the valid-time frontier forward. A backdated
  // correction is an amend, not a supersession: reject, do not silently
  // reorder history.
  if (Date.parse(contradiction.newFact.valid_at) < Date.parse(old.valid_at)) {
    return fail(
      'NON_MONOTONIC_VALID_TIME',
      `new valid_at ${contradiction.newFact.valid_at} precedes old valid_at ${old.valid_at}`,
    );
  }

  const newFact: MemoryFact = {
    id: contradiction.newFact.id,
    tenant: contradiction.newFact.tenant,
    content: contradiction.newFact.content,
    valid_at: contradiction.newFact.valid_at,
    invalid_at: null,
    expired_at: null,
    created_at: nowIso,
    supersedes: old.id,
    superseded_by: null,
  };

  // The timestamp surgery. Nothing is deleted; the old record stays.
  old.invalid_at = newFact.valid_at;
  old.expired_at = nowIso;
  old.superseded_by = newFact.id;
  store.push(newFact);

  return { ok: true, oldFact: old, newFact };
}

/** Tenant-scoped candidate selection for detection. Cross-tenant facts are
 *  never even presented to the detector. */
export function selectCandidates(
  facts: readonly MemoryFact[],
  tenant: string,
  predicate: (fact: MemoryFact) => boolean,
): MemoryFact[] {
  return facts.filter((f) => f.tenant === tenant && predicate(f));
}

/**
 * Bitemporal read: facts that were true for `tenant` at instant `atIso`.
 * A superseded fact is visible before its invalid_at and invisible after;
 * nothing is ever deleted so history stays queryable.
 */
export function asOf(
  facts: readonly MemoryFact[],
  tenant: string,
  atIso: string,
): MemoryFact[] {
  const at = Date.parse(atIso);
  if (Number.isNaN(at)) {
    throw new Error('atIso is not a valid ISO-8601 timestamp');
  }
  return facts.filter((f) => {
    if (f.tenant !== tenant) {
      return false;
    }
    if (Date.parse(f.valid_at) > at) {
      return false;
    }
    if (f.invalid_at !== null && Date.parse(f.invalid_at) <= at) {
      return false;
    }
    if (f.expired_at !== null && Date.parse(f.expired_at) <= at) {
      return false;
    }
    return true;
  });
}

/** Currently-true facts for a tenant: never invalidated, never expired. */
export function currentFacts(
  facts: readonly MemoryFact[],
  tenant: string,
): MemoryFact[] {
  return facts.filter(
    (f) => f.tenant === tenant && f.invalid_at === null && f.expired_at === null,
  );
}
