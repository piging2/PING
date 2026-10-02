#!/bin/bash
cd /home/nolan/projects/ping || exit 1
sed -n 640,700p src/lib/ping/ask-composer.ts
