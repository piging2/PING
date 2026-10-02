/**
 * FYD preview: DEMO OWNER MODE console (LANE-OWNER).
 *
 * Preview scope only. This page is NOT wired into the repo; it lives in the
 * preview staging directory. It mounts the LANE-OWNER demo console with its
 * fail-closed demo identity provider.
 *
 * Route-level guard: unless NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1 the route
 * returns 404 (notFound). When enabled, a visible banner reads exactly:
 * "DEMO OWNER MODE, simulated authority, preview only".
 *
 * This is a preview-only code path: it never reads real owner credentials,
 * it binds no real identity provider, and every simulated action in the
 * console is logged as simulated owner authority. Real owner auth, when it
 * exists, must be a separate, reviewed mechanism.
 */

import { notFound } from "next/navigation";
import { isDemoOwnerModeEnabled } from "@/fyd/owner-mode/gate";
import { DemoOwnerConsole } from "@/fyd/owner-mode/demo-owner-console";
import { getPingObjectGraph } from "@/fyd/data/ping-object-source";
import { generateSiteSpec } from "@/fyd/proceduralize/generator";
import type { ObjectGraph } from "@/fyd/sitespec/types";

const SITE_IDS = ["happy-place", "coppersmith-plumbing"] as const;
const DEFAULT_SITE: (typeof SITE_IDS)[number] = "happy-place";

/** Privacy boundary: the console preview only ever sees public objects. */
function publicGraph(graph: ObjectGraph): ObjectGraph {
  const ids = new Set(
    graph.objects.filter((o) => o.visibility === "public").map((o) => o.id),
  );
  return {
    ...graph,
    objects: graph.objects.filter((o) => ids.has(o.id)),
    relationships: graph.relationships.filter(
      (r) => ids.has(r.subject) && ids.has(r.object),
    ),
  };
}

type SearchParams = { site?: string } | Promise<{ site?: string }>;

export default async function OwnerConsolePreviewPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  // Route-level fail-closed guard: no env opt-in, no route at all.
  if (!isDemoOwnerModeEnabled()) {
    notFound();
  }

  const params = (await searchParams) ?? {};
  const site = SITE_IDS.includes(params.site as (typeof SITE_IDS)[number])
    ? (params.site as (typeof SITE_IDS)[number])
    : DEFAULT_SITE;

  const { graph, meta } = await getPingObjectGraph(site);
  const spec = generateSiteSpec(graph, {
    generatedAt: meta.generatedAt,
    eventSequences: meta.eventSequences ?? undefined,
  });

  return (
    <main
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "24px 20px 64px",
        fontFamily: "system-ui, sans-serif",
        color: "#eee",
        background: "#111",
        minHeight: "100vh",
      }}
    >
      <div
        role="alert"
        style={{
          padding: "14px 18px",
          marginBottom: 20,
          borderRadius: 8,
          border: "3px solid #f5c518",
          background:
            "repeating-linear-gradient(45deg, #3a2b00 0 16px, #14100a 16px 32px)",
          color: "#ffe9a8",
          fontWeight: 800,
          fontSize: 18,
          letterSpacing: 1,
        }}
      >
        DEMO OWNER MODE, simulated authority, preview only
      </div>

      <div
        role="note"
        style={{
          padding: "12px 16px",
          marginBottom: 20,
          borderRadius: 8,
          border: "2px solid #b98a2f",
          background: "#1c1608",
          color: "#e8c96a",
          fontSize: 14,
        }}
      >
        <strong>Known divergence, preview honesty note.</strong> Visibility
        decisions (HIDE) made in this console apply only inside this console
        today. They are kept in memory and do not persist, and Ask FYD does
        not consume them: the ask pipeline applies field visibility with no
        owner decisions supplied (applyFieldVisibility(graph, []) in
        src/fyd/ask/visitor-answer.ts), so a fact hidden here can still be
        answered there. Do not treat a HIDE in this preview as enforced
        anywhere else.
      </div>

      <h1 style={{ fontSize: 26, margin: "0 0 4px" }}>
        Owner console preview: {site}
      </h1>
      <p style={{ color: "#aaa", marginTop: 0, fontSize: 14 }}>
        Simulated owner authority. No real authentication, no real credentials,
        no production decisions. Every action here is logged as simulated.
      </p>

      <nav style={{ marginBottom: 16 }}>
        {SITE_IDS.map((s) => (
          <a
            key={s}
            href={`/preview/owner-console?site=${s}`}
            style={{
              marginRight: 12,
              color: s === site ? "#fff" : "#7aa2ff",
              fontWeight: s === site ? 700 : 400,
              textDecoration: "underline",
            }}
          >
            {s}
          </a>
        ))}
      </nav>

      <DemoOwnerConsole siteId={site} graph={publicGraph(graph)} spec={spec} />
    </main>
  );
}
