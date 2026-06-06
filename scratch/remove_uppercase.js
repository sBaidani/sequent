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
        
        // Only process lines that contain font-display
        if (line.includes('font-display')) {
          // Check for uppercase class
          if (line.match(/\buppercase\b/)) {
            line = line.replace(/\s?\buppercase\b/g, '');
            modified = true;
          }
          
          // Check for .toUpperCase()
          if (line.includes('.toUpperCase()')) {
            line = line.replace(/\.toUpperCase\(\)/g, '');
            modified = true;
          }

          lines[i] = line;
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
