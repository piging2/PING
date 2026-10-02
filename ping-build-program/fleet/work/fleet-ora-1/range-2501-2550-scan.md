# Secret-leakage canary scan (fleet-ora-1, 2026-09-24T03:28:14Z)

Method: read-only 'docker logs --tail 2000' on ping-core-01 for the three deployed containers,
pattern scan for secret-shaped material (password-assign, api-key, bearer/token, PEM private key,
generic secret/credential assignments). Values redacted server-side before display.

Results:
  ping-postgres: 54 lines, 0 hits
  ping-qdrant:  317 lines, 0 hits
  ping-gateway: 2000 lines, 0 hits

Conclusion: zero secret-shaped emissions in live logs of postgres, qdrant, gateway.
Limitation: scan covered recent log tails only (gateway tail capped at 2000 lines; postgres had 54 total).
Non-deployed services have no logs/errors/dumps; scan not applicable.
