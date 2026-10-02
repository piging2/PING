"""Add sectionId to LocationsSection's SectionShell (anchor consistency)."""
import sys

PATH = "/home/nolan/projects/ping/src/fyd/components/renderer.tsx"

with open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

old = """    <SectionShell
      theme={theme}
      heading={presentation.heading ?? "Where we work"}
      copy={presentation.copy}
    >"""
new = """    <SectionShell
      theme={theme}
      sectionId={section.id}
      heading={presentation.heading ?? "Where we work"}
      copy={presentation.copy}
    >"""
n = src.count(old)
if n != 1:
    print(f"FATAL: expected 1 match, found {n}")
    sys.exit(1)
src = src.replace(old, new, 1)

with open(PATH, "w", encoding="utf-8") as f:
    f.write(src)
print("OK: LocationsSection now passes sectionId")
