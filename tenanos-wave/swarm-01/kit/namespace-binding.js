/**
 * Namespace binding policy for the canonical boundary.
 *
 * Problem (proven 2026-09-23, swarm-01): CanonicalizationService.resolveNamespace
 * accepts an explicit `requested` namespace override from ANY source with only a
 * format check. Any unauthenticated caller of POST /ingest can emit canonical
 * events into any tenant's namespace (`tenant::<victim>`). The "authorize" in
 * authorizeNamespace is a misnomer: it validates shape, not authority.
 *
 * This module is the binding POLICY. CanonicalizationService keeps ownership of
 * resolution (single owner, no competing implementation); its authorizeNamespace
 * delegates the allow/deny decision here. Bindings are source -> permitted
 * namespace(s), registered by the platform operator (from tenant registry),
 * never by the caller.
 *
 * REFACTOR (not replace): resolveNamespace keeps its signature and remains the
 * one choke point; only the override branch changes from "requested wins" to
 * "requested wins iff bound".
 */

const { NAMESPACE_RE, tenantIdToNamespace } = require('./tenant-context');

function createNamespaceBinder({ bindings = {}, defaultNamespace = 'core::owner' } = {}) {
  // bindings: { [source]: string[] } — namespaces this source may emit into.
  const table = new Map(Object.entries(bindings).map(([s, ns]) => [s, new Set([ns].flat())]));

  function isValidNamespace(ns) {
    return typeof ns === 'string' && NAMESPACE_RE.test(ns);
  }

  /**
   * Decide whether `source` may emit into `requested`.
   * Priority: bound explicit override > per-source default > global default.
   * An explicit override for a namespace the source is NOT bound to is DENIED
   * (this is the behavior change vs the current honor system).
   */
  function authorize(source, requested) {
    if (requested !== undefined && requested !== null) {
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

  /** Convenience: bind a source to exactly its tenant's namespace. */
  function bindSourceToTenant(source, tenantId) {
    bindSource(source, tenantIdToNamespace(tenantId));
  }

  return { authorize, bindSource, bindSourceToTenant };
}

module.exports = { createNamespaceBinder };
