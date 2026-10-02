#!/bin/bash
set -u
cd /home/nolan/projects/ping
cat > /tmp/seam-probe.test.ts <<'EOF'
import { renderToStaticMarkup } from "react-dom/server";
import { SitePageView, buildRenderContext } from "@/fyd/components/renderer";
import { generateSiteSpec } from "@/fyd/proceduralize/generator";
const OBS = "2026-09-23T18:30:00Z";
const g: any = {
  objects: [{
    id: "biz-evil", schema: "ping.social.business@1", controllerId: "t",
    visibility: "public", title: "Evil Business",
    description: "<img src=x onerror=\"alert('SEAM-M6')\">\n<svg><g onload=\"alert('SEAM-M8')\"></g></svg>",
    fields: { phone: "+19705550100", website: "https://evil.example/" },
    createdAt: OBS, updatedAt: OBS,
    provenance: { kind: "website-derived", ref: "website-ingestion:https://evil.example/", derivedAt: OBS },
  }],
  relationships: [],
};
test("probe", () => {
  const spec = generateSiteSpec(g, { generatedAt: OBS });
  const ctx = buildRenderContext(spec, g, { viewerId: null, displayName: null }, []);
  const html = spec.pages.map((p: any) => renderToStaticMarkup(SitePageView({ page: p, ctx }))).join("\n");
  const i = html.indexOf("SEAM-M6");
  console.log("CONTEXT-AROUND-SEAM-M6: [" + html.slice(Math.max(0, i - 120), i + 120) + "]");
  const j = html.indexOf("SEAM-M8");
  console.log("CONTEXT-AROUND-SEAM-M8: [" + html.slice(Math.max(0, j - 120), j + 120) + "]");
  console.log("RAW-IMG-TAG:", /<img/i.test(html));
  console.log("RAW-SVG-ONLOAD:", /<svg[^>]*onload/i.test(html));
});
EOF
cp /tmp/seam-probe.test.ts src/fyd/boundary/__tests__/zz-probe.test.ts
npx jest --config '{"testEnvironment":"node","rootDir":"/home/nolan/projects/ping","testMatch":["<rootDir>/src/fyd/boundary/__tests__/zz-probe.test.ts"],"moduleNameMapper":{"^@/(.*)$":"<rootDir>/src/$1","\\.css$":"<rootDir>/src/fyd/components/__tests__/css-stub.js"},"transform":{"^.+\\.tsx?$":["ts-jest",{"tsconfig":{"target":"ES2017","module":"commonjs","moduleResolution":"node","jsx":"react-jsx","esModuleInterop":true,"strict":true,"skipLibCheck":true}}]}}' 2>&1 | grep -E 'CONTEXT|RAW-' | head -10
rm src/fyd/boundary/__tests__/zz-probe.test.ts
