cd /home/nolan/projects/ping
rm -f /home/nolan/fyd-missions/shard-0/results.jsonl /home/nolan/fyd-missions/shard-0/progress.final.log
/usr/bin/time -v node /home/nolan/fyd-missions/shard-0/harness.cjs /home/nolan/fyd-missions/shard-0/fixtures /home/nolan/fyd-missions/shard-0/results.jsonl 0 500 /home/nolan/fyd-missions/shard-0/progress.final.log 2>&1 | tail -30
