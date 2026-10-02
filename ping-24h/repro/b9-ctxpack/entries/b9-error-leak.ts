/**
 * B9 repro 1: ContextPack patch residual  -  ERROR DETAIL LEAK.
 *
 * The patch's fail-closed path in src/app/api/mc/dispatch/route.ts
 * (branch decision-fabric/contextpack-wire-2026-09-28) does:
 *
 *   } catch (e) {
 *     const error = `context pack unavailable: ${String(e).slice(0, 300)}`;
 *     emit('MC_RUN_FAILED', `context pack compilation failed: ${error}`, { error });
 *     return Response.json({ ok: true, status: 'FAILED', ..., error });
 *   }
 *
 * This repro runs the REAL getFydTenantGraph() (real FydTenantGraphError
 * construction, real digest check over the real fixture) inside a VERBATIM
 * copy of that catch block, with three synthetic failure causes, and shows
 * what lands in the journal payload vs the HTTP response.
 *
 * Run: node dist/b9-error-leak.js
 */
import { getFydTenantGraph } from "../src/fyd/data/fyd-tenant-graph";

// VERBATIM catch snippet from route.ts (ContextPack patch branch).
function routeCatch(e: unknown) {
  const error = `context pack unavailable: ${String(e).slice(0, 300)}`;
  const journalPayload = { error }; // emit('MC_RUN_FAILED', `context pack compilation failed: ${error}`, { error })
  const httpResponse = {
    ok: true, status: "FAILED",
    mission_id: "mc-demo", run_id: "r1", execution_id: "e1", work_order_id: "w1",
    error, // <-- returned to the dispatch caller
  };
  return { error, journalPayload, httpResponse };
}

async function main() {
  let failures = 0;
  const check = (name: string, cond: boolean, detail: string) => {
    console.log(`${cond ? "LEAK " : "clean"}  ${name}: ${detail}`);
    if (cond) failures++;
  };

  // Case A: the overlay reader throws with a filesystem path.
  // (The production reader reads journal overlay files; ENOENT text is realistic.)
  const fsPathReader = {
    queryFydSiteOverlays: async (_siteId: string) => {
      throw new Error(
        "ENOENT: no such file or directory, open '/var/lib/ping/journal/overlays/happy-place.jsonl'"
      );
    },
  };
  try {
    await getFydTenantGraph("happy-place", { reader: fsPathReader });
    console.log("CASE A: unexpectedly did not throw");
  } catch (e) {
    const r = routeCatch(e);
    console.log("CASE A raw error string:\n  " + r.error);
    check(
      "A/fs-path-in-http-response",
      r.httpResponse.error.includes("/var/lib/ping/journal/overlays/happy-place.jsonl"),
      "filesystem path reaches the dispatch caller"
    );
    check(
      "A/fs-path-in-journal",
      (r.journalPayload as any).error.includes("/var/lib/ping/journal/"),
      "filesystem path lands in the MC_RUN_FAILED journal payload"
    );
    check(
      "A/code-prefix-present",
      r.error.includes("fyd-tenant-graph[reader_failed]"),
      "typed code survives (good) but is glued to raw text (bad)"
    );
  }

  // Case B: a long reader error  -  truncation at 300 chars keeps the sensitive head.
  const longReader = {
    queryFydSiteOverlays: async (_siteId: string) => {
      throw new Error(
        "upstream gateway 502 at https://internal-gateway.local:8443/events " +
          "Y".repeat(400)
      );
    },
  };
  try {
    await getFydTenantGraph("happy-place", { reader: longReader });
  } catch (e) {
    const r = routeCatch(e);
    check(
      "B/truncated-at-300",
      r.error.length === "context pack unavailable: ".length + 300,
      `error length is ${r.error.length} (prefix + exactly 300)`
    );
    check(
      "B/internal-host-in-response",
      r.httpResponse.error.includes("https://internal-gateway.local:8443/events"),
      "internal host:port from the raw exception reaches the caller"
    );
  }

  // Case C: unknown tenant  -  caller-influenced value echoed into the response.
  try {
    await getFydTenantGraph("nope-not-a-tenant", {});
  } catch (e) {
    const r = routeCatch(e);
    check(
      "C/tenant-echo",
      r.httpResponse.error.includes('"nope-not-a-tenant"'),
      "unvalidated-looking input echoed (benign here: tenant is allowlisted upstream, but the pattern echoes)"
    );
  }

  console.log(
    `\nRESULT: ${failures > 0 ? "LEAK DEMONSTRATED" : "no leak"} ` +
      `(${failures} leaking case(s)) with real getFydTenantGraph + verbatim route catch block.`
  );
  console.log(
    "FALSIFIES IF: the deployed route maps exceptions to typed codes before " +
      "emit()/Response.json (i.e. the catch block above is not what ships)."
  );
}

main().catch((e) => { console.error("HARNESS FAILURE:", e); process.exit(2); });
