cd /home/nolan/projects/ping
OLD=$(ss -tlnp 2>/dev/null | grep ':3100' | grep -o 'pid=[0-9]*' | head -1 | cut -d= -f2)
echo "old pid: $OLD"
if [ -n "$OLD" ]; then kill "$OLD"; fi
for i in 1 2 3 4 5 6 7 8 9 10; do
  if ss -tln 2>/dev/null | grep -q ':3100'; then sleep 2; else break; fi
done
if ss -tln 2>/dev/null | grep -q ':3100'; then
  echo "PORT STILL BUSY"
  exit 1
fi
setsid npx next start -p 3100 > /mnt/c/Users/nolan/transfer/next-3100.log 2>&1 < /dev/null &
echo "started: $!"
sleep 12
curl -s -o /dev/null -w 'coppersmith:%{http_code} ' -m 10 http://127.0.0.1:3100/sites/coppersmith-plumbing
curl -s -o /dev/null -w 'happy-place:%{http_code}\n' -m 10 http://127.0.0.1:3100/sites/happy-place
ps -o pid,ppid,tty,etime,cmd -p $!
