#!/bin/bash
# Track C: commit the semantic-render-determinism invariant as a real
# regression suite. Appends new describe blocks to render-model.test.ts:
# (1) full invariant (graph + spec + viewer + overrides) across two
#     separate probe processes, order-insensitive overrides;
# (2) owner presentation intent (objectOrder / hiddenObjectIds /
#     presentation.hidden) mirrors the real render path in the model.
set -u
python3 - <<'PYEOF'
import io
p = "/home/nolan/projects/ping/src/fyd/sitespec/__tests__/render-model.test.ts"
s = io.open(p, encoding="utf-8").read()

addition = '''
describe("semantic render determinism: full invariant", () => {
  // The committed invariant (FYD product authority directive 2026-09-25):
  // SAME ObjectGraph + SiteSpec + ViewerContext + OwnerOverrides ->
  // SAME semantic render model, across separate processes. HTML bytes
  // are NOT required to match: the semantic model is the boundary.
  const hideAddress: FieldVisibilityDecision = {
    objectId: "owner-1",
    field: "address",
    policy: "hide",
    decidedBy: "owner",
    decidedAt: FIXED_GENERATED_AT,
    source: "owner_override",
    version: 1,
  };
  const hidePhone: FieldVisibilityDecision = {
    objectId: "owner-1",
    field: "phone",
    policy: "hide",
    decidedBy: "owner",
    decidedAt: FIXED_GENERATED_AT,
    source: "owner_override",
    version: 1,
  };

  function probeInput(overrides: FieldVisibilityDecision[], viewerKind: string) {
    const base = buildProbeInput(overrides);
    return { ...base, viewerKind };
  }

  test("same inputs + same viewer -> byte-identical canonical models across processes", () => {
    for (const viewerKind of ["anonymous", "owner"]) {
      const input = probeInput([hideAddress], viewerKind);
      const first = runProbeOnce(input);
      const second = runProbeOnce(input);
      expect(first.length).toBeGreaterThan(0);
      expect(second).toEqual(first);
      const parsed = JSON.parse(first) as { viewerKind: string };
      expect(parsed.viewerKind).toBe(viewerKind);
    }
  });

  test("owner overrides are an order-insensitive set through the full probe path", () => {
    const ab = runProbeOnce(probeInput([hideAddress, hidePhone], "anonymous"));
    const ba = runProbeOnce(probeInput([hidePhone, hideAddress], "anonymous"));
    expect(ba).toEqual(ab);
  });

  test("different owner overrides -> different models (no silent identity)", () => {
    const base = runProbeOnce(probeInput([], "anonymous"));
    const hidden = runProbeOnce(probeInput([hideAddress], "anonymous"));
    expect(hidden).not.toEqual(base);
  });
});

describe("semantic render model mirrors the real render path", () => {
  // renderSection() (components/renderer.tsx) applies owner presentation
  // intent after query resolution: objectOrder reorders, hiddenObjectIds
  // excludes site-wide, presentation.hidden sections never render. The
  // model mirrors that path; these tests pin the mirror on the fixture.
  function specWithMutator(
    mutate: (spec: FYDSiteSpec) => void,
  ): { spec: FYDSiteSpec; projection: ReturnType<typeof verifyPublicProjection> } {
    const { spec, graph } = buildProbeInput();
    const clone = JSON.parse(JSON.stringify(spec)) as FYDSiteSpec;
    mutate(clone);
    return { spec: clone, projection: verifyPublicProjection(graph, [], "anonymous") };
  }

  function multiObjectSectionIds(spec: FYDSiteSpec): { sectionId: string; ids: string[] } {
    const { projection } = specWithMutator(() => {});
    const model = buildSemanticRenderModel(spec, projection);
    for (const page of model.pages) {
      for (const section of page.sections) {
        if (section.objectIds.length >= 2) {
          return { sectionId: section.id, ids: section.objectIds };
        }
      }
    }
    throw new Error("fixture has no section binding >= 2 objects");
  }

  function mutateSection(spec: FYDSiteSpec, sectionId: string, mutate: (s: { presentation: Record<string, unknown> }) => void) {
    for (const page of spec.pages) {
      for (const section of page.sections) {
        if (section.id === sectionId) {
          mutate(section as unknown as { presentation: Record<string, unknown> });
          return;
        }
      }
    }
    throw new Error("section not found: " + sectionId);
  }

  test("owner objectOrder reorders the model's bound objects", () => {
    const { sectionId, ids } = multiObjectSectionIds(buildProbeInput().spec);
    const reversed = ids.slice().reverse();
    expect(reversed).not.toEqual(ids);
    const { spec, projection } = specWithMutator((clone) =>
      mutateSection(clone, sectionId, (s) => {
        s.presentation.objectOrder = reversed;
      }),
    );
    const model = buildSemanticRenderModel(spec, projection);
    const section = model.pages
      .flatMap((p) => p.sections)
      .find((sec) => sec.id === sectionId);
    expect(section).toBeDefined();
    expect(section!.objectIds).toEqual(reversed);
  });

  test("owner hiddenObjectIds excludes the object site-wide", () => {
    const { sectionId, ids } = multiObjectSectionIds(buildProbeInput().spec);
    const hiddenId = ids[0]!;
    const { spec, projection } = specWithMutator((clone) =>
      mutateSection(clone, sectionId, (s) => {
        s.presentation.hiddenObjectIds = [hiddenId];
      }),
    );
    const model = buildSemanticRenderModel(spec, projection);
    for (const page of model.pages) {
      for (const section of page.sections) {
        expect(section.objectIds).not.toContain(hiddenId);
      }
    }
  });

  test("presentation.hidden sections do not appear in the model", () => {
    const { sectionId } = multiObjectSectionIds(buildProbeInput().spec);
    const { spec, projection } = specWithMutator((clone) =>
      mutateSection(clone, sectionId, (s) => {
        s.presentation.hidden = true;
      }),
    );
    const model = buildSemanticRenderModel(spec, projection);
    const allIds = model.pages.flatMap((p) => p.sections.map((sec) => sec.id));
    expect(allIds).not.toContain(sectionId);
  });
});
'''

# Append at end of file (after the closing of the first describe block).
s = s.rstrip("\n") + "\n" + addition
io.open(p, "w", encoding="utf-8").write(s)
print("render-model.test.ts extended")
PYEOF
