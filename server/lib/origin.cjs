const PRODUCTION_ORIGIN = 'https://superhero.com';

// Caddy terminates TLS before forwarding HTTP to the container. Public URLs must
// not inherit that internal protocol, or trust client-supplied forwarded headers.
// Other public deployment domains can opt in with a fixed PUBLIC_ORIGIN.
function publicOrigin(req, configuredOrigin) {
  if (configuredOrigin) {
    const configured = new URL(configuredOrigin);
    if (!['https:', 'http:'].includes(configured.protocol) || configured.username || configured.password) {
      throw new Error('PUBLIC_ORIGIN must be an HTTP(S) origin without credentials');
    }
    return configured.origin;
  }

  const host = req.get('host') || '';
  // Host is an authority, never a URL. Reject characters URL would normalize into
  // credentials, a path, or a fragment before attempting to parse it.
  if (!host || /[\s/@\\?#]/.test(host)) return PRODUCTION_ORIGIN;
  let url;
  try {
    url = new URL(`https://${host}`);
  } catch {
    return PRODUCTION_ORIGIN;
  }

  const hostname = url.hostname;
  if (hostname === 'superhero.com' || hostname === 'www.superhero.com') return PRODUCTION_ORIGIN;
  if (hostname.endsWith('.superhero.com') || hostname.endsWith('.stg.service.aepps.com')) {
    return `https://${hostname}`;
  }
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]') {
    return `${req.secure ? 'https' : 'http'}://${url.host}`;
  }
  return PRODUCTION_ORIGIN;
}

module.exports = { publicOrigin };
