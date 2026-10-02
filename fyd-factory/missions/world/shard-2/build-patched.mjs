// Test build: bundles the harness with the proposed ClaimBadge patch applied
// IN-MEMORY to renderer.tsx (repo stays untouched). The three replacements
// are byte-identical in effect to
// missions/patches/0001-shard2-claim-badge-coverage.patch.
import { build } from "/home/nolan/projects/ping/node_modules/esbuild/lib/main.js";
import * as fs from "fs";

const RENDERER = "/home/nolan/projects/ping/src/fyd/components/renderer.tsx";

const EDITS = [
  {
    old: `      </ul>\n    </SectionShell>\n  );\n}\n\nfunction hostOf(url: string): string {`,
    new: `      </ul>\n      <div className="mt-3">\n        <ClaimBadge objects={objects} />\n      </div>\n    </SectionShell>\n  );\n}\n\nfunction hostOf(url: string): string {`,
  },
  {
    old: `            Ask FYD\n          </a>\n        </div>\n      </div>\n    </section>\n  );\n}`,
    new: `            Ask FYD\n          </a>\n        </div>\n        {objects.length > 0 ? (\n          <div className="mt-4">\n            <ClaimBadge objects={objects} />\n          </div>\n        ) : null}\n      </div>\n    </section>\n  );\n}`,
  },
  {
    old: `        {featuredView.provenance.label}\n      </p>\n    </div>\n  );`,
    new: `        {featuredView.provenance.label}\n      </p>\n      <div className="mt-1">\n        <ClaimBadge objects={[featured]} />\n      </div>\n    </div>\n  );`,
  },
];

function applyEdits(src) {
  let out = src;
  for (const [k, e] of EDITS.entries()) {
    const count = out.split(e.old).length - 1;
    if (count !== 1) throw new Error(`edit ${k}: expected 1 match, found ${count}`);
    out = out.replace(e.old, e.new);
  }
  return out;
}

// Sanity: the in-memory edits must agree with the checked patch file's hunks.
const patch = fs.readFileSync("/tmp/shard2.patch", "utf8");
for (const e of EDITS) {
  const added = e.new.split("\n").filter((l) => !e.old.includes(l));
  for (const line of added) {
    const t = line.trim();
    if (t && !patch.includes(t)) throw new Error(`patched line not in patch file: ${t}`);
  }
}

const entry = process.argv[2] || "/home/nolan/fyd-factory-shard2/harness.tsx";
const outfile = process.argv[3] || "/home/nolan/fyd-factory-shard2/bundle-patched.cjs";

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
        b.onLoad({ filter: /src\/fyd\/components\/renderer\.tsx$/ }, async (args) => {
          const src = await fs.promises.readFile(args.path, "utf8");
          return { contents: applyEdits(src), loader: "tsx" };
        });
      },
    },
  ],
});
console.log("patched bundle ok:", outfile);
