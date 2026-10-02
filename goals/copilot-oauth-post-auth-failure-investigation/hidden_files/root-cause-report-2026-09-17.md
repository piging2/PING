# Root Cause Investigation: Muse to Pig Access Outage
Date: 2026-09-17
Investigator: Muse (Pigi)

## A. What is actually failing now

**Current state (as of 15:37 MDT): WORKING.** The route recovered.

**The outage (15:22 MDT to ~15:37 MDT, ~15 minutes):**
- Layer 1 (proxy TCP to hatch-egress-proxy:3130): OK
- Layer 2 (HTTP CONNECT to 100.79.154.43:22): FAILED with empty proxy response
- Classification: TAILSCALE_UNREACHABLE
- Confirmed persistent across two checks 25 seconds apart

**Pattern:** This matches an earlier outage today (~14:22 MDT, 5-10 minutes, "Broken pipe" errors). The failures are transient, 5-15 minutes, then self-recover.

**Proxy behavior probe results (during healthy period):**
- 100.79.154.43:22 (Pig SSH): HTTP/1.1 200 Connection Established (ALLOWED)
- 100.79.154.43:80 (Pig HTTP): Empty response, connection closed (BLOCKED)
- 100.70.58.42:22 (other Tailscale node): Timeout after 10s (no route or blocked)
- 100.111.42.94:22 (offline Tailscale node): Timeout after 10s (expected)
- example.com:443 (internet HTTPS): HTTP/1.1 200 Connection Established (ALLOWED)
- example.com:80 (internet HTTP): Empty response, connection closed (BLOCKED)

**Key finding:** The proxy has an allowlist. It permits specific destination:port combinations, not general proxying. Port 443 is allowed for internet hosts; port 80 is not. For Tailscale, only the Pig's SSH port appears to be allowed.

## B. What visibility we have

From the Muse runtime side, we can observe:
1. **Proxy TCP connectivity:** Can we open a TCP socket to hatch-egress-proxy:3130? (Yes/No)
2. **HTTP CONNECT responses:** What does the proxy return for a CONNECT request? (200, empty, timeout, error)
3. **Timing:** How long does each step take? (Useful for distinguishing hang vs fast-fail)
4. **DNS resolution:** What IP does hatch-egress-proxy resolve to? (198.19.0.1, also seen as fd8b:4f84:7d32:99::1 earlier)
5. **Muse Tailscale identity:** `tailscale status` shows "Connected", our IP is 100.70.58.42, login server is controlplane.tailscale.com. Peers: pig (100.79.154.43), iphone-13 (100.111.42.94).
6. **Pig Tailscale status:** When reachable, `tailscale status` on the Pig shows the tailnet is healthy.

## C. What visibility the external proxy prevents

The proxy is a black box. We cannot determine:
1. **Proxy process state:** Is it running? Did it restart? What is its PID, uptime, or version?
2. **Tailscale daemon state (proxy side):** Is the Tailscale client behind the proxy connected? Did it lose its session? Is there a control-plane issue?
3. **Failure cause:** When CONNECT fails, we cannot distinguish between:
   - Proxy process restart (lost Tailscale state)
   - Tailscale control-plane connectivity loss
   - Tailscale route loss to the Pig
   - Proxy upstream network failure
   - ACL/authorization change
   - Expired proxy-side Tailscale credentials
   - Idle timeout on the Tailscale connection
4. **Logs:** No access to proxy logs, Tailscale logs, or system logs from the proxy host.
5. **Configuration:** We cannot see the allowlist, timeouts, or retry policies.

**Result:** When the tunnel fails, we can say "the proxy cannot reach the Pig via Tailscale" but we cannot say why. The root cause is unobservable from our side.

## D. Is the external proxy fundamentally the wrong dependency?

**Yes, for guaranteed persistent access.**

Reasons:
1. **Ephemeral infrastructure:** The proxy is part of the runtime environment, not a stable service. It can be restarted, reconfigured, or removed without notice.
2. **No observability:** As documented in section C, failures are undiagnosable. We cannot meet the "root cause" requirement while depending on a black box.
3. **No control:** We cannot restart it, change its config, or influence its lifecycle.
4. **Single point of failure:** All Muse-to-Pig traffic flows through this one proxy. When it has a transient issue, all access is lost.
5. **No SLA:** There is no uptime guarantee, no support channel, and no escalation path.
6. **Dependency inversion:** Muse needs to guarantee Pig access, but the guarantee depends on infrastructure Muse does not control. This is architecturally unsound.

**However:** The proxy is the *supported* mechanism per ~/docs/devices/tailscale.md. It is not "wrong" for casual use; it is wrong for the *guarantee* Nolan requires.

## E. Persistent control-channel options

### Constraint: Muse cannot accept inbound connections.
Per the docs: "This device joins as a client only: it makes outgoing connections and accepts none. It cannot be reached from the tailnet, hosts nothing." The container is ephemeral and has no stable inbound address.

This eliminates any architecture where the Pig initiates a direct connection to Muse. All options must be outbound-from-Muse, or use a rendezvous point.

### Option 1: Supervised persistent SSH via the proxy (autossh)
- **How:** Run `autossh` (SSH with built-in reconnect supervision) from the Muse runtime to the Pig, via the proxy. Autossh monitors the connection with keepalives and restarts SSH automatically on failure.
- **Pros:** No new infrastructure. Uses existing SSH keys and proxy. Failures become explicit (autossh logs disconnect/reconnect). Automatic recovery when proxy recovers.
- **Cons:** Still depends on the proxy. Does not eliminate the root dependency. When proxy is down, the channel is down (but autossh will reconnect automatically when it recovers).
- **Infrastructure:** Zero new services. Just a supervisor process in the Muse runtime.
- **Privilege:** Uses existing SSH key (least privilege already established).

### Option 2: Cloud WebSocket rendezvous
- **How:** Deploy a minimal WebSocket server on a stable cloud host (Fly.io, Railway, etc.). The Pig runs a lightweight agent that connects outbound to the server and maintains the connection with heartbeats. Muse connects outbound to the same server when it needs to send a command. The server relays messages between them.
- **Pros:** Eliminates proxy dependency entirely. Pig-initiated outbound works through NAT/firewall. Muse-initiated outbound works through the egress proxy (port 443). True persistent channel with explicit health state.
- **Cons:** Requires deploying and maintaining a new cloud service. Adds operational overhead. Needs authentication, TLS, and monitoring.
- **Infrastructure:** One small cloud VM/container running a WebSocket relay.
- **Privilege:** Agent uses a scoped API token, not SSH keys. Token can be rotated. Server never sees Pig credentials.

### Option 3: MQTT broker rendezvous
- **How:** Use a hosted MQTT broker (HiveMQ Cloud free tier, etc.). Pig publishes heartbeat/status to a topic and subscribes to a command topic. Muse publishes commands and subscribes to responses.
- **Pros:** Standard IoT pattern. Built-in persistence, QoS, last-will. No custom server to maintain if using hosted broker.
- **Cons:** Still depends on a third-party service. MQTT is pub/sub, not request/response; needs a protocol layer on top. Less direct than WebSocket.
- **Infrastructure:** Hosted broker account (or self-hosted Mosquitto).
- **Privilege:** MQTT username/password or TLS certs, scoped to specific topics.

### Option 4: Tailscale Serve/Funnel on the Pig
- **How:** The Pig uses `tailscale serve` or `tailscale funnel` to expose a local control API via a Tailscale-provided URL. Muse reaches it via the internet (not via the proxy).
- **Pros:** Uses existing Tailscale infrastructure. No new services.
- **Cons:** Funnel creates a *public* URL (not appropriate for a control channel). Serve is tailnet-only, so Muse would still need tailnet access (via the proxy). Does not solve the core problem.
- **Verdict:** Not suitable.

## F. Least infrastructure and least privilege

**For immediate robustness (Phase 1): Option 1 (autossh).**
- Zero new infrastructure.
- Uses the existing SSH key (already least-privilege).
- Adds automatic reconnect, turning transient proxy failures from "outage requiring manual intervention" into "brief interruption with automatic recovery."
- Does NOT eliminate the proxy dependency, but makes it manageable.
- Can be implemented now, without Nolan's infrastructure approval.

**For true proxy independence (Phase 2): Option 2 (WebSocket rendezvous).**
- Requires one small cloud service.
- The Pig-side agent is a legitimate, transparent daemon: outbound WebSocket, heartbeat, automatic reconnect, scoped token auth, audit logging. Not malware; it is a user-authorized remote-access agent with a documented purpose.
- Muse connects outbound to the same server. No inbound connections anywhere. No firewall changes.
- Clear distinction: "Pig agent disconnected" (Pig offline or agent down) vs "Muse cannot reach rendezvous" (Muse route issue).
- This is the correct long-term architecture, but it requires Nolan to approve the infrastructure.

## Proposed Design (Phase 1: autossh, for approval)

**Component:** `pig-autossh-supervisor` running in the Muse runtime.

**Behavior:**
1. On start, launches `autossh -M 0 -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -F ~/.ssh/pig-config pigwsl -N` (no remote command, just keep the tunnel open).
2. Autossh monitors the SSH connection. If it drops, autossh restarts it with backoff.
3. A local health endpoint (or log file) records: CONNECTED, RECONNECTING, FAILED.
4. The existing `pig-health-check.py` is extended to check the autossh tunnel state, providing the "Pig offline" vs "route offline" distinction:
   - If autossh reports CONNECTED but a new SSH fails: Pig-side issue.
   - If autossh reports RECONNECTING: Route issue (proxy/Tailscale).
5. All events are logged with timestamps. No secrets in logs.

**Security:**
- Uses the existing SSH key (`~/.ssh/id_ed25519`), no new credentials.
- The `-N` flag means no remote command execution; it is purely a connectivity keeper. Actual commands still go through separate `ssh` invocations.
- Fail-closed: if autossh cannot establish the connection, it retries with backoff and reports FAILED; it never silently pretends to be connected.

**Limitations (honest):**
- Still depends on the proxy. When the proxy has a transient failure, the tunnel drops and autossh reconnects when the proxy recovers.
- Does not provide a command channel; it is a connectivity supervisor only.

## Proposed Design (Phase 2: WebSocket rendezvous, for future approval)

**Components:**
1. **Rendezvous server:** Minimal WebSocket server (e.g., Python `websockets` or Node `ws`) on a stable cloud host. Authenticates both Pig agent and Muse client via scoped tokens. Relays messages. Logs connections/disconnections (no message content).
2. **Pig agent:** Lightweight daemon (Python or Go) running on the Pig (as a Windows service or scheduled task). On start, connects outbound via WSS to the rendezvous server. Sends heartbeat every 30s. Listens for command messages. Executes commands via local SSH to WSL (or directly) and returns results. Automatic reconnect with exponential backoff.
3. **Muse client:** When Muse needs Pig access, it connects outbound via WSS to the rendezvous server, sends a command message with a correlation ID, waits for the response.

**Security:**
- Mutual TLS or token auth. Tokens are scoped (Pig agent token can only register as "pig"; Muse token can only send commands).
- Token rotation: tokens expire and are rotated via a secure channel (not in the scope of Phase 1).
- Audit logging: server logs (timestamp, client_id, message_type, correlation_id), never message content or credentials.
- Fail-closed: if the agent disconnects, the server marks Pig as offline. Muse receives an explicit "Pig offline" response, not a timeout.
- Least privilege: the agent runs as a limited user, commands are allowlisted.

**This is NOT malware.** It is a transparent, user-authorized remote administration agent with:
- Explicit user authorization (Nolan approves the deployment)
- Documented purpose (Pig command and control)
- Visible process (named service, logs)
- Scoped credentials (not a full shell, allowlisted commands)
- No evasion (does not hide from task manager, antivirus, or the user)
- Revocable (Nolan can stop the service at any time)

## Recommendation

**Immediate:** Approve Phase 1 (autossh supervisor). It is low-risk, zero new infrastructure, and turns the current "mysterious 15-minute outages" into "automatic recovery with clear status."

**Strategic:** Consider Phase 2 (WebSocket rendezvous) for true proxy independence. This requires Nolan to approve cloud infrastructure and the Pig-side agent deployment. Do not implement until Phase 1 is proven and Nolan explicitly approves.

**Do not:** Continue hardening Pig-side SSH/WSL/Docker. The evidence is clear: the failure is upstream. Pig-side is healthy.
