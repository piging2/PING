/**
 * Owner corrections as assertions (CONFIRM / CORRECT / HIDE).
 *
 * HARVEST BANNER (piging2)
 * SOURCE: /home/nolan/projects/ping-fyd-converged @ 32f83474
 *         src/fyd/owner-mode/corrections.ts (CorrectionOp, FactRef,
 *         OwnerAssertion, AssertCorrectionInput, normalizeFactRef,
 *         assertionFactId, assertCorrection, CorrectionConflict,
 *         AppliedAssertion, OrphanedAssertion, chainHeads, applyCorrections)
 * TARGET OWNER: packages/owner (piging2 owner corrections)
 * MODE: ADAPT. The assertion algebra is preserved EXACTLY:
 *   - assertions are APPEND-ONLY records; a newer assertion names the
 *     older one in provenance.supersedes; only chain heads apply, so an
 *     old correction can neither silently win nor silently lose;
 *   - REGENERATION: applyCorrections projects assertions over a FRESHLY
 *     extracted graph, so a source refresh preserves owner corrections
 *     by construction;
 *   - CONFLICT: source current != sourceValueSeen AND != owner value ->
 *     CorrectionConflict is surfaced with both values and the owner's
 *     value stays applied; a source that adopted the owner's value is
 *     not a conflict (the assertion is satisfied);
 *   - HIDE does not change the fact's value; it lands in hiddenFactIds
 *     for the visibility layer (./visibility.ts).
 * The projection target changes from the source's SiteFact[] to the
 * piging2 ObjectGraph: a "fact" is one field element of one object
 * (objectId + field + index), addressed by the same deterministic
 * factIdFor formula. CONFIRM confirmations ride the CorrectedGraph
 * result (the graph carries no per-fact record). A CORRECT projection
 * attaches the verifier's read-seam record (OwnerFieldCorrection) to the
 * projected object, so the corrected graph passes the SiteSpec binding
 * verifier's owner-assertion lane: the assertion is itself evidence
 * (kind "owner-assertion", ref to the assertion id).
 * Read-seam boundary, documented: ownerFieldCorrections expresses
 * phone/email/website/description (the verifier's vocabulary). A CORRECT
 * on any other field is ORPHANED - kept, not applied, not dropped -
 * because projecting the value without the read-seam record would
 * launder owner authorship as direct evidence.
 * canonicalJson -> trust kernel canonicalize; sha256Hex -> trust kernel.
 * DEPENDENCIES: ./provenance, ../../trust/src/digest,
 *               ../../sitespec/src/types + ./ping-types (type-only)
 * PROOFS: [6]
 *
 * Pure, deterministic, browser-safe.
 */

import type { ObjectGraph } from "../../sitespec/src/types";
import type { OwnerFieldCorrection, PingObject } from "../../sitespec/src/ping-types";
import { canonicalize } from "../../trust/src/digest";
import {
  factIdFor,
  shortId,
  type OwnerProvenance,
} from "./provenance";

/** The three owner operations on a graph fact. */
export type CorrectionOp = "CONFIRM" | "CORRECT" | "HIDE";

/** Addresses one element of one object field. */
export interface FactRef {
  objectId: string;
  /** "title" | "description" | a fields[] key. */
  field: string;
  /** Element index for array-valued fields; defaults to 0. */
  index?: number;
}

/**
 * One owner assertion. Stored, never mutated. The assertionId is
 * deterministic: "oa-" + sha256 of the canonical assertion body, so the
 * same assertion drafted twice (same clock) is the same record, and
 * supersedes chains are stable across replays.
 */
export interface OwnerAssertion {
  assertionId: string;
  factRef: FactRef;
  op: CorrectionOp;
  /** The owner's value. Set for CORRECT, null otherwise. */
  value: string | null;
  provenance: OwnerProvenance;
  /**
   * What the source said when the owner asserted. The conflict detector
   * compares this against the source's current value. Null when the
   * source had no value (or the asserter did not record it).
   */
  sourceValueSeen: string | null;
}

export interface AssertCorrectionInput {
  factRef: FactRef;
  op: CorrectionOp;
  /** Required for CORRECT: the owner's corrected value. */
  value?: string;
  provenance: OwnerProvenance;
  sourceValueSeen?: string | null;
}

/** Normalize a FactRef so ids are stable (index defaults to 0). */
export function normalizeFactRef(ref: FactRef): Required<FactRef> {
  return {
    objectId: ref.objectId,
    field: ref.field,
    index: ref.index ?? 0,
  };
}

/** The factId an assertion addresses. */
export function assertionFactId(a: Pick<OwnerAssertion, "factRef">): string {
  const r = normalizeFactRef(a.factRef);
  return factIdFor(r.objectId, r.field, r.index);
}

/**
 * Draft one assertion. Refuses honestly: CORRECT requires a non-empty
 * value; CONFIRM and HIDE must not carry one.
 */
export function assertCorrection(input: AssertCorrectionInput): OwnerAssertion {
  const factRef = normalizeFactRef(input.factRef);
  let value: string | null = null;
  if (input.op === "CORRECT") {
    const v = (input.value ?? "").trim();
    if (!v) {
      throw new Error(
        "assertCorrection: CORRECT requires a non-empty corrected value.",
      );
    }
    value = v;
  } else if (input.value !== undefined && input.value !== null) {
    throw new Error(
      "assertCorrection: op " + input.op + " does not take a value; use CORRECT.",
    );
  }
  const sourceValueSeen =
    input.sourceValueSeen === undefined ? null : input.sourceValueSeen;
  const assertionId = shortId(
    "oa-",
    canonicalize({
      factRef,
      op: input.op,
      value,
      provenance: input.provenance,
      sourceValueSeen,
    }),
  );
  return {
    assertionId,
    factRef,
    op: input.op,
    value,
    provenance: input.provenance,
    sourceValueSeen,
  };
}

/**
 * A surfaced conflict: the source changed the same field after the owner
 * asserted. Both values are carried; the projection keeps the owner's
 * value applied (corrections survive regen) AND lists the conflict, so
 * neither side wins silently.
 */
export interface CorrectionConflict {
  assertionId: string;
  factRef: Required<FactRef>;
  /** What the source says now. */
  sourceValue: string;
  /** What the owner asserted (CORRECT value, or the confirmed value). */
  ownerValue: string;
  assertedAt: string;
  reason: string;
}

export interface AppliedAssertion {
  assertionId: string;
  op: CorrectionOp;
  factId: string;
}

export interface OrphanedAssertion {
  assertionId: string;
  reason: string;
}

/** One addressable fact element of the object graph. */
export interface GraphFact {
  factId: string;
  objectId: string;
  /** "title" | "description" | a fields[] key. */
  field: string;
  index: number;
  value: string;
}

/**
 * Extract the addressable facts from a graph. Deterministic: object
 * order, then title, description, then fields[] insertion order, then
 * element index. factIds are stable across re-observations with stable
 * object ids (see factIdFor).
 */
export function extractGraphFacts(graph: ObjectGraph): GraphFact[] {
  const facts: GraphFact[] = [];
  for (const o of graph.objects) {
    const push = (field: string, index: number, value: string): void => {
      facts.push({
        factId: factIdFor(o.id, field, index),
        objectId: o.id,
        field,
        index,
        value,
      });
    };
    push("title", 0, o.title ?? "");
    push("description", 0, o.description ?? "");
    for (const [field, v] of Object.entries(o.fields ?? {})) {
      if (Array.isArray(v)) {
        v.forEach((el, i) => push(field, i, el));
      } else {
        push(field, 0, v);
      }
    }
  }
  return facts;
}

/**
 * Fields the verifier's read seam can express as owner corrections.
 * A CORRECT on any other field is orphaned (kept, not applied, not
 * dropped): projecting the value without the read-seam record would
 * launder owner authorship as direct evidence.
 */
const READ_SEAM_FIELDS: ReadonlySet<string> = new Set([
  "phone",
  "email",
  "website",
  "description",
]);

function isReadSeamField(
  field: string,
): field is "phone" | "email" | "website" | "description" {
  return READ_SEAM_FIELDS.has(field);
}

const FIELD_LABELS: Record<string, string> = {
  phone: "Phone",
  email: "Email",
  website: "Website",
  description: "Description",
};

/** A CONFIRM outcome: which fact, who confirmed it, when. */
export interface GraphConfirmation {
  factId: string;
  owner: string;
  assertedAt: string;
}

export interface CorrectedGraph {
  /**
   * Projected graph: fresh object records, owner values composed over
   * the source. The input graph is never mutated. CORRECTed objects
   * carry the verifier's read-seam record (ownerFieldCorrections);
   * HIDE leaves values untouched (see hiddenFactIds).
   */
  graph: ObjectGraph;
  /**
   * factIds hidden by HIDE assertions. Consumed by the visibility layer;
   * kept separate so FACT and VISIBILITY never collapse.
   */
  hiddenFactIds: string[];
  conflicts: CorrectionConflict[];
  applied: AppliedAssertion[];
  orphaned: OrphanedAssertion[];
  confirmations: GraphConfirmation[];
  /**
   * factId -> assertionId for every applied head: the ref behind the
   * owner-assertion evidence the binding verifier binds.
   */
  assertionRefs: Record<string, string>;
}

function groupKey(ref: Required<FactRef>): string {
  return ref.objectId + "|" + ref.field + "|" + ref.index;
}

/**
 * Chain heads: assertions no other assertion in the same group supersedes.
 * Only heads apply. Deterministic order: assertedAt, then assertionId.
 */
export function chainHeads(assertions: OwnerAssertion[]): OwnerAssertion[] {
  const superseded = new Set<string>();
  for (const a of assertions) {
    if (a.provenance.supersedes) superseded.add(a.provenance.supersedes);
  }
  return assertions
    .filter((a) => !superseded.has(a.assertionId))
    .sort((a, b) =>
      a.provenance.assertedAt < b.provenance.assertedAt
        ? -1
        : a.provenance.assertedAt > b.provenance.assertedAt
          ? 1
          : a.assertionId < b.assertionId
            ? -1
            : 1,
    );
}

/** Write one corrected value back onto a projected object copy. */
function writeCorrectedValue(
  obj: PingObject,
  field: string,
  index: number,
  value: string,
): void {
  if (field === "description") {
    obj.description = value;
    return;
  }
  const current = obj.fields[field];
  if (Array.isArray(current)) {
    const next = [...current];
    next[index] = value;
    obj.fields[field] = next;
    return;
  }
  obj.fields[field] = value;
}

/**
 * Project assertions over a freshly extracted object graph. Pure: returns
 * new object records, never mutates inputs. Call this after every
 * regeneration: the same assertions over a new source graph preserve
 * owner intent, and source changes to asserted fields surface as
 * conflicts.
 */
export function applyCorrections(
  graph: ObjectGraph,
  assertions: OwnerAssertion[],
): CorrectedGraph {
  const facts = extractGraphFacts(graph);
  const byId = new Map(facts.map((f) => [f.factId, f] as const));
  const projectedObjects: PingObject[] = graph.objects.map((o) => ({
    ...o,
    fields: { ...o.fields },
  }));
  const byProjectedId = new Map(projectedObjects.map((o) => [o.id, o] as const));
  const hiddenFactIds: string[] = [];
  const conflicts: CorrectionConflict[] = [];
  const applied: AppliedAssertion[] = [];
  const orphaned: OrphanedAssertion[] = [];
  const confirmations: GraphConfirmation[] = [];
  const assertionRefs: Record<string, string> = {};

  // Group heads by fact so multiple heads on one fact apply in order.
  const groups = new Map<string, OwnerAssertion[]>();
  for (const head of chainHeads(assertions)) {
    const key = groupKey(normalizeFactRef(head.factRef));
    const list = groups.get(key);
    if (list) list.push(head);
    else groups.set(key, [head]);
  }

  for (const heads of groups.values()) {
    for (const a of heads) {
      const factId = assertionFactId(a);
      const fact = byId.get(factId);
      const obj = byProjectedId.get(normalizeFactRef(a.factRef).objectId);
      if (!fact || !obj) {
        orphaned.push({
          assertionId: a.assertionId,
          reason:
            "fact " +
            factId +
            " (" +
            a.factRef.objectId +
            " : " +
            a.factRef.field +
            ") is not in the current extraction; assertion kept, not applied, not dropped.",
        });
        continue;
      }
      const current = fact.value;
      const seen = a.sourceValueSeen;

      if (a.op === "HIDE") {
        if (!hiddenFactIds.includes(factId)) hiddenFactIds.push(factId);
        applied.push({ assertionId: a.assertionId, op: a.op, factId });
        assertionRefs[factId] = a.assertionId;
        continue;
      }

      if (a.op === "CONFIRM") {
        if (seen !== null && current !== seen) {
          conflicts.push({
            assertionId: a.assertionId,
            factRef: normalizeFactRef(a.factRef),
            sourceValue: current,
            ownerValue: seen,
            assertedAt: a.provenance.assertedAt,
            reason:
              "the source changed this field after the owner confirmed it: " +
              "confirmed '" +
              seen +
              "', source now says '" +
              current +
              "'. The confirmation is stale; nothing was changed.",
          });
          continue;
        }
        confirmations.push({
          factId,
          owner: a.provenance.owner,
          assertedAt: a.provenance.assertedAt,
        });
        applied.push({ assertionId: a.assertionId, op: a.op, factId });
        assertionRefs[factId] = a.assertionId;
        continue;
      }

      // CORRECT
      if (!isReadSeamField(a.factRef.field)) {
        orphaned.push({
          assertionId: a.assertionId,
          reason:
            "field '" +
            a.factRef.field +
            "' is not expressible on the verifier's read seam " +
            "(ownerFieldCorrections supports phone/email/website/description); " +
            "projecting the value without the read-seam record would launder " +
            "owner authorship as direct evidence, so the assertion is kept, " +
            "not applied, not dropped.",
        });
        continue;
      }
      const ownerValue = a.value as string;
      let drifted = false;
      if (seen !== null && current !== seen && current !== ownerValue) {
        drifted = true;
        conflicts.push({
          assertionId: a.assertionId,
          factRef: normalizeFactRef(a.factRef),
          sourceValue: current,
          ownerValue,
          assertedAt: a.provenance.assertedAt,
          reason:
            "the source changed this field after the owner corrected it: " +
            "source said '" +
            seen +
            "' at correction time, owner set '" +
            ownerValue +
            "', source now says '" +
            current +
            "'. The owner's value stays applied; review required.",
        });
      }
      writeCorrectedValue(obj, a.factRef.field, fact.index, ownerValue);
      const record: OwnerFieldCorrection = {
        field: a.factRef.field,
        targetObjectId: obj.id,
        label: FIELD_LABELS[a.factRef.field] ?? a.factRef.field,
        sourceValue: seen,
        ownerValue,
        correctedAt: a.provenance.assertedAt,
        actorLabel: a.provenance.owner,
        basis:
          "Owner correction " +
          a.assertionId +
          ": the owner asserts '" +
          ownerValue +
          "' for " +
          obj.id +
          "#" +
          a.factRef.field +
          ".",
        ...(drifted ? { sourceDrifted: true } : {}),
      };
      obj.ownerFieldCorrections = [
        ...(obj.ownerFieldCorrections ?? []),
        record,
      ];
      applied.push({ assertionId: a.assertionId, op: a.op, factId });
      assertionRefs[factId] = a.assertionId;
    }
  }

  return {
    graph: {
      objects: projectedObjects,
      relationships: graph.relationships.map((r) => ({ ...r })),
    },
    hiddenFactIds,
    conflicts,
    applied,
    orphaned,
    confirmations,
    assertionRefs,
  };
}
