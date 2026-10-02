#!/usr/bin/env node
// cfl-one.mjs — runs a SINGLE conflict-sources fixture case in an isolated
// process and prints the cfl-harness result as JSON on stdout.
import { getCase } from "./cfl-cases.mjs";
import { getCase as getCaseCfl2 } from "./cfl-cases2.mjs";
import { getCase as getCaseCfl3 } from "./cfl-cases3.mjs";
import { runConflictCase, CFL_PARSER_VERSION } from "./cfl-harness.mjs";

const caseId = process.argv[2];
const c = getCase(caseId) || getCaseCfl2(caseId) || getCaseCfl3(caseId);
if (!c) { console.error(`unknown case ${caseId}`); process.exit(2); }
const result = runConflictCase(c.input, `fixture:${c.id}`);
result.parser_version = CFL_PARSER_VERSION;
process.stdout.write(JSON.stringify(result));
