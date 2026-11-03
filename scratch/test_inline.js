const fs = require('fs');
const content = fs.readFileSync('pages/route-analysis.html', 'utf8');
const match = content.match(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/i);
if (match) {
  const code = match[1];
  fs.writeFileSync('scratch/route_inline.js', code, 'utf8');
  console.log('Wrote scratch/route_inline.js');
}

