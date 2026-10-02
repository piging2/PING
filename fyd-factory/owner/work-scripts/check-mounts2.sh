#!/bin/bash
cd /home/nolan/projects/ping
grep -n "demo-owner-mode\|DemoOwnerMode\|DemoOwner\b" src/app/sites/happy-place/page.tsx | head
echo "---"
grep -n "import\|DemoOwnerMode\|customize-panel\|CustomizePanel" src/app/dev/objects/objects-lab-client.tsx | grep -i "demo\|customize" | head
