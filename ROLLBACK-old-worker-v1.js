/* BDL Sourcing — Keepa proxy Worker. 15 Sep 2026.
   The Keepa API key lives ONLY in this Worker's secret KEEPA_API_KEY (Settings → Variables and Secrets).
   The app calls this Worker; this Worker calls Keepa with the key added. The key never reaches a browser.

   Routes:
     GET  /health                 → {ok, tokensLeft, refillIn, refillRate}   (costs no tokens)
     GET  /keepa?path=product&domain=2&asin=B0...&stats=90&offers=20&buybox=1
     POST /keepa?path=query&domain=2      body = Keepa Product Finder selection JSON
   Optional second secret APP_TOKEN: if set, every call except /health must send header X-BDL: <that value>. */

const ALLOW = ['https://jackbithellamazon.github.io', 'http://localhost:8866', 'http://127.0.0.1:8866'];
const PATHS = ['product', 'query', 'token', 'category', 'seller'];

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ALLOW.includes(origin) ? origin : ALLOW[0],
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,X-BDL',
      'Vary': 'Origin',
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const url = new URL(req.url);
    const KEY = env.KEEPA_API_KEY || env.KEEPA_KEY;   /* Jack's secret is called KEEPA_API_KEY */
    const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

    if (!KEY) return json({ ok: false, error: 'KEEPA_API_KEY secret is not set on this Worker' }, 500);
    if (env.APP_TOKEN && url.pathname !== '/health' && req.headers.get('X-BDL') !== env.APP_TOKEN) return json({ ok: false, error: 'not allowed' }, 403);

    if (url.pathname === '/health') {
      const r = await fetch(`https://api.keepa.com/token?key=${KEY}`);
      const t = await r.json().catch(() => ({}));
      return json({ ok: r.ok, hasKey: true, tokensLeft: t.tokensLeft, refillIn: t.refillIn, refillRate: t.refillRate, error: t.error });
    }

    if (url.pathname === '/keepa') {
      const path = url.searchParams.get('path');
      if (!PATHS.includes(path)) return json({ ok: false, error: 'bad path' }, 400);
      const qs = new URLSearchParams(url.searchParams); qs.delete('path'); qs.set('key', KEY);
      const init = { method: req.method, headers: { 'Content-Type': 'application/json' } };
      if (req.method === 'POST') init.body = await req.text();
      const r = await fetch(`https://api.keepa.com/${path}?${qs}`, init);
      const body = await r.text();
      return new Response(body, { status: r.status, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    return json({ ok: true, service: 'bdl-sourcing', routes: ['/health', '/keepa?path=product|query'] });
  },
};
