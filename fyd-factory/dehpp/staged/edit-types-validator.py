#!/usr/bin/env python3
"""DEHPP types + validator edits: P8 presentation marker, P3 order warnings."""
import sys

def rep(src, old, new, count=1):
    found = src.count(old)
    assert found == count, f"anchor found {found}x (expected {count}): {old[:80]!r}"
    return src.replace(old, new)

def main():
    # T1: FYDPresentation gains the P8 treatment marker.
    p = "src/fyd/sitespec/types.ts"
    with open(p) as f:
        src = f.read()
    src = rep(
        src,
        "export interface FYDPresentation {\n"
        "  heading?: string;\n"
        "  copy?: string;\n"
        "  featuredIds?: string[];\n"
        "  hidden?: boolean;\n"
        "}",
        "export interface FYDPresentation {\n"
        "  heading?: string;\n"
        "  copy?: string;\n"
        "  featuredIds?: string[];\n"
        "  hidden?: boolean;\n"
        "  /**\n"
        '   * P8 CTA emphasis marker, stamped by the generator. "elevated" and\n'
        '   * "quiet" change CTA placement and treatment; an absent marker means\n'
        "   * standard. Renderer-consumed data, never a tenant branch.\n"
        "   */\n"
        '  ctaEmphasis?: "elevated" | "quiet";\n'
        "}",
    )
    with open(p, "w") as f:
        f.write(src)
    print("types.ts edit applied")

    # V1: validateSiteSpec accepts composition order warnings (P3): unknown
    # ids in the profile order list are dropped by the generator; the route
    # seam surfaces them here as warnings, never errors.
    p = "src/fyd/sitespec/validator.ts"
    with open(p) as f:
        src = f.read()
    src = rep(
        src,
        "export function validateSiteSpec(spec: FYDSiteSpec, knownSchemas: Set<string>): FYDFinding[] {\n"
        "  const findings: FYDFinding[] = [];\n"
        '  const rid = "spec:" + spec.ownerObjectId;',
        "export function validateSiteSpec(\n"
        "  spec: FYDSiteSpec,\n"
        "  knownSchemas: Set<string>,\n"
        "  extraWarnings: string[] = [],\n"
        "): FYDFinding[] {\n"
        "  const findings: FYDFinding[] = [];\n"
        '  const rid = "spec:" + spec.ownerObjectId;\n'
        "  for (const message of extraWarnings) {\n"
        '    findings.push(warn(rid, "composition.homeSectionOrder", message));\n'
        "  }",
    )
    with open(p, "w") as f:
        f.write(src)
    print("validator.ts edit applied")

if __name__ == "__main__":
    main()
