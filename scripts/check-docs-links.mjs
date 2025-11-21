#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const docsDir = resolve(__dirname, '../docs');

// Patterns to match markdown links
const linkPatterns = [
  /\[([^\]]+)\]\(([^)]+)\)/g, // [text](url)
  /\[([^\]]+)\]\(([^)]+)#([^)]+)\)/g, // [text](url#anchor)
];

// Patterns for URLs that should be ignored (external URLs, code blocks, etc.)
const ignorePatterns = [
  /^https?:\/\//, // External URLs
  /^mailto:/, // Email links
  /^#/, // Anchors only
  /^\.\.\/\.\./, // Too many parent directories (likely wrong)
];

const issues = [];

function checkFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const fileDir = dirname(filePath);
  const relativePath = filePath.replace(docsDir + '/', '');
  
  // Check for localhost URLs (should only be in README.md or code examples)
  const localhostMatches = content.match(/http:\/\/localhost:\d+/g);
  if (localhostMatches && !filePath.includes('README.md') && !filePath.includes('configure-cursor.md')) {
    localhostMatches.forEach(match => {
      // Check if it's in a code block
      const lines = content.split('\n');
      const matchLine = lines.findIndex(line => line.includes(match));
      if (matchLine !== -1) {
        // Check if it's in a code block
        let inCodeBlock = false;
        for (let i = 0; i < matchLine; i++) {
          if (lines[i].trim().startsWith('```')) {
            inCodeBlock = !inCodeBlock;
          }
        }
        if (!inCodeBlock) {
          issues.push({
            file: relativePath,
            line: matchLine + 1,
            type: 'localhost_url',
            issue: `Found localhost URL outside code block: ${match}`,
            severity: 'warning'
          });
        }
      }
    });
  }
  
  // Extract all markdown links
  let match;
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  while ((match = linkRegex.exec(content)) !== null) {
    const [, linkText, linkUrl] = match;
    
    // Skip external URLs and anchors
    if (ignorePatterns.some(pattern => pattern.test(linkUrl))) {
      continue;
    }
    
    // Skip if it's in a code block
    const lines = content.split('\n');
    const matchLine = lines.findIndex(line => line.includes(match[0]));
    if (matchLine !== -1) {
      let inCodeBlock = false;
      for (let i = 0; i < matchLine; i++) {
        if (lines[i].trim().startsWith('```')) {
          inCodeBlock = !inCodeBlock;
        }
      }
      if (inCodeBlock) {
        continue;
      }
    }
    
    // Resolve relative path
    let targetPath;
    if (linkUrl.startsWith('/')) {
      // Absolute path from docs root
      targetPath = join(docsDir, linkUrl);
    } else {
      // Relative path
      targetPath = resolve(fileDir, linkUrl);
    }
    
    // Remove anchor if present
    const [pathPart, anchor] = targetPath.split('#');
    const cleanPath = pathPart;
    
    // Check if file exists
    let exists = existsSync(cleanPath);
    
    // Try with .md extension if it doesn't exist (for links without extension)
    if (!exists && !cleanPath.endsWith('.md')) {
      exists = existsSync(cleanPath + '.md');
    }
    
    // Try without .md extension if it ends with .md (for backward compatibility)
    if (!exists && cleanPath.endsWith('.md')) {
      exists = existsSync(cleanPath.replace(/\.md$/, ''));
    }
    
    // Also try as directory with index.md (for links without extension)
    if (!exists && !cleanPath.endsWith('.md')) {
      exists = existsSync(join(cleanPath, 'index.md'));
    }
    
    if (!exists) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      issues.push({
        file: relativePath,
        line: lineNum,
        type: 'broken_link',
        issue: `Broken link: [${linkText}](${linkUrl})`,
        target: linkUrl,
        severity: 'error'
      });
    }
  }
}

// Find all markdown files
const mdFiles = glob.sync('**/*.md', { cwd: docsDir, ignore: ['**/_archive/**'] });

console.log(`Checking ${mdFiles.length} markdown files...\n`);

mdFiles.forEach(file => {
  const fullPath = join(docsDir, file);
  checkFile(fullPath);
});

// Report issues
if (issues.length === 0) {
  console.log('✅ No broken links found!');
  process.exit(0);
} else {
  console.log(`❌ Found ${issues.length} issue(s):\n`);
  
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  
  if (errors.length > 0) {
    console.log('Errors:');
    errors.forEach(issue => {
      console.log(`  ${issue.file}:${issue.line} - ${issue.issue}`);
      if (issue.target) {
        console.log(`    → ${issue.target}`);
      }
    });
    console.log('');
  }
  
  if (warnings.length > 0) {
    console.log('Warnings:');
    warnings.forEach(issue => {
      console.log(`  ${issue.file}:${issue.line} - ${issue.issue}`);
    });
    console.log('');
  }
  
  process.exit(errors.length > 0 ? 1 : 0);
}

