#!/bin/bash
set -u
LWT=/home/nolan/projects/ping-lane-l-broker
grep -n "handleId\|interface SecretHandle\|export type\|export interface" "$LWT/src/lib/secrets/secret-broker.ts" | head -15
