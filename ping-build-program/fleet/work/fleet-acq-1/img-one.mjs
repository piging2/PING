#!/usr/bin/env node
// img-one.mjs — runs a SINGLE image-metadata fixture case in an isolated
// process and prints the img-harness result as JSON on stdout.
import { getCase } from "./img-cases.mjs";
import { getCase as getCaseImg2 } from "./img-cases2.mjs";
import { runImgCase, IMG_PARSER_VERSION } from "./img-harness.mjs";

const caseId = process.argv[2];
const c = getCase(caseId) || getCaseImg2(caseId);
if (!c) { console.error(`unknown case ${caseId}`); process.exit(2); }
const result = runImgCase(c.bytes, `fixture:${c.id}`);
result.parser_version = IMG_PARSER_VERSION;
process.stdout.write(JSON.stringify(result));
