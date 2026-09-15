// Steam Market price relay for the WoG Companion site.
//
// Why this exists: steamcommunity.com sends no CORS headers, so a static page
// (GitHub Pages, or index.html opened from disk) cannot read market prices
// itself - the browser blocks the response. This worker fetches Steam's public
// `priceoverview` endpoint server-side and hands the JSON back with CORS headers.
//
// It only ever reads public price data. No keys, no Steam login, no user data.
//
// Steam rate-limits `priceoverview` hard (roughly 20 requests a minute per IP),
// so every answer is cached at Cloudflare's edge for CACHE_SECONDS and the site
// asks for prices a few at a time instead of all at once.

const APP_ID = '4891320'; // War of Genesis: Idle Loot

// Pages allowed to use this relay. 'null' is what a browser sends for a page
// opened straight from disk (file://), which this project supports.
const ALLOWED_ORIGINS = [
  'https://pixelpixelstudio55-pix.github.io',
  'http://localhost:8931',
  'null',
];

// Steam's own currency ids. THB is the one the site checks first.
const CURRENCY = { THB: 14, USD: 1 };

const CACHE_SECONDS = 600;

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405, cors);

    const url = new URL(request.url);
    if (url.pathname === '/' || url.pathname === '/health') {
      return json({ ok: true, service: 'wog-steam-price-relay', appid: APP_ID }, 200, cors);
    }
    if (url.pathname !== '/price') return json({ error: 'not_found' }, 404, cors);

    const name = (url.searchParams.get('name') || '').trim();
    const currency = (url.searchParams.get('currency') || 'THB').toUpperCase();
    if (!name || name.length > 200) return json({ error: 'bad_name' }, 400, cors);
    if (!CURRENCY[currency]) return json({ error: 'bad_currency' }, 400, cors);

    const steamUrl = 'https://steamcommunity.com/market/priceoverview/'
      + `?appid=${APP_ID}&currency=${CURRENCY[currency]}&market_hash_name=${encodeURIComponent(name)}`;

    const cache = caches.default;
    const cacheKey = new Request(steamUrl, { method: 'GET' });
    let upstream = await cache.match(cacheKey);
    let cached = true;
    if (!upstream) {
      cached = false;
      try {
        upstream = await fetch(steamUrl, { headers: { Accept: 'application/json' } });
      } catch (e) {
        return json({ error: 'steam_unreachable' }, 502, cors);
      }
      if (upstream.ok) {
        const copy = new Response(upstream.clone().body, {
          status: upstream.status,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${CACHE_SECONDS}` },
        });
        ctx.waitUntil(cache.put(cacheKey, copy));
      }
    }

    if (upstream.status === 429) return json({ error: 'steam_rate_limited' }, 429, cors);
    let data = null;
    try { data = await upstream.json(); } catch (e) { /* non-JSON answer */ }
    if (!upstream.ok || !data) return json({ error: 'steam_error', status: upstream.status }, 502, cors);

    // success:false with no prices = no listing on the market under this exact name.
    return json({
      name,
      currency,
      listed: !!(data.success && (data.lowest_price || data.median_price)),
      lowest_price: data.lowest_price || null,
      median_price: data.median_price || null,
      volume: data.volume || null,
      cached,
      checked_at: new Date().toISOString(),
    }, 200, cors);
  },
};

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
  });
}
