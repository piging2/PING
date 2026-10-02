import io

path = '/home/nolan/projects/ping/src/fyd/components/renderer.tsx'
src = io.open(path, encoding='utf-8').read()

# 1. Add the import next to the existing WhyThis import.
old_import = 'import { WhyThis, type EvidenceStep } from "../ui/why-this";'
new_import = (
    'import { WhyThis, type EvidenceStep } from "../ui/why-this";\n'
    'import { whyThisStepsFor } from "../object/why-this-steps";'
)
assert src.count(old_import) == 1, 'import anchor not unique'
src = src.replace(old_import, new_import)

# 2. Wire the generic WhyThis drill-down into FydObjectCard, right after
# the ClaimBadge. Applies to every rendered object fact (services,
# products, people, locations), driven by the object's own provenance.
old_card = '''      <div className="mt-3">
        <ClaimBadge objects={[o]} />
      </div>
      {affordanceEligible(o) ? ('''
new_card = '''      <div className="mt-3">
        <ClaimBadge objects={[o]} />
      </div>
      {title ? (
        <WhyThis claim={title} steps={whyThisStepsFor(o)} className="mt-2" />
      ) : null}
      {affordanceEligible(o) ? ('''
assert src.count(old_card) == 1, 'card anchor not unique'
src = src.replace(old_card, new_card)

io.open(path, 'w', encoding='utf-8').write(src)
print('RENDERER_EDIT_OK')
