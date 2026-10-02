"""PROD-8 fix: re-export OrphanedCorrection from lab-adapter.ts"""

PATH = "/home/nolan/projects/ping/src/app/dev/objects/lab-adapter.ts"

src = open(PATH, encoding="utf-8").read()

old = """import {
  detectOrphanedCorrections,
  type OrphanedCorrection,
} from "@/fyd/object/owner-overlay";"""
new = """import {
  detectOrphanedCorrections,
  type OrphanedCorrection,
} from "@/fyd/object/owner-overlay";

export type { OrphanedCorrection };"""
assert src.count(old) == 1, "anchor not found"
src = src.replace(old, new, 1)

open(PATH, "w", encoding="utf-8").write(src)
print("lab-adapter re-export added OK")
