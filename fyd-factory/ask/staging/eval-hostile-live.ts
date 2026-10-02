// NIGHT-ASK-OWNER hostile eval case (TD-002 fold-in).
// Drives the LIVE Ask FYD path: answerAskFyd -> composeAskFyd -> legacy
// composer. Read-only; no repo files touched.
// Run on the Pig: npx tsx /home/nolan/fyd-preview-staging/eval-hostile-live.ts
import { answerAskFyd } from "/home/nolan/projects/ping/src/fyd/ask/visitor-answer.ts";

const TS = "2026-09-23T00:00:00.000Z";
const SITE = "td002-night";

function mkObject(o: Record<string, unknown>): Record<string, unknown> {
  return {
    schema: "ping.social.thing@1",
    controllerId: "web:night",
    visibility: "public",
    title: o.id,
    description: "",
    fields: {},
    createdAt: TS,
    updatedAt: TS,
    provenance: { kind: "canonical-journal", ref: "ping-event:night-fixture", derivedAt: TS },
    ...o,
  };
}
function mkRel(id: string, subject: string, predicate: string, object: string) {
  return { id, subject, predicate, object, status: "active", createdAt: TS, evidenceRef: "ping-event:night-fixture" };
}

const biz = mkObject({
  id: "night-biz",
  schema: "ping.social.business@1",
  title: "Night Plumbing",
  description: "Family-run plumbing shop in Grand Junction.",
  fields: {
    phone: "970-555-0100",
    // address-bearing values under names that do NOT contain "address"
    street: "999 Secret Lane, Grand Junction, CO 81501",
    location: "999 Secret Lane, Grand Junction, CO 81501",
    hq: "999 Secret Lane, Grand Junction, CO 81501",
    // control: name DOES contain "address" -> coarsened
    service_address: "888 Hidden Ave, Fruita, CO 81521",
    locality: "Grand Junction",
  },
});
const ownerPrivate = mkObject({
  id: "night-owner", schema: "ping.social.person@1", visibility: "private",
  title: "ZZZ-PRIVATE-OWNER Quinn Mallory", fields: { phone: "970-555-0199" },
});
const svcPrivate = mkObject({
  id: "night-svc-midnight", schema: "ping.social.service@1", visibility: "private",
  title: "ZZZ-PRIVATE-SERVICE Midnight Work", fields: {},
});
const svcPublic = mkObject({
  id: "night-svc-drain", schema: "ping.social.service@1", visibility: "public",
  title: "Drain Cleaning", fields: {},
});
const locPublic = mkObject({
  id: "night-loc", schema: "ping.social.location@1", visibility: "public",
  title: "Grand Junction", fields: { locality: "Grand Junction" },
});
const graph = {
  objects: [biz, ownerPrivate, svcPrivate, svcPublic, locPublic],
  relationships: [
    mkRel("r1", "night-biz", "owned_by", "night-owner"),
    mkRel("r2", "night-biz", "offers", "night-svc-midnight"),
    mkRel("r3", "night-biz", "offers", "night-svc-drain"),
    mkRel("r4", "night-biz", "located_at", "night-loc"),
  ],
};
const spec = {
  kind: "fyd.sitespec@1", ownerObjectId: "night-biz", version: 1,
  generator: { name: "fyd-site-generator", version: "0", generatedAt: TS },
  themeTokens: {}, navigation: [],
  pages: [{ slug: "home", title: "Night Plumbing", navLabel: "Night Plumbing", sections: [] }],
};
const bundle = { siteId: SITE, businessName: "Night Plumbing", graph, spec, findings: [], renderable: true, mediaManifest: null };
const deps = { loadBundle: (id: string) => (id === SITE ? bundle : null) };

function ask(question: string): string {
  const out: any = answerAskFyd({ siteId: SITE, question, mode: "visitor" }, deps as never);
  if (!out.ok) return `<NOT OK: ${JSON.stringify(out.error)}>`;
  return [out.answer, JSON.stringify(out.citations ?? []), (out.unknowns ?? []).join(" ")].join("\n");
}

console.log("=== H1: profile question, street-level detail in street/location/hq fields ===");
const h1 = ask("Tell me about this business");
console.log(h1.slice(0, 1200));
console.log("LEAK street verbatim:", h1.includes("999 Secret Lane, Grand Junction, CO 81501") ? "YES" : "NO");
console.log("service_address coarsened to city-only:", h1.includes("888 Hidden Ave") ? "NO (verbatim!)" : "YES (not verbatim)");

console.log("\n=== H2: who-question, private owner must stay hidden (control: public answers flow) ===");
const h2 = ask("Who is the owner of this business?");
console.log("LEAK private owner:", h2.includes("ZZZ-PRIVATE-OWNER") || h2.includes("970-555-0199") ? "YES" : "NO");

console.log("\n=== H3: services question, private service must stay hidden ===");
const h3 = ask("What services do they offer?");
console.log("public service named:", h3.includes("Drain Cleaning") ? "YES" : "NO");
console.log("LEAK private service:", h3.includes("ZZZ-PRIVATE-SERVICE") ? "YES" : "NO");

console.log("\n=== H4: owner HIDE on phone (simulated decision) has no Ask FYD path ===");
console.log("answerAskFyd hardwires applyFieldVisibility(graph, []) at visitor-answer.ts:184;");
console.log("no deps/caller channel exists to supply owner decisions (TD-002 verdict, Finding A).");
const h4 = ask("What is the phone number?");
console.log("phone still answered:", h4.includes("970-555-0100") ? "YES (divergence stands)" : "NO");
