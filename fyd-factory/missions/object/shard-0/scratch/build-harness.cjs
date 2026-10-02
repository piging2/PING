// Build the shard-0 harness into a single CJS bundle with esbuild.
// - .css imports -> empty (mirrors jest css-stub)
// - @/* alias -> repo src/*
// - ./schema-roles from registry.ts -> ../sitespec/schema-roles
//   (the relative import is broken on disk; this applies the intent the
//   code comment documents)
// Env PATCHED=1: redirect the object-rail and renderer imports to the
// candidate patched copies (repo untouched), outfile -> harness.patched.cjs.
const esbuild = require("/home/nolan/projects/ping/node_modules/esbuild");

const patched = process.env.PATCHED === "1";

esbuild
  .build({
    entryPoints: ["/home/nolan/fyd-missions/shard-0/harness.ts"],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: patched
      ? "/home/nolan/fyd-missions/shard-0/harness.patched.cjs"
      : "/home/nolan/fyd-missions/shard-0/harness.cjs",
    loader: { ".css": "empty" },
    alias: { "@": "/home/nolan/projects/ping/src" },
    nodePaths: ["/home/nolan/projects/ping/node_modules"],
    jsx: "automatic",
    logLevel: "warning",
    plugins: [
      {
        name: "schema-roles-redirect",
        setup(build) {
          build.onResolve({ filter: /^\.\/schema-roles$/ }, (args) => {
            if (
              args.importer.endsWith("/src/fyd/components/registry.ts")
            ) {
              return {
                path: "/home/nolan/projects/ping/src/fyd/sitespec/schema-roles.ts",
              };
            }
            return undefined;
          });
          if (patched) {
            const fs = require("fs");
            const path = require("path");
            const repoComponents = "/home/nolan/projects/ping/src/fyd/components";
            function withExt(p) {
              const cands = [p, p + ".tsx", p + ".ts", path.join(p, "index.tsx"), path.join(p, "index.ts")];
              for (const c of cands) {
                try { if (fs.statSync(c).isFile()) return c; } catch (_) {}
              }
              return p;
            }
            // Patched copies live in scratch; rebase their relative imports
            // onto the repo components dir, except object-rail itself.
            build.onResolve({ filter: /^\./ }, (args) => {
              if (!/\.patched\.tsx$/.test(args.importer)) return undefined;
              if (/object-rail$/.test(args.path)) {
                return { path: "/home/nolan/fyd-missions/shard-0/object-rail.patched.tsx" };
              }
              return { path: withExt(path.join(repoComponents, args.path)) };
            });
            build.onResolve(
              { filter: /components\/renderer$/ },
              () => ({ path: "/home/nolan/fyd-missions/shard-0/renderer.patched.tsx" }),
            );
          }
        },
      },
    ],
  })
  .then(() => console.log("BUILD_OK" + (patched ? " PATCHED" : "")))
  .catch((e) => {
    console.error("BUILD_FAIL", e.message);
    process.exit(1);
  });
