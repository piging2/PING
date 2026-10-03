#!/usr/bin/env bash
# check-pig-tunnel-watch.sh -- 5m CONNECT-tunnel detection half of the tunnel watchdog.
# Detection lives here (local side); re-establishment lives on the Pig
# (Scheduled Task PING-TunnelWatch). This script never remediates anything.
# Prints one line: TUNNEL_OK | TUNNEL_FAIL <class>. Exit 0 on OK, 1 on fail.
# State: ~/workspace/pig-fb/.tunnel-watch-state.json {consecutive_failures, last_transition_utc}
#
# Nolan 2026-10-02 ~18:16 MDT (binding): the probe NEVER fails closed on a
# timeout. One empty/timeout/proxy-blip response is transient until proven
# otherwise. Every check hammers the probe up to MAX_ATTEMPTS with backoff
# and only reports TUNNEL_FAIL when EVERY attempt fails. A reported failure
# therefore means sustained loss, never a single blip. The probe does not
# give up: it retries until the attempts are exhausted, every check.
set -u
STATE="$HOME/workspace/pig-fb/.tunnel-watch-state.json"
MAX_ATTEMPTS=6
PROBE_HOST="${PIG_TUNNEL_PROBE_HOST:-hatch-egress-proxy}"
PROBE_PORT="${PIG_TUNNEL_PROBE_PORT:-3130}"
PIG_TAILNET="${PIG_TUNNEL_PIG:-100.79.154.43:22}"

fails=0
if [ -f "$STATE" ]; then
  fails=$(python3 -c "import json;print(json.load(open('$STATE')).get('consecutive_failures',0))" 2>/dev/null || echo 0)
fi
case "$fails" in ''|*[!0-9]*) fails=0 ;; esac

# probe_once: prints one class token, exit 0 only on HTTP 200.
# Tokens: OK | EMPTY | TIMEOUT | REFUSED | PROXY_<code> | ERROR
probe_once() {
  PROBE_HOST="$PROBE_HOST" PROBE_PORT="$PROBE_PORT" PIG_TAILNET="$PIG_TAILNET" timeout 12 python3 -c '
import os, socket, sys
host = os.environ["PROBE_HOST"]; port = int(os.environ["PROBE_PORT"])
target = os.environ["PIG_TAILNET"]
try:
    s = socket.create_connection((host, port), timeout=6)
    s.settimeout(5)
    req = ("CONNECT %s HTTP/1.1\r\nHost: %s\r\n\r\n" % (target, target)).encode("latin1")
    s.sendall(req)
    data = s.recv(12)
    s.close()
    if not data:
        print("EMPTY"); sys.exit(2)
    txt = data.decode("latin1", "replace")
    if " 200" in txt:
        print("OK"); sys.exit(0)
    code = txt.strip().split(" ")[1] if " " in txt.strip() else "BAD"
    print("PROXY_" + "".join(ch for ch in code if ch.isalnum())[:8]); sys.exit(3)
except socket.timeout:
    print("TIMEOUT"); sys.exit(2)
except ConnectionRefusedError:
    print("REFUSED"); sys.exit(4)
except OSError:
    print("ERROR"); sys.exit(4)
' 2>/dev/null
  rc=$?
  if [ $rc -eq 124 ]; then echo "TIMEOUT"; return 2; fi
  return $rc
}

attempt=0
backoff=1
class_hist=""
while [ "$attempt" -lt "$MAX_ATTEMPTS" ]; do
  attempt=$((attempt + 1))
  cls=$(probe_once); rc=$?
  if [ "$rc" -eq 0 ]; then
    if [ "$fails" -gt 0 ]; then
      python3 -c "import json;json.dump({'consecutive_failures':0,'last_transition_utc':'recovered'},open('$STATE','w'))"
      echo "TUNNEL_OK recovered_after=${fails} attempts=${attempt}"
    else
      echo "TUNNEL_OK attempts=${attempt}"
    fi
    exit 0
  fi
  class_hist="${class_hist}${cls} "
  if [ "$attempt" -lt "$MAX_ATTEMPTS" ]; then
    sleep "$backoff"
    backoff=$((backoff * 2))
    [ "$backoff" -gt 8 ] && backoff=8
  fi
done

# Every attempt failed: this is sustained loss, not a blip. Dominant class wins.
dominant=$(echo "$class_hist" | tr ' ' '\n' | sort | uniq -c | sort -rn | head -1 | awk '{print $2}')
fails=$((fails + 1))
python3 -c "import json,datetime;json.dump({'consecutive_failures':$fails,'last_transition_utc':datetime.datetime.now(datetime.timezone.utc).isoformat()},open('$STATE','w'))"
echo "TUNNEL_FAIL class=${dominant} consecutive=${fails} attempts=${MAX_ATTEMPTS}"
exit 1
