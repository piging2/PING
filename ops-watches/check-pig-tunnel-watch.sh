#!/usr/bin/env bash
# check-pig-tunnel-watch.sh -- 5m CONNECT-tunnel detection half of the tunnel watchdog.
# Detection lives here (local side); re-establishment lives on the Pig
# (Scheduled Task PING-TunnelWatch). This script never remediates anything.
# Prints one line: TUNNEL_OK | TUNNEL_FAIL <class>. Exit 0 on OK, 1 on fail.
# State: ~/workspace/pig-fb/.tunnel-watch-state.json {consecutive_failures, last_transition_utc}
set -u
STATE="$HOME/workspace/pig-fb/.tunnel-watch-state.json"
fails=0
[ -f "$STATE" ] && fails=$(python3 -c "import json;print(json.load(open('$STATE')).get('consecutive_failures',0))" 2>/dev/null || echo 0)

resp=$(timeout 12 python3 -c '
import socket
s=socket.create_connection(("hatch-egress-proxy",3130),timeout=8)
s.sendall(b"CONNECT 100.79.154.43:22 HTTP/1.1\r\nHost: 100.79.154.43:22\r\n\r\n")
print(s.recv(12).decode("latin1","replace"))
s.close()' 2>/dev/null || true)

if [[ "$resp" == *" 200"* ]]; then
  if [ "$fails" -gt 0 ]; then
    python3 -c "import json;json.dump({'consecutive_failures':0,'last_transition_utc':'recovered'},open('$STATE','w'))"
    echo "TUNNEL_OK recovered_after=${fails}"
  else
    echo "TUNNEL_OK"
  fi
  exit 0
fi
fails=$((fails+1))
python3 -c "import json,datetime;json.dump({'consecutive_failures':$fails,'last_transition_utc':datetime.datetime.now(datetime.timezone.utc).isoformat()},open('$STATE','w'))"
# classify coarsely: proxy TCP up but CONNECT empty => tailnet path to Pig broken (Pig-side or proxy-upstream)
echo "TUNNEL_FAIL class=CONNECT_TUNNEL_FAILED consecutive=${fails}"
exit 1
