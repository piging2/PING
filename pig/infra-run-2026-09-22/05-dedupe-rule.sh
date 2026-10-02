echo "=== removing duplicate rule, keeping pre-existing FYD-Tailscale-3100 ==="
netsh.exe advfirewall firewall delete rule name="PING FYD 3100 tailnet" < /dev/null
echo "delete exit=$?"
echo "=== remaining 3100 rules ==="
netsh.exe advfirewall firewall show rule name=all < /dev/null | grep -i -B1 "LocalPort:.*3100" | head -8
echo "=== final portproxy ==="
netsh.exe interface portproxy show v4tov4 < /dev/null
