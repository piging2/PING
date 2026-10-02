#!/bin/bash
echo "=== ss -tlnp (TCP listeners) ==="
ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null
echo "=== rpcbind process ==="
ps aux | grep -e rpcbind -e rpcbind | grep -v grep; echo "rpcbind_grep_exit=$?"
systemctl is-active rpcbind 2>/dev/null; systemctl is-enabled rpcbind 2>/dev/null
echo "=== nfs services ==="
systemctl list-units --type=service --state=running 2>/dev/null | grep -i -e nfs -e rpc || echo "no nfs/rpc services running"
echo "=== iptables INPUT for :111 ==="
sudo -n iptables -L INPUT -n 2>/dev/null | grep -e 111 -e "Chain INPUT" | head -5 || echo "iptables not readable"
