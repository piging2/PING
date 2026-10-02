import { HAPPY_PLACE_GRAPH } from "/home/nolan/projects/ping/src/fyd/proceduralize/__fixtures__/happy-place-graph";
import { COPPERSMITH_GRAPH } from "/home/nolan/projects/ping/src/fyd/proceduralize/__fixtures__/coppersmith-graph";

function dump(name: string, graph: any) {
  console.log("########## " + name + " ##########");
  console.log("objects:", graph.objects.length, "relationships:", graph.relationships.length);
  for (const o of graph.objects) {
    console.log(
      `\n[obj] id=${o.id} schema=${o.schema} vis=${o.visibility} title=${JSON.stringify(o.title)}`,
    );
    console.log("  desc:", JSON.stringify((o.description || "").slice(0, 300)));
    console.log("  fieldKeys:", Object.keys(o.fields || {}).join(","));
    for (const [k, v] of Object.entries(o.fields || {})) {
      const s = Array.isArray(v) ? v.join("|") : String(v);
      console.log(`  field ${k} = ${JSON.stringify(s.slice(0, 200))}`);
    }
    console.log("  prov:", JSON.stringify(o.provenance));
  }
  console.log("\n[relationships]");
  for (const r of graph.relationships) {
    console.log(`  ${r.id}: ${r.subject.slice(0, 28)} --${r.predicate}--> ${r.object.slice(0, 28)} [${r.status}]`);
  }
}

dump("happy-place", HAPPY_PLACE_GRAPH);
dump("coppersmith-plumbing", COPPERSMITH_GRAPH);
