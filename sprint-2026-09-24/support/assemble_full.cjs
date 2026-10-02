const fs = require("fs");

const tokensCss = fs.readFileSync("/home/nolan/worktrees/fyd-family-converge/fyd-product-lane/builder/tokens/out/coppersmith.tokens.css", "utf8");
const themeCss = fs.readFileSync("/home/nolan/worktrees/fyd-family-converge/fyd-product-lane/builder/tokens/out/coppersmith.tailwind-theme.css", "utf8");
const bodyHtml = fs.readFileSync("/tmp/coppersmith-proof.html", "utf8").replace("<!DOCTYPE html>", "");

// The rendered div has data-theme="hpp", change to coppersmith to match tokens
const themedBody = bodyHtml.replace('data-theme="hpp"', 'data-theme="coppersmith"');

const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Coppersmith Plumbing - HVAC - Mechanical</title>
<style>${tokensCss}
${themeCss}</style>
</head>
<body>${themedBody}</body>
</html>`;

fs.writeFileSync("/tmp/coppersmith-proof-full.html", fullHtml);
console.log("full html:", fullHtml.length, "chars");
