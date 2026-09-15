# Steam price relay (Cloudflare Worker)

Steam's market price endpoint doesn't allow browser pages to read it (no CORS
headers), so the site can't check live prices on its own. This tiny worker
fetches the public price for one item at a time and hands it back with the
headers the browser needs. It reads public data only: no Steam login, no keys,
no personal data.

- Price is requested in **THB** (Steam currency 14); the site converts to USD.
- Answers are cached for 10 minutes, and the site checks at most ~18 items a
  minute, because Steam rate-limits this endpoint.
- Only these pages may use it (edit `ALLOWED_ORIGINS` in `worker.js` to change):
  `https://pixelpixelstudio55-pix.github.io`, `http://localhost:8931`, and
  pages opened straight from disk.

## Deploy (one time, free)

1. Create a free Cloudflare account at https://dash.cloudflare.com/sign-up
   (you do this yourself; nobody else should type your password).
2. In a terminal, from this folder:

   ```bash
   cd F:/ClaudeCode/wog-helper/workers/steam-price-relay
   ```

   ```bash
   npx wrangler login
   ```

   This opens Cloudflare in your browser; approve it there.

   ```bash
   npx wrangler deploy
   ```

3. Wrangler prints a URL like `https://wog-steam-price-relay.<your-name>.workers.dev`.
   Open `<that URL>/health` — it should show `{"ok":true,...}`.
4. On the site, open **Equipment** or **Jewels**, paste the URL into the
   **💱 Steam market prices** bar, press **Save**, then **Test**.

## Check a price by hand

```text
https://wog-steam-price-relay.<your-name>.workers.dev/price?currency=THB&name=Advanced%20Jewel%20of%20Life
```

## Limits worth knowing

- Steam sometimes throttles cloud IPs. If the bar says Steam asked to slow down,
  the site waits a minute and resumes on its own.
- The Cloudflare free plan allows 100,000 requests a day, far above what this
  site uses.
