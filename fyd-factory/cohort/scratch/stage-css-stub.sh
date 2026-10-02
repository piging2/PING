#!/bin/bash
# stage-css-stub.sh: create ESM loader stub for asset imports OUTSIDE the repo.
cat > /home/nolan/css-hooks.mjs <<'EOF'
// Stub asset imports (.css/.svg/images/fonts) as empty modules so tsx can
// load UI-adjacent modules (renderer.tsx chain) in a headless pipeline run.
export async function resolve(specifier, context, nextResolve) {
  if (/\.(css|svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|eot|otf)(\?|#|$)/i.test(specifier)) {
    return { url: new URL("./css-empty.mjs", import.meta.url).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
EOF
cat > /home/nolan/css-empty.mjs <<'EOF'
export default {};
EOF
cat > /home/nolan/css-register.mjs <<'EOF'
import { register } from "node:module";
register("/home/nolan/css-hooks.mjs");
EOF
ls -la /home/nolan/css-*.mjs
echo "STUB STAGED"
