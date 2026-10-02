/**
 * Object kernel: graph verification + attestation.
 *
 * CONTRACT DERIVED (REWRITE, not copy) from ping-fyd-converged (SHA 32f8347)
 *   src/fyd/builder/object-builder.ts  (the six-check deterministic verifier)
 *
 * The source module is REJECTED as-is: it drags TenantContext
 * (fyd/tenant/tenant-context), the PingProjection intake shape
 * (fyd/data/ping-object-source), the eligibility vocabulary, node:crypto,
 * and ask-composer's canonicalize. What the kernel owns is the CHECK
 * CONTRACT, which is what the callers and tests actually exercise:
 *   1. ids-unique:        object and relationship ids non-empty and unique
 *   2. schema-catalog:    every object schema has a registered definition
 *   3. evidence-references: every object has a provenance ref and every
 *      relationship has an evidenceRef (no fact without a traceable basis)
 *   4. relationship-legality: endpoints exist, predicate non-empty and
 *      allowed by the subject's schema rules, status active|inactive
 *   5. visibility:        every object visibility is public|private (read,
 *      never mutated); relationship legs require public endpoints
 *
 * Source behaviors deliberately NOT carried over:
 *   - tenant attestation / CROSS_TENANT_REFERENCE -> tenant machinery,
 *     belongs to a tenant/capability layer, not the object kernel.
 *   - inverse normalization (works_for -> employs derivation): an
 *     evidence-preserving convenience for the FYD generator's traversal
 *     direction. Manifested as OPTIONAL; the kernel attests the graph as
 *     given.
 *   - the hardcoded LEGAL_PREDICATES set: superseded here by the schema
 *     relationship rules (./schema.ts), the vocabulary's real owner.
 *
 * The attestation digest reuses the trust kernel's pinned digest
 * (sha256-canonical-json-v1) over the verified graph: same graph ->
 * same bytes -> same digest, always.
 */

import { digestCanonical } from "../../trust/src/digest";
import { getSchemaDef, isAllowedPredicate } from "./schema";
import type { ObjectGraph } from "./graph";

export const OBJECT_KERNEL_VERSION = "piging2-object-kernel@1";

export type GraphVerifyCode =
  | "OBJECT_GRAPH_ID"
  | "OBJECT_GRAPH_SCHEMA"
  | "OBJECT_GRAPH_EVIDENCE"
  | "OBJECT_GRAPH_RELATIONSHIP"
  | "OBJECT_GRAPH_VISIBILITY";

export class GraphVerificationError extends Error {
  readonly code: GraphVerifyCode;
  constructor(code: GraphVerifyCode, message: string) {
    super(message);
    this.name = "GraphVerificationError";
    this.code = code;
  }
}

export interface GraphAttestation {
  builderVersion: string;
  objectCount: number;
  relationshipCount: number;
  /** sha256-canonical-json-v1 over the verified graph. */
  digest: string;
  /** Check names that passed, in canonical order. */
  checks: string[];
}

export interface VerifiedGraph {
  graph: ObjectGraph;
  attestation: GraphAttestation;
}

/**
 * Verify a graph and attest it for downstream consumers.
 * Throws GraphVerificationError on any failure. Never writes.
 */
export function verifyObjectGraph(graph: ObjectGraph): VerifiedGraph {
  const checks: string[] = [];

  // Check 1: ids non-empty and unique.
  const objectIds = new Set<string>();
  const byId = new Map<string, ObjectGraph["objects"][number]>();
  for (const o of graph.objects) {
    if (typeof o.id !== "string" || o.id.length === 0) {
      throw new GraphVerificationError("OBJECT_GRAPH_ID", "object has empty id");
    }
    if (objectIds.has(o.id)) {
      throw new GraphVerificationError("OBJECT_GRAPH_ID", 'duplicate object id "' + o.id + '"');
    }
    objectIds.add(o.id);
    byId.set(o.id, o);
  }
  const relIds = new Set<string>();
  for (const r of graph.relationships) {
    if (typeof r.id !== "string" || r.id.length === 0) {
      throw new GraphVerificationError("OBJECT_GRAPH_ID", "relationship has empty id");
    }
    if (relIds.has(r.id)) {
      throw new GraphVerificationError("OBJECT_GRAPH_ID", 'duplicate relationship id "' + r.id + '"');
    }
    relIds.add(r.id);
  }
  checks.push("ids-unique");

  // Check 2: schema catalog.
  for (const o of graph.objects) {
    if (!getSchemaDef(o.schema)) {
      throw new GraphVerificationError(
        "OBJECT_GRAPH_SCHEMA",
        'object "' + o.id + '" has unregistered schema "' + o.schema + '"',
      );
    }
  }
  checks.push("schema-catalog");

  // Check 3: evidence references. No fact without a traceable basis.
  for (const o of graph.objects) {
    const ref = o.provenance?.ref;
    if (typeof ref !== "string" || ref.length === 0) {
      throw new GraphVerificationError(
        "OBJECT_GRAPH_EVIDENCE",
        'object "' + o.id + '" lacks a provenance ref',
      );
    }
  }
  for (const r of graph.relationships) {
    if (typeof r.evidenceRef !== "string" || r.evidenceRef.length === 0) {
      throw new GraphVerificationError(
        "OBJECT_GRAPH_EVIDENCE",
        'relationship "' + r.id + '" lacks an evidenceRef',
      );
    }
  }
  checks.push("evidence-references");

  // Check 4: relationship legality.
  for (const r of graph.relationships) {
    if (!objectIds.has(r.subject)) {
      throw new GraphVerificationError(
        "OBJECT_GRAPH_RELATIONSHIP",
        'relationship "' + r.id + '" has unknown subject "' + r.subject + '"',
      );
    }
    if (!objectIds.has(r.object)) {
      throw new GraphVerificationError(
        "OBJECT_GRAPH_RELATIONSHIP",
        'relationship "' + r.id + '" has unknown object "' + r.object + '"',
      );
    }
    const subjectSchema = byId.get(r.subject)!.schema;
    if (typeof r.predicate !== "string" || r.predicate.length === 0) {
      throw new GraphVerificationError(
        "OBJECT_GRAPH_RELATIONSHIP",
        'relationship "' + r.id + '" has empty predicate',
      );
    }
    if (!isAllowedPredicate(subjectSchema, r.predicate)) {
      throw new GraphVerificationError(
        "OBJECT_GRAPH_RELATIONSHIP",
        'relationship "' + r.id + '" predicate "' + r.predicate +
          '" is not allowed for schema "' + subjectSchema + '"',
      );
    }
    if (r.status !== "active" && r.status !== "inactive") {
      throw new GraphVerificationError(
        "OBJECT_GRAPH_RELATIONSHIP",
        'relationship "' + r.id + '" has illegal status "' + String(r.status) + '"',
      );
    }
    // A relationship leg is usable as evidence only when both ends are
    // public. Fail closed: refuse rather than leak or silently drop.
    const subject = byId.get(r.subject);
    const target = byId.get(r.object);
    if (subject && subject.visibility !== "public") {
      throw new GraphVerificationError(
        "OBJECT_GRAPH_VISIBILITY",
        'relationship "' + r.id + '" uses non-public subject "' + r.subject + '" as evidence',
      );
    }
    if (target && target.visibility !== "public") {
      throw new GraphVerificationError(
        "OBJECT_GRAPH_VISIBILITY",
        'relationship "' + r.id + '" uses non-public object "' + r.object + '" as evidence',
      );
    }
  }
  checks.push("relationship-legality");

  // Check 5: visibility. Read, never mutated.
  for (const o of graph.objects) {
    if (o.visibility !== "public" && o.visibility !== "private") {
      throw new GraphVerificationError(
        "OBJECT_GRAPH_VISIBILITY",
        'object "' + o.id + '" has illegal visibility "' + String(o.visibility) + '"',
      );
    }
  }
  checks.push("visibility");

  const digest = digestCanonical(graph);

  return {
    graph,
    attestation: {
      builderVersion: OBJECT_KERNEL_VERSION,
      objectCount: graph.objects.length,
      relationshipCount: graph.relationships.length,
      digest,
      checks,
    },
  };
}
