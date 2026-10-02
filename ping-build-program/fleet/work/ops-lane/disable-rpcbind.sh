#!/bin/bash
# OPS-001b: disable rpcbind, verify closure
echo "=== rpcbind.socket unit? ==="
systemctl list-unit-files 2>/dev/null | grep -e rpcbind || echo "no rpcbind units besides service"
echo "=== DISABLING ==="
systemctl disable --now rpcbind 2>&1
echo "disable_exit=$?"
echo "=== state after ==="
systemctl is-active rpcbind; systemctl is-enabled rpcbind
echo "=== :111 now? ==="
ss -tlnp 2>/dev/null | grep -e ':111' || echo "NOTHING on :111"
echo "=== rpcinfo after ==="
rpcinfo -p 2>&1 | head -3 || echo "rpcinfo: portmapper gone"
echo "=== :46699 identification ==="
ss -tlnp 2>/dev/null | grep -e '46699' || echo "no 46699 listener now"
ps aux | grep -e '46699' | grep -v grep || true
echo "=== boot persistence proof ==="
ls -la /etc/systemd/system/multi-user.target.wants/ 2>/dev/null | grep -e rpcbind || echo "no rpcbind symlink in multi-user wants (will not start at boot)"
echo "=== docker still healthy (sanity) ==="
docker ps --format '{{.Names}} {{.Status}}' 2>/dev/null | head -5
