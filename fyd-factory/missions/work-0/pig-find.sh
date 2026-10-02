#!/bin/bash
find /home/nolan/fyd-factory-shard2/corpus/fixtures -name 'batch-b-landscaper.json' 2>/dev/null
echo "---"
find /home/nolan/fyd-factory-shard2/corpus/fixtures -name '*.json' 2>/dev/null | sed 's|.*/fixtures/||' | sort | head -70
