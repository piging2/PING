"""Worker A: add a discriminating HTTP-path overlay test to route.test.ts.

This test FAILS if the reader drops journal overlays (e.g. the event_data
row-shape bug fixed earlier): the pergola service must exist-but-private
and the tagline set_field must be applied, proving the journal ops composed
through the real HTTP read path.
"""
import sys

PATH = "/home/nolan/projects/ping/src/app/api/fyd/ask/__tests__/route.test.ts"

ANCHOR = """describe("AskFydWidget", () => {"""

NEW_TEST = """describe("journal overlays compose through the HTTP read path", () => {
  test("deactivated demo service exists but is private; set_field applied", () => {
    // If the reader failed to parse the journal row shape, these overlays
    // would be silently dropped and the pergola object would be absent.
    const pergola = HAPPY_BUNDLE.graph.objects.find(
      (o) => o.id === "website-service-51de038c1defe8bd",
    );
    expect(pergola).toBeDefined();
    expect(pergola!.visibility).toBe("private");
    expect(pergola!.provenance.kind).toBe("canonical-journal");
    expect(pergola!.provenance.ref).toBe("ping-event:stub-ev-001");
    const biz = HAPPY_BUNDLE.graph.objects.find(
      (o) => o.id === "website-business-6fa5ebd99d72c4cb",
    );
    expect(biz!.fields.tagline).toBe("Built right. Built to last.");
    expect(biz!.provenance.updatedRefs).toContain("ping-event:stub-ev-007");
  });
});

describe("AskFydWidget", () => {"""

with open(PATH, "r", encoding="utf-8") as f:
    text = f.read()
count = text.count(ANCHOR)
if count != 1:
    print(f"ABORT: found {count}")
    sys.exit(1)
with open(PATH, "w", encoding="utf-8") as f:
    f.write(text.replace(ANCHOR, NEW_TEST))
print("patched", PATH)
