#!/bin/bash
# Snapshot all currently-committed result files BEFORE resume.
cd /home/nolan/fyd-compile-harness/results-pilot20
sha256sum *.json | sort > /home/nolan/fyd-compile-harness/pilot20-prekill.sha256
stat -c '%n %Y' *.json | sort > /home/nolan/fyd-compile-harness/pilot20-prekill.mtime
wc -l /home/nolan/fyd-compile-harness/pilot20-prekill.sha256
