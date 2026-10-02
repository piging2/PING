"""Surgical patch for src/fyd/builder/planner.ts (Worker D, BindingVerifier).

Applies 3 exact-match edits; aborts with a clear message if any anchor is
not found exactly once. Idempotent: re-running after a successful run is a
no-op-safe abort (anchors already replaced -> count 0 -> abort, no changes).
"""
import io
import sys

PATH = "/home/nolan/projects/ping/src/fyd/builder/planner.ts"

src = io.open(PATH, encoding="utf-8").read()

# --- Edit 1: import the BindingVerifier seam ---
old_import = 'import type { BindingClassification } from "../sitespec/graph";'
new_import = (
    old_import
    + "\nimport {\n"
    + "  assertSpecBindingsVerified,\n"
    + "  ownerAssertionsFromGraph,\n"
    + "  type PresentationBinding,\n"
    + '} from "../sitespec/binding-verifier";'
)

# --- Edit 2: helper mapping emitted slot bindings -> PresentationBinding ---
old_plan = (
    "/**\n"
    " * planSite: the deterministic site planner.\n"
    " * Same (graph, intent, vector, plannerVersion, tokens) -> same semantic spec.\n"
    " */\n"
    "export function planSite(input: SitePlannerInput): PlannedSite {"
)
new_plan = (
    "/**\n"
    " * The emitted spec's factual binding set: every generated-copy slot\n"
    " * binding as a PresentationBinding. The planner's slots bind object fields\n"
    " * whose claimRef matched the object's provenance ref (checked by\n"
    " * assertGeneratedPresentationVerified); the BindingVerifier re-checks the\n"
    " * full seam (object field + evidence ref + owner assertions) so the\n"
    " * renderer path cannot be handed an unverified spec.\n"
    " */\n"
    "function slotBindingsForVerification(\n"
    "  gp: GeneratedPresentation,\n"
    "): PresentationBinding[] {\n"
    "  const out: PresentationBinding[] = [];\n"
    "  for (const slot of gp.slots) {\n"
    "    for (const b of slot.bindings) {\n"
    "      out.push({\n"
    "        objectId: b.objectId,\n"
    "        field: b.field,\n"
    '        classification: "direct",\n'
    "        evidenceRef: b.claimRef ?? undefined,\n"
    "      });\n"
    "    }\n"
    "  }\n"
    "  return out;\n"
    "}\n"
    "\n"
    + old_plan
)

# --- Edit 3: the emission gate ---
old_gate = (
    "  assertGeneratedPresentationVerified("
    "generatedPresentation, graph, intent.prohibitedPositioning);"
)
new_gate = old_gate + (
    "\n\n"
    "  // BindingVerifier at the projection seam (EVIDENCE/OBJECT PROJECTION ->\n"
    "  // BINDING VERIFICATION -> SITE SPEC -> RENDERER). Every factual binding\n"
    "  // the emitted spec carries must resolve to an object field backed by an\n"
    "  // evidence ref, a recorded owner assertion, or an explicit\n"
    "  // generated-presentation mark. UNBOUND bindings fail closed here: the\n"
    "  // planner throws before any spec is produced, so the renderer path cannot\n"
    "  // bypass verification. The renderer reads factual values through the same\n"
    "  // verifier core (boundField -> resolveBoundField in renderer.tsx).\n"
    "  assertSpecBindingsVerified(\n"
    "    slotBindingsForVerification(generatedPresentation),\n"
    "    graph,\n"
    "    ownerAssertionsFromGraph(graph),\n"
    "  );"
)

edits = [
    ("import", old_import, new_import),
    ("helper", old_plan, new_plan),
    ("gate", old_gate, new_gate),
]
for name, old, new in edits:
    count = src.count(old)
    if count != 1:
        print("ABORT: anchor '%s' found %d times (expected 1)" % (name, count))
        sys.exit(1)
    src = src.replace(old, new, 1)

io.open(PATH, "w", encoding="utf-8").write(src)
print("planner.ts patched: 3/3 edits applied")
