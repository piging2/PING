#!/bin/bash
OUT=/home/ubuntu/ops-lane-memstats.tsv
echo -e "ts\tname\tmem_used_mib" > "$OUT"
setsid bash -c 'for i in $(seq 1 20); do ts=$(date -u +%FT%TZ); docker stats --no-stream --format "{{.Name}} {{.MemUsage}}" | while read -r n u rest; do mib=$(echo "$u" | sed "s/MiB//"); echo -e "$ts\t$n\t$mib" >> /home/ubuntu/ops-lane-memstats.tsv; done; sleep 30; done' < /dev/null > /dev/null 2>&1 &
echo "sampler started, pid=$!"
sleep 2; head -5 "$OUT"; wc -l "$OUT"
