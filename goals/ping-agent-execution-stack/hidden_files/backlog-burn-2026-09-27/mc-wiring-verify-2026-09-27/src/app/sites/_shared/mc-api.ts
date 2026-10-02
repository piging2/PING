/**
 * mc-api.ts — typed client for the Mission Control dispatch plane.
 *
 * Wiring lane 2026-09-27 (Mission Control -> FYD website). This module is a
 * dumb caller: it performs fetches and types the responses. Every grant/deny
 * decision stays in the ExternalAgentAdapter behind POST /api/mc/dispatch;
 * every execution record stays in the existing MC journal. No new authority,
 * no new store, no new event types.
 *
 * API base resolution: same-origin by default. If the served app does not
 * contain the /api/mc/* routes (Case B), set NEXT_PUBLIC_MC_API_BASE to the
 * Mission Control origin (e.g. the :3100 origin) at build time.
 */

export type McAgent = {
  id: string;
  family: string;
  status: string;
  allowedCapabilities: string[];
  claim: string;
  claim_note: string;
};

export type McCatalog = {
  ok: boolean;
  as_of?: string;
  agents: McAgent[];
  tenants: string[];
  constraints: Record<string, boolean>;
  prompt_max: number;
  deadlines_seconds: Record<string, number>;
};

export type McMissionSummary = {
  mission_id: string;
  run_id: string | null;
  execution_id: string | null;
  status: string;
  agent: string | null;
  tenant: string | null;
  capability: string | null;
  work_order_id: string | null;
  started_at: string | null;
  ended_at: string | null;
  reconciliation_state: string | null;
  artifact_count: number;
  event_count: number;
};

export type McMissionDetail = {
  mission_id: string;
  run_id: string | null;
  execution_id: string | null;
  status: string;
  status_event_id: string | null;
  agent: string | null;
  tenant: string | null;
  capability: string | null;
  capabilities_granted: string[];
  work_order_id: string | null;
  context_pack_id: string | null;
  started_at: string | null;
  ended_at: string | null;
  result: {
    outcome: string | null;
    output_digest: string | null;
    output_chars: number | null;
    error: string | null;
  };
  reconciliation_state: string | null;
  artifacts: { kind: string; path: string; sha256: string | null; event_id: string }[];
  evidence: Record<string, unknown>[];
  events: { event_id: string; event_type: string; timestamp: string; summary: string | null }[];
};

export type McDispatchResult =
  | { ok: true; status: "SUCCEEDED" | "FAILED" | "UNKNOWN"; mission_id: string; run_id: string; execution_id: string; work_order_id: string; result_id?: string; output_digest?: string; reconciliation_state?: string; reason?: string; error?: string }
  | { ok: false; status: "DENIED"; mission_id: string; reason: string }
  | { ok: false; status: "REJECTED"; http: number; error: string; detail: string | null };

export const MC_TERMINAL = new Set(["SUCCEEDED", "FAILED", "UNKNOWN", "DENIED"]);

export function mcApiBase(explicit?: string): string {
  if (explicit) return explicit.replace(/\/$/, "");
  const env = (typeof process !== "undefined" && (process.env.NEXT_PUBLIC_MC_API_BASE as string | undefined)) || "";
  return env.replace(/\/$/, "");
}

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  return (await r.json()) as T;
}

export async function fetchMcCatalog(apiBase = ""): Promise<McCatalog> {
  const base = mcApiBase(apiBase);
  const c = await getJson<McCatalog>(`${base}/api/mc/dispatch`);
  if (!c || !c.ok) throw new Error("dispatch catalog unavailable");
  return c;
}

export async function fetchMcMissions(apiBase = ""): Promise<{ missions: McMissionSummary[]; as_of: string }> {
  const base = mcApiBase(apiBase);
  const m = await getJson<{ ok: boolean; missions: McMissionSummary[]; as_of: string }>(`${base}/api/mc/missions`);
  if (!m || !m.ok) throw new Error("missions list unavailable");
  return { missions: m.missions ?? [], as_of: m.as_of };
}

export async function fetchMcMission(apiBase: string, id: string): Promise<McMissionDetail | null> {
  const base = mcApiBase(apiBase);
  const m = await getJson<{ ok: boolean; mission?: McMissionDetail; error?: string }>(
    `${base}/api/mc/missions/${encodeURIComponent(id)}`
  );
  if (!m || !m.ok || !m.mission) return null;
  return m.mission;
}

export type McDispatchInput = {
  prompt: string;
  agent: string;
  capability: string;
  /** Tenant is fixed by the calling page (SITE_ID). Never user-editable. */
  tenant: string;
};

export async function postMcDispatch(apiBase: string, input: McDispatchInput): Promise<McDispatchResult> {
  const base = mcApiBase(apiBase);
  let http = 0;
  let j: Record<string, unknown> = {};
  try {
    const r = await fetch(`${base}/api/mc/dispatch`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        prompt: input.prompt,
        agent: input.agent,
        capability: input.capability,
        tenant: input.tenant,
      }),
    });
    http = r.status;
    j = (await r.json()) as Record<string, unknown>;
  } catch (e) {
    return { ok: false, status: "REJECTED", http: 0, error: "dispatch_error", detail: String(e) };
  }
  // Authorization refusal: terminal-informative, never a failure.
  if (http === 403 || j.status === "DENIED") {
    return {
      ok: false,
      status: "DENIED",
      mission_id: String(j.mission_id ?? ""),
      reason: String((j.reason as string) ?? (j.error as string) ?? "denied"),
    };
  }
  if (j.ok && (j.status === "SUCCEEDED" || j.status === "FAILED" || j.status === "UNKNOWN")) {
    return {
      ok: true,
      status: j.status as "SUCCEEDED" | "FAILED" | "UNKNOWN",
      mission_id: String(j.mission_id),
      run_id: String(j.run_id),
      execution_id: String(j.execution_id),
      work_order_id: String(j.work_order_id),
      result_id: (j.result_id as string) ?? undefined,
      output_digest: (j.output_digest as string) ?? undefined,
      reconciliation_state: (j.reconciliation_state as string) ?? undefined,
      reason: (j.reason as string) ?? undefined,
      error: (j.error as string) ?? undefined,
    };
  }
  return {
    ok: false,
    status: "REJECTED",
    http,
    error: String((j.error as string) ?? "unknown"),
    detail: (j.detail as string) ?? null,
  };
}
