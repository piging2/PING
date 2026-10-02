'use client'

import { useEffect, useState } from 'react'
import { fetchJson } from '@/lib/gateway'

interface SystemState {
  version?: string
  generated_at?: string
  containers?: { status?: string; containers?: Array<{ name?: string; state?: string; status?: string }> }
  git?: { status?: string; branch?: string; pending_changes?: number; recent_commits?: Array<{ hash?: string; message?: string; date?: string }> }
  repository?: { status?: string; intents?: number; authorities?: number; capabilities?: number; specifications?: number; total_nodes?: number; total_edges?: number; duplicate_warnings?: number }
  knowledge?: { status?: string; knowledge_objects?: number; reflections?: number; skills?: number; policies?: number; evidence?: number; proofs?: number; witnesses?: number; replay_certificates?: number; historical_snapshots?: number }
  missions?: { status?: string; queued?: number; executing?: number; completed?: number; failed?: number; blocked?: number; total?: number }
  replay?: { status?: string; total_runs?: number; success_rate?: number; failures?: number; latest_replay?: string | null; witness_coverage?: number }
  postgres?: { status?: string; total_events?: number; streams?: number; event_types?: number; oldest_event?: string | number | null; newest_event?: string | number | null }
  qdrant?: { status?: string; collections?: number; total_points?: number; total_vectors?: number }
  metrics?: { uptime_seconds?: number; total_requests?: number; total_errors?: number }
}

interface McDashboard {
  status?: string
  dashboard?: {
    business?: Record<string, number>
    missions?: Record<string, number | string>
    eventSummary?: { total?: number; count?: number; truncated?: boolean; byType?: Record<string, number>; window_size_ms?: number; cap?: number }
    uptime?: number
    timestamp?: string
  }
}

interface McReplayStats {
  status?: string
  stats?: { total_replays?: number; verified?: number; unverified?: number; by_reason?: Record<string, number>; witness_rejected?: number }
  provider?: { engine_version?: string; replays_processed?: number; events_replayed?: number; failures?: number }
  note?: string
}

interface McWitnessStats {
  status?: string
  stats?: { attestations?: number; refusals?: number; total?: number }
  note?: string
}

interface McMissionStats {
  status?: string
  stats?: Record<string, number | string>
}

function fmt(n: number | string | undefined | null): string {
  if (n === undefined || n === null) return 'unknown'
  if (typeof n === 'number') return n.toLocaleString()
  return String(n)
}

function SourceLabel({ text }: { text: string }) {
  return (
    <span className="block text-[10px] text-historical-500 font-mono mt-1">source: {text}</span>
  )
}

function Panel({ title, source, children }: { title: string; source: string; children: React.ReactNode }) {
  return (
    <div className="bg-historical-900 rounded-lg border border-historical-700 p-5">
      <h3 className="text-sm font-semibold text-historical-200 uppercase tracking-wider">{title}</h3>
      <SourceLabel text={source} />
      <div className="mt-3">{children}</div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-historical-800/40 rounded-lg p-3">
      <div className="text-xl font-bold text-historical-100 font-mono">{value}</div>
      <div className="text-xs text-historical-500 mt-0.5">{label}</div>
    </div>
  )
}

export default function CockpitDashboard() {
  const [system, setSystem] = useState<SystemState | null>(null)
  const [dashboard, setDashboard] = useState<McDashboard | null>(null)
  const [replay, setReplay] = useState<McReplayStats | null>(null)
  const [witness, setWitness] = useState<McWitnessStats | null>(null)
  const [missionStats, setMissionStats] = useState<McMissionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const errs: string[] = []
      const get = async <T,>(path: string): Promise<T | null> => {
        try {
          return await fetchJson(path)
        } catch (e) {
          errs.push(`${path}: ${e instanceof Error ? e.message : 'fetch failed'}`)
          return null
        }
      }
      const [s, d, r, w, m] = await Promise.all([
        get<SystemState>('/system/state'),
        get<McDashboard>('/mc/dashboard'),
        get<McReplayStats>('/mc/replay/stats'),
        get<McWitnessStats>('/mc/witness/stats'),
        get<McMissionStats>('/mc/missions/stats'),
      ])
      if (cancelled) return
      setSystem(s)
      setDashboard(d)
      setReplay(r)
      setWitness(w)
      setMissionStats(m)
      setErrors(errs)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="bg-historical-900 rounded-lg border border-historical-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 bg-historical-800 rounded" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-20 bg-historical-800 rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const pgEvents = system?.postgres?.total_events
  const replayTotal = replay?.stats?.total_replays
  const witnessAtt = witness?.stats?.attestations
  const dashEvents = dashboard?.dashboard?.eventSummary?.total
  const definedCounts = [pgEvents, replayTotal, witnessAtt, dashEvents].filter((v): v is number => typeof v === 'number')
  const discrepancy = definedCounts.length > 1 && new Set(definedCounts).size > 1

  const uptime = system?.metrics?.uptime_seconds
  const uptimeStr = typeof uptime === 'number'
    ? `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`
    : 'unknown'

  return (
    <div className="space-y-4">
      <div className="bg-historical-900 rounded-lg border border-historical-700 p-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-semibold text-historical-100">System Cockpit</h2>
            <p className="text-xs text-historical-500 font-mono mt-1">
              gateway {system?.version ?? 'unknown'} · state generated {system?.generated_at ?? 'unknown'}
            </p>
          </div>
          <div className="text-xs text-historical-500 font-mono">uptime {uptimeStr}</div>
        </div>
        <SourceLabel text="/system/state via SystemAuthority (projection, not authority)" />
      </div>

      {errors.length > 0 && (
        <div className="bg-production-900/30 rounded-lg border border-production-700/50 p-4">
          <p className="text-sm text-production-300 font-medium mb-1">Some sources failed to load</p>
          <ul className="text-xs text-production-400/80 font-mono space-y-0.5">
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      <Panel title="Event counts by source" source="multiple /mc and /system routes, each with its own scope">
        {discrepancy && (
          <div className="mb-3 px-3 py-2 rounded bg-amber-900/30 border border-amber-700/50 text-xs text-amber-300">
            These endpoints consult different runtime bindings and scopes, so their counts disagree.
            That disagreement is shown here, not resolved. Do not treat any single number as the canonical event count.
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="postgres.total_events (/system/state)" value={fmt(pgEvents)} />
          <Stat label="total_replays (/mc/replay/stats)" value={fmt(replayTotal)} />
          <Stat label="attestations (/mc/witness/stats)" value={fmt(witnessAtt)} />
          <Stat label="eventSummary.total, 24h window (/mc/dashboard)" value={fmt(dashEvents)} />
        </div>
        <p className="text-[11px] text-historical-500 mt-3">
          /system/state postgres reflects the SystemAuthority event-read binding. /mc/replay/stats counts
          REPLAY_COMPLETED via UnifiedEventRuntime. /mc/witness/stats counts WITNESS_CREATED via
          UnifiedEventRuntime. /mc/dashboard counts events in the last 24h (cap 500). A backend binding
          follow-up is open to reconcile these scopes.
        </p>
      </Panel>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel title="Replay" source="/mc/replay/stats via UnifiedEventRuntime (REPLAY_COMPLETED)">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="verified" value={fmt(replay?.stats?.verified)} />
            <Stat label="unverified" value={fmt(replay?.stats?.unverified)} />
            <Stat label="witness rejected" value={fmt(replay?.stats?.witness_rejected)} />
          </div>
          {replay?.note && <p className="text-[11px] text-historical-500 mt-2">{replay.note}</p>}
        </Panel>

        <Panel title="Witness" source="/mc/witness/stats via UnifiedEventRuntime (WITNESS_CREATED / WITNESS_REJECTED)">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="attestations" value={fmt(witness?.stats?.attestations)} />
            <Stat label="refusals" value={fmt(witness?.stats?.refusals)} />
            <Stat label="total" value={fmt(witness?.stats?.total)} />
          </div>
          {witness?.note && <p className="text-[11px] text-historical-500 mt-2">{witness.note}</p>}
        </Panel>
      </div>

      <Panel title="Missions" source="/mc/missions/stats via MissionRuntime (ping_missions, scope: persistent)">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {missionStats?.stats
            ? Object.entries(missionStats.stats).map(([k, v]) => (
                <Stat key={k} label={k} value={fmt(v)} />
              ))
            : <p className="text-sm text-historical-500">Mission stats unavailable</p>}
        </div>
      </Panel>

      {dashboard?.dashboard?.business && (
        <Panel title="Business activity, last 24h" source="/mc/dashboard (derived from events, not hardcoded)">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {Object.entries(dashboard.dashboard.business).map(([k, v]) => (
              <Stat key={k} label={k.replace(/([A-Z])/g, ' $1').toLowerCase()} value={fmt(v)} />
            ))}
          </div>
        </Panel>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Panel title="Containers" source="/system/state containers">
          <div className="space-y-1.5">
            {(system?.containers?.containers ?? []).length === 0 && (
              <p className="text-sm text-historical-500">No container data reported</p>
            )}
            {(system?.containers?.containers ?? []).slice(0, 8).map((c, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-historical-300 font-mono truncate">{c.name ?? `container ${i}`}</span>
                <span className="text-historical-500">{c.state ?? c.status ?? 'unknown'}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Git" source="/system/state git">
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between"><span className="text-historical-500">branch</span><span className="text-historical-200 font-mono">{system?.git?.branch ?? 'unknown'}</span></div>
            <div className="flex justify-between"><span className="text-historical-500">pending changes</span><span className="text-historical-200 font-mono">{fmt(system?.git?.pending_changes)}</span></div>
            {(system?.git?.recent_commits ?? []).slice(0, 4).map((c, i) => (
              <div key={i} className="text-historical-400 font-mono truncate">
                {(c.hash ?? '').slice(0, 8)} {(c.message ?? '').slice(0, 48)}
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Stores" source="/system/state postgres + qdrant">
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between"><span className="text-historical-500">postgres</span><span className="text-historical-200">{system?.postgres?.status ?? 'unknown'}</span></div>
            <div className="flex justify-between"><span className="text-historical-500">event types</span><span className="text-historical-200 font-mono">{fmt(system?.postgres?.event_types)}</span></div>
            <div className="flex justify-between"><span className="text-historical-500">qdrant</span><span className="text-historical-200">{system?.qdrant?.status ?? 'unknown'}</span></div>
            <div className="flex justify-between"><span className="text-historical-500">qdrant points</span><span className="text-historical-200 font-mono">{fmt(system?.qdrant?.total_points)}</span></div>
          </div>
        </Panel>
      </div>
    </div>
  )
}
