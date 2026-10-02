cp /mnt/c/Users/nolan/transfer/fyd-missions/repro.ts /home/nolan/fyd-missions/shard-0/
cd /home/nolan/projects/ping && node /home/nolan/fyd-missions/shard-0/build-repro.cjs >/dev/null
DUMP_HTML=/home/nolan/fyd-missions/shard-0/leak.html node /home/nolan/fyd-missions/shard-0/repro.cjs /home/nolan/fyd-missions/shard-0/rail-unbound-description.json >/dev/null 2>&1
echo "occurrences of sentinel in baseline HTML:"
grep -o "REPRO UNBOUND CLAIM" /home/nolan/fyd-missions/shard-0/leak.html | wc -l
echo "--- distinct contexts ---"
grep -o '.\{100\}REPRO UNBOUND CLAIM.\{60\}' /home/nolan/fyd-missions/shard-0/leak.html
