const { WICKED_WRENCH_GRAPH } = require("/home/hatch/workspace/fyd-build/dist/src/fyd/proceduralize/__fixtures__/wicked-wrench-graph.js");
const { generateSiteSpec } = require("/home/hatch/workspace/fyd-build/dist/src/fyd/proceduralize/generator.js");
const { replayOwnerIntent } = require("/home/hatch/workspace/fyd-build/dist/src/fyd/owner/apply.js");
const fs = require("fs");

const OPTS = { generatedAt: "2026-10-01T13:49:00.000Z" };
// Fresh spec (as if regenerated from re-observation)
const fresh = generateSiteSpec(WICKED_WRENCH_GRAPH, OPTS);
// Replay stored decisions for this slug
const replayed = replayOwnerIntent("wicked-wrench", fresh, {
  dataDir: "/home/hatch/workspace/fyd-build/data",
});
// Check: is Diesel repair still featured?
const home = replayed.pages.find((p) => p.slug === "home");
const servicesSection = home.sections.find((s) => s.component === "Services");
console.log("featuredIds after replay:", JSON.stringify(servicesSection.presentation?.featuredIds));
// Compare to fresh (no replay)
const freshHome = fresh.pages.find((p) => p.slug === "home");
const freshSection = freshHome.sections.find((s) => s.component === "Services");
console.log("featuredIds fresh (no replay):", JSON.stringify(freshSection.presentation?.featuredIds));
