// hooks.mjs: stub out .css imports for plain-node SSR (style-only modules).
export async function resolve(specifier, context, nextResolve) {
  if (typeof specifier === "string" && specifier.endsWith(".css")) {
    return {
      url: "data:text/javascript,export default new Proxy({},{get:(t,p)=>String(p)})",
      shortCircuit: true,
    };
  }
  return nextResolve(specifier, context);
}
