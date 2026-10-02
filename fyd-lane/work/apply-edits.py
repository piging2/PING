#!/usr/bin/env python3
"""Surgical edits for the Ask FYD visitor lane. Each replacement must match exactly once."""
import sys

RENDERER = "src/fyd/components/renderer.tsx"
SITE_CLIENT = "src/app/sites/happy-place/site-client.tsx"
HAPPY_PAGE = "src/app/sites/happy-place/page.tsx"
COPPER_PAGE = "src/app/sites/coppersmith-plumbing/page.tsx"

OLD_ASK_SECTION = '''function AskFYDSection({ presentation, theme, ctx }: SectionProps) {
  const ownerName = boundOwnerTitle(ctx);
  return (
    <section id="ask" className="w-full px-4 py-12 sm:px-6" style={{ background: theme.ink }}>
      <div className="mx-auto max-w-3xl text-center">
        <h2
          className="text-2xl font-semibold text-background sm:text-3xl"
          style={{ fontFamily: theme.fontDisplay }}
        >
          {presentation.heading ?? "Ask FYD about " + ownerName}
        </h2>
        <p className="mt-2 text-background/70">
          {presentation.copy ?? "Questions go to FYD Social. Answers cite website statements, never verified fact."}
        </p>
        <form
          className="mt-6 flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => e.preventDefault()}
        >
          <input
            type="text"
            name="q"
            placeholder="What do you want to know?"
            className="flex-1 rounded border border-border-soft bg-background px-4 py-3"
            aria-label="Ask FYD a question"
          />
          <button
            type="submit"
            className="rounded px-6 py-3 font-semibold"
            style={{ background: theme.accent, color: theme.accentForeground }}
          >
            Ask
          </button>
        </form>
        <p className="mt-3 text-xs text-background/50">
          FYD Ask is built in a sibling lane; this box holds the component slot on the generated site.
        </p>
      </div>
    </section>
  );
}'''

NEW_ASK_SECTION = '''function AskFYDSection({ presentation, theme, ctx }: SectionProps) {
  const ownerName = boundOwnerTitle(ctx);
  return (
    <section id="ask" className="w-full px-4 py-12 sm:px-6" style={{ background: theme.ink }}>
      <div className="mx-auto max-w-3xl text-center">
        <h2
          className="text-2xl font-semibold text-background sm:text-3xl"
          style={{ fontFamily: theme.fontDisplay }}
        >
          {presentation.heading ?? "Ask FYD about " + ownerName}
        </h2>
        <p className="mt-2 text-background/70">
          {presentation.copy ?? "Questions go to FYD Social. Answers cite website statements, never verified fact."}
        </p>
        <div className="text-left">
          <AskFydWidget siteId={ctx.siteId} theme={theme} />
        </div>
      </div>
    </section>
  );
}'''

EDITS = [
    (RENDERER,
     '''import { getComponentDef } from "./registry";''',
     '''import { getComponentDef } from "./registry";
import { AskFydWidget } from "./ask-fyd-widget";'''),
    (RENDERER,
     '''  graph: ObjectGraph;
  viewer: ViewerContext;
}''',
     '''  graph: ObjectGraph;
  viewer: ViewerContext;
  /**
   * Public site slug (e.g. "happy-place") threaded from the page, so the
   * AskFYD widget knows which site to ask about. Optional: sections render
   * fine without it, but Ask FYD shows an honest unavailable state.
   */
  siteId?: string;
}'''),
    (RENDERER, OLD_ASK_SECTION, NEW_ASK_SECTION),
    (SITE_CLIENT,
     '''export function SiteClient({
  spec: initialSpec,
  graph,
  findings,
  renderable,
}: {
  spec: FYDSiteSpec;
  graph: ObjectGraph;
  findings: FYDFinding[];
  renderable: boolean;
}) {''',
     '''export function SiteClient({
  spec: initialSpec,
  graph,
  findings,
  renderable,
  siteId,
}: {
  spec: FYDSiteSpec;
  graph: ObjectGraph;
  findings: FYDFinding[];
  renderable: boolean;
  siteId?: string;
}) {'''),
    (SITE_CLIENT,
     '''  const ctx = useMemo(
    () => ({ spec, graph, viewer: VIEWER }),
    [spec, graph],
  );''',
     '''  const ctx = useMemo(
    () => ({ spec, graph, viewer: VIEWER, siteId }),
    [spec, graph, siteId],
  );'''),
    (HAPPY_PAGE,
     '''      <SiteClient
        spec={spec}
        graph={HAPPY_PLACE_GRAPH}
        findings={findings}
        renderable={renderable}
      />''',
     '''      <SiteClient
        spec={spec}
        graph={HAPPY_PLACE_GRAPH}
        findings={findings}
        renderable={renderable}
        siteId="happy-place"
      />'''),
    (COPPER_PAGE,
     '''      <SiteClient
        spec={spec}
        graph={COPPERSMITH_GRAPH}
        findings={findings}
        renderable={renderable}
      />''',
     '''      <SiteClient
        spec={spec}
        graph={COPPERSMITH_GRAPH}
        findings={findings}
        renderable={renderable}
        siteId="coppersmith-plumbing"
      />'''),
]


def main() -> int:
    failures = 0
    for path, old, new in EDITS:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        count = content.count(old)
        if count != 1:
            print(f"FAIL: {path}: expected 1 match, found {count}")
            failures += 1
            continue
        content = content.replace(old, new)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"OK: {path}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
