#!/usr/bin/env python3
"""Phase 2 patch part 2: spots B and C only (part 1 already applied)."""
import sys

PAGE = "/home/nolan/projects/ping/src/app/page.tsx"

def patch(path, old, new):
    with open(path) as f:
        src = f.read()
    n = src.count(old)
    if n != 1:
        print(f"FATAL: anchor found {n}x (expected 1) in {path}:\n{old[:150]}")
        sys.exit(1)
    with open(path, "w") as f:
        f.write(src.replace(old, new, 1))
    print(f"OK patched {path}")

# ---- spot B: inline mid-paragraph, in the text flow ----
patch(PAGE,
"""                <p className="mt-4 text-text-muted">
                  The question under test is simple. Can a PING object live naturally beside web
                  content, like a citation or an interactive footnote, instead of floating over it?
                </p>""",
"""                <p className="mt-4 text-text-muted">
                  The question under test is simple. Can a PING object live naturally beside web
                  content, like a citation{" "}
                  {/* DENSITY LAB, spot B: circle inline mid-paragraph, in the text flow. */}
                  {happyPlace ? (
                    <HappyPlaceCircle circle={happyPlace} className="mx-1 inline-block align-middle" />
                  ) : null}{" "}
                  or an interactive footnote, instead of floating over it?
                </p>""")

# ---- spot C: footer-adjacent, below the newsletter block ----
patch(PAGE,
"""          <p className="mt-3 text-text-on-dark/80">
            Notes on continuity, agents, and building PING. One email when there is something worth saying.
          </p>""",
"""          <p className="mt-3 text-text-on-dark/80">
            Notes on continuity, agents, and building PING. One email when there is something worth saying.
          </p>
          {/* DENSITY LAB, spot C: footer-adjacent. Same object, different spot on the page. */}
          <div className="mt-8 flex justify-center">
            {happyPlace ? <HappyPlaceCircle circle={happyPlace} /> : null}
          </div>
          <p className="mt-3 text-center text-xs text-text-on-dark/50">
            Same object, different spot on the page.
          </p>""")

print("PART 2 APPLIED")
