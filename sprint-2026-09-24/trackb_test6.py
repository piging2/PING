#!/usr/bin/env python3
P = "/home/nolan/projects/ping/src/app/api/fyd/objects/[objectId]/overrides/__tests__/owner-context-seam.test.ts"
src = open(P).read()
old = """    // FYD product authority directive (Nolan 2026-09-25): a factual
    // correction is public factual presentation, which is MEDIUM.
    expect(body.tier).toBe("MEDIUM");
    expect(String(body.consequenceNote)).toMatch(/Explicit confirmation/);"""
new = """    // FYD product authority directive (Nolan 2026-09-25): a factual
    // correction is public factual presentation, which is MEDIUM.
    expect(body.tier).toBe("MEDIUM");
    expect(String(body.consequenceNote)).toMatch(/Update the business/);
    expect(String(body.consequenceNote)).toMatch(/owner assertion/);"""
assert src.count(old) == 1, f"anchor: {src.count(old)}"
open(P, "w").write(src.replace(old, new, 1))
print("consequence-note expectations updated to MEDIUM product language")
print("OK")
