#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const pluginsDir = path.join(root, 'src', 'plugins');

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function check() {
  if (!fs.existsSync(pluginsDir)) return 0;
  const files = walk(pluginsDir).filter((p) => 
    /index\.tsx?$/.test(p) && !/[/\\]locales[/\\]/.test(p)
  );
  let errors = 0;
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    if (!src.includes('definePlugin')) {
      console.error(`[ext-check] ${f} does not export a plugin via definePlugin`);
      errors += 1;
    }
    if (!/capabilities:\s*\[/.test(src)) {
      console.error(`[ext-check] ${f} missing capabilities declaration`);
      errors += 1;
    }
  }
  return errors;
}

const errs = check();
if (errs > 0) {
  console.error(`[ext-check] Failed with ${errs} error(s)`);
  process.exit(1);
} else {
  console.log('[ext-check] OK');
}


