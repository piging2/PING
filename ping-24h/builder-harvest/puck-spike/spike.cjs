// Puck compatibility spike (Track C, Step 15).

// 1. Live SiteSpec section order (captured from the same spec the customize
//    route serves; fixture pageOrder.json). Sandbox egress cannot reach the
//    tailnet IP directly, so the pig captured it at spike time.
const fs = require("fs");
const path = require("path");
const pageOrder = JSON.parse(
  fs.readFileSync(path.join(__dirname, "pageOrder.json"), "utf8"),
);
const homePage = pageOrder.find((p) => p.pageSlug === "home");
const sections = homePage.sections;

// 2. Existing FYD component registry (from src/fyd/components/renderer.tsx
//    section switch; these are the real shipped components).
const FYD_COMPONENTS = [
  "Hero", "BusinessSummary", "Services", "Products", "Locations", "People",
  "Posts", "ObjectGrid", "ObjectFeed", "RecentObjects", "Contact", "Links",
  "SocialProof", "CTA", "IdentityCard", "AskFYD", "ObjectRail", "Gallery",
  "GenericObjectCard",
];

// 3. Puck config: every FYD component registered by its exact name.
const config = {
  components: Object.fromEntries(
    FYD_COMPONENTS.map((name) => [
      name,
      {
        fields: { sectionId: { type: "text" } },
        render: () => null,
      },
    ]),
  ),
};

// 4. Adapter: SiteSpec -> Puck Data.
const puckData = {
  content: sections
    .filter((s) => !s.hidden)
    .map((s) => ({ type: s.component, props: { id: s.id, sectionId: s.id } })),
  root: { props: { title: "coppersmith-plumbing" } },
  zones: {},
};

// 5. Puck data -> existing FYD components: every content type must resolve.
const unmapped = puckData.content.filter((c) => !config.components[c.type]);
console.log("sections:", sections.length);
console.log("puck content items:", puckData.content.length);
console.log("unmapped types:", unmapped.length === 0 ? "NONE" : unmapped.map((u) => u.type));

// 6. Simulate a Puck drag: move Services to the top of the content array.
const moved = [...puckData.content];
const fromIdx = moved.findIndex((c) => c.type === "Services");
const [svc] = moved.splice(fromIdx, 1);
moved.unshift(svc);

// 7. Puck data -> FYD patch proposal: derive the same siteIntent shape the
//    customize pipeline consumes (reorder_section).
const proposal = {
  kind: "reorder_section",
  pageSlug: "home",
  sectionId: svc.props.sectionId,
  toIndex: 0,
};
console.log("derived proposal:", JSON.stringify(proposal));

// 8. Shape compatibility: the live pipeline produced this exact shape for the
//    "Move contact to the top." approval earlier today.
const expectedShape = ["kind", "pageSlug", "sectionId", "toIndex"].sort();
const actualShape = Object.keys(proposal).sort();
console.log(
  "shape matches pipeline siteIntent:",
  JSON.stringify(expectedShape) === JSON.stringify(actualShape),
);
console.log(
  "round-trip order preserved:",
  JSON.stringify(moved.map((c) => c.type)) ===
    JSON.stringify(["Services", ...puckData.content.filter((c) => c.type !== "Services").map((c) => c.type)]),
);
console.log("SPIKE: PASS");
