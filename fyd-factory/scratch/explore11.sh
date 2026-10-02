#!/bin/bash
cd /home/nolan/projects/ping
grep -rl 'ping.social.media@1' src --include='*.json' | head -3
