import type { CookieOptions, Request } from 'express';

export const SESSION_COOKIE = 'access_token';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Session cookie options. `secure` follows the protocol of each request: the same
 * installation is opened via the SSL domain (Nginx Proxy Manager → https) and via the
 * container IP (http). A `secure` cookie over http is never stored — login
 * seemed to work and the next request returned 401.
 *
 * `req.secure` only reflects the proxy's https because main.ts trusts the local nginx
 * (`trust proxy`) and that nginx forwards the X-Forwarded-Proto sent by NPM.
 *
 * Logout must use the same options, otherwise the browser doesn't recognise the cookie
 * to delete.
 */
export function sessionCookieOptions(req: Request): CookieOptions {
  return {
    httpOnly: true,
    secure: req.secure,
    sameSite: 'strict',
    path: '/',
  };
}

export const SESSION_MAX_AGE_MS = SEVEN_DAYS_MS;
