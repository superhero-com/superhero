#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Migration patterns for Redux to hooks
const migrations = [
  // Import replacements
  {
    pattern: /import\s*{\s*useDispatch,\s*useSelector\s*}\s*from\s*['"]react-redux['"];?\n/g,
    replacement: ''
  },
  {
    pattern: /import\s*{\s*useSelector,\s*useDispatch\s*}\s*from\s*['"]react-redux['"];?\n/g,
    replacement: ''
  },
  {
    pattern: /import\s*{\s*useDispatch\s*}\s*from\s*['"]react-redux['"];?\n/g,
    replacement: ''
  },
  {
    pattern: /import\s*{\s*useSelector\s*}\s*from\s*['"]react-redux['"];?\n/g,
    replacement: ''
  },
  {
    pattern: /import\s+type\s*{\s*RootState,?\s*AppDispatch\s*}\s*from\s*['"][^'"]*store\/store['"];?\n/g,
    replacement: ''
  },
  {
    pattern: /import\s+type\s*{\s*AppDispatch,?\s*RootState\s*}\s*from\s*['"][^'"]*store\/store['"];?\n/g,
    replacement: ''
  },
  {
    pattern: /import\s+type\s*{\s*RootState\s*}\s*from\s*['"][^'"]*store\/store['"];?\n/g,
    replacement: ''
  },
  {
    pattern: /import\s+type\s*{\s*AppDispatch\s*}\s*from\s*['"][^'"]*store\/store['"];?\n/g,
    replacement: ''
  },
  
  // Hook usage replacements
  {
    pattern: /const\s+dispatch\s*=\s*useDispatch<AppDispatch>\(\);?\n?/g,
    replacement: ''
  },
  {
    pattern: /const\s+dispatch\s*=\s*useDispatch\(\);?\n?/g,
    replacement: ''
  },
  
  // Common selector patterns
  {
    pattern: /useSelector\(\(s:\s*RootState\)\s*=>\s*s\.root\.address\)/g,
    replacement: 'useWallet().address'
  },
  {
    pattern: /useSelector\(\(s:\s*RootState\)\s*=>\s*s\.root\.balance\)/g,
    replacement: 'useWallet().balance'
  },
  {
    pattern: /useSelector\(\(s:\s*RootState\)\s*=>\s*s\.root\.chainNames\)/g,
    replacement: 'useWallet().chainNames'
  },
  {
    pattern: /useSelector\(\(s:\s*RootState\)\s*=>\s*s\.root\.selectedCurrency\)/g,
    replacement: 'useWallet().selectedCurrency'
  },
  {
    pattern: /useSelector\(\(s:\s*RootState\)\s*=>\s*s\.root\.tokenBalances\)/g,
    replacement: 'useWallet().tokenBalances'
  },
  {
    pattern: /useSelector\(\(s:\s*RootState\)\s*=>\s*s\.root\.tokenPrices\)/g,
    replacement: 'useWallet().tokenPrices'
  },
  {
    pattern: /useSelector\(\(s:\s*RootState\)\s*=>\s*s\.root\.isNewAccount\)/g,
    replacement: 'useWallet().isNewAccount'
  },
  {
    pattern: /useSelector\(\(s:\s*RootState\)\s*=>\s*s\.modals\.opened\)/g,
    replacement: 'useModal().openedModals'
  },
  {
    pattern: /useSelector\(\(s:\s*RootState\)\s*=>\s*s\.dex\.slippagePct\)/g,
    replacement: 'useDex().slippagePct'
  },
  {
    pattern: /useSelector\(\(s:\s*RootState\)\s*=>\s*s\.dex\.deadlineMins\)/g,
    replacement: 'useDex().deadlineMins'
  },
  {
    pattern: /useSelector\(\(s:\s*RootState\)\s*=>\s*s\.txQueue\.entries\)/g,
    replacement: 'useTxQueue().entries'
  },
  
  // Dispatch patterns
  {
    pattern: /dispatch\(([^)]+)\)/g,
    replacement: (match, action) => {
      // Handle different action types
      if (action.includes('setAddress')) return action.replace('setAddress', 'setAddress');
      if (action.includes('open(')) return action.replace('open', 'openModal');
      if (action.includes('close(')) return action.replace('close', 'closeModal');
      if (action.includes('upsert(')) return action.replace('upsert', 'upsertEntry');
      if (action.includes('clear(')) return action.replace('clear', 'clearEntry');
      return match; // Keep unchanged if no pattern matches
    }
  }
];

// Add import for hooks when needed
function addHooksImport(content, filename) {
  const needsWallet = content.includes('useWallet()');
  const needsModal = content.includes('useModal()');
  const needsDex = content.includes('useDex()');
  const needsTxQueue = content.includes('useTxQueue()');
  const needsAeternity = content.includes('useAeternity()');
  const needsBackend = content.includes('useBackend()');
  const needsGovernance = content.includes('useGovernance()');
  
  const hooks = [];
  if (needsWallet) hooks.push('useWallet');
  if (needsModal) hooks.push('useModal');
  if (needsDex) hooks.push('useDex');
  if (needsTxQueue) hooks.push('useTxQueue');
  if (needsAeternity) hooks.push('useAeternity');
  if (needsBackend) hooks.push('useBackend');
  if (needsGovernance) hooks.push('useGovernance');
  
  if (hooks.length > 0) {
    const importPath = filename.includes('/hooks/') ? './index' : '../hooks';
    const hooksImport = `import { ${hooks.join(', ')} } from '${importPath}';\n`;
    
    // Add import after existing imports
    const importRegex = /(import[^;]+;[\n\r]*)+/;
    if (importRegex.test(content)) {
      content = content.replace(importRegex, (match) => match + hooksImport);
    } else {
      content = hooksImport + content;
    }
  }
  
  return content;
}

// Process a single file
function migrateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    
    // Apply all migration patterns
    for (const migration of migrations) {
      const newContent = content.replace(migration.pattern, migration.replacement);
      if (newContent !== content) {
        content = newContent;
        changed = true;
      }
    }
    
    // Add hooks import if needed
    if (changed) {
      content = addHooksImport(content, filePath);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Migrated: ${filePath}`);
    }
    
    return changed;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Find all TypeScript/React files
function findFiles(dir, extensions = ['.tsx', '.ts']) {
  const files = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules and build directories
        if (!['node_modules', 'dist', 'build', '.git'].includes(item)) {
          traverse(fullPath);
        }
      } else if (extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

// Main execution
const srcDir = path.join(__dirname, 'src');
const files = findFiles(srcDir);

console.log(`🔄 Starting Redux to Hooks migration for ${files.length} files...`);

let migratedCount = 0;
for (const file of files) {
  if (migrateFile(file)) {
    migratedCount++;
  }
}

console.log(`\n🎉 Migration complete! Migrated ${migratedCount} files.`);
console.log('\n⚠️  Manual review required for:');
console.log('- Complex selector logic');
console.log('- Async thunk calls');
console.log('- Custom dispatch patterns');
console.log('- Component prop types that reference Redux types');
