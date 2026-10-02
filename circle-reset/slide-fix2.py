import io

path = "src/fyd/ui/portal-circle.tsx"
s = io.open(path, encoding="utf-8").read()

old = """  const slide = (
    p.reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 38 }
  ) as const;
"""
assert s.count(old) == 1, "slide var not found"
s = s.replace(old, "")

old2 = """      exit={{ y: "100%" }}
      transition={slide}"""
new2 = """      exit={{ y: "100%" }}
      transition={p.reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 38 }}"""
assert s.count(old2) == 1, "transition anchor not found"
s = s.replace(old2, new2)

io.open(path, "w", encoding="utf-8").write(s)
print("OK slide inline")
