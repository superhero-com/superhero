// Resolve through the server/Express installation so this also checks the
// standalone server lock when it is installed, not an unrelated root package.
const { createRequire } = require('node:module');
const { resolve } = require('node:path');

const serverRequire = createRequire(resolve(__dirname, '../../index.cjs'));
const expressRequire = createRequire(serverRequire.resolve('express'));
const proxyaddr = expressRequire('proxy-addr');
const qs = expressRequire('qs');

describe('HTTP server dependency boundaries', () => {
  it('does not trust IPv4 clients through an unrelated short IPv6 prefix', () => {
    const trust = proxyaddr.compile('::ffff:10.0.0.0/8');
    expect(trust('203.0.113.10')).toBe(false);
    const correctTrust = proxyaddr.compile('::ffff:10.0.0.0/104');
    expect(correctTrust('10.1.2.3')).toBe(true);
    expect(correctTrust('203.0.113.10')).toBe(false);
  });

  it('can serialize query input containing a non-callable isBuffer property', () => {
    const parsed = qs.parse('item[constructor][isBuffer]=value', { plainObjects: true });
    expect(() => qs.stringify(parsed)).not.toThrow();
    expect(qs.parse('topic=art&language=en')).toEqual({ topic: 'art', language: 'en' });
  });

  it('enforces the array limit for comma-separated bracket keys', () => {
    const options = { comma: true, arrayLimit: 3, throwOnLimitExceeded: true };
    expect(() => qs.parse('items[]=one,two,three,four', options)).toThrow(RangeError);
    expect(qs.parse('items[]=one,two', options).items.flat()).toEqual(['one', 'two']);
  });
});
