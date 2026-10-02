const esbuild = require("/home/nolan/projects/ping/node_modules/esbuild");
const entry = process.argv[2];
const outfile = process.argv[3];
esbuild.buildSync({
  entryPoints: [entry],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile,
  loader: { ".css": "empty" },
  jsx: "automatic",
  alias: { "@": "/home/nolan/worktrees/fyd-family-converge/fyd-product-lane/src" },
  nodePaths: ["/home/nolan/projects/ping/node_modules"],
  logLevel: "warning",
});
console.log("bundled " + entry + " -> " + outfile);
