#!/bin/bash
cd /home/nolan/projects/ping || exit 1
sed -n 700,800p src/lib/ping/ask-composer.ts
