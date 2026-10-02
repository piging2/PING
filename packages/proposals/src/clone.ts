/**
 * Deep clone that preserves `undefined`-valued keys.
 *
 * deepClone(x)) DROPS keys whose value is undefined,
 * but the trust digest canonicalizer EMITS them as null. A JSON
 * round-trip therefore changes digestCanonical(x) (proven by a failing
 * stale-proposal check: the generator leaves
 * provenance.eventSequences === undefined). Every clone in this package
 * goes through deepClone so digests are stable across clone boundaries.
 */
export function deepClone<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((x) => deepClone(x)) as unknown as T;
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value)) {
      out[k] = deepClone((value as Record<string, unknown>)[k]);
    }
    return out as T;
  }
  return value;
}
