#!/bin/bash
cd /home/nolan/ping
echo "=== tool_authority rest ==="; sed -n '80,180p' gateway/tool_authority.js
echo "=== permission_authority exists? ==="; ls gateway/permission_authority* ping-runtime/authorities/*permission* 2>/dev/null; echo "exit=$?"
