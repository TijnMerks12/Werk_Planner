// Wachtwoordbeveiliging voor de hele site (Cloudflare Worker met statische bestanden, gratis).
// Zonder geldig wachtwoord wordt NIETS van de site getoond (ook geen code). Wachtwoord = geheime variabele SITE_PASSWORD.
const COOKIE = 'fp_auth', DAYS = 30, enc = new TextEncoder();
const OPEN = ['/manifest.webmanifest', '/icon-180.png', '/icon-512.png']; // nodig voor 'Zet op beginscherm' (bevatten niets persoonlijks)

async function sign(msg, secret) {
  const k = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const s = await crypto.subtle.sign('HMAC', k, enc.encode(msg));
  return [...new Uint8Array(s)].map(b => b.toString(16).padStart(2, '0')).join('');
}
const same = (a, b) => { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };
const page = (msg) => new Response(`<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Inloggen</title>
<style>body{font:17px -apple-system,system-ui,sans-serif;background:#f2f2f7;display:grid;place-items:center;min-height:100vh;margin:0}form{background:#fff;padding:24px;border-radius:16px;width:min(90vw,340px)}
input,button{width:100%;box-sizing:border-box;font:inherit;padding:14px;border-radius:12px;border:1px solid #ccc;margin-top:12px}button{background:#0b5fff;color:#fff;border:0;font-weight:600}p{color:#d33;margin:8px 0 0}
@media(prefers-color-scheme:dark){body{background:#000;color:#fff}form{background:#1c1c1e}input{background:#000;color:#fff;border-color:#3a3a3e}}</style></head>
<body><form method="POST" action="/__login"><b>Werk Planner</b><input type="password" name="p" placeholder="Wachtwoord" autocomplete="current-password" autofocus required><button>Inloggen</button>${msg ? '<p>' + msg + '</p>' : ''}</form></body></html>`,
  { status: 401, headers: { 'Content-Type': 'text/html;charset=utf-8', 'Cache-Control': 'no-store' } });

// Autorijtijd met verkeer via Google Routes API. Alleen bereikbaar na inloggen; GOOGLE_KEY staat als geheim in Cloudflare.
async function route(url, env) {
  const j = (o, st = 200) => new Response(JSON.stringify(o), { status: st, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  if (!env.GOOGLE_KEY) return j({ error: 'geen sleutel' }, 404);
  const ll = (v) => { const [a, b] = String(v || '').split(',').map(Number); return (isFinite(a) && isFinite(b)) ? { location: { latLng: { latitude: a, longitude: b } } } : null; };
  const o = ll(url.searchParams.get('from')), d = ll(url.searchParams.get('to'));
  if (!o || !d) return j({ error: 'ongeldige coördinaten' }, 400);
  const body = { origin: o, destination: d, travelMode: 'DRIVE', routingPreference: 'TRAFFIC_AWARE' };
  const t = new Date(url.searchParams.get('t') || '');
  if (t.getTime() > Date.now() + 120000) body.departureTime = t.toISOString();   // alleen toekomstige tijden toegestaan
  const r = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': env.GOOGLE_KEY, 'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters' },
    body: JSON.stringify(body)
  });
  const x = await r.json().catch(() => ({}));
  const sec = parseInt((x.routes && x.routes[0] && x.routes[0].duration) || '');
  if (!r.ok || !isFinite(sec)) return j({ error: (x.error && x.error.message) || 'Google gaf geen route', status: r.status }, 502);
  return j({ min: Math.round(sec / 60), km: Math.round((x.routes[0].distanceMeters || 0) / 100) / 10 });
}

async function handle(request, env) {
  const next = () => env.ASSETS.fetch(request);
  if (!env.SITE_PASSWORD) return new Response('SITE_PASSWORD ontbreekt in de instellingen van Cloudflare.', { status: 500 });
  const url = new URL(request.url);
  if (OPEN.includes(url.pathname)) return next();
  const jar = {};
  (request.headers.get('Cookie') || '').split(/;\s*/).forEach(c => { const i = c.indexOf('='); if (i > 0) jar[c.slice(0, i)] = c.slice(i + 1); });
  const [exp, sig] = (jar[COOKIE] || '').split('.');
  if (exp && sig && Number(exp) > Date.now() && same(sig, await sign(exp, env.SITE_PASSWORD))) return url.pathname === '/api/route' ? route(url, env) : next();
  if (request.method === 'POST' && url.pathname === '/__login') {
    const f = await request.formData(), given = String(f.get('p') || '');
    if (same(await sign('x', given), await sign('x', env.SITE_PASSWORD))) {
      const e = String(Date.now() + DAYS * 864e5);
      return new Response(null, { status: 303, headers: { Location: '/', 'Set-Cookie': `${COOKIE}=${e}.${await sign(e, env.SITE_PASSWORD)}; Path=/; Max-Age=${DAYS * 86400}; HttpOnly; Secure; SameSite=Strict` } });
    }
    await new Promise(r => setTimeout(r, 1200));                 // remt gokken af
    return page('Onjuist wachtwoord');
  }
  return page('');
}

export default { fetch: (request, env) => handle(request, env) };
