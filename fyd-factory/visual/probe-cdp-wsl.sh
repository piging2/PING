#!/bin/bash
echo "=== resolv.conf ==="
cat /etc/resolv.conf 2>/dev/null
GW=$(grep -m1 nameserver /etc/resolv.conf | awk '{print $2}')
echo "gateway candidate: $GW"
for host in "$GW" 172.18.144.1 172.17.0.1; do
  [ -z "$host" ] && continue
  echo "-- http://$host:9223/json/version --"
  curl -s --max-time 6 "http://$host:9223/json/version" | head -c 200
  echo ""
done
echo "=== also try hostname-based ==="
cat /etc/hosts | grep -i -E "host|windows" | head -5
