const UPSTREAM = 'https://uttaradit-announcement-register.onrender.com';

export async function onRequest({ request }) {
  const incoming = new URL(request.url);
  const method = request.method.toUpperCase();

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const origin = request.headers.get('Origin');
    if (origin && origin !== incoming.origin) {
      return Response.json({ error: 'Origin rejected' }, { status: 403 });
    }
  }

  const target = new URL(incoming.pathname + incoming.search, UPSTREAM);
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('origin');
  headers.delete('referer');

  const init = {
    method,
    headers,
    redirect: 'manual',
  };

  if (!['GET', 'HEAD'].includes(method)) init.body = request.body;

  try {
    const upstream = await fetch(target, init);
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: upstream.headers,
    });
  } catch {
    return Response.json(
      { error: 'ระบบข้อมูลกำลังเริ่มทำงาน กรุณารอสักครู่แล้วลองใหม่' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
