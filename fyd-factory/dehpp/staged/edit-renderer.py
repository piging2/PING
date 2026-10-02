#!/usr/bin/env python3
"""DEHPP renderer edits: P5/P6/P7 copy tables, P8 CTA treatment, B5 comment cleanup."""
import sys

PATH = "src/fyd/components/renderer.tsx"

def rep(src, old, new, count=1):
    found = src.count(old)
    assert found == count, f"anchor found {found}x (expected {count}): {old[:80]!r}"
    return src.replace(old, new)

def main():
    with open(PATH) as f:
        src = f.read()

    # R1: import the copy tables.
    src = rep(
        src,
        'import type { DisplayMedia } from "../media/select";',
        'import type { DisplayMedia } from "../media/select";\n'
        'import { claimKindLabel, copyArchetype, copyFor, ctaHeadingFor } from "../copy/defaults";',
    )

    # R2: section heading defaults move into the copy table (P5). Each
    # hardcoded literal becomes a table lookup keyed by registry component
    # name; tenant presentation.heading still wins via ??.
    headings = [
        ('"Services"', "Services"),
        ('"Products"', "Products"),
        ('"Where we work"', "Locations"),
        ('"The people"', "People"),
        ('"Latest"', "Posts"),
        ('"Browse"', "ObjectGrid"),
        ('"Explore"', "ObjectFeed"),
        ('"Recent"', "RecentObjects"),
        ('"Contact"', "Contact"),
        ('"Find us"', "Links"),
        ('"What people say"', "SocialProof"),
        ('"Featured object"', "ObjectRail"),
        ('"More"', "GenericObjectCard"),
        ('"Gallery"', "Gallery"),
    ]
    for literal, component in headings:
        old = "presentation.heading ?? " + literal
        new = (
            "presentation.heading ?? copyFor(copyArchetype(ctx.spec.archetype), "
            + f'"{component}") ?? undefined'
        )
        src = rep(src, old, new)

    # R3: CTA heading default (P7).
    src = rep(
        src,
        '{presentation.heading ?? "Start the conversation"}',
        "{presentation.heading ?? ctaHeadingFor(copyArchetype(ctx.spec.archetype))}",
    )

    # R4: claim labels move into the seed table (P6). Outputs unchanged.
    src = rep(
        src,
        '      if (o.provenance?.kind === "overlay-authored") return "Demo addition";\n'
        '      const claimKind =\n'
        '        typeof o.fields["claimKind"] === "string" ? o.fields["claimKind"] : "";\n'
        '      if (claimKind === "feed_item") return "Feed item";\n'
        '      if (claimKind === "website_statement") return "Website statement";\n'
        '      return "Site record";\n'
        "    }),\n"
        "  );\n"
        "  if (labels.size === 1) return [...labels][0];\n"
        '  return "Mixed sources";',
        '      if (o.provenance?.kind === "overlay-authored") return claimKindLabel("demo_addition");\n'
        '      const claimKind =\n'
        '        typeof o.fields["claimKind"] === "string" ? o.fields["claimKind"] : "";\n'
        '      if (claimKind === "feed_item") return claimKindLabel("feed_item");\n'
        '      if (claimKind === "website_statement") return claimKindLabel("website_statement");\n'
        '      return claimKindLabel("site_record");\n'
        "    }),\n"
        "  );\n"
        "  if (labels.size === 1) return [...labels][0];\n"
        '  return claimKindLabel("mixed_sources");',
    )

    # R5: P8 quiet CTA treatment. "elevated" keeps the primary treatment;
    # its emphasis is expressed through earlier placement in section order.
    src = rep(
        src,
        "function CTASection({ section, objects, presentation, theme, ctx, motionIndex }: SectionProps) {\n"
        "  const o = objects[0];\n"
        '  const website = o ? safeWebsite(ctx) : { kind: "non_navigable" as const };\n'
        "  return (\n",
        "function CTASection({ section, objects, presentation, theme, ctx, motionIndex }: SectionProps) {\n"
        "  const o = objects[0];\n"
        '  const website = o ? safeWebsite(ctx) : { kind: "non_navigable" as const };\n'
        '  // P8: "quiet" emphasis renders the CTA as secondary text links instead of\n'
        "  // the primary button block. The treatment marker is renderer-consumed\n"
        "  // data stamped by the generator; an absent marker means standard.\n"
        '  if (presentation.ctaEmphasis === "quiet") {\n'
        "    return (\n"
        '      <section className="w-full px-4 py-12 sm:px-6" style={{ background: theme.surface }}>\n'
        '        <div className="mx-auto max-w-5xl text-center">\n'
        '          <h2 className="text-2xl font-semibold" style={{ fontFamily: theme.fontDisplay, color: theme.ink }}>\n'
        "            {presentation.heading ?? ctaHeadingFor(copyArchetype(ctx.spec.archetype))}\n"
        "          </h2>\n"
        "          {presentation.copy && <p className=\"mt-2 text-accent\">{presentation.copy}</p>}\n"
        '          <div className="mt-6 flex flex-wrap justify-center gap-6 text-sm">\n'
        '            {website.kind === "safe" ? (\n'
        '              <a href={website.href} className="underline" style={{ color: theme.ink }}>\n'
        "                Visit website\n"
        "              </a>\n"
        "            ) : null}\n"
        '            <a href="#ask" className="underline" style={{ color: theme.ink }}>\n'
        "              Ask FYD\n"
        "            </a>\n"
        "          </div>\n"
        "        </div>\n"
        "      </section>\n"
        "    );\n"
        "  }\n"
        "  return (\n",
    )

    # R6: B5 cosmetic: neutral example in the relationshipLine doc comment.
    src = rep(
        src,
        ' * connection, e.g. "Maya Alvarez -> Happy Place Carpentry" on a person',
        ' * connection, e.g. "Sam Rivera -> Acme Plumbing" on a person',
    )

    # R7: buildRenderContext accepts the seam-resolved media and siteId.
    # This is the ONLY supported RenderContext constructor; the route seam
    # populates gallery/object media here (B4) instead of by hand.
    src = rep(
        src,
        "export function buildRenderContext(\n"
        "  spec: FYDSiteSpec,\n"
        "  sourceGraph: ObjectGraph,\n"
        "  viewer: ViewerContext,\n"
        "  ownerDecisions: FieldVisibilityDecision[] = [],\n"
        "): RenderContext {\n"
        "  return {\n"
        "    spec,\n"
        "    graph: applyFieldVisibility(sourceGraph, ownerDecisions),\n"
        "    viewer,\n"
        "  };\n"
        "}",
        "export function buildRenderContext(\n"
        "  spec: FYDSiteSpec,\n"
        "  sourceGraph: ObjectGraph,\n"
        "  viewer: ViewerContext,\n"
        "  ownerDecisions: FieldVisibilityDecision[] = [],\n"
        "  seam?: {\n"
        "    /** Public site slug threaded from the page (AskFYD). */\n"
        "    siteId?: string;\n"
        "    /** Server-resolved media; the renderer never selects media itself. */\n"
        "    heroMedia?: DisplayMedia | null;\n"
        "    galleryMedia?: DisplayMedia[] | null;\n"
        "    objectMedia?: Record<string, DisplayMedia[]>;\n"
        "  },\n"
        "): RenderContext {\n"
        "  return {\n"
        "    spec,\n"
        "    graph: applyFieldVisibility(sourceGraph, ownerDecisions),\n"
        "    viewer,\n"
        "    siteId: seam?.siteId,\n"
        "    heroMedia: seam?.heroMedia ?? null,\n"
        "    galleryMedia: seam?.galleryMedia ?? [],\n"
        "    objectMedia: seam?.objectMedia ?? {},\n"
        "  };\n"
        "}",
    )

    with open(PATH, "w") as f:
        f.write(src)
    print("renderer.tsx edits applied")

if __name__ == "__main__":
    main()
