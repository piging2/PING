// Patched build for tests: applies patch2 to a COPY of renderer.tsx (repo untouched),
// then bundles the given entry with the renderer import redirected to the copy.
import { build } from "/home/nolan/projects/ping/node_modules/esbuild/lib/main.js";

const entry = process.argv[2];
const outfile = process.argv[3];
const patchedRenderer = "/home/nolan/fyd-factory-object2/patched-src/renderer.tsx";

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
        b.onResolve({ filter: /components\/renderer$/ }, (args) => {
          if (args.importer.includes("fyd-factory-object2")) {
            return { path: patchedRenderer };
          }
          return undefined;
        });
      },
    },
  ],
});
console.log("patched bundle ok:", outfile);
