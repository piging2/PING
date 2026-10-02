#!/bin/bash
echo "== hostname =="
hostname
echo "== top-level dirs =="
ls / 2>/dev/null
echo "== home dirs =="
ls /home/ubuntu 2>/dev/null | head -40
echo "== search for component- definitions (maxdepth 4, read-only) =="
find /home /opt /srv /usr/local -maxdepth 4 \( -iname "*component-*" -o -iname "components" \) 2>/dev/null | head -20
echo "== grep for component-N references in likely baseline dirs =="
for d in /home/ubuntu /opt /srv; do
  [ -d "$d" ] && grep -rl "component-1[0-9]" "$d" --include="*.md" --include="*.json" --include="*.yaml" --include="*.yml" --include="*.tsv" 2>/dev/null | head -5
done
echo "== done =="
