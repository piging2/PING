#!/bin/bash
# Fetch rendered HTML for both FYD sites from dev server
curl -s --max-time 30 -A "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" \
  "http://localhost:3100/sites/coppersmith-plumbing" -o /home/nolan/workspace-fetched-coppersmith.html
curl -s --max-time 30 -A "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" \
  "http://localhost:3100/sites/happy-place" -o /home/nolan/workspace-fetched-happyplace.html
ls -la /home/nolan/workspace-fetched-*.html
