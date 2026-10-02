echo "=== Tailscale adapter IPv4 on Windows side ==="
ipconfig.exe < /dev/null | grep -i -A4 "tailscale" | head -12
echo "=== existing v4tov4 portproxy entries ==="
netsh.exe interface portproxy show v4tov4 < /dev/null
echo "=== (re)adding portproxy: 100.79.154.43:3100 -> 172.21.65.209:3100 ==="
netsh.exe interface portproxy delete v4tov4 listenport=3100 listenaddress=100.79.154.43 < /dev/null
netsh.exe interface portproxy add v4tov4 listenport=3100 listenaddress=100.79.154.43 connectport=3100 connectaddress=172.21.65.209 < /dev/null
echo "add exit=$?"
echo "=== portproxy after ==="
netsh.exe interface portproxy show v4tov4 < /dev/null
echo "=== existing 3100 firewall rules ==="
netsh.exe advfirewall firewall show rule name=all < /dev/null | grep -i -B2 "3100" | head -12
echo "=== (re)adding tailnet-scoped inbound rule TCP 3100 ==="
netsh.exe advfirewall firewall delete rule name="PING FYD 3100 tailnet" < /dev/null
netsh.exe advfirewall firewall add rule name="PING FYD 3100 tailnet" dir=in action=allow protocol=TCP localport=3100 remoteip=100.64.0.0/10 < /dev/null
echo "add exit=$?"
echo "=== rule detail ==="
netsh.exe advfirewall firewall show rule name="PING FYD 3100 tailnet" < /dev/null
