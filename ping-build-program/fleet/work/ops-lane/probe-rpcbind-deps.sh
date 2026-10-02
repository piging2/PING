#!/bin/bash
# OPS-001a: rpcbind dependency re-verification on ping-core-01
echo "=== NFS mounts ==="
mount | grep -i -e nfs -e rpc || echo "no nfs mounts"
cat /proc/filesystems | grep -i nfs || echo "nfs not in filesystems"
echo "=== /etc/fstab ==="
grep -i -e nfs -e rpc /etc/fstab 2>/dev/null || echo "no nfs/rpc in fstab"
echo "=== rpcbind service state ==="
systemctl is-active rpcbind; systemctl is-enabled rpcbind
systemctl show rpcbind -p WantedBy -p RequiredBy -p BindsTo 2>/dev/null
echo "=== reverse deps (who wants/requires rpcbind) ==="
systemctl list-dependencies --reverse rpcbind.service 2>/dev/null
echo "=== running nfs/rpc services ==="
systemctl list-units --type=service --state=running 2>/dev/null | grep -i -e nfs -e rpc -e portmap || echo "no nfs/rpc services running"
echo "=== processes with rpc in name ==="
ps aux | grep -e '[r]pc' -e '[n]fs' || echo "no rpc/nfs processes"
echo "=== :111 listeners ==="
ss -tlnp | grep -e ':111' || echo "nothing on :111"
echo "=== rpcinfo ==="
rpcinfo -p 2>/dev/null || echo "rpcinfo failed/absent"
echo "=== autofs ==="
systemctl is-active autofs 2>/dev/null || echo "autofs not active"
echo "=== recent rpcbind log ==="
journalctl -u rpcbind --since "24 hours ago" --no-pager 2>/dev/null | tail -5 || echo "no journal access"
