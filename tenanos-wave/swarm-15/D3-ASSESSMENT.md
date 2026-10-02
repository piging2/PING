# D3 Assessment: demo owner mode is not an authorization boundary

Status: assessment only. No diff proposed in this wave (per mission: no auth redesign).

## Live findings (read-only, Pig website repo /home/nolan/projects/ping, 2026-09-24)

File: `src/fyd/owner-mode/gate.ts`

1. The module explicitly documents that demo owner mode is NOT authentication. It is a
   demo/development convenience, not an access control mechanism.
2. Enablement is solely the environment variable `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE === "1"`.
   Nothing else gates it.
3. `isPrivateHost()` parses a host string supplied by its callers.
4. The mutation routes use the request `Host` header as the private-network gate.
5. Only `.env.example` exists in the worktree; neither it nor `vercel.json` sets the
   demo-owner variable. The flag is currently OFF in every configuration observed.

## Why this is dormant, not dead

- A production build or a self-hosted public bind that sets `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1`
  (copy-paste from a dev `.env`, a tutorial, a "make the demo work" fix) silently turns a
  client-side flag into full owner-mode access for anyone on the internet.
- The `Host` header is client-controlled. Using it as the private-network gate means the
  "private network" check is only as trustworthy as the attacker's honesty. Proxies and
  misconfigured binds can also present unexpected Host values.
- `NEXT_PUBLIC_` variables are baked into client bundles; the flag is visible to anyone
  reading the JS. It was never a secret, but that also means its presence in a production
  bundle is trivially observable.

## Recommended guard (future proposal, not this wave)

1. Build/deploy assertion: fail the build (or refuse to start) when demo-owner mode is
   enabled AND the deployment target is explicitly public/production (e.g. Vercel production
   env, or a public bind address). Development and loopback stays allowed.
2. Server-side runtime kill switch: the server must independently refuse owner-mode
   mutations when it believes it is serving a public deployment, regardless of what the
   client flag says.
3. Keep the existing private-host check only as defense in depth, never as the authority.
   Real production authentication/authorization design is out of scope for this wave.

## Verdict

D3 is correctly assessed as dormant-but-misconfiguration-sensitive. No code change proposed
here; the guard above should be a separate, explicitly scoped proposal so it gets proper
review rather than riding along with the D1/D2 P0 fixes.
