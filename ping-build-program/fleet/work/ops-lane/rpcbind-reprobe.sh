#!/bin/bash
echo "=== delayed re-probe $(date -u +%FT%TZ) ==="
systemctl is-active rpcbind.service rpcbind.socket 2>/dev/null
systemctl is-enabled rpcbind.service rpcbind.socket 2>/dev/null
ss -ltn | grep -e ':111 ' || echo "no tcp :111 listener"
ss -ltn | grep -e ':::111' || echo "no tcp6 :111 listener"
ss -lun | grep -e ':111 ' || echo "no udp :111 listener"
rpcinfo -p 2>&1 | head -2
ls /etc/systemd/system/multi-user.target.wants/ /etc/systemd/system/sockets.target.wants/ 2>/dev/null | grep -e rpcbind || echo "no boot symlinks"
