# PING gateway diagnostic log: 2026-09-11 (evening MDT)

All times MDT (America/Denver). Credentials, proxy passwords, and Authorization
headers are intentionally absent from this log.

## Target
- Host: pig, Tailscale 100.79.154.43, gateway port 8080 (plain HTTP)
- Route: POST http://100.79.154.43:8080/capabilities

## Timeline

### 20:25 (previously, from parent context)
- /health reachable; POST /capabilities with empty body returned HTTP 400.
  Route proven alive at that time.
- Afterwards: proxy auth errors, then connection failures. Path dead.

### 21:00 - systematic retry begins (this session)
- Proxy env: configured. Proxy auth currently accepted (no 407 observed this session).
- Local DNS: `pig` resolves to 198.18.128.109 (stale/wrong; not the tailnet address).
  Numeric 100.79.154.43 must be used.
- Direct TCP (proxy bypassed) to 100.79.154.43:8080: "Operation not permitted"
  (egress firewall; tailnet only via proxy).
- Via default proxy port 3128: empty POST timed out (20s, 0 bytes), then
  "Empty reply from server". Verbose: proxy TCP OK, request forwarded, proxy
  closed with no response. No proxy auth rejection.
- Proxy to public internet (example.com): HTTP 200 in 1.9s. Proxy itself healthy.
- CONNECT 100.79.154.43:8080 via 3128: proxy returned 200 then performed local
  TLS MITM (issuer "Hatch Sandbox Egress CA", cert CN=100.79.154.43); POST inside
  tunnel got empty reply. Upstream leg delivered zero bytes.
- Raw CONNECT probes (Python, no TLS) to other tailnet peers
  100.111.42.94:443 and 100.70.58.42:443: CONNECT 200, then 15s upstream data
  timeout, 0 bytes. Conclusion at that point: tailnet data plane down behind
  egress (Case A), proxy control plane fine.
- Port 3130 also open on the egress proxy host; same empty-reply behavior at
  that time.

### 21:05 - path recovered (no config change made on this side)
- Empty POST /capabilities via proxy port 3130: HTTP 401
  {"status":"denied","reason":"Missing authentication","code":"MISSING_AUTH"},
  0.2s. Repeated 3x, stable.
- Proxy port 3128 to the same destination: instant failure (HTTP 000, 0.0s).
  Working tailnet path is port 3130, matching the earlier known-good route.
  Port 3128 is generic internet egress with no tailnet route.

### 21:06 - 21:08 - authentication tests (transport confirmed alive)
- Auth carrier discovery:
  - No Authorization header -> 401 MISSING_AUTH
  - X-API-Key header -> 401 MISSING_AUTH (not a recognized carrier)
  - api_key/key/credential JSON body fields -> 401 MISSING_AUTH
  - `Authorization: Bearer <key>` -> 401 INVALID_CREDENTIAL (carrier recognized)
  - `Authorization: ApiKey <key>` -> 401 INVALID_CREDENTIAL (carrier recognized)
  - `Authorization: <key>` (bare) -> 401 INVALID_CREDENTIAL (carrier recognized)
- Level 1 credential: rejected, INVALID_CREDENTIAL (tested Bearer, ApiKey, bare).
- Level 2 credential: rejected, INVALID_CREDENTIAL (tested Bearer, ApiKey).
- Every auth attempt: 0.1-0.2s, gateway responsive, route /capabilities reachable.

## Classification
PING_AUTH. Transport is fully restored (consistent sub-second HTTP responses).
The gateway enforces authentication on /capabilities and recognizes the
Authorization header carriers, but rejects both supplied Level 1 and Level 2
credentials as invalid or expired.

## Remaining blocker
Both PING credentials are rejected by the gateway. Nothing further is reachable
from the cloud side: DISCOVER/WORKSPACE/READ/WRITE all require accepted auth.
The fix must happen on the desktop gateway (pig): verify the credential store,
re-issue or re-activate the Level 1 and Level 2 keys, then retry.

## Notes
- Do not use port 3128 for tailnet; use port 3130 (current working route).
- Do not use the local DNS name `pig` (resolves to a wrong local address);
  use the numeric Tailscale address 100.79.154.43.
- The gateway now requires auth on /capabilities (earlier it returned 400 for
  empty unauthenticated POSTs); behavior changed or deployment was restarted.
