#!/bin/bash
find /opt/ping/gateway -name "*.js" | xargs grep -ln "createHealthRoutes" 2>/dev/null | head -3
