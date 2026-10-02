#!/bin/bash
set -e
mkdir -p /home/nolan/td001-check
cat > /home/nolan/td001-check/test.ts <<'TSEOF'
import { COPPERSMITH_GRAPH } from "/home/nolan/projects/ping/src/fyd/proceduralize/__fixtures__/coppersmith-graph";
import { generateSiteSpec } from "/home/nolan/projects/ping/src/fyd/proceduralize/generator";
import { isRenderable, validateSiteSpec } from "/home/nolan/projects/ping/src/fyd/sitespec/validator";

const OPTS = { generatedAt: "2026-09-21T12:00:00.000Z" };
const EXTERNAL_IDENTITY = "ping.social.external_identity@1";

describe("TD-001: Explore ObjectFeed with an external_identity object", () => {
  test("the fixture graph contains a public external_identity object", () => {
    const ext = COPPERSMITH_GRAPH.objects.filter(
      (o) => o.schema === EXTERNAL_IDENTITY && o.visibility === "public",
    );
    expect(ext.length).toBeGreaterThan(0);
  });

  test("the generated Explore ObjectFeed narrows its all-query away from external_identity", () => {
    const spec = generateSiteSpec(COPPERSMITH_GRAPH, OPTS);
    const explore = spec.pages.find((p) => p.slug === "explore");
    expect(explore).toBeDefined();
    const feed = explore!.sections.find((s) => s.component === "ObjectFeed");
    expect(feed).toBeDefined();
    expect(feed!.query.kind).toBe("all");
    if (feed!.query.kind === "all") {
      expect(feed!.query.schemas ?? []).not.toContain(EXTERNAL_IDENTITY);
    }
  });

  test("the Coppersmith SiteSpec validates with zero errors and is renderable", () => {
    const spec = generateSiteSpec(COPPERSMITH_GRAPH, OPTS);
    const knownSchemas = new Set(COPPERSMITH_GRAPH.objects.map((o) => o.schema));
    const findings = validateSiteSpec(spec, knownSchemas);
    expect(findings.filter((f) => f.severity === "error")).toEqual([]);
    expect(isRenderable(findings)).toBe(true);
  });
});
TSEOF
cat > /home/nolan/td001-check/tsconfig.json <<'TSEOF'
{
  "extends": "/home/nolan/projects/ping/tsconfig.json",
  "compilerOptions": { "noEmit": true, "types": ["jest", "node"] },
  "include": ["test.ts"]
}
TSEOF
cd /home/nolan/projects/ping
npx tsc -p /home/nolan/td001-check/tsconfig.json 2>&1 | grep "td001-check/test.ts" | head -20 || true
echo "--- tsc exit done (only test.ts errors shown above, if any) ---"
git hash-object /home/hatch/workspace/fyd-factory/tournaments/td-001/contestant-b-test.ts 2>/dev/null || echo "hash: cannot read local file"
