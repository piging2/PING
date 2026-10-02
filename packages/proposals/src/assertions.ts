/**
 * Owner assertions (CONFIRM / CORRECT / HIDE) as append-only records.
 *
 * PROVISIONAL SHAPE (see types.ts): the sibling packages/owner worker had
 * not landed at build time. The SEMANTICS are the frozen source
 * semantics from ping-fyd-converged src/fyd/owner-mode/corrections.ts:
 *
 * - Assertions are append-only. A newer assertion names the older one in
 *   provenance.supersedes; only chain heads apply.
 * - REGENERATION projects assertions over FRESHLY extracted facts: the
 *   source is re-observed, the assertions replay on top, so a source
 *   refresh preserves owner corrections by construction.
 * - CONFLICT: when the source's CURRENT value for a CORRECTed/CONFIRMEd
 *   field differs from sourceValueSeen AND differs from the owner's
 *   asserted value, a conflict is surfaced with both values. The owner's
 *   value stays applied; the conflict is explicit, never a silent win.
 * - HIDE does not change a value. It is recorded as applied and reported
 *   in `hidden` for the visibility layer to consume; value projection
 *   never collapses FACT and VISIBILITY.
 *
 * Pure and deterministic. Browser-safe.
 */

import { digestCanonical } from "../../trust/src/digest";
import { deepClone } from "./clone";
import type { ObjectGraph } from "../../sitespec/src/types";
import type { PingObject, OwnerFieldCorrection } from "../../sitespec/src/ping-types";
import type {
  AppliedAssertion,
  AssertionConflict,
  AssertionOp,
  AssertionProvenance,
  OrphanedAssertion,
  OwnerAssertion,
} from "./types";

export interface DraftAssertionInput {
  objectId: string;
  field: string;
  op: AssertionOp;
  /** Required for CORRECT; must be absent for CONFIRM/HIDE. */
  value?: string;
  provenance: AssertionProvenance;
  sourceValueSeen?: string | null;
}

/**
 * Draft one assertion. Refuses honestly: CORRECT requires a non-empty
 * value; CONFIRM and HIDE must not carry one.
 */
export function draftAssertion(input: DraftAssertionInput): OwnerAssertion {
  const op = input.op;
  let value: string | undefined;
  if (op === "CORRECT") {
    const v = (input.value ?? "").trim();
    if (!v) {
      throw new Error("draftAssertion: CORRECT requires a non-empty corrected value.");
    }
    value = v;
  } else if (input.value !== undefined) {
    throw new Error(
      "draftAssertion: op " + op + " does not take a value; use CORRECT.",
    );
  }
  const provenance: AssertionProvenance = {
    owner: input.provenance.owner,
    assertedAt: input.provenance.assertedAt,
  };
  if (input.provenance.supersedes !== undefined) {
    provenance.supersedes = input.provenance.supersedes;
  }
  const body = {
    objectId: input.objectId,
    field: input.field,
    op,
    value: value ?? null,
    provenance,
    sourceValueSeen: input.sourceValueSeen ?? null,
  };
  return {
    assertionId: "oa-" + digestCanonical(body),
    objectId: input.objectId,
    field: input.field,
    op,
    ...(value !== undefined ? { value } : {}),
    provenance,
    sourceValueSeen: input.sourceValueSeen ?? null,
  };
}

/**
 * Chain heads: assertions no other assertion in the same
 * (objectId, field) group supersedes. Only heads apply. Deterministic
 * order: assertedAt, then assertionId.
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

function readField(o: PingObject, field: string): string | null {
  if (field === "title") return o.title;
  if (field === "description") return o.description;
  const v = o.fields[field];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.join(", ");
  return null;
}

function writeField(o: PingObject, field: string, value: string): void {
  if (field === "title") {
    o.title = value;
    return;
  }
  if (field === "description") {
    o.description = value;
    return;
  }
  o.fields[field] = value;
}

function fieldExists(o: PingObject, field: string): boolean {
  if (field === "title" || field === "description") return true;
  return o.fields[field] !== undefined;
}

const CORRECTABLE_CONTACT_FIELDS = ["phone", "email", "website", "description"] as const;

/** Attach a source-SAYS / owner-SAYS record in the harvested PingObject shape. */
function correctionRecord(
  field: string,
  objectId: string,
  sourceValue: string | null,
  ownerValue: string,
  assertedAt: string,
  owner: string,
): OwnerFieldCorrection | null {
  if (
    !(
      CORRECTABLE_CONTACT_FIELDS as readonly string[]
    ).includes(field)
  ) {
    return null;
  }
  return {
    field: field as (typeof CORRECTABLE_CONTACT_FIELDS)[number],
    targetObjectId: objectId,
    label: field.charAt(0).toUpperCase() + field.slice(1),
    sourceValue,
    ownerValue,
    correctedAt: assertedAt,
    actorLabel: owner,
    basis: "Owner correction: the owner asserts this value over the source observation.",
  };
}

export interface AssertionApplication {
  /** The graph with assertion values composed in (deep-cloned, never mutated input). */
  graph: ObjectGraph;
  applied: AppliedAssertion[];
  orphaned: OrphanedAssertion[];
  conflicts: AssertionConflict[];
  /** HIDE assertions: (objectId, field) pairs for the visibility layer. */
  hidden: Array<{ objectId: string; field: string; assertionId: string }>;
  /** Object ids whose effective values changed. */
  changedObjectIds: string[];
}

/**
 * Project assertions over freshly extracted facts. Pure: returns a new
 * graph, never mutates inputs. Call this after every regeneration.
 */
export function applyAssertionsToGraph(
  graph: ObjectGraph,
  assertions: OwnerAssertion[],
): AssertionApplication {
  const next: ObjectGraph = deepClone(graph) as ObjectGraph;
  const byId = new Map(next.objects.map((o) => [o.id, o] as const));
  const applied: AppliedAssertion[] = [];
  const orphaned: OrphanedAssertion[] = [];
  const conflicts: AssertionConflict[] = [];
  const hidden: Array<{ objectId: string; field: string; assertionId: string }> = [];
  const changed = new Set<string>();

  // Group heads by (objectId, field) so multiple heads on one field apply in order.
  const groups = new Map<string, OwnerAssertion[]>();
  for (const head of chainHeads(assertions)) {
    const key = head.objectId + "|" + head.field;
    const list = groups.get(key);
    if (list) list.push(head);
    else groups.set(key, [head]);
  }

  for (const heads of groups.values()) {
    for (const a of heads) {
      const o = byId.get(a.objectId);
      if (!o || !fieldExists(o, a.field)) {
        orphaned.push({
          assertionId: a.assertionId,
          reason:
            "object '" + a.objectId + "' or field '" + a.field +
            "' is not in the current extraction; assertion kept, not applied, not dropped.",
        });
        continue;
      }
      const current = readField(o, a.field) ?? "";
      const seen = a.sourceValueSeen ?? null;

      if (a.op === "HIDE") {
        hidden.push({ objectId: a.objectId, field: a.field, assertionId: a.assertionId });
        applied.push({ assertionId: a.assertionId, op: a.op, objectId: a.objectId, field: a.field });
        continue;
      }

      if (a.op === "CONFIRM") {
        if (seen !== null && current !== seen) {
          conflicts.push({
            assertionId: a.assertionId,
            objectId: a.objectId,
            field: a.field,
            sourceValue: current,
            ownerValue: seen,
            assertedAt: a.provenance.assertedAt,
            reason:
              "the source changed this field after the owner confirmed it: confirmed '" +
              seen + "', source now says '" + current + "'. The confirmation is stale; nothing was changed.",
          });
          continue;
        }
        applied.push({ assertionId: a.assertionId, op: a.op, objectId: a.objectId, field: a.field });
        continue;
      }

      // CORRECT
      const ownerValue = a.value as string;
      if (seen !== null && current !== seen && current !== ownerValue) {
        conflicts.push({
          assertionId: a.assertionId,
          objectId: a.objectId,
          field: a.field,
          sourceValue: current,
          ownerValue,
          assertedAt: a.provenance.assertedAt,
          reason:
            "the source changed this field after the owner corrected it: source said '" +
            seen + "' at correction time, owner set '" + ownerValue + "', source now says '" +
            current + "'. The owner's value stays applied; review required.",
        });
      }
      writeField(o, a.field, ownerValue);
      const record = correctionRecord(a.field, a.objectId, current, ownerValue, a.provenance.assertedAt, a.provenance.owner);
      if (record) {
        const rest = (o.ownerFieldCorrections ?? []).filter((r) => r.field !== record.field);
        o.ownerFieldCorrections = [...rest, record];
      }
      changed.add(a.objectId);
      applied.push({ assertionId: a.assertionId, op: a.op, objectId: a.objectId, field: a.field });
    }
  }

  return {
    graph: next,
    applied,
    orphaned,
    conflicts,
    hidden,
    changedObjectIds: [...changed].sort(),
  };
}
