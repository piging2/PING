"""Focused fix: FYD Circle right-edge clipping at 1440px (Nolan, 2026-09-22).

Runs ON THE PIG against /home/nolan/projects/ping (branch fyd/builder-composition).
Three files, exact-string replacements; aborts unless each anchor matches exactly once.

1. MarginObjectLayer.tsx: widen the expanded-card viewport-edge margin (8 -> 24px)
   via an exported pure helper clampCardX, so the full card + shadow + ornate
   border stays inside the viewport, growing inward from the rail.
2. ObjectCircle.tsx (AskModeBody): center the Ask header + about line so the
   true-ellipse top (borderRadius 50% + overflow hidden) cannot clip them;
   pass compact to the ask panel.
3. ask-object-panel.tsx: new `compact` prop keeps the question form stacked
   (no viewport-driven sm:flex-row) inside the ~300px oval; input gets
   min-w-0/w-full for safety.
"""

import sys

REPO = "/home/nolan/projects/ping"


def edit(path, old, new):
    with open(path) as f:
        src = f.read()
    n = src.count(old)
    if n != 1:
        print("FAIL %s: anchor found %d times (expected 1)" % (path, n))
        sys.exit(1)
    with open(path, "w") as f:
        f.write(src.replace(old, new))
    print("OK %s" % path)


# ---------------------------------------------------------------- MarginObjectLayer
p = REPO + "/src/fyd/ui/object-layer/MarginObjectLayer.tsx"

edit(
    p,
    "export function MarginObjectLayer({ objects }: { objects: MarginObjectDescriptor[] }) {",
    """/**
 * Viewport-edge margin for expanded cards (compact object card and Ask
 * mode). The expanded card carries a drop shadow and an ornate gold
 * border; both must stay fully inside the viewport. The horizontal clamp
 * keeps the whole card this far from the viewport edge, so the card never
 * reads as cut off at the edge it grows from.
 */
export const CARD_EDGE_MARGIN = 24;

/**
 * Pure horizontal clamp for an expanded card: given the slot's
 * document-space x and the card width, returns the card's document-space
 * left edge so the full card stays within
 * [CARD_EDGE_MARGIN, viewportW - CARD_EDGE_MARGIN]. Prefers the
 * slot-anchored position, so on the right rail the card grows inward
 * (leftward) from the rail and never pushes past the viewport edge.
 * Exported for regression tests.
 */
export function clampCardX(slotX: number, cardW: number, viewportW: number): number {
  return Math.min(
    Math.max(slotX, CARD_EDGE_MARGIN),
    Math.max(CARD_EDGE_MARGIN, viewportW - CARD_EDGE_MARGIN - cardW),
  );
}

export function MarginObjectLayer({ objects }: { objects: MarginObjectDescriptor[] }) {""",
)

edit(
    p,
    """      const cardX = Math.min(
        Math.max(slotX, 8),
        Math.max(8, layout.vw - 8 - cardW),
      );""",
    """      const cardX = clampCardX(slotX, cardW, layout.vw);""",
)

# ---------------------------------------------------------------- ObjectCircle (AskModeBody)
p = REPO + "/src/fyd/ui/object-layer/ObjectCircle.tsx"

edit(
    p,
    """      <div className="flex items-center gap-2">
        <BackButton light onBack={onBack} label="Back" />""",
    """      {/*
        Oval-safe header: the card is a true ellipse (borderRadius 50%
        with overflow hidden), so the top band is much narrower than the
        300px card width. Centered content stays inside the ellipse;
        left-aligned content here was clipped by the curve (Back button
        text cut off at 1440px).
      */}
      <div className="flex items-center justify-center gap-2">
        <BackButton light onBack={onBack} label="Back" />""",
)

edit(
    p,
    """      <p className="mb-2 mt-1 truncate text-xs text-neutral-500">about {projection.name}</p>""",
    """      <p className="mb-2 mt-1 truncate text-center text-xs text-neutral-500">about {projection.name}</p>""",
)

edit(
    p,
    """        <AskObjectPanel
          siteId={siteId}
          objectId={descriptor.objectId}
          objectName={projection.name}
          sampleQuestions={projection.sampleQuestions}
        />""",
    """        <AskObjectPanel
          siteId={siteId}
          objectId={descriptor.objectId}
          objectName={projection.name}
          sampleQuestions={projection.sampleQuestions}
          compact
        />""",
)

# ---------------------------------------------------------------- ask-object-panel
p = REPO + "/src/fyd/ui/ask-object-panel.tsx"

edit(
    p,
    """export function AskObjectPanel({
  siteId,
  objectId,
  objectName,
  sampleQuestions,
  dark,
}: {
  siteId: string;
  /** PING object id (e.g. "happy-place"); sent when known so the answer
   * is targeted at this object. Omitted when unknown. */
  objectId?: string;
  objectName: string;
  sampleQuestions: string[];
  /** Dark variant for the expanded object rich card (light by default). */
  dark?: boolean;
}) {""",
    """export function AskObjectPanel({
  siteId,
  objectId,
  objectName,
  sampleQuestions,
  dark,
  compact,
}: {
  siteId: string;
  /** PING object id (e.g. "happy-place"); sent when known so the answer
   * is targeted at this object. Omitted when unknown. */
  objectId?: string;
  objectName: string;
  sampleQuestions: string[];
  /** Dark variant for the expanded object rich card (light by default). */
  dark?: boolean;
  /** Compact card layout: the panel renders inside a ~300px oval where a
   * viewport-driven sm:flex-row would squeeze the question input. Stacks
   * the form vertically so the input keeps full width. Portal surfaces
   * leave this unset and keep the responsive row. */
  compact?: boolean;
}) {""",
)

edit(
    p,
    '''  const inputCls = dark
    ? "min-h-[44px] flex-1 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-base text-white placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
    : "min-h-[44px] flex-1 rounded-full border border-stone-300 bg-white px-5 py-3 text-base text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600";''',
    '''  const inputCls = dark
    ? "min-h-[44px] w-full min-w-0 flex-1 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-base text-white placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
    : "min-h-[44px] w-full min-w-0 flex-1 rounded-full border border-stone-300 bg-white px-5 py-3 text-base text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600";''',
)

edit(
    p,
    '''        className="mt-4 flex flex-col gap-3 sm:flex-row"''',
    '''        className={
          compact ? "mt-4 flex w-full flex-col gap-3" : "mt-4 flex flex-col gap-3 sm:flex-row"
        }''',
)

edit(
    p,
    """          className={submitCls}""",
    """          className={compact ? submitCls + " w-full" : submitCls}""",
)

print("ALL EDITS APPLIED")
