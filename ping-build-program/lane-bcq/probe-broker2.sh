#!/bin/bash
set -u
LWT=/home/nolan/projects/ping-lane-l-broker
sed -n '40,100p' "$LWT/src/lib/secrets/secret-broker.ts"
