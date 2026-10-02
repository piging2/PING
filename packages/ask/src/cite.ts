/**
 * HARVEST BANNER (piging2)
 * SOURCE: /home/nolan/projects/ping-fyd-converged @ 32f83474
 *         src/fyd/ask/visitor-answer.ts (citationFor)
 * TARGET OWNER: packages/ask (piging2 Ask FYD)
 * MODE: ADAPT. The source's citationFor maps one evidence ref onto a
 * visitor-facing citation (source, basis, lastChecked, claim class).
 * Here it becomes citeFact, the SINGLE primitive that both Ask FYD
 * answer citations (proof 3) and whyThis (proof 4) are built on:
 * implement once, use in both. The observation record is returned
 * structurally (not embedded into prose), so the caller decides how to
 * render it; the value is never guessed, only read.
 * DEPENDENCIES: ./types, ./classify, ./viewer
 * PROOFS: [3, 4]
 *
 * SOURCE ATTRIBUTION RULE (harvested): an object ref whose provenance ref
 * starts with "website-ingestion:" names the business website and its URL
 * as the source. A canonical-journal object is a recorded object in the
 * site data, not the site's own words: it is labeled "Site record", never
 * misattributed to the website. An owner correction on the cited field
 * names the owner as the source instead of misattributing the value.
 */

import type {
  AskPingObject,
  AskViewerIdentity,
  FactRef,
  ObjectGraph,
  WhyThisObservation,
  WhyThisResult,
} from "./types";
import { basisForClassification, claimClassFor, type ClaimClass } from "./classify";
import { projectGraphForViewer } from "./viewer";

/** One fact citation: what Ask FYD stands on, and what WHY THIS shows. */
export interface FactCitation {
  /** Display source: the website URL, or a site-record label. */
  source: string;
  sourceKind: "business website" | "site record" | "owner correction";
  /** Human basis sentence for the classification. */
  basis: string;
  /** Provenance date (yyyy-mm-dd) when the record carries one. */
  lastChecked: string | null;
  /** "field" for fields[] keys; "object" for title/description. */
  evidenceType: "field" | "object";
  classification: ClaimClass;
  /** Human label for the cited fact. */
  label: string;
  /** One-line provenance detail, suitable for an evidence ref. */
  detail: string;
}

/**
 * Read a bound field value. "title" and "description" are object-level
 * factual identity and cite as object-level facts; every other name reads
 * fields[]. Returns undefined when the field is absent or empty: the
 * caller must OMIT the fact, never guess it.
 */
function fieldValue(obj: AskPingObject, field: string): string | undefined {
  if (field === "title") return obj.title === "" ? undefined : obj.title;
  if (field === "description")
    return obj.description === "" ? undefined : obj.description;
  const v = obj.fields[field];
  if (typeof v === "string") return v === "" ? undefined : v;
  if (Array.isArray(v)) {
    const joined = v.filter((s) => s !== "").join(", ");
    return joined === "" ? undefined : joined;
  }
  return undefined;
}

function asDatePrefix(iso: string | undefined): string | null {
  if (typeof iso !== "string" || iso.length < 10) return null;
  return /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10) : null;
}

/**
 * Cite one fact. Returns null when the fact is not visible or not bound:
 * unknown object, non-public object for this viewer, unknown/empty field.
 * The input graph is projected for the viewer FIRST, so a citation can
 * never be built on data the viewer may not see.
 */
export function citeFact(
  ref: FactRef,
  graph: ObjectGraph,
  viewer: AskViewerIdentity | null | undefined = null,
): FactCitation | null {
  const projected = projectGraphForViewer(graph, viewer).graph;
  const obj = projected.objects.find((o) => o.id === ref.objectId);
  if (!obj) return null;
  const value = fieldValue(obj, ref.field);
  if (value === undefined) return null;

  const evidenceType: "field" | "object" =
    ref.field === "title" || ref.field === "description" ? "object" : "field";

  // Source attribution. Website-ingestion objects name the business
  // website; anything else is an honest "Site record".
  let source = "Site record";
  let sourceKind: FactCitation["sourceKind"] = "site record";
  const provRef = obj.provenance?.ref ?? "";
  if (provRef.startsWith("website-ingestion:")) {
    const url = provRef.slice("website-ingestion:".length);
    source = url === "" ? "The business website" : url;
    sourceKind = "business website";
  } else if (obj.provenance?.kind === "canonical-journal") {
    source = "Site record (canonical journal)";
  } else if (obj.provenance?.kind === "overlay-authored") {
    source = "Site record (site operator addition)";
  }

  // An owner correction on this exact field names the owner as the
  // source instead of misattributing the value to the website.
  const correction = (obj.ownerFieldCorrections ?? []).find(
    (c) => c.field === ref.field && (c.targetObjectId ?? obj.id) === obj.id,
  );
  let classification: ClaimClass;
  let basis: string;
  if (correction) {
    classification = "DIRECT";
    sourceKind = "owner correction";
    source = "Owner correction";
    basis = "Owner-set value";
  } else {
    const claimKind =
      typeof obj.fields["claimKind"] === "string"
        ? (obj.fields["claimKind"] as string)
        : undefined;
    classification = claimClassFor(claimKind);
    basis = basisForClassification(claimKind);
  }

  const lastChecked = asDatePrefix(obj.provenance?.derivedAt);
  const label =
    evidenceType === "object"
      ? `${obj.title} (${ref.field})`
      : `${obj.title}: ${ref.field}`;
  const detail =
    `Observed from ${source}` +
    (lastChecked ? `, captured ${lastChecked}` : "") +
    `. ${basis}.`;

  return { source, sourceKind, basis, lastChecked, evidenceType, classification, label, detail };
}

/**
 * WHY THIS (proof 4): for one visible fact, return the source it came
 * from, the observation record, the evidence type, and its epistemic
 * classification. Returns null when the fact is not visible to this
 * viewer or not bound. This is the same citeFact machinery the Ask FYD
 * answerer builds its citations from: one implementation, two surfaces.
 */
export function whyThis(
  ref: FactRef,
  graph: ObjectGraph,
  viewer: AskViewerIdentity | null | undefined = null,
): WhyThisResult | null {
  const citation = citeFact(ref, graph, viewer);
  if (!citation) return null;
  const projected = projectGraphForViewer(graph, viewer).graph;
  const obj = projected.objects.find((o) => o.id === ref.objectId);
  if (!obj) return null;
  const value = fieldValue(obj, ref.field);
  if (value === undefined) return null;
  const observation: WhyThisObservation = {
    objectId: obj.id,
    schema: obj.schema,
    title: obj.title,
    field: ref.field,
    value,
    capturedAt: asDatePrefix(obj.provenance?.derivedAt),
    provenanceKind: obj.provenance?.kind ?? "",
    provenanceRef: obj.provenance?.ref ?? "",
  };
  return {
    source: citation.source,
    sourceKind: citation.sourceKind,
    observation,
    evidenceType: citation.evidenceType,
    classification: citation.classification,
  };
}
