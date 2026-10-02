def edit(path, old, new):
    src = open(path).read()
    n = src.count(old)
    assert n == 1, "%s: expected 1 match, found %d for: %r" % (path, n, old[:60])
    open(path, "w").write(src.replace(old, new))
    print("OK " + path, flush=True)

S = "src/fyd/family/shared.tsx"
# InspectAffordance: suppress when the input declares no inspect surface
edit(S,
  '  /** Light treatment for dark sections. */\n'
  '  inverse?: boolean;\n'
  '}): JSX.Element {\n'
  '  return (',
  '  /** Light treatment for dark sections. */\n'
  '  inverse?: boolean;\n'
  '}): JSX.Element | null {\n'
  '  // Provenance affordances with no provenance content must not render: the\n'
  '  // static proof has no inspect surface, so the links would be dead chrome.\n'
  '  if (!ctx.inspectAffordances) return null;\n'
  '  return (')

F = "src/app/sites/coppersmith-plumbing/v2/family-input.ts"
# Coppersmith proof input: no inspect surface on the static proof page
edit(F,
  '    siteSlug: COPPERSMITH_SITE_ID,\n    askHref: "#ask-fyd",\n  };\n}',
  '    siteSlug: COPPERSMITH_SITE_ID,\n    askHref: "#ask-fyd",\n'
  '    // Static proof page: there is no ObjectView to link to, so the "Why\n'
  '    // this?" affordances would be dead chrome. Suppressed by design.\n'
  '    inspectAffordances: false,\n  };\n}')

print("fix2b edits applied", flush=True)
