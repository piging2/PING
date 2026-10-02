import Module from "node:module";
// Stub out CSS module imports so UI component chains can load under tsx.
Module._extensions[".css"] = function (m) {
  m.exports = {};
};
