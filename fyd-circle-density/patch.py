#!/usr/bin/env python3
"""Phase 2 density patch: one-expanded coordination + className prop + 3 new
Happy Place spots. Fails loudly if any anchor is not found exactly once."""
import sys

COMP = "/home/nolan/projects/ping/src/fyd/ui/inline-object-circle.tsx"
PAGE = "/home/nolan/projects/ping/src/app/page.tsx"

def patch(path, old, new):
    with open(path) as f:
        src = f.read()
    n = src.count(old)
    if n != 1:
        print(f"FATAL: anchor found {n}x (expected 1) in {path}:\n{old[:120]}")
        sys.exit(1)
    with open(path, "w") as f:
        f.write(src.replace(old, new, 1))
    print(f"OK patched {path}: {old[:60]!r}...")

# ---- component: page-level one-expanded coordination (generic) ----
patch(COMP,
"""/** Forgiving collapse delay so the pointer can reach the controls. */
const COLLAPSE_DELAY_MS = 300;""",
"""/** Forgiving collapse delay so the pointer can reach the controls. */
const COLLAPSE_DELAY_MS = 300;

/**
 * Page-level coordination: only one circle expanded at a time.
 * Module-level on purpose: every InlineObjectCircle on the page shares the
 * rule no matter where it renders. Generic; no per-object logic.
 */
const expandedListeners = new Set<(activeUid: string | null) => void>();
let expandedUid: string | null = null;

function claimExpanded(uid: string | null): void {
  expandedUid = uid;
  expandedListeners.forEach((fn) => fn(uid));
}""")

# ---- component: className prop for layout (e.g. inline-block in-flow) ----
patch(COMP,
"""  /** Evidence-backed canonical public website URL, or null (fail closed). */
  websiteUrl: string | null;
}""",
"""  /** Evidence-backed canonical public website URL, or null (fail closed). */
  websiteUrl: string | null;
  /**
   * Optional extra classes on the outer footprint (e.g. "inline-block
   * align-middle" for in-flow use). The 216px artboard is unchanged.
   */
  className?: string;
}""")

patch(COMP,
"""  const { objectId, name, imageSrc, imageSrcSet, websiteUrl } = props;""",
"""  const { objectId, name, imageSrc, imageSrcSet, websiteUrl, className } = props;
  const uid = React.useId();""")

patch(COMP,
"""  const requestOpen = React.useCallback(
    (via: "pointer" | "focus") => {
      clearCollapseTimer();
      openVia.current = via;
      setOpen(true);
    },
    [clearCollapseTimer],
  );""",
"""  const requestOpen = React.useCallback(
    (via: "pointer" | "focus") => {
      clearCollapseTimer();
      openVia.current = via;
      claimExpanded(uid);
      setOpen(true);
    },
    [clearCollapseTimer, uid],
  );

  // When another circle instance claims the expanded slot, collapse this one.
  React.useEffect(() => {
    const onClaim = (activeUid: string | null) => {
      if (activeUid !== uid) {
        clearCollapseTimer();
        setOpen(false);
      }
    };
    expandedListeners.add(onClaim);
    return () => {
      expandedListeners.delete(onClaim);
    };
  }, [uid, clearCollapseTimer]);""")

patch(COMP,
"""      data-testid="inline-object-circle"
      className="relative\"""",
"""      data-testid="inline-object-circle"
      className={`relative${className ? ` ${className}` : ""}`}""")

# ---- page: type import + module-level HappyPlaceCircle helper ----
patch(PAGE,
"""import { buildPortalProjection } from "@/fyd/preview/pipeline";""",
"""import { buildPortalProjection, type PortalProjection } from "@/fyd/preview/pipeline";""")

patch(PAGE,
"""export default function HomePage() {""",
"""/**
 * FYD OBJECT DENSITY LAB (Nolan, 2026-09-22): the same generic component
 * rendered in several page spots. Happy Place only; no second identity.
 * Module-level so instances keep their state across parent renders.
 */
function HappyPlaceCircle({
  circle,
  className,
}: {
  circle: PortalProjection;
  className?: string;
}) {
  return (
    <InlineObjectCircle
      objectId={circle.circle.id}
      name={circle.circle.name}
      imageSrc={circle.preview?.src ?? null}
      imageSrcSet={circle.preview?.srcSet ?? null}
      websiteUrl={circle.websiteHref}
      className={className}
    />
  );
}

export default function HomePage() {""")

# ---- page spot A: right margin beside the /truth paragraph ----
patch(PAGE,
"""          <p className="mt-6 max-w-3xl text-lg text-text-muted" style={{ lineHeight: 'var(--leading-body)' }}>
            A technician answers the same customer question three times because nothing was written down.
            The business knows things, but the knowledge lives in heads, inboxes, and scattered tools.
            It does not compound. PING is infrastructure for turning activity into durable organizational intelligence.
          </p>""",
"""          {/* DENSITY LAB, spot A: circle in the RIGHT margin beside a real paragraph. */}
          <div className="mt-6 grid items-center gap-6 sm:grid-cols-[1fr_232px]">
            <p className="max-w-3xl text-lg text-text-muted" style={{ lineHeight: 'var(--leading-body)' }}>
              A technician answers the same customer question three times because nothing was written down.
              The business knows things, but the knowledge lives in heads, inboxes, and scattered tools.
              It does not compound. PING is infrastructure for turning activity into durable organizational intelligence.
            </p>
            <div className="flex justify-start sm:justify-end">
              {happyPlace ? <HappyPlaceCircle circle={happyPlace} /> : null}
            </div>
          </div>""")

# ---- page spot B: inline mid-paragraph, in the text flow ----
patch(PAGE,
"""                <p className="mt-4 text-text-muted">
                  The question under test is simple. Can a PING object live naturally beside web content, like a citation or an interactive footnote, instead of floating over it?
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

# ---- page spot C: footer-adjacent, below the newsletter block ----
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

print("ALL PATCHES APPLIED")
