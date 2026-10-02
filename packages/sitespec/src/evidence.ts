/**
 * Evidence derivation: ObjectGraph -> explicit, digested evidence records.
 *
 * NEW FYD CODE (piging2), not a harvest. This is the EVIDENCE stage of
 * the vertical slice:
 *
 *   (captured ingestion record) -> EVIDENCE -> OBJECTS -> SITE SPEC -> RENDER
 *
 * The slice's input is a CAPTURED RECORD: the Happy Place fixture is a
 * machine-generated output of the source proceduralizer pipeline at a
 * pinned commit (see fixtures/happy-place-graph.ts), not a live fetch.
 * The fixture already carries per-object provenance (ref, derivedAt) and
 * per-relationship evidenceRef values. This stage makes the claims
 * EXPLICIT and DIGESTED:
 *
 * - one EvidenceRecord per object claim (title, description, each field)
 * - one EvidenceRecord per relationship claim (predicate edge)
 * - every record carries the source provenance ref and claimKind
 * - evidenceId = digestCanonical over the canonical claim form
 *   (deterministic; same claim -> same id across runs)
 *
 * The derivation digest (over the sorted evidence ids) is the stage's
 * attestation: it pins exactly which evidence the downstream spec and
 * render model were built from. The binding verifier independently
 * checks object provenance; this stage additionally powers the
 * EVIDENCE COVERAGE metric (% of rendered factual claims that bind to
 * an evidence record).
 *
 * Nothing here invents claims: records are derived only from the input
 * graph's objects, fields, and relationships. claimKind is always
 * "website_statement" for website-derived inputs: claimed by the
 * website, never verified fact.
 */

import { digestCanonical } from "../../trust/src/digest";
import type { ObjectGraph } from "./types";
import type { PingObject, PingRelationship } from "./ping-types";

export type { ObjectGraph };

/** One evidence-backed claim derived from the input graph. */
export interface EvidenceRecord {
  /** Deterministic id: digestCanonical of the canonical claim form. */
  evidenceId: string;
  /** The object this claim is about. */
  objectId: string;
  /** "title" | "description" | a fields key | "relationship". */
  field: string;
  /** The claimed value (relationship claims: the predicate). */
  value: string;
  /** Source provenance ref, carried from the object/relationship. */
  provenanceRef: string;
  /** When the source evidence was derived. */
  derivedAt: string;
  /** Always "website_statement" for website-derived inputs. */
  claimKind: "website_statement";
  /**
   * Input provenance label. "captured-record" for the fixture path:
   * the graph is a machine-generated capture of an earlier
   * proceduralizer run, not a live fetch.
   */
  inputKind: "captured-record" | "live-fetch";
}

export interface EvidenceDerivation {
  records: EvidenceRecord[];
  /** digestCanonical over the sorted evidence ids: the stage attestation. */
  derivationDigest: string;
  inputKind: EvidenceRecord["inputKind"];
}

function claimForm(
  objectId: string,
  field: string,
  value: string,
  provenanceRef: string,
  claimKind: string,
): Record<string, string> {
  return { objectId, field, value, provenanceRef, claimKind };
}

function objectClaims(
  o: PingObject,
  inputKind: EvidenceRecord["inputKind"],
): EvidenceRecord[] {
  const ref = o.provenance?.ref ?? "";
  const derivedAt = o.provenance?.derivedAt ?? "";
  const out: EvidenceRecord[] = [];
  const push = (field: string, value: string) => {
    if (value === "") return;
    out.push({
      evidenceId: digestCanonical(
        claimForm(o.id, field, value, ref, "website_statement"),
      ),
      objectId: o.id,
      field,
      value,
      provenanceRef: ref,
      derivedAt,
      claimKind: "website_statement",
      inputKind,
    });
  };
  push("title", o.title);
  push("description", o.description);
  for (const [k, v] of Object.entries(o.fields)) {
    push(k, Array.isArray(v) ? v.filter((s) => s !== "").join(", ") : v);
  }
  return out;
}

function relationshipClaim(
  r: PingRelationship,
  inputKind: EvidenceRecord["inputKind"],
): EvidenceRecord | null {
  if (r.status !== "active") return null;
  const ref = r.evidenceRef ?? "";
  return {
    evidenceId: digestCanonical(
      claimForm(r.subject, "relationship:" + r.predicate, r.object, ref, "website_statement"),
    ),
    objectId: r.subject,
    field: "relationship:" + r.predicate,
    value: r.object,
    provenanceRef: ref,
    derivedAt: r.createdAt,
    claimKind: "website_statement",
    inputKind,
  };
}

/**
 * Derive the explicit evidence set from an object graph. Pure and
 * deterministic: records are emitted in graph order (objects, then
 * relationships), and evidence ids are content digests, so the same
 * graph always yields the same derivation regardless of how it was
 * constructed.
 */
export function deriveEvidence(
  graph: ObjectGraph,
  inputKind: EvidenceRecord["inputKind"] = "captured-record",
): EvidenceDerivation {
  const records: EvidenceRecord[] = [];
  for (const o of graph.objects) {
    records.push(...objectClaims(o, inputKind));
  }
  for (const r of graph.relationships) {
    const rec = relationshipClaim(r, inputKind);
    if (rec) records.push(rec);
  }
  const ids = records.map((r) => r.evidenceId).sort();
  return {
    records,
    derivationDigest: digestCanonical({ ids }),
    inputKind,
  };
}

/**
 * Evidence coverage: what fraction of the given factual bindings resolve
 * to an evidence record (by objectId + field). The directive's product
 * metric. Bindings with field "title"/"description"/a fields key match
 * object records; relationship bindings are out of scope for render
 * coverage and counted as uncovered (never silently covered).
 */
export function evidenceCoverage(
  derivation: EvidenceDerivation,
  bindings: ReadonlyArray<{ objectId: string; field: string }>,
): { covered: number; total: number; ratio: number } {
  const have = new Set(
    derivation.records.map((r) => r.objectId + "\u0000" + r.field),
  );
  let covered = 0;
  for (const b of bindings) {
    if (have.has(b.objectId + "\u0000" + b.field)) covered++;
  }
  const total = bindings.length;
  return { covered, total, ratio: total === 0 ? 1 : covered / total };
}
