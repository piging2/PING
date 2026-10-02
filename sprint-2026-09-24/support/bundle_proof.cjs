const esbuild = require("/home/nolan/projects/ping/node_modules/esbuild");
esbuild.buildSync({
  entryPoints: ["/home/hatch/workspace/sprint-2026-09-24/support/proof_entry.tsx"],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: "/home/hatch/workspace/sprint-2026-09-24/support/proof_render.cjs",
  loader: { ".css": "empty" },
  jsx: "automatic",
  alias: { "@": "/home/nolan/worktrees/fyd-family-converge/fyd-product-lane/src" },
  absWorkingDir: "/home/nolan/worktrees/fyd-family-converge/fyd-product-lane",
  logLevel: "warning",
});
console.log("bundled");
