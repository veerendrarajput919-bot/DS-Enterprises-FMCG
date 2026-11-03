const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const pagesDir = 'pages';
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html'));
files.push('../index.html');

let totalScripts = 0;
let errors = 0;

files.forEach(file => {
  const filePath = file.startsWith('..') ? 'index.html' : path.join(pagesDir, file);
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const scripts = content.match(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gi) || [];
  
  scripts.forEach((s, idx) => {
    const code = s.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
    const tmpFile = path.join('scratch', `inline_${path.basename(file, '.html')}_${idx}.js`);
    fs.writeFileSync(tmpFile, code, 'utf8');
    totalScripts++;
    try {
      execSync(`node -c "${tmpFile}"`);
    } catch (err) {
      console.error(`SYNTAX ERROR in ${filePath} script #${idx}:`, err.message);
      errors++;
    }
  });
});

console.log(`\nAudited ${totalScripts} inline scripts across all HTML pages. Total errors: ${errors}`);

