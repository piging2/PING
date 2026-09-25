"use strict";
/**
 * Minimal DTCG 2025.10 resolver for the FYD token pipeline.
 *
 * Loads token JSON files, flattens group paths to "a.b.c" token ids, and
 * resolves "{a.b.c}" aliases (including chained aliases). Throws on
 * dangling or circular references: the build fails closed.
 */
const fs = require("fs");
const path = require("path");

function isTokenNode(node) {
  return (
    node !== null &&
    typeof node === "object" &&
    !Array.isArray(node) &&
    Object.prototype.hasOwnProperty.call(node, "$value")
  );
}

function walk(node, trail, record, flat) {
  if (isTokenNode(node)) {
    const key = trail.join(".");
    if (flat.has(key)) {
      throw new Error(`duplicate token id "${key}" (also defined in ${flat.get(key).file})`);
    }
    flat.set(key, {
      value: node.$value,
      type: node.$type,
      description: node.$description,
      file: record.file,
      tier: record.tier,
    });
    return;
  }
  if (node !== null && typeof node === "object" && !Array.isArray(node)) {
    for (const [k, v] of Object.entries(node)) {
      if (k.startsWith("$")) continue; // $description / $extensions at group level
      walk(v, [...trail, k], record, flat);
    }
  }
}

/**
 * Load token files into a flat id -> token map.
 * records: [{ path, tier }] where tier is primitive|semantic|component|shared.
 */
function loadTokenFiles(records) {
  const flat = new Map();
  for (const record of records) {
    const data = JSON.parse(fs.readFileSync(record.path, "utf8"));
    walk(data, [], { file: path.basename(record.path), tier: record.tier }, flat);
  }
  return flat;
}

/** All "{a.b.c}" reference targets inside a raw value. */
function referencedIds(value) {
  if (typeof value !== "string") return [];
  const out = [];
  const re = /\{([^}]+)\}/g;
  let m;
  while ((m = re.exec(value)) !== null) out.push(m[1].trim());
  return out;
}

/** Resolve every alias in the flat map. Returns id -> resolved raw value. */
function resolveAll(flat) {
  const resolved = new Map();
  const visiting = [];
  function resolveOne(key) {
    if (resolved.has(key)) return resolved.get(key);
    if (visiting.includes(key)) {
      throw new Error(`circular token reference: ${[...visiting, key].join(" -> ")}`);
    }
    const token = flat.get(key);
    if (!token) throw new Error(`dangling token reference: {${key}}`);
    visiting.push(key);
    let value = token.value;
    if (typeof value === "string" && value.includes("{")) {
      value = value.replace(/\{([^}]+)\}/g, (_m, ref) => resolveOne(ref.trim()));
    }
    visiting.pop();
    resolved.set(key, value);
    return value;
  }
  for (const key of flat.keys()) resolveOne(key);
  return resolved;
}

module.exports = { loadTokenFiles, resolveAll, referencedIds };
