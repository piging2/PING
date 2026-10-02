#!/bin/bash
ls /opt/ping/gateway/ | tail -20
echo "---"
find /opt/ping/gateway -maxdepth 2 -name "routes" -o -maxdepth 2 -name "health*" 2>/dev/null | head
