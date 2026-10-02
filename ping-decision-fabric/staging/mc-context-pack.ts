/**
 * Mission Control dispatch ContextPack (decision-fabric lane, 2026-09-28).
 *
 * Wires the EXISTING compileAskContext() evidence compiler into
 * POST /api/mc/dispatch, replacing the params-only context.json mint with
 * an evidence-bound ContextPack.
 *
 * The composition is:
 *   1. Read the live tenant graph + journal evidence through the existing
 *      getFydTenantGraph() seam (digest-verified, fail-closed).
 *   2. Compile with the real compileAskContext() signature. The dispatch
 *      executor is an agent with no owner delegation, so it resolves to
 *      the visitor tier: the packet carries public claims only.
 *   3. Preserve 'mc-ctx-<missionId>' as context_pack_id and the old params
 *      envelope as packet metadata (under `dispatch`).
 *
 * No new store, truth layer, authority, schema, or control plane. The only
 * compiler call site in the dispatch path is buildDispatchContextPacket().
 */

import {
  compileAskContext,
  type CompilerViewer,
  type ContextPacket,
} from '../../../../fyd/ask/context-compiler';
import {
  getFydTenantGraph,
  type FydOverlayReader,
} from '../../../../fyd/data/fyd-tenant-graph';

export interface DispatchContextParams {
  /** FYD tenant id; the dispatch route guarantees this is a SLICE_TENANTS member. */
  tenant: string;
  /** The mission prompt; the compiler's relevance question. Same tenant artifact scope as prompt.txt. */
  question: string;
  /** Stable dispatch id ('mc-ctx-<missionId>'); kept as context_pack_id. */
  contextPackId: string;
  /** The old params envelope; preserved verbatim as packet metadata. */
  dispatch: Record<string, unknown>;
  /** Test seam: injected journal overlay reader. The live reader is used when absent. */
  reader?: FydOverlayReader;
}

export interface DispatchContextPacket extends ContextPacket {
  context_pack_id: string;
  dispatch: Record<string, unknown>;
}

/**
 * The executor is an agent with no owner delegation: the compiler resolves
 * this viewer to the visitor tier, so the packet carries public claims only.
 */
const DISPATCH_VIEWER: CompilerViewer = {
  id: null,
  tier: 'agent',
  grants: [],
  delegatedTier: 'visitor',
};

export async function buildDispatchContextPacket(
  params: DispatchContextParams,
): Promise<DispatchContextPacket> {
  // Fail-closed: getFydTenantGraph throws on unknown tenant, base digest
  // mismatch, malformed overlay, or reader failure. The caller must catch;
  // a dispatch ContextPack is NEVER produced without the graph read.
  const { graph, meta } = await getFydTenantGraph(
    params.tenant,
    params.reader ? { reader: params.reader } : undefined,
  );
  const packet = compileAskContext({
    question: params.question,
    viewer: DISPATCH_VIEWER,
    siteId: params.tenant,
    objectId: null,
    graph: { objects: graph.objects, relationships: graph.relationships },
    graphDigest: meta.graphDigest,
  });
  return {
    ...packet,
    context_pack_id: params.contextPackId,
    dispatch: params.dispatch,
  };
}
