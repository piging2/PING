#!/bin/bash
# Rewrite the stub: ESM resolve hook (for ESM imports) + CJS Module._load
# patch (for require() of assets, which is how tsx loads the repo's .tsx as CJS).
cat > /home/nolan/css-register.mjs <<'EOF'
import { register } from "node:module";
import Module from "node:module";

register(new URL("./css-hooks.mjs", import.meta.url));

const ASSET_RE = /\.(css|scss|sass|less|svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|eot|otf)(\?|#|$)/i;
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (typeof request === "string" && ASSET_RE.test(request)) {
    return { __esModule: true, default: {} };
  }
  return origLoad.call(this, request, parent, isMain);
};
EOF
cd /home/nolan/projects/ping
NODE_OPTIONS="--import /home/nolan/css-register.mjs" ./node_modules/.bin/tsx /home/nolan/smoke.mts
