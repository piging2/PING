// ESM resolve hook: registry.ts imports "./schema-roles" but the file only
// exists at ../sitespec/schema-roles. Jest moduleNameMapper covers @/ and
// .css only, so this relative import is unresolvable by plain node/tsx.
// Redirect at the seam, exactly like the code intends (comment in registry.ts:
// "./schema-roles (re-exported by ../sitespec/schemas)").
import { pathToFileURL } from "node:url";

const TARGET = pathToFileURL(
  "/home/nolan/projects/ping/src/fyd/sitespec/schema-roles.ts",
).href;

export async function resolve(specifier, context, nextResolve) {
  if (
    specifier === "./schema-roles" &&
    typeof context.parentURL === "string" &&
    context.parentURL.includes("/src/fyd/components/registry.ts")
  ) {
    return { url: TARGET, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}

// Mirror jest's css-stub: CSS module imports become an empty default export.
export async function load(url, context, nextLoad) {
  if (typeof url === "string" && /\.css$/.test(url)) {
    return {
      format: "module",
      source: "export default {};",
      shortCircuit: true,
    };
  }
  return nextLoad(url, context);
}
