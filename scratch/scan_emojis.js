const fs = require("fs");
const path = require("path");

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith(".html") || file.endsWith(".js")) {
      results.push(file);
    }
  });
  return results;
}

const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E0}-\u{1F1FF}]/u;

const files = walk("./pages").concat(walk("./components")).concat(walk("./assets/js"));

let matchCount = 0;
files.forEach(file => {
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");
  lines.forEach((line, idx) => {
    if (emojiRegex.test(line)) {
      matchCount++;
      console.log(`${file}:${idx + 1}: ${line.trim().slice(0, 100)}`);
    }
  });
});

console.log(`\nTotal lines with emojis found: ${matchCount}`);

