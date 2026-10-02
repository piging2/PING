#!/bin/bash
H=/home/nolan/fyd-compile-harness
cd "$H/results-pilot20" && sha256sum -c "$H/pilot20-prekill.sha256" 2>&1 | awk -F': ' '{print $2}' | sort | uniq -c
