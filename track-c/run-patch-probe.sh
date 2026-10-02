#!/bin/bash
# Track C: the determinism probe takes viewerKind as an explicit input so
# the regression suite proves the full invariant:
# SAME (ObjectGraph + SiteSpec + ViewerContext + OwnerOverrides) ->
# SAME semantic render model.
set -u
python3 - <<'PYEOF'
import io
p = "/home/nolan/projects/ping/src/fyd/sitespec/__tests__/determinism-probe.ts"
s = io.open(p, encoding="utf-8").read()

old_head = ''' * Reads a JSON fixture { spec, graph, ownerOverrides?, designTokenVersion? },
 * wraps the graph in the anonymous verified public projection (Q-C-01),
 * builds the semantic render model through the real render path, and writes
 * the canonical model encoding to the output file.'''
new_head = ''' * Reads a JSON fixture { spec, graph, ownerOverrides?, designTokenVersion?,
 * viewerKind? }, wraps the graph in the verified public projection for the
 * declared viewer (Q-C-01), builds the semantic render model through the
 * real render path, and writes the canonical model encoding to the output
 * file.'''
assert old_head in s, "head anchor missing"
s = s.replace(old_head, new_head)

old_imports = '''import { readFileSync, writeFileSync } from "node:fs";
import { buildSemanticRenderModel, canonicalizeModel } from "../render-model";
import { verifyPublicProjection } from "../public-projection";
import type { FieldVisibilityDecision } from "../field-visibility";
import type { FYDSiteSpec, ObjectGraph } from "../types";

interface ProbeInput {
  spec: FYDSiteSpec;
  graph: ObjectGraph;
  ownerOverrides?: FieldVisibilityDecision[];
  designTokenVersion?: string;
}'''
new_imports = '''import { readFileSync, writeFileSync } from "node:fs";
import { buildSemanticRenderModel, canonicalizeModel } from "../render-model";
import {
  verifyPublicProjection,
  type PublicViewerKind,
} from "../public-projection";
import type { FieldVisibilityDecision } from "../field-visibility";
import type { FYDSiteSpec, ObjectGraph } from "../types";

interface ProbeInput {
  spec: FYDSiteSpec;
  graph: ObjectGraph;
  ownerOverrides?: FieldVisibilityDecision[];
  designTokenVersion?: string;
  /** Explicit ViewerContext input. Defaults to "anonymous". */
  viewerKind?: PublicViewerKind;
}'''
assert old_imports in s, "imports anchor missing"
s = s.replace(old_imports, new_imports)

old_tail = '''// The ONLY boundary the render model may consume: the anonymous verified
// public projection. The probe proves the two-process determinism of the
// full boundary -> model path.
const projection = verifyPublicProjection(
  input!.graph,
  input!.ownerOverrides ?? [],
  "anonymous",
);'''
new_tail = '''// The ONLY boundary the render model may consume: the verified public
// projection for the declared viewer. The probe proves the two-process
// determinism of the full boundary -> model path.
const viewerKind: PublicViewerKind = input!.viewerKind ?? "anonymous";
const projection = verifyPublicProjection(
  input!.graph,
  input!.ownerOverrides ?? [],
  viewerKind,
);'''
assert old_tail in s, "tail anchor missing"
s = s.replace(old_tail, new_tail)

io.open(p, "w", encoding="utf-8").write(s)
print("determinism-probe.ts patched")
PYEOF
