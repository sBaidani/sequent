const fs = require('fs');
const path = require('path');

const directory = './src';
const fileExts = ['.jsx', '.tsx', '.js', '.ts'];

const headerPatterns = [
  /<h[1-6][^>]*class(Name)?=["'][^"']*["']/g,
  /class(Name)?=["'][^"']*\btext-(xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)\b[^"']*["']/g,
  /class(Name)?=["'][^"']*\btext-\[[0-9]+px\]\b[^"']*\bfont-(bold|extrabold)\b[^"']*["']/g,
  /class(Name)?=["'][^"']*\buppercase\b[^"']*\btracking-(wide|wider|widest)\b[^"']*["']/g,
];

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
        let isMatch = false;
        for (const pattern of headerPatterns) {
          if (line.match(pattern)) {
            isMatch = true;
            break;
          }
        }
        if (isMatch && !line.includes('font-display')) {
          // Add font-display after class=" or className=" or class={` or class='
          lines[i] = line.replace(/(class(Name)?=(["'`{]))/, '$1font-display ');
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
