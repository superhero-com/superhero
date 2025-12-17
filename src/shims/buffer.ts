// Some deps (notably `@aeternity/aepp-sdk`) do:
//   import _buffer from "buffer";
//   const { Buffer } = _buffer;
//
// In browser builds the polyfill's default export is the Buffer constructor itself.
// We make that constructor also expose a `.Buffer` property pointing to itself so both patterns work.
import BufferPolyfill from 'vite-plugin-node-polyfills/shims/buffer';

const BufferCtor = BufferPolyfill as typeof BufferPolyfill & { Buffer?: typeof BufferPolyfill };
BufferCtor.Buffer ??= BufferCtor;

export const Buffer = BufferCtor;
export default BufferCtor;


