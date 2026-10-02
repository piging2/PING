'use client'

import { useState } from 'react'
import { Cpu, Network, Activity, Clock, Database, Zap } from 'lucide-react'
import { useGatewayHealth } from '@/lib/useGatewayHealth'

// UI truth fix 2026-09-19: every value here is either measured or unknown.
// - Gateway status comes from a live /health probe (never assumed healthy).
// - Latency is the measured /health round-trip (replaces Math.random()).
// - Ollama and model have no public probe on the convergence gateway, so
//   they render 'unknown' instead of fabricated green.
// - Streaming rate has no measurement source; when streaming is true the
//   label says so explicitly instead of inventing tok/s.

export default function MissionControlHeader() {
  const gateway = useGatewayHealth(30000)
  const [streaming, setStreaming] = useState(false)

  const gatewayColor =
    gateway.status === 'healthy'
      ? 'text-learning-400'
      : gateway.status === 'unhealthy'
        ? 'text-production-400'
        : 'text-historical-500'

  return (
    <div className="bg-historical-900 border-b border-historical-700 px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Model: no public model endpoint on the gateway; do not invent one. */}
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-constitutional-400" />
            <span className="text-historical-200 text-sm font-medium" title="No public model probe exists">
              unknown model
            </span>
          </div>

          {/* Gateway: bound to live /health probe */}
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-runtime-400" />
            <span className="text-historical-200 text-sm">
              Gateway <span className={`text-xs ${gatewayColor}`}>{gateway.status}</span>
            </span>
          </div>

          {/* Ollama: no public probe; honest unknown */}
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-observability-400" />
            <span className="text-historical-200 text-sm">
              Ollama <span className="text-xs text-historical-500" title="No public Ollama probe on this gateway">unknown</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Streaming: no rate measurement exists; say so instead of inventing tok/s */}
          <div className="flex items-center gap-2">
            <Zap className={`w-4 h-4 ${streaming ? 'text-constitutional-400 animate-pulse' : 'text-historical-500'}`} />
            <span className="text-historical-200 text-sm">
              {streaming ? 'streaming (rate unknown)' : 'Idle'}
            </span>
          </div>

          {/* Latency: measured /health round-trip, never synthesized */}
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-retrieval-400" />
            <span
              className="text-historical-200 text-sm"
              title={gateway.lastChecked ? `Measured /health round-trip, probed ${gateway.lastChecked}` : 'No successful probe yet'}
            >
              {gateway.latencyMs !== null ? `${gateway.latencyMs}ms` : 'N/A'}
            </span>
          </div>

          {/* Context usage: no backend source; honest absence instead of Math.random() */}
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-agents-400" />
            <span className="text-historical-200 text-sm" title="No context-usage source on this gateway">
              ctx N/A
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
