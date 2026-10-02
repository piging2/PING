#!/bin/bash
cd /home/nolan/projects/ping
git status --porcelain | sha256sum
ls /home/nolan/fyd-compile-harness/results-shard-b | wc -l
