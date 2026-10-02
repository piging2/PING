"""G4 patch 3c: destructure schemaId/controllerId in ObjectAffordance."""
P = "/home/nolan/projects/ping/src/fyd/components/object-affordance.tsx"
src = open(P).read()
old = """export function ObjectAffordance({
  objectId,
  title,
  kindLabel,
  evidenceLine,
  theme,
}: {"""
new = """export function ObjectAffordance({
  objectId,
  title,
  kindLabel,
  evidenceLine,
  schemaId,
  controllerId,
  theme,
}: {"""
assert src.count(old) == 1, "destructure pattern not found"
src = src.replace(old, new)
open(P, "w").write(src)
print("destructure fixed")
