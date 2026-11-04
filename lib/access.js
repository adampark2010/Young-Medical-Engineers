/* Cloudflare Access, for the admin pages. When ACCESS_TEAM_DOMAIN and ACCESS_AUD are set, Cloudflare
   asks who someone is (a one-time code emailed to them, or Google) before anything under /admin reaches
   the Worker, and adds a signed token to the request (the Cf-Access-Jwt-Assertion header). This checks
   that token here as well, so nothing gets in without it, even through an address Access doesn't cover.
   The token's signature, audience, issuer and expiry are all checked; any doubt means no. */

const keyCache = new Map(); /* certs URL -> { at, keys }; Access rotates its keys, so they are refetched */
const KEY_AGE = 10 * 60 * 1000;
const SKEW = 60; /* seconds of clock difference allowed */

export function accessOn(env) {
  return Boolean(String(env.ACCESS_TEAM_DOMAIN || '').trim() && String(env.ACCESS_AUD || '').trim());
}

/* ADMIN_EMAILS: the email addresses allowed in, separated by commas or new lines (not case-sensitive). */
export function adminEmails(env) {
  return new Set(String(env.ADMIN_EMAILS || '').split(/[\s,]+/).map(e => e.trim().toLowerCase()).filter(e => e.includes('@')));
}

/* "yme.cloudflareaccess.com", also when pasted as a full address */
function team(env) {
  return String(env.ACCESS_TEAM_DOMAIN).trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase();
}

function bytes(base64url) {
  const b64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)), c => c.charCodeAt(0));
}
const decode = part => JSON.parse(new TextDecoder().decode(bytes(part)));

async function signingKey(url, kid, fetcher) {
  for (const fresh of [false, true]) {
    let entry = keyCache.get(url);
    if (fresh || !entry || Date.now() - entry.at > KEY_AGE) {
      const res = await fetcher(url);
      if (!res.ok) throw Error('Access keys unavailable');
      const keys = new Map();
      for (const jwk of (await res.json()).keys || []) {
        if (jwk.kty !== 'RSA' || !jwk.kid) continue;
        keys.set(jwk.kid, await crypto.subtle.importKey('jwk', { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
          { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']));
      }
      entry = { at: Date.now(), keys };
      keyCache.set(url, entry);
    }
    if (entry.keys.has(kid)) return entry.keys.get(kid);
    if (fresh) return null;
  }
  return null;
}

/* The signed-in person's email address (lower case) when the request carries a valid Access token, otherwise null. */
export async function accessEmail(request, env, fetcher = globalThis.fetch) {
  const token = request.headers.get('cf-access-jwt-assertion') || '';
  const parts = token.split('.');
  if (parts.length !== 3 || token.length > 16384) return null;
  try {
    const header = decode(parts[0]), claims = decode(parts[1]);
    if (header.alg !== 'RS256' || typeof header.kid !== 'string') return null;
    const issuer = `https://${team(env)}`;
    const key = await signingKey(`${issuer}/cdn-cgi/access/certs`, header.kid, fetcher);
    if (!key) return null;
    const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    if (!(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, bytes(parts[2]), signed))) return null;
    const now = Date.now() / 1000;
    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!audiences.includes(String(env.ACCESS_AUD).trim())) return null;
    if (claims.iss !== issuer) return null;
    if (typeof claims.exp !== 'number' || claims.exp < now - SKEW) return null;
    if (typeof claims.nbf === 'number' && claims.nbf > now + SKEW) return null;
    return typeof claims.email === 'string' && claims.email.includes('@') ? claims.email.trim().toLowerCase() : null;
  } catch {
    return null;
  }
}
