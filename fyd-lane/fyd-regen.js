/* Regenerate the PING event registry from the repo's authorities + intents.
 * Runs ON THE PIG with cwd=/home/nolan/ping/gateway (so require("yaml") resolves).
 * Prints before/after counts and whether FYD_SITE_OVERLAY is present.
 */
const fs = require("fs");
const { EventGenerator } = require("/home/nolan/ping/gateway/generated/event_generator.js");
const ROOT = "/home/nolan/ping";
const OUT = ROOT + "/gateway/generated/event_registry.json";
const before = JSON.parse(fs.readFileSync(OUT, "utf8"));
const g = new EventGenerator(ROOT);
const reg = g.write(OUT);
const after = JSON.parse(fs.readFileSync(OUT, "utf8"));
console.log(JSON.stringify({
  before_count: before.count,
  after_count: after.count,
  fyd_present: after.events.some(e => e.event_type === "FYD_SITE_OVERLAY"),
  fyd_entry: after.events.find(e => e.event_type === "FYD_SITE_OVERLAY") || null
}, null, 1));
