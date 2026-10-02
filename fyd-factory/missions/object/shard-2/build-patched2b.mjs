// Patched build v2: applies the phonec dial-gating patch to renderer.tsx
// IN MEMORY via an esbuild onLoad transform (repo untouched on disk).
import { build } from "/home/nolan/projects/ping/node_modules/esbuild/lib/main.js";
import * as fs from "fs";

const entry = process.argv[2];
const outfile = process.argv[3];

const ANCHOR =
  "  if (value === undefined) return null;\n" +
  "  return contactMethodFor(kind, value, contactEvidence(o, kind, correction));\n" +
  "}";

const PATCHED =
  "  if (value === undefined) return null;\n" +
  "  // Fail-closed dial gating (OBJECT-SHARD-2): an explicit field-conflict\n" +
  "  // marker blocks the dial/mailto action. An explicit owner correction is a\n" +
  "  // human resolution of the field and outranks preserved conflict markers.\n" +
  "  if (!correction && contactFieldConflicted(ctx, o, kind)) return null;\n" +
  "  return contactMethodFor(kind, value, contactEvidence(o, kind, correction));\n" +
  "}\n" +
  "\n" +
  "/**\n" +
  " * Explicit conflict marker for one contact kind (\"phone\" | \"email\") on a\n" +
  " * single object. Two marker shapes are honored, both explicit:\n" +
  " *   - a \"<kind>_conflicts_with\" field naming the disputed value, or\n" +
  " *   - a \"conflicts\" entry that names both the field kind and a conflict\n" +
  " *     (e.g. \"PHONE CONFLICT: website lists X; directory lists Y\").\n" +
  " * Free-text notes that do not name the kind are not markers.\n" +
  " */\n" +
  "function fieldConflictMarker(o: PingObject, kind: ContactMethodKind): boolean {\n" +
  "  const fields = o.fields as Record<string, unknown>;\n" +
  "  const explicit = fields[`${kind}_conflicts_with`];\n" +
  "  if (typeof explicit === \"string\" && explicit.trim().length > 0) return true;\n" +
  "  const conflicts = fields[\"conflicts\"];\n" +
  "  if (Array.isArray(conflicts)) {\n" +
  "    const needle = kind.toLowerCase();\n" +
  "    for (const c of conflicts) {\n" +
  "      if (typeof c !== \"string\") continue;\n" +
  "      const lc = c.toLowerCase();\n" +
  "      if (lc.includes(\"conflict\") && lc.includes(needle)) return true;\n" +
  "    }\n" +
  "  }\n" +
  "  return false;\n" +
  "}\n" +
  "\n" +
  "/**\n" +
  " * Whether a dial/mailto action must be blocked for this contact field.\n" +
  " * Checks the object's own fields plus one-hop active public relationships\n" +
  " * (conflict evidence often lives on a linked external-identity object).\n" +
  " * The conflicting values stay in the graph (both claims preserved); only\n" +
  " * the action is blocked.\n" +
  " */\n" +
  "function contactFieldConflicted(\n" +
  "  ctx: RenderContext,\n" +
  "  o: PingObject,\n" +
  "  kind: ContactMethodKind,\n" +
  "): boolean {\n" +
  "  if (fieldConflictMarker(o, kind)) return true;\n" +
  "  for (const r of ctx.graph.relationships) {\n" +
  "    if (r.status !== \"active\") continue;\n" +
  "    const otherId = r.subject === o.id ? r.object : r.object === o.id ? r.subject : null;\n" +
  "    if (!otherId) continue;\n" +
  "    const t = ctx.graph.objects.find((x) => x.id === otherId);\n" +
  "    if (t && t.visibility === \"public\" && fieldConflictMarker(t, kind)) return true;\n" +
  "  }\n" +
  "  return false;\n" +
  "}\n";

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
    {
      name: "object2-phonec-patch",
      setup(b) {
        b.onLoad({ filter: /src\/fyd\/components\/renderer\.tsx$/ }, (args) => {
          let src = fs.readFileSync(args.path, "utf8");
          if (!src.includes(ANCHOR)) throw new Error("phonec patch anchor not found in renderer.tsx");
          src = src.replace(ANCHOR, PATCHED);
          return { contents: src, loader: "tsx" };
        });
      },
    },
  ],
});
console.log("patched bundle ok:", outfile);
