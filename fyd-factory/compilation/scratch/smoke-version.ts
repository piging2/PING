import {
  computePipelineCodeVersion,
  shortVersion,
  HARNESS_VERSION,
} from "/home/nolan/fyd-compile-harness/runner/lib";

const v = computePipelineCodeVersion();
console.log("HARNESS_VERSION=" + HARNESS_VERSION);
console.log("pipeline_code_version=" + v);
console.log("short=" + shortVersion(v));
console.log("length_ok=" + (v.length === 64));
