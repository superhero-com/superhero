/* The policy in server/lib/csp.cjs is a custody-boundary control, so the properties that make
 * it one are asserted here rather than left to the Playwright soak — the soak proves the app
 * runs under the header, not that the header still says what it must. */

// `describe`/`it`/`expect` come from vitest's globals (see vite.config.ts `test.globals: true`).
const { createCspPolicy, isSecureRelayUrl, CSP_REPORT_PATH } = require('../csp.cjs');

/** Directive value by name, e.g. directive(csp, 'connect-src'). */
function directive(csp, name) {
  const found = csp.split('; ').find((part) => part === name || part.startsWith(`${name} `));
  return found === undefined ? undefined : found.slice(name.length).trim();
}

const policy = (env = {}) => createCspPolicy(env).buildCsp('TESTNONCE');

describe('script execution', () => {
  it('admits only the response nonce, never inline or eval', () => {
    // Exact match, not `toContain`: an added source is what would quietly reopen this.
    expect(directive(policy(), 'script-src')).toBe("'strict-dynamic' 'nonce-TESTNONCE'");
    // 'unsafe-inline' is deliberate in style-src and must stay confined to it.
    expect(directive(policy(), 'style-src')).toBe("'self' 'unsafe-inline'");
    expect(policy()).not.toContain('unsafe-eval');
  });

  it('constrains workers explicitly', () => {
    // Without worker-src, worker URLs fall back through child-src to script-src, where
    // 'strict-dynamic' permits any script-initiated request.
    expect(directive(policy(), 'worker-src')).toBe("'self'");
  });

  it('denies by default and closes the classic escape hatches', () => {
    const csp = policy();
    expect(directive(csp, 'default-src')).toBe("'none'");
    expect(directive(csp, 'object-src')).toBe("'none'");
    expect(directive(csp, 'base-uri')).toBe("'none'");
    expect(directive(csp, 'frame-ancestors')).toBe("'none'");
    expect(directive(csp, 'require-trusted-types-for')).toBe("'script'");
    expect(directive(csp, 'trusted-types')).toBe('superhero-dom default');
  });

  it('reports violations under both the modern and legacy directive', () => {
    expect(directive(policy(), 'report-to')).toBe('csp-endpoint');
    expect(directive(policy(), 'report-uri')).toBe(CSP_REPORT_PATH);
  });
});

describe('bridge origins', () => {
  it('stay off the header while the bridge routes redirect away', () => {
    const csp = policy();
    expect(csp).not.toContain('walletconnect.org');
    expect(csp).not.toContain('api.web3modal.org');
    expect(csp).not.toContain('api.ethplorer.io');
  });

  it('arrive together when the bridge is enabled', () => {
    // Ethplorer is a literal in our own source; the Reown origins are only inside
    // @reown/appkit-common. Enabling one without the other is the failure this guards.
    const csp = policy({ AE_ETH_BRIDGE_ENABLED: 'true' });
    const connect = directive(csp, 'connect-src');
    expect(connect).toContain('https://api.ethplorer.io');
    expect(connect).toContain('https://api.web3modal.org');
    expect(connect).toContain('wss://relay.walletconnect.org');
    expect(connect).toContain('https://rpc.walletconnect.org');
    expect(directive(csp, 'frame-src')).toContain('https://verify.walletconnect.org');
  });

  it('is not switched on by a truthy-looking value', () => {
    expect(policy({ AE_ETH_BRIDGE_ENABLED: '1' })).not.toContain('walletconnect.org');
  });
});

describe('relay origins', () => {
  it('accepts the same schemes as the client origin gate', () => {
    expect(isSecureRelayUrl('wss://relay.example.com')).toBe(true);
    expect(isSecureRelayUrl('ws://localhost:7777')).toBe(true);
    expect(isSecureRelayUrl('ws://relay.example.com')).toBe(false);
    expect(isSecureRelayUrl('https://relay.example.com')).toBe(false);
    expect(isSecureRelayUrl('not a url')).toBe(false);
  });

  it('folds a configured relay list into connect-src as origins', () => {
    const connect = directive(
      policy({ NOSTR_RELAY_URLS: 'wss://a.example.com/path, wss://b.example.com' }),
      'connect-src',
    );
    expect(connect).toContain('wss://a.example.com');
    expect(connect).toContain('wss://b.example.com');
  });

  it('drops an insecure relay instead of allowing what the client will refuse', () => {
    const connect = directive(
      policy({ NOSTR_RELAY_URLS: 'ws://remote.example.com,wss://ok.example.com' }),
      'connect-src',
    );
    expect(connect).not.toContain('remote.example.com');
    expect(connect).toContain('wss://ok.example.com');
  });
});

describe('deploy-time overrides', () => {
  it('follows the origins the container is actually pointed at', () => {
    const connect = directive(policy({ NODE_URL: 'https://node.example.com/v3' }), 'connect-src');
    expect(connect).toContain('https://node.example.com');
  });

  it('tracks the configured Jitsi host', () => {
    expect(directive(policy({ JITSI_DOMAIN: 'meet.example.com' }), 'frame-src'))
      .toContain('https://meet.example.com');
    expect(directive(policy(), 'frame-src')).toContain('https://meet.jit.si');
  });
});
