import { COPPERSMITH_GRAPH } from "./coppersmith-graph";
import { generateSiteSpec } from "/home/nolan/projects/ping/src/fyd/proceduralize/generator";

test("diagnostic: list generated sections", () => {
  const graph = JSON.parse(JSON.stringify(COPPERSMITH_GRAPH));
  const spec = generateSiteSpec(graph, { generatedAt: "2026-09-21T13:50:00Z" });
  for (const page of spec.pages) {
    for (const s of page.sections) {
      console.log(
        `page=${page.slug} id=${s.id} component=${s.component} heading=${s.presentation.heading ?? "(none)"} hidden=${s.presentation.hidden ?? false}`,
      );
    }
  }
  console.log("services descriptions:");
  for (const o of graph.objects.filter((x: any) => x.schema === "ping.social.service@1")) {
    console.log(`  ${o.id} title=${o.title} desc=${(o.description ?? "").slice(0, 60)}`);
  }
  const biz = graph.objects.find((x: any) => x.schema === "ping.social.business@1");
  console.log("business phone:", biz.fields.phone, "hours:", biz.fields.hours);
});
