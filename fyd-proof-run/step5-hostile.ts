/**
 * FYD boundary-proof STEP 5: hostile content check at the renderer boundary.
 *
 * 1. Static inspection of renderer.tsx + site-client.tsx for dangerous sinks
 *    (dangerouslySetInnerHTML, unvalidated href/src interpolation).
 * 2. Empirical test: hostile field values through the REAL path
 *    (synthetic ObjectGraph -> generateSiteSpec -> renderToStaticMarkup with
 *    SitePageView, the same component the demo pages render).
 *
 * Verdict: PASS / FAIL / BLOCKED with input -> output evidence per case.
 */
import { createElement } from "react";
import * as React from "react";
// renderer.tsx is compiled by tsx with the classic JSX runtime and references
// the React global (as it does under Next). Provide it explicitly for SSR.
(globalThis as { React?: unknown }).React = React;
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync, writeFileSync } from "node:fs";

import { generateSiteSpec } from "@/fyd/proceduralize/generator";
import { SitePageView } from "@/fyd/components/renderer";
import type { ObjectGraph, FYDSiteSpec } from "@/fyd/sitespec/types";
import type { PingObject } from "@/lib/ping/types";

const REPO = "/home/nolan/projects/ping";
const OUT = "/home/nolan/fyd-proof-run";
const OBS = "2026-09-21T13:50:00Z";
const VIEWER = { viewerId: null, displayName: null };

function biz(
  title: string,
  description: string,
  fields: Record<string, string | string[]>,
): PingObject {
  return {
    id: "biz-hostile-1",
    schema: "ping.social.business@1",
    controllerId: "identity_fyd_compiler_test",
    visibility: "public",
    title,
    description,
    fields,
    createdAt: OBS,
    updatedAt: OBS,
    provenance: { kind: "website-derived", ref: "hostile-test", derivedAt: OBS },
  };
}

function renderHome(o: PingObject): string {
  const graph: ObjectGraph = { objects: [o], relationships: [] };
  const spec: FYDSiteSpec = generateSiteSpec(graph, { generatedAt: OBS });
  const home = spec.pages.find((p) => p.slug === "home");
  if (!home) throw new Error("no home page generated for hostile object");
  const ctx = { spec, graph, viewer: VIEWER };
  return renderToStaticMarkup(createElement(SitePageView, { page: home, ctx }));
}

interface CaseResult {
  id: string;
  input: string;
  field: string;
  outputSnippet: string;
  escaped: boolean;
  neutralized: boolean;
  note: string;
}

function snippet(html: string, needle: string, radius = 90): string {
  const i = html.indexOf(needle);
  if (i === -1) return "(needle not found: " + needle + ")";
  const s = Math.max(0, i - radius);
  return html.slice(s, i + needle.length + radius).replace(/\s+/g, " ");
}

function run(): void {
  const results: CaseResult[] = [];

  // Case 1: script tag in title (text node in Hero h1)
  {
    const html = renderHome(biz("<script>alert(1)</script>", "baseline", {}));
    const rawPresent = html.includes("<script>alert(1)</script>");
    const escapedPresent = html.includes("&lt;script&gt;alert(1)&lt;/script&gt;");
    results.push({
      id: "title-script-tag",
      input: "<script>alert(1)</script>",
      field: "title",
      outputSnippet: snippet(html, "&lt;script&gt;"),
      escaped: !rawPresent && escapedPresent,
      neutralized: !rawPresent,
      note: rawPresent ? "RAW SCRIPT TAG IN OUTPUT" : "escaped to entities",
    });
  }

  // Case 2: img onerror in description (text node in Hero p)
  {
    const html = renderHome(biz("baseline", "<img src=x onerror=alert(1)>", {}));
    const rawPresent = html.includes("<img src=x");
    const escapedPresent = html.includes("&lt;img");
    results.push({
      id: "description-img-onerror",
      input: "<img src=x onerror=alert(1)>",
      field: "description",
      outputSnippet: snippet(html, "&lt;img"),
      escaped: !rawPresent && escapedPresent,
      neutralized: !rawPresent,
      note: rawPresent ? "RAW IMG TAG IN OUTPUT" : "escaped to entities",
    });
  }

  // Case 3: javascript: URL in website field -> href sink
  {
    const html = renderHome(biz("baseline", "baseline", { website: "javascript:alert(1)" }));
    const rendered = html.includes('href="javascript:alert(1)"');
    results.push({
      id: "website-javascript-url",
      input: "javascript:alert(1)",
      field: "fields.website",
      outputSnippet: snippet(html, "javascript:alert(1)"),
      escaped: true, // attribute value is entity-encoded, but the scheme survives
      neutralized: !rendered,
      note: rendered
        ? "javascript: URL rendered VERBATIM into href (clickable XSS vector)"
        : "javascript: URL was neutralized or dropped",
    });
  }

  // Case 4: malformed URL in website field
  {
    const html = renderHome(biz("baseline", "baseline", { website: "http://[broken" }));
    const rendered = html.includes('href="http://[broken"');
    results.push({
      id: "website-malformed-url",
      input: "http://[broken",
      field: "fields.website",
      outputSnippet: snippet(html, "http://[broken"),
      escaped: true,
      neutralized: true, // inert string, no script execution path
      note: rendered
        ? "malformed URL rendered verbatim into href (inert, no validation)"
        : "malformed URL dropped from output",
    });
  }

  // Case 5: entity in description must NOT be decoded (double-escape is correct)
  {
    const html = renderHome(biz("baseline", "Fish &amp; Chips", {}));
    const doubleEscaped = html.includes("Fish &amp;amp; Chips");
    const singleDecoded = html.includes("Fish &amp; Chips") && !doubleEscaped;
    results.push({
      id: "description-entity",
      input: "Fish &amp; Chips",
      field: "description",
      outputSnippet: snippet(html, "Fish &"),
      escaped: doubleEscaped,
      neutralized: true,
      note: doubleEscaped
        ? "literal text preserved (correct double-escape)"
        : singleDecoded
          ? "entity was DECODED once (wrong: treats source text as HTML)"
          : "unexpected output",
    });
  }

  // Case 6: quote-breaking attempt in phone -> tel: href sink
  {
    const html = renderHome(
      biz("baseline", "baseline", { phone: '1-555-0000"><script>alert(1)</script>' }),
    );
    const rawPresent = html.includes("<script>alert(1)</script>");
    const telPresent = html.includes("tel:1-555-0000");
    results.push({
      id: "phone-quote-break",
      input: '1-555-0000"><script>alert(1)</script>',
      field: "fields.phone",
      outputSnippet: snippet(html, "tel:"),
      escaped: !rawPresent,
      neutralized: !rawPresent,
      note:
        "tel: prefix keeps it a tel: URL (" + (telPresent ? "prefix present" : "prefix missing") +
        "); attribute value entity-encoded, no raw script tag",
    });
  }

  // Case 7: javascript: URL in socials -> Links section href sink
  {
    const html = renderHome(biz("baseline", "baseline", { socials: ["javascript:alert(2)"] }));
    const rendered = html.includes('href="javascript:alert(2)"');
    results.push({
      id: "socials-javascript-url",
      input: "javascript:alert(2)",
      field: "fields.socials[0]",
      outputSnippet: snippet(html, "javascript:alert(2)"),
      escaped: true,
      neutralized: !rendered,
      note: rendered
        ? "javascript: URL rendered VERBATIM into href (clickable XSS vector)"
        : "javascript: URL was neutralized or dropped",
    });
  }

  // Case 8: svg onload in title
  {
    const html = renderHome(biz('Acme "><svg onload=alert(1)>', "baseline", {}));
    const rawPresent = html.includes("<svg onload=alert(1)>");
    results.push({
      id: "title-svg-onload",
      input: 'Acme "><svg onload=alert(1)>',
      field: "title",
      outputSnippet: snippet(html, "Acme"),
      escaped: !rawPresent,
      neutralized: !rawPresent,
      note: rawPresent ? "RAW SVG TAG IN OUTPUT" : "escaped to entities",
    });
  }

  // Static inspection
  const rendererSrc = readFileSync(REPO + "/src/fyd/components/renderer.tsx", "utf8");
  const clientSrc = readFileSync(REPO + "/src/app/sites/happy-place/site-client.tsx", "utf8");
  const hrefInterpolations = [
    ...rendererSrc.matchAll(/href=\{([^}]+)\}/g),
  ].map((m) => "href={" + m[1] + "}");
  const staticFindings = {
    rendererHasDangerouslySetInnerHTML: rendererSrc.includes("dangerouslySetInnerHTML"),
    clientHasDangerouslySetInnerHTML: clientSrc.includes("dangerouslySetInnerHTML"),
    rendererHrefInterpolations: [...new Set(hrefInterpolations)],
    clientHrefInterpolations: [...clientSrc.matchAll(/href=\{([^}]+)\}/g)].map((m) => "href={" + m[1] + "}"),
  };

  const textCases = results.filter((r) =>
    ["title-script-tag", "description-img-onerror", "description-entity", "phone-quote-break", "title-svg-onload"].includes(r.id),
  );
  const urlCases = results.filter((r) =>
    ["website-javascript-url", "socials-javascript-url"].includes(r.id),
  );
  const textEscapingPass = textCases.every((r) => r.escaped && r.neutralized);
  const urlsNeutralized = urlCases.every((r) => r.neutralized);

  let verdict: "PASS" | "FAIL" | "BLOCKED";
  if (textEscapingPass && urlsNeutralized) verdict = "PASS";
  else verdict = "FAIL";

  const step5 = {
    step: 5,
    script: OUT + "/step5-hostile.ts",
    verdict,
    textEscapingPass,
    urlsNeutralized,
    staticFindings,
    cases: results,
  };

  // Merge into the combined report
  const combinedPath = OUT + "/step1-2-5-report.json";
  const combined = JSON.parse(readFileSync(combinedPath, "utf8")) as {
    step5: unknown;
  };
  combined.step5 = step5;
  writeFileSync(combinedPath, JSON.stringify(combined, null, 2), "utf8");

  console.log("STEP 5 verdict: " + verdict);
  console.log("  textEscapingPass=" + textEscapingPass + " urlsNeutralized=" + urlsNeutralized);
  for (const r of results) {
    console.log("  [" + r.id + "] neutralized=" + r.neutralized + " :: " + r.note);
    console.log("      in : " + r.input);
    console.log("      out: " + r.outputSnippet);
  }
  console.log("REPORT: " + combinedPath);
}

run();
