#!/usr/bin/env node
// feed-one.mjs — runs a SINGLE feed fixture case in an isolated process
// and prints the feed-harness result as JSON on stdout.
const batch2 = process.env.FEED_BATCH === "2";
const { getCase } = batch2 ? await import("./feed-cases2.mjs") : await import("./feed-cases.mjs");
import { runFeedCase, FEED_PARSER_VERSION } from "./feed-harness.mjs";

const caseId = process.argv[2];
const c = getCase(caseId);
if (!c) { console.error(`unknown case ${caseId}`); process.exit(2); }
const result = runFeedCase(c.xml, `fixture:${c.id}`);
result.parser_version = FEED_PARSER_VERSION;
process.stdout.write(JSON.stringify(result));
