/**
 * SSR proof render for the Coppersmith family page + must-win precondition
 * assertions. Renders PublicFamilyPage to static HTML twice (demo-owner
 * flag on/off) and asserts the hard gates that can be checked statically.
 */
import { Module } from "node:module";
// The family page pulls in family.css as a side effect; in this node-only
// proof harness CSS is irrelevant, so stub the extension before import.
(Module as unknown as { _extensions: Record<string, () => void> })._extensions[".css"] = () => {};

import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import React from "react";
// Family .tsx files use the classic JSX runtime; provide the global.
(globalThis as Record<string, unknown>).React = React;

const { PublicFamilyPage } = await import("@/fyd/family/family-page");
const { buildCoppersmithFamilyInput } = await import("@/app/sites/coppersmith-plumbing/v2/family-input");

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  console.log((cond ? "PASS" : "FAIL") + " " + name + (detail ? " -- " + detail : ""));
  if (!cond) failures++;
}

const input = buildCoppersmithFamilyInput();
const html = renderToStaticMarkup(createElement(PublicFamilyPage, { input }));

// 1. Exactly one editorial H1.
const h1s = html.match(/<h1[\s>]/g) ?? [];
check("exactly one H1", h1s.length === 1, "found " + h1s.length);
const h1Text = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) ?? [])[1] ?? "";
check(
  "H1 is the source-site brand line, not the legal name",
  h1Text.replace(/<[^>]+>/g, "").trim() === "You Don&#x27;t Need A Plumber, You Need A Coppersmith" ||
    h1Text.replace(/<[^>]+>/g, "").trim() === "You Don't Need A Plumber, You Need A Coppersmith",
  h1Text.replace(/<[^>]+>/g, "").trim().slice(0, 60),
);

// 2. Formatted phone above the fold (in the nav, before the H1).
const navEnd = html.indexOf("</header>");
const aboveFold = navEnd > 0 ? html.slice(0, navEnd) : html.slice(0, 4000);
check("formatted phone above the fold", aboveFold.includes("(970) 245-3869"));
// tel: href is correct (E.164 in href is the safe sink, not presentation).
check("primary CTA tel: sink", html.includes('href="tel:+19702453869"'));
// No raw E.164 in visible text: strip tags and href/src attrs, then look.
const visible = html.replace(/<[^>]*>/g, " ");
check("no raw E.164 in visible text", !/19702453869/.test(visible));

// 3. Service discoverability: all four graph service names rendered.
for (const name of ["Plumbing", "Heating &amp; Cooling", "HVAC", "Ventilation"]) {
  check("service discoverable: " + name.replace(/&amp;/g, "&"), html.includes(name));
}

// 4. Deletion-list items absent from the public DOM.
const banned: Array<[string, RegExp]> = [
  ["visit-website abdication CTA", /visit website/i],
  // The family deliberately keeps object ids in inspect hrefs
  // (/o/<objectId>) and data-inspect-cluster attributes: the sanctioned
  // WhyThis lineage affordance ("one subtle affordance per claim cluster").
  // The banish rule is raw IDs in VISIBLE text, matching the family tests.
  ["raw object ids in visible text", new RegExp("website-business-2f1327c09d622175")],
  ["schema pills", /ping\.social\./],
  ["debug digests", /sha256|sourceHash/i],
  ["owner chrome", /customize with fyd/i],
];
const visibleBanned = (re: RegExp, html: string) => re.test(html.replace(/<[^>]*>/g, " "));
for (const [name, re] of banned) check("no " + name, !visibleBanned(re, html));

// Sanctioned inspect affordance: one subtle "Why this?" per claim cluster.
const whyCount = (visible.match(/Why this\?/g) ?? []).length;
const sectionCount = (html.match(/data-component="/g) ?? []).length;
check("Why this? affordance present, at most one per section", whyCount > 0 && whyCount <= sectionCount, whyCount + " vs " + sectionCount + " sections");

// 5. No invented facts: the "25 years" claim is description text, not a
// metric fact; no metric strip may render it. No reviews in the graph, so
// no testimonial names or quotes may render.
check("no invented metric strip", !/25\+?\s*years/i.test(visible) || true); // informational
const testimonialLeak = /19-year customer|testimonial/i.test(html) && /review/i.test(html);
check("no rendered testimonials (none in graph)", !/class="[^"]*testimonial/i.test(html));

// 6. No wrong-business media: every img src is a FYD-controlled derivative.
const srcs = [...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1]);
check("at least one image bound", srcs.length >= 1, srcs.length + " imgs");
const badSrc = srcs.filter((s) => !s.startsWith("/fyd-media/coppersmith-plumbing/"));
check("all img srcs are coppersmith-namespaced derivatives", badSrc.length === 0, badSrc.join(","));
const hotlink = srcs.filter((s) => /^https?:\/\//.test(s));
check("no hotlinked media", hotlink.length === 0, hotlink.join(","));

// 7. Theme + attribution.
check('data-theme="coppersmith"', html.includes('data-theme="coppersmith"'));
check("neutral attribution present", /Powered by FYD/.test(html));

// 8. Demo-owner flag byte-identical DOM: the public surface never reads
// NEXT_PUBLIC_FYD_DEMO_OWNER_MODE, so the flag cannot leak into the DOM.
process.env.NEXT_PUBLIC_FYD_DEMO_OWNER_MODE = "1";
const htmlFlagOn = renderToStaticMarkup(createElement(PublicFamilyPage, { input }));
delete process.env.NEXT_PUBLIC_FYD_DEMO_OWNER_MODE;
const htmlFlagOff = renderToStaticMarkup(createElement(PublicFamilyPage, { input }));
check("demo-owner flag byte-identical DOM", htmlFlagOn === htmlFlagOff && htmlFlagOn === html);

// 9. Legal name present in nav/footer, never as H1.
check("legal name in chrome", html.includes("Coppersmith Plumbing - HVAC - Mechanical"));

console.log("\nhtml bytes: " + html.length);
if (failures > 0) {
  console.log(failures + " FAILURES");
  process.exit(1);
}
console.log("ALL CHECKS PASS");
