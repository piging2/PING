#!/usr/bin/env python3
"""
Pig access health check: tests each layer of the access chain and reports
the specific failure point. Distinguishes:
  ROUTE_UNAVAILABLE, PROXY_UNAVAILABLE, TAILSCALE_UNREACHABLE,
  PIG_UNREACHABLE, SSH_UNAVAILABLE, PIG_REACHABLE

Usage: pig-health-check.py [--sustained <seconds>]
Safe metadata only: no credentials, keys, or secrets in output.
"""
import socket
import base64
import os
import re
import sys
import time
from datetime import datetime, timezone

PROXY_HOST = "hatch-egress-proxy"
PROXY_PORT = 3130
PIG_IP = "100.79.154.43"
PIG_SSH_PORT = 22

def log(msg):
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    print(f"[{ts}] {msg}", flush=True)

def check_proxy_tcp():
    """Can we open TCP to the proxy?"""
    try:
        # Resolve (IPv6)
        infos = socket.getaddrinfo(PROXY_HOST, PROXY_PORT, socket.AF_INET6, socket.SOCK_STREAM)
        af, socktype, proto, canon, sa = infos[0]
        s = socket.socket(af, socktype, proto)
        s.settimeout(10)
        s.connect(sa)
        s.close()
        return True, "TCP_OK"
    except socket.gaierror as e:
        return False, f"ROUTE_UNAVAILABLE: DNS resolve failed: {e}"
    except (socket.timeout, ConnectionRefusedError) as e:
        return False, f"PROXY_UNAVAILABLE: {type(e).__name__}"
    except OSError as e:
        return False, f"PROXY_UNAVAILABLE: OSError errno={e.errno}"

def check_tailscale_tunnel():
    """Can the proxy establish a CONNECT tunnel to the Pig?"""
    try:
        infos = socket.getaddrinfo(PROXY_HOST, PROXY_PORT, socket.AF_INET6, socket.SOCK_STREAM)
        af, socktype, proto, canon, sa = infos[0]
        s = socket.socket(af, socktype, proto)
        s.settimeout(10)
        s.connect(sa)
        # Send CONNECT without auth (proxy allows unauth for tailnet)
        req = f"CONNECT {PIG_IP}:{PIG_SSH_PORT} HTTP/1.1\r\nHost: {PIG_IP}:{PIG_SSH_PORT}\r\n\r\n"
        s.send(req.encode())
        resp = s.recv(1024).decode('utf-8', errors='replace')
        s.close()
        if "200" in resp:
            return True, "TUNNEL_OK"
        elif "407" in resp:
            return False, "PROXY_UNAVAILABLE: auth required (407)"
        elif "502" in resp or "503" in resp or "504" in resp:
            return False, f"TAILSCALE_UNREACHABLE: proxy returned {resp.split()[1]}"
        else:
            return False, f"TAILSCALE_UNREACHABLE: unexpected proxy response: {resp[:60]}"
    except (socket.timeout, ConnectionResetError, BrokenPipeError) as e:
        return False, f"TAILSCALE_UNREACHABLE: {type(e).__name__} during CONNECT"
    except OSError as e:
        return False, f"PROXY_UNAVAILABLE: OSError errno={e.errno}"

def check_ssh_banner():
    """Can we get an SSH banner through the tunnel?"""
    try:
        infos = socket.getaddrinfo(PROXY_HOST, PROXY_PORT, socket.AF_INET6, socket.SOCK_STREAM)
        af, socktype, proto, canon, sa = infos[0]
        s = socket.socket(af, socktype, proto)
        s.settimeout(15)
        s.connect(sa)
        req = f"CONNECT {PIG_IP}:{PIG_SSH_PORT} HTTP/1.1\r\nHost: {PIG_IP}:{PIG_SSH_PORT}\r\n\r\n"
        s.send(req.encode())
        resp = s.recv(1024)
        if b"200" not in resp:
            s.close()
            return False, "TAILSCALE_UNREACHABLE: CONNECT failed"
        # Read SSH banner
        s.settimeout(10)
        banner = s.recv(1024)
        s.close()
        if banner.startswith(b"SSH-2.0"):
            return True, f"SSH_OK: {banner[:30].decode(errors='replace').strip()}"
        else:
            return False, "PIG_UNREACHABLE: no SSH banner"
    except socket.timeout:
        return False, "SSH_UNAVAILABLE: timeout waiting for banner"
    except (ConnectionResetError, BrokenPipeError) as e:
        return False, f"SSH_UNAVAILABLE: {type(e).__name__}"
    except OSError as e:
        return False, f"PIG_UNREACHABLE: OSError errno={e.errno}"

def run_once():
    """Run one health check, return the status."""
    ok, msg = check_proxy_tcp()
    if not ok:
        return msg
    log(f"  Layer 1 (proxy TCP): {msg}")

    ok, msg = check_tailscale_tunnel()
    if not ok:
        return msg
    log(f"  Layer 2 (Tailscale tunnel): {msg}")

    ok, msg = check_ssh_banner()
    if not ok:
        return msg
    log(f"  Layer 3 (SSH banner): {msg}")

    return "PIG_REACHABLE"

def main():
    sustained = None
    if len(sys.argv) == 3 and sys.argv[1] == "--sustained":
        sustained = int(sys.argv[2])

    if sustained:
        log(f"Starting sustained probe for {sustained}s")
        start = time.time()
        results = {}
        while time.time() - start < sustained:
            status = run_once()
            # Extract the base status (before colon)
            base = status.split(":")[0]
            results[base] = results.get(base, 0) + 1
            log(f"Result: {status}")
            if status != "PIG_REACHABLE":
                log(f"  FAILURE DETECTED: {status}")
            time.sleep(10)
        log("=== Sustained probe summary ===")
        for k, v in sorted(results.items()):
            log(f"  {k}: {v}")
    else:
        status = run_once()
        log(f"Final: {status}")

if __name__ == "__main__":
    main()
