#!/bin/bash
# W-PROOF :3100 start script. Run once via ssh, detaches with setsid.
cd /home/nolan/projects/ping
exec setsid npm start -- -p 3100
