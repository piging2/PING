#!/bin/bash
# Lane M edge-placement implementation: fit-gated dual margins + in-flow mobile.
set -e
cd /home/nolan/projects/ping

python3 << 'PYEOF'
import sys

def replace_once(path, old, new, label):
    src = open(path).read()
    n = src.count(old)
    if n != 1:
        print(f"FATAL: {label}: found {n} occurrences (expected 1)")
        sys.exit(1)
    open(path, "w").write(src.replace(old, new, 1))
    print(f"ok: {label}")

# ---------- 1. placement.ts: add distributeBalanced ----------
anchor = """/**
 * Viewport-edge flip-inward for expanded cards (Nolan, 2026-09-22 FYD
 * grill: the expanded card must never grow past the viewport edge)."""
helper = """/**
 * Balanced rail assignment for the dual-margin directive (Nolan,
 * 2026-09-25 edge-placement directive: ONE edge object in the extreme
 * LEFT margin, ONE in the extreme RIGHT margin, flanking center
 * content).
 *
 * The plain `placeObjects` preference pass fills the preferred rail
 * first, which leaves the second rail empty. This helper instead
 * assigns inputs round-robin across the given rails, so both margins
 * flank the content. It uses the exact same ordering `placeObjects`
 * uses internally (priority, anchor Y, objectId), so the
 * highest-priority objects take the preferred rail first,
 * deterministically. The caller then runs `placeObjects` once per
 * rail with `rails: [thatRail]`; per-rail collision resolution,
 * clustering, and the never-overlap invariant are unchanged.
 *
 * Pure module: no React, no DOM. Stable input produces stable output.
 */
export function distributeBalanced(
  inputs: AnchorInput[],
  rails: Rail[],
  documentHeight: number,
): Map<Rail, AnchorInput[]> {
  const anchorY = (i: AnchorInput): number => i.anchorMidY ?? documentHeight;
  const sorted = [...inputs].sort(
    (a, b) =>
      a.priority - b.priority ||
      anchorY(a) - anchorY(b) ||
      (a.objectId < b.objectId ? -1 : a.objectId > b.objectId ? 1 : 0),
  );
  const out = new Map<Rail, AnchorInput[]>();
  for (const r of rails) out.set(r, []);
  sorted.forEach((input, i) => {
    const rail = rails[i % rails.length];
    out.get(rail)!.push(input);
  });
  return out;
}

"""
replace_once(
    "src/fyd/ui/object-layer/placement.ts",
    anchor, helper + anchor,
    "placement.ts distributeBalanced",
)

# ---------- 2. MarginObjectLayer.tsx ----------
L = "src/fyd/ui/object-layer/MarginObjectLayer.tsx"

# 2a. imports: add distributeBalanced, drop MobileSheet
replace_once(
    L,
    """import {
  flipCardX,
  placeObjects,
  type AnchorInput,
  type Placed,
  type Rail,
} from "./placement";""",
    """import {
  distributeBalanced,
  flipCardX,
  placeObjects,
  type AnchorInput,
  type Placed,
  type Rail,
} from "./placement";""",
    "imports distributeBalanced",
)
replace_once(
    L,
    'import { MobileSheet } from "./MobileSheet";\n',
    "",
    "drop MobileSheet import",
)

# 2b. DocumentLayout: content-column bounds
replace_once(
    L,
    """interface DocumentLayout {
  vw: number;
  docH: number;
  anchors: Record<string, number | null>;
}""",
    """interface DocumentLayout {
  vw: number;
  docH: number;
  anchors: Record<string, number | null>;
  /**
   * Content-column bounds (viewport-relative X, whole px): the union of
   * [data-fyd-section] rects, falling back to the anchor elements.
   * Infinity/-Infinity when nothing measurable is present.
   */
  contentLeft: number;
  contentRight: number;
}""",
    "DocumentLayout bounds",
)

# 2c. measure(): track content bounds
replace_once(
    L,
    """      const scrollY = window.scrollY;
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
      }""",
    """      const scrollY = window.scrollY;
      const anchors: Record<string, number | null> = {};
      // Content-column bounds (viewport-relative X): the union of the
      // section rects, so the free margins are honest. Anchors seed the
      // bounds; the full [data-fyd-section] set overrides when present
      // (anchors only cover sections that have margin objects).
      let contentLeft = Infinity;
      let contentRight = -Infinity;
      const noteBounds = (el: Element) => {
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return;
        if (r.left < contentLeft) contentLeft = r.left;
        if (r.right > contentRight) contentRight = r.right;
      };
      for (const k of keys) {
        const el = document.querySelector(`[data-object-anchor="${CSS.escape(k)}"]`);
        if (!el) {
          anchors[k] = null;
          continue;
        }
        const r = el.getBoundingClientRect();
        // Document-space midpoint: scroll-invariant.
        anchors[k] = r.top + scrollY + r.height / 2;
        noteBounds(el);
      }
      const sectionEls = document.querySelectorAll("[data-fyd-section]");
      if (sectionEls.length > 0) {
        contentLeft = Infinity;
        contentRight = -Infinity;
        sectionEls.forEach(noteBounds);
      }
      const vw = window.innerWidth;
      const docH = document.documentElement.scrollHeight;
      const cL = Math.round(contentLeft);
      const cR = Math.round(contentRight);
      const sig = `${vw}|${docH}|${cL}|${cR}|${keys.map((k) => anchors[k]).join(",")}`;
      if (sig !== lastSig) {
        lastSig = sig;
        setLayout({ vw, docH, anchors, contentLeft: cL, contentRight: cR });
      }""",
    "measure content bounds",
)

# 2d. projection block -> fit-gated rails
replace_once(
    L,
    """type Projection = "dual" | "single" | "edge" | "mobile";

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
};""",
    """/** Compact rest diameter for the tablet edge rail. */
const EDGE_REST_D = 40;

/**
 * Document-edge offset of the rail per width band (preserves the
 * 2026-09-24 wide-desktop geometry: 24px at >=1400, 12px at
 * 1024-1399, 8px on the tablet edge).
 */
function railOffsetForWidth(vw: number): number {
  if (vw >= WIDE_MIN) return 24;
  if (vw >= DESKTOP_MIN) return 12;
  return 8;
}

/**
 * Fit-gated rail selection (Nolan 2026-09-25 edge-placement directive).
 * A rail is used only when the measured free margin actually fits the
 * glyph: margins are never faked, and the layer never overlaps center
 * content. Desktop (>=1024) uses both rails when both fit (the caller
 * round-robins placements across them so the margins flank the
 * content); tablet (768-1023) keeps the compact right edge rail when
 * it fits; mobile (<768) uses no overlay rail at all: objects render
 * in-flow as cards/sections via the renderer composition, never
 * hidden, never overlaid. When the content column is unmeasurable,
 * falls back to the legacy rail assignment.
 */
function railsForWidth(
  vw: number,
  leftFree: number,
  rightFree: number,
  measurable: boolean,
): Rail[] {
  if (vw < TABLET_MIN) return [];
  if (!measurable) {
    if (vw >= WIDE_MIN) return ["right", "left"];
    return ["right"];
  }
  const restD = vw >= DESKTOP_MIN ? REST_D : EDGE_REST_D;
  const need = railOffsetForWidth(vw) + restD;
  if (vw >= DESKTOP_MIN) {
    const rails: Rail[] = [];
    if (rightFree >= need) rails.push("right");
    if (leftFree >= need) rails.push("left");
    return rails;
  }
  return rightFree >= need ? ["right"] : [];
}

/** Truthful data-projection label for the layer plane. */
function projectionLabel(vw: number, rails: Rail[]): string {
  if (vw < TABLET_MIN) return "mobile";
  if (rails.length === 2) return "dual";
  if (rails.length === 1) return vw < DESKTOP_MIN ? "edge" : "single";
  return "none";
}""",
    "fit-gated rails",
)

# 2e. component state: rails memo replaces projection
replace_once(
    L,
    """  const { layout, layerRef } = useDocumentLayout(anchorKeys);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [mobileSelectedId, setMobileSelectedId] = React.useState<string | null>(null);

  const projection: Projection | null = layout ? projectionForWidth(layout.vw) : null;
  const projectionRef = React.useRef(projection);
  projectionRef.current = projection;""",
    """  const { layout, layerRef } = useDocumentLayout(anchorKeys);

  // Fit-gated rails (see railsForWidth): the actual placement rails,
  // derived from the measured content-column margins. The label is the
  // responsive band for the data-projection test hook.
  const rails: Rail[] = React.useMemo(() => {
    if (!layout) return [];
    const measurable =
      Number.isFinite(layout.contentLeft) &&
      Number.isFinite(layout.contentRight) &&
      layout.contentRight > layout.contentLeft;
    const leftFree = measurable ? layout.contentLeft : Infinity;
    const rightFree = measurable ? layout.vw - layout.contentRight : Infinity;
    return railsForWidth(layout.vw, leftFree, rightFree, measurable);
  }, [layout]);
  const projection: string | null = layout ? projectionLabel(layout.vw, rails) : null;
  const projectionRef = React.useRef(projection);
  projectionRef.current = projection;""",
    "rails memo",
)

# 2f. placed memo: round-robin dual
replace_once(
    L,
    """  const placed = React.useMemo<Placed[]>(() => {
    if (!layout || !projection || projection === "mobile") return [];
    const inputs: AnchorInput[] = spreadSharedAnchors(
      objects.map((o) => ({
        objectId: o.objectId,
        anchorKey: o.anchorKey,
        anchorMidY: layout.anchors[o.anchorKey] ?? null,
        priority: o.priority,
      })),
    ).map((sd) => ({
      objectId: sd.objectId,
      anchorMidY: sd.spreadY,
      priority: sd.priority,
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
  }, [layout, projection, idsKey]);""",
    """  const placed = React.useMemo<Placed[]>(() => {
    if (!layout || rails.length === 0) return [];
    const inputs: AnchorInput[] = spreadSharedAnchors(
      objects.map((o) => ({
        objectId: o.objectId,
        anchorKey: o.anchorKey,
        anchorMidY: layout.anchors[o.anchorKey] ?? null,
        priority: o.priority,
      })),
    ).map((sd) => ({
      objectId: sd.objectId,
      anchorMidY: sd.spreadY,
      priority: sd.priority,
    }));
    const restD = layout.vw >= DESKTOP_MIN ? REST_D : EDGE_REST_D;
    const vp = { viewportWidth: layout.vw, documentHeight: layout.docH };
    const baseOpts = {
      restDiameter: restD,
      minSpacing: restD + 16,
      edgePadding: 12,
      clusterWindow: 72,
    };
    if (rails.length === 2) {
      // Dual-margin directive: round-robin across rails so the left and
      // right margins both flank the content, instead of filling the
      // preferred rail and leaving the other empty. Per-rail placement
      // keeps collision resolution, clustering, and the never-overlap
      // invariant.
      const parts = distributeBalanced(inputs, rails, layout.docH);
      return rails.flatMap((rail) =>
        placeObjects(parts.get(rail) ?? [], vp, { ...baseOpts, rails: [rail] }),
      );
    }
    return placeObjects(inputs, vp, { ...baseOpts, rails });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, rails, idsKey]);""",
    "placed round-robin",
)

# 2g. early return: cover mobile + no-fit
replace_once(
    L,
    """  if (!layout || !projection) {
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
  }""",
    """  if (!layout || !projection || rails.length === 0) {
    // SSR / pre-measure shell, the mobile band, and any band whose
    // margins are too narrow to fit a glyph: absolute empty layer. Zero
    // document impact: absolute elements are out of flow, so center
    // geometry cannot change. On mobile the objects render in-flow as
    // cards/sections via the renderer composition; the layer adds no
    // overlay chrome (Nolan 2026-09-25 edge-placement directive:
    // in-flow cards, never hidden, never overlaid).
    return (
      <div
        data-testid="object-layer"
        data-projection={projection ?? undefined}
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
  }""",
    "early return",
)

# 2h. remove the mobile pill branch (from its if to the restD line)
src = open(L).read()
start = src.find('  if (projection === "mobile") {')
endmark = '  const restD = projection === "edge" ? EDGE_REST_D : REST_D;'
end = src.find(endmark)
if start == -1 or end == -1 or end < start:
    print("FATAL: mobile branch markers not found")
    sys.exit(1)
open(L, "w").write(src[:start] + src[end:])
print("ok: remove mobile branch")

# 2i. render: restD/offset from width band
replace_once(
    L,
    """  const restD = projection === "edge" ? EDGE_REST_D : REST_D;
  const offset = RAIL_OFFSET[projection];
  const slotX = (rail: Rail) => (rail === "right" ? layout.vw - offset - restD : offset);""",
    """  const restD = layout.vw >= DESKTOP_MIN ? REST_D : EDGE_REST_D;
  const offset = railOffsetForWidth(layout.vw);
  const slotX = (rail: Rail) => (rail === "right" ? layout.vw - offset - restD : offset);""",
    "render restD/offset",
)

print("ALL EDITS APPLIED")
PYEOF
echo "exit: $?"