"""Fix node-link circularity assertion: circularity comes from the fydc-act
class (stylesheet), not inline style; assert the shared circular control
class instead."""
import sys

PATH = "/home/nolan/projects/ping/src/fyd/ui/__tests__/fyd-circle.test.tsx"

with open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

old = """    expect(html).toContain('href="/node/obj-1"');
    expect(html).toContain("fydc-act");
    expect(html).toContain("border-radius:50%");
    expect(html).toContain("Open node view of Happy Place");
"""
new = """    expect(html).toContain('href="/node/obj-1"');
    // Circularity comes from the shared fydc-act control class (the same
    // circular control the other actions use), not inline style.
    expect(html).toContain("fydc-act");
    expect(html).toContain("fydc-node");
    expect(html).toContain("<a");
    expect(html).toContain("Open node view of Happy Place");
"""
assert src.count(old) == 1
src = src.replace(old, new, 1)
with open(PATH, "w", encoding="utf-8") as f:
    f.write(src)
print("ok: ui assertion")
