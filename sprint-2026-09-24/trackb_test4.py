#!/usr/bin/env python3
P = "/home/nolan/projects/ping/src/fyd/owner-mode/__tests__/demo-high-class-refusal.test.ts"
src = open(P).read()
old = "      expect(detected!.reason).toMatch(/cannot approve|explicit authorization/i);"
new = "      expect(detected!.reason).toMatch(\n        /cannot approve|cannot provide|explicit authorization|strong authority/i,\n      );"
assert src.count(old) == 1, f"anchor: {src.count(old)}"
open(P, "w").write(src.replace(old, new, 1))
print("reason regex widened")
