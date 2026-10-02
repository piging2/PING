#!/usr/bin/env node
// pvo-one.mjs — runs a SINGLE provider-outage fixture case in an isolated
// process and prints the pvo-harness result as JSON on stdout.
import { getCase } from "./pvo-cases.mjs";
import { runProviderOutageCase, PVO_PARSER_VERSION } from "./pvo-harness.mjs";

const caseId = process.argv[2];
const c = getCase(caseId);
if (!c) { console.error(`unknown case ${caseId}`); process.exit(2); }
const result = runProviderOutageCase(c.input, `fixture:${c.id}`);
result.parser_version = PVO_PARSER_VERSION;
process.stdout.write(JSON.stringify(result));
