/**
 * FYD object projection (server-only).
 *
 * buildObjectView(objectId) composes the GENERIC ObjectView from three
 * strictly separated layers:
 *
 * - SOURCE STATE: the website-ingestion object graph (fixture) and the
 *   media manifests. Read-only.
 * - DERIVED: deterministic transforms of source state (service parsing,
 *   area parsing, category mapping). Always labeled with their basis.
 * - OWNER STATE: durable owner decisions from the owner store. Source
 *   re-ingestion can never erase owner intent.
 *
 * The UI renders this projection. It never renders business-specific code.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { HAPPY_PLACE_GRAPH } from "../proceduralize/__fixtures__/happy-place-graph";
import { COPPERSMITH_GRAPH } from "../proceduralize/__fixtures__/coppersmith-graph";
import type { ObjectGraph } from "../sitespec/types";
import type { PingObject } from "../../lib/ping/types";
import { deriveServicesFromDescription, slugifyService } from "./services";
import { readOverrides } from "./owner-store";
import type {
  ObjectCapability,
  ObjectContactView,
  ObjectMediaView,
  ObjectServiceView,
  ObjectView,
} from "./types";

const GRAPHS: Record<string, ObjectGraph> = {
  "happy-place": HAPPY_PLACE_GRAPH,
  "coppersmith-plumbing": COPPERSMITH_GRAPH,
};

export function listObjectIds(): string[] {
  return Object.keys(GRAPHS);
}

interface MediaVariant {
  name: string;
  width: number;
  height: number;
  format: string;
  url: string;
  bytes: number;
}

interface ManifestMedia {
  id: string;
  title: string;
  roles: string[];
  rights: string;
  provenance: { sourceUrl: string; sourcePage: string; observedAt: string };
  digest: string;
  variants: MediaVariant[];
}

function readManifest(objectId: string): ManifestMedia[] {
  try {
    const raw = readFileSync(
      join(process.cwd(), "src", "fyd", "media", "manifests", objectId + ".json"),
      "utf8",
    );
    const parsed = JSON.parse(raw) as { media?: ManifestMedia[] };
    return Array.isArray(parsed.media) ? parsed.media : [];
  } catch {
    return [];
  }
}

/** Pick the widest non-blur local derivative for display. */
function pickVariant(variants: MediaVariant[]): MediaVariant | null {
  const real = variants.filter((v) => !v.name.startsWith("blur"));
  if (real.length === 0) return null;
  return real.reduce((a, b) => (b.width > a.width ? b : a));
}

function toMediaView(m: ManifestMedia): ObjectMediaView | null {
  // Only rights-authorized media is displayed. External references are
  // someone else's media; showing them as the business's own would lie.
  if (m.rights !== "authorized") return null;
  const v = pickVariant(m.variants ?? []);
  if (!v) return null;
  return {
    id: m.id,
    role: m.roles?.[0] ?? "gallery",
    src: v.url,
    alt: m.title || "Business photo",
    rights: "authorized",
    sourceUrl: m.provenance?.sourceUrl ?? "",
    digest: m.digest ?? "",
    observedAt: m.provenance?.observedAt ?? "",
  };
}

function field(obj: PingObject, key: string): string | null {
  const v = obj.fields?.[key];
  if (typeof v === "string" && v.trim().length > 0) return v.trim();
  if (Array.isArray(v) && v.length > 0 && typeof v[0] === "string") return v[0].trim();
  return null;
}

function categoryFor(keywords: string | null): string | null {
  if (!keywords) return null;
  const first = keywords.split(",")[0]?.trim().toLowerCase() ?? "";
  if (/carpent/.test(first)) return "Carpentry";
  if (/plumb/.test(first)) return "Plumbing";
  if (/hvac|heat|cool/.test(first)) return "HVAC";
  if (!first) return null;
  return first.replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseServiceArea(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .replace(/\s+and\s+/gi, ", ")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function domainOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function buildServices(
  derivedNames: string[],
  objectId: string,
): { services: ObjectServiceView[]; knownIds: string[]; knownNames: Map<string, string> } {
  const overrides = readOverrides(objectId);
  const knownIds: string[] = [];
  const knownNames = new Map<string, string>();
  const basis: ObjectServiceView[] = derivedNames.map((name) => {
    const id = slugifyService(name);
    knownIds.push(id);
    knownNames.set(id, name);
    return { id, name, basis: "derived" as const, basisLabel: "From the business description", visible: true };
  });
  for (const added of overrides.addedServices) {
    if (knownIds.includes(added.id)) continue;
    knownIds.push(added.id);
    knownNames.set(added.id, added.name);
    basis.push({
      id: added.id,
      name: added.name,
      basis: "owner",
      basisLabel: "Added by the owner",
      visible: !overrides.hiddenServices.includes(added.id),
    });
  }

  // Owner order wins; any ids not yet ordered keep derived order at the end.
  const ordered: ObjectServiceView[] = [];
  const byId = new Map(basis.map((s) => [s.id, s]));
  for (const id of overrides.serviceOrder) {
    const s = byId.get(id);
    if (s) {
      ordered.push(s);
      byId.delete(id);
    }
  }
  for (const s of basis) if (byId.has(s.id)) ordered.push(s);

  const hidden = new Set(overrides.hiddenServices);
  return {
    services: ordered.map((s) => ({ ...s, visible: !hidden.has(s.id) })),
    knownIds,
    knownNames,
  };
}

function buildCapabilities(contact: ObjectContactView): ObjectCapability[] {
  const caps: ObjectCapability[] = [{ kind: "view" }, { kind: "ask" }];
  if (contact.phone) caps.push({ kind: "call", href: "tel:" + contact.phone.replace(/\s/g, ""), label: "Call" });
  if (contact.email) caps.push({ kind: "email", href: "mailto:" + contact.email, label: "Email" });
  if (contact.website) caps.push({ kind: "website", href: contact.website, label: "Website" });
  return caps;
}

/**
 * Build the public ObjectView for a known object id.
 * Returns null for unknown ids (the route turns this into a 404).
 */
export function buildObjectView(objectId: string): ObjectView | null {
  const graph = GRAPHS[objectId];
  if (!graph) return null;
  const business = graph.objects.find(
    (o) => o.schema === "ping.social.business@1" && o.visibility === "public",
  );
  if (!business) return null;

  const overrides = readOverrides(objectId);
  const description = field(business, "description") ?? business.description ?? "";
  const website = field(business, "website");
  const phone = field(business, "phone");
  const email = field(business, "email");
  const locality = field(business, "locality");
  const keywords = field(business, "keywords");

  const derivedNames = deriveServicesFromDescription(description);
  const { services, knownIds, knownNames } = buildServices(derivedNames, objectId);

  const media: ObjectMediaView[] = [];
  for (const m of readManifest(objectId)) {
    const v = toMediaView(m);
    if (v) media.push(v);
  }
  // Logos first, then heroes, then gallery: stable, content-driven order.
  const roleRank = (r: string) => (r === "logo" ? 0 : r === "hero" ? 1 : 2);
  media.sort((a, b) => roleRank(a.role) - roleRank(b.role));

  const contact: ObjectContactView = {
    phone,
    email,
    website,
    locality,
    addressVisibility: overrides.addressVisibility,
  };

  const domain = domainOf(website);
  const firstService = services.find((s) => s.visible)?.name ?? services[0]?.name;

  return {
    id: objectId,
    schema: business.schema,
    name: business.title,
    category: categoryFor(keywords),
    locationLabel: locality,
    summary: description,
    media,
    services,
    serviceArea: parseServiceArea(field(business, "area_served")),
    contact,
    capabilities: buildCapabilities(contact),
    provenance: {
      kind: business.provenance?.kind ?? "unknown",
      ref: business.provenance?.ref ?? "",
      derivedAt: business.provenance?.derivedAt ?? business.updatedAt ?? "",
      label: domain ? "Information observed on " + domain : "Information from the business website",
    },
    ownerUpdatedAt: overrides.history.length > 0 ? overrides.updatedAt : null,
    sampleQuestions: [
      firstService ? "What kind of " + firstService.toLowerCase() + " work do you do?" : "What services do you offer?",
      "Where do you work?",
      "How can I get an estimate?",
    ],
  };
}

/** Service id/name sets for validating owner commands. Exposed for the API route. */
export function knownServices(objectId: string): { ids: string[]; names: Map<string, string> } {
  const graph = GRAPHS[objectId];
  if (!graph) return { ids: [], names: new Map() };
  const business = graph.objects.find(
    (o) => o.schema === "ping.social.business@1" && o.visibility === "public",
  );
  if (!business) return { ids: [], names: new Map() };
  const description = field(business, "description") ?? business.description ?? "";
  const { knownIds, knownNames } = buildServices(deriveServicesFromDescription(description), objectId);
  return { ids: knownIds, names: knownNames };
}
