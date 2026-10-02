#!/usr/bin/env python3
"""Revert product direction per 2026-09-23 directive.

Removes the 'All objects (N)' trigger from the customer-facing mobile
experience. The mobile projection now renders nothing: the page is a
composition of individually interactive objects, not an object bucket.
The MobileSheet survives only as an internal/debug surface behind
?objectDebug=1.
"""
import sys

LAYER = "/home/nolan/projects/ping/src/fyd/ui/object-layer/MarginObjectLayer.tsx"

def replace_once(path, old, new, label):
    s = open(path).read()
    n = s.count(old)
    if n != 1:
        print(f"FAIL {label}: found {n} occurrences, expected 1")
        sys.exit(1)
    open(path, "w").write(s.replace(old, new, 1))
    print(f"OK {label}")

# Update the responsive policy comment.
old_policy = """ * - mobile (<768): in-flow "All objects" trigger -> bottom sheet.
 *   MOBILE STATIC-SCROLL LAW (2026-09-23, binding): no floating tab,
 *   no fixed edge UI, no viewport-following objects. The trigger is a
 *   normal document-flow element in one spot on the page; the sheet
 *   opens only when the user taps it. When closed, zero overlay remains."""
new_policy = """ * - mobile (<768): no object chrome at all in the customer-facing
 *   experience (2026-09-23 product direction, binding). The page is a
 *   composition of individually interactive objects; there is no
 *   object bucket, no floating tab, no drawer in primary UX.
 *   A generic object explorer survives only as an internal/debug
 *   surface behind ?objectDebug=1."""
replace_once(LAYER, old_policy, new_policy, "policy-comment")

# Replace the mobile branch: no trigger, debug-gated sheet only.
old_mobile = """  if (projection === "mobile") {
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

new_mobile = """  if (projection === "mobile") {
    // 2026-09-23 product direction (binding): the page is a composition
    // of individually interactive objects. No object bucket, no floating
    // tab, no drawer in the customer-facing mobile experience. The
    // explorer sheet survives only as an internal/debug surface behind
    // ?objectDebug=1.
    const debug =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("objectDebug") === "1";
    if (!debug) return null;
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
              aria-label={`Debug: open object explorer (${objects.length} objects).`}
              className="flex min-h-[56px] w-full items-center justify-center gap-3 rounded-2xl px-5 py-4 font-mono text-xs text-white"
              style={{
                background: "rgba(20,16,10,0.92)",
                boxShadow: "0 0 0 1px rgba(232,180,90,0.55)",
              }}
            >
              <span>DEBUG object explorer ({objects.length})</span>
            </button>
          </div>
        )}
        {sheetOpen && <MobileSheet objects={objects} onClose={() => setSheetOpen(false)} />}
      </>
    );
  }"""
replace_once(LAYER, old_mobile, new_mobile, "mobile-branch")

print("ALL EDITS APPLIED")
