def edit(path, old, new):
    src = open(path).read()
    n = src.count(old)
    assert n == 1, "%s: expected 1 match, found %d for: %r" % (path, n, old[:60])
    open(path, "w").write(src.replace(old, new))
    print("OK " + path, flush=True)

T = "src/fyd/family/types.ts"

# 1a. FamilyRenderInput: add the opt-out
edit(T,
  '  /** Owner-mode entry target ("Customize with FYD"). The owner surface\n'
  '   *  itself is gated in surfaces.tsx and never renders inside the public tree. */\n'
  '  customizeHref?: string;\n'
  '}',
  '  /** Owner-mode entry target ("Customize with FYD"). The owner surface\n'
  '   *  itself is gated in surfaces.tsx and never renders inside the public tree. */\n'
  '  customizeHref?: string;\n'
  '  /** Set false when the render target has no inspect surface (e.g. a static\n'
  '   *  proof page): the "Why this?" affordance is suppressed instead of linking\n'
  '   *  to dead routes. Defaults to true. */\n'
  '  inspectAffordances?: boolean;\n'
  '}')

# 1b. FamilyCtx: resolved flag
edit(T,
  '  askHref: string;\n'
  '  inspectHrefFor: (objectId: string) => string;\n'
  '  customizeHref: string;',
  '  askHref: string;\n'
  '  inspectHrefFor: (objectId: string) => string;\n'
  '  customizeHref: string;\n'
  '  /** False suppresses InspectAffordance: there is no provenance content to show. */\n'
  '  inspectAffordances: boolean;')

# 1c. buildFamilyCtx: default true preserves existing family consumers
edit(T,
  '    inspectHrefFor: input.inspectHrefFor ?? ((objectId: string) => "/o/" + objectId),',
  '    inspectHrefFor: input.inspectHrefFor ?? ((objectId: string) => "/o/" + objectId),\n'
  '    inspectAffordances: input.inspectAffordances ?? true,')

S = "src/fyd/family/shared.tsx"
# 2. InspectAffordance: suppress when the input declares no inspect surface
edit(S,
  'export function InspectAffordance({ ctx, objectId }: { ctx: FamilyCtx; objectId: string }): JSX.Element {\n'
  '  const href = ctx.inspectHrefFor(objectId);',
  'export function InspectAffordance({ ctx, objectId }: { ctx: FamilyCtx; objectId: string }): JSX.Element | null {\n'
  '  // Provenance affordances with no provenance content must not render: the\n'
  '  // static proof has no inspect surface, so the links would be dead chrome.\n'
  '  if (!ctx.inspectAffordances) return null;\n'
  '  const href = ctx.inspectHrefFor(objectId);')

F = "src/app/sites/coppersmith-plumbing/v2/family-input.ts"
# 3. Coppersmith proof input: no inspect surface on the static proof page
edit(F,
  '    siteSlug: COPPERSMITH_SITE_ID,\n    askHref: "#ask-fyd",\n  };\n}',
  '    siteSlug: COPPERSMITH_SITE_ID,\n    askHref: "#ask-fyd",\n'
  '    // Static proof page: there is no ObjectView to link to, so the "Why\n'
  '    // this?" affordances would be dead chrome. Suppressed by design.\n'
  '    inspectAffordances: false,\n  };\n}')

print("fix2 edits applied", flush=True)
