"use client";

/**
 * MarginObjectLayer: ONE page-level document-anchored object plane.
 * (Nolan, 2026-09-22: "Margins Are the Object Layer"; objects are
 * document/section-anchored, never viewport-sticky.)
 *
 * DOCUMENT PLANE + OBJECT PLANE. Objects are never inserted into the
 * document; they live in ONE document-anchored plane rendered via
 * createPortal into document.body: an absolutely positioned div with
 * height = document height. Slots sit at position:absolute at their
 * document-space Y, so objects scroll WITH the page. Publisher content
 * geometry is invariant to the layer's presence: absolute elements are
 * out of flow and the layer adds no height of its own.
 *
 * - Anchoring: each object tracks a document anchor
 *   ([data-object-anchor="<key>"]); candidate Y = the anchor midpoint
 *   in DOCUMENT space (rect.top + scrollY + rect.height/2).
 * - Placement: deterministic placeObjects() (see ./placement), all in
 *   document space: clamp to document bounds, resolve collisions with
 *   minimum vertical spacing, merge overflow into clusters (each cluster
 *   renders its members as a staggered constellation of mini-circles).
 * - Expansion: absolutely positioned peek (200x300 vertical oval) and rich (300x460 vertical oval)
 *   cards anchored to their object in document space. They move WITH
 *   the page on scroll. Never viewport-clamped.
 * - One-expanded: shared claim registry (./expansion) across circles,
 *   cluster popovers, and the mobile sheet.
 * - Relationship navigation: the layer subscribes to navigate requests
 *   (./expansion): collapse the current card, scroll the target slot
 *   into view when it is offscreen, then open it through the
 *   open-request bus.
 *
 * Measurement (useDocumentLayout): anchor document-Y values, document
 * height, and viewport width. Recomputed ONLY on: initial mount, window
 * resize, document.fonts.ready, window load, one delayed re-measure
 * ~1200ms after mount (late images), and a MutationObserver on
 * document.body (childList + subtree + class/style attributes,
 * rAF-throttled, ignoring mutations inside the layer's own node).
 * NEVER on scroll: document-space anchors are scroll-invariant, and
 * there is no scroll listener anywhere in this path. Responsive
 * breakpoint changes are covered by resize.
 *
 * Responsive policy (functional, not polish):
 * - wide desktop (>=1400px): two object rails (left + right)
 * - normal desktop (1024-1399): one preferred rail + overflow clustering
 * - tablet (768-1023): compact edge rail (40px rest)
 * - mobile (<768): edge tab -> bottom sheet (no desktop margin
 *   emulation; the existing fixed mobile behavior is kept exactly)
 *
 * SSR / pre-measure shell: an absolute empty layer. Zero layout impact:
 * absolute elements are out of flow, so center geometry cannot change.
 *
 * Generic: descriptors only. Zero customer-specific code.
 */

import * as React from "react";
import { createPortal } from "react-dom";
import { placeObjects, type AnchorInput, type Placed, type Rail } from "./placement";
import {
  ClusterSlot,
  MarginObject,
  PEEK_H_EST,
  PEEK_W,
  REST_D,
  RICH_H,
  RICH_W,
} from "./ObjectCircle";
import { MobileSheet } from "./MobileSheet";
import { claimExpanded, requestObjectOpen, subscribeNavigateRequest } from "./expansion";
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
const EDGE_REST_D = 40;
/** Document-edge offset of the rail per projection. */
const RAIL_OFFSET: Record<Exclude<Projection, "mobile">, number> = {
  dual: 24,
  single: 12,
  edge: 8,
};

interface DocumentLayout {
  vw: number;
  docH: number;
  anchors: Record<string, number | null>;
}

/**
 * Measures anchor document-Y values, document height, and viewport
 * width. Re-runs on resize, font load, window load, once ~1200ms after
 * mount (late images), and on body DOM mutations (rAF-throttled,
 * ignoring the layer's own node). NOT on scroll. Returns null until the
 * first client measurement (SSR renders the empty shell).
 */
function useDocumentLayout(anchorKeys: string[]): {
  layout: DocumentLayout | null;
  layerRef: React.RefObject<HTMLDivElement>;
} {
  const keysKey = anchorKeys.join("|");
  const layerRef = React.useRef<HTMLDivElement>(null);
  const [layout, setLayout] = React.useState<DocumentLayout | null>(null);

  React.useEffect(() => {
    let disposed = false;
    let raf = 0;
    // Signature of the last published measurement: identical layouts
    // never re-render (mutation storms from page animations coalesce).
    let lastSig = "";
    const keys = keysKey.split("|").filter(Boolean);
    const measure = () => {
      if (disposed) return;
      raf = 0;
      const scrollY = window.scrollY;
      const anchors: Record<string, number | null> = {};
      for (const k of keys) {
        const el = document.querySelector(`[data-object-anchor="${CSS.escape(k)}"]`);
        if (!el) {
          anchors[k] = null;
          continue;
        }
        const r = el.getBoundingClientRect();
        // Document-space midpoint: scroll-invariant.
        anchors[k] = r.top + scrollY + r.height / 2;
      }
      const vw = window.innerWidth;
      const docH = document.documentElement.scrollHeight;
      const sig = `${vw}|${docH}|${keys.map((k) => anchors[k]).join(",")}`;
      if (sig !== lastSig) {
        lastSig = sig;
        setLayout({ vw, docH, anchors });
      }
    };
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("load", schedule);
    const t = window.setTimeout(measure, 1200);
    const fonts = (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts;
    if (fonts?.ready) {
      fonts.ready.then(() => measure()).catch(() => {});
    }
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        const node = m.target as Node;
        // Ignore the layer's own subtree: its renders must not
        // re-trigger measurement.
        if (layerRef.current && (node === layerRef.current || layerRef.current.contains(node))) {
          continue;
        }
        schedule();
        break;
      }
    });
    mo.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("load", schedule);
      window.clearTimeout(t);
      mo.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keysKey]);

  return { layout, layerRef };
}

export function MarginObjectLayer({ objects }: { objects: MarginObjectDescriptor[] }) {
  const idsKey = objects.map((o) => o.objectId).join("|");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const anchorKeys = React.useMemo(() => objects.map((o) => o.anchorKey), [idsKey]);
  const { layout, layerRef } = useDocumentLayout(anchorKeys);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const projection: Projection | null = layout ? projectionForWidth(layout.vw) : null;
  const projectionRef = React.useRef(projection);
  projectionRef.current = projection;

  // Relationship navigation: collapse the current card, scroll the
  // target slot into view when it is offscreen, then open it through
  // the open-request bus (single slot, cluster member, or sheet card).
  // Mobile projection: the sheet owns the card, so select it directly
  // with no claim juggling and no scrolling.
  React.useEffect(
    () =>
      subscribeNavigateRequest((objectId) => {
        if (projectionRef.current === "mobile") {
          requestObjectOpen(objectId);
          return;
        }
        claimExpanded(null);
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const openTarget = () => requestObjectOpen(objectId);
        let el = document.querySelector(`[data-object-id="${CSS.escape(objectId)}"]`);
        if (!el) {
          const clusters = document.querySelectorAll("[data-member-ids]");
          for (const c of clusters) {
            const ids = (c.getAttribute("data-member-ids") || "").split(/\s+/).filter(Boolean);
            if (ids.includes(objectId)) {
              el = c;
              break;
            }
          }
        }
        if (!el) {
          openTarget(); // unknown id: the open bus no-ops downstream
          return;
        }
        const target = el as HTMLElement;
        const r = target.getBoundingClientRect();
        const vh = window.innerHeight;
        if (r.bottom >= 0 && r.top <= vh) {
          openTarget();
          return;
        }
        target.scrollIntoView({
          block: "center",
          behavior: reducedMotion ? "auto" : "smooth",
        });
        window.setTimeout(openTarget, reducedMotion ? 60 : 500);
      }),
    [],
  );

  const placed = React.useMemo<Placed[]>(() => {
    if (!layout || !projection || projection === "mobile") return [];
    const inputs: AnchorInput[] = objects.map((o) => ({
      objectId: o.objectId,
      anchorMidY: layout.anchors[o.anchorKey] ?? null,
      priority: o.priority,
    }));
    const restD = projection === "edge" ? EDGE_REST_D : REST_D;
    const rails: Rail[] = projection === "dual" ? ["right", "left"] : ["right"];
    return placeObjects(
      inputs,
      { viewportWidth: layout.vw, documentHeight: layout.docH },
      {
        restDiameter: restD,
        minSpacing: restD + 16,
        edgePadding: 12,
        clusterWindow: 72,
        rails,
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, projection, idsKey]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const byId = React.useMemo(() => new Map(objects.map((o) => [o.objectId, o])), [idsKey]);

  /**
   * Document-space card position relative to the slot wrapper's origin.
   * The card moves WITH the page on scroll; it is never
   * viewport-clamped. x is anchored to the slot and clamped to the
   * document bounds so the card stays usable under the layer's
   * horizontal clip; y is clamped to the document bounds.
   */
  const placeCard = React.useCallback(
    (
      slotX: number,
      slotTop: number,
      docY: number,
      cardW: number,
      cardH: number,
    ): React.CSSProperties => {
      if (!layout) return {};
      const cardX = Math.min(
        Math.max(slotX, 8),
        Math.max(8, layout.vw - 8 - cardW),
      );
      const cardY = Math.min(
        Math.max(docY - cardH / 2, 12),
        Math.max(12, layout.docH - 12 - cardH),
      );
      return { left: cardX - slotX, top: cardY - slotTop };
    },
    [layout],
  );

  if (!layout || !projection) {
    // SSR / pre-measure shell: absolute empty layer. Zero document
    // impact: absolute elements are out of flow, so center geometry
    // cannot change.
    return (
      <div
        data-testid="object-layer"
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          overflowX: "clip",
          overflowY: "visible",
          pointerEvents: "none",
          zIndex: 50,
        }}
      />
    );
  }

  if (projection === "mobile") {
    // Mobile projection: unchanged fixed edge tab + bottom sheet.
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
  const slotX = (rail: Rail) => (rail === "right" ? layout.vw - offset - restD : offset);

  // ONE page-level document-anchored plane. Absolutely no
  // position:fixed in this path, no scroll listener, no
  // viewport-relative anchor coordinates.
  return createPortal(
    <div
      ref={layerRef}
      data-testid="object-layer"
      data-projection={projection}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: layout.docH,
        overflowX: "clip",
        overflowY: "visible",
        pointerEvents: "none",
        zIndex: 50,
      }}
    >
      {placed.map((p) => {
        const x = slotX(p.rail);
        const slotTop = p.y - restD / 2;
        const slotStyle: React.CSSProperties = {
          left: x,
          top: slotTop,
          width: restD,
          height: restD,
        };
        // Peek card (200x300 vertical oval) and rich card (300x460 vertical
        // oval): same document-space placement math, different card sizes.
        const peekStyle = placeCard(x, slotTop, p.y, PEEK_W, PEEK_H_EST);
        const cardStyle = placeCard(x, slotTop, p.y, RICH_W, RICH_H);
        if (p.kind === "single") {
          const d = byId.get(p.objectId);
          if (!d) return null;
          return (
            <MarginObject
              key={p.objectId}
              descriptor={d}
              slotStyle={slotStyle}
              peekStyle={peekStyle}
              cardStyle={cardStyle}
              restD={restD}
            />
          );
        }
        const members = p.objectIds
          .map((id) => byId.get(id))
          .filter((m): m is MarginObjectDescriptor => !!m);
        if (members.length === 0) return null;
        // Cluster slot: the members render as a staggered constellation
        // of mini-circles (see ./star-layout); tapping a member opens its
        // pinned rich card, document-space clamped like a single slot.
        return (
          <ClusterSlot
            key={p.clusterId}
            clusterId={p.clusterId}
            members={members}
            slotStyle={slotStyle}
            cardStyleFor={() => cardStyle}
            align={p.rail === "left" ? "left" : "right"}
          />
        );
      })}
    </div>,
    document.body,
  );
}
