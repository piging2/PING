#!/bin/bash
cd /home/nolan/projects/ping
ls -d node_modules/react-dom node_modules/react 2>&1
mkdir -p /home/nolan/fyd-shard3
ln -sfn /home/nolan/projects/ping/node_modules /home/nolan/fyd-shard3/node_modules
ls -la /home/nolan/fyd-shard3/ | head
