/**
 * Namespace binding policy for the canonical boundary.
 *
 * Problem (proven 2026-09-23): CanonicalizationService.resolveNamespace
 * accepted an explicit `requested` namespace override from ANY source with
 * only a format check. Any unauthenticated caller of POST /ingest could emit
 * canonical events into any tenant's namespace (`tenant::<victim>`).
 *
 * This module is the binding POLICY. CanonicalizationService keeps ownership
 * of resolution (single owner, no competing implementation); its
 * authorizeNamespace delegates the allow/deny decision here. Bindings are
 * source -> permitted namespace(s), registered by the platform operator via
 * the service's `namespaces` option (or bindSource), never by the caller.
 *
 * Rule: "requested wins iff bound". An explicit override the source is not
 * bound to is DENIED. Trusted routing (operator per-source map) and the
 * server default resolve everything else.
 *
 * Scope: TenantOS answers only "whose isolated execution/resource context is
 * this". This module carries no identity, mission, object, FYD, event, or
 * capability semantics.
 */

const NAMESPACE_RE = /^(core|tenant)::[a-zA-Z0-9_-]+$/;

function createNamespaceBinder({ bindings = {}, defaultNamespace = 'core::owner' } = {}) {
  // bindings: { [source]: string | string[] } — namespaces this source may emit into.
  const table = new Map(
    Object.entries(bindings).map(([source, ns]) => [source, new Set([ns].flat())])
  );

  function isValidNamespace(ns) {
    return typeof ns === 'string' && NAMESPACE_RE.test(ns);
  }

  /**
   * Decide whether `source` may emit into `requested`.
   * Priority: bound explicit override > bound per-source default > global default.
   * An explicit override for a namespace the source is NOT bound to is DENIED
   * (this is the behavior change vs the old honor system).
   */
  function authorize(source, requested) {
    if (requested) {
      if (!isValidNamespace(requested)) {
        return { authorized: false, reason: `Invalid namespace: '${requested}' (must be core::<name> or tenant::<id>)` };
      }
      const allowed = table.get(source);
      if (allowed && allowed.has(requested)) {
        return { authorized: true, namespace: requested };
      }
      return { authorized: false, reason: `source '${source}' is not bound to namespace '${requested}'` };
    }
    const allowed = table.get(source);
    if (allowed && allowed.size > 0) {
      return { authorized: true, namespace: [...allowed][0] };
    }
    return { authorized: true, namespace: defaultNamespace };
  }

  /** Operator-side registration: bind a source to the namespaces it may use. */
  function bindSource(source, namespaces) {
    if (typeof source !== 'string' || !source) throw new Error('bindSource: source required');
    const list = [namespaces].flat().filter(isValidNamespace);
    if (list.length === 0) throw new Error('bindSource: at least one valid namespace required');
    table.set(source, new Set(list));
  }

  return { authorize, bindSource };
}

module.exports = { createNamespaceBinder, NAMESPACE_RE };
