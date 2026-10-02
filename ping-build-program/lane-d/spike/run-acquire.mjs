#!/usr/bin/env node
/** CLI: node run-acquire.mjs <url>  -> JSON observation on stdout. */
import { acquire } from "./ladder.mjs";

const url = process.argv[2];
if (!url) { console.error("usage: node run-acquire.mjs <url>"); process.exit(2); }
const obs = await acquire(url, { maxBytes: 5 * 1024 * 1024, timeoutMs: 20000, maxRedirects: 5 });
console.log(JSON.stringify(obs, null, 2));
