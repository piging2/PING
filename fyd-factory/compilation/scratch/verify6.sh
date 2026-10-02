#!/bin/bash
cd /home/nolan/projects/ping
echo "--- plain -e ---"
node_modules/.bin/tsx -e "console.log('plain-ok')"
echo "--- tsconfig then -e ---"
node_modules/.bin/tsx --tsconfig=/home/nolan/projects/ping/tsconfig.json -e "console.log('flag-ok')"
echo "--- exit: $? ---"
