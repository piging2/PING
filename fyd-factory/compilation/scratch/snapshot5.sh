#!/bin/bash
cd /home/nolan/fyd-compile-harness/results-pilot20
sha256sum *.json | sort > /home/nolan/fyd-compile-harness/pilot20-prekill.sha256
stat -c '%n %Y' *.json | sort > /home/nolan/fyd-compile-harness/pilot20-prekill.mtime
cat /home/nolan/fyd-compile-harness/pilot20-prekill.sha256
