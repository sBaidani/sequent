const fs = require('fs');
const path = require('path');

const directory = './src';
const fileExts = ['.jsx', '.tsx', '.js', '.ts'];

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath);
    } else if (fileExts.includes(path.extname(fullPath))) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let lines = content.split('\n');
      let modified = false;

      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        
        if (line.includes('font-display') && !line.match(/\blowercase\b/)) {
          lines[i] = line.replace(/font-display/g, 'font-display lowercase');
          modified = true;
        }
      }

      if (modified) {
        fs.writeFileSync(fullPath, lines.join('\n'), 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

scanDir(directory);
