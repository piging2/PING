/** TEST DOUBLE for @/fyd/object/owner-overlay (not yet landed on the a0f3724 line). */
import type { ObjectGraph } from "@/fyd/sitespec/types";
export interface OwnerFieldCorrection { [k: string]: unknown }
export interface OrphanedCorrection { [k: string]: unknown }
export interface OwnerOverlayResult {
  graph: ObjectGraph;
  applied: OwnerFieldCorrection[];
  orphaned: OrphanedCorrection[];
}
export function ownerCorrectionForObject(_objectId: string, _siteId: string): unknown { return null; }
export function applyOwnerFieldCorrections(graph: ObjectGraph, _siteId: string): OwnerOverlayResult {
  return { graph, applied: [], orphaned: [] };
}
export function applyOwnerPresentationOverrides(graph: ObjectGraph, _siteId: string): { graph: ObjectGraph } {
  return { graph };
}
