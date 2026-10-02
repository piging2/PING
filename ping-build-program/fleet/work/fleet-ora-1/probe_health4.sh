#!/bin/bash
find /opt/ping -path "*routes/health*" -o -name "health.js" -path "*gateway*" 2>/dev/null | head -5
ls /opt/ping/gateway/ | head -20
