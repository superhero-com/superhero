#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const name = (process.argv[2] || '').trim();
if (!name) {
  console.error('Usage: node scripts/ext-scaffold.mjs <extension-id>');
  process.exit(1);
}

const baseDir = path.join(root, 'src', 'plugins', name);
const uiDir = path.join(baseDir, 'ui');

fs.mkdirSync(uiDir, { recursive: true });

const indexContent = `import React from 'react';
import { definePlugin } from '@/plugin-sdk';
import App from './ui/App';

export default definePlugin({
  meta: {
    id: '${name}',
    name: '${name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}',
    version: '0.1.0',
    apiVersion: '1.x',
    capabilities: ['routes'],
    description: '${name} extension',
  },
  setup({ register }) {
    register({
      routes: [{ path: '/${name}', element: <App /> }],
      menu: [{ id: '${name}', label: '${name.toUpperCase()}', path: '/${name}', icon: '🧩' }],
    });
  },
});
`;

const uiContent = `import React from 'react';

export default function App() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">${name}</h1>
      <p>New Superhero App Extension scaffolded.</p>
    </div>
  );
}
`;

const indexPath = path.join(baseDir, 'index.tsx');
const uiPath = path.join(uiDir, 'App.tsx');

if (!fs.existsSync(indexPath)) fs.writeFileSync(indexPath, indexContent, 'utf8');
if (!fs.existsSync(uiPath)) fs.writeFileSync(uiPath, uiContent, 'utf8');

console.log(`Scaffolded extension at ${baseDir}`);


