#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const docsDir = resolve(__dirname, '../docs');

// Pattern to match markdown links with .md extension (but not external URLs)
const linkPattern = /(\[[^\]]+\]\()(\.\.?\/[^)]+)(\.md)(#?[^)]*)(\))/g;

function processFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  let modified = false;
  
  // Replace internal .md links (but keep external https:// links)
  const newContent = content.replace(linkPattern, (match, prefix, path, mdExt, anchor, suffix) => {
    // Only remove .md from relative paths (./ or ../)
    if (path.startsWith('./') || path.startsWith('../')) {
      modified = true;
      return `${prefix}${path}${anchor}${suffix}`;
    }
    return match;
  });
  
  if (modified) {
    writeFileSync(filePath, newContent, 'utf-8');
    return true;
  }
  return false;
}

// Find all markdown files
const mdFiles = glob.sync('**/*.md', { cwd: docsDir, ignore: ['**/_archive/**'] });

console.log(`Processing ${mdFiles.length} markdown files...\n`);

let modifiedCount = 0;
mdFiles.forEach(file => {
  const fullPath = join(docsDir, file);
  if (processFile(fullPath)) {
    console.log(`✓ Updated: ${file}`);
    modifiedCount++;
  }
});

console.log(`\n✅ Updated ${modifiedCount} file(s)`);

