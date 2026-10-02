"""G4 patch 4: update view.test.ts service expectations.

The old test pinned the pre-G4 role table ("service gets reference, not
follow/like/contact"). Under G4 the capability authority decides:
SERVICE_SCHEMA declares likeable: true, so services get like. The
schema flag is the product decision now; the view layer propagates it.
"""
P = "/home/nolan/projects/ping/src/fyd/object/__tests__/view.test.ts"
src = open(P).read()
old = '''  test("service gets reference, not follow/like/contact", () => {
    const caps = buildCapabilities("ping.social.service@1", "s7", emptyContact, {
      summary: "Emergency plumbing.",
      services: [],
    });
    expect(caps.some((c) => c.kind === "ask")).toBe(true);
    expect(caps.some((c) => c.kind === "reference")).toBe(true);
    expect(caps.some((c) => c.kind === "follow")).toBe(false);
    expect(caps.some((c) => c.kind === "like")).toBe(false);
    expect(caps.some((c) => c.kind === "call")).toBe(false);
  });'''
new = '''  test("service gets reference and like (schema-declared), not follow/contact", () => {
    // G4: the capability authority decides. SERVICE_SCHEMA declares
    // likeable: true, so the like propagates to the render model; the
    // pre-G4 view layer used to suppress it with a role rule. If the
    // product decision changes, the schema flag flips, not the view code.
    const caps = buildCapabilities("ping.social.service@1", "s7", emptyContact, {
      summary: "Emergency plumbing.",
      services: [],
    });
    expect(caps.some((c) => c.kind === "ask")).toBe(true);
    expect(caps.some((c) => c.kind === "reference")).toBe(true);
    expect(caps.some((c) => c.kind === "like")).toBe(true);
    expect(caps.some((c) => c.kind === "follow")).toBe(false);
    expect(caps.some((c) => c.kind === "call")).toBe(false);
  });'''
assert src.count(old) == 1, "service test pattern not found"
src = src.replace(old, new)
open(P, "w").write(src)
print("view.test.ts updated")
