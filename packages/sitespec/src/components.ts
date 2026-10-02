/**
 * Component catalog: schema -> eligible section components.
 *
 * HARVEST (adapted from the source component registry).
 *
 * SOURCE: /home/nolan/projects/ping-fyd-converged @ 32f8347
 *         src/fyd/components/registry.ts (the DEFINITIONS table and its
 *         schema->component inversion, componentsForSchema)
 * TARGET OWNER: packages/sitespec (piging2 experience IR)
 * DEPENDENCIES: ./schema-roles (SCHEMA_ROLES)
 * PROOFS: [1, 2, 3]
 *
 * ADAPTATION, honestly stated: the source registry is a React component
 * catalog (component implementations, labels, responsive metadata). This
 * slice harvests only the contract the SiteSpec compiler needs: which
 * schema ids each named section component accepts, and the inversion to
 * schema -> component names in registry order. The DEFINITIONS below are
 * the source table's (name, acceptsSchemas, ownerBound, requiresData)
 * contract re-expressed with acceptsSchemas built from the same central
 * SCHEMA_ROLES table, so the ping.social.* and ping.knowledge.*
 * vocabularies are accepted through the same roles. Unknown schemas
 * resolve to ["GenericObjectCard"]: unknown schemas render through the
 * fallback, never fail.
 *
 * REJECTED for this slice: the React component implementations, labels,
 * descriptions, responsive/editable metadata, and the renderer switch.
 * The directive demands the semantic render model + determinism invariant
 * first; the React render path is the next slice's boundary (tracked in
 * the slice report).
 */

import { SCHEMA_ROLES } from "./schema-roles";

/** Registry version, stamped on dependency-manifest bindings. */
export const COMPONENT_REGISTRY_VERSION = "fyd-component-registry@1";

const KNOWLEDGE_WEBSITE = "ping.knowledge.website@1";

interface ComponentDef {
  name: string;
  acceptsSchemas: string[];
  ownerBound: boolean;
  requiresData: boolean;
}

/**
 * The source registry's DEFINITIONS table, contract-only. Registry order
 * is significant: eligibleComponents returns names in this order, and the
 * contract digest pins it.
 */
const DEFINITIONS: ComponentDef[] = [
  { name: "Hero", acceptsSchemas: SCHEMA_ROLES.business, ownerBound: true, requiresData: true },
  { name: "IdentityCard", acceptsSchemas: SCHEMA_ROLES.business, ownerBound: true, requiresData: true },
  { name: "BusinessSummary", acceptsSchemas: SCHEMA_ROLES.business, ownerBound: true, requiresData: true },
  { name: "Services", acceptsSchemas: SCHEMA_ROLES.service, ownerBound: false, requiresData: true },
  { name: "Products", acceptsSchemas: SCHEMA_ROLES.product, ownerBound: false, requiresData: true },
  { name: "Locations", acceptsSchemas: SCHEMA_ROLES.location, ownerBound: false, requiresData: true },
  { name: "People", acceptsSchemas: SCHEMA_ROLES.person, ownerBound: false, requiresData: true },
  { name: "Posts", acceptsSchemas: [...SCHEMA_ROLES.post, ...SCHEMA_ROLES.article], ownerBound: false, requiresData: true },
  { name: "ObjectGrid", acceptsSchemas: [...SCHEMA_ROLES.business, ...SCHEMA_ROLES.service, ...SCHEMA_ROLES.product, ...SCHEMA_ROLES.location, ...SCHEMA_ROLES.person, ...SCHEMA_ROLES.post, ...SCHEMA_ROLES.article, KNOWLEDGE_WEBSITE], ownerBound: false, requiresData: true },
  { name: "ObjectFeed", acceptsSchemas: [...SCHEMA_ROLES.business, ...SCHEMA_ROLES.product, ...SCHEMA_ROLES.location, ...SCHEMA_ROLES.person, ...SCHEMA_ROLES.post, ...SCHEMA_ROLES.article, ...SCHEMA_ROLES.service, KNOWLEDGE_WEBSITE], ownerBound: false, requiresData: true },
  { name: "RecentObjects", acceptsSchemas: [...SCHEMA_ROLES.post, ...SCHEMA_ROLES.article, ...SCHEMA_ROLES.service, ...SCHEMA_ROLES.business], ownerBound: false, requiresData: true },
  { name: "Contact", acceptsSchemas: SCHEMA_ROLES.business, ownerBound: true, requiresData: true },
  { name: "Links", acceptsSchemas: SCHEMA_ROLES.business, ownerBound: true, requiresData: true },
  { name: "SocialProof", acceptsSchemas: SCHEMA_ROLES.business, ownerBound: true, requiresData: true },
  { name: "CTA", acceptsSchemas: [...SCHEMA_ROLES.business, ...SCHEMA_ROLES.service], ownerBound: true, requiresData: false },
  { name: "AskFYD", acceptsSchemas: SCHEMA_ROLES.business, ownerBound: true, requiresData: false },
  { name: "GenericObjectCard", acceptsSchemas: [], ownerBound: false, requiresData: true },
  { name: "ObjectRail", acceptsSchemas: [...SCHEMA_ROLES.business, ...SCHEMA_ROLES.service, ...SCHEMA_ROLES.product, ...SCHEMA_ROLES.location, ...SCHEMA_ROLES.person, ...SCHEMA_ROLES.post, ...SCHEMA_ROLES.article, KNOWLEDGE_WEBSITE], ownerBound: false, requiresData: true },
  { name: "Gallery", acceptsSchemas: [], ownerBound: true, requiresData: false },
];

/**
 * DERIVED, single source of truth: invert the component -> schemas
 * mapping above into schema -> components (registry order). The
 * DEFINITIONS table is the only hand-written schema<->component
 * mapping. Computed once at module load.
 */
const COMPONENTS_BY_SCHEMA: Map<string, string[]> = (() => {
  const m = new Map<string, string[]>();
  for (const d of DEFINITIONS) {
    for (const s of d.acceptsSchemas) {
      const list = m.get(s);
      if (list) list.push(d.name);
      else m.set(s, [d.name]);
    }
  }
  return m;
})();

/**
 * Component names eligible for a schema, in registry order. Unknown
 * schemas get GenericObjectCard (unknown schemas render through the
 * fallback, never fail).
 */
export function eligibleComponents(schemaId: string): string[] {
  return COMPONENTS_BY_SCHEMA.get(schemaId) ?? ["GenericObjectCard"];
}

/** All registered component names, in registry order. */
export function listComponentNames(): string[] {
  return DEFINITIONS.map((d) => d.name);
}
