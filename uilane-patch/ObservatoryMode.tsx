'use client'

import { Activity, Clock, Database, Zap, TrendingUp, Network } from 'lucide-react'
import { useGatewayHealth } from '@/lib/useGatewayHealth'

// UI truth fix 2026-09-19: hardcoded "Healthy", "99.9% uptime", "Connected",
// "qwen3-coder loaded", "Optimal", the "Live" badge, and the invented
// P50/P95/P99 and throughput numbers were fabricated (zero fetches).
// - Gateway health is bound to the live /health probe.
// - Ollama and model names have no public probe: honest 'unknown'.
// - Latency/throughput panels have no backend source: honest 'unknown'.
// The stream-activity bars are decorative visual noise only (no numbers).

export default function ObservatoryMode() {
  const gateway = useGatewayHealth(30000)

  const gatewayLabel = gateway.status === 'healthy' ? 'Healthy' : gateway.status === 'unhealthy' ? 'Unhealthy' : 'Unknown'
  const gatewayColor = gateway.status === 'healthy' ? 'text-learning-400' : gateway.status === 'unhealthy' ? 'text-production-400' : 'text-historical-500'

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-historical-100">Observatory Mode</h2>
        <div className="flex items-center gap-2 text-historical-500">
          <span className="text-sm">
            {gateway.lastChecked ? `Probed ${new Date(gateway.lastChecked).toLocaleTimeString()}` : 'Probing gateway…'}
          </span>
        </div>
      </div>

      {/* Runtime Health Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-historical-800 rounded-lg p-4 border border-historical-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-historical-400 text-sm">Gateway Health</span>
            <Activity className="w-4 h-4 text-learning-400" />
          </div>
          <div className={`text-2xl font-bold ${gatewayColor}`}>{gatewayLabel}</div>
          <div className="text-xs text-historical-500 mt-1">
            {gateway.latencyMs !== null ? `${gateway.latencyMs}ms measured` : 'no successful probe yet'}
          </div>
        </div>

        <div className="bg-historical-800 rounded-lg p-4 border border-historical-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-historical-400 text-sm">Ollama Status</span>
            <Database className="w-4 h-4 text-historical-500" />
          </div>
          <div className="text-2xl font-bold text-historical-500">Unknown</div>
          <div className="text-xs text-historical-500 mt-1">no public probe on this gateway</div>
        </div>

        <div className="bg-historical-800 rounded-lg p-4 border border-historical-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-historical-400 text-sm">Probe Latency</span>
            <Network className="w-4 h-4 text-learning-400" />
          </div>
          <div className="text-2xl font-bold text-historical-100">
            {gateway.latencyMs !== null ? `${gateway.latencyMs}ms` : 'N/A'}
          </div>
          <div className="text-xs text-historical-500 mt-1">measured /health round-trip</div>
        </div>
      </div>

      {/* Latency & Throughput: no backend source for these metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-historical-800 rounded-lg p-4 border border-historical-700">
          <div className="flex items-center justify-between mb-4">
            <span className="text-historical-400 text-sm">Latency Distribution</span>
            <Clock className="w-4 h-4 text-observability-400" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-historical-300 text-sm">P50</span>
              <span className="text-historical-500 font-mono">unknown</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-historical-300 text-sm">P95</span>
              <span className="text-historical-500 font-mono">unknown</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-historical-300 text-sm">P99</span>
              <span className="text-historical-500 font-mono">unknown</span>
            </div>
          </div>
        </div>

        <div className="bg-historical-800 rounded-lg p-4 border border-historical-700">
          <div className="flex items-center justify-between mb-4">
            <span className="text-historical-400 text-sm">Throughput</span>
            <TrendingUp className="w-4 h-4 text-observability-400" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-historical-300 text-sm">Requests/min</span>
              <span className="text-historical-500 font-mono">unknown</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-historical-300 text-sm">Tokens/sec</span>
              <span className="text-historical-500 font-mono">unknown</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-historical-300 text-sm">Avg Response</span>
              <span className="text-historical-500 font-mono">unknown</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stream Activity: decorative only, no numeric claims */}
      <div className="bg-historical-800 rounded-lg p-4 border border-historical-700">
        <div className="flex items-center justify-between mb-4">
          <span className="text-historical-400 text-sm">Stream Activity</span>
          <Zap className="w-4 h-4 text-constitutional-400" />
        </div>
        <div className="h-32 flex items-end gap-1">
          {[...Array(40)].map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-observability-500 rounded-t"
              style={{
                height: `${Math.random() * 80 + 20}%`,
                opacity: Math.random() * 0.5 + 0.5
              }}
            />
          ))}
        </div>
        <div className="text-xs text-historical-600 mt-2">illustrative only, not measured</div>
      </div>
    </div>
  )
}
