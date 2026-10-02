#!/usr/bin/env node
// soc-one.mjs — runs a SINGLE permitted-social fixture case in an isolated
// process and prints the soc-harness result as JSON on stdout.
import { getCase } from "./soc-cases.mjs";
import { getCase as getCaseSoc2 } from "./soc-cases2.mjs";
import { getCase as getCaseSoc3 } from "./soc-cases3.mjs";
import { runSocCase, SOC_PARSER_VERSION } from "./soc-harness.mjs";

const caseId = process.argv[2];
const c = getCase(caseId) || getCaseSoc2(caseId) || getCaseSoc3(caseId);
if (!c) { console.error(`unknown case ${caseId}`); process.exit(2); }
const result = runSocCase(c.input, `fixture:${c.id}`);
result.parser_version = SOC_PARSER_VERSION;
process.stdout.write(JSON.stringify(result));
