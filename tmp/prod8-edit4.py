"""PROD-8: surface orphaned corrections in /dev/objects. Edit 4: objects-lab-client.tsx"""

PATH = "/home/nolan/projects/ping/src/app/dev/objects/objects-lab-client.tsx"

src = open(PATH, encoding="utf-8").read()

# --- 1. import the orphan type ---
old = """import type {
  LabObjectSummary,
  LabTypeGroup,
  LabTypeName,
} from "./lab-adapter";"""
new = """import type {
  LabObjectSummary,
  LabTypeGroup,
  LabTypeName,
  OrphanedCorrection,
} from "./lab-adapter";"""
assert src.count(old) == 1, "import anchor not found"
src = src.replace(old, new, 1)

# --- 2. prop on LabClientProps ---
old = """  typeGroups: LabTypeGroup[];
  views: Record<string, ObjectView>;
  initialType?: LabTypeName;"""
new = """  typeGroups: LabTypeGroup[];
  views: Record<string, ObjectView>;
  /**
   * PROD-8: owner corrections active in the journal that apply to nothing
   * in the current graph. Rendered as an always-visible warning banner;
   * never silently dropped.
   */
  orphanedCorrections: OrphanedCorrection[];
  initialType?: LabTypeName;"""
assert src.count(old) == 1, "props anchor not found"
src = src.replace(old, new, 1)

# --- 3. destructure in the component signature ---
old = """export function ObjectsLabClient({
  siteIds,
  siteId,
  meta,
  typeGroups,
  views,
  initialType,"""
new = """export function ObjectsLabClient({
  siteIds,
  siteId,
  meta,
  typeGroups,
  views,
  orphanedCorrections,
  initialType,"""
assert src.count(old) == 1, "destructure anchor not found"
src = src.replace(old, new, 1)

# --- 4. warning banner, always visible, after the viewer blocks ---
old = """        {viewer !== "anonymous" && viewer !== "owner" && ("""
new = """        {orphanedCorrections.length > 0 && (
          <div
            data-testid="orphan-warning"
            role="alert"
            className="mt-4 rounded-lg border-2 border-amber-600 bg-amber-50 p-4"
          >
            <p className="text-sm font-bold uppercase tracking-widest text-amber-900">
              Owner correction needs attention
            </p>
            {orphanedCorrections.map((o, i) => (
              <p key={i} className="mt-2 text-sm text-amber-900">
                {o.detail}
                <span className="mt-1 block font-mono text-xs text-amber-700">
                  target: {o.target} · reason: {o.reason}
                </span>
              </p>
            ))}
          </div>
        )}

        {viewer !== "anonymous" && viewer !== "owner" && ("""
assert src.count(old) == 1, "banner anchor not found"
src = src.replace(old, new, 1)

open(PATH, "w", encoding="utf-8").write(src)
print("objects-lab-client.tsx edited OK")
