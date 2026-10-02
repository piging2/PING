#!/bin/bash
# read-only: what is deployed on ping-core-01
echo "=== hostname ==="; hostname
echo "=== docker ps ==="; docker ps --format '{{.Names}}|{{.Image}}' 2>&1 | head -40
echo "=== compose files ==="; ls /home/ubuntu/*.yml /home/ubuntu/*.yaml /home/ubuntu/docker-compose* 2>/dev/null
echo "=== running systemd services (non-systemd-core) ==="; systemctl list-units --type=service --state=running --no-pager --no-legend 2>/dev/null | grep -viE '^(systemd|dbus|polkit|multipathd|networkd|resolved|cron|ssh|getty|user@|accounts-daemon)' | head -40
