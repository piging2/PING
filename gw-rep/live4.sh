set -u
R=/tmp/gw-rep
mkdir -p $R
echo "=== live checksums ==="
docker exec ping-gateway sh -c 'cd /app/gateway && find . -type f | sort | xargs sha256sum 2>/dev/null' > $R/live_sums.txt
echo "=== source checksums ==="
cd /home/nolan/ping-gateway-src/gateway && find . -type f | sort | xargs sha256sum 2>/dev/null > $R/src_sums.txt
cd /
wc -l $R/live_sums.txt $R/src_sums.txt
echo "=== files only in LIVE (not in source) ==="
awk '{print $3}' $R/live_sums.txt | sort > $R/live_names.txt
awk '{print $3}' $R/src_sums.txt | sort > $R/src_names.txt
comm -23 $R/live_names.txt $R/src_names.txt > $R/only_live.txt
wc -l $R/only_live.txt; head -30 $R/only_live.txt
echo "=== files only in SOURCE (not in live) ==="
comm -13 $R/live_names.txt $R/src_names.txt > $R/only_src.txt
wc -l $R/only_src.txt; head -30 $R/only_src.txt
echo "=== common files with differing checksums ==="
join -j 3 -o 1.1,1.3,2.3 <(sort -k3 $R/live_sums.txt) <(sort -k3 $R/src_sums.txt) | awk '$1 != $4 {print $2}' > $R/diff_files.txt
wc -l $R/diff_files.txt; head -40 $R/diff_files.txt
