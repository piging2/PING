#!/bin/bash
H=/home/nolan/fyd-compile-harness
cd /home/nolan/projects/ping
node_modules/.bin/tsx --version
node -e "console.log('node ok')"
node_modules/.bin/tsx -e "import('/home/nolan/fyd-compile-harness/smoke.ts').catch(e=>console.error('E',e.message,e.stack&&e.stack.split('\n').slice(0,5).join('|')))" 2>&1 | head -20
