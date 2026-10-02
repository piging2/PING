import { useState, useEffect, useCallback } from 'react'

// UI browser-binding fix 2026-09-19: relative path only. The browser
// cannot resolve the Docker-internal gateway hostname, so the probe goes
// to /gateway/health and the Next rewrite proxies it to the gateway
// server-side. All callers of this hook run in the browser.
const GATEWAY_URL = '/gateway'

export type GatewayHealthStatus = 'healthy' | 'unhealthy' | 'unknown'

export interface GatewayHealth {
  status: GatewayHealthStatus
  latencyMs: number | null
  lastChecked: string | null
  error: string | null
}

// Polls the convergence gateway /health, the only public unauthenticated
// status surface (contract-asserted public; /system, /api/v1/* require
// exterior auth and are unreachable from the browser).
// Honest by construction:
// - status starts 'unknown' and is never 'healthy' without a probe.
// - latencyMs is a real measured /health round-trip, never synthesized.
// - the gateway may answer 503 while still reporting its own status; a
//   parsed unhealthy body counts as proof of 'unhealthy', not 'unknown'.
// - a probe that cannot reach the gateway at all is 'unknown', never stale.
export function useGatewayHealth(pollMs = 30000): GatewayHealth {
  const [health, setHealth] = useState<GatewayHealth>({
    status: 'unknown',
    latencyMs: null,
    lastChecked: null,
    error: null,
  })

  const probe = useCallback(async () => {
    const started = performance.now()
    const finish = (status: GatewayHealthStatus, latencyMs: number | null, error: string | null) =>
      setHealth({ status, latencyMs, lastChecked: new Date().toISOString(), error })
    try {
      const response = await fetch(`${GATEWAY_URL}/health`, { signal: AbortSignal.timeout(5000) })
      const latencyMs = Math.round(performance.now() - started)
      let body: any = null
      try {
        body = await response.json()
      } catch {
        body = null
      }
      if (body && (body.status === 'healthy' || body.status === 'unhealthy')) {
        finish(body.status, latencyMs, null)
        return
      }
      if (!response.ok) {
        finish('unknown', latencyMs, `gateway /health returned HTTP ${response.status} with no parsable status`)
        return
      }
      finish('unknown', latencyMs, 'gateway /health returned no status field')
    } catch (e) {
      finish('unknown', null, e instanceof Error ? e.message : 'probe failed')
    }
  }, [])

  useEffect(() => {
    probe()
    const interval = setInterval(probe, pollMs)
    return () => clearInterval(interval)
  }, [probe, pollMs])

  return health
}
