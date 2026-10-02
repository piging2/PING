#!/usr/bin/env node
// rnm-one.mjs — runs a SINGLE renames-redirects fixture case in an isolated
// process and prints the rnm-harness result as JSON on stdout.
import { getCase } from "./rnm-cases.mjs";
import { getCase as getCaseRnm2 } from "./rnm-cases2.mjs";
import { runRenameCase, RNM_PARSER_VERSION } from "./rnm-harness.mjs";

const caseId = process.argv[2];
const c = getCase(caseId) || getCaseRnm2(caseId);
if (!c) { console.error(`unknown case ${caseId}`); process.exit(2); }
const result = runRenameCase(c.input, `fixture:${c.id}`);
result.parser_version = RNM_PARSER_VERSION;
process.stdout.write(JSON.stringify(result));
