#!/usr/bin/env python3
P = "/home/nolan/projects/ping/src/app/api/fyd/objects/[objectId]/overrides/__tests__/owner-context-seam.test.ts"
src = open(P).read()

# 1. My new unknown-capability test: the actual reason text is
# "demo: deny - '...' is not a demo capability (deny-by-default)."
old = """      expect(evaluation.allowed).toBe(false);
      expect(evaluation.reason).toMatch(/deny/);
      expect(evaluation.reason).toMatch(/demo scaffolding/);"""
new = """      expect(evaluation.allowed).toBe(false);
      expect(evaluation.reason).toMatch(/deny/);
      expect(evaluation.reason).toMatch(/deny-by-default/);"""
assert src.count(old) == 1, f"deny anchor: {src.count(old)}"
src = src.replace(old, new, 1)

# 2. Stale "factual" tier expectations: the route stamps the four-tier
# commandConsequenceTier, which has no "factual" value. Per the FYD product
# authority directive (Nolan 2026-09-25), factual corrections are public
# factual presentation, which is MEDIUM.
old = """    expect(body.ok).toBe(true);
    expect(body.tier).toBe("factual");
    expect(String(body.consequenceNote)).toMatch(/Explicit confirmation/);"""
new = """    expect(body.ok).toBe(true);
    // FYD product authority directive (Nolan 2026-09-25): a factual
    // correction is public factual presentation, which is MEDIUM.
    expect(body.tier).toBe("MEDIUM");
    expect(String(body.consequenceNote)).toMatch(/Explicit confirmation/);"""
assert src.count(old) == 1, f"propose factual anchor: {src.count(old)}"
src = src.replace(old, new, 1)

old = """    expect(approved.body.ok).toBe(true);
    expect(approved.body.tier).toBe("factual");
    expect("undo" in approved.body).toBe(false);"""
new = """    expect(approved.body.ok).toBe(true);
    // MEDIUM: no automatic LOW undo for factual corrections either.
    expect(approved.body.tier).toBe("MEDIUM");
    expect("undo" in approved.body).toBe(false);"""
assert src.count(old) == 1, f"approve factual anchor: {src.count(old)}"
src = src.replace(old, new, 1)

open(P, "w").write(src)
print("owner-context-seam.test.ts: 3 fixes applied")
print("OK")
