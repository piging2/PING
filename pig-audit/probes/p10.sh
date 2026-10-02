#!/bin/bash
cd /home/nolan/ping
echo "########## gateway_runtime.js 1-220 ##########"
cat -n gateway/bootstrap/gateway_runtime.js | sed -n '1,220p'
