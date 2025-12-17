// This file runs before the app entry (`main.tsx`).
// Some dependencies assume Node's `buffer` module default export has a `.Buffer` property (CJS-like).
// In Vite/browser polyfills, the default export is typically the Buffer constructor itself, so we add `.Buffer = Buffer`.
import BufferPolyfill from 'vite-plugin-node-polyfills/shims/buffer';
import BufferDefault, { Buffer as BufferNamed } from 'buffer';

const candidates = [BufferPolyfill, BufferDefault, BufferNamed, (globalThis as any).Buffer].filter(Boolean);
for (const b of candidates) {
  if (!b.Buffer) b.Buffer = b;
}
(globalThis as any).Buffer = (globalThis as any).Buffer || BufferPolyfill;

// IMPORTANT: dynamic import so the patch runs *before* the app and its deps execute.
void import('./main');


