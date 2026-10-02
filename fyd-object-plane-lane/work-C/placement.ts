/**
 * Deterministic margin-placement algorithm for the PING object layer.
 * (Nolan, 2026-09-22: "Margins Are the Object Layer".)
 *
 * Pure module: no React, no DOM, no AI. Stable input produces stable
 * output. The layer measures anchors in DOCUMENT space and calls
 * placeObjects().
 *
 * DOCUMENT-SPACE SEMANTICS (Nolan, 2026-09-22: objects are
 * document/section-anchored, never viewport-sticky):
 * - AnchorInput.anchorMidY is the document-space Y (px) of the anchor
 *   element's vertical midpoint: rect.top + scrollY + rect.height/2.
 *   Document-space anchors are scroll-invariant, so placement never
 *   needs the scroll position and never re-runs on scroll.
 * - Placed.y is the DOCUMENT-space Y (px) of the slot center. The layer
 *   renders slots at position:absolute inside a document-height plane,
 *   so placed objects scroll WITH the page. No viewport conversion
 *   happens anywhere in this module.
 * - Candidate Y = anchor midpoint, clamped to the document bounds
 *   [edgePadding + restDiameter/2, documentHeight - edgePadding -
 *   restDiameter/2]. NEVER clamped into a viewport.
 * - PlacementViewport keeps viewportWidth for future rail decisions;
 *   all Y math uses only documentHeight.
 *
 * Algorithm:
 *   1. Sort inputs by (priority, anchor Y, objectId). Total order, so
 *      placement is stable under input reordering.
 *   2. Cluster pass: anchors within clusterWindow of the cluster's first
 *      anchor merge into one slot (compact "+N" clustering).
 *   3. For each cluster: candidateY = anchor midpoint clamped to the
 *      document bounds. Try rails in preference order; resolve
 *      collisions by pushing down past occupied slots while keeping
 *      minimum vertical spacing. If pushed past the document bottom,
 *      try the next rail.
 *   4. If no rail has room, merge into the nearest placed slot on the
 *      preferred rail (it becomes/extends a cluster). Objects never
 *      overlap; the worst case is a "+N" cluster, never a pile.
 */

export type Rail = "left" | "right";

export interface AnchorInput {
  objectId: string;
  /**
   * Document-space Y (px) of the anchor element's vertical midpoint,
   * or null when the anchor is missing. Missing anchors sort last and
   * clamp to the document bottom edge: deterministic, and visibly wrong
   * so a missing anchor gets noticed instead of silently misplacing.
   */
  anchorMidY: number | null;
  /** Lower places first; ties break by anchor Y, then objectId. */
  priority: number;
}

export interface PlacementViewport {
  /**
   * Viewport width (px). Kept for future rail decisions; the Y math in
   * this module uses only documentHeight.
   */
  viewportWidth: number;
  /** Full document height (px): the Y placement bounds. */
  documentHeight: number;
}

export interface PlacementOptions {
  /** Resting circle diameter (px). */
  restDiameter: number;
  /** Minimum center-to-center vertical spacing between slots in one rail. */
  minSpacing: number;
  /** Document edge inset (px) the slot center must respect, top and bottom. */
  edgePadding: number;
  /** Anchor-Y proximity (px) that merges objects into one cluster slot. */
  clusterWindow: number;
  /** Rails to use, in preference order. Empty = nothing placed. */
  rails: Rail[];
}

export interface PlacedSingle {
  kind: "single";
  objectId: string;
  rail: Rail;
  /** Document-space Y of the slot center. */
  y: number;
}

export interface PlacedCluster {
  kind: "cluster";
  /** Stable id derived from sorted member ids. */
  clusterId: string;
  objectIds: string[];
  rail: Rail;
  /** Document-space Y of the slot center. */
  y: number;
}

export type Placed = PlacedSingle | PlacedCluster;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function clusterIdFor(ids: string[]): string {
  return "cluster:" + [...ids].sort().join("+");
}

export function placeObjects(
  inputs: AnchorInput[],
  viewport: PlacementViewport,
  options: PlacementOptions,
): Placed[] {
  const { restDiameter, minSpacing, edgePadding, clusterWindow, rails } = options;
  if (rails.length === 0 || inputs.length === 0) return [];

  const docH = Math.max(1, viewport.documentHeight);
  const lo = edgePadding + restDiameter / 2;
  const hi = Math.max(lo, docH - edgePadding - restDiameter / 2);
  const anchorY = (i: AnchorInput): number => i.anchorMidY ?? docH;

  // 1. Total order: priority, then anchor Y, then objectId.
  const sorted = [...inputs].sort(
    (a, b) =>
      a.priority - b.priority ||
      anchorY(a) - anchorY(b) ||
      (a.objectId < b.objectId ? -1 : a.objectId > b.objectId ? 1 : 0),
  );

  // 2. Cluster pass: anchors within clusterWindow of the cluster's first
  //    anchor merge into one slot.
  const clusters: AnchorInput[][] = [];
  for (const input of sorted) {
    const last = clusters[clusters.length - 1];
    if (last && anchorY(input) - anchorY(last[0]) <= clusterWindow) {
      last.push(input);
    } else {
      clusters.push([input]);
    }
  }

  // 3. Place each cluster, all in document space.
  const placed: Placed[] = [];
  const occupied = new Map<Rail, number[]>();
  for (const r of rails) occupied.set(r, []);

  for (const members of clusters) {
    const mean = members.reduce((s, m) => s + anchorY(m), 0) / members.length;
    const startY = clamp(mean, lo, hi);
    let done = false;

    for (const rail of rails) {
      let cy = startY;
      const occ = occupied.get(rail)!; // kept ascending
      for (const oy of occ) {
        if (Math.abs(cy - oy) < minSpacing) cy = oy + minSpacing;
      }
      if (cy <= hi) {
        const idx = occ.findIndex((oy) => oy > cy);
        if (idx === -1) occ.push(cy);
        else occ.splice(idx, 0, cy);
        if (members.length === 1) {
          placed.push({ kind: "single", objectId: members[0].objectId, rail, y: cy });
        } else {
          const ids = members.map((m) => m.objectId);
          placed.push({
            kind: "cluster",
            clusterId: clusterIdFor(ids),
            objectIds: ids,
            rail,
            y: cy,
          });
        }
        done = true;
        break;
      }
    }

    // 4. No rail had room: merge into the nearest placed slot on the
    //    preferred rail. Never overlap; worst case is a "+N" cluster.
    if (!done) {
      const pref = rails[0];
      let best: Placed | null = null;
      let bestD = Infinity;
      for (const p of placed) {
        if (p.rail !== pref) continue;
        const d = Math.abs(p.y - startY);
        if (d < bestD) {
          bestD = d;
          best = p;
        }
      }
      const memberIds = members.map((m) => m.objectId);
      if (best && best.kind === "single") {
        const ids = [...new Set([best.objectId, ...memberIds])].sort();
        placed[placed.indexOf(best)] = {
          kind: "cluster",
          clusterId: clusterIdFor(ids),
          objectIds: ids,
          rail: best.rail,
          y: best.y,
        };
      } else if (best && best.kind === "cluster") {
        const ids = [...new Set([...best.objectIds, ...memberIds])].sort();
        best.objectIds = ids;
        best.clusterId = clusterIdFor(ids);
      } else {
        // Pathological (no placed slots at all): single cluster at startY.
        const ids = [...memberIds].sort();
        const occ = occupied.get(pref)!;
        occ.push(startY);
        occ.sort((a, b) => a - b);
        placed.push({
          kind: "cluster",
          clusterId: clusterIdFor(ids),
          objectIds: ids,
          rail: pref,
          y: startY,
        });
      }
    }
  }

  return placed;
}
