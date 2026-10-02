/** @type {import('next').NextConfig} */

// UI browser-binding fix 2026-09-19: a real browser cannot resolve the
// Docker-internal gateway hostname (compose sets
// NEXT_PUBLIC_GATEWAY_URL=http://gateway:8080), so every browser-side
// gateway fetch goes through a relative /gateway/* URL. This rewrite
// proxies those to the gateway on the server side, where the compose
// network DNS name does resolve. The gateway URL is read here at server
// startup only and never leaks a Docker-internal hostname into client
// bundles; client code must not reference NEXT_PUBLIC_GATEWAY_URL.
const serverGatewayUrl =
  process.env.GATEWAY_URL ||
  process.env.NEXT_PUBLIC_GATEWAY_URL ||
  'http://localhost:8080'

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/gateway/:path*',
        destination: `${serverGatewayUrl}/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
