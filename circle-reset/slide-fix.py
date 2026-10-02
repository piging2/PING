import io

path = "src/fyd/ui/portal-circle.tsx"
s = io.open(path, encoding="utf-8").read()
old = '''  const slide = p.reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 38 };'''
new = '''  const slide = (
    p.reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 38 }
  ) as const;'''
assert s.count(old) == 1, "slide anchor not found"
io.open(path, "w", encoding="utf-8").write(s.replace(old, new))
print("OK slide fix")
