const fs = require('fs');

async function parseLinks() {
  const fileContent = fs.readFileSync('C:\\Users\\sadiq\\.gemini\\antigravity\\brain\\f28b460e-883b-49f8-9d59-e73d301b2d93\\.system_generated\\steps\\538\\content.md', 'utf8');
  const links = [];
  const regex = /href="(\/support\/timepage\/[^"]+)"/g;
  let match;
  while ((match = regex.exec(fileContent)) !== null) {
    links.push(match[1]);
  }
  const uniqueLinks = [...new Set(links)];
  console.log(uniqueLinks.join('\n'));
}

parseLinks();
