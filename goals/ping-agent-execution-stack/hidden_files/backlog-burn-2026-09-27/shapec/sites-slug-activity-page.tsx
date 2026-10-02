/**
 * Shape C — Read-only mission observer (MC -> FYD wiring, 2026-09-27).
 *
 * NEW ADDITIVE ROUTE: /sites/[slug]/activity. Tenant is locked to the route
 * slug; any slug outside SLICE_TENANTS 404s. The page projects the MC
 * journal filtered by event_data.tenant === slug through the EXISTING
 * projectMissions() projector — the same projector behind GET
 * /api/mc/missions — and renders the result.
 *
 * OBSERVE-ONLY, mirroring the SpineDryRunObserverAdapter philosophy:
 * this module imports ONLY the read path (loadJournalEvents,
 * projectMissions). It never imports appendDispatchEvent, writeArtifact,
 * publishArtifact, or any other emitter. It mints ZERO events.
 *
 * No existing tenant content, route, or component is modified by this file.
 */

import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import {
  loadJournalEvents,
  projectMissions,
  SLICE_TENANTS,
  JOURNAL_PATH,
  nowIso,
} from "@/app/api/mc/_lib/mc-dispatch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, CSSProperties> = {
  SUCCEEDED: { background: "#dcfce7", color: "#166534" },
  FAILED: { background: "#fee2e2", color: "#991b1b" },
  UNKNOWN: { background: "#fef3c7", color: "#92400e" },
  DENIED: { background: "#e5e7eb", color: "#374151" },
  CREATED: { background: "#dbeafe", color: "#1e40af" },
  QUEUED: { background: "#dbeafe", color: "#1e40af" },
  RUNNING: { background: "#dbeafe", color: "#1e40af" },
};

export default async function SiteMissionActivityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // Tenant is derived from the route, never from a request body or query.
  if (!(SLICE_TENANTS as readonly string[]).includes(slug)) {
    notFound();
  }

  // Read-only projection: journal -> mission records, filtered by tenant.
  const missions = projectMissions(loadJournalEvents()).filter(
    (m) => m.tenant === slug,
  );
  const asOf = nowIso();

  return (
    <main
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: "32px 20px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>
        Mission Control &rarr; FYD website &middot; read-only observer
      </p>
      <h1 style={{ fontSize: 26, margin: "0 0 8px" }}>
        Mission activity &mdash; {slug}
      </h1>
      <p
        data-observer-notice
        style={{
          fontSize: 13,
          color: "#374151",
          background: "#f3f4f6",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: "10px 12px",
        }}
      >
        Observer only: this page projects the existing MC journal through the
        shared projector and emits zero events. Journal:{" "}
        <code style={{ fontSize: 12 }}>{JOURNAL_PATH}</code>
      </p>
      <p style={{ fontSize: 12, color: "#6b7280" }}>
        {missions.length} mission{missions.length === 1 ? "" : "s"} &middot;
        projected as of {asOf}
      </p>

      {missions.length === 0 ? (
        <p style={{ fontSize: 14, color: "#6b7280" }}>
          No missions recorded for this tenant yet.
        </p>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
            marginTop: 12,
          }}
        >
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #e5e7eb" }}>
              <th style={{ padding: "8px 6px" }}>Mission</th>
              <th style={{ padding: "8px 6px" }}>Status</th>
              <th style={{ padding: "8px 6px" }}>Agent</th>
              <th style={{ padding: "8px 6px" }}>Capability</th>
              <th style={{ padding: "8px 6px" }}>Artifacts</th>
              <th style={{ padding: "8px 6px" }}>Events</th>
              <th style={{ padding: "8px 6px" }}>Started</th>
            </tr>
          </thead>
          <tbody>
            {missions.map((m) => (
              <tr
                key={m.mission_id}
                data-mission-id={m.mission_id}
                style={{ borderBottom: "1px solid #f3f4f6" }}
              >
                <td style={{ padding: "8px 6px" }}>
                  <code style={{ fontSize: 12 }}>{m.mission_id}</code>
                </td>
                <td style={{ padding: "8px 6px" }}>
                  <span
                    data-status={m.status}
                    style={{
                      display: "inline-block",
                      padding: "2px 10px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 600,
                      ...STATUS_STYLE[m.status],
                    }}
                  >
                    {m.status}
                  </span>
                </td>
                <td style={{ padding: "8px 6px" }}>{m.agent ?? "—"}</td>
                <td style={{ padding: "8px 6px" }}>{m.capability ?? "—"}</td>
                <td style={{ padding: "8px 6px" }}>{m.artifacts.length}</td>
                <td style={{ padding: "8px 6px" }}>{m.events.length}</td>
                <td style={{ padding: "8px 6px", fontSize: 12 }}>
                  {m.started_at ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
