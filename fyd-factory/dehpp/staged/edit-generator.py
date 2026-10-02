#!/usr/bin/env python3
"""DEHPP generator edits: P3/P4 order, P8 CTA emphasis, P9 nav labels,
P10/P11 theme tokens, B6 SocialProof emission, B7 comment cleanup."""
import sys

PATH = "src/fyd/proceduralize/generator.ts"

def rep(src, old, new, count=1):
    found = src.count(old)
    assert found == count, f"anchor found {found}x (expected {count}): {old[:80]!r}"
    return src.replace(old, new)

def main():
    with open(PATH) as f:
        src = f.read()

    # G1: imports for composition, binding verification, token merge.
    src = rep(
        src,
        'import { resolveWebsiteUrl } from "../sitespec/graph";\n'
        'import { applyArchetype } from "../archetypes/apply";\n'
        'import type { ArchetypeProfile } from "../archetypes/profiles";',
        'import { resolveWebsiteUrl, verifyPresentationBinding } from "../sitespec/graph";\n'
        'import { applyArchetype, mergeThemeTokens } from "../archetypes/apply";\n'
        'import type { ArchetypeProfile } from "../archetypes/profiles";\n'
        "import {\n"
        "  DEFAULT_COMPOSITION_PROFILE,\n"
        "  DEFAULT_HOME_SECTION_ORDER,\n"
        "  DEFAULT_PAGE_ORDER,\n"
        "  type CtaEmphasis,\n"
        "  type SiteCompositionProfile,\n"
        '} from "../compose/profile";',
    )

    # G2: FYDThemeTokens type import.
    src = rep(
        src,
        "  type FYDSection,\n  type FYDSiteSpec,\n  type ObjectGraph,\n} from \"../sitespec/types\";",
        "  type FYDSection,\n  type FYDSiteSpec,\n"
        "  type FYDThemeTokens,\n"
        '  type ObjectGraph,\n} from "../sitespec/types";',
    )

    # G3: GeneratorOptions gains the composition profile.
    src = rep(
        src,
        "  profile?: ArchetypeProfile;\n}",
        "  profile?: ArchetypeProfile;\n"
        "  /**\n"
        "   * Optional composition profile (P3/P4/P8/P10/P11). Absent: the\n"
        "   * canonical default order table reproduces the historical emission\n"
        "   * order byte-identically. Present: sections/pages are ordered from\n"
        "   * the profile, CTA emphasis is applied, and token overrides compose\n"
        "   * onto the theme.\n"
        "   */\n"
        "  composition?: SiteCompositionProfile;\n}",
    )

    # G4: composition helpers, inserted after the section() constructor.
    src = rep(
        src,
        "  return {\n"
        '    id: pageSlug + ":" + component + ":" + index,\n'
        "    component,\n"
        "    query,\n"
        "    presentation,\n"
        "  };\n"
        "}",
        "  return {\n"
        '    id: pageSlug + ":" + component + ":" + index,\n'
        "    component,\n"
        "    query,\n"
        "    presentation,\n"
        "  };\n"
        "}\n"
        "\n"
        "/**\n"
        ' * Title-case a slug for display ("services" -> "Services"). The\n'
        " * generator never carries a hardcoded English label list; page tab\n"
        " * labels derive from slugs through this deterministic function (P9).\n"
        " */\n"
        "function titleCase(slug: string): string {\n"
        "  return slug\n"
        '    .split("-")\n'
        '    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))\n'
        '    .join(" ");\n'
        "}\n"
        "\n"
        "/** A section as emitted from graph data, before ordering. */\n"
        "interface EmittedSection {\n"
        "  component: string;\n"
        '  query: FYDSection["query"];\n'
        '  presentation: FYDSection["presentation"];\n'
        "}\n"
        "\n"
        "/**\n"
        " * Order emitted sections from the profile homeSectionOrder (P3).\n"
        " * Unknown ids in the order list match nothing and are dropped (the\n"
        " * route seam reports them as validator warnings); emitted sections\n"
        " * absent from the order list keep their generator emission order at\n"
        " * the end. The profile never creates or deletes sections. Stable:\n"
        " * equal ranks never swap.\n"
        " */\n"
        "function applySectionOrder(emitted: EmittedSection[], order: string[]): EmittedSection[] {\n"
        "  const rank = new Map(order.map((component, i) => [component, i] as const));\n"
        "  const fallback = order.length;\n"
        "  return emitted\n"
        "    .map((e, i) => ({ e, i }))\n"
        "    .sort((a, b) => {\n"
        "      const ra = rank.get(a.e.component) ?? fallback;\n"
        "      const rb = rank.get(b.e.component) ?? fallback;\n"
        "      return ra !== rb ? ra - rb : a.i - b.i;\n"
        "    })\n"
        "    .map((x) => x.e);\n"
        "}\n"
        "\n"
        "/** Order pages from the profile pageOrder (P4): same rules as sections. */\n"
        "function applyPageOrder(pages: FYDPage[], order: string[]): FYDPage[] {\n"
        "  const rank = new Map(order.map((slug, i) => [slug, i] as const));\n"
        "  const fallback = order.length;\n"
        "  return pages\n"
        "    .map((p, i) => ({ p, i }))\n"
        "    .sort((a, b) => {\n"
        "      const ra = rank.get(a.p.slug) ?? fallback;\n"
        "      const rb = rank.get(b.p.slug) ?? fallback;\n"
        "      return ra !== rb ? ra - rb : a.i - b.i;\n"
        "    })\n"
        "    .map((x) => x.p);\n"
        "}\n"
        "\n"
        "/**\n"
        ' * Apply CTA emphasis (P8). "standard" leaves the emission position\n'
        ' * untouched. "elevated" moves the CTA to just after the Hero and\n'
        ' * stamps the treatment marker on its presentation; "quiet" moves it to\n'
        " * the end of the page with the same marker. The marker is\n"
        " * renderer-consumed data; an absent marker means standard.\n"
        " */\n"
        "function applyCtaEmphasis(sections: EmittedSection[], emphasis: CtaEmphasis): EmittedSection[] {\n"
        '  if (emphasis === "standard") return sections;\n'
        '  const idx = sections.findIndex((s) => s.component === "CTA");\n'
        "  if (idx === -1) return sections;\n"
        "  const next = [...sections];\n"
        "  const [cta] = next.splice(idx, 1);\n"
        "  const marked: EmittedSection = {\n"
        "    ...cta,\n"
        "    presentation: { ...cta.presentation, ctaEmphasis: emphasis },\n"
        "  };\n"
        '  if (emphasis === "elevated") {\n'
        '    const heroIdx = next.findIndex((s) => s.component === "Hero");\n'
        "    next.splice(heroIdx === -1 ? 0 : heroIdx + 1, 0, marked);\n"
        "  } else {\n"
        "    next.push(marked);\n"
        "  }\n"
        "  return next;\n"
        "}\n"
        "\n"
        "/**\n"
        " * Compose the profile token overrides onto the theme (P10/P11). A\n"
        " * null layoutCharacter means no opinion: the judged default flows\n"
        " * through untouched. Empty overrides reproduce the base theme\n"
        " * byte-identically.\n"
        " */\n"
        "function applyCompositionTokens(\n"
        "  base: FYDThemeTokens,\n"
        "  comp: SiteCompositionProfile,\n"
        "): FYDThemeTokens {\n"
        "  const tokens = mergeThemeTokens(base, comp.themeTokenOverrides ?? {});\n"
        "  return comp.layoutCharacter ? { ...tokens, layoutCharacter: comp.layoutCharacter } : tokens;\n"
        "}\n"
        "\n"
        "/**\n"
        " * B6 emission gate: SocialProof is emitted only when the owner graph\n"
        " * carries verified testimonials or reviews. The field must be present\n"
        " * AND its presentation binding must verify through\n"
        " * verifyPresentationBinding; unverified testimonial text never emits\n"
        " * the section, so the claim can never render.\n"
        " */\n"
        "function hasVerifiedTestimonials(owner: PingObject, graph: ObjectGraph): boolean {\n"
        '  for (const field of ["testimonials", "reviews"]) {\n'
        "    const raw = owner.fields[field];\n"
        "    const items = Array.isArray(raw)\n"
        '      ? raw.filter((s): s is string => typeof s === "string" && s !== "")\n'
        '      : typeof raw === "string" && raw !== ""\n'
        "        ? [raw]\n"
        "        : [];\n"
        "    if (items.length === 0) continue;\n"
        '    if (verifyPresentationBinding({ objectId: owner.id, field, classification: "direct" }, graph).ok) {\n'
        "      return true;\n"
        "    }\n"
        "  }\n"
        "  return false;\n"
        "}",
    )

    # G5: homePage takes the profile and emits before ordering.
    src = rep(
        src,
        "function homePage(g: Grouped, graph: ObjectGraph): FYDPage | null {\n"
        "  if (!g.owner) return null;\n"
        "  const ownerId = g.owner.id;\n"
        "  const sections: FYDSection[] = [];\n"
        '  const add = (component: string, query: FYDSection["query"]) => {\n'
        '    sections.push(section("home", sections.length, component, query));\n'
        "  };",
        "function homePage(g: Grouped, graph: ObjectGraph, comp?: SiteCompositionProfile): FYDPage | null {\n"
        "  if (!g.owner) return null;\n"
        "  const ownerId = g.owner.id;\n"
        "  // Emission: WHAT the graph data supports. Every emitted section is a\n"
        "  // registry component id; nothing here is customer-specific.\n"
        "  const emitted: EmittedSection[] = [];\n"
        '  const add = (component: string, query: FYDSection["query"], presentation: FYDSection["presentation"] = {}) => {\n'
        "    emitted.push({ component, query, presentation });\n"
        "  };",
    )

    # G6: B6 SocialProof emission after Products.
    src = rep(
        src,
        '  if (g.products.length > 0) {\n'
        '    add("Products", roleQuery(ownerId, "product"));\n'
        "  }\n"
        '  if (g.locations.length > 0) {',
        '  if (g.products.length > 0) {\n'
        '    add("Products", roleQuery(ownerId, "product"));\n'
        "  }\n"
        "  // B6: SocialProof emits only behind the verified-testimonials gate\n"
        "  // above (hasVerifiedTestimonials). Unverified testimonial text never\n"
        "  // reaches the renderer, so the N14 fail-closed gate holds by\n"
        "  // construction.\n"
        "  if (hasVerifiedTestimonials(g.owner, graph)) {\n"
        '    add("SocialProof", { kind: "owner" });\n'
        "  }\n"
        '  if (g.locations.length > 0) {',
    )

    # G7: B7 comment cleanup. The old comment falsely claimed dimension-vector
    # urgency policy already applied; the planner-to-P8 mapping now does.
    src = rep(
        src,
        "  // CTA is a site capability, present on every generated home page: the\n"
        "  // visitor's primary action block (visit website / ask FYD). The registry,\n"
        "  // the renderer, the eligibility report, and the dimension-vector policy\n"
        "  // (CTA boosted by urgency) all already account for it; the generator\n"
        "  // simply never emitted it.\n"
        '  add("CTA", { kind: "owner" });',
        "  // CTA is a site capability, present on every generated home page: the\n"
        "  // visitor's primary action block (visit website / ask FYD). Position and\n"
        "  // treatment come from the composition profile (P3 homeSectionOrder, P8\n"
        "  // ctaEmphasis): the planner's urgency dimension maps onto P8 through\n"
        '  // policyForVector, and "standard" keeps this emission position. No\n'
        "  // dimension-vector policy executes inside the generator; the old\n"
        "  // comment claiming it already did was wrong.\n"
        '  add("CTA", { kind: "owner" });',
    )

    # G8: homePage composes order + treatment, then assigns ids (P3/P8).
    src = rep(
        src,
        "  if (featureable > 0) {\n"
        "    add(\n"
        '      "ObjectRail",\n'
        '      roleQueryUnion(ownerId, ["service", "product", "person", "post", "article"], 6),\n'
        "    );\n"
        "  }\n"
        "\n"
        '  return { slug: "home", title: g.owner.title, navLabel: "Home", sections };\n'
        "}",
        "  if (featureable > 0) {\n"
        "    add(\n"
        '      "ObjectRail",\n'
        '      roleQueryUnion(ownerId, ["service", "product", "person", "post", "article"], 6),\n'
        "    );\n"
        "  }\n"
        "\n"
        "  // Composition: ORDER and TREATMENT from the profile (P3/P8). The\n"
        "  // profile never creates or deletes sections; it only orders what\n"
        "  // the data emitted, then applies the CTA emphasis treatment.\n"
        "  const profile = comp ?? DEFAULT_COMPOSITION_PROFILE;\n"
        "  const ordered = applySectionOrder(emitted, profile.homeSectionOrder);\n"
        "  const treated = applyCtaEmphasis(ordered, profile.ctaEmphasis);\n"
        '  const sections = treated.map((e, i) => section("home", i, e.component, e.query, e.presentation));\n'
        "\n"
        '  return { slug: "home", title: g.owner.title, navLabel: titleCase("home"), sections };\n'
        "}",
    )

    # G9: page tab labels derive from slugs (P9).
    src = rep(
        src,
        '  return { slug: "about", title: "About " + g.owner.title, navLabel: "About", sections };',
        '  return { slug: "about", title: "About " + g.owner.title, navLabel: titleCase("about"), sections };',
    )
    src = rep(
        src,
        '    navLabel: "Services",',
        '    navLabel: titleCase("services"),',
    )
    src = rep(
        src,
        '    navLabel: "Explore",',
        '    navLabel: titleCase("explore"),',
    )

    # G10: generateSiteSpec threads the profile through (P3/P4/P10/P11).
    src = rep(
        src,
        "export function generateSiteSpec(graph: ObjectGraph, opts: GeneratorOptions): FYDSiteSpec {\n"
        "  const g = group(graph);\n"
        "  const pages: FYDPage[] = [];\n"
        "  const home = homePage(g, graph);\n"
        "  const about = aboutPage(g);\n"
        "  const services = servicesPage(g);\n"
        "  const explore = explorePage(g, graph);\n"
        "  if (home) pages.push(home);\n"
        "  if (about) pages.push(about);\n"
        "  if (services) pages.push(services);\n"
        "  if (explore) pages.push(explore);\n"
        "\n"
        "  const spec: FYDSiteSpec = {",
        "export function generateSiteSpec(graph: ObjectGraph, opts: GeneratorOptions): FYDSiteSpec {\n"
        "  const g = group(graph);\n"
        "  const comp = opts.composition ?? DEFAULT_COMPOSITION_PROFILE;\n"
        "  const pages: FYDPage[] = [];\n"
        "  const home = homePage(g, graph, comp);\n"
        "  const about = aboutPage(g);\n"
        "  const services = servicesPage(g);\n"
        "  const explore = explorePage(g, graph);\n"
        "  if (home) pages.push(home);\n"
        "  if (about) pages.push(about);\n"
        "  if (services) pages.push(services);\n"
        "  if (explore) pages.push(explore);\n"
        "  // P4: pages ordered from the profile. Order lists never create or\n"
        "  // delete pages; unlisted pages keep emission order at the end.\n"
        "  const orderedPages = applyPageOrder(pages, comp.pageOrder);\n"
        "\n"
        "  const spec: FYDSiteSpec = {",
    )
    src = rep(
        src,
        "    themeTokens: { ...DEFAULT_FYD_THEME },\n"
        '    navigation: pages.map((p) => ({ label: p.navLabel, pageSlug: p.slug })),\n'
        "    pages,",
        "    themeTokens: applyCompositionTokens({ ...DEFAULT_FYD_THEME }, comp),\n"
        "    // P9: tab labels come from the page navLabels in the spec, falling\n"
        "    // back to the title-cased slug. Never a hardcoded label list.\n"
        "    navigation: orderedPages.map((p) => ({ label: p.navLabel ?? titleCase(p.slug), pageSlug: p.slug })),\n"
        "    pages: orderedPages,",
    )

    with open(PATH, "w") as f:
        f.write(src)
    print("generator.ts edits applied")

if __name__ == "__main__":
    main()
