#!/usr/bin/env node
// rtl-one.mjs — runs a SINGLE rate-limits fixture case in an isolated
// process and prints the rtl-harness result as JSON on stdout.
import { getCase } from "./rtl-cases.mjs";
import { getCase as getCaseRtl2 } from "./rtl-cases2.mjs";
import { runRateLimitCase, RTL_PARSER_VERSION } from "./rtl-harness.mjs";

const caseId = process.argv[2];
const c = getCase(caseId) || getCaseRtl2(caseId);
if (!c) { console.error(`unknown case ${caseId}`); process.exit(2); }
const result = runRateLimitCase(c.input, `fixture:${c.id}`);
result.parser_version = RTL_PARSER_VERSION;
process.stdout.write(JSON.stringify(result));
