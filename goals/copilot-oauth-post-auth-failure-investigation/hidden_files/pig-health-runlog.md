
## 2026-09-27 15:21 MDT (pig-route-watch)
- Script: pig-health-check.py
- Layer 1 (proxy TCP hatch-egress-proxy:3130): TCP_OK
- Layer 2 (Tailscale CONNECT tunnel): FAILED — unexpected proxy response: (empty)
- Final: TAILSCALE_UNREACHABLE
- Interpretation: Pig access infrastructure issue at the CONNECT-tunnel layer, same signature as the 2026-09-27 tailnet wedge incident (proxy TCP OK, empty proxy response, SSH never reached). NOT a Pig outage claim; SSH layer untested.
