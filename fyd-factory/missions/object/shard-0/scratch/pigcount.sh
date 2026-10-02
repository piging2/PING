find /home/nolan/fyd-missions/shard-0/fixtures -name "*.json" | wc -l
find /home/nolan/fyd-missions/shard-0/fixtures -name "*.json" | sed 's|.*/fixtures/||' | awk -F/ '{print $1}' | sort | uniq -c
