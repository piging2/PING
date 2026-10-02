'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Activity, Database, Box, Layers, Clock, TrendingUp, Cpu, Zap,
  GitBranch, Target, RefreshCw, AlertTriangle
} from 'lucide-react'

const POLL_INTERVAL = 30000
// UI browser-binding fix 2026-09-19: relative path only. The browser
// cannot resolve the Docker-internal gateway hostname; /gateway/* is
// proxied to the gateway by the Next rewrite.
const GATEWAY_URL = '/gateway'

// UI truth fix 2026-09-19: the previous version assumed a `services` /
// `lifecycle` / `objects` / `graph` shape that exists on NO backend (it threw
// on the convergence gateway and read fabricated negatives from the dev stub).
// This version binds to the real convergence /system/state shape
// (postgres, qdrant, missions, replay, knowledge, git, repository, metrics)
// and renders honest UNKNOWN wherever the backend has no such endpoint.
// Note: /system/state requires exterior auth on the convergence gateway, so a
// browser without a key gets an explicit "authentication required" state,
// never fabricated numbers.

interface SystemState {
  timestamp?: string
  version?: string
  generated_at?: string
  postgres: { status: string; total_events: number; streams?: number; event_types?: number }
  qdrant: { status: string; collections: number; total_points: number; total_vectors?: number }
  missions: {
    status: string
    queued: number | null
    executing: number | null
    completed: number | null
    failed: number | null
    blocked: number | null
    total: number
    reflections: number
  }
  replay: { status: string; total_runs: number; latest_replay: string | number | null }
  knowledge: {
    status: string
    knowledge_objects: number
    reflections: number
    evidence: number
    skills: number | null
    policies: number | null
    proofs: number | null
    witnesses: number | null
    replay_certificates: number | null
    historical_snapshots: number | null
  }
  git: { status: string; branch: string; pending_changes: number; recent_commits: any[] }
  repository: {
    status: string
    intents: number
    authorities: number
    capabilities: number
    specifications: number
    total_nodes: number
    total_edges: number
    duplicate_warnings: number
  }
  metrics: { uptime_seconds: number; total_requests: number }
}

function Panel({ title, icon, children, className = '' }: { title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-historical-900 rounded-lg border border-historical-700 overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-historical-700 bg-historical-800/50">
        <span className="text-constitutional-400">{icon}</span>
        <h3 className="text-sm font-semibold text-historical-200 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  )
}

function StatusDot({ status }: { status: string }) {
  const color = status === 'available' || status === 'healthy' || status === 'reachable'
    ? 'bg-learning-400'
    : status === 'unavailable' || status === 'unhealthy'
    ? 'bg-production-400'
    : 'bg-historical-500'
  return <span className={`inline-block w-2 h-2 rounded-full ${color} ${status === 'healthy' || status === 'available' ? 'animate-pulse' : ''}`} />
}

function StatRow({ label, value, unit = '', status }: { label: string; value: string | number; unit?: string; status?: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-historical-400">{label}</span>
      <span className="text-sm font-mono text-historical-100">
        {status && <StatusDot status={status} />}
        {' '}{value}{unit && <span className="text-historical-500 text-xs ml-0.5">{unit}</span>}
      </span>
    </div>
  )
}

function UnknownPanel({ title, icon, reason }: { title: string; icon: React.ReactNode; reason: string }) {
  return (
    <Panel title={title} icon={icon}>
      <div className="flex items-center gap-2 py-1">
        <StatusDot status="unknown" />
        <span className="text-sm text-historical-500">Unknown</span>
      </div>
      <p className="text-xs text-historical-600 mt-1">{reason}</p>
    </Panel>
  )
}

function fmt(value: number | null | undefined): string | number {
  return value === null || value === undefined ? 'N/A' : value
}

function statusLabel(status: string): 'available' | 'unavailable' | 'unknown' {
  return status === 'available' ? 'available' : status === 'unavailable' ? 'unavailable' : 'unknown'
}

export default function CockpitDashboard() {
  const [state, setState] = useState<SystemState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string>('')

  const fetchState = useCallback(async () => {
    try {
      const response = await fetch(`${GATEWAY_URL}/system/state`)
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Gateway requires credentials (HTTP 401). System state is unavailable without an exterior auth key.')
        }
        throw new Error(`Gateway returned HTTP ${response.status}. System state unavailable.`)
      }
      const data = await response.json()
      setState(data)
      setLastUpdate(new Date().toLocaleTimeString())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch system state')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchState()
    const interval = setInterval(fetchState, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchState])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-historical-400">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading system state...</span>
        </div>
      </div>
    )
  }

  if (error && !state) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-production-400 mx-auto mb-2" />
          <p className="text-historical-300 text-sm">System state unavailable</p>
          <p className="text-historical-500 text-xs mt-1">{error}</p>
          <button onClick={fetchState} className="mt-4 px-4 py-2 bg-runtime-600 text-white text-sm rounded-lg hover:bg-runtime-700">
            Retry
          </button>
        </div>
      </div>
    )
  }

  const s = state!

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-historical-100">Constitutional Operations Cockpit</h1>
          <p className="text-xs text-historical-500 mt-1">
            Gateway · {lastUpdate ? `Last updated ${lastUpdate}` : ''}
          </p>
        </div>
        <button
          onClick={fetchState}
          className="flex items-center gap-2 px-3 py-1.5 bg-historical-800 hover:bg-historical-700 text-historical-300 text-sm rounded-lg border border-historical-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Constitutional Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

        {/* 1. Object Counts (bound to real /system/state shape; knowledge count is
            unavailable when the knowledge block reports unavailable) */}
        <Panel title="Object Counts" icon={<Box className="w-4 h-4" />}>
          <StatRow
            label="Knowledge Objects"
            value={s.knowledge?.status === 'unavailable' ? 'Unknown' : fmt(s.knowledge?.knowledge_objects)}
          />
          <StatRow label="Graph Nodes" value={fmt(s.repository?.total_nodes)} />
          <StatRow label="Graph Edges" value={fmt(s.repository?.total_edges)} />
          <StatRow label="Duplicate Warnings" value={fmt(s.repository?.duplicate_warnings)} />
        </Panel>

        {/* 2. PostgreSQL Status (real postgres block) */}
        <Panel title="PostgreSQL" icon={<Database className="w-4 h-4" />}>
          <StatRow
            label="Status"
            value={s.postgres?.status === 'available' ? 'Connected' : 'Unavailable'}
            status={statusLabel(s.postgres?.status)}
          />
          <StatRow label="Total Events" value={fmt(s.postgres?.total_events)} />
          <StatRow label="Streams" value={fmt(s.postgres?.streams)} />
          <StatRow label="Event Types" value={fmt(s.postgres?.event_types)} />
        </Panel>

        {/* 3. Qdrant Status (real qdrant block) */}
        <Panel title="Qdrant" icon={<Layers className="w-4 h-4" />}>
          <StatRow
            label="Status"
            value={s.qdrant?.status === 'available' ? 'Connected' : 'Unavailable'}
            status={statusLabel(s.qdrant?.status)}
          />
          <StatRow label="Collections" value={fmt(s.qdrant?.collections)} />
          <StatRow label="Total Points" value={fmt(s.qdrant?.total_points)} />
        </Panel>

        {/* 4. Lifecycles: no lifecycle endpoint exists on any backend */}
        <UnknownPanel
          title="Lifecycles"
          icon={<Clock className="w-4 h-4" />}
          reason="No lifecycle endpoint on this gateway. Previously showed invented numbers."
        />

        {/* 5. System Health: Gateway 'Reachable' is proven by the successful fetch */}
        <Panel title="System Health" icon={<Activity className="w-4 h-4" />}>
          <StatRow label="Gateway" value="Reachable" status="reachable" />
          <StatRow
            label="PostgreSQL"
            value={s.postgres?.status === 'available' ? 'Healthy' : 'Unhealthy'}
            status={statusLabel(s.postgres?.status)}
          />
          <StatRow
            label="Qdrant"
            value={s.qdrant?.status === 'available' ? 'Healthy' : 'Unhealthy'}
            status={statusLabel(s.qdrant?.status)}
          />
          <StatRow label="Uptime" value={fmt(s.metrics?.uptime_seconds)} unit="s" />
        </Panel>

        {/* 6. Knowledge Growth: zeros from the backend mean "unavailable", so gate
            on status instead of rendering zeros as measured values. */}
        {s.knowledge?.status === 'unavailable' ? (
          <UnknownPanel
            title="Knowledge Growth"
            icon={<TrendingUp className="w-4 h-4" />}
            reason="Knowledge counts are unavailable from this gateway."
          />
        ) : (
          <Panel title="Knowledge Growth" icon={<TrendingUp className="w-4 h-4" />}>
            <StatRow label="Objects" value={fmt(s.knowledge?.knowledge_objects)} />
            <StatRow label="Reflections" value={fmt(s.knowledge?.reflections)} />
            <StatRow label="Evidence" value={fmt(s.knowledge?.evidence)} />
            <StatRow label="Growth Rate" value="N/A" />
          </Panel>
        )}

        {/* 7. Compiler Status: no compiler endpoint exists on any backend */}
        <UnknownPanel
          title="Compiler Status"
          icon={<Cpu className="w-4 h-4" />}
          reason="No compiler endpoint on this gateway. Previously hardcoded Ready/Passes 6."
        />

        {/* 8. Replay Status (real replay block) */}
        <Panel title="Replay Status" icon={<Zap className="w-4 h-4" />}>
          <StatRow
            label="Status"
            value={s.replay?.status === 'available' ? 'Available' : 'Unavailable'}
            status={statusLabel(s.replay?.status)}
          />
          <StatRow label="Total Runs" value={fmt(s.replay?.total_runs)} />
          <StatRow
            label="Latest Replay"
            value={s.replay?.latest_replay ? new Date(Number(s.replay.latest_replay)).toLocaleString() : 'Unknown'}
          />
        </Panel>

        {/* 9. Git Snapshot (real git block) */}
        <Panel title="Git Snapshot" icon={<GitBranch className="w-4 h-4" />}>
          <StatRow
            label="Status"
            value={s.git?.status === 'available' ? 'Available' : 'Unavailable'}
            status={statusLabel(s.git?.status)}
          />
          <StatRow label="Branch" value={s.git?.branch ?? 'Unknown'} />
          <StatRow label="Pending Changes" value={fmt(s.git?.pending_changes)} />
        </Panel>

        {/* 10. Mission Queue: the backend does not provide real queue counts, so
            stale fields are never rendered as measured values. */}
        <UnknownPanel
          title="Mission Queue"
          icon={<Target className="w-4 h-4" />}
          reason="Mission queue counts are unavailable from this gateway. The backend reports only a completed-mission count derived from the event log, not real queue state, so no numbers are shown."
        />

      </div>
    </div>
  )
}
