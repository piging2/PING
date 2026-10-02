import io

BASE = "/home/nolan/ping"

def edit(path, pairs):
    src = io.open(BASE + path, encoding="utf-8").read()
    for old, new in pairs:
        assert src.count(old) == 1, "anchor not unique/found in %s: %r" % (path, old[:80])
        src = src.replace(old, new, 1)
    io.open(BASE + path, "w", encoding="utf-8").write(src)
    print("edited", path)

# --------------------------------- ping-runtime/search/qdrant_adapter.js
edit("/ping-runtime/search/qdrant_adapter.js", [
(
'''/**
 * Qdrant Adapter — PING Core v1 (Priority 7)
 *
 * Thin REST adapter. Reuses the proven REST client pattern from gateway/qdrant_client.js.
 * No npm dependency. Exposes search + upsert only. Nothing more.
 */''',
'''/**
 * Qdrant Adapter — PING Core v1 (Priority 7)
 *
 * Thin REST adapter. Reuses the proven REST client pattern from gateway/qdrant_client.js.
 * No npm dependency. Exposes search + upsert only. Nothing more.
 *
 * TENANT ISOLATION (TenantOS logical partitioning): every vector record
 * carries an immutable payload.namespace ("tenant::<id>", "core::*").
 * The namespace is the tenant boundary at this layer:
 *   - search REQUIRES options.namespace and enforces it server-side as a
 *     Qdrant payload filter ANDed under any caller filter. A caller can
 *     narrow results, never widen them past its own namespace.
 *   - upsert REQUIRES payload.namespace on every point; a batch that mixes
 *     namespaces (or omits them) is refused before anything is stored.
 *   - no namespace = fail closed (throw), never an unfiltered search.
 * A future high-isolation tenant can map to a dedicated collection through
 * the collection argument without changing these semantics.
 */'''),
(
'''  /**
   * Upsert points into a collection.
   */
  async upsert(collection, points) {
    return this._fetch(`/collections/${collection}/points`, {
      method: 'PUT',
      body: JSON.stringify({ points }),
    });
  }

  /**
   * Search by vector.
   */
  async search(collection, vector, limit = 10) {
    const result = await this._fetch(`/collections/${collection}/points/search`, {
      method: 'POST',
      body: JSON.stringify({ vector, limit, with_payload: true }),
    });
    return result.result || [];
  }''',
'''  /**
   * Upsert points into a collection.
   *
   * Tenant isolation: every point's payload.namespace must be present and,
   * when options.namespace is given, must equal it. Mixed-namespace batches
   * are refused before anything is stored — never partially applied.
   */
  async upsert(collection, points, options = {}) {
    const pts = Array.isArray(points) ? points : [];
    for (const p of pts) {
      const ns = p && p.payload ? p.payload.namespace : undefined;
      if (typeof ns !== 'string' || ns.length === 0) {
        throw new Error(
          'QdrantAdapter.upsert: every point requires payload.namespace (tenant isolation fail-closed)',
        );
      }
      if (options.namespace && ns !== options.namespace) {
        throw new Error(
          `QdrantAdapter.upsert: point namespace "${ns}" does not match batch namespace "${options.namespace}" (refused)`,
        );
      }
    }
    return this._fetch(`/collections/${collection}/points`, {
      method: 'PUT',
      body: JSON.stringify({ points: pts }),
    });
  }

  /**
   * Search by vector.
   *
   * Tenant isolation: options.namespace is REQUIRED. It is enforced
   * server-side as a Qdrant payload filter ANDed with any caller-supplied
   * filter conditions (caller conditions narrow, never widen). No namespace
   * = throw, never an unfiltered cross-namespace search.
   */
  async search(collection, vector, limit = 10, options = {}) {
    const namespace = options.namespace;
    if (typeof namespace !== 'string' || namespace.length === 0) {
      throw new Error(
        'QdrantAdapter.search: options.namespace is required (tenant isolation fail-closed)',
      );
    }
    const must = [{ key: 'namespace', match: { value: namespace } }];
    if (options.filter && Array.isArray(options.filter.must)) {
      must.push(...options.filter.must);
    }
    const result = await this._fetch(`/collections/${collection}/points/search`, {
      method: 'POST',
      body: JSON.stringify({ vector, limit, filter: { must }, with_payload: true }),
    });
    return result.result || [];
  }'''),
])

# ------------------------------ ping-runtime/embeddings/embedding_service.js
edit("/ping-runtime/embeddings/embedding_service.js", [
(
'''  /** Semantic search over the projected collection. */
  async search(text, options = {}) {
    if (!this._qdrant) throw new Error('EmbeddingService: no qdrantAdapter');
    const { embedding } = await this.embed(text, { model: options.model });
    return this._qdrant.search(this._collection, embedding, options.limit || 10);
  }''',
'''  /**
   * Semantic search over the projected collection.
   * Tenant isolation: options.namespace is REQUIRED and is forwarded to the
   * adapter, which enforces it server-side. No namespace = fail closed.
   */
  async search(text, options = {}) {
    if (!this._qdrant) throw new Error('EmbeddingService: no qdrantAdapter');
    const namespace = options.namespace;
    if (typeof namespace !== 'string' || namespace.length === 0) {
      throw new Error(
        'EmbeddingService.search: options.namespace is required (tenant isolation fail-closed)',
      );
    }
    const { embedding } = await this.embed(text, { model: options.model });
    return this._qdrant.search(this._collection, embedding, options.limit || 10, { namespace });
  }'''),
])

# ------------------------------------ ping-runtime/search/hybrid_search.js
edit("/ping-runtime/search/hybrid_search.js", [
(
''' * Every result obeys RETRIEVAL_INTELLIGENCE_REPORT.md law #1 (trace on every
 * result): `{ canonical_hash, namespace, confidence, evidence:[eventIds], verified, source }`.
 *
 * ADD-only — reads Qdrant/Postgres, never writes. Namespace filtering happens
 * after the embedding search because the Qdrant adapter has no server-side filter;
 * results from a different namespace are structurally dropped.
 */''',
''' * Every result obeys RETRIEVAL_INTELLIGENCE_REPORT.md law #1 (trace on every
 * result): `{ canonical_hash, namespace, confidence, evidence:[eventIds], verified, source }`.
 *
 * ADD-only — reads Qdrant/Postgres, never writes. The namespace is enforced
 * server-side by the Qdrant adapter (fail-closed when absent); the post-search
 * payload check below stays as defense in depth.
 */'''),
(
'''  async search({ query, namespace, limit = 10 }) {
    if (!query || typeof query !== 'string') {
      return { status: 'ok', results: [], total: 0, stats: this.getStats(), error: 'query required' };
    }

    const results = [];

    // ─── Semantic leg ─────────────────────────────────────────────
    if (this._embedding) {
      let hits = [];
      try {
        hits = await this._embedding.search(query, { limit: limit * 3 });
      } catch (err) {
        this._stats.rejected++;
        console.error(`[HybridSearch] embedding search failed: ${err.message}`);
      }
      for (const hit of hits || []) {
        const payload = hit.payload || {};
        if (namespace && payload.namespace !== namespace) continue; // privacy boundary''',
'''  async search({ query, namespace, limit = 10 }) {
    if (!query || typeof query !== 'string') {
      return { status: 'ok', results: [], total: 0, stats: this.getStats(), error: 'query required' };
    }
    if (!namespace || typeof namespace !== 'string') {
      // Fail closed: a search with no namespace must never run unfiltered.
      return { status: 'ok', results: [], total: 0, stats: this.getStats(), error: 'namespace required (privacy boundary)' };
    }

    const results = [];

    // ─── Semantic leg ─────────────────────────────────────────────
    if (this._embedding) {
      let hits = [];
      try {
        hits = await this._embedding.search(query, { limit: limit * 3, namespace });
      } catch (err) {
        this._stats.rejected++;
        console.error(`[HybridSearch] embedding search failed: ${err.message}`);
      }
      for (const hit of hits || []) {
        const payload = hit.payload || {};
        if (payload.namespace !== namespace) continue; // privacy boundary (defense in depth)'''),
])

print("ALL VECTOR EDITS OK")
