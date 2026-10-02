#!/usr/bin/env python3
"""G3 patch: terminal drop reasons for every relationship candidate.

- structured-data.ts: @id-ref candidates that never survive extraction are
  recorded as refDrops (UNRESOLVED_TARGET / POLICY_SUPPRESSED) instead of
  silently skipped.
- proceduralizer.ts: RelationshipOutcome vocabulary (8 terminals);
  project() records a RelationshipDrop for every non-accepted candidate
  (UNRESOLVED_SOURCE / UNRESOLVED_TARGET / REJECTED_SCHEMA self-loop /
  DUPLICATE); ProjectedGraph and PipelineReport carry the ledger;
  entitiesByType added to the report for the employment proof.
"""
import sys

REPO = "/home/nolan/projects/ping"

# ================= structured-data.ts =================
P = REPO + "/src/fyd/proceduralize/structured-data.ts"
src = open(P).read()

# 1. StructuredRefDrop interface after StructuredRelation.
old = """export interface StructuredRelation {
  subjectKey: string;
  predicate: string;
  objectKey: string;
  /** Compact schema.org property the relationship came from. */
  property: string;
  blockIndex: number;
}
"""
new = """export interface StructuredRelation {
  subjectKey: string;
  predicate: string;
  objectKey: string;
  /** Compact schema.org property the relationship came from. */
  property: string;
  blockIndex: number;
}

/**
 * An @id-reference candidate that died inside extraction, before the
 * proceduralizer ever saw it. G3 (2026-09-24): no silent semantic loss.
 * outcome is one of the relationship terminal outcomes (see
 * proceduralizer.ts RelationshipOutcome): UNRESOLVED_TARGET when the
 * referenced node id was never visited; POLICY_SUPPRESSED when the target
 * was visited but deliberately skipped as site chrome.
 */
export interface StructuredRefDrop {
  subjectKey: string;
  property: string;
  predicate: string;
  refNodeId: string;
  blockIndex: number;
  outcome: "UNRESOLVED_TARGET" | "POLICY_SUPPRESSED";
  reason: string;
}
"""
assert src.count(old) == 1, "StructuredRelation block"
src = src.replace(old, new)

# 2. refDrops field on StructuredExtraction.
old = """export interface StructuredExtraction {
  facts: ParsedFact[];
  relationships: StructuredRelation[];
  entities: EntityCandidate[];
  unsupported: UnsupportedEvidence[];
"""
new = """export interface StructuredExtraction {
  facts: ParsedFact[];
  relationships: StructuredRelation[];
  /** @id-ref candidates dropped inside extraction (G3: typed, never silent). */
  refDrops: StructuredRefDrop[];
  entities: EntityCandidate[];
  unsupported: UnsupportedEvidence[];
"""
assert src.count(old) == 1, "StructuredExtraction fields"
src = src.replace(old, new)

# 3. Declare refDrops next to relationships.
old = """  const facts: ParsedFact[] = [];
  const relationships: StructuredRelation[] = [];
  let privateFactsWithheld = 0;
"""
new = """  const facts: ParsedFact[] = [];
  const relationships: StructuredRelation[] = [];
  const refDrops: StructuredRefDrop[] = [];
  let privateFactsWithheld = 0;
"""
assert src.count(old) == 1, "refDrops declaration"
src = src.replace(old, new)

# 4. Record drops instead of silently continuing.
old = """      for (const ref of refs) {
        const objectKey = keyByNodeId.get(ref);
        if (!objectKey || skippedKeys.has(objectKey)) continue;
        relationships.push({
          subjectKey: e.key,
          predicate: PREDICATE_MAP[property] ?? "references",
          objectKey,
          property,
          blockIndex: e.blockIndex,
        });
      }
"""
new = """      for (const ref of refs) {
        const objectKey = keyByNodeId.get(ref);
        const predicate = PREDICATE_MAP[property] ?? "references";
        if (!objectKey) {
          // The bytes referenced a node id the expansion never visited:
          // observed, but unresolvable.
          refDrops.push({
            subjectKey: e.key,
            property,
            predicate,
            refNodeId: ref,
            blockIndex: e.blockIndex,
            outcome: "UNRESOLVED_TARGET",
            reason: `referenced node id "${ref}" was never visited by @graph expansion`,
          });
          continue;
        }
        if (skippedKeys.has(objectKey)) {
          // Visited, then deliberately skipped: site chrome is a policy
          // decision, so the drop is POLICY_SUPPRESSED, not unresolved.
          refDrops.push({
            subjectKey: e.key,
            property,
            predicate,
            refNodeId: ref,
            blockIndex: e.blockIndex,
            outcome: "POLICY_SUPPRESSED",
            reason: `target node is site chrome (${objectKey}), skipped by policy`,
          });
          continue;
        }
        relationships.push({
          subjectKey: e.key,
          predicate,
          objectKey,
          property,
          blockIndex: e.blockIndex,
        });
      }
"""
assert src.count(old) == 1, "refs loop"
src = src.replace(old, new)

# 5. Sort + return refDrops.
old = """  const nodeIds = visitedNodeIds;
  const malformed = blocks.filter((b) => !b.ok).length;
  return {
    facts,
    relationships,
    entities: entities.filter((e) => !skippedKeys.has(e.key)),
    unsupported,
"""
new = """  const nodeIds = visitedNodeIds;
  const malformed = blocks.filter((b) => !b.ok).length;
  refDrops.sort((a, b) => {
    const ka = a.subjectKey + "|" + a.property + "|" + a.refNodeId;
    const kb = b.subjectKey + "|" + b.property + "|" + b.refNodeId;
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
  return {
    facts,
    relationships,
    refDrops,
    entities: entities.filter((e) => !skippedKeys.has(e.key)),
    unsupported,
"""
assert src.count(old) == 1, "return block"
src = src.replace(old, new)

open(P, "w").write(src)
print("structured-data.ts patched")

# ================= proceduralizer.ts =================
P = REPO + "/src/fyd/proceduralize/proceduralizer.ts"
src = open(P).read()

# 1. Outcome vocabulary + drop record, before ProjectedGraph.
old = """export interface ProjectedGraph {
  objects: PingObject[];
  relationships: PingRelationship[];
  /** Grill 7: per-object, per-field fact classes for the projected graph. */
  fieldClasses?: Record<string, Record<string, FactClass>>;
  /** Relationships dropped because an endpoint had no projected object. */
  droppedRelationships?: number;
}
"""
new = """/**
 * Terminal outcome of a relationship CANDIDATE. G3 (2026-09-24): every
 * candidate the pipeline considers terminates in exactly one of these;
 * there is no silent drop. Working vocabulary: the names are not yet
 * constitutionalized.
 *
 * Firing paths in the current pipeline:
 * - ACCEPTED: emitted into the graph.
 * - REJECTED_SCHEMA: structurally invalid (self-loop); predicate/schema
 *   vocabulary violations would also terminate here.
 * - UNRESOLVED_SOURCE / UNRESOLVED_TARGET: an endpoint entity key has no
 *   projected object.
 * - AMBIGUOUS_TARGET: defined for future multi-match resolution; no live
 *   firing path (entity keys resolve 1:1 today).
 * - DUPLICATE: identical (subject, predicate, object) triple already
 *   emitted; the first occurrence wins.
 * - POLICY_SUPPRESSED: candidate observed but deliberately skipped by
 *   policy (site-chrome @id-ref targets).
 * - UNSUPPORTED: defined for relationship-shaped evidence with no
 *   pipeline representation; no live firing path (distinct from
 *   UNRESOLVED_TARGET, where the target was never observed).
 */
export type RelationshipOutcome =
  | "ACCEPTED"
  | "REJECTED_SCHEMA"
  | "UNRESOLVED_SOURCE"
  | "UNRESOLVED_TARGET"
  | "AMBIGUOUS_TARGET"
  | "DUPLICATE"
  | "POLICY_SUPPRESSED"
  | "UNSUPPORTED";

export interface RelationshipDrop {
  /** Resolved object id when available, else the entity key or hint. */
  subject: string;
  predicate: string;
  /** Resolved object id when available, else the entity key, hint, or @id. */
  object: string;
  outcome: Exclude<RelationshipOutcome, "ACCEPTED">;
  reason: string;
  evidenceRef: string;
}

export interface ProjectedGraph {
  objects: PingObject[];
  relationships: PingRelationship[];
  /** Grill 7: per-object, per-field fact classes for the projected graph. */
  fieldClasses?: Record<string, Record<string, FactClass>>;
  /** Relationships dropped because an endpoint had no projected object. */
  droppedRelationships?: number;
  /** G3: every non-accepted candidate with its terminal outcome. */
  relationshipDrops?: RelationshipDrop[];
}
"""
assert src.count(old) == 1, "ProjectedGraph block"
src = src.replace(old, new)

# 2. ProjectOptions: accept refDrops.
old = """  relationships?: StructuredRelation[];
  primaryKey?: string | null;
"""
new = """  relationships?: StructuredRelation[];
  /** @id-ref candidates dropped inside structured extraction (G3). */
  refDrops?: import("./structured-data").StructuredRefDrop[];
  primaryKey?: string | null;
"""
assert src.count(old) == 1, "ProjectOptions"
src = src.replace(old, new)

# 3. Drop ledger + helper in project().
old = """  let droppedRelationships = 0;

  const objectIdByEntityKey = new Map<string, string>();
"""
new = """  let droppedRelationships = 0;
  const relationshipDrops: RelationshipDrop[] = [];
  const dropRel = (
    subject: string,
    predicate: string,
    object: string,
    outcome: Exclude<RelationshipOutcome, "ACCEPTED">,
    reason: string,
    evidenceRef: string,
  ): void => {
    relationshipDrops.push({ subject, predicate, object, outcome, reason, evidenceRef });
    droppedRelationships++;
  };

  const objectIdByEntityKey = new Map<string, string>();
"""
assert src.count(old) == 1, "drop ledger"
src = src.replace(old, new)

# 4. Structured @id-refs gate with terminal outcomes.
old = """  for (const r of opts.relationships ?? []) {
    const subject = objectIdByEntityKey.get(r.subjectKey);
    const object = objectIdByEntityKey.get(r.objectKey);
    if (!subject || !object || subject === object) {
      droppedRelationships++;
      continue;
    }
    mkRel(subject, r.predicate, object, `proceduralizer:structured:${r.property}`);
  }
"""
new = """  for (const r of opts.relationships ?? []) {
    const evidenceRef = `proceduralizer:structured:${r.property}`;
    const subject = objectIdByEntityKey.get(r.subjectKey);
    const object = objectIdByEntityKey.get(r.objectKey);
    if (!subject) {
      dropRel(r.subjectKey, r.predicate, r.objectKey, "UNRESOLVED_SOURCE",
        `subject entity key "${r.subjectKey}" has no projected object`, evidenceRef);
      continue;
    }
    if (!object) {
      dropRel(subject, r.predicate, r.objectKey, "UNRESOLVED_TARGET",
        `object entity key "${r.objectKey}" has no projected object`, evidenceRef);
      continue;
    }
    if (subject === object) {
      dropRel(subject, r.predicate, object, "REJECTED_SCHEMA",
        "self-loop: subject and object resolve to the same object", evidenceRef);
      continue;
    }
    mkRel(subject, r.predicate, object, evidenceRef);
  }
"""
assert src.count(old) == 1, "structured gate"
src = src.replace(old, new)

# 5. relate() pairs gate with terminal outcomes.
old = """  for (const p of opts.pairs ?? []) {
    const subject = p.subjectHint === "business" ? businessId : objectIdByEntityKey.get(p.subjectHint);
    if (!subject) {
      droppedRelationships++;
      continue;
    }
    let object: string | undefined;
    if (/^https?:\\/\\//i.test(p.objectHint)) {
      object = ensureExternalIdentity(p.objectHint);
    } else {
      object = objectIdByEntityKey.get(p.objectHint);
    }
    if (!object || subject === object) {
      droppedRelationships++;
      continue;
    }
    mkRel(subject, p.predicate, object, "proceduralizer:relate");
  }
"""
new = """  for (const p of opts.pairs ?? []) {
    const subject = p.subjectHint === "business" ? businessId : objectIdByEntityKey.get(p.subjectHint);
    if (!subject) {
      dropRel(p.subjectHint, p.predicate, p.objectHint, "UNRESOLVED_SOURCE",
        `subject hint "${p.subjectHint}" has no projected object`, "proceduralizer:relate");
      continue;
    }
    let object: string | undefined;
    if (/^https?:\\/\\//i.test(p.objectHint)) {
      object = ensureExternalIdentity(p.objectHint);
    } else {
      object = objectIdByEntityKey.get(p.objectHint);
    }
    if (!object) {
      dropRel(subject, p.predicate, p.objectHint, "UNRESOLVED_TARGET",
        `object hint "${p.objectHint}" has no projected object`, "proceduralizer:relate");
      continue;
    }
    if (subject === object) {
      dropRel(subject, p.predicate, object, "REJECTED_SCHEMA",
        "self-loop: subject and object resolve to the same object", "proceduralizer:relate");
      continue;
    }
    mkRel(subject, p.predicate, object, "proceduralizer:relate");
  }

  // -- Candidates that died inside structured extraction (G3): folded into
  //    the same ledger so no drop is silent anywhere in the pipeline.
  for (const d of opts.refDrops ?? []) {
    dropRel(d.subjectKey, d.predicate, d.refNodeId, d.outcome, d.reason,
      `proceduralizer:structured-ref:${d.property}`);
  }
"""
assert src.count(old) == 1, "pairs gate"
src = src.replace(old, new)

# 6. Dedupe -> DUPLICATE.
old = """  const seenRel = new Set<string>();
  const uniqueRelationships = relationships.filter((r) => {
    const k = r.subject + "|" + r.predicate + "|" + r.object;
    if (seenRel.has(k)) return false;
    seenRel.add(k);
    return true;
  });
"""
new = """  const seenRel = new Set<string>();
  const uniqueRelationships = relationships.filter((r) => {
    const k = r.subject + "|" + r.predicate + "|" + r.object;
    if (seenRel.has(k)) {
      dropRel(r.subject, r.predicate, r.object, "DUPLICATE",
        "identical (subject, predicate, object) triple already emitted; first occurrence wins",
        r.evidenceRef);
      return false;
    }
    seenRel.add(k);
    return true;
  });
"""
assert src.count(old) == 1, "dedupe"
src = src.replace(old, new)

# 7. Return the ledger (sorted for determinism).
old = """  return { objects, relationships: uniqueRelationships, fieldClasses, droppedRelationships };
"""
new = """  relationshipDrops.sort((a, b) => {
    const ka = a.outcome + "|" + a.subject + "|" + a.predicate + "|" + a.object + "|" + a.reason;
    const kb = b.outcome + "|" + b.subject + "|" + b.predicate + "|" + b.object + "|" + b.reason;
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
  return {
    objects,
    relationships: uniqueRelationships,
    fieldClasses,
    droppedRelationships,
    relationshipDrops,
  };
"""
assert src.count(old) == 1, "project return"
src = src.replace(old, new)

# 8. mergeStructuredExtractions: merge refDrops.
old = """  const facts: ParsedFact[] = [];
  const relationships: StructuredRelation[] = [];
  const unsupported: StructuredExtraction["unsupported"] = [];
"""
new = """  const facts: ParsedFact[] = [];
  const relationships: StructuredRelation[] = [];
  const refDrops: StructuredExtraction["refDrops"] = [];
  const unsupported: StructuredExtraction["unsupported"] = [];
"""
assert src.count(old) == 1, "merge decls"
src = src.replace(old, new)

old = """    facts.push(...e.facts);
    relationships.push(...e.relationships);
    unsupported.push(...e.unsupported);
"""
new = """    facts.push(...e.facts);
    relationships.push(...e.relationships);
    refDrops.push(...e.refDrops);
    unsupported.push(...e.unsupported);
"""
assert src.count(old) == 1, "merge push"
src = src.replace(old, new)

old = """  return { facts, relationships, entities, unsupported, stats };
}

export async function runExtractionPipeline(
"""
new = """  refDrops.sort((a, b) => {
    const ka = a.subjectKey + "|" + a.property + "|" + a.refNodeId;
    const kb = b.subjectKey + "|" + b.property + "|" + b.refNodeId;
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
  return { facts, relationships, refDrops, entities, unsupported, stats };
}

export async function runExtractionPipeline(
"""
assert src.count(old) == 1, "merge return"
src = src.replace(old, new)

# 9. Pass refDrops into project().
old = """  const graph = project(resolved, opts.sourceUrl, opts.observedAt, opts.controllerId, {
    entities: structured.entities,
    entityFields,
    relationships: structured.relationships,
    primaryKey,
    pairs,
    overrides: opts.overrides,
  });
"""
new = """  const graph = project(resolved, opts.sourceUrl, opts.observedAt, opts.controllerId, {
    entities: structured.entities,
    entityFields,
    relationships: structured.relationships,
    refDrops: structured.refDrops,
    primaryKey,
    pairs,
    overrides: opts.overrides,
  });
"""
assert src.count(old) == 1, "project call"
src = src.replace(old, new)

# 10. PipelineReport: relationshipDrops + entitiesByType.
old = """  /** Private facts classified and withheld before generation (Grill 19). */
  privateWithheld: number;
  /** @GRAPH VERIFIED: every node the expansion visited. */
  graphNodesVisited: number;
  graphNodeIds: string[];
}
"""
new = """  /** Private facts classified and withheld before generation (Grill 19). */
  privateWithheld: number;
  /** @GRAPH VERIFIED: every node the expansion visited. */
  graphNodesVisited: number;
  graphNodeIds: string[];
  /** G3: every non-accepted relationship candidate with its terminal outcome. */
  relationshipDrops: RelationshipDrop[];
  /** G3: extracted entity counts by schema.org type (sorted keys). */
  entitiesByType: Record<string, number>;
}
"""
assert src.count(old) == 1, "PipelineReport"
src = src.replace(old, new)

# 11. Populate the report.
old = """  return {
    graph,
    fields,
    report: {
      sourceUrl: opts.sourceUrl,
      factsDiscovered: fields.length,
      factsByClass,
      factsBySource,
      objectsGenerated: graph.objects.length,
      relationshipsGenerated: graph.relationships.length,
      unsupported: structured.unsupported,
      privateWithheld: fields.filter((f) => f.visibility === "private").length,
      graphNodesVisited: structured.stats.nodesVisited,
      graphNodeIds: structured.stats.nodeIds,
    },
  };
"""
new = """  const entitiesByType: Record<string, number> = {};
  for (const e of structured.entities) {
    for (const t of e.types) entitiesByType[t] = (entitiesByType[t] ?? 0) + 1;
  }
  const sortedEntitiesByType: Record<string, number> = {};
  for (const k of Object.keys(entitiesByType).sort()) sortedEntitiesByType[k] = entitiesByType[k];

  return {
    graph,
    fields,
    report: {
      sourceUrl: opts.sourceUrl,
      factsDiscovered: fields.length,
      factsByClass,
      factsBySource,
      objectsGenerated: graph.objects.length,
      relationshipsGenerated: graph.relationships.length,
      unsupported: structured.unsupported,
      privateWithheld: fields.filter((f) => f.visibility === "private").length,
      graphNodesVisited: structured.stats.nodesVisited,
      graphNodeIds: structured.stats.nodeIds,
      relationshipDrops: graph.relationshipDrops ?? [],
      entitiesByType: sortedEntitiesByType,
    },
  };
"""
assert src.count(old) == 1, "report populate"
src = src.replace(old, new)

open(P, "w").write(src)
print("proceduralizer.ts patched")
