// Unpatched build: schema-roles redirect only (repo stays untouched).
import { build } from "/home/nolan/projects/ping/node_modules/esbuild/lib/main.js";

const entry = process.argv[2] || "/home/nolan/fyd-factory-shard2/harness.tsx";
const outfile = process.argv[3] || "/home/nolan/fyd-factory-shard2/bundle.cjs";

await build({
  entryPoints: [entry],
  bundle: true,
  platform: "node",
  format: "cjs",
  jsx: "automatic",
  tsconfig: "/home/nolan/projects/ping/tsconfig.json",
  outfile,
  logLevel: "warning",
  plugins: [
    {
      name: "dirty-tree-schema-roles-redirect",
      setup(b) {
        b.onResolve({ filter: /^\.\/schema-roles$/ }, (args) => {
          if (args.importer.endsWith("src/fyd/components/registry.ts")) {
            return { path: "/home/nolan/projects/ping/src/fyd/sitespec/schemas.ts" };
          }
          return undefined;
        });
      },
    },
  ],
});
console.log("bundle ok:", outfile);
