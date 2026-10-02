"""Fix the ask test preambles: pre-resolve both tenants, not just happy-place."""
import sys

OLD = """let journal: StubJournal;
/** Pre-resolved happy-place bundle; answerAskFyd's loader seam stays sync. */
let HAPPY_BUNDLE: SiteBundle;
let DEPS: AnswerAskFydDeps;

beforeAll(async () => {
  journal = await startStubJournal();
  const bundle = await getSiteBundle("happy-place");
  if (!bundle) throw new Error("stub journal did not serve happy-place");
  HAPPY_BUNDLE = bundle;
  DEPS = { loadBundle: (id) => (id === "happy-place" ? HAPPY_BUNDLE : null) };
});

afterAll(async () => {
  await journal.close();
});
"""

NEW = """let journal: StubJournal;
/** Pre-resolved bundles; answerAskFyd's loader seam stays sync. */
let HAPPY_BUNDLE: SiteBundle;
let COPPER_BUNDLE: SiteBundle;
let DEPS: AnswerAskFydDeps;

beforeAll(async () => {
  journal = await startStubJournal();
  const happy = await getSiteBundle("happy-place");
  const copper = await getSiteBundle("coppersmith-plumbing");
  if (!happy || !copper) throw new Error("stub journal did not serve the tenants");
  HAPPY_BUNDLE = happy;
  COPPER_BUNDLE = copper;
  const byId = new Map([
    ["happy-place", HAPPY_BUNDLE],
    ["coppersmith-plumbing", COPPER_BUNDLE],
  ]);
  DEPS = { loadBundle: (id) => byId.get(id) ?? null };
});

afterAll(async () => {
  await journal.close();
});
"""

FILES = [
    "/home/nolan/projects/ping/src/app/api/fyd/ask/__tests__/route.test.ts",
    "/home/nolan/projects/ping/src/app/api/fyd/ask/__tests__/object-scope.test.ts",
    "/home/nolan/projects/ping/src/app/api/fyd/ask/__tests__/ask-classes-tenant.test.ts",
]

for path in FILES:
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    count = text.count(OLD)
    if count != 1:
        print(f"ABORT {path}: found {count}")
        sys.exit(1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text.replace(OLD, NEW))
    print("patched", path)
