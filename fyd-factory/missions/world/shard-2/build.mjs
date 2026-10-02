// Build script: bundles the shard-2 harness with esbuild, working around a
// broken import in ANOTHER lane's dirty working tree (read-only: never fixed).
// src/fyd/components/registry.ts (dirty, not HEAD) imports "./schema-roles"
// which does not exist; at HEAD it imports "../sitespec/schemas".
// The onResolve plugin redirects exactly that specifier to the HEAD-intended
// target. This changes nothing in the repo.
import { build } from "/home/nolan/projects/ping/node_modules/esbuild/lib/main.js";

await build({
  entryPoints: ["/home/nolan/fyd-factory-shard2/harness.tsx"],
  bundle: true,
  platform: "node",
  format: "cjs",
  jsx: "automatic",
  tsconfig: "/home/nolan/projects/ping/tsconfig.json",
  outfile: "/home/nolan/fyd-factory-shard2/bundle.cjs",
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
console.log("bundle ok");
