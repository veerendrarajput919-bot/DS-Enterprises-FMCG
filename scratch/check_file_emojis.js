const fs = require("fs");
const path = require("path");

const files = process.argv.slice(2);
const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E0}-\u{1F1FF}]/u;

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");
  lines.forEach((line, idx) => {
    if (emojiRegex.test(line)) {
      console.log(`${file}:${idx + 1}: ${line.trim().slice(0, 110)}`);
    }
  });
});

