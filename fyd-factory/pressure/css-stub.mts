/**
 * F4-PRESSURE bootstrap stub: node/tsx cannot parse .css imports pulled in
 * by renderer.tsx's UI tree (object-circle.module.css). This stubs them to {}
 * so the pure seam functions (buildRenderContext, resolveQuery) load.
 * Loaded via `tsx --import ./css-stub.mts` BEFORE the harness module.
 */
import { Module } from "node:module";

const m = Module as unknown as {
  _extensions: Record<string, (mod: { exports: unknown }, filename: string) => void>;
};
for (const ext of [".css", ".scss", ".sass", ".less"]) {
  m._extensions[ext] = function (mod) {
    mod.exports = {};
  };
}
