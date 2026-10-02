#!/usr/bin/env python3
"""Probe hatch-egress-proxy CONNECT behavior across destination types.

Tests whether the proxy can establish tunnels to:
1. The Pig (100.79.154.43:22) - currently failing
2. Another Tailscale IP (100.70.58.42 - 'muse' node, was active)
3. An offline Tailscale IP (100.111.42.94 - iPhone, offline)
4. A regular internet host (example.com:443)
5. The Pig on different ports

This distinguishes:
- Pig-specific failure vs global Tailscale failure vs proxy failure
"""
import socket
import time
import sys
from datetime import datetime, timezone

PROXY_HOST = "hatch-egress-proxy"
PROXY_PORT = 3130

TARGETS = [
    ("pig-ssh", "100.79.154.43", 22),
    ("pig-http", "100.79.154.43", 80),
    ("tailscale-muse", "100.70.58.42", 22),
    ("tailscale-iphone-offline", "100.111.42.94", 22),
    ("internet-https", "example.com", 443),
    ("internet-http", "example.com", 80),
]

def probe_connect(target_name, host, port, timeout=10):
    """Attempt HTTP CONNECT through proxy. Returns (status, detail, elapsed_ms)."""
    start = time.time()
    try:
        sock = socket.create_connection((PROXY_HOST, PROXY_PORT), timeout=timeout)
    except Exception as e:
        elapsed = (time.time() - start) * 1000
        return ("PROXY_TCP_FAIL", f"{type(e).__name__}: {e}", elapsed)

    try:
        req = f"CONNECT {host}:{port} HTTP/1.1\r\nHost: {host}:{port}\r\n\r\n"
        sock.sendall(req.encode())
        sock.settimeout(timeout)
        resp = sock.recv(4096)
        elapsed = (time.time() - start) * 1000
        if not resp:
            return ("EMPTY_RESPONSE", "proxy closed connection with no response", elapsed)
        # Parse status line
        try:
            status_line = resp.split(b"\r\n", 1)[0].decode("utf-8", errors="replace")
        except:
            status_line = repr(resp[:100])
        return ("RESPONSE", status_line, elapsed)
    except socket.timeout:
        elapsed = (time.time() - start) * 1000
        return ("TIMEOUT", f"no response within {timeout}s", elapsed)
    except Exception as e:
        elapsed = (time.time() - start) * 1000
        return ("ERROR", f"{type(e).__name__}: {e}", elapsed)
    finally:
        try:
            sock.close()
        except:
            pass

def main():
    ts = datetime.now(timezone.utc).isoformat()
    print(f"=== Proxy CONNECT Probe {ts} ===")
    print(f"Proxy: {PROXY_HOST}:{PROXY_PORT}")
    print()

    # First resolve proxy
    try:
        proxy_ip = socket.gethostbyname(PROXY_HOST)
        print(f"Proxy resolves to: {proxy_ip}")
    except Exception as e:
        print(f"Proxy DNS failed: {e}")
        sys.exit(1)
    print()

    results = []
    for name, host, port in TARGETS:
        status, detail, elapsed = probe_connect(name, host, port)
        results.append((name, host, port, status, detail, elapsed))
        print(f"{name:30s} {host:18s}:{port:<5d} {status:15s} {elapsed:7.0f}ms  {detail[:80]}")
        time.sleep(1)  # Don't hammer

    print()
    print("=== Summary ===")
    for name, host, port, status, detail, elapsed in results:
        print(f"  {name}: {status} - {detail[:60]}")

if __name__ == "__main__":
    main()
