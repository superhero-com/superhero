const { publicOrigin } = require('../origin.cjs');

function request(host, secure = false, forwarded = {}) {
  return { secure, get: (name) => ({ host, ...forwarded })[name] };
}

describe('publicOrigin', () => {
  it('keeps production metadata HTTPS behind the HTTP container proxy', () => {
    expect(publicOrigin(request('superhero.com'))).toBe('https://superhero.com');
    expect(publicOrigin(request('www.superhero.com'))).toBe('https://superhero.com');
  });

  it('uses the actual preview host and ignores spoofed forwarded headers', () => {
    expect(publicOrigin(request('pr-680-superhero.stg.service.aepps.com', false, {
      'x-forwarded-host': 'attacker.example',
      'x-forwarded-proto': 'javascript',
    }))).toBe('https://pr-680-superhero.stg.service.aepps.com');
  });

  it.each(['attacker.example', 'superhero.com.attacker.example', 'superhero.com@attacker.example', 'superhero.com/path', 'superhero.com\\@attacker.example', ''])('does not publish an unrecognized Host: %s', (host) => {
    expect(publicOrigin(request(host))).toBe('https://superhero.com');
  });

  it('preserves local development ports and direct TLS', () => {
    expect(publicOrigin(request('localhost:5174'))).toBe('http://localhost:5174');
    expect(publicOrigin(request('127.0.0.1:5174'))).toBe('http://127.0.0.1:5174');
    expect(publicOrigin(request('[::1]:5174', true))).toBe('https://[::1]:5174');
  });

  it('supports an explicitly configured deployment origin', () => {
    expect(publicOrigin(request('internal:80'), 'https://preview.example.com')).toBe('https://preview.example.com');
    expect(() => publicOrigin(request('internal:80'), 'javascript:alert(1)')).toThrow();
    expect(() => publicOrigin(request('internal:80'), 'https://user:password@example.com')).toThrow();
  });
});
