/**
 * FYD business-object identity: a versioned identity domain.
 *
 * THE LAW (see IDENTITY-LAW.md): the runner label is provenance, not
 * identity. A business object id derives ONLY from canonical source
 * semantics (canonical source key + schema role). The same business
 * observed by the website runner, the facebook runner, or a manual import
 * mints the SAME id; the runner label lives in provenance.ref /
 * evidenceRef, never in the id.
 *
 * This module is deterministic. Minting uses no clock, no randomness,
 * and no ambient state. Same inputs always produce the same id.
 *
 * Era separation: ids minted before this domain (the old
 * "website-business-*" ids, where the runner label was baked into the id
 * string) are read only. They are NEVER reminted here and NO dedup is
 * executed here. New mints use the "biz-" prefix under this domain.
 */

import { createHash } from "node:crypto";

/** Versioned identity domain. Every new mint records this exact value. */
export const OBJECT_IDENTITY_DOMAIN = "ping.object-identity@1";

/**
 * Legacy era prefix, read only. Old-era ids are valid as fixtures and as
 * historical references; this domain never mints or remints them.
 */
export const LEGACY_WEBSITE_BUSINESS_PREFIX = "website-business-";

export class IdentityError extends Error {
  readonly code: "invalid-source";
  constructor(message: string) {
    super(message);
    this.name = "IdentityError";
    this.code = "invalid-source";
  }
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * Query params that name a marketing visit, not a business. Stripped by
 * canonicalSourceKey because they never change which business a source
 * describes. Documented here so the strip list is reviewable, not magic.
 */
const TRACKING_PARAMS = new Set([
  "fbclid", // Facebook click id
  "gclid", // Google click id
  "gbraid", // Google ads browser id
  "wbraid", // Google ads browser id
  "msclkid", // Microsoft click id
  "mc_cid", // Mailchimp campaign id
  "mc_eid", // Mailchimp entity id
  "_hsenc", // HubSpot encoding
  "_hsmi", // HubSpot
  "hsctatracking", // HubSpot CTA tracking
  "igshid", // Instagram share id
  "vero_id", // Vero
  "vero_conv", // Vero
  "pk_campaign", // Matomo campaign
  "pk_kwd", // Matomo keyword
]);

function isTrackingParam(name: string): boolean {
  const n = name.toLowerCase();
  if (n.startsWith("utm_")) return true; // all Google/Urchin campaign params
  return TRACKING_PARAMS.has(n);
}

/**
 * Reduce a raw source URL to its canonical source key: the stable,
 * deterministic string that names the SOURCE SEMANTICS of a business
 * observation. Rules, each deliberate:
 *
 * 1. Scheme lowercased. Only http/https have business identity; anything
 *    else throws IdentityError (a mailto: or tel: link is not a business).
 * 2. Host lowercased. DNS is case-insensitive, so case carries no identity.
 * 3. Default ports stripped (:80 on http, :443 on https). Non-default
 *    ports are KEPT: host:8443 is a different deployment than host.
 * 4. Trailing slash variants collapsed: ".../about/" and ".../about" are
 *    the same page; bare host and host + "/" are the same origin.
 * 5. Fragment stripped (#menu, #contact): fragments are client-side
 *    anchors and never change which business a source describes.
 * 6. Tracking/query params stripped: utm_*, fbclid, gclid, and the other
 *    marketing ids in TRACKING_PARAMS name the visit, not the business.
 *    Remaining query params are KEPT and sorted by (name, value) so that
 *    "?b=2&a=1" and "?a=1&b=2" canonicalize identically, while a query
 *    that genuinely changes the resource ("?location=denver") still
 *    produces a distinct key.
 * 7. Percent-encoding normalized by re-encoding decoded names/values, so
 *    equivalent encodings converge to one spelling.
 *
 * Deterministic: same URL text always yields the same key.
 */
export function canonicalSourceKey(rawUrl: string): string {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    throw new IdentityError(
      "Source is not a parseable URL: " + String(rawUrl).slice(0, 120)
    );
  }
  const scheme = u.protocol.toLowerCase();
  if (scheme !== "http:" && scheme !== "https:") {
    throw new IdentityError("Only http(s) sources have business identity: " + scheme);
  }
  const host = u.hostname.toLowerCase();

  let port = u.port;
  if ((scheme === "http:" && port === "80") || (scheme === "https:" && port === "443")) {
    port = "";
  }

  let path = u.pathname;
  if (path.length > 1 && path.endsWith("/")) {
    path = path.slice(0, -1);
  }
  if (path === "/") {
    path = "";
  }

  const kept: Array<[string, string]> = [];
  u.searchParams.forEach((value, name) => {
    if (!isTrackingParam(name)) {
      kept.push([name, value]);
    }
  });
  kept.sort((a, b) =>
    a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0
  );
  const query = kept
    .map(([n, v]) => encodeURIComponent(n) + "=" + encodeURIComponent(v))
    .join("&");

  return scheme + "//" + host + (port ? ":" + port : "") + path + (query ? "?" + query : "");
}

/**
 * Mint the business object id from canonical source semantics ONLY.
 *
 * id = "biz-" + sha256Hex(canonicalSourceKey + "|" + schemaRole).slice(0, 16)
 *
 * There is NO runner label anywhere in this string. The runner that
 * observed the source (website, facebook, manual) is recorded in the
 * provenance carrier, never in the id. Two different runners observing
 * the same source semantics therefore mint the same id.
 *
 * schemaRole names the schema entity within the source: "business" for
 * the root business object, "service:<slug>" for a service it offers,
 * "location:<slug>" for a branch. The role participates in the digest so
 * distinct entities from one source get distinct ids.
 */
export function businessIdForSource(sourceKey: string, schemaRole: string): string {
  if (!sourceKey) {
    throw new IdentityError("sourceKey must not be empty");
  }
  if (!schemaRole) {
    throw new IdentityError("schemaRole must not be empty");
  }
  const digest = sha256Hex(sourceKey + "|" + schemaRole).slice(0, 16);
  return "biz-" + digest;
}

/**
 * The runner label lives here, in provenance, and ONLY here.
 * provenance.ref / evidenceRef carries the runner and the evidence it
 * produced; the object id never does.
 */
export interface ProvenanceCarrier {
  /** The runner label: "website", "facebook", "manual", etc. */
  runnerLabel: string;
  /** Reference to the evidence this observation was derived from. */
  evidenceRef: string;
  /** Caller-supplied run identifier (not minted here). */
  runId: string;
  /** Identity domain version under which the paired object id was minted. */
  domain: typeof OBJECT_IDENTITY_DOMAIN;
}

/**
 * Convention constructor for the provenance carrier. The runner label is
 * an argument HERE, at the provenance layer. businessIdForSource never
 * receives a runner label, so it cannot leak into the id.
 */
export function provenanceCarrier(
  runnerLabel: string,
  evidenceRef: string,
  runId: string
): ProvenanceCarrier {
  return {
    runnerLabel,
    evidenceRef,
    runId,
    domain: OBJECT_IDENTITY_DOMAIN,
  };
}

export interface MintedObservation {
  objectId: string;
  sourceKey: string;
  schemaRole: string;
  provenance: ProvenanceCarrier;
}

/**
 * One intake step: canonicalize the source, mint the id, attach the
 * provenance carrier. The runner label enters only via provenance.
 */
export function mintObservation(args: {
  sourceUrl: string;
  schemaRole: string;
  runnerLabel: string;
  runId: string;
}): MintedObservation {
  const sourceKey = canonicalSourceKey(args.sourceUrl);
  const objectId = businessIdForSource(sourceKey, args.schemaRole);
  return {
    objectId,
    sourceKey,
    schemaRole: args.schemaRole,
    provenance: provenanceCarrier(args.runnerLabel, sourceKey, args.runId),
  };
}

export type IdentityEra = "ping.object-identity@1" | "legacy:website-business" | "unknown";

/**
 * Era separation check. New-domain ids report the domain constant;
 * old-era "website-business-*" ids report the legacy era (read only);
 * anything else is unknown. Used to prove new mints never remint the
 * old era and old-era fixtures are never touched.
 */
export function idDomain(id: string): IdentityEra {
  if (id.startsWith("biz-")) {
    return OBJECT_IDENTITY_DOMAIN;
  }
  if (id.startsWith(LEGACY_WEBSITE_BUSINESS_PREFIX)) {
    return "legacy:website-business";
  }
  return "unknown";
}

export interface JournalMintResult {
  observation: MintedObservation;
  /** True when this exact object id was already ingested (batch replay). */
  duplicate: boolean;
}

export interface IdentityJournal {
  mint(args: {
    sourceUrl: string;
    schemaRole: string;
    runnerLabel: string;
    runId: string;
  }): JournalMintResult;
  size(): number;
  duplicateCount(): number;
  objectIds(): string[];
}

/**
 * In-memory dedup journal for one intake batch. Keyed ONLY by object id,
 * so a batch replay of the same observations produces one record and zero
 * duplicate records, regardless of runner label or arrival order.
 * Pure closure, no ambient state: a fresh journal is a fresh batch.
 */
export function createIdentityJournal(): IdentityJournal {
  const seen = new Map<string, MintedObservation>();
  let duplicates = 0;
  return {
    mint(args) {
      const observation = mintObservation(args);
      if (seen.has(observation.objectId)) {
        duplicates += 1;
        return { observation, duplicate: true };
      }
      seen.set(observation.objectId, observation);
      return { observation, duplicate: false };
    },
    size: () => seen.size,
    duplicateCount: () => duplicates,
    objectIds: () => [...seen.keys()],
  };
}
