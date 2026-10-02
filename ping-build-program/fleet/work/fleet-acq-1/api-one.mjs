#!/usr/bin/env node
// api-one.mjs — runs a SINGLE public-apis fixture case in an isolated process
// and prints the api-harness result as JSON on stdout.
const b = process.env.API_BATCH || "1";
const { getCase } = b === "4" ? await import("./api-cases4.mjs") : b === "3" ? await import("./api-cases3.mjs") : b === "2" ? await import("./api-cases2.mjs") : await import("./api-cases.mjs");
import { runApiCase, API_PARSER_VERSION } from "./api-harness.mjs";

const caseId = process.argv[2];
const c = getCase(caseId);
if (!c) { console.error(`unknown case ${caseId}`); process.exit(2); }
const result = runApiCase(c.json, `fixture:${c.id}`);
result.parser_version = API_PARSER_VERSION;
process.stdout.write(JSON.stringify(result));
