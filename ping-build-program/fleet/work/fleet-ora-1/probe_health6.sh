#!/bin/bash
ls /opt/ping/gateway/routes/ | head -30
echo "---"
head -60 /opt/ping/gateway/routes/health.js 2>/dev/null || echo NO-HEALTH-JS
