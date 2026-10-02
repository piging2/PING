#!/bin/bash
cat > /home/nolan/css-register.mjs <<'EOF'
import { register } from "node:module";
register(new URL("./css-hooks.mjs", import.meta.url));
EOF
cd /home/nolan/projects/ping
node --import tsx/esm --import /home/nolan/css-register.mjs /home/nolan/smoke.mts
