// Wachtwoordbeveiliging voor de hele site (Cloudflare Pages Functions, gratis).
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

export async function onRequest({ request, env, next }) {
  if (!env.SITE_PASSWORD) return new Response('SITE_PASSWORD ontbreekt in de instellingen van Cloudflare.', { status: 500 });
  const url = new URL(request.url);
  if (OPEN.includes(url.pathname)) return next();
  const jar = {};
  (request.headers.get('Cookie') || '').split(/;\s*/).forEach(c => { const i = c.indexOf('='); if (i > 0) jar[c.slice(0, i)] = c.slice(i + 1); });
  const [exp, sig] = (jar[COOKIE] || '').split('.');
  if (exp && sig && Number(exp) > Date.now() && same(sig, await sign(exp, env.SITE_PASSWORD))) return next();
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
