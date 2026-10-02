"""G4 patch 1: schemas.ts - extend the capability authority."""
import sys

P = "/home/nolan/projects/ping/src/fyd/sitespec/schemas.ts"
src = open(P).read()

def sub(old, new):
    global src
    assert src.count(old) == 1, "pattern issue: %r (count=%d)" % (old[:70], src.count(old))
    src = src.replace(old, new)

# 1. FYDActionKind: add call/email/directions.
sub(
    '  | "open_website"\n  | "site_propose";',
    '  | "open_website"\n  | "site_propose"\n  | "call"\n  | "email"\n  | "directions";')

# 2. CapabilityInput: add the context flags.
sub(
    "export interface CapabilityInput {\n  viewerId: string | null;\n  controllerId: string;\n  hasWebsite: boolean;\n}",
    "export interface CapabilityInput {\n  viewerId: string | null;\n  controllerId: string;\n  hasWebsite: boolean;\n  hasPhone?: boolean;\n  hasEmail?: boolean;\n  hasLocality?: boolean;\n}")

# 3. capabilityOptions: emit the context-gated actions, then add
#    capabilityOptionsForSchema (the single OBJECT+VIEWER+CONTEXT entry).
sub(
    '  if (input.hasWebsite) {\n    actions.push("open_website");\n  }\n  return actions;\n}',
    '''  if (input.hasWebsite) {
    actions.push("open_website");
  }
  if (input.hasPhone) {
    actions.push("call");
  }
  if (input.hasEmail) {
    actions.push("email");
  }
  if (input.hasLocality) {
    actions.push("directions");
  }
  return actions;
}

/**
 * Role-derived fallback definitions for schemas without a registered
 * FYDSchemaDef. NOT registered in FYD_SCHEMAS: the proof keeps exactly
 * three registered schemas, and role fallbacks exist only so capability
 * resolution never needs a second decision table in the view layer.
 * person is identity-backed (follow, as persons render today); product
 * and article are likeable content (matching the service/post proof
 * schemas they project from).
 */
const ROLE_FALLBACK_DEFS: Partial<Record<FYDSchemaRole, FYDSchemaDef>> = {
  person: {
    id: "ping.social.person@1",
    label: "Person",
    summary: "Role-derived fallback: a person identity.",
    fields: [],
    relationships: [],
    identityBacked: true,
    likeable: false,
  },
  product: {
    id: "ping.social.product@1",
    label: "Product",
    summary: "Role-derived fallback: product content.",
    fields: [],
    relationships: [],
    identityBacked: false,
    likeable: true,
  },
  article: {
    id: "ping.social.article@1",
    label: "Article",
    summary: "Role-derived fallback: article content.",
    fields: [],
    relationships: [],
    identityBacked: false,
    likeable: true,
  },
};

const UNKNOWN_FALLBACK_DEF: FYDSchemaDef = {
  id: "ping.social.unknown@1",
  label: "Object",
  summary: "Fallback: unclassified object, minimal action set.",
  fields: [],
  relationships: [],
  identityBacked: false,
  likeable: false,
};

/**
 * Capability resolution for an arbitrary schema id (G4).
 *
 * The single entry point for OBJECT + VIEWER + CONTEXT -> allowed
 * actions. Known schema ids resolve to their registered definition; ids
 * without a definition fall back to a role-derived definition; ids with
 * no known role get the minimal action set with contact actions withheld
 * (INV-08: we do not offer to call, email, or link an object we cannot
 * classify).
 */
export function capabilityOptionsForSchema(
  schemaId: string,
  input: CapabilityInput,
): FYDActionKind[] {
  const def = getSchemaDef(schemaId);
  if (def) return capabilityOptions(def, input);
  const role = schemaRole(schemaId);
  const fallback =
    (role ? ROLE_FALLBACK_DEFS[role] : undefined) ?? UNKNOWN_FALLBACK_DEF;
  if (!role) {
    // Unknown schema: contact actions are withheld even when values
    // exist. The authority is conservative about what it cannot classify.
    return capabilityOptions(fallback, {
      viewerId: input.viewerId,
      controllerId: input.controllerId,
      hasWebsite: false,
    });
  }
  return capabilityOptions(fallback, input);
}''')

open(P, "w").write(src)
print("schemas.ts patched OK")
