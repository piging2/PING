#!/bin/bash
# OPS-001c: disable rpcbind service AND socket with sudo, verify closure
echo "=== DISABLING (sudo) ==="
sudo -n systemctl disable --now rpcbind.service rpcbind.socket 2>&1
echo "disable_exit=$?"
echo "=== state after ==="
systemctl is-active rpcbind.service 2>&1; systemctl is-enabled rpcbind.service 2>&1
systemctl is-active rpcbind.socket 2>&1; systemctl is-enabled rpcbind.socket 2>&1
echo "=== :111 now? ==="
ss -tlnp 2>/dev/null | grep -e ':111' || echo "NOTHING on :111"
echo "=== rpcinfo after ==="
rpcinfo -p 2>&1 | head -3 || echo "rpcinfo: portmapper gone"
echo "=== boot persistence proof ==="
ls -la /etc/systemd/system/multi-user.target.wants/ 2>/dev/null | grep -e rpcbind || echo "no rpcbind symlink in multi-user wants"
ls -la /etc/systemd/system/sockets.target.wants/ 2>/dev/null | grep -e rpcbind || echo "no rpcbind symlink in sockets wants"
echo "=== RESTART-BOUNDARY: try to start it manually, confirm disable semantics ==="
sudo -n systemctl start rpcbind.service 2>&1; systemctl is-active rpcbind.service
echo "(note: manual start works by design; enablement is what gates boot)"
sudo -n systemctl stop rpcbind.service 2>&1; systemctl is-active rpcbind.service 2>&1
ss -tlnp 2>/dev/null | grep -e ':111' || echo "NOTHING on :111 after manual stop"
echo "=== docker sanity ==="
docker ps --format '{{.Names}} {{.Status}}' 2>/dev/null
