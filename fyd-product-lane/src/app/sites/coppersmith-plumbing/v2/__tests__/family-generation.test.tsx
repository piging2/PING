/**
 * Scoped Coppersmith family-generation tests (product lane).
 *
 * End-to-end through the deterministic builder:
 * pinned graph fixture + pinned production media manifest + pinned
 * presentation observation -> score.ts verdicts -> planPage() ->
 * PublicFamilyPage (coppersmith theme).
 *
 * No browser, no network, no clock: react-dom/server static markup plus
 * string assertions. These are the Coppersmith must-win preconditions for
 * the owner test: one editorial H1, formatted phone above the fold, dual
 * conversion (call + schedule/installation), service discoverability,
 * honest absence (no testimonials, no products, no metric strip), and
 * byte-identical DOM under the demo-owner flag.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { PublicFamilyPage } from "@/fyd/family/family-page";
import type { FamilyRenderInput } from "@/fyd/family/types";
import { COPPERSMITH_GRAPH } from "@/fyd/proceduralize/__fixtures__/coppersmith-graph";
import {
  buildFamilyInput,
  buildFamilyPlan,
} from "@/app/sites/_shared/family-input";

const SITE_ID = "coppersmith-plumbing";
const buildCoppersmithFamilyInput = () => buildFamilyInput(SITE_ID);
const buildCoppersmithPlan = () => buildFamilyPlan(SITE_ID);

function render(input: FamilyRenderInput): string {
  return renderToStaticMarkup(<PublicFamilyPage input={input} />);
}

/** Visible text only: attributes (hrefs, data-*) are not displayed copy. */
function visibleText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function graphServiceTitles(): string[] {
  return COPPERSMITH_GRAPH.objects
    .filter((o) => o.schema === "website.service@1" && o.visibility === "public")
    .map((o) => o.title.trim());
}

describe("deterministic generation", () => {
  test("planPage is deterministic across builds", () => {
    const a = JSON.stringify(buildCoppersmithPlan());
    const b = JSON.stringify(buildCoppersmithPlan());
    expect(a).toBe(b);
  });

  test("full input builds and renders to non-empty HTML", () => {
    const html = render(buildCoppersmithFamilyInput());
    expect(html.length).toBeGreaterThan(1000);
  });

  test("SSR is byte-identical for the same input", () => {
    const input = buildCoppersmithFamilyInput();
    expect(render(input)).toBe(render(input));
  });

  test("demo-owner flag cannot leak into the public DOM", () => {
    const input = buildCoppersmithFamilyInput();
    process.env.NEXT_PUBLIC_FYD_DEMO_OWNER_MODE = "1";
    const on = render(input);
    delete process.env.NEXT_PUBLIC_FYD_DEMO_OWNER_MODE;
    const off = render(input);
    expect(on).toBe(off);
  });
});

describe("headline and conversion", () => {
  test("exactly one H1, the source-site brand line", () => {
    const html = render(buildCoppersmithFamilyInput());
    const h1s = html.match(/<h1[\s>]/g) ?? [];
    expect(h1s.length).toBe(1);
    const h1Text = (/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html) ?? [])[1] ?? "";
    expect(visibleText(h1Text)).toBe(
      "You Don't Need A Plumber, You Need A Coppersmith",
    );
  });

  test("formatted phone above the fold with a tel: sink", () => {
    const html = render(buildCoppersmithFamilyInput());
    const navEnd = html.indexOf("</header>");
    const aboveFold = navEnd > 0 ? html.slice(0, navEnd) : html.slice(0, 4000);
    expect(aboveFold).toContain("(970) 245-3869");
    expect(html).toContain('href="tel:+19702453869"');
    expect(visibleText(html)).not.toMatch(/19702453869/);
  });

  test("dual conversion: Call primary plus Schedule Installation secondary", () => {
    const html = render(buildCoppersmithFamilyInput());
    const text = visibleText(html);
    expect(text).toContain("(970) 245-3869");
    expect(text).toContain("Schedule Installation");
  });
});

describe("service discoverability", () => {
  test("all four graph services are discoverable in the DOM", () => {
    const html = render(buildCoppersmithFamilyInput());
    for (const title of graphServiceTitles()) {
      expect(html).toContain(title);
    }
  });

  test("taxonomic nav names the graph service lines", () => {
    const html = render(buildCoppersmithFamilyInput());
    const nav = /<nav[^>]*aria-label="Services"[^>]*>([\s\S]*?)<\/nav>/.exec(html)?.[1] ?? "";
    for (const title of graphServiceTitles()) {
      expect(nav).toContain(title);
    }
  });
});

describe("public deletion list (Coppersmith)", () => {
  test("no banned terms in visible text", () => {
    const text = visibleText(render(buildCoppersmithFamilyInput()));
    expect(text).not.toContain("Visit website");
    expect(text).not.toContain("FYD SOCIAL");
    expect(text).not.toContain("SITE RECORD");
    expect(text).not.toContain("WEBSITE STATEMENT");
    expect(text).not.toMatch(/demo-owner/i);
    expect(text).not.toMatch(/\+\d{10,}/);
  });

  test("no raw object ids in visible text (inspect hrefs are the sanctioned affordance)", () => {
    const text = visibleText(render(buildCoppersmithFamilyInput()));
    expect(text).not.toMatch(/website-business-[0-9a-f]{16}/);
  });
});

describe("honest absence: no unsupported claims", () => {
  test("no testimonials render (the graph has no review objects)", () => {
    const html = render(buildCoppersmithFamilyInput());
    const text = visibleText(html);
    expect(html).not.toContain('data-component="TrustBar"');
    expect(text).not.toMatch(/testimonial/i);
    expect(text).not.toMatch(/review/i);
    expect(text).not.toMatch(/stars/i);
  });

  test("no products or prices render (the graph has no product objects)", () => {
    const text = visibleText(render(buildCoppersmithFamilyInput()));
    expect(text).not.toMatch(/\$\d/);
  });

  test("hero subhead traces exactly to the graph description's first sentence", () => {
    const html = render(buildCoppersmithFamilyInput());
    const owner = COPPERSMITH_GRAPH.objects.find(
      (o) => o.schema === "ping.social.business@1" && o.visibility === "public",
    );
    const firstSentence = String(owner?.fields["description"] ?? "")
      .split(/(?<=[.!?])\s/)[0]
      ?.trim();
    expect(firstSentence).toBeTruthy();
    expect(visibleText(html)).toContain(firstSentence!.replace(/&/g, "&"));
  });
});

describe("media provenance", () => {
  test("every img is a coppersmith-namespaced FYD derivative, never a hotlink", () => {
    const html = render(buildCoppersmithFamilyInput());
    const srcs = [...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1]);
    expect(srcs.length).toBeGreaterThan(0);
    for (const s of srcs) {
      expect(s.startsWith("/fyd-media/coppersmith-plumbing/")).toBe(true);
    }
  });

  test("every img carries nonempty alt text", () => {
    const html = render(buildCoppersmithFamilyInput());
    const alts = [...html.matchAll(/<img[^>]+alt="([^"]*)"/g)].map((m) => m[1]);
    expect(alts.length).toBeGreaterThan(0);
    for (const a of alts) {
      expect(a.trim().length).toBeGreaterThan(0);
    }
  });

  test('theme seam is data-theme="coppersmith"', () => {
    const html = render(buildCoppersmithFamilyInput());
    expect(html).toContain('data-theme="coppersmith"');
  });
});

describe("gap fixes (product lane)", () => {
  test("FeaturedService is eligible: three distinct service lines are planned", () => {
    const plan = buildCoppersmithPlan();
    const featured = plan.sections.filter((s) => s.component === "FeaturedService");
    expect(featured.length).toBe(3);
    expect(
      new Set(featured.flatMap((s) => s.objectBindings[0].objectIds)).size,
    ).toBe(3);
    // Each featured line's title is discoverable in the rendered DOM.
    const html = render(buildCoppersmithFamilyInput());
    const text = visibleText(html);
    const titlesById = new Map(
      COPPERSMITH_GRAPH.objects.map((o) => [o.id, o.title.trim()]),
    );
    for (const s of featured) {
      const title = titlesById.get(s.objectBindings[0].objectIds[0]) ?? "";
      expect(text).toContain(title);
    }
  });

  test("ServiceArea is eligible: hub-address renders the Grand Junction locality", () => {
    const plan = buildCoppersmithPlan();
    const area = plan.sections.filter((s) => s.component === "ServiceArea");
    expect(area).toHaveLength(1);
    expect(area[0].variant).toBe("hub-address");
    const html = render(buildCoppersmithFamilyInput());
    // The hub address composes location-object locality fields: never invented.
    expect(html).toContain("Grand Junction");
    expect(html).toContain("81501");
  });

  test("hours render human, never the raw machine string", () => {
    const html = render(buildCoppersmithFamilyInput());
    expect(html).toContain("Mon-Fri 7:30 AM - 4:00 PM");
    expect(html).not.toContain("Mo,Tu,We,Th,Fr 07:30-16:00");
  });

  test("footer anchors are never dead: #service-area linked, #projects absent", () => {
    const html = render(buildCoppersmithFamilyInput());
    expect(html).toContain('href="#service-area"');
    // The linked anchor exists in the DOM (ServiceArea section shell).
    expect(html).toContain('id="service-area"');
    expect(html).not.toContain('href="#projects"');
  });

  test("no portrait role binds without depicts-person evidence", () => {
    const input = buildCoppersmithFamilyInput();
    const bound = input.plan.sections.flatMap((s) => s.mediaBindings);
    expect(
      bound.some((b) => b.role === "owner-portrait" || b.role === "team-photo"),
    ).toBe(false);
  });
});
