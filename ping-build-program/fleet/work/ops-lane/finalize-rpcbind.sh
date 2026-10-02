#!/bin/bash
echo "=== current state ==="
systemctl is-active rpcbind.service rpcbind.socket 2>&1
systemctl is-enabled rpcbind.service rpcbind.socket 2>&1
echo "=== who listens on :111 ==="
ss -tlnp 2>/dev/null | grep -e ':111'
echo "=== FINAL STOP of both units ==="
sudo -n systemctl stop rpcbind.socket rpcbind.service 2>&1
echo "stop_exit=$?"
systemctl is-active rpcbind.service rpcbind.socket 2>&1
echo "=== :111 now ==="
ss -tlnp 2>/dev/null | grep -e ':111' || echo "CLOSED: nothing on :111"
echo "=== enablement (boot behavior) ==="
systemctl is-enabled rpcbind.service rpcbind.socket 2>&1
echo "=== rpcinfo ==="
rpcinfo -p 2>&1 | head -2 || true
