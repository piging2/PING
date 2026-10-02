#!/usr/bin/env node
// meta-one.mjs — runs a SINGLE structured-metadata fixture case in an isolated
// process and prints the meta-harness result as JSON on stdout.
import { getCase } from "./meta-cases.mjs";
import { runMetaCase, META_PARSER_VERSION } from "./meta-harness.mjs";

const caseId = process.argv[2];
const c = getCase(caseId);
if (!c) { console.error(`unknown case ${caseId}`); process.exit(2); }
const result = runMetaCase(c.html, `fixture:${c.id}`);
result.parser_version = META_PARSER_VERSION;
process.stdout.write(JSON.stringify(result));
