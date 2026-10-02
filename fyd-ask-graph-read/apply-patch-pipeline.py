"""Apply Worker A (ask graph read reroute) patches, part 2.

Covers:
- src/fyd/ask/visitor-answer.ts (read seam only: default loader)
- src/app/api/fyd/ask/ask-pipeline.ts (read seam only: async bundle load)

Exact-string replacements; aborts unless each matches exactly once.
"""
import sys

REPO = "/home/nolan/projects/ping"

PATCHES = [
    # ------------------------------------------------------------------
    # visitor-answer.ts: drop the now-unused getSiteBundle import
    # ------------------------------------------------------------------
    (
        "src/fyd/ask/visitor-answer.ts",
        """import { createHash } from "node:crypto";
import { getSiteBundle } from "../media/site-bundle";
import type { SiteBundle } from "../media/site-bundle";
""",
        """import { createHash } from "node:crypto";
import type { SiteBundle } from "../media/site-bundle";
""",
    ),
    # ------------------------------------------------------------------
    # visitor-answer.ts: default loader must not read from anywhere
    # ------------------------------------------------------------------
    (
        "src/fyd/ask/visitor-answer.ts",
        """const DEFAULT_DEPS: AnswerAskFydDeps = { loadBundle: getSiteBundle };""",
        """/**
 * Default deps: there is no default bundle loader. Ask FYD answers from the
 * graph ONLY through the injected loader, which the ask route resolves
 * through the authorized application read seam
 * (src/fyd/data/fyd-tenant-graph.ts via getSiteBundle, itself async). A
 * synchronous default cannot perform that read, so calling answerAskFyd
 * without an injected loader fails closed (projection_unavailable) instead
 * of silently reading from an unauthorized source.
 */
const DEFAULT_DEPS: AnswerAskFydDeps = {
  loadBundle: () => {
    throw new Error(
      "answerAskFyd: no bundle loader injected. The ask route must inject " +
        "a loader resolved through the authorized graph read (getSiteBundle).",
    );
  },
};""",
    ),
    # ------------------------------------------------------------------
    # ask-pipeline.ts: async authorized bundle load, overlay above the seam
    # ------------------------------------------------------------------
    (
        "src/app/api/fyd/ask/ask-pipeline.ts",
        """/**
 * Bundle loader for Ask FYD: loads the static bundle and composes the
 * tenant's owner overlay (field corrections) over it. The read model is the
 * owner-event projection, so a correction the owner approved is reflected
 * in Ask FYD answers, cited as an owner override while the source's value
 * stays recorded as what the source says. Fail closed: on overlay failure
 * the raw bundle is served, never an invented value.
 */
function loadBundleWithOwnerOverlay(siteId: string): SiteBundle | null {
  const bundle = getSiteBundle(siteId);
  if (!bundle) return null;
  try {
    const overlaid = applyOwnerFieldCorrections(bundle.graph, siteId);
    return { ...bundle, graph: overlaid.graph };
  } catch {
    return bundle;
  }
}

const ASK_DEPS: AnswerAskFydDeps = { loadBundle: loadBundleWithOwnerOverlay };
""",
        """/**
 * Bundle loader for Ask FYD: loads the site bundle through the authorized
 * application read seam (fixture base graph + journal overlays via the
 * governed PingObjectReader, digest-verified) and composes the tenant's
 * owner overlay (field corrections) over it, ABOVE the read seam. The read
 * model is the authorized graph read, so a correction the owner approved is
 * reflected in Ask FYD answers, cited as an owner override while the
 * source's value stays recorded as what the source says. Fail closed: on
 * overlay failure the raw bundle is served, never an invented value.
 *
 * The reader override exists for tests only; production always uses the
 * governed reader.
 */
export async function loadBundleWithOwnerOverlay(
  siteId: string,
  reader?: FydOverlayReader,
): Promise<SiteBundle | null> {
  const bundle = await getSiteBundle(siteId, reader ? { reader } : undefined);
  if (!bundle) return null;
  try {
    const overlaid = applyOwnerFieldCorrections(bundle.graph, siteId);
    return { ...bundle, graph: overlaid.graph };
  } catch {
    return bundle;
  }
}
""",
    ),
    # ------------------------------------------------------------------
    # ask-pipeline.ts: import the reader-override type
    # ------------------------------------------------------------------
    (
        "src/app/api/fyd/ask/ask-pipeline.ts",
        """import { getSiteBundle, type SiteBundle } from "@/fyd/media/site-bundle";
""",
        """import { getSiteBundle, type SiteBundle } from "@/fyd/media/site-bundle";
import type { FydOverlayReader } from "@/fyd/data/fyd-tenant-graph";
""",
    ),
    # ------------------------------------------------------------------
    # ask-pipeline.ts: resolve the bundle (async, authorized read) before
    # answering; inject a tenant-scoped sync loader into the answer engine.
    # ------------------------------------------------------------------
    (
        "src/app/api/fyd/ask/ask-pipeline.ts",
        """  let outcome: AskFydOutcome;
  try {
    outcome = answerAskFyd(
      {
        siteId,
        objectId: rawObjectId.length > 0 ? rawObjectId : undefined,
        question,
        mode: mode as AskFydMode,
      },
      ASK_DEPS,
    );
""",
        """  // The bundle loads through the authorized graph read on every request
  // (re-read on every serve). A load or verification failure is the same
  // honest unknown as a missing projection: never an answer, never a leak.
  let bundle: SiteBundle | null;
  try {
    bundle = await loadBundleWithOwnerOverlay(siteId);
  } catch (err) {
    console.error(
      `answerAskFyd: projection load failed for site "${siteId}":`,
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      {
        ok: false,
        kind: "projection_unavailable",
        error:
          "I could not load this site's data, so I cannot answer your question. The answer is unknown.",
        attempted: "load the site's verified data projection",
        answerUnknown: true,
      },
      { status: 503 },
    );
  }

  const deps: AnswerAskFydDeps = {
    // Tenant-scoped: the answer engine can only ever load this request's
    // tenant bundle, never another tenant's graph.
    loadBundle: (id) => (id === siteId ? bundle : null),
  };

  let outcome: AskFydOutcome;
  try {
    outcome = answerAskFyd(
      {
        siteId,
        objectId: rawObjectId.length > 0 ? rawObjectId : undefined,
        question,
        mode: mode as AskFydMode,
      },
      deps,
    );
""",
    ),
]

def main() -> None:
    for rel, old, new in PATCHES:
        path = f"{REPO}/{rel}"
        with open(path, "r", encoding="utf-8") as f:
            text = f.read()
        count = text.count(old)
        if count != 1:
            print(f"ABORT: {rel}: expected 1 match, found {count}")
            sys.exit(1)
        text = text.replace(old, new)
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"patched {rel}")

if __name__ == "__main__":
    main()
