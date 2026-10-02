set -u
R=/tmp/gw-rep
docker exec ping-gateway sh -c 'cd /app/gateway && find . -type f -not -path "./node_modules/*" -not -path "./generated/*" | sort | xargs sha256sum 2>/dev/null' > $R/live2.txt
cd /home/nolan/ping-gateway-src/gateway && find . -type f -not -path "./node_modules/*" -not -path "./generated/*" | sort | xargs sha256sum 2>/dev/null > $R/src2.txt
wc -l $R/live2.txt $R/src2.txt
python3 - <<'PYEOF'
live, src = {}, {}
for line in open('/tmp/gw-rep/live2.txt'):
    h, p = line.split(None, 1); live[p.strip()] = h
for line in open('/tmp/gw-rep/src2.txt'):
    h, p = line.split(None, 1); src[p.strip()] = h
ln, sn = set(live), set(src)
print("only_live:", len(ln - sn))
for p in sorted(ln - sn)[:25]: print("  L:", p)
print("only_src:", len(sn - ln))
for p in sorted(sn - ln)[:40]: print("  S:", p)
diff = [p for p in (ln & sn) if live[p] != src[p]]
print("differing:", len(diff))
for p in sorted(diff)[:40]: print("  D:", p)
PYEOF
