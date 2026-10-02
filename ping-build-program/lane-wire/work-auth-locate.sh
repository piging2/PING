#!/bin/bash
# What does ExteriorAuthMiddleware accept? (credential source, header shape)
G=/home/nolan/ping-gateway-src
find "$G" -name "*exterior*" -not -path "*/node_modules/*" 2>/dev/null | head -5
