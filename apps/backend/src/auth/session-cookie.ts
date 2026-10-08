import type { CookieOptions, Request } from 'express';

export const SESSION_COOKIE = 'access_token';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Opções do cookie de sessão. O `secure` segue o protocolo de cada pedido: a mesma
 * instalação é aberta pelo domínio com SSL (Nginx Proxy Manager → https) e pelo IP do
 * container (http). Um cookie `secure` em http nunca chega a ser guardado — o login
 * parecia funcionar e o pedido seguinte dava 401.
 *
 * `req.secure` só reflete o https do proxy porque o main.ts confia no nginx local
 * (`trust proxy`) e esse nginx passa adiante o X-Forwarded-Proto que o NPM enviou.
 *
 * O logout tem de usar as mesmas opções, senão o browser não reconhece o cookie a
 * apagar.
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
