# Tailscale Serve primitive test — 2026-09-28 ~06:50 MDT

## Order
Nolan: test TAILSCALE SERVE before inventing Windows port-forward machinery.
Desired: WSL FYD :3100 -> owned local target -> Tailscale Serve -> tailnet.

## Test 1: minimal WSL->Windows local bridge
- Windows http://127.0.0.1:3100/ -> -1 (no bridge; WSL localhost forwarding not
  enabled Windows->WSL here; consistent with 2026-09-24 finding).
- Windows http://172.21.65.209:3100/ -> 200 (direct WSL IP works).
- Conclusion: Serve CAN reach the WSL-bound target directly via the WSL IP.
  No new bridge machinery needed. Only wrinkle: WSL IP drift across reboots
  (already handled for portproxy by the \FYD-Tailscale-3100 logon task).

## Test 2: enable Serve on the node
- `tailscale serve --bg http://172.21.65.209:3100` ->
  "Serve is not enabled on your tailnet. To enable, visit:
   https://login.tailscale.com/f/serve?node=neMoNzS3L221CNTRL"
- `tailscale serve status` -> "No serve config" (no partial state left behind).

## Verdict: BLOCKED on tailnet admin enablement
Serve exists on the node but the tailnet has not granted the Serve capability.
Enabling is a tailnet-admin consent action at the link above; not something to
do unilaterally. Stopped here per capture-before-mutate and least-authority.

## Standing path (unchanged, still blessed)
Windows portproxy 100.79.154.43:3100 -> 172.21.65.209:3100, rule re-resolved at
every logon by C:\ProgramData\FYD\forward-3100.ps1. Verified working 06:52 MDT:
- http://100.79.154.43:3100/sites/happy-place -> 200
- http://100.79.154.43:3100/sites/coppersmith -> 307 -> /sites/coppersmith-plumbing -> 200
- Ask FYD tailnet -> 200 ok:true
- Served identity unchanged: next-server pid 23046, started 06:06:07 MDT,
  BUILD_ID DqZQX-gQgkpciv6rpLgG3, demo-owner flag live.

## If Nolan enables Serve later
Then: `tailscale serve --bg http://<current-wsl-ip>:3100`, extend
forward-3100.ps1 to re-resolve the WSL IP and refresh the serve target at logon
(same drift handling, one place), verify https://<pig-magicdns>/ serves both
sites with tailnet ACLs, no funnel. Keep portproxy until the Serve path is
proven, then retire it deliberately.
