#!/bin/bash
# Track C: fix stale lineage-tracer doc text. The FydObjectCard reads
# through the STRONG verifier (resolveBoundFieldVerified), not the
# low-level resolveBoundField primitive.
set -u
python3 - <<'PYEOF'
import io
p = "/home/nolan/projects/ping/src/fyd/lineage/tracer.ts"
s = io.open(p, encoding="utf-8").read()
old = '''        "ServicesSection -> CardGrid -> FydObjectCard reads boundDescription " +
        "-> resolveBoundField (src/fyd/sitespec/graph.ts binding verifier) " +
        "-> renderToStaticMarkup(renderSection(...))",
      boundFieldVerifier: "src/fyd/sitespec/graph.ts resolveBoundField",'''
new = '''        "ServicesSection -> CardGrid -> FydObjectCard reads boundDescription " +
        "-> resolveBoundFieldVerified (src/fyd/sitespec/binding-verifier.ts " +
        "strong BindingVerifier) -> renderToStaticMarkup(renderSection(...))",
      boundFieldVerifier:
        "src/fyd/sitespec/binding-verifier.ts resolveBoundFieldVerified",'''
assert old in s, "anchor missing"
io.open(p, "w", encoding="utf-8").write(s.replace(old, new))
print("tracer doc text fixed")
PYEOF
