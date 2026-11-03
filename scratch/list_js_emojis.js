const fs = require("fs");
const path = require("path");

const jsFiles = fs.readdirSync("./assets/js")
  .filter(f => f.endsWith(".js"))
  .map(f => path.join("assets/js", f));

const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E0}-\u{1F1FF}]/u;

jsFiles.forEach(file => {
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");
  const matches = [];
  lines.forEach((line, idx) => {
    if (emojiRegex.test(line)) {
      matches.push({ line: idx + 1, text: line.trim() });
    }
  });
  if (matches.length > 0) {
    console.log(`=== ${file} (${matches.length} matches) ===`);
    matches.slice(0, 15).forEach(m => console.log(`  ${m.line}: ${m.text.slice(0, 100)}`));
    if (matches.length > 15) console.log(`  ... and ${matches.length - 15} more`);
  }
});

