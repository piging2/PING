#!/usr/bin/env node
// mkm-one.mjs — runs a SINGLE malformed-markup fixture case in an isolated
// process and prints the mkm-harness result as JSON on stdout.
import { getCase } from "./mkm-cases.mjs";
import { getCase as getCaseMkm2 } from "./mkm-cases2.mjs";
import { runMalformedCase, MKM_PARSER_VERSION } from "./mkm-harness.mjs";

const caseId = process.argv[2];
const c = getCase(caseId) || getCaseMkm2(caseId);
if (!c) { console.error(`unknown case ${caseId}`); process.exit(2); }
const result = runMalformedCase(c.input, `fixture:${c.id}`);
result.parser_version = MKM_PARSER_VERSION;
process.stdout.write(JSON.stringify(result));
