// CJS preload for tsx runs: stub asset requires (css, images) so the
// renderer chain loads under Node without a bundler. Mirrors the repo's
// jest css stub (src/fyd/sitespec/__tests__/css-register.cjs).
for (const ext of [".css", ".scss", ".less", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".avif", ".woff", ".woff2", ".ttf"]) {
  require.extensions[ext] = function (module) {
    module.exports = {};
  };
}
