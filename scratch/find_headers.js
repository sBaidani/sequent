const fs = require('fs');
const path = require('path');

const directory = './src';
const fileExts = ['.jsx', '.tsx', '.js', '.ts'];

const headerPatterns = [
  /<h[1-6][^>]*class(Name)?=["'][^"']*["']/g, // h1-h6 tags with class
  /class(Name)?=["'][^"']*\btext-(xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)\b[^"']*["']/g, // large text
  /class(Name)?=["'][^"']*\btext-\[[0-9]+px\]\b[^"']*\bfont-(bold|extrabold)\b[^"']*["']/g, // custom large text
  /class(Name)?=["'][^"']*\buppercase\b[^"']*\btracking-(wide|wider|widest)\b[^"']*["']/g, // uppercase tracking things
];

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath);
    } else if (fileExts.includes(path.extname(fullPath))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        let isMatch = false;
        for (const pattern of headerPatterns) {
          if (pattern.test(line)) {
            isMatch = true;
            break;
          }
        }
        if (isMatch && !line.includes('font-display')) {
          console.log(`File: ${fullPath}, Line ${i + 1}: ${line.trim()}`);
        }
      });
    }
  }
}

scanDir(directory);
