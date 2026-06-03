const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

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

const files = walk(srcDir);

files.forEach(file => {
  // Skip Sidebar and SidebarHeatmap entirely so they stay dark
  if (file.includes('Sidebar.jsx') || file.includes('SidebarHeatmap.jsx')) {
    // Revert Sidebar.jsx
    if (file.includes('Sidebar.jsx')) {
      let content = fs.readFileSync(file, 'utf8');
      content = content
        .replace(/bg-bg-theme/g, 'bg-black')
        .replace(/border-border-theme/g, 'border-white/10')
        .replace(/text-text-primary/g, 'text-white')
        .replace(/bg-text-primary\/5/g, 'bg-white/5')
        .replace(/bg-text-primary\/10/g, 'bg-white/10')
        .replace(/bg-text-primary\/20/g, 'bg-white/20');
      fs.writeFileSync(file, content);
      console.log(`Reverted Sidebar.jsx`);
    }
    return;
  }

  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // Replacements
  content = content
    .replace(/text-white\/([0-9]+)/g, 'text-text-primary/$1')
    .replace(/text-white/g, 'text-text-primary')
    .replace(/bg-white\/\[0\.02\]/g, 'bg-card')
    .replace(/bg-white\/([0-9]+)/g, 'bg-text-primary/$1')
    .replace(/bg-white/g, 'bg-card')
    .replace(/border-white\/([0-9]+)/g, 'border-border-theme')
    .replace(/border-white/g, 'border-text-primary')
    .replace(/ring-white\/([0-9]+)/g, 'ring-border-theme')
    .replace(/bg-black\/([0-9]+)/g, 'bg-bg-theme/$1')
    .replace(/bg-black/g, 'bg-bg-theme')
    .replace(/text-black/g, 'text-bg-theme')
    .replace(/bg-\[\#222\]/g, 'bg-card')
    .replace(/border-\[\#333\]/g, 'border-border-theme');

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});
