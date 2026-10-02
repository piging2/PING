/**
 * Generator composition tests (P3/P4/P8/P10/P11, B3, B6): the composition
 * profile orders and treats sections without creating or deleting them,
 * and SocialProof emits only behind the verified-testimonials gate.
 */

import type { PingObject, PingRelationship } from "@/lib/ping/types";
import { DEFAULT_FYD_THEME } from "../../sitespec/types";
import { generateSiteSpec } from "../generator";
import {
  DEFAULT_COMPOSITION_PROFILE,
  resolveCompositionProfile,
  type SiteCompositionProfile,
} from "../../compose/profile";
import type { ObjectGraph } from "../../sitespec/types";

const AT = "2026-09-21T12:00:00.000Z";
const OPTS = { generatedAt: AT, eventSequences: [65, 83] as [number, number] };

const VERIFIED_PROVENANCE = {
  kind: "website-derived" as const,
  ref: "website-ingestion:test",
  derivedAt: AT,
};

/** Rich synthetic graph: owner + service + location + person + post. */
function richGraph(withTestimonials: "verified" | "unverified" | "none"): {
  objects: PingObject[];
  relationships: PingRelationship[];
} {
  const mk = (
    id: string,
    schema: string,
    title: string,
    fields: Record<string, string | string[]> = {},
    provenance = VERIFIED_PROVENANCE,
  ): PingObject => ({
    id,
    schema,
    controllerId: "c1",
    visibility: "public",
    title,
    description: "",
    fields,
    createdAt: AT,
    updatedAt: AT,
    provenance,
  });
  const ownerFields: Record<string, string | string[]> = {
    phone: "555-0100",
    socials: "https://example.com",
  };
  if (withTestimonials === "verified") {
    ownerFields.testimonials = ["Great work, on time and tidy."];
  } else if (withTestimonials === "unverified") {
    ownerFields.testimonials = ["Great work, on time and tidy."];
  }
  const owner = mk("owner-1", "ping.social.business@1", "Acme Plumbing", ownerFields,
    withTestimonials === "unverified"
      ? { kind: "website-derived" as const, ref: "", derivedAt: AT }
      : VERIFIED_PROVENANCE,
  );
  owner.description = "We fix leaks.";
  const service = mk("svc-1", "ping.social.service@1", "Drain cleaning");
  const location = mk("loc-1", "ping.social.location@1", "Grand Junction");
  const person = mk("per-1", "ping.social.person@1", "Sam Rivera");
  const post = mk("post-1", "ping.social.post@1", "Shop update");
  const rel = (id: string, predicate: string, object: string): PingRelationship => ({
    id,
    subject: owner.id,
    predicate,
    object,
    status: "active",
    createdAt: AT,
    evidenceRef: "ev",
  });
  return {
    objects: [owner, service, location, person, post],
    relationships: [
      rel("r1", "provides", service.id),
      rel("r2", "located_at", location.id),
      rel("r3", "employs", person.id),
      rel("r4", "publishes", post.id),
    ],
  };
}

function homeComponents(spec: { pages: { slug: string; sections: { component: string }[] }[] }): string[] {
  const home = spec.pages.find((p) => p.slug === "home");
  if (!home) throw new Error("no home page");
  return home.sections.map((s) => s.component);
}

function profile(over: Partial<SiteCompositionProfile>): SiteCompositionProfile {
  return { ...DEFAULT_COMPOSITION_PROFILE, ...over };
}

describe("composition defaults", () => {
  test("absent profile reproduces the historical emission order", () => {
    const spec = generateSiteSpec(richGraph("none"), OPTS);
    expect(homeComponents(spec)).toEqual([
      "Hero",
      "BusinessSummary",
      "Services",
      "Locations",
      "People",
      "RecentObjects",
      "Contact",
      "Links",
      "CTA",
      "AskFYD",
      "ObjectRail",
    ]);
    expect(spec.pages.map((p) => p.slug)).toEqual(["home", "about", "services", "explore"]);
    expect(spec.themeTokens).toEqual(DEFAULT_FYD_THEME);
  });
});

describe("P3 home section order", () => {
  test("a custom order reorders without creating or deleting sections", () => {
    const spec = generateSiteSpec(richGraph("none"), {
      ...OPTS,
      composition: profile({ homeSectionOrder: ["Hero", "CTA", "Services"] }),
    });
    const components = homeComponents(spec);
    expect(components.slice(0, 3)).toEqual(["Hero", "CTA", "Services"]);
    // Unlisted sections keep emission order at the end.
    expect(components.slice(3)).toEqual([
      "BusinessSummary",
      "Locations",
      "People",
      "RecentObjects",
      "Contact",
      "Links",
      "AskFYD",
      "ObjectRail",
    ]);
    // Section ids follow the new order.
    const home = spec.pages.find((p) => p.slug === "home");
    expect(home?.sections[0].id).toBe("home:Hero:0");
    expect(home?.sections[1].id).toBe("home:CTA:1");
  });

  test("unknown ids in the order list are dropped", () => {
    const spec = generateSiteSpec(richGraph("none"), {
      ...OPTS,
      composition: profile({ homeSectionOrder: ["Hero", "Nope", "CTA"] }),
    });
    const components = homeComponents(spec);
    expect(components).not.toContain("Nope");
    expect(components.slice(0, 2)).toEqual(["Hero", "CTA"]);
  });
});

describe("P4 page order", () => {
  test("pages reorder from the profile", () => {
    const spec = generateSiteSpec(richGraph("none"), {
      ...OPTS,
      composition: profile({ pageOrder: ["explore", "home", "about", "services"] }),
    });
    expect(spec.pages.map((p) => p.slug)).toEqual(["explore", "home", "about", "services"]);
    expect(spec.navigation.map((n) => n.pageSlug)).toEqual(["explore", "home", "about", "services"]);
  });
});

describe("P8 CTA emphasis", () => {
  test("elevated moves the CTA just after the Hero and stamps the marker", () => {
    const spec = generateSiteSpec(richGraph("none"), {
      ...OPTS,
      composition: profile({ ctaEmphasis: "elevated" }),
    });
    const components = homeComponents(spec);
    expect(components[0]).toBe("Hero");
    expect(components[1]).toBe("CTA");
    const cta = spec.pages.find((p) => p.slug === "home")?.sections[1];
    expect(cta?.presentation.ctaEmphasis).toBe("elevated");
  });

  test("quiet moves the CTA last and stamps the marker", () => {
    const spec = generateSiteSpec(richGraph("none"), {
      ...OPTS,
      composition: profile({ ctaEmphasis: "quiet" }),
    });
    const components = homeComponents(spec);
    expect(components[components.length - 1]).toBe("CTA");
    const cta = spec.pages
      .find((p) => p.slug === "home")
      ?.sections.find((s) => s.component === "CTA");
    expect(cta?.presentation.ctaEmphasis).toBe("quiet");
  });

  test("standard leaves the CTA at its emission position with no marker", () => {
    const spec = generateSiteSpec(richGraph("none"), {
      ...OPTS,
      composition: profile({ ctaEmphasis: "standard" }),
    });
    const components = homeComponents(spec);
    expect(components.indexOf("CTA")).toBe(8);
    const cta = spec.pages
      .find((p) => p.slug === "home")
      ?.sections.find((s) => s.component === "CTA");
    expect(cta?.presentation.ctaEmphasis).toBeUndefined();
    expect(cta?.presentation).toEqual({});
  });
});

describe("B3 two profiles, one graph", () => {
  test("different composition policies compose different specs deterministically", () => {
    const graph = richGraph("none") as ObjectGraph;
    const a = resolveCompositionProfile({
      category: "trade",
      graph,
      tenantRecord: profile({ ctaEmphasis: "elevated" }),
    });
    const b = resolveCompositionProfile({
      category: "knowledge",
      graph,
      tenantRecord: profile({ ctaEmphasis: "quiet" }),
    });
    const specA = generateSiteSpec(graph, { ...OPTS, composition: a });
    const specB = generateSiteSpec(graph, { ...OPTS, composition: b });
    const compsA = homeComponents(specA);
    const compsB = homeComponents(specB);
    expect(compsA[1]).toBe("CTA");
    expect(compsB[compsB.length - 1]).toBe("CTA");
    // Deterministic: same inputs, same bytes.
    expect(JSON.stringify(generateSiteSpec(graph, { ...OPTS, composition: a }))).toBe(
      JSON.stringify(specA),
    );
  });
});

describe("B6 SocialProof emission gate", () => {
  test("verified testimonials emit SocialProof in its canonical slot", () => {
    const spec = generateSiteSpec(richGraph("verified"), OPTS);
    const components = homeComponents(spec);
    expect(components).toContain("SocialProof");
    // Canonical slot: after Products when products exist, else after Services.
    expect(components.indexOf("SocialProof")).toBe(components.indexOf("Services") + 1);
  });

  test("unverified testimonial text emits no section", () => {
    const spec = generateSiteSpec(richGraph("unverified"), OPTS);
    expect(homeComponents(spec)).not.toContain("SocialProof");
  });

  test("no testimonials emits no section", () => {
    const spec = generateSiteSpec(richGraph("none"), OPTS);
    expect(homeComponents(spec)).not.toContain("SocialProof");
  });
});

describe("P10/P11 theme composition", () => {
  test("layoutCharacter and token overrides compose onto the theme", () => {
    const spec = generateSiteSpec(richGraph("none"), {
      ...OPTS,
      composition: profile({
        layoutCharacter: "CRAFT",
        themeTokenOverrides: { accent: "#123456" },
      }),
    });
    expect(spec.themeTokens.layoutCharacter).toBe("CRAFT");
    expect(spec.themeTokens.accent).toBe("#123456");
    expect(spec.themeTokens.ink).toBe(DEFAULT_FYD_THEME.ink);
  });

  test("null character and empty overrides leave the judged default untouched", () => {
    const spec = generateSiteSpec(richGraph("none"), {
      ...OPTS,
      composition: profile({ layoutCharacter: null, themeTokenOverrides: {} }),
    });
    expect(spec.themeTokens).toEqual(DEFAULT_FYD_THEME);
  });
});

describe("P9 nav labels", () => {
  test("tab labels derive from slugs, no hardcoded list", () => {
    const spec = generateSiteSpec(richGraph("none"), OPTS);
    expect(spec.navigation).toEqual([
      { label: "Home", pageSlug: "home" },
      { label: "About", pageSlug: "about" },
      { label: "Services", pageSlug: "services" },
      { label: "Explore", pageSlug: "explore" },
    ]);
  });
});
