"""Phase 2 edits for src/fyd/ask/visitor-answer.ts.

1. Import selectRelatedCircles.
2. AnswerAskFydInput gains optional objectId (tenant still from siteId).
3. AskFydErrorKind gains "unknown_object".
4. Target resolution: object-scoped lookup inside the tenant's public
   graph; one-hop related context via selectRelatedCircles restricted to
   directly incident edges.
"""
import sys

PATH = "/home/nolan/projects/ping/src/fyd/ask/visitor-answer.ts"

with open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

edits = []

# --- 1. import selectRelatedCircles ---
old_imp = """import { applyFieldVisibility } from "../sitespec/field-visibility";
import { resolveQuery } from "../components/renderer";
"""
new_imp = """import { applyFieldVisibility } from "../sitespec/field-visibility";
import { resolveQuery } from "../components/renderer";
import { selectRelatedCircles } from "../object/related";
"""
edits.append(("import", old_imp, new_imp))

# --- 2. input type ---
old_input = """export interface AnswerAskFydInput {
  siteId: string;
  question: string;
  mode: AskFydMode;
}
"""
new_input = """export interface AnswerAskFydInput {
  siteId: string;
  /**
   * Optional object-scoped ask: the PING object id the question is about.
   * The tenant is still selected by siteId alone (never crossed); the
   * object is resolved inside this tenant's public graph with the same
   * honesty gates as loadObjectViewById (unknown id or non-public object
   * -> unknown_object). Context is the 1-hop related graph around the
   * object (selectRelatedCircles restricted to directly incident edges);
   * related objects' evidence is cited as their own, never merged into
   * the target's record.
   */
  objectId?: string;
  question: string;
  mode: AskFydMode;
}
"""
edits.append(("input", old_input, new_input))

# --- 3. error kind ---
old_kind = """export type AskFydErrorKind =
  | "unknown_site"
  | "bad_question"
  | "bad_mode"
  | "bundle_invalid"
  | "projection_unavailable";
"""
new_kind = """export type AskFydErrorKind =
  | "unknown_site"
  | "bad_question"
  | "bad_mode"
  | "bundle_invalid"
  | "projection_unavailable"
  | "unknown_object";
"""
edits.append(("error-kind", old_kind, new_kind))

# --- 4. target resolution + one-hop helper ---
old_target = """  const publicGraph = publicGraphOf(bundle.graph);
  const target = publicGraph.objects.find((o) => o.id === bundle.spec.ownerObjectId) ?? null;
  if (!target) {
    // The bundle has no public business object to answer from: a server
    // problem, never something to paper over with a guess.
    return {
      ok: false,
      error: { kind: "bundle_invalid", message: "This site is not available right now." },
    };
  }
  const relatedObjects = publicGraph.objects.filter((o) => o.id !== target.id);
"""
new_target = """  const publicGraph = publicGraphOf(bundle.graph);
  const requestedObjectId =
    typeof input.objectId === "string" ? input.objectId.trim() : "";
  let target: PingObject | null;
  let relatedObjects: PingObject[];
  if (requestedObjectId.length > 0) {
    // Object-scoped ask: the target is one object in THIS tenant's public
    // graph. Unknown ids fail closed as unknown_object; non-public objects
    // never enter the public graph, so they fail closed the same way.
    // Cross-tenant leakage is impossible by construction: the lookup is
    // scoped to this tenant's graph (the loadObjectViewById honesty
    // contract, enforced against the bundle being answered from).
    target = publicGraph.objects.find((o) => o.id === requestedObjectId) ?? null;
    if (!target) {
      return {
        ok: false,
        error: { kind: "unknown_object", message: "Unknown object for this site." },
      };
    }
    relatedObjects = oneHopRelatedObjects(publicGraph, target.id);
  } else {
    target = publicGraph.objects.find((o) => o.id === bundle.spec.ownerObjectId) ?? null;
    if (!target) {
      // The bundle has no public business object to answer from: a server
      // problem, never something to paper over with a guess.
      return {
        ok: false,
        error: { kind: "bundle_invalid", message: "This site is not available right now." },
      };
    }
    relatedObjects = publicGraph.objects.filter((o) => o.id !== target.id);
  }
"""
edits.append(("target", old_target, new_target))

# --- 5. one-hop helper, inserted before answerAskFyd ---
old_fn = """/**
 * Answer a visitor question about a site. Pure function of its inputs;
 * the only effect is reading the (deterministic, cached) site bundle.
 */
export function answerAskFyd(
  input: AnswerAskFydInput,
  deps: AnswerAskFydDeps = DEFAULT_DEPS,
): AskFydOutcome {
"""
new_fn = """/**
 * The 1-hop related graph around one object: selectRelatedCircles walks
 * the tenant's relationships from the target, restricted here to objects
 * joined by a directly incident active edge. Ranking (predicate priority,
 * then object id) is the selector's deterministic order. Only public
 * objects can appear (the selector skips non-public targets).
 */
function oneHopRelatedObjects(
  publicGraph: ObjectGraph,
  targetId: string,
): PingObject[] {
  const oneHopIds = new Set<string>();
  for (const r of publicGraph.relationships) {
    if (r.status !== "active") continue;
    if (r.subject === targetId && r.object !== targetId) oneHopIds.add(r.object);
    else if (r.object === targetId && r.subject !== targetId) oneHopIds.add(r.subject);
  }
  const byId = new Map(publicGraph.objects.map((o) => [o.id, o]));
  const out: PingObject[] = [];
  for (const c of selectRelatedCircles(publicGraph, targetId)) {
    if (!oneHopIds.has(c.objectId)) continue;
    const obj = byId.get(c.objectId);
    if (obj) out.push(obj);
  }
  return out;
}

/**
 * Answer a visitor question about a site. Pure function of its inputs;
 * the only effect is reading the (deterministic, cached) site bundle.
 */
export function answerAskFyd(
  input: AnswerAskFydInput,
  deps: AnswerAskFydDeps = DEFAULT_DEPS,
): AskFydOutcome {
"""
edits.append(("one-hop-helper", old_fn, new_fn))

for name, old, new in edits:
    count = src.count(old)
    if count != 1:
        print(f"FATAL: edit {name}: found {count} occurrences (expected 1)")
        sys.exit(1)
    src = src.replace(old, new, 1)
    print(f"ok: {name}")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(src)
print("written", PATH)
