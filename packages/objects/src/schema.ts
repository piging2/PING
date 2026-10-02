/**
 * Object kernel: schema contracts (field/type rules + relationship rules).
 *
 * HARVESTED (ADAPT) from ping-fyd-converged (SHA 32f8347)
 *   src/fyd/sitespec/schemas.ts  (schema-def, validator, relationship-rules core)
 *
 * What moved: FYDSchemaDef block (fields + relationship rules + the three
 * proof schemas), getSchemaDef, validateAgainstSchema, relationshipRules,
 * isAllowedPredicate. Identifier prefix FYD -> dropped; the vocabulary ids
 * (ping.social.business@1 etc.) are kept verbatim.
 *
 * What stays behind (REJECT for the object kernel):
 *   - eligibleComponents / componentsForSchema -> renderer contract (not kernel)
 *   - capabilityOptions / capabilityOptionsForSchema -> capability kernel (not kernel)
 *   - agentToolDescription -> agent/tool layer (not kernel)
 *   - schema-roles.ts + ROLE_FALLBACK_DEFS -> component-mapping vocab (FYD coupling)
 *
 * Evolution law (carried over verbatim from source): new fields are
 * optional; never change a field type; never remove a field. Breaking
 * changes mint a new schema version.
 */

export type SchemaFieldType = "string" | "string[]" | "url";

export interface SchemaField {
  name: string;
  type: SchemaFieldType;
  required: boolean;
  label: string;
  /** Short plain-language meaning of the field. */
  meaning: string;
}

export interface SchemaRelationshipRule {
  predicate: string;
  targetSchemas: string[];
  meaning: string;
}

export interface SchemaDef {
  id: string;
  label: string;
  summary: string;
  fields: SchemaField[];
  relationships: SchemaRelationshipRule[];
  /** True when the object is backed by an identity a viewer can follow. */
  identityBacked: boolean;
  /** True when likes belong on this schema (content, never identities). */
  likeable: boolean;
}

export const BUSINESS_SCHEMA: SchemaDef = {
  id: "ping.social.business@1",
  label: "Business",
  summary:
    "A business: name, description, category, website, contact details, hours, and social links. The root object a generated site is built around.",
  fields: [
    { name: "title", type: "string", required: true, label: "Name", meaning: "The business name." },
    { name: "description", type: "string", required: true, label: "Description", meaning: "What the business does, in its own words." },
    { name: "category", type: "string", required: false, label: "Category", meaning: "Trade or industry category." },
    { name: "website", type: "url", required: false, label: "Website", meaning: "Public website URL." },
    { name: "phone", type: "string", required: false, label: "Phone", meaning: "Public business phone." },
    { name: "email", type: "string", required: false, label: "Email", meaning: "Public business email." },
    { name: "hours", type: "string", required: false, label: "Hours", meaning: "Opening hours as published." },
    { name: "socials", type: "string[]", required: false, label: "Social links", meaning: "Public social profile URLs." },
  ],
  relationships: [
    { predicate: "provides", targetSchemas: ["ping.social.service@1", "ping.social.product@1"], meaning: "Services or products the business offers." },
    { predicate: "publishes", targetSchemas: ["ping.social.post@1", "ping.social.article@1"], meaning: "Posts or articles the business published." },
    { predicate: "located_at", targetSchemas: ["ping.social.location@1"], meaning: "Where the business operates." },
    { predicate: "employs", targetSchemas: ["ping.social.person@1"], meaning: "People behind the business." },
  ],
  identityBacked: true,
  likeable: false,
};

export const SERVICE_SCHEMA: SchemaDef = {
  id: "ping.social.service@1",
  label: "Service",
  summary:
    "A service the business offers: name, description, and optional price or duration hints. Rendered as cards in Services sections.",
  fields: [
    { name: "title", type: "string", required: true, label: "Name", meaning: "The service name." },
    { name: "description", type: "string", required: true, label: "Description", meaning: "What the service includes." },
    { name: "price_hint", type: "string", required: false, label: "Price hint", meaning: "Published price guidance, never a quote." },
    { name: "duration", type: "string", required: false, label: "Duration", meaning: "Typical job duration as published." },
  ],
  relationships: [
    { predicate: "provided_by", targetSchemas: ["ping.social.business@1"], meaning: "The business offering this service." },
  ],
  identityBacked: false,
  likeable: true,
};

export const POST_SCHEMA: SchemaDef = {
  id: "ping.social.post@1",
  label: "Post",
  summary:
    "A post or article: title, body text, publish date, and tags. Rendered in feeds and recent-objects sections. Replies reference posts.",
  fields: [
    { name: "title", type: "string", required: true, label: "Title", meaning: "The post title." },
    { name: "text", type: "string", required: false, label: "Body", meaning: "The post body text." },
    { name: "date", type: "string", required: false, label: "Date", meaning: "Publish date as published." },
    { name: "tags", type: "string[]", required: false, label: "Tags", meaning: "Topic tags." },
    { name: "url", type: "url", required: false, label: "Link", meaning: "Canonical link to the full post." },
  ],
  relationships: [
    { predicate: "published_by", targetSchemas: ["ping.social.business@1"], meaning: "The business that published this post." },
    { predicate: "replies_to", targetSchemas: ["ping.social.post@1"], meaning: "The post this replies to." },
  ],
  identityBacked: false,
  likeable: true,
};

/** The proof schema catalog. Not one hundred. */
export const SCHEMA_CATALOG: SchemaDef[] = [BUSINESS_SCHEMA, SERVICE_SCHEMA, POST_SCHEMA];

export function getSchemaDef(schemaId: string): SchemaDef | undefined {
  return SCHEMA_CATALOG.find((s) => s.id === schemaId);
}

export interface FieldRecord {
  title: string;
  description: string;
  fields: Record<string, string | string[]>;
}

export interface Finding {
  severity: "error" | "warning" | "info";
  authority: "piging2.objects.validator";
  resourceId: string;
  path: string;
  message: string;
}

/**
 * Validate an object's scalar fields against its schema definition.
 * Returns findings; empty means valid. (Adapted from the source's
 * validateAgainstSchema: same type-evolution law, authority label renamed
 * to the new owner.)
 */
export function validateAgainstSchema(
  def: SchemaDef,
  record: FieldRecord,
  resourceId: string,
): Finding[] {
  const findings: Finding[] = [];
  const at = (path: string) => "object." + path;
  for (const f of def.fields) {
    const raw =
      f.name === "title"
        ? record.title
        : f.name === "description"
          ? record.description
          : record.fields[f.name];
    if (raw === undefined || raw === null || raw === "") {
      if (f.required) {
        findings.push({
          severity: "error",
          authority: "piging2.objects.validator",
          resourceId,
          path: at(f.name),
          message: "Required field '" + f.name + "' is missing.",
        });
      }
      continue;
    }
    const ok =
      f.type === "string"
        ? typeof raw === "string"
        : f.type === "string[]"
          ? Array.isArray(raw) && raw.every((e) => typeof e === "string")
          : typeof raw === "string";
    if (!ok) {
      findings.push({
        severity: "error",
        authority: "piging2.objects.validator",
        resourceId,
        path: at(f.name),
        message:
          "Field '" + f.name + "' must be " + f.type + " (schema evolution law: types never change).",
      });
    }
    if (f.type === "url" && typeof raw === "string" && !/^https?:\/\//.test(raw) && !raw.startsWith("/")) {
      findings.push({
        severity: "warning",
        authority: "piging2.objects.validator",
        resourceId,
        path: at(f.name),
        message: "Field '" + f.name + "' does not look like a URL: '" + raw.slice(0, 60) + "'.",
      });
    }
  }
  // Unknown fields are tolerated (source's harvest T5 law), reported as info.
  const known = new Set(def.fields.map((f) => f.name));
  for (const key of Object.keys(record.fields)) {
    if (!known.has(key)) {
      findings.push({
        severity: "info",
        authority: "piging2.objects.validator",
        resourceId,
        path: at("fields." + key),
        message: "Unknown field '" + key + "' tolerated and passed through.",
      });
    }
  }
  return findings;
}

/** Relationship rules declared by a schema: allowed predicates. */
export function relationshipRules(schemaId: string): SchemaRelationshipRule[] {
  return getSchemaDef(schemaId)?.relationships ?? [];
}

export function isAllowedPredicate(schemaId: string, predicate: string): boolean {
  return relationshipRules(schemaId).some((r) => r.predicate === predicate);
}
