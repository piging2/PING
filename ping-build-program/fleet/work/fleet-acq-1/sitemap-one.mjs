#!/usr/bin/env node
// sitemap-one.mjs — runs a SINGLE sitemap fixture case in an isolated process
// and prints the sitemap-harness result as JSON on stdout.
import { getCase } from "./sitemap-cases.mjs";
import { runSitemapCase, SITEMAP_PARSER_VERSION } from "./sitemap-harness.mjs";

const caseId = process.argv[2];
const c = getCase(caseId);
if (!c) { console.error(`unknown case ${caseId}`); process.exit(2); }
const result = runSitemapCase(c.xml, `fixture:${c.id}`);
result.parser_version = SITEMAP_PARSER_VERSION;
process.stdout.write(JSON.stringify(result));
