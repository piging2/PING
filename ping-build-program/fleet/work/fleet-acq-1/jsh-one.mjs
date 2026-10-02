#!/usr/bin/env node
// jsh-one.mjs — runs a SINGLE js-heavy fixture case in an isolated
// process and prints the jsh-harness result as JSON on stdout.
import { getCase } from "./jsh-cases.mjs";
import { getCase as getCaseJsh2 } from "./jsh-cases2.mjs";
import { runJsHeavyCase, JSH_PARSER_VERSION } from "./jsh-harness.mjs";

const caseId = process.argv[2];
const c = getCase(caseId) || getCaseJsh2(caseId);
if (!c) { console.error(`unknown case ${caseId}`); process.exit(2); }
const result = runJsHeavyCase(c.input, `fixture:${c.id}`);
result.parser_version = JSH_PARSER_VERSION;
process.stdout.write(JSON.stringify(result));
