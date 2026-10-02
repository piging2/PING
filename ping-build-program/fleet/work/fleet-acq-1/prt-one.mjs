#!/usr/bin/env node
// prt-one.mjs — runs a SINGLE partial-pages fixture case in an isolated
// process and prints the prt-harness result as JSON on stdout.
import { getCase } from "./prt-cases.mjs";
import { getCase as getCasePrt2 } from "./prt-cases2.mjs";
import { runPartialCase, PRT_PARSER_VERSION } from "./prt-harness.mjs";

const caseId = process.argv[2];
const c = getCase(caseId) || getCasePrt2(caseId);
if (!c) { console.error(`unknown case ${caseId}`); process.exit(2); }
const result = runPartialCase(c.input, `fixture:${c.id}`);
result.parser_version = PRT_PARSER_VERSION;
process.stdout.write(JSON.stringify(result));
