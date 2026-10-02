const fs = require("fs");

// Reuse the served proof's <style> block byte-verbatim (tokens untouched by
// this lane); swap in the re-rendered body.
const oldFull = fs.readFileSync("/tmp/coppersmith-proof-full.html", "utf8");
const styleStart = oldFull.indexOf("<style>") + "<style>".length;
const styleEnd = oldFull.indexOf("</style>");
const style = oldFull.slice(styleStart, styleEnd);

const body = fs.readFileSync("/tmp/coppersmith-proof-body.html", "utf8");

const fullHtml =
  "<!DOCTYPE html>\n" +
  '<html lang="en">\n' +
  "<head>\n" +
  '<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
  "<title>Coppersmith Plumbing - HVAC - Mechanical</title>\n" +
  "<style>" + style + "</style>\n" +
  "</head>\n" +
  "<body>" + body + "</body>\n" +
  "</html>";

fs.writeFileSync("/tmp/coppersmith-proof-full.html", fullHtml);
console.log("full html bytes:", Buffer.byteLength(fullHtml));
console.log("style bytes:", Buffer.byteLength(style), "| body bytes:", Buffer.byteLength(body));
