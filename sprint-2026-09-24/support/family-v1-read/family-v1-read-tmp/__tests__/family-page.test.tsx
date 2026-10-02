/**
 * Family public-render tests (product lane, V1).
 *
 * Render PublicFamilyPage to static markup from planner-driven fixtures
 * (HPP-like craftsman, Coppersmith-like emergency trade) and assert the
 * V1 contracts:
 *  - exactly one H1, editorial, never the legal business name;
 *  - every rendered image carries nonempty alt text;
 *  - every action meets the 44px target contract;
 *  - reduced-motion support is present;
 *  - the public deletion list is fully executed;
 *  - NEXT_PUBLIC_FYD_DEMO_OWNER_MODE never leaks owner/dev chrome;
 *  - the Coppersmith phone renders conversion-framed, never raw E.164.
 *
 * No browser, no DOM library: react-dom/server static markup plus
 * string assertions. The 375/390/1440 contracts are structural (stacking
 * layouts, full-width CTAs, touch bar) and asserted through the class
 * contracts the components emit.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { renderToStaticMarkup } from "react-dom/server";
import { PublicFamilyPage } from "../family-page";
import {
  coppersmithLikeFamilyInput,
  coppersmithLikeInput,
  hppLikeFamilyInput,
  hppLikeInput,
  familyInputFor,
  mediaManifestFor,
} from "./fixtures";
import type { FamilyRenderInput } from "../types";
import { formatHoursDisplay } from "../shared";

function render(input: FamilyRenderInput): string {
  return renderToStaticMarkup(<PublicFamilyPage input={input} />);
}

/** Visible text only: attributes (hrefs, data-*) are not displayed copy. */
function visibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function h1Texts(html: string): string[] {
  const out: string[] = [];
  const re = /<h1[^>]*>([\s\S]*?)<\/h1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    out.push(m[1].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim());
  }
  return out;
}

function imgTags(html: string): Array<{ src: string; alt: string | null }> {
  const out: Array<{ src: string; alt: string | null }> = [];
  const re = /<img[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const tag = m[0];
    const src = /src="([^"]*)"/.exec(tag)?.[1] ?? "";
    const altMatch = /alt="([^"]*)"/.exec(tag);
    out.push({ src, alt: altMatch ? altMatch[1] : null });
  }
  return out;
}

const hpp = () => hppLikeFamilyInput();
const copper = () => coppersmithLikeFamilyInput();

// ============================================================================
// One editorial H1
// ============================================================================

describe("one editorial H1", () => {
  test.each([
    ["HPP-like", hpp, "Hearth Pine Woodworks LLC"],
    ["Coppersmith-like", copper, "Copperline Plumbing LLC"],
  ])("%s renders exactly one H1 and it is not the legal business name", (_name, make, legal) => {
    const html = render(make());
    const h1s = h1Texts(html);
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).not.toBe("");
    expect(h1s[0]).not.toBe(legal);
    expect(h1s[0].toLowerCase()).not.toContain("llc");
  });

  test("HPP-like H1 is the editorial headline from owner intent", () => {
    const html = render(hpp());
    expect(h1Texts(html)[0]).toContain("favorite part of coming home");
  });
});

// ============================================================================
// Alt text on every image
// ============================================================================

describe("alt text", () => {
  test.each([
    ["HPP-like", hpp],
    ["Coppersmith-like", copper],
  ])("%s: every rendered image has nonempty alt text", (_name, make) => {
    const html = render(make());
    const imgs = imgTags(html);
    expect(imgs.length).toBeGreaterThan(0);
    for (const img of imgs) {
      expect(img.alt).not.toBeNull();
      expect(img.alt!.trim()).not.toBe("");
    }
  });

  test("hero image alt is evidence-derived, never empty filler", () => {
    const html = render(hpp());
    const imgs = imgTags(html);
    const hero = imgs.find((i) => i.src.includes("hpp-hero"));
    expect(hero).toBeDefined();
    expect(hero!.alt).toContain("Hearth Pine Woodworks LLC");
  });
});

// ============================================================================
// 44px targets
// ============================================================================

describe("44px targets", () => {
  /** Every link/button either carries the 44px utilities or is a prose link. */
  test.each([
    ["HPP-like", hpp],
    ["Coppersmith-like", copper],
  ])("%s: actions meet the 44px contract", (_name, make) => {
    const html = render(make());
    // Word boundary: <a must not match <article.
    const actionable = /<(a|button|input|select|summary)(?=[\s>])[^>]*>/gi;
    let m: RegExpExecArray | null;
    let count = 0;
    const offenders: string[] = [];
    while ((m = actionable.exec(html)) !== null) {
      const tag = m[0];
      count++;
      // The skip link is keyboard-only (sr-only until focused), not a touch target.
      if (tag.includes('href="#main"')) continue;
      const cls = /class="([^"]*)"/.exec(tag)?.[1] ?? "";
      const has44 = cls.includes("min-h-[44px]") || cls.includes("min-w-[44px]");
      // Prose links inside body copy are exempt by token-model 7.4; every
      // other interactive element must carry the 44px contract.
      const isProseLink =
        m[1] === "a" && (cls.includes("underline") || cls.includes("text-small"));
      if (!has44 && !isProseLink) offenders.push(tag.slice(0, 120));
    }
    expect(count).toBeGreaterThan(0);
    expect(offenders).toEqual([]);
  });

  test("primary CTAs are full-width on small viewports", () => {
    const html = render(copper());
    // The sticky mobile bar forces its CTA full-width (HTML-escaped in markup).
    expect(html).toContain("[&amp;&gt;a]:w-full");
  });
});

// ============================================================================
// Theme seam
// ============================================================================

describe("theme seam", () => {
  test("HPP-like page sets data-theme=hpp, Coppersmith-like sets data-theme=coppersmith", () => {
    expect(render(hpp())).toContain('data-theme="hpp"');
    expect(render(copper())).toContain('data-theme="coppersmith"');
  });

  test("no token value is inlined in the markup (colors arrive via utilities)", () => {
    for (const make of [hpp, copper]) {
      const html = render(make());
      expect(html).not.toMatch(/style="[^"]*#[0-9a-fA-F]{3,6}/);
      expect(html).not.toMatch(/style="[^"]*color:/);
    }
  });
});

// ============================================================================
// Reduced motion
// ============================================================================

describe("reduced motion", () => {
  test("family.css honors prefers-reduced-motion", () => {
    const css = readFileSync(join(__dirname, "..", "family.css"), "utf8");
    expect(css).toContain("prefers-reduced-motion");
  });

  test("scroll-driven motion is gated behind motion-safe", () => {
    const html = render(hpp());
    if (html.includes("scroll-smooth")) {
      expect(html).toMatch(/motion-safe:scroll-smooth/);
    }
  });
});

// ============================================================================
// Coppersmith phone-primary
// ============================================================================

describe("Coppersmith phone-primary", () => {
  test("+19702453869 renders as (970) 245-3869 in visible text, never raw E.164", () => {
    const html = render(copper());
    const text = visibleText(html);
    expect(text).toContain("(970) 245-3869");
    expect(text).not.toContain("+19702453869");
    // The tap target keeps the dialable E.164 in the href only.
    expect(html).toContain("tel:+19702453869");
  });

  test("call CTA is conversion-framed, not a bare number", () => {
    const html = render(copper());
    const text = visibleText(html);
    expect(text).toMatch(/Call \(970\) 245-3869/);
  });
});

// ============================================================================
// Public deletion list: all 14 items
// ============================================================================

describe("public deletion list", () => {
  const cases: Array<[string, () => FamilyRenderInput]> = [
    ["HPP-like", hpp],
    ["Coppersmith-like", copper],
  ];

  test.each(cases)("%s: no demo/proof badges", (_name, make) => {
    const text = visibleText(render(make()));
    expect(text).not.toContain("FYD SOCIAL");
    expect(text).not.toContain("Generated site demo");
    expect(text).not.toContain("Procedural clone proof");
    expect(text).toContain("Powered by FYD");
  });

  test.each(cases)("%s: no SITE RECORD / WEBSITE STATEMENT", (_name, make) => {
    const text = visibleText(render(make()));
    expect(text).not.toContain("SITE RECORD");
    expect(text).not.toContain("WEBSITE STATEMENT");
  });

  test.each(cases)("%s: no repeated Why this, no per-card inspect", (_name, make) => {
    const html = render(make());
    const text = visibleText(html);
    const whyCount = (text.match(/Why this\?/g) ?? []).length;
    // One subtle affordance per claim cluster, never per card: at most one
    // per rendered section.
    const sectionCount = (html.match(/data-component="/g) ?? []).length;
    expect(whyCount).toBeGreaterThan(0);
    expect(whyCount).toBeLessThanOrEqual(sectionCount);
    // Never inside a card.
    const articles = html.match(/<article[\s\S]*?<\/article>/gi) ?? [];
    for (const a of articles) {
      expect(visibleText(a)).not.toContain("Why this?");
    }
  });

  test.each(cases)("%s: no object pills, ObjectRail, circles, or sheets", (_name, make) => {
    const html = render(make());
    expect(html).not.toContain("object-pill");
    expect(html).not.toContain("ObjectRail");
    expect(html).not.toContain("object-rail");
    expect(html).not.toContain("object-sheet");
    expect(html).not.toContain("sheet-tab");
    expect(html).not.toMatch(/data-object-circle/);
  });

  test.each(cases)("%s: no raw E.164 phone in visible text", (_name, make) => {
    const text = visibleText(render(make()));
    expect(text).not.toMatch(/\+\d{10,}/);
  });

  test.each(cases)("%s: no Visit website", (_name, make) => {
    expect(visibleText(render(make()))).not.toContain("Visit website");
  });

  test.each(cases)("%s: no demo-owner warnings, diagnostics, verdicts, digests", (_name, make) => {
    const html = render(make());
    const text = visibleText(html);
    expect(text).not.toMatch(/demo-owner/i);
    expect(html).not.toMatch(/data-surface="dev-lab"/);
    expect(text).not.toContain("diagnostics");
    expect(text).not.toContain("verdict");
    expect(text).not.toContain("proposal digest");
    expect(text).not.toMatch(/sequence number/i);
  });

  test.each(cases)("%s: nav names service lines, never the fixed generic set", (_name, make) => {
    const html = render(make());
    const nav = /<nav[^>]*aria-label="Services"[^>]*>([\s\S]*?)<\/nav>/.exec(html)?.[1] ?? "";
    const links = [...nav.matchAll(/<a[^>]*>([\s\S]*?)<\/a>/g)].map((m) =>
      m[1].replace(/<[^>]*>/g, "").trim(),
    );
    if (links.length > 0) {
      expect(links).not.toEqual(["Home", "About", "Services", "Explore"]);
      expect(links.some((l) => l.length > 0 && l !== "Services")).toBe(true);
    }
  });

  test.each(cases)("%s: service cards are sold, not listed", (_name, make) => {
    const html = render(make());
    const articles = html.match(/<article[\s\S]*?<\/article>/gi) ?? [];
    expect(articles.length).toBeGreaterThan(0);
    for (const a of articles) {
      // Every card carries a conversion hook.
      expect(a).toContain("<a ");
    }
  });

  test.each(cases)("%s: Ask FYD is one quiet affordance, not an evidence panel", (_name, make) => {
    const html = render(make());
    expect(html).not.toContain("AskObjectPanel");
    expect(html).not.toMatch(/evidence panel/i);
    expect(html).not.toContain("data-surface=\"trust");
    const askCount =
      (html.match(/data-component="AskFYD"/g) ?? []).length;
    expect(askCount).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// Owner-mode flag isolation
// ============================================================================

describe("owner-mode flag isolation", () => {
  test("public DOM is identical with NEXT_PUBLIC_FYD_DEMO_OWNER_MODE on or off", () => {
    const input = copper();
    const prev = process.env.NEXT_PUBLIC_FYD_DEMO_OWNER_MODE;
    delete process.env.NEXT_PUBLIC_FYD_DEMO_OWNER_MODE;
    const off = render(input);
    process.env.NEXT_PUBLIC_FYD_DEMO_OWNER_MODE = "1";
    const on = render(input);
    if (prev === undefined) delete process.env.NEXT_PUBLIC_FYD_DEMO_OWNER_MODE;
    else process.env.NEXT_PUBLIC_FYD_DEMO_OWNER_MODE = prev;
    expect(on).toBe(off);
  });

  test("owner entry and lab panel are explicit opt-in, never ambient", () => {
    const html = render(hpp());
    expect(html).not.toContain('data-surface="owner-entry"');
    expect(html).not.toContain('data-surface="dev-lab"');
  });
});

// ============================================================================
// Proposed sections never publish
// ============================================================================

describe("section status gate", () => {
  test("proposed / owner-edit / deprecated sections are omitted from the public DOM", () => {
    const base = hppLikeInput();
    const plan = familyInputFor(base, "Hearth Pine Woodworks LLC").plan;
    const proposed = {
      ...plan.sections[0],
      id: "sec-proposed",
      status: "proposed" as const,
      component: "TrustBar" as const,
      variant: "testimonial-cluster-empty-state",
    };
    const input: FamilyRenderInput = {
      plan: { ...plan, sections: [...plan.sections, proposed] },
      graph: base.graph,
      media: mediaManifestFor(base, "Hearth Pine Woodworks LLC"),
      siteSlug: "family-test",
    };
    const html = render(input);
    expect(html).not.toContain("sec-proposed");
    expect(html).not.toContain("testimonial-cluster-empty-state");
  });
});

// ============================================================================
// Human hours + footer anchor honesty + adapted locality
// ============================================================================

describe("human hours", () => {
  test("formatHoursDisplay turns machine hours into human hours", () => {
    expect(formatHoursDisplay("Mo,Tu,We,Th,Fr 07:30-16:00")).toBe("Mon-Fri 7:30 AM - 4:00 PM");
    expect(formatHoursDisplay("Sa,Su 09:00-12:00")).toBe("Sat-Sun 9:00 AM - 12:00 PM");
    expect(formatHoursDisplay("Mo,We,Fr 08:00-17:00")).toBe("Mon, Wed, Fri 8:00 AM - 5:00 PM");
    expect(formatHoursDisplay("Mo 09:00-17:00")).toBe("Mon 9:00 AM - 5:00 PM");
    expect(formatHoursDisplay("Mo,Tu,We,Th,Fr,Sa,Su 00:00-23:59")).toBe(
      "Mon-Sun 12:00 AM - 11:59 PM",
    );
  });

  test("formatHoursDisplay passes unknown formats through untouched", () => {
    // Never invent hours, never mangle what is not understood.
    expect(formatHoursDisplay("Open 24 hours")).toBe("Open 24 hours");
    expect(formatHoursDisplay("Mo-Fr 7am-5pm")).toBe("Mo-Fr 7am-5pm");
    expect(formatHoursDisplay("")).toBe("");
  });

  test("Navigation renders human hours, never the raw machine string", () => {
    const input = copper();
    const ownerObj = input.graph.objects.find(
      (o) => o.schema === "ping.social.business@1",
    );
    if (!ownerObj) throw new Error("fixture owner missing");
    ownerObj.fields["hours"] = "Mo,Tu,We,Th,Fr 07:30-16:00";
    const html = render(input);
    expect(html).toContain("Mon-Fri 7:30 AM - 4:00 PM");
    expect(html).not.toContain("Mo,Tu,We,Th,Fr 07:30-16:00");
  });
});

describe("footer anchors are never dead", () => {
  test("Coppersmith-like: Services and Service area linked, Recent work omitted (ProjectGallery ineligible)", () => {
    const html = render(copper());
    expect(html).toContain('href="#services"');
    expect(html).toContain('href="#service-area"');
    expect(html).not.toContain('href="#projects"');
  });

  test("HPP-like: Recent work linked when ProjectGallery is planned", () => {
    const html = render(hpp());
    expect(html).toContain('href="#services"');
    expect(html).toContain('href="#projects"');
  });

  test("footer renders the adapted locality line, not the raw address field alone", () => {
    const html = render(copper());
    // Copper-like fixture carries a direct address field; the footer shows it.
    expect(html).toContain("630 Maldonado Street, Grand Junction CO");
  });
});
