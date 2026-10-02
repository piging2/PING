#!/bin/bash
# Stage the two 500-job shard queues on the Pig (manifests + dirs).
# The shards are NOT started here; each shard gets one warm worker when launched.
H=/home/nolan/fyd-compile-harness
mkdir -p "$H/queue-shard-a" "$H/queue-shard-b" "$H/results-shard-a" "$H/results-shard-b"
ls "$H/fixtures/shard" | wc -l
