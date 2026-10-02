#!/bin/bash
cd /home/nolan/projects/ping
grep -n "keyframes fyd-enter" src/fyd/components/renderer.tsx | cat -A
