"use client";

/**
 * tenant-mission-control.tsx — tenant-bound Mission Control dispatch surface
 * for the FYD website.
 *
 * Wiring lane 2026-09-27. Rendered by the per-site pages at
 * src/app/sites/<site>/mission-control/page.tsx with a FIXED tenant prop
 * (the page's SITE_ID). Tenant is displayed as a badge and is never
 * user-editable: the HTTP dispatch route takes tenant from the caller, so the
 * caller binds it to the page's own site id.
 *
 * Self-contained: no imports from src/app/mission-control. The seam is
 * one-directional (this surface calls /api/mc/*; the operator surface does
 * not know about it).
 *
 * Failure semantics (fail-closed, matching the dispatch plane):
 * - catalog fetch failure -> error string, no form rendered
 * - 403 / DENIED -> "DENIED (not failed)" + reason; the mission exists, terminal
 * - 503 -> adapter-unavailable message
 * - UNKNOWN -> mandated "OUTCOME UNKNOWN — RECONCILIATION IN PROGRESS" string,
 *   never collapsed to FAILED
 * - POST has no idempotency key: the UI never blind-retries; "dispatch another"
 *   only clears the form for a deliberate new mission.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MC_TERMINAL,
  McCatalog,
  McDispatchInput,
  McMissionDetail,
  McMissionSummary,
  fetchMcCatalog,
  fetchMcMission,
  fetchMcMissions,
  mcApiBase,
  postMcDispatch,
} from "./mc-api";

type BadgeState =
  | "PROVEN"
  | "PROTOTYPE"
  | "UNKNOWN"
  | "SUCCEEDED"
  | "FAILED"
  | "DENIED"
  | "QUEUED"
  | "RUNNING"
  | "CREATED";

const BADGE_STYLE: Record<string, { background: string; color: string }> = {
  PROVEN: { background: "#123f2a", color: "#7dffa8" },
  PROTOTYPE: { background: "#3a3a4a", color: "#b9b9d6" },
  UNKNOWN: { background: "#2a2a32", color: "#9a97b5" },
  SUCCEEDED: { background: "#123f2a", color: "#7dffa8" },
  FAILED: { background: "#4a1a1a", color: "#ff8a8a" },
  DENIED: { background: "#4a3410", color: "#ffcf7d" },
  QUEUED: { background: "#1a2f4a", color: "#8ab8ff" },
  RUNNING: { background: "#1a2f4a", color: "#8ab8ff" },
  CREATED: { background: "#2a2a32", color: "#9a97b5" },
};

function Badge({ h, label }: { h: BadgeState; label?: string }) {
  const s = BADGE_STYLE[h] ?? BADGE_STYLE.UNKNOWN;
  return (
    <span
      style={{
        ...s,
        fontSize: 11,
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: 10,
        letterSpacing: 1,
      }}
    >
      {label ?? h}
    </span>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      style={{ border: "1px solid #2c2c3a", borderRadius: 10, padding: 14, marginBottom: 12, background: "#14141c" }}
    >
      <h3 style={{ margin: "0 0 8px", fontSize: 15, color: "#eceaf6" }}>{title}</h3>
      <div style={{ fontSize: 13, color: "#cfcfe0" }}>{children}</div>
    </section>
  );
}

function J({ v }: { v: unknown }) {
  return (
    <pre
      style={{
        fontSize: 11,
        overflowX: "auto",
        background: "#0c0c12",
        padding: 8,
        borderRadius: 6,
        maxHeight: 340,
        overflowY: "auto",
        color: "#cfcfe0",
      }}
    >
      {JSON.stringify(v, null, 2)}
    </pre>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #3a3a4e",
  background: "#14141c",
  color: "#eceaf6",
  fontSize: 13,
  boxSizing: "border-box",
};

export default function TenantMissionControl({
  tenant,
  apiBase: apiBaseProp,
  title,
}: {
  /** Fixed tenant for this page (the site's SITE_ID). Never user-editable. */
  tenant: string;
  /** Optional API base override; defaults to same-origin (or NEXT_PUBLIC_MC_API_BASE). */
  apiBase?: string;
  title?: string;
}) {
  const apiBase = useMemo(() => mcApiBase(apiBaseProp), [apiBaseProp]);
  const [catalog, setCatalog] = useState<McCatalog | null>(null);
  const [catalogErr, setCatalogErr] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [agent, setAgent] = useState("");
  const [capability, setCapability] = useState("");
  const [busy, setBusy] = useState(false);
  const [dispatchMsg, setDispatchMsg] = useState<string | null>(null);
  const [dispatchTone, setDispatchTone] = useState<"ok" | "denied" | "error">("ok");
  const [missions, setMissions] = useState<McMissionSummary[]>([]);
  const [missionsAsOf, setMissionsAsOf] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<McMissionDetail | null>(null);

  const loadCatalog = useCallback(() => {
    fetchMcCatalog(apiBase)
      .then((c) => {
        setCatalog(c);
        // Default to ollama when present: the only acceptance-proven,
        // zero-spend transport. Never hardcode the agent list.
        setAgent((a) => a || (c.agents.find((x) => x.id === "ollama")?.id ?? c.agents[0]?.id ?? ""));
      })
      .catch((e) => setCatalogErr(`dispatch catalog unavailable: ${String(e?.message ?? e)}`));
  }, [apiBase]);

  const loadMissions = useCallback(() => {
    fetchMcMissions(apiBase)
      .then(({ missions: ms, as_of }) => {
        // The missions list has no tenant filter; filter client-side to this page's tenant.
        setMissions(ms.filter((m) => m.tenant === tenant));
        setMissionsAsOf(as_of);
      })
      .catch(() => {});
  }, [apiBase, tenant]);

  const loadDetail = useCallback(
    (id: string) => {
      fetchMcMission(apiBase, id)
        .then((d) => {
          if (d) setDetail(d);
        })
        .catch(() => {});
    },
    [apiBase]
  );

  useEffect(() => {
    loadCatalog();
    loadMissions();
  }, [loadCatalog, loadMissions]);

  // Poll the selected mission while non-terminal. The interval decision is
  // derived from the FETCHED mission, never from the render closure's
  // `detail` (intentionally excluded from deps to avoid refetch loops):
  // selecting another mission resets via selectedId; terminal missions stop
  // after the first fetch; running missions poll until a fetch observes a
  // terminal status.
  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    const poll = async () => {
      const m = await fetchMcMission(mcApiBase(), selectedId);
      if (cancelled) return;
      setDetail(m);
      if (m && MC_TERMINAL.has(m.status)) {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
      } else if (!timer) {
        timer = setInterval(poll, 5000);
      }
    };
    poll();
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const selectedAgent = catalog?.agents.find((a) => a.id === agent) ?? null;
  const capabilities = selectedAgent?.allowedCapabilities ?? [];

  useEffect(() => {
    if (capabilities.length && !capabilities.includes(capability)) {
      setCapability(capabilities[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent, catalog]);

  const doDispatch = useCallback(() => {
    if (busy || !prompt.trim() || !agent || !capability) return;
    setBusy(true);
    setDispatchMsg(null);
    const input: McDispatchInput = { prompt: prompt.trim(), agent, capability, tenant };
    postMcDispatch(apiBase, input)
      .then((r) => {
        setBusy(false);
        if (r.status === "DENIED") {
          setDispatchTone("denied");
          setDispatchMsg(`DENIED (not failed): ${r.reason}`);
          if (r.mission_id) setSelectedId(r.mission_id);
        } else if (r.ok) {
          setDispatchTone("ok");
          setDispatchMsg(
            `Dispatched: ${r.mission_id} -> ${r.status}` +
              (r.status === "UNKNOWN" ? " — OUTCOME UNKNOWN — RECONCILIATION IN PROGRESS" : "")
          );
          setSelectedId(r.mission_id);
        } else if (r.status === "REJECTED") {
          setDispatchTone("error");
          setDispatchMsg(`Dispatch rejected: ${r.error}${r.detail ? ` — ${r.detail}` : ""}`);
        } else {
          setDispatchTone("error");
          setDispatchMsg(`Dispatch rejected: unexpected response shape`);
        }
        loadMissions();
      })
      .catch((e) => {
        setBusy(false);
        setDispatchTone("error");
        setDispatchMsg(`Dispatch error: ${String(e?.message ?? e)}`);
      });
  }, [busy, prompt, agent, capability, tenant, apiBase, loadMissions]);

  const msgColor = dispatchTone === "denied" ? "#ffcf7d" : dispatchTone === "error" ? "#ff8a8a" : "#7dffa8";

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: 20, color: "#eceaf6" }}>{title ?? "Mission Control"}</h2>
        <Badge h="PROVEN" label={`tenant: ${tenant}`} />
        {apiBase && <Badge h="UNKNOWN" label={`api: ${apiBase}`} />}
      </div>

      <Card title="New Mission">
        <p style={{ fontSize: 12, color: "#9a97b5", marginTop: 0 }}>
          Witnessed dispatch, tenant-bound to <strong>{tenant}</strong>. Every dispatch is authorized by the
          existing ExternalAgentAdapter, executed by the agent&apos;s proven transport, and recorded as typed
          events in the existing journal. Projection only, no new store. The tenant is fixed by this page and
          cannot be changed here.
        </p>
        {catalogErr && <p style={{ color: "#ff8a8a", fontSize: 13 }}>{catalogErr}</p>}
        {!catalog && !catalogErr && <p>Loading dispatch catalog...</p>}
        {catalog && (
          <div style={{ display: "grid", gap: 10 }}>
            <label style={{ fontSize: 12, color: "#b9b9d6" }}>
              Prompt (bounded, {prompt.length}/{catalog.prompt_max} chars)
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value.slice(0, catalog.prompt_max))}
                rows={4}
                placeholder="Real bounded prompt for the headless agent..."
                style={{ ...inputStyle, fontFamily: "inherit", resize: "vertical" }}
              />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label style={{ fontSize: 12, color: "#b9b9d6" }}>
                Agent
                <select value={agent} onChange={(e) => setAgent(e.target.value)} style={inputStyle}>
                  {catalog.agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.id} ({a.family}, {a.claim})
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ fontSize: 12, color: "#b9b9d6" }}>
                Capability
                <select value={capability} onChange={(e) => setCapability(e.target.value)} style={inputStyle}>
                  {capabilities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {selectedAgent && (
              <div style={{ fontSize: 11, color: "#6a6785" }}>
                {selectedAgent.id}: {selectedAgent.claim_note} Deadline: {catalog.deadlines_seconds[selectedAgent.id]}s.
                Constraints: {Object.keys(catalog.constraints).join(", ")} (fixed, fail-closed).
              </div>
            )}
            <div>
              <button
                onClick={doDispatch}
                disabled={busy || !prompt.trim() || !agent || !capability}
                style={{
                  padding: "10px 26px",
                  borderRadius: 8,
                  border: "none",
                  background: busy ? "#3a3a4e" : "#4a3568",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: busy ? "wait" : "pointer",
                  fontSize: 14,
                }}
              >
                {busy ? "Dispatching..." : "Dispatch"}
              </button>
              {dispatchMsg && <span style={{ marginLeft: 12, fontSize: 13, color: msgColor }}>{dispatchMsg}</span>}
            </div>
          </div>
        )}
      </Card>

      <Card title={`Missions for ${tenant}${missionsAsOf ? ` (as of ${missionsAsOf})` : ""}`}>
        {!missions.length && <p style={{ fontSize: 13, color: "#9a97b5" }}>No missions for this tenant yet. Dispatch one above.</p>}
        {missions.map((m) => (
          <div
            key={m.mission_id}
            onClick={() => setSelectedId(m.mission_id)}
            style={{
              border: "1px solid #2c2c3a",
              borderRadius: 8,
              padding: "8px 10px",
              marginBottom: 8,
              cursor: "pointer",
              background: selectedId === m.mission_id ? "#1e1a2e" : "#101018",
            }}
          >
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <Badge h={(m.status as BadgeState) ?? "UNKNOWN"} />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#eceaf6" }}>{m.mission_id}</span>
              <span style={{ fontSize: 11, color: "#9a97b5" }}>
                {m.agent} / {m.capability}
              </span>
              {m.status === "UNKNOWN" && (
                <span style={{ fontSize: 11, color: "#9a97b5", fontWeight: 700 }}>
                  OUTCOME UNKNOWN — RECONCILIATION IN PROGRESS
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: "#6a6785", marginTop: 4 }}>
              run {m.run_id ?? "-"} · exec {m.execution_id ?? "-"} · {m.event_count} events · {m.artifact_count}{" "}
              artifacts
              {m.started_at ? ` · started ${m.started_at}` : ""}
              {m.ended_at ? ` · ended ${m.ended_at}` : ""}
            </div>
          </div>
        ))}
        <button
          onClick={loadMissions}
          style={{
            padding: "6px 14px",
            borderRadius: 6,
            border: "1px solid #3a3a4e",
            background: "#14141c",
            color: "#b9b9d6",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          Refresh
        </button>
      </Card>

      {detail && (
        <Card title={`Mission ${detail.mission_id}`}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
            <Badge h={(detail.status as BadgeState) ?? "UNKNOWN"} />
            <span style={{ fontWeight: 700, color: "#eceaf6" }}>{detail.status}</span>
            {detail.status === "UNKNOWN" && (
              <span style={{ fontSize: 12, color: "#9a97b5", fontWeight: 700 }}>
                OUTCOME UNKNOWN — RECONCILIATION IN PROGRESS
              </span>
            )}
            {detail.reconciliation_state && detail.status !== "UNKNOWN" && (
              <span style={{ fontSize: 12, color: "#9a97b5" }}>{detail.reconciliation_state}</span>
            )}
          </div>
          <J
            v={{
              agent: detail.agent,
              run: detail.run_id,
              execution: detail.execution_id,
              tenant: detail.tenant,
              capability: detail.capability,
              capabilities_granted: detail.capabilities_granted,
              work_order_id: detail.work_order_id,
              context_pack_id: detail.context_pack_id,
              started_at: detail.started_at,
              ended_at: detail.ended_at,
              result: detail.result,
              reconciliation_state: detail.reconciliation_state,
            }}
          />
          <h4 style={{ fontSize: 13, margin: "12px 0 6px", color: "#eceaf6" }}>
            Artifacts ({detail.artifacts.length})
          </h4>
          <J v={detail.artifacts} />
          <h4 style={{ fontSize: 13, margin: "12px 0 6px", color: "#eceaf6" }}>
            Evidence ({detail.evidence.length})
          </h4>
          <J v={detail.evidence} />
          <h4 style={{ fontSize: 13, margin: "12px 0 6px", color: "#eceaf6" }}>Events ({detail.events.length})</h4>
          <J v={detail.events} />
        </Card>
      )}
    </div>
  );
}
