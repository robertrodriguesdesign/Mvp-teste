export const config = {
  matcher: ['/crm', '/crm/:path*', '/api/leads', '/api/leads/:path*'],
};

export default function middleware(request) {
  const expectedUser = process.env.CRM_ADMIN_USER;
  const expectedPass = process.env.CRM_ADMIN_PASSWORD;

  const auth = request.headers.get('authorization');
  if (auth && auth.startsWith('Basic ')) {
    const decoded = atob(auth.slice(6));
    const sep = decoded.indexOf(':');
    const user = decoded.slice(0, sep);
    const pass = decoded.slice(sep + 1);
    if (expectedUser && expectedPass && user === expectedUser && pass === expectedPass) {
      return; // credenciais corretas — segue para a rota normalmente
    }
  }

  return new Response('Autenticação necessária.', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Fihan CRM", charset="UTF-8"' },
  });
}
