// Node module customization hooks: stub asset imports (css, images) as empty
// modules so the renderer chain loads under tsx/Node without a bundler.
// Mirrors src/fyd/sitespec/__tests__/css-register.cjs (jest) for ESM tsx runs.
export async function resolve(specifier, context, next) {
  if (/\.(css|scss|less|png|jpe?g|gif|svg|webp|avif)$/.test(specifier)) {
    return { url: "asset-stub://empty" + specifier.slice(specifier.lastIndexOf(".")), shortCircuit: true };
  }
  return next(specifier, context);
}

export async function load(url, context, next) {
  if (url.startsWith("asset-stub://empty")) {
    return { format: "module", source: "export default {};", shortCircuit: true };
  }
  return next(url, context);
}
