'use client';

import { useState, useEffect } from 'react';
import { fetchJson } from '@/lib/gateway';

interface Mission {
  mission_id: string;
  mission_type: string;
  status: string;
  priority: number;
  payload?: Record<string, unknown>;
  assigned_to?: string | null;
  created_by?: string | null;
  created_at?: string;
  started_at?: string | null;
  completed_at?: string | null;
  error?: string | null;
}

interface MissionsResponse {
  status: string;
  missions: Mission[];
  count: number;
}

const statusBadge = (s: string) => {
  switch (s) {
    case 'pending': return 'bg-blue-600 text-blue-100';
    case 'created': return 'bg-blue-900 text-blue-200';
    case 'assigned': return 'bg-indigo-700 text-indigo-100';
    case 'running': return 'bg-amber-700 text-amber-100';
    case 'completed': return 'bg-green-700 text-green-100';
    case 'failed': return 'bg-red-700 text-red-100';
    case 'blocked': return 'bg-gray-600 text-gray-200';
    default: return 'bg-historical-700 text-historical-300';
  }
};

function missionTitle(m: Mission): string {
  const p = m.payload ?? {};
  const t = (p['title'] ?? p['name'] ?? p['objective']) as string | undefined;
  if (typeof t === 'string' && t.length > 0) return t;
  return m.mission_type;
}

export default function MissionCards() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [pending, active] = await Promise.all([
          fetchJson('/mc/missions/pending?limit=20') as Promise<MissionsResponse>,
          fetchJson('/mc/missions/active') as Promise<MissionsResponse>,
        ]);
        if (cancelled) return;
        const all = [...(active.missions ?? []), ...(pending.missions ?? [])];
        const seen = new Set<string>();
        const deduped = all.filter(m => {
          if (seen.has(m.mission_id)) return false;
          seen.add(m.mission_id);
          return true;
        });
        deduped.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
        setMissions(deduped);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to fetch missions');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="bg-historical-900 rounded-lg border border-historical-700 p-6 text-historical-300">Loading missions...</div>;
  if (error) return <div className="bg-historical-900 rounded-lg border border-historical-700 p-6 text-red-400">Error: {error}</div>;

  return (
    <div className="bg-historical-900 rounded-lg border border-historical-700 p-6">
      <h2 className="text-lg font-semibold text-historical-100">Missions</h2>
      <p className="text-[10px] text-historical-500 font-mono mt-1">
        source: /mc/missions/pending + /mc/missions/active via MissionRuntime (read-only; Mission Control never mutates mission state)
      </p>
      {missions.length === 0 ? (
        <p className="text-sm text-historical-500 mt-4">No active or pending missions.</p>
      ) : (
        <div className="space-y-3 mt-4">
          {missions.map((m) => (
            <div key={m.mission_id} className="bg-historical-800 border border-historical-700 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-historical-100 font-medium truncate">{missionTitle(m)}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge(m.status)}`}>{m.status}</span>
                    <span className="text-[10px] text-historical-500 font-mono">priority {m.priority ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-historical-400 mt-1 flex-wrap">
                    <span className="font-mono">{m.mission_type}</span>
                    {m.assigned_to && <span>assigned to {m.assigned_to}</span>}
                    {m.created_at && <span>created {new Date(m.created_at).toLocaleString()}</span>}
                  </div>
                  <p className="text-[10px] text-historical-600 font-mono mt-1 truncate">{m.mission_id}</p>
                  {m.error && (
                    <p className="text-xs text-red-400 mt-1 truncate">error: {m.error}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
