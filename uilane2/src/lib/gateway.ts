// UI browser-binding fix 2026-09-19: relative path only. The browser
// cannot resolve the Docker-internal gateway hostname, so requests go
// to /gateway/* and the Next rewrite proxies them to the gateway
// server-side. All callers run in the browser ('use client').
const GATEWAY_URL = '/gateway';

export interface SessionConfig {
  model: string;
  temperature?: number;
  stream?: boolean;
}

export interface SystemState {
  version: string;
  generated_at: string;
  containers: { status: string; containers: any[] };
  git: { status: string; branch: string; pending_changes: number; recent_commits: any[] };
  repository: { status: string; intents: number; authorities: number; capabilities: number; specifications: number; total_nodes: number; total_edges: number; duplicate_warnings: number };
  knowledge: { status: string; knowledge_objects: number; reflections: number; skills: number | null; policies: number | null; evidence: number; proofs: number | null; witnesses: number | null; replay_certificates: number | null; historical_snapshots: number | null };
  missions: { status: string; queued: number | null; executing: number | null; completed: number | null; failed: number | null; blocked: number | null; total: number; reflections: number };
  replay: { status: string; total_runs: number; success_rate: number; failures: number; latest_replay: string | number | null; witness_coverage: number };
  postgres: { status: string; total_events: number; streams: number; event_types: number; oldest_event: string | null; newest_event: string | null };
  qdrant: { status: string; collections: number; total_points: number; total_vectors: number };
  metrics: { uptime_seconds: number; total_requests: number; total_errors: number };
  organizational_health: { authority_violations: number; capability_violations: number; intent_conflicts: number; confidence_decay: number };
}

export async function fetchSystemState(): Promise<SystemState> {
  const response = await fetch(`${GATEWAY_URL}/system/state`);
  if (!response.ok) throw new Error(`Gateway error: ${response.status}`);
  return response.json();
}

export async function fetchJson(path: string): Promise<any> {
  const response = await fetch(`${GATEWAY_URL}${path}`);
  if (!response.ok) throw new Error(`Gateway error: ${response.status}`);
  return response.json();
}

export async function* streamChat(messages: Array<{role: string; content: string}>, config: SessionConfig): AsyncGenerator<string> {
  const response = await fetch(`${GATEWAY_URL}/api/v1/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model,
      messages,
      stream: false,
      temperature: config.temperature || 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`Gateway error: ${response.status}`);
  }

  const data = await response.json();
  yield data.content;
}

export async function chat(messages: Array<{role: string; content: string}>, config: SessionConfig): Promise<{content: string; model: string; provider: string}> {
  const response = await fetch(`${GATEWAY_URL}/api/v1/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model,
      messages,
      stream: false,
      temperature: config.temperature || 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`Gateway error: ${response.status}`);
  }

  return response.json();
}
