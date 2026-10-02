#!/usr/bin/env python3
"""Mobile static-scroll fix for MarginObjectLayer + homepage placement.

Binding: FYD Mobile Static-Scroll Directive 2026-09-23.
Removes the fixed mobile edge tab (the follower). The trigger becomes ONE
in-flow control; the bottom sheet opens only on user tap.
"""
import sys

LAYER = "/home/nolan/projects/ping/src/fyd/ui/object-layer/MarginObjectLayer.tsx"
PAGE = "/home/nolan/projects/ping/src/app/page.tsx"

def replace_once(path, old, new, label):
    s = open(path).read()
    n = s.count(old)
    if n != 1:
        print(f"FAIL {label}: found {n} occurrences, expected 1")
        sys.exit(1)
    open(path, "w").write(s.replace(old, new, 1))
    print(f"OK {label}")

# --- Edit 1: responsive policy comment ---
old_policy = """ * - mobile (<768): edge tab -> bottom sheet (no desktop margin
 *   emulation; the existing fixed mobile behavior is kept exactly)"""
new_policy = """ * - mobile (<768): in-flow "All objects" trigger -> bottom sheet.
 *   MOBILE STATIC-SCROLL LAW (2026-09-23, binding): no floating tab,
 *   no fixed edge UI, no viewport-following objects. The trigger is a
 *   normal document-flow element in one spot on the page; the sheet
 *   opens only when the user taps it. When closed, zero overlay remains."""
replace_once(LAYER, old_policy, new_policy, "policy-comment")

# --- Edit 2: mobile branch JSX ---
old_mobile = """  if (projection === "mobile") {
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
  }"""

new_mobile = """  if (projection === "mobile") {
    // MOBILE STATIC-SCROLL LAW (2026-09-23, binding): no floating tab,
    // no fixed edge UI, nothing following the scroll. ONE in-flow
    // control in one spot on the page; the bottom sheet opens only when
    // the user taps it. When closed, zero overlay remains.
    return (
      <>
        {!sheetOpen && (
          <div data-testid="object-layer" data-projection="mobile" className="px-4 py-6">
            <button
              type="button"
              data-testid="mobile-object-tab"
              onClick={() => {
                claimExpanded("sheet");
                setSheetOpen(true);
              }}
              aria-label={`${objects.length} FYD objects on this page. Open all objects.`}
              aria-haspopup="dialog"
              aria-expanded={sheetOpen}
              className="flex min-h-[56px] w-full items-center justify-center gap-3 rounded-2xl px-5 py-4 text-sm font-semibold text-white"
              style={{
                background: "rgba(20,16,10,0.92)",
                boxShadow: "0 0 0 1px rgba(232,180,90,0.55)",
              }}
            >
              <span aria-hidden="true" className="flex gap-1.5">
                {objects.slice(0, 3).map((o) => (
                  <span
                    key={o.objectId}
                    className="block h-2.5 w-2.5 rounded-full"
                    style={{ background: "#f3c96b" }}
                  />
                ))}
              </span>
              <span>All objects ({objects.length})</span>
            </button>
          </div>
        )}
        {sheetOpen && <MobileSheet objects={objects} onClose={() => setSheetOpen(false)} />}
      </>
    );
  }"""
replace_once(LAYER, old_mobile, new_mobile, "mobile-branch")

# --- Edit 3: move layer invocation after the hero in page.tsx ---
old_pos = """      {layerEnabled ? <MarginObjectLayer objects={layerObjects} /> : null}
      {/* 01 HERO: the living system moment */}"""
new_pos = """      {/* 01 HERO: the living system moment */}"""
replace_once(PAGE, old_pos, new_pos, "page-remove-top")

# Insert after the hero section closes. The hero is the first </Section>
# after the HERO comment; anchor on the FYD OBJECT LAYER comment that
# follows it.
old_anchor = """      {/* FYD OBJECT LAYER: two PING objects in the margin beside real"""
new_anchor = """      {/* Mobile in-flow object control lives here (one spot on the page,
          never floating). Desktop renders via portal; position in the
          tree does not affect the document-anchored plane. */}
      {layerEnabled ? <MarginObjectLayer objects={layerObjects} /> : null}
      {/* FYD OBJECT LAYER: two PING objects in the margin beside real"""
replace_once(PAGE, old_anchor, new_anchor, "page-insert-after-hero")

print("ALL EDITS APPLIED")
