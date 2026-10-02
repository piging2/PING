#!/usr/bin/env node
// con-one.mjs — runs a SINGLE software-connectors fixture case in an isolated
// process and prints the con-harness result as JSON on stdout.
import { getCase } from "./con-cases.mjs";
import { getCase as getCaseCon2 } from "./con-cases2.mjs";
import { getCase as getCaseCon3 } from "./con-cases3.mjs";
import { runConnectorCase, CON_PARSER_VERSION } from "./con-harness.mjs";

const caseId = process.argv[2];
const c = getCase(caseId) || getCaseCon2(caseId) || getCaseCon3(caseId);
if (!c) { console.error(`unknown case ${caseId}`); process.exit(2); }
const result = runConnectorCase(c.input, `fixture:${c.id}`);
result.parser_version = CON_PARSER_VERSION;
process.stdout.write(JSON.stringify(result));
