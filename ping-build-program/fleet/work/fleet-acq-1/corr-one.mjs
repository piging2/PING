#!/usr/bin/env node
// corr-one.mjs — runs a SINGLE owner-corrections fixture case in an isolated
// process and prints the corr-harness result as JSON on stdout.
import { getCase } from "./corr-cases.mjs";
import { getCase as getCaseCorr2 } from "./corr-cases2.mjs";
import { runCorrectionCase, COR_PARSER_VERSION } from "./corr-harness.mjs";

const caseId = process.argv[2];
const c = getCase(caseId) || getCaseCorr2(caseId);
if (!c) { console.error(`unknown case ${caseId}`); process.exit(2); }
const result = runCorrectionCase(c.input, `fixture:${c.id}`);
result.parser_version = COR_PARSER_VERSION;
process.stdout.write(JSON.stringify(result));
