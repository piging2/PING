#!/usr/bin/env node
// upl-one.mjs — runs a SINGLE owner-uploads fixture case in an isolated
// process and prints the upl-harness result as JSON on stdout.
import { getCase } from "./upl-cases.mjs";
import { getCase as getCaseUpl2 } from "./upl-cases2.mjs";
import { getCase as getCaseUpl3 } from "./upl-cases3.mjs";
import { runUploadCase, UPL_PARSER_VERSION } from "./upl-harness.mjs";

const caseId = process.argv[2];
const c = getCase(caseId) || getCaseUpl2(caseId) || getCaseUpl3(caseId);
if (!c) { console.error(`unknown case ${caseId}`); process.exit(2); }
const result = runUploadCase(c.input, `fixture:${c.id}`);
result.parser_version = UPL_PARSER_VERSION;
process.stdout.write(JSON.stringify(result));
