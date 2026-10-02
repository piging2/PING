def edit(path, old, new):
    src = open(path).read()
    n = src.count(old)
    assert n == 1, "%s: expected 1 match, found %d for: %r" % (path, n, old[:60])
    open(path, "w").write(src.replace(old, new))
    print("OK " + path, flush=True)

R = "proof/coppersmith-family-2026-09-25/render-check.mts"
# The static proof declares inspectAffordances: false (no ObjectView to link
# to), so the affordance must be fully suppressed here. The family unit tests
# still cover the enabled default.
old = (
  '// Sanctioned inspect affordance: one subtle "Why this?" per claim cluster.\n'
  'const whyCount = (visible.match(/Why this\\?/g) ?? []).length;\n'
  'const sectionCount = (html.match(/data-component="/g) ?? []).length;\n'
  'check("Why this? affordance present, at most one per section", '
  'whyCount > 0 && whyCount <= sectionCount, whyCount + " vs " + sectionCount + " sections");'
)
new = (
  '// Inspect affordance is suppressed for the static proof (inspectAffordances:\n'
  '// false: no ObjectView to link to, so "Why this?" would be dead chrome).\n'
  '// Family unit tests cover the enabled default; this proof must render zero.\n'
  'const whyCount = (visible.match(/Why this\\?/g) ?? []).length;\n'
  'check("Why this? affordance suppressed on the static proof", whyCount === 0, String(whyCount));'
)
edit(R, old, new)
print("render-check edit applied", flush=True)
