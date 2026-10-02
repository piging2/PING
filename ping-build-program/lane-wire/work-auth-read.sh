#!/bin/bash
G=/home/nolan/ping-gateway-src
sed -n '1,120p' "$G/gateway/exterior_auth_middleware.js"
