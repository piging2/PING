"""H69 edit script: wire ContextCompiler fail-soft knowledge read.

Runs on the Pig against /home/nolan/worktrees/ping-harvest-12h.
Applies two exact-match edits to ping-runtime/context/context_compiler.js.
"""
import io
import sys

P = "/home/nolan/worktrees/ping-harvest-12h/ping-runtime/context/context_compiler.js"
src = io.open(P, encoding="utf-8").read()

# --- Edit 1: constants ---
old1 = "const MAX_CONTEXT_EVENTS = 100;\n"
new1 = (
    "const MAX_CONTEXT_EVENTS = 100;\n"
    "\n"
    "// H69: knowledge read bounds. Fail-soft: an absent, failed, or empty\n"
    "// graph read leaves the pack byte-identical.\n"
    "const KNOWLEDGE_MAX_APPROVED = 25;\n"
    "const KNOWLEDGE_MAX_CANDIDATES = 50;\n"
    "const KNOWLEDGE_CANDIDATE_CONFIDENCE_THRESHOLD = 0.8;\n"
    "const KNOWLEDGE_MAX_REFS = 25;\n"
)
assert src.count(old1) == 1, "edit1 anchor count: %d" % src.count(old1)
src = src.replace(old1, new1)

# --- Edit 2: inject knowledge section after pack ID generation (ID untouched) ---
old2 = """    return {
      context_pack_id: contextPackId,
      mission_id: missionId,
      query,
      namespace,
      canonical_object_refs: canonicalObjectRefs,
      artifact_refs: artifactRefs,
      evidence_refs: evidenceRefs,
      relationship_refs: relationshipRefs,
      source_metadata: sourceMetadata,
      retrieval_manifest: retrievalManifest,
      compiled_at: constitutionalTimeAuthority.nowAsISOString(),
    };
  }
"""
new2 = """    // H69: knowledge read runs AFTER pack ID generation so the pack ID is
    // unaffected. The section is injected only when the graph yields nodes
    // (fail-soft: absent/failed/empty graph => byte-identical pack).
    const knowledgeRefs = await this._retrieveKnowledgeRefs(namespace);

    const pack = {
      context_pack_id: contextPackId,
      mission_id: missionId,
      query,
      namespace,
      canonical_object_refs: canonicalObjectRefs,
      artifact_refs: artifactRefs,
      evidence_refs: evidenceRefs,
      relationship_refs: relationshipRefs,
      source_metadata: sourceMetadata,
      retrieval_manifest: retrievalManifest,
      compiled_at: constitutionalTimeAuthority.nowAsISOString(),
    };
    if (knowledgeRefs.length > 0) {
      pack.knowledge_refs = knowledgeRefs;
    }
    return pack;
  }

  /**
   * H69: close the write->read->act loop. Reads approved nodes plus
   * high-confidence candidates from the KnowledgeGraph for this namespace
   * and projects them as deterministic knowledge refs. NEVER throws; any
   * failure returns [] so compile() is unaffected (fail-soft).
   */
  async _retrieveKnowledgeRefs(namespace) {
    const graph = this._knowledgeGraph;
    if (!graph || typeof graph.queryNodes !== 'function') {
      return [];
    }
    try {
      const [approved, candidates] = await Promise.all([
        graph.queryNodes({ namespace, status: 'approved', limit: KNOWLEDGE_MAX_APPROVED }),
        graph.queryNodes({ namespace, status: 'candidate', limit: KNOWLEDGE_MAX_CANDIDATES }),
      ]);
      const seen = new Set();
      const refs = [];
      const take = (row) => {
        if (!row || typeof row !== 'object' || !row.node_id || seen.has(row.node_id)) {
          return;
        }
        seen.add(row.node_id);
        refs.push({
          node_id: row.node_id,
          node_type: row.node_type ?? null,
          label: row.label ?? null,
          status: row.status ?? null,
          confidence: typeof row.confidence === 'number' ? row.confidence : null,
          source_event_id: row.source_event_id ?? null,
          entity_type: row.entity_type ?? null,
          entity_id: row.entity_id ?? null,
        });
      };
      for (const row of approved || []) take(row);
      for (const row of candidates || []) {
        // NULL/unset confidence does not meet the high-confidence bar
        // (confidence is NULL-preserving per the graph contract).
        const confidence = typeof row.confidence === 'number' ? row.confidence : 0;
        if (confidence >= KNOWLEDGE_CANDIDATE_CONFIDENCE_THRESHOLD) take(row);
      }
      // Deterministic order: the DB returns created_at DESC where ties are possible.
      refs.sort((left, right) => (left.node_id < right.node_id ? -1 : left.node_id > right.node_id ? 1 : 0));
      return refs.slice(0, KNOWLEDGE_MAX_REFS);
    } catch (_error) {
      return [];
    }
  }
"""
assert src.count(old2) == 1, "edit2 anchor count: %d" % src.count(old2)
src = src.replace(old2, new2)

io.open(P, "w", encoding="utf-8").write(src)
print("H69 edits applied OK")
