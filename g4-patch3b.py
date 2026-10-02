"""G4 patch 3b: renderer.tsx call sites (regex, indentation-agnostic)."""
import re

R = "/home/nolan/projects/ping/src/fyd/components/renderer.tsx"
rsrc = open(R).read()

pat = re.compile(
    r"(<ObjectAffordance\n"
    r"(\s+)objectId=\{o\.id\}\n"
    r"\s+title=\{title \?\? null\}\n"
    r"\s+kindLabel=\{friendlySchemaLabel\(o\.schema\)\}\n"
    r")(\s+evidenceLine=\{affordanceEvidenceLine\(o\)\}\n)"
)

def repl(m):
    head, indent, tail = m.group(1), m.group(2), m.group(3)
    return head + indent + "schemaId={o.schema}\n" + indent + "controllerId={o.controllerId}\n" + tail

rsrc2, n = pat.subn(repl, rsrc)
assert n == 3, "expected 3 call sites, found %d" % n
open(R, "w").write(rsrc2)
print("renderer.tsx call sites patched OK (3)")
