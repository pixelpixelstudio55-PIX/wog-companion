// Local Steam price relay - same API as the Cloudflare Worker (worker.js),
// but it runs on your own PC, so Steam sees your home internet connection.
//
// Why this exists: on 2026-09-16 the deployed Worker got HTTP 429 from Steam on
// its very first request, while the same request from this PC answered instantly
// (฿33.31 for Advanced Jewel of Life). Steam throttles requests coming from
// Cloudflare's shared cloud IPs; a home connection gets the normal limit
// (roughly 20 requests a minute).
//
// No dependencies. Run:  node local-relay.js        (default port 8932)
// Then use http://127.0.0.1:8932 as the relay URL on the site.

const http = require('http');
const https = require('https');

const PORT = Number(process.env.PORT || 8932);
const APP_ID = '4891320';
const CURRENCY = { THB: 14, USD: 1 };
const CACHE_MS = 10 * 60 * 1000;
const MIN_GAP_MS = 3300;          // ~18 Steam requests a minute at most
const ALLOWED_ORIGINS = [
  'https://pixelpixelstudio55-pix.github.io',
  'http://localhost:8931',
  'http://127.0.0.1:8931',
  'null',
];

const cache = new Map();          // steamUrl -> { at, status, body }
let lastSteamAt = 0;
let backoffUntil = 0;

function steamGet(url) {
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', Accept: 'application/json' },
      timeout: 15000,
    }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('timeout', () => { req.destroy(); resolve({ status: 504, body: '' }); });
    req.on('error', () => resolve({ status: 502, body: '' }));
  });
}

async function fetchPrice(name, currency) {
  const url = 'https://steamcommunity.com/market/priceoverview/'
    + `?appid=${APP_ID}&currency=${CURRENCY[currency]}&market_hash_name=${encodeURIComponent(name)}`;
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < CACHE_MS) return { ...hit, cached: true };
  if (Date.now() < backoffUntil) return { status: 429, body: '', cached: false };

  // Space requests out so a full page of prices never trips Steam's limit.
  const wait = lastSteamAt + MIN_GAP_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastSteamAt = Date.now();

  const res = await steamGet(url);
  if (res.status === 429) backoffUntil = Date.now() + 60 * 1000;
  if (res.status === 200) cache.set(url, { at: Date.now(), status: res.status, body: res.body });
  return { ...res, cached: false };
}

function send(res, status, obj, origin) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    // Chrome asks public pages for permission before they talk to 127.0.0.1.
    'Access-Control-Allow-Private-Network': 'true',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  res.writeHead(status, headers);
  res.end(obj == null ? '' : JSON.stringify(obj));
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || '';
  if (req.method === 'OPTIONS') return send(res, 204, null, origin);
  if (req.method !== 'GET') return send(res, 405, { error: 'method_not_allowed' }, origin);

  const u = new URL(req.url, `http://127.0.0.1:${PORT}`);
  if (u.pathname === '/' || u.pathname === '/health') {
    return send(res, 200, { ok: true, service: 'wog-steam-price-relay', appid: APP_ID, mode: 'local' }, origin);
  }
  if (u.pathname !== '/price') return send(res, 404, { error: 'not_found' }, origin);

  const name = (u.searchParams.get('name') || '').trim();
  const currency = (u.searchParams.get('currency') || 'THB').toUpperCase();
  if (!name || name.length > 200) return send(res, 400, { error: 'bad_name' }, origin);
  if (!CURRENCY[currency]) return send(res, 400, { error: 'bad_currency' }, origin);

  const r = await fetchPrice(name, currency);
  if (r.status === 429) return send(res, 429, { error: 'steam_rate_limited' }, origin);
  let data = null;
  try { data = JSON.parse(r.body); } catch (e) { /* non-JSON */ }
  if (r.status !== 200 || !data) return send(res, 502, { error: 'steam_error', status: r.status }, origin);

  return send(res, 200, {
    name,
    currency,
    listed: !!(data.success && (data.lowest_price || data.median_price)),
    lowest_price: data.lowest_price || null,
    median_price: data.median_price || null,
    volume: data.volume || null,
    cached: r.cached,
    checked_at: new Date().toISOString(),
  }, origin);
});

// Only this PC can reach it.
server.listen(PORT, '127.0.0.1', () => {
  console.log(`wog-steam-price-relay (local) on http://127.0.0.1:${PORT}`);
});
