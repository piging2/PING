#!/bin/bash
G=/home/nolan/ping-gateway-src
grep -n "recent\|limit" "$G/gateway/routes/events.js" | head -15
