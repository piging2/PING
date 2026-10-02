"""PROD-8: surface orphaned corrections in /dev/objects. Edit 2: lab-adapter.ts"""

PATH = "/home/nolan/projects/ping/src/app/dev/objects/lab-adapter.ts"

src = open(PATH, encoding="utf-8").read()

# --- import the detector ---
old = 'import { loadObjectView } from "@/fyd/object/view";'
new = (
    'import { loadObjectView } from "@/fyd/object/view";\n'
    'import {\n'
    '  detectOrphanedCorrections,\n'
    '  type OrphanedCorrection,\n'
    '} from "@/fyd/object/owner-overlay";'
)
assert src.count(old) == 1, "import anchor not found"
src = src.replace(old, new, 1)

# --- extend LabData ---
old = """export interface LabData {
  typeGroups: LabTypeGroup[];
  views: Record<string, ObjectView>;
}"""
new = """export interface LabData {
  typeGroups: LabTypeGroup[];
  views: Record<string, ObjectView>;
  /**
   * PROD-8: owner corrections that are active in the journal but apply to
   * nothing in the current graph. The lab must render these as warnings;
   * they are never silently dropped.
   */
  orphanedCorrections: OrphanedCorrection[];
}"""
assert src.count(old) == 1, "LabData anchor not found"
src = src.replace(old, new, 1)

# --- buildLabData: take the site id, detect orphans ---
old = """export function buildLabData(
  verified: VerifiedPublicProjection,
  graph: ObjectGraph,
): LabData {"""
new = """export function buildLabData(
  verified: VerifiedPublicProjection,
  graph: ObjectGraph,
  siteId: string,
): LabData {"""
assert src.count(old) == 1, "buildLabData anchor not found"
src = src.replace(old, new, 1)

old = """  return { typeGroups, views };
}"""
new = """  // The owner store is keyed by site slug (e.g. "happy-place"), not by
  // graph object id: detection runs against the same key the owner
  // journal uses.
  const orphanedCorrections = detectOrphanedCorrections(graph, siteId);
  return { typeGroups, views, orphanedCorrections };
}"""
assert src.count(old) == 1, "return anchor not found"
src = src.replace(old, new, 1)

open(PATH, "w", encoding="utf-8").write(src)
print("lab-adapter.ts edited OK")
