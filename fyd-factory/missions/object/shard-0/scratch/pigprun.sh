cd /home/nolan/projects/ping
rm -f /home/nolan/fyd-missions/shard-0/results.patched-0-99.jsonl /home/nolan/fyd-missions/shard-0/progress.patched-0-99.log
/usr/bin/time -v node /home/nolan/fyd-missions/shard-0/harness.patched.cjs /home/nolan/fyd-missions/shard-0/fixtures /home/nolan/fyd-missions/shard-0/results.patched-0-99.jsonl 0 100 /home/nolan/fyd-missions/shard-0/progress.patched-0-99.log 2>&1 | tail -25
