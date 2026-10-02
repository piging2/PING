#!/usr/bin/env node
// pdf-one.mjs — runs a SINGLE documents-pdf fixture case in an isolated
// process and prints the pdf-harness result as JSON on stdout.
import { getCase } from "./pdf-cases.mjs";
import { getCase as getCase2 } from "./pdf-cases2.mjs";
import { getCase as getCase3 } from "./pdf-cases3.mjs";
import { getCase as getCase4 } from "./pdf-cases4.mjs";
import { runPdfCase, PDF_PARSER_VERSION } from "./pdf-harness.mjs";

const caseId = process.argv[2];
const c = getCase(caseId) || getCase2(caseId) || getCase3(caseId) || getCase4(caseId);
if (!c) { console.error(`unknown case ${caseId}`); process.exit(2); }
const result = runPdfCase(c.bytes, `fixture:${c.id}`);
result.parser_version = PDF_PARSER_VERSION;
process.stdout.write(JSON.stringify(result));
