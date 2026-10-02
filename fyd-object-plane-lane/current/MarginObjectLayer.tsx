"use client";

/**
 * MarginObjectLayer: the PING object plane beside the document plane.
 * (Nolan, 2026-09-22: "Margins Are the Object Layer".)
 *
 * DOCUMENT PLANE + OBJECT PLANE. Objects are never inserted into the
 * document; they live in fixed-position margin rails (an overlay layer),
 * so publisher content geometry is invariant to the layer's presence.
 *
 * - Anchoring: each object tracks a document anchor
 *   ([data-object-anchor="<key>"]); candidate Y = anchor midpoint.
 * - Placement: deterministic placeObjects() (see ./placement): clamp to
 *   viewport, resolve collisions with minimum vertical spacing, merge
 *   overflow into "+N" clusters. Stable input -> stable placement.
 * - Expansion: fixed overlay card in the margin layer. Never reflows.
 * - One-expanded: shared claim registry (./expansion) across circles,
 *   cluster popovers, and the mobile sheet.
 *
 * Responsive policy (functional, not polish):
 * - wide desktop (>=1400px): two object rails (left + right)
 * - normal desktop (1024-1399): one preferred rail + overflow clustering
 * - tablet (768-1023): compact edge rail
 * - mobile (<768): edge tab -> bottom sheet (no desktop margin emulation)
 *
 * Generic: descriptors only. Zero customer-specific code.
 */

import * as React from "react";
import { placeObjects, type AnchorInput, type Placed, type Rail } from "./placement";
import { ClusterSlot, EXPANDED_D, MarginObject, REST_D } from "./ObjectCircle";
import { MobileSheet } from "./MobileSheet";
import { claimExpanded } from "./expansion";
import type { MarginObjectDescriptor } from "./types";

export type { MarginObjectDescriptor };

const WIDE_MIN = 1400;
const DESKTOP_MIN = 1024;
const TABLET_MIN = 768;

type Projection = "dual" | "single" | "edge" | "mobile";

function projectionForWidth(w: number): Projection {
  if (w >= WIDE_MIN) return "dual";
  if (w >= DESKTOP_MIN) return "single";
  if (w >= TABLET_MIN) return "edge";
  return "mobile";
}

/** Compact rest diameter for the tablet edge rail. */
const EDGE_REST_D = 48;
/** Viewport-edge offset of the rail per projection. */
const RAIL_OFFSET: Record<Exclude<Projection, "mobile">, number> = {
  dual: 24,
  single: 12,
  edge: 8,
};

interface Geometry {
  vw: number;
  vh: number;
  scrollY: number;
  docH: number;
  anchors: Record<string, number | null>;
}

/**
 * Measures viewport, scroll, and anchor midpoints. Re-runs on scroll
 * (rAF-throttled), resize, font load, and once shortly after mount for
 * late layout shifts. Returns null until the first client measurement
 * (SSR renders the empty shell).
 */
function useGeometry(anchorKeys: string[]): Geometry | null {
  const keysKey = anchorKeys.join("|");
  const [geom, setGeom] = React.useState<Geometry | null>(null);

  React.useEffect(() => {
    let raf = 0;
    let disposed = false;
    const keys = keysKey.split("|").filter(Boolean);
    const measure = () => {
      if (disposed) return;
      const scrollY = window.scrollY;
      const anchors: Record<string, number | null> = {};
      for (const k of keys) {
        const el = document.querySelector(`[data-object-anchor="${CSS.escape(k)}"]`);
        if (!el) {
          anchors[k] = null;
          continue;
        }
        const r = el.getBoundingClientRect();
        anchors[k] = r.top + scrollY + r.height / 2;
      }
      setGeom({
        vw: window.innerWidth,
        vh: window.innerHeight,
        scrollY,
        docH: document.documentElement.scrollHeight,
        anchors,
      });
    };
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("scroll", schedule, { passive: true });
    const t = window.setTimeout(measure, 800);
    const fonts = (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts;
    if (fonts?.ready) {
      fonts.ready.then(() => measure()).catch(() => {});
    }
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule);
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keysKey]);

  return geom;
}

export function MarginObjectLayer({ objects }: { objects: MarginObjectDescriptor[] }) {
  const idsKey = objects.map((o) => o.objectId).join("|");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const anchorKeys = React.useMemo(() => objects.map((o) => o.anchorKey), [idsKey]);
  const geom = useGeometry(anchorKeys);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const projection: Projection | null = geom ? projectionForWidth(geom.vw) : null;

  const placed = React.useMemo<Placed[]>(() => {
    if (!geom || !projection || projection === "mobile") return [];
    const inputs: AnchorInput[] = objects.map((o) => ({
      objectId: o.objectId,
      anchorMidY: geom.anchors[o.anchorKey] ?? null,
      priority: o.priority,
    }));
    const restD = projection === "edge" ? EDGE_REST_D : REST_D;
    const rails: Rail[] = projection === "dual" ? ["right", "left"] : ["right"];
    return placeObjects(
      inputs,
      {
        viewportWidth: geom.vw,
        viewportHeight: geom.vh,
        scrollY: geom.scrollY,
        documentHeight: geom.docH,
      },
      {
        restDiameter: restD,
        minSpacing: restD + 16,
        edgePadding: 12,
        clusterWindow: 72,
        rails,
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geom, projection, idsKey]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const byId = React.useMemo(() => new Map(objects.map((o) => [o.objectId, o])), [idsKey]);

  /** Viewport-clamped fixed position for the 216px expanded card. */
  const cardStyleFor = React.useCallback(
    (cx: number, cy: number): React.CSSProperties => {
      if (!geom) return {};
      const half = EXPANDED_D / 2 + 8;
      const x = Math.min(Math.max(cx, half), Math.max(half, geom.vw - half));
      const y = Math.min(Math.max(cy, half), Math.max(half, geom.vh - half));
      return { left: x - EXPANDED_D / 2, top: y - EXPANDED_D / 2 };
    },
    [geom],
  );

  if (!geom || !projection) {
    // SSR / pre-measure shell: fixed overlay, zero document impact.
    return (
      <div
        data-testid="object-layer"
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-50"
      />
    );
  }

  if (projection === "mobile") {
    return (
      <div
        data-testid="object-layer"
        data-projection="mobile"
        className="pointer-events-none fixed inset-0 z-50"
        style={{ overflowX: "clip" }}
      >
        {!sheetOpen && (
          <button
            type="button"
            data-testid="mobile-object-tab"
            onClick={() => {
              claimExpanded("sheet");
              setSheetOpen(true);
            }}
            aria-label={`${objects.length} PING objects on this page. Open object list.`}
            className="pointer-events-auto fixed right-0 top-1/2 flex min-h-[56px] w-[44px] flex-col items-center justify-center gap-1 rounded-l-xl text-white"
            style={{
              transform: "translateY(-50%)",
              background: "rgba(20,16,10,0.92)",
              boxShadow: "0 0 0 1px rgba(232,180,90,0.55)",
            }}
          >
            <span aria-hidden="true" className="flex flex-col gap-1">
              {objects.slice(0, 3).map((o) => (
                <span
                  key={o.objectId}
                  className="block h-2 w-2 rounded-full"
                  style={{ background: "#f3c96b" }}
                />
              ))}
            </span>
            <span className="text-[10px] font-bold">{objects.length}</span>
          </button>
        )}
        {sheetOpen && <MobileSheet objects={objects} onClose={() => setSheetOpen(false)} />}
      </div>
    );
  }

  const restD = projection === "edge" ? EDGE_REST_D : REST_D;
  const offset = RAIL_OFFSET[projection];
  const slotX = (rail: Rail) => (rail === "right" ? geom.vw - offset - restD : offset);

  return (
    <div
      data-testid="object-layer"
      data-projection={projection}
      className="pointer-events-none fixed inset-0 z-50"
      style={{ overflowX: "clip" }}
    >
      {placed.map((p) => {
        const x = slotX(p.rail);
        const cx = x + restD / 2;
        const slotStyle: React.CSSProperties = {
          left: x,
          top: p.y - restD / 2,
          width: restD,
          height: restD,
        };
        const cardStyle = cardStyleFor(cx, p.y);
        if (p.kind === "single") {
          const d = byId.get(p.objectId);
          if (!d) return null;
          return (
            <MarginObject
              key={p.objectId}
              descriptor={d}
              slotStyle={slotStyle}
              cardStyle={cardStyle}
              restD={restD}
            />
          );
        }
        const members = p.objectIds
          .map((id) => byId.get(id))
          .filter((m): m is MarginObjectDescriptor => !!m);
        if (members.length === 0) return null;
        // Cluster popover sits below the slot, clamped to the viewport.
        const popW = 240;
        const popLeft = Math.min(
          Math.max(cx - popW / 2, 8),
          Math.max(8, geom.vw - popW - 8),
        );
        const estPopH = members.length * 56 + 16;
        let popTop = p.y + restD / 2 + 8;
        if (popTop + estPopH > geom.vh - 8) {
          popTop = Math.max(8, p.y - restD / 2 - 8 - estPopH);
        }
        return (
          <ClusterSlot
            key={p.clusterId}
            clusterId={p.clusterId}
            members={members}
            slotStyle={slotStyle}
            popoverStyle={{ left: popLeft, top: popTop, width: popW }}
            cardStyleFor={() => cardStyle}
            restD={restD}
          />
        );
      })}
    </div>
  );
}
