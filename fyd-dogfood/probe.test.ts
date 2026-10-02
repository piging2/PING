/**
 * TEMPORARY probe: dump the ping-fyd composed spec structure for the
 * dogfood quality pass. Deleted after inspection.
 */
import { getPingObjectGraph } from "@/fyd/data/ping-object-source";
import { verifyObjectGraph } from "@/fyd/builder/object-builder";
import { planSite, resolveQueryObjects } from "@/fyd/builder/planner";
import { strategyForSite } from "@/fyd/builder/strategy-for-site";
import { applyPresentationIntent } from "@/fyd/customize/apply-layer";

const SITE_ID = "ping-fyd";

test("probe: dump ping-fyd spec", async () => {
  const projection = await getPingObjectGraph(SITE_ID);
  const verified = verifyObjectGraph({ tenantId: SITE_ID }, projection);
  const strategy = strategyForSite(SITE_ID, verified.graph);
  const planned = planSite({
    ctx: { tenantId: SITE_ID },
    graph: verified.graph,
    vector: strategy.vector,
    generatedAt: projection.meta.generatedAt,
    attestation: verified.attestation,
  });
  const spec = applyPresentationIntent(
    planned.spec,
    projection.presentationIntent,
    verified.graph,
  ).spec;
  const dump = {
    strategy: strategy.name,
    policy: strategy.policy,
    theme: spec.theme,
    ownerObjectId: spec.ownerObjectId,
    pages: spec.pages.map((p) => ({
      slug: p.slug,
      title: p.title,
      navLabel: p.navLabel,
      sections: p.sections.map((s) => ({
        id: s.id,
        component: s.component,
        query: s.query,
        presentation: s.presentation,
        boundIds: (() => {
          try {
            return resolveQueryObjects(verified.graph, s.query).map((o) => o.id);
          } catch {
            return ["<resolve-error>"];
          }
        })(),
      })),
    })),
    nav: spec.nav,
  };
  console.log("PING_FYD_SPEC_DUMP_START");
  console.log(JSON.stringify(dump, null, 1));
  console.log("PING_FYD_SPEC_DUMP_END");
}, 60000);
