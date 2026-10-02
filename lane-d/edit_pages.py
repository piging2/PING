"""MEDIA INTO HERO lane, edit 3 of 3: both site pages.

Resolve the hero media once at the server render seam via the canonical
selector (heroMediaFor) and pass it to SiteClient. No customer-specific
logic: the identical call on the identical code path serves every site.
Happy Place (zero acquired media) resolves null; Coppersmith resolves its
hero-role asset. Deterministic from (siteId, graph, ownerObjectId, manifest).
"""

IMPORT_ANCHOR = 'import { DemoOwnerMode } from "@/fyd/owner-mode/demo-owner-mode";\n'
IMPORT_ANCHOR_COPPER = 'import { isRenderable, validateSiteSpec } from "@/fyd/sitespec/validator";\n'
IMPORT_LINE = 'import { heroMediaFor } from "@/fyd/media/select";\n'


def patch(path, spec_anchor):
    src = open(path, encoding="utf-8").read()

    anchor = IMPORT_ANCHOR if "happy-place" in path else IMPORT_ANCHOR_COPPER
    assert src.count(anchor) == 1, "import anchor not unique in " + path
    assert "heroMediaFor" not in src, "already patched: " + path
    src = src.replace(anchor, anchor + IMPORT_LINE)

    assert src.count(spec_anchor) == 1, "spec anchor not unique in " + path
    src = src.replace(
        spec_anchor,
        spec_anchor
        + "  // Hero media, resolved once per page load at the server render\n"
        + "  // seam. Null when the owner has no acquired media.\n"
        + "  const heroMedia = heroMediaFor(SITE_ID, graph, spec.ownerObjectId);\n",
    )

    old_client = """      <SiteClient
        spec={spec}
        graph={graph}
        findings={findings}
        renderable={renderable}
        siteId={SITE_ID}
      />"""
    new_client = """      <SiteClient
        spec={spec}
        graph={graph}
        findings={findings}
        renderable={renderable}
        siteId={SITE_ID}
        heroMedia={heroMedia}
      />"""
    assert src.count(old_client) == 1, "SiteClient anchor not unique in " + path
    src = src.replace(old_client, new_client)

    open(path, "w", encoding="utf-8").write(src)


patch(
    "src/app/sites/happy-place/page.tsx",
    "  const spec = applyPresentationIntent(base, presentationIntent, graph).spec;\n",
)
patch(
    "src/app/sites/coppersmith-plumbing/page.tsx",
    """  const spec = generateSiteSpec(graph, {
    generatedAt: meta.generatedAt,
    eventSequences: meta.eventSequences ?? undefined,
  });
""",
)
print("pages patched OK")
