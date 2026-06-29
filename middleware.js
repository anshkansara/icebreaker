import { next } from '@vercel/edge';

/*
  Password gate (HTTP Basic Auth) — runs on Vercel's edge before the app loads.
  Set in Vercel → Settings → Environment Variables (then redeploy):
    APP_PASSWORD   (required)  the password people must type
    APP_USER       (optional)  username, defaults to "admin"

  Fails open (no gate) if APP_PASSWORD is unset — so a misconfigured deploy
  won't lock you out.
*/

export const config = {
  matcher: '/((?!_vercel).*)',
};

export default function middleware(request) {
  const expectedUser = process.env.APP_USER || 'admin';
  const expectedPass = process.env.APP_PASSWORD;

  if (!expectedPass) return next();

  const header = request.headers.get('authorization') || '';
  if (header.startsWith('Basic ')) {
    try {
      const decoded = atob(header.slice(6)); // "user:pass"
      const sep = decoded.indexOf(':');
      const user = decoded.slice(0, sep);
      const pass = decoded.slice(sep + 1);
      if (user === expectedUser && pass === expectedPass) return next();
    } catch {
      /* malformed header → fall through to challenge */
    }
  }

  return new Response('Authentication required.', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Icebreaker", charset="UTF-8"' },
  });
}
