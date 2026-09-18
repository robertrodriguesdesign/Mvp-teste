export const config = {
  matcher: ['/admin', '/admin/:path*', '/api/leads', '/api/leads/:path*'],
};

const COOKIE_NAME = 'fihan_os_session';

function readCookie(header, name) {
  if (!header) return null;
  const match = header.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : null;
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

// verifica o cookie assinado (HMAC via Web Crypto — middleware roda no Edge,
// sem acesso ao módulo `crypto` do Node usado em api/admin-login.js)
async function verifySession(token, secret) {
  if (!token) return false;
  const sep = token.indexOf('.');
  if (sep === -1) return false;

  const expiry = Number(token.slice(0, sep));
  const signature = token.slice(sep + 1);
  if (!expiry || Date.now() > expiry) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  try {
    return await crypto.subtle.verify('HMAC', key, hexToBytes(signature), new TextEncoder().encode(String(expiry)));
  } catch {
    return false;
  }
}

export default async function middleware(request) {
  const { pathname } = new URL(request.url);

  // tela de login fica pública (senão ninguém consegue logar)
  if (pathname === '/admin/login') return;

  const secret = process.env.ADMIN_SESSION_SECRET;
  const token = readCookie(request.headers.get('cookie'), COOKIE_NAME);
  const authenticated = Boolean(secret) && (await verifySession(token, secret));

  if (authenticated) return;

  if (pathname.startsWith('/api/')) {
    return new Response(JSON.stringify({ error: 'não autenticado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return Response.redirect(new URL('/admin/login', request.url), 307);
}
