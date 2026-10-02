import { NextResponse } from 'next/server'

// This route must never be statically prerendered: it probes the gateway
// live on every request.
export const dynamic = 'force-dynamic'

// UI truth fix 2026-09-19: this route returned {status:'healthy'} with zero
// probes. It now probes the convergence gateway /health server-side (short
// timeout) and reports honestly: healthy only on a proven healthy gateway,
// degraded when the gateway reports unhealthy, unknown when unreachable.

export async function GET() {
  const gatewayUrl =
    process.env.GATEWAY_URL ||
    process.env.NEXT_PUBLIC_GATEWAY_URL ||
    'http://localhost:8080'

  try {
    const response = await fetch(`${gatewayUrl}/health`, {
      signal: AbortSignal.timeout(3000),
      cache: 'no-store',
    })
    if (!response.ok) {
      return NextResponse.json({
        status: 'unknown',
        note: `gateway /health returned HTTP ${response.status}`,
      })
    }
    const data = await response.json()
    const gatewayHealthy = data.status === 'healthy'
    return NextResponse.json({
      status: gatewayHealthy ? 'healthy' : 'degraded',
      gateway: data.status,
      note: 'probed gateway /health',
    })
  } catch (e) {
    return NextResponse.json({
      status: 'unknown',
      note: 'gateway unreachable',
    })
  }
}
