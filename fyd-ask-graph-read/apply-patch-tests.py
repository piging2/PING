"""Apply Worker A test updates for the ask graph read reroute.

- src/app/api/fyd/ask/__tests__/route.test.ts
- src/app/api/fyd/ask/__tests__/route-smoke.test.ts
- src/app/api/fyd/ask/__tests__/object-scope.test.ts
- src/app/api/fyd/ask/__tests__/ask-classes-tenant.test.ts

Every updated file boots the stub FYD journal gateway (stub-journal.ts) so
the tests exercise the production authorized read path
(PingObjectReader.queryFydSiteOverlays over HTTP) with no disk projection
JSON and no live gateway.

Exact-string replacements; aborts unless each matches the expected count.
"""
import re
import sys

REPO = "/home/nolan/projects/ping"

JOURNAL_PREAMBLE = """
/**
 * Every test in this file exercises the production authorized read path:
 * the stub FYD journal gateway feeds PingObjectReader over HTTP. No disk
 * projection JSON is ever read (see the sentinel test in
 * src/fyd/ask/__tests__/graph-read-route.test.ts).
 */
let journal: StubJournal;
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

JOURNAL_FAILURE_BLOCK = '''describe("journal read failure (FL: Ask FYD error mapping)", () => {
  // The suite's other tests prove the authorized journal read path works;
  // these prove a failed read is the same honest unknown: never an answer,
  // never a leak of internal detail.

  test("answerAskFyd maps a throwing loader to projection_unavailable, never throws", () => {
    const deps: AnswerAskFydDeps = {
      loadBundle: () => {
        throw new Error("simulated authorized-read failure");
      },
    };
    const out = answerAskFyd(
      { siteId: "happy-place", question: "What is the phone number?", mode: "visitor" },
      deps,
    );
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.error.kind).toBe("projection_unavailable");
      expect(out.error.message).toMatch(/unknown/i);
    }
  });

  test("POST returns structured 503 when the journal read fails", async () => {
    const saved = process.env.FYD_JOURNAL_GATEWAY_URL;
    // Nothing listens here: the governed reader fails closed.
    process.env.FYD_JOURNAL_GATEWAY_URL = "http://127.0.0.1:1";
    try {
      const resp = await postAsk({
        siteId: "happy-place",
        question: "What is the phone number?",
        mode: "visitor",
      });
      expect(resp.status).toBe(503);
      const body = (await resp.json()) as Record<string, unknown>;
      expect(body.ok).toBe(false);
      expect(body.kind).toBe("projection_unavailable");
      expect(body.answerUnknown).toBe(true);
      expect(typeof body.error).toBe("string");
      expect(body.error as string).toMatch(/unknown/i);
      expect(body.attempted).toMatch(/projection/i);
      // Internal detail never leaks to the visitor.
      expect(body.error as string).not.toContain("127.0.0.1");
      expect(body.error as string).not.toContain("/home/");
    } finally {
      if (saved === undefined) delete process.env.FYD_JOURNAL_GATEWAY_URL;
      else process.env.FYD_JOURNAL_GATEWAY_URL = saved;
    }
  });

  test("recovery: POST answers normally again once the journal is reachable", async () => {
    const resp = await postAsk({
      siteId: "happy-place",
      question: "What is the phone number?",
      mode: "visitor",
    });
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.refusal).toBe(false);
    expect(body.answer as string).toContain("+15412865190");
  });
});
'''


def replace_span(path, start_marker, new_text):
    """Replace the describe(...) block starting at start_marker through its
    closing '});' at column 0."""
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    start = text.find(start_marker)
    if start < 0:
        print(f"ABORT: {path}: start marker not found")
        sys.exit(1)
    # Find the matching close: a line that is exactly "});" after start.
    idx = text.find("\n});", start)
    if idx < 0:
        print(f"ABORT: {path}: block end not found")
        sys.exit(1)
    end = idx + len("\n});")
    # Only one such block may exist.
    if text.find(start_marker, end) >= 0:
        print(f"ABORT: {path}: multiple blocks match")
        sys.exit(1)
    text = text[:start] + new_text.rstrip("\n") + text[end:]
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    print(f"replaced block in {path}")


def patch(path, old, new, expected=1):
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    count = text.count(old)
    if count != expected:
        print(f"ABORT: {path}: expected {expected} matches, found {count}")
        sys.exit(1)
    text = text.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    print(f"patched {path}")


R = f"{REPO}/src/app/api/fyd/ask/__tests__"

# ---------------------------------------------------------------- route.test.ts
patch(
    f"{R}/route.test.ts",
    """import { POST } from "../route";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { NextRequest } from "next/server";

const DEPS: AnswerAskFydDeps = { loadBundle: getSiteBundle };
""",
    """import { POST } from "../route";
import type { NextRequest } from "next/server";
import { startStubJournal, type StubJournal } from "./stub-journal";
""" + JOURNAL_PREAMBLE,
)

patch(
    f"{R}/route.test.ts",
    '    const real = getSiteBundle("happy-place");',
    "    const real = HAPPY_BUNDLE;",
    expected=2,
)

replace_span(
    f"{R}/route.test.ts",
    'describe("corrupt projection (FL: Ask FYD error mapping)", () => {',
    JOURNAL_FAILURE_BLOCK,
)

# ------------------------------------------------------- route-smoke.test.ts
patch(
    f"{R}/route-smoke.test.ts",
    """import { NextRequest } from "next/server";
import { POST } from "../route";
""",
    """import { NextRequest } from "next/server";
import { POST } from "../route";
import { startStubJournal, type StubJournal } from "./stub-journal";

let journal: StubJournal;
beforeAll(async () => {
  journal = await startStubJournal();
});
afterAll(async () => {
  await journal.close();
});
""",
)

# ---------------------------------------------------------- object-scope.test.ts
patch(
    f"{R}/object-scope.test.ts",
    """import type { NextRequest } from "next/server";

const DEPS: AnswerAskFydDeps = { loadBundle: getSiteBundle };
""",
    """import type { NextRequest } from "next/server";
import { startStubJournal, type StubJournal } from "./stub-journal";
""" + JOURNAL_PREAMBLE,
)

patch(
    f"{R}/object-scope.test.ts",
    "    const real = getSiteBundle(HAPPY);",
    "    const real = HAPPY_BUNDLE;",
)

# ----------------------------------------------------- ask-classes-tenant.test.ts
patch(
    f"{R}/ask-classes-tenant.test.ts",
    """import { join } from "node:path";

const DEPS: AnswerAskFydDeps = { loadBundle: getSiteBundle };
""",
    """import { join } from "node:path";
import { startStubJournal, type StubJournal } from "./stub-journal";
""" + JOURNAL_PREAMBLE,
)

patch(
    f"{R}/ask-classes-tenant.test.ts",
    '    const real = getSiteBundle("happy-place");',
    "    const real = HAPPY_BUNDLE;",
    expected=2,
)

print("all test patches applied")
