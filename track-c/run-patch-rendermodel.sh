#!/bin/bash
# Track C: semantic render model mirrors the real render path's owner-
# override handling. The real renderSection() in components/renderer.tsx
# applies, in order: resolveQuery -> applyObjectOrder (owner-approved
# presentation.order) -> applyHiddenObjects (owner-hidden object ids),
# and skips sections with presentation.hidden. The model previously did
# only resolveQuery, so its "in render order" claim was false exactly
# when OwnerOverrides existed. Now the model mirrors the real path.
set -u
python3 - <<'PYEOF'
import io
p = "/home/nolan/projects/ping/src/fyd/sitespec/render-model.ts"
s = io.open(p, encoding="utf-8").read()

old_import = 'import { resolveQuery } from "../components/renderer";'
new_import = '''import {
  applyHiddenObjects,
  applyObjectOrder,
  resolveQuery,
  siteDeactivatedObjectIds,
} from "../components/renderer";'''
assert old_import in s, "import anchor missing"
s = s.replace(old_import, new_import)

old_doc = '''/** One rendered section: its identity, its component, and the objects it binds, in render order. */'''
new_doc = '''/**
 * One rendered section: its identity, its component, and the objects it
 * binds, in the order the real render path emits them (resolveQuery,
 * then the owner-approved objectOrder, then owner-hidden object
 * exclusion). Sections with presentation.hidden never render and are
 * absent from the model.
 */'''
assert old_doc in s, "section doc anchor missing"
s = s.replace(old_doc, new_doc)

old_build = '''  const graph = projection.graph;
  const pages: SemanticPageModel[] = spec.pages.map((page) => ({
    slug: page.slug,
    sections: page.sections.map((section) => ({
      id: section.id,
      component: section.component,
      objectIds: resolveQuery(section.query, graph, spec.ownerObjectId).map((o) => o.id),
      heading: section.presentation.heading,
      copy: section.presentation.copy,
    })),
  }));'''
new_build = '''  const graph = projection.graph;
  // The real render seam (renderSection in components/renderer.tsx):
  // an owner-hidden object is excluded from every surface site-wide.
  const hiddenObjectIds = siteDeactivatedObjectIds(spec);
  const pages: SemanticPageModel[] = spec.pages.map((page) => ({
    slug: page.slug,
    sections: page.sections
      // presentation.hidden sections never render: the model mirrors the
      // real path and omits them.
      .filter((section) => !section.presentation.hidden)
      .map((section) => {
        // Mirror the real render path exactly: query resolution, then the
        // owner-approved objectOrder, then owner-hidden object exclusion.
        const objects = applyHiddenObjects(
          applyObjectOrder(
            resolveQuery(section.query, graph, spec.ownerObjectId),
            section.presentation.objectOrder,
          ),
          hiddenObjectIds,
        );
        return {
          id: section.id,
          component: section.component,
          objectIds: objects.map((o) => o.id),
          heading: section.presentation.heading,
          copy: section.presentation.copy,
        };
      }),
  }));'''
assert old_build in s, "build anchor missing"
s = s.replace(old_build, new_build)

old_fn_doc = '''/**
 * Build the section-binding manifest. Pure function of its inputs:
 * pages and sections are visited in spec order, and objectIds preserve
 * resolveQuery's deterministic ordering (updatedAt desc with id tiebreak;
 * "related" sorted by id). No Date.now(), no Math.random(), no counters,
 * no request-order-dependent ids.
 */'''
new_fn_doc = '''/**
 * Build the section-binding manifest. Pure function of its inputs:
 * pages and sections are visited in spec order, and objectIds follow
 * the real render path's ordering: resolveQuery's deterministic ordering
 * (updatedAt desc with id tiebreak; "related" sorted by id), then the
 * owner-approved objectOrder, then owner-hidden object exclusion.
 * No Date.now(), no Math.random(), no counters, no request-order-
 * dependent ids.
 */'''
assert old_fn_doc in s, "fn doc anchor missing"
s = s.replace(old_fn_doc, new_fn_doc)

io.open(p, "w", encoding="utf-8").write(s)
print("render-model.ts patched")
PYEOF
