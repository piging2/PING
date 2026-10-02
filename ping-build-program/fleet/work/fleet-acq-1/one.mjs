#!/usr/bin/env node
// one.mjs — runs a SINGLE fixture case in an isolated process and prints the
// harness result as JSON on stdout. Searches batch 1 then batch 2 registries.
// Env HTML_HARNESS_BUDGET_MS may tighten P6.
import { getCase as getCase1 } from "./cases.mjs";
import { getCase as getCase2 } from "./cases2.mjs";
import { runCase, PARSER_VERSION } from "./harness.mjs";

const caseId = process.argv[2];
const c = getCase1(caseId) || getCase2(caseId);
if (!c) { console.error(`unknown case ${caseId}`); process.exit(2); }
const result = runCase(c.html, `fixture:${c.id}`);
result.parser_version = PARSER_VERSION;
process.stdout.write(JSON.stringify(result));
