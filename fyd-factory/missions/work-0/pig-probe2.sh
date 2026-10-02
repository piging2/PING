#!/bin/bash
echo "=== shard2 dir ==="
ls /home/nolan/fyd-factory-shard2/ 2>/dev/null || echo "no shard2 dir"
echo "=== hostile fixtures on pig ==="
ls /home/nolan/fyd-compile-harness/fixtures/shard/ 2>/dev/null | head -8
ls /home/nolan/fyd-compile-harness/fixtures/shard/ 2>/dev/null | wc -l
echo "=== view.ts exports (patched tree) ==="
grep -e '^export \(function\|const\|interface\|type\)' /home/nolan/projects/ping/src/fyd/object/view.ts
echo "=== contact/media helper names ==="
grep -e 'function contact' -e 'function media' -e 'ObjectContactView' /home/nolan/projects/ping/src/fyd/object/view.ts | head -20
echo "=== safe-link module ==="
ls /home/nolan/projects/ping/src/fyd/sitespec/safe-link* 2>/dev/null || echo "no safe-link module"
grep -e 'export' /home/nolan/projects/ping/src/fyd/sitespec/safe-link.ts 2>/dev/null | head -10
