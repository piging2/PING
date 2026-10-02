import io

path = "src/app/page.tsx"
s = io.open(path, encoding="utf-8").read()
old = 'import { listObjectIds } from "@/fyd/object/view";\n'
assert s.count(old) == 1, "import not found"
io.open(path, "w", encoding="utf-8").write(s.replace(old, ""))
print("OK removed unused import")
