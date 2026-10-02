import { fetchStatic } from "./ladder.mjs";
const MARKERS = [/id=["']root["']>\s*<\/div>/i, /id=["']__next["']/i, /__NEXT_DATA__/i, /ng-app/i, /data-reactroot/i, /id=["']app["']>\s*<\/div>/i];
const strip = (h) => h.replace(/<script[\s>][\s\S]*?<\/script\s*>/gi, " ").replace(/<style[\s>][\s\S]*?<\/style\s*>/gi, " ").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
for (const url of process.argv.slice(2)) {
  try {
    const f = await fetchStatic(url, { maxBytes: 2 * 1024 * 1024, timeoutMs: 15000 }, {});
    if (!f.ok) { console.log(url, "FETCH-FAIL", f.reason); continue; }
    const html = f.bytes.toString("utf8");
    const text = strip(html);
    const markers = MARKERS.filter((re) => re.test(html)).map((r) => r.source.slice(0, 30));
    console.log(url, "| bytes:", f.bytes.length, "| textChars:", text.length, "| markers:", JSON.stringify(markers), "| title:", /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.slice(0, 60));
  } catch (e) { console.log(url, "ERR", e.message.slice(0, 80)); }
}
