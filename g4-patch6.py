"""G4 patch 6: schemas.test.ts - cover capabilityOptionsForSchema."""
P = "/home/nolan/projects/ping/src/fyd/sitespec/__tests__/schemas.test.ts"
src = open(P).read()

old_import = """import {
  BUSINESS_SCHEMA,
  POST_SCHEMA,
  SCHEMA_ROLES,
  SERVICE_SCHEMA,
  agentToolDescription,
  capabilityOptions,
  eligibleComponents,
  getSchemaDef,
  isAllowedPredicate,
  schemaRole,
  validateAgainstSchema,
} from "../schemas";"""
new_import = """import {
  BUSINESS_SCHEMA,
  POST_SCHEMA,
  SCHEMA_ROLES,
  SERVICE_SCHEMA,
  agentToolDescription,
  capabilityOptions,
  capabilityOptionsForSchema,
  eligibleComponents,
  getSchemaDef,
  isAllowedPredicate,
  schemaRole,
  validateAgainstSchema,
} from "../schemas";"""
assert src.count(old_import) == 1, "import pattern not found"
src = src.replace(old_import, new_import)

anchor = """    expect(capabilityOptions(BUSINESS_SCHEMA, signedIn)).toContain("propose_update");
  });"""
addition = """    expect(capabilityOptions(BUSINESS_SCHEMA, signedIn)).toContain("propose_update");
  });

  test("capabilityOptionsForSchema resolves any schema id through the authority", () => {
    // G4: the single OBJECT + VIEWER + CONTEXT entry point. Registered
    // schemas resolve to their definitions.
    const anon = { viewerId: null, controllerId: "hp", hasWebsite: true };
    expect(
      capabilityOptionsForSchema("ping.social.business@1", anon),
    ).toEqual(capabilityOptions(BUSINESS_SCHEMA, anon));
    // Context flags gate the contact actions.
    const full = { viewerId: null, controllerId: "hp", hasWebsite: true, hasPhone: true, hasEmail: true, hasLocality: true };
    const actions = capabilityOptionsForSchema("ping.social.business@1", full);
    expect(actions).toEqual(
      expect.arrayContaining(["call", "email", "directions", "open_website"]),
    );
    const none = { viewerId: null, controllerId: "hp", hasWebsite: false };
    const noContact = capabilityOptionsForSchema("ping.social.business@1", none);
    expect(noContact).not.toContain("call");
    expect(noContact).not.toContain("email");
    expect(noContact).not.toContain("directions");
    expect(noContact).not.toContain("open_website");
    // Role fallbacks: person is identity-backed, product/article likeable,
    // location gets the base set plus contact actions.
    expect(
      capabilityOptionsForSchema("ping.social.person@1", none),
    ).toContain("follow");
    expect(
      capabilityOptionsForSchema("ping.social.product@1", none),
    ).toContain("like");
    expect(
      capabilityOptionsForSchema("ping.social.location@1", full),
    ).toContain("directions");
    // Unknown schemas: minimal set, contact actions withheld (INV-08).
    const unknown = capabilityOptionsForSchema("ping.social.mystery@9", full);
    expect(unknown).toEqual(["open", "ask", "reference"]);
  });"""
assert src.count(anchor) == 1, "anchor not found"
src = src.replace(anchor, addition)

open(P, "w").write(src)
print("schemas.test.ts updated")
