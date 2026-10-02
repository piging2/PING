#!/bin/bash
grep -rn "listen(" /opt/ping/gateway/bootstrap/gateway_runtime.js 2>/dev/null | head -5
echo "--- route registrations ---"
grep -rEn "app\.(get|use|post)\(|server\.(get|use)" /opt/ping/gateway --include="*.js" 2>/dev/null | grep -iE "health|ready|/|status|api" | head -15
echo "--- express listen port refs ---"
grep -rEn "PORT|8080" /opt/ping/gateway/bootstrap/gateway_runtime.js 2>/dev/null | head -8
