const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
const prims = ['createSignal', 'createEffect', 'createMemo', 'onMount', 'onCleanup', 'Show', 'For', 'Switch', 'Match', 'Portal'];
let errors = [];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  prims.forEach(p => {
    // Check if primitive is used in code (crude but usually effective)
    const usedRegex = new RegExp('\\b' + p + '\\b');
    // Remove imports first to check usage
    const contentWithoutImports = content.replace(/import\s+.*?from\s+['"].*?['"];?/gs, '');
    
    if (usedRegex.test(contentWithoutImports)) {
      // It is used. Check if it's imported
      const importRegexSolidJs = new RegExp('import\\s*\\{[^}]*\\b' + p + '\\b[^}]*\\}\\s*from\\s*[\'"`]solid-js[\'"`]');
      const importRegexSolidJsWeb = new RegExp('import\\s*\\{[^}]*\\b' + p + '\\b[^}]*\\}\\s*from\\s*[\'"`]solid-js/web[\'"`]');
      
      if (!importRegexSolidJs.test(content) && !importRegexSolidJsWeb.test(content)) {
         errors.push(file + ' might be missing import for: ' + p);
      }
    }
  });
});

if (errors.length > 0) {
  console.log(errors.join('\n'));
} else {
  console.log('All good!');
}
