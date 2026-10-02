#!/usr/bin/env python3
"""Lane E convergence patch (idempotent): delete the drifted SCHEMA_COMPONENTS
hand table, derive eligibility by inverting the registry DEFINITIONS.

Phases (each skipped if already applied):
  1. Create src/fyd/sitespec/schema-roles.ts leaf module (roles moved verbatim).
  2. schemas.ts: re-export roles from leaf; import componentsForSchema;
     replace SCHEMA_COMPONENTS table + eligibleComponents with derivation.
  3. registry.ts: import roles from leaf; add COMPONENTS_BY_SCHEMA inversion +
     componentsForSchema(); reimplement componentForSchema on top.
  4. schemas.test.ts: update website expectation; add single-source drift guard.

Run from the repo root: python3 converge-patch.py
"""
import sys

SEP = "// " + "-" * 75
SCHEMAS_P = "src/fyd/sitespec/schemas.ts"
LEAF_P = "src/fyd/sitespec/schema-roles.ts"
REGISTRY_P = "src/fyd/components/registry.ts"
TEST_P = "src/fyd/sitespec/__tests__/schemas.test.ts"


def phase1_leaf(src: str) -> None:
    try:
        with open(LEAF_P) as f:
            if "Moved verbatim from sitespec/schemas.ts (2026-09-23" in f.read():
                print("phase1: leaf exists, skipping")
                return
    except FileNotFoundError:
        pass
    r_start = src.index(SEP + "\n// Schema roles: the site compiler reasons over roles")
    r_end = src.index(SEP + "\n// Derivation 1")
    roles_block = src[r_start:r_end].rstrip() + "\n"
    leaf = (
        "/**\n"
        " * Site-compiler schema roles: leaf module (no imports).\n"
        " *\n"
        " * Moved verbatim from sitespec/schemas.ts (2026-09-23, lane E\n"
        " * schema<->component convergence): the component registry builds its\n"
        " * schema->component mapping from these roles, and keeping them in a\n"
        " * leaf module avoids a sitespec <-> components import cycle.\n"
        " * schemas.ts re-exports everything, so existing importers are\n"
        " * unchanged.\n"
        " */\n\n" + roles_block
    )
    open(LEAF_P, "w").write(leaf)
    print("phase1: leaf created")


def phase2_schemas() -> None:
    src = open(SCHEMAS_P).read()
    changed = False
    if 'from "./schema-roles"' not in src:
        r_start = src.index(SEP + "\n// Schema roles: the site compiler reasons over roles")
        r_end = src.index(SEP + "\n// Derivation 1")
        roles_reexport = (
            SEP + "\n"
            "// Schema roles: re-exported from the leaf module ./schema-roles.\n"
            "// The component registry builds its mapping from these roles; the leaf\n"
            "// module keeps the sitespec -> components -> schema-roles import graph\n"
            "// acyclic. Existing importers keep importing from here unchanged.\n"
            + SEP + "\n\n"
            'export { SCHEMA_ROLES, schemaRole } from "./schema-roles";\n'
            'export type { FYDSchemaRole } from "./schema-roles";\n'
        )
        src = src[:r_start] + roles_reexport + src[r_end:]
        changed = True
        print("phase2: roles moved to leaf + re-exported")
    else:
        print("phase2: roles re-export present, skipping move")

    if 'import { componentsForSchema } from "../components/registry";' not in src:
        old_import = 'import type { FYDFinding } from "./types";\n'
        assert old_import in src
        src = src.replace(
            old_import,
            old_import + 'import { componentsForSchema } from "../components/registry";\n',
            1,
        )
        changed = True

    if "const SCHEMA_COMPONENTS" in src:
        d2_start = src.index(SEP + "\n// Derivation 2")
        d2_end = src.index(SEP + "\n// Derivation 3")
        d2_new = (
            SEP + "\n"
            "// Derivation 2: COMPONENT ELIGIBILITY. Schema -> component names.\n"
            "// DERIVED: the component registry (components/registry.ts DEFINITIONS) is\n"
            "// the single hand-written schema<->component mapping; this is its\n"
            "// inversion. The old hand-written SCHEMA_COMPONENTS table was deleted\n"
            "// 2026-09-23 (lane E): it had drifted from the registry in four places\n"
            "// (business/service/location/knowledge-website vs RecentObjects/\n"
            "// ObjectRail). One mapping, two directions, zero drift.\n"
            + SEP + "\n\n"
            "/**\n"
            " * Component names eligible for a schema, in registry order. Unknown\n"
            " * schemas get GenericObjectCard (unknown schemas render through the\n"
            " * fallback, never fail).\n"
            " */\n"
            "export function eligibleComponents(schemaId: string): string[] {\n"
            "  return componentsForSchema(schemaId);\n"
            "}\n"
        )
        src = src[:d2_start] + d2_new + src[d2_end:]
        assert "const SCHEMA_COMPONENTS" not in src
        changed = True
        print("phase2: SCHEMA_COMPONENTS deleted, eligibleComponents derived")
    else:
        print("phase2: table already gone, skipping")

    if changed:
        open(SCHEMAS_P, "w").write(src)


def phase3_registry() -> None:
    reg = open(REGISTRY_P).read()
    if "componentsForSchema" in reg:
        print("phase3: inversion present, skipping")
        return
    assert 'import { SCHEMA_ROLES, schemaRole } from "../sitespec/schemas";' in reg
    reg = reg.replace(
        'import { SCHEMA_ROLES, schemaRole } from "../sitespec/schemas";',
        'import { SCHEMA_ROLES } from "./schema-roles";',
        1,
    )
    reg = reg.replace(
        "acceptsSchemas lists are built from the central SCHEMA_ROLES table in\n * ../sitespec/schemas:",
        "acceptsSchemas lists are built from the central SCHEMA_ROLES table in\n * ./schema-roles (re-exported by ../sitespec/schemas):",
        1,
    )
    inversion = (
        "\n"
        "/**\n"
        " * DERIVED, single source of truth: invert the component -> schemas\n"
        " * mapping above into schema -> components (registry order). The\n"
        " * DEFINITIONS table is the only hand-written schema<->component\n"
        " * mapping; eligibleComponents() (sitespec/schemas.ts) is this same\n"
        " * inversion. The two directions cannot drift because only one of\n"
        " * them is written by hand. Computed once at module load.\n"
        " */\n"
        "const COMPONENTS_BY_SCHEMA: Map<string, string[]> = (() => {\n"
        "  const m = new Map<string, string[]>();\n"
        "  for (const d of DEFINITIONS) {\n"
        "    for (const s of d.acceptsSchemas) {\n"
        "      const list = m.get(s);\n"
        "      if (list) list.push(d.name);\n"
        "      else m.set(s, [d.name]);\n"
        "    }\n"
        "  }\n"
        "  return m;\n"
        "})();\n"
        "\n"
        "/**\n"
        " * All components that can render an object of this schema, in registry\n"
        " * order. Unknown schemas resolve to [\"GenericObjectCard\"]: unknown\n"
        " * schemas render through the fallback, never fail. Never throws,\n"
        " * never returns empty.\n"
        " */\n"
        "export function componentsForSchema(schemaId: string): string[] {\n"
        '  return COMPONENTS_BY_SCHEMA.get(schemaId) ?? ["GenericObjectCard"];\n'
        "}\n"
    )
    anchor = "const BY_NAME = new Map(DEFINITIONS.map((d) => [d.name, d]));\n"
    assert anchor in reg
    reg = reg.replace(anchor, anchor + inversion, 1)

    old_cfs = '''/**
 * Resolve the component for a schema. Dedicated component when one
 * exists, GenericObjectCard otherwise. Acceptance lists are built from
 * SCHEMA_ROLES, so a knowledge service matches Services directly; the
 * role fallback below stays for schemas listed nowhere. Never throws,
 * never returns empty.
 */
export function componentForSchema(schemaId: string): string {
  const dedicated = DEFINITIONS.find(
    (d) => d.name !== "GenericObjectCard" && d.acceptsSchemas.includes(schemaId),
  );
  if (dedicated) return dedicated.name;
  const role = schemaRole(schemaId);
  if (role) {
    const proofId = SCHEMA_ROLES[role][0];
    const viaRole = DEFINITIONS.find(
      (d) => d.name !== "GenericObjectCard" && d.acceptsSchemas.includes(proofId),
    );
    if (viaRole) return viaRole.name;
  }
  return "GenericObjectCard";
}'''
    assert old_cfs in reg, "componentForSchema body anchor missing"
    new_cfs = '''/**
 * Resolve the component for a schema: the first eligible dedicated
 * component in registry order, GenericObjectCard otherwise. This is the
 * head of componentsForSchema() with the generic fallback filtered out,
 * so it agrees with eligibleComponents() by construction. (The old
 * schemaRole() fallback was redundant: acceptance lists already carry the
 * knowledge-vocabulary ids through SCHEMA_ROLES.) Never throws, never
 * returns empty.
 */
export function componentForSchema(schemaId: string): string {
  const dedicated = componentsForSchema(schemaId).find(
    (n) => n !== "GenericObjectCard",
  );
  return dedicated ?? "GenericObjectCard";
}'''
    reg = reg.replace(old_cfs, new_cfs, 1)
    # No live uses of schemaRole may remain: the single remaining occurrence
    # is the documentation note in componentForSchema's JSDoc.
    occ = [i for i, l in enumerate(reg.splitlines()) if "schemaRole(" in l]
    assert len(occ) == 1 and "redundant" in reg.splitlines()[occ[0]], occ
    open(REGISTRY_P, "w").write(reg)
    print("phase3: registry converged")


def phase4_tests() -> None:
    tst = open(TEST_P).read()
    if "single source (no drift)" in tst:
        print("phase4: guard present, skipping")
        return
    old_expect = 'expect(eligibleComponents("ping.knowledge.website@1")).toEqual(["ObjectGrid", "ObjectFeed"]);'
    assert old_expect in tst
    tst = tst.replace(
        old_expect,
        'expect(eligibleComponents("ping.knowledge.website@1")).toEqual([\n'
        '      "ObjectGrid",\n'
        '      "ObjectFeed",\n'
        '      "ObjectRail",\n'
        "    ]);",
        1,
    )
    guard = '''
  test("schema<->component mapping has a single source (no drift)", () => {
    // The registry DEFINITIONS table is the only hand-written mapping:
    // eligibleComponents is its inversion, componentForSchema its head.
    // If anyone re-adds a second hand table, these pins fail.
    const probe = [
      "ping.social.business@1",
      "ping.social.service@1",
      "ping.social.product@1",
      "ping.social.location@1",
      "ping.social.person@1",
      "ping.social.post@1",
      "ping.social.article@1",
      "ping.knowledge.business@1",
      "ping.knowledge.service@1",
      "ping.knowledge.location@1",
      "ping.knowledge.person@1",
      "ping.knowledge.post@1",
      "ping.knowledge.article@1",
      "ping.knowledge.website@1",
      "ping.social.mystery@9",
    ];
    for (const s of probe) {
      const all = eligibleComponents(s);
      expect(all.length).toBeGreaterThan(0);
      const dedicated = all.filter((n) => n !== "GenericObjectCard");
      expect(componentForSchema(s)).toBe(
        dedicated.length > 0 ? dedicated[0] : "GenericObjectCard",
      );
    }
    // Converged truth (2026-09-23): the registry's component-authored
    // coverage wins over the deleted hand table's stale omissions.
    expect(eligibleComponents("ping.social.business@1")).toEqual([
      "Hero",
      "IdentityCard",
      "BusinessSummary",
      "ObjectGrid",
      "ObjectFeed",
      "RecentObjects",
      "Contact",
      "Links",
      "SocialProof",
      "CTA",
      "AskFYD",
      "ObjectRail",
    ]);
    expect(eligibleComponents("ping.social.service@1")).toContain("RecentObjects");
    expect(eligibleComponents("ping.social.location@1")).toContain("ObjectRail");
  });
'''
    stripped = tst.rstrip()
    assert stripped.endswith("});")
    tst = stripped[: -len("});")].rstrip() + "\n" + guard + "});\n"
    open(TEST_P, "w").write(tst)
    print("phase4: tests updated")


def main() -> None:
    src = open(SCHEMAS_P).read()
    phase1_leaf(src)
    phase2_schemas()
    phase3_registry()
    phase4_tests()
    print("PATCH OK")


if __name__ == "__main__":
    sys.exit(main())
