#!/bin/bash
cd /home/nolan/projects/ping
echo "===== select() owner precedence ====="; grep -n "owner" src/fyd/media/select.ts | head -20
echo; echo "===== select fn head ====="; grep -n "export function select" -A 25 src/fyd/media/select.ts | head -40
