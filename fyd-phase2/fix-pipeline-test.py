"""Fix the last route-wiring test: use handleAskRequest (the real export)."""
import sys

PATH = "/home/nolan/projects/ping/src/app/api/fyd/ask/__tests__/object-scope.test.ts"

with open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

old_imp = 'import { answerAskFydRoute, answerClassFor } from "../ask-pipeline";'
new_imp = 'import { answerClassFor, handleAskRequest } from "../ask-pipeline";'
assert src.count(old_imp) == 1
src = src.replace(old_imp, new_imp, 1)

old_test = """  test("shared pipeline helper accepts objectId directly", async () => {
    const res = await answerAskFydRoute(
      flatReq({
        siteId: HAPPY,
        objectId: HAPPY_BIZ,
        question: "where are they located?",
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.answer).toContain("Adair Village");
  });
"""
new_test = """  test("shared pipeline helper accepts objectId on both route shapes", async () => {
    const flat = await handleAskRequest(
      null,
      flatReq({
        siteId: HAPPY,
        objectId: HAPPY_BIZ,
        question: "where are they located?",
      }),
    );
    expect(flat.status).toBe(200);
    expect((await flat.json()).answer).toContain("Adair Village");

    const nested = await handleAskRequest(
      HAPPY,
      flatReq({ objectId: COPPER_BIZ, question: "What is this?" }),
    );
    // objectId never selects the tenant: the other tenant's id is unknown
    // for the route tenant.
    expect(nested.status).toBe(404);
  });
"""
assert src.count(old_test) == 1
src = src.replace(old_test, new_test, 1)

with open(PATH, "w", encoding="utf-8") as f:
    f.write(src)
print("ok: pipeline-helper test")
