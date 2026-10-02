"""Phase-2 mobile in-flow object composition edits for src/fyd/components/renderer.tsx.

Idempotent: each replacement asserts exactly one match before applying.
Run on the Pig: python3 /mnt/c/Users/nolan/transfer/phase2-mobile-inflow.py
"""
import sys

PATH = "/home/nolan/projects/ping/src/fyd/components/renderer.tsx"

def replace_once(src: str, old: str, new: str, label: str) -> str:
    n = src.count(old)
    if n != 1:
        print(f"FATAL: {label}: expected 1 match, found {n}")
        sys.exit(1)
    return src.replace(old, new, 1)

def main() -> None:
    with open(PATH, "r", encoding="utf-8") as f:
        src = f.read()

    # 1. SectionShell: every section becomes a data-object-anchor spot.
    src = replace_once(
        src,
        '      data-fyd-section={sectionId}\n',
        '      data-fyd-section={sectionId}\n'
        '      // In-flow object anchor (2026-09-24 Phase 2): the section\'s\n'
        '      // document spot doubles as its objects\' data-object-anchor.\n'
        '      // The mobile in-flow composition renders at this exact spot.\n'
        '      data-object-anchor={sectionId}\n',
        "section-shell-anchor",
    )

    # 2. New MobileInFlowObjects component, inserted before ServicesSection.
    mobile_component = '''/**
 * Mobile in-flow object composition (2026-09-24, Phase 2 of the
 * BUILDER-BRUTAL-CEO-HARVEST directive).
 *
 * On viewports below the md breakpoint (<768px) the margin object layer
 * is intentionally absent (2026-09-23 product direction, binding: no
 * object bucket, no floating tab, no drawer on mobile). This component is
 * its replacement: the section's own objects rendered as tappable
 * FydObjectCards directly in the page flow, at the section's
 * data-object-anchor spot.
 *
 * - Visually integrated: the same FydObjectCard the Services section
 *   uses on every viewport; theme-driven, no floating chrome.
 * - Tappable: each card title links to /o/<id>, which the site client
 *   intercepts into the rich ObjectOverlay (scroll-preserving).
 * - Document-anchored: plain in-flow DOM, so the cards scroll WITH the
 *   page. Never position:fixed, never viewport-sticky.
 * - Desktop untouched: md:hidden keeps >=768px pixel-identical.
 * - The ?objectDebug=1 gate on MarginObjectLayer is NOT touched; this
 *   is the replacement composition, not a gate removal.
 *
 * Generic: descriptors only. Zero customer-specific code.
 */
function MobileInFlowObjects({
  objects,
  theme,
  ctx,
  kickerFor,
  testId,
}: {
  objects: PingObject[];
  theme: FYDThemeTokens;
  ctx: RenderContext;
  /** Optional per-object kicker line under the title (e.g. a post date). */
  kickerFor?: (o: PingObject) => string | undefined;
  /** Test hook for the mobile composition block. */
  testId: string;
}) {
  if (objects.length === 0) return null;
  return (
    <div
      className="mt-6 md:hidden"
      data-testid={testId}
      data-inflow-composition="mobile"
    >
      <div className="grid grid-cols-1 gap-4">
        {objects.map((o, i) => (
          <FydObjectCard
            key={o.id}
            o={o}
            theme={theme}
            ctx={ctx}
            index={i}
            kicker={kickerFor ? kickerFor(o) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

'''
    src = replace_once(
        src,
        "function ServicesSection(props: SectionProps) {\n",
        mobile_component + "function ServicesSection(props: SectionProps) {\n",
        "insert-mobile-component",
    )

    # 3. BusinessSummary: business description section -> Business object card.
    src = replace_once(
        src,
        """    <SectionShell
      theme={theme}
      heading={presentation.heading ?? (title ? "About " + title : undefined)}
      copy={presentation.copy ?? boundDescription(ctx, o)}
    >
      <ClaimBadge objects={objects} />
    </SectionShell>""",
        """    <SectionShell
      theme={theme}
      sectionId={section.id}
      heading={presentation.heading ?? (title ? "About " + title : undefined)}
      copy={presentation.copy ?? boundDescription(ctx, o)}
    >
      <ClaimBadge objects={objects} />
      {/* Mobile in-flow composition: the business object itself as a
          tappable card in the page flow (<768px). Desktop keeps the
          prose summary unchanged. */}
      <MobileInFlowObjects
        objects={objects}
        theme={theme}
        ctx={ctx}
        testId="inflow-business"
      />
    </SectionShell>""",
        "business-summary",
    )

    # 4. LocationsSection: prose pills stay for desktop; mobile gets
    #    Location object cards in flow.
    src = replace_once(
        src,
        '      <ul className="flex flex-wrap gap-2">\n',
        '      <ul className="hidden flex-wrap gap-2 md:flex">\n',
        "locations-pills-desktop-only",
    )
    src = replace_once(
        src,
        """      <div className="mt-3">
        <ClaimBadge objects={objects} />
      </div>
    </SectionShell>
  );
}

function PeopleSection({ section, objects, presentation, theme, ctx, motionIndex }: SectionProps) {""",
        """      <div className="mt-3">
        <ClaimBadge objects={objects} />
      </div>
      {/* Mobile in-flow composition: Location object cards in the page
          flow (<768px), replacing the pill list. Desktop unchanged. */}
      <MobileInFlowObjects
        objects={objects}
        theme={theme}
        ctx={ctx}
        testId="inflow-locations"
      />
    </SectionShell>
  );
}

function PeopleSection({ section, objects, presentation, theme, ctx, motionIndex }: SectionProps) {""",
        "locations-mobile-cards",
    )

    # 5. PostsSection: prose articles stay for desktop; mobile gets
    #    tappable object cards (date as kicker).
    src = replace_once(
        src,
        '      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">\n        {sorted.map((o) => {\n',
        '      <div className="hidden grid-cols-1 gap-4 md:grid md:grid-cols-2">\n        {sorted.map((o) => {\n',
        "posts-prose-desktop-only",
    )
    src = replace_once(
        src,
        """        })}
      </div>
    </SectionShell>
  );
}

function ObjectGridSection(props: SectionProps) {""",
        """        })}
      </div>
      {/* Mobile in-flow composition: post/project object cards in the
          page flow (<768px), tappable into the object overlay. The post
          date rides as the card kicker. Desktop keeps the prose grid. */}
      <MobileInFlowObjects
        objects={sorted}
        theme={theme}
        ctx={ctx}
        kickerFor={(o) => boundField(ctx, o, "date")}
        testId="inflow-posts"
      />
    </SectionShell>
  );
}

function ObjectGridSection(props: SectionProps) {""",
        "posts-mobile-cards",
    )

    with open(PATH, "w", encoding="utf-8") as f:
        f.write(src)
    print("OK: all 5 edit groups applied to renderer.tsx")

if __name__ == "__main__":
    main()
