export FYD_OUT=/home/nolan/fyd-factory-shard2
rm -f /home/nolan/fyd-factory-shard2/results-patched.jsonl
node /home/nolan/fyd-factory-shard2/bundle-patched.cjs 1000 1500
mv /home/nolan/fyd-factory-shard2/results.jsonl /home/nolan/fyd-factory-shard2/results-patched.jsonl
