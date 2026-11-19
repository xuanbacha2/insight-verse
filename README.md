# Unified Media Hub

Prototype · demo data is synthetic. Live demo: https://unified-media-hub.xuanbacha2.workers.dev

A prototype of a one-login media data hub for brand teams: connect Meta and TikTok accounts through OAuth, list the pages and ad accounts the signed-in user may access, pull daily campaign metrics into ready-made templates, and show a dashboard that refreshes on a schedule with the last refresh time and data age of every source. A small "brand memory" layer stores decisions as *trial* and promotes them to *confirmed* lessons only when a measured result is recorded.

> **Status: prototype.** Demo figures are **SYNTHETIC** (fictional brand "BRAND X") and say nothing about real performance. The dashboard is refreshed by a scheduled job (hourly); it is not an instant view of the platforms.

Built as a working build for a use case in the BeyondPilot programme ("Unified Media Hub", CMS-1).

## What is in this repository

| Part | What it does |
|---|---|
| `src/index.ts` | Cloudflare Worker: routes `/`, `/dashboard`, `/healthz`, `/auth/meta/*`, `/auth/tiktok/*`, `POST /disconnect/:id`; cron handler |
| `src/oauth.ts` | Meta OAuth code flow (server-side token exchange); TikTok MCP OAuth 2.0 + PKCE (S256) as a public client with Dynamic Client Registration |
| `src/mcp.ts` | Minimal MCP client (Streamable HTTP, JSON-RPC 2.0) for TikTok's official Ads MCP server |
| `src/pull.ts` | Scheduled pull: Meta Graph API insights and TikTok `report_integrated_get`; idempotent upsert; refresh log |
| `src/crypto.ts` | AES-GCM token encryption, PKCE helpers |
| `src/demo.ts`, `src/demo-data.json` | Seeds synthetic BRAND X data (flagged `is_synthetic`) |
| `src/analysis.ts` | Weekly template maths (CTR, CPC, CPA, vs target, vs last year) and reconciliation checks (missing day, cost mismatch >1%, KPI definition, not-enough-data gate) |
| `src/dashboard.ts`, `src/charts.ts`, `src/views.ts` | Dashboard model, dependency-free inline SVG charts, HTML pages (`/dashboard`, `/memory`, `/accounts`) |
| `src/memory.ts` | Brand memory: trial / confirmed lifecycle and brief check against confirmed lessons |
| `migrations/` | D1 schema: `connections`, `accounts`, `metrics_daily`, `learnings`, `refresh_log`, `oauth_state`, `oauth_clients`, plus synthetic `plan_weekly`, `agency_weekly`, `lastyear_weekly` |
| `test/` | Vitest suite (PKCE, token encryption, upsert, schema guard, dashboard rendering, OAuth start routes) |

## Architecture

```
Browser --OAuth--> Meta / TikTok            Cron (hourly)
   |                    |                        |
   v                    v                        v
Cloudflare Worker  (tokens encrypted with AES-GCM, key = Worker secret)
   |-- D1: connections, accounts, metrics_daily, learnings, refresh_log
   |-- Meta Graph API  (insights, ad accounts, pages)
   '-- TikTok Ads MCP  (auth_advertiser_get, report_integrated_get)
```

* **Tokens** live server-side in D1, encrypted with a key held in the `TOKEN_ENC_KEY` Worker secret. They are never logged and never placed in URLs. Meta calls send the token in the `Authorization` header; the app secret is sent in a POST body, not a query string.
* **Sessions**: a random HttpOnly cookie identifies a browser; only its SHA-256 is stored. A user sees only the connections made from their own session.
* **Scopes are read-only.** Meta: `ads_read`, `business_management`, `pages_show_list`, `read_insights`. TikTok: `mcp:tt4b`. The hub requests no write permission.
* **Brand memory**: `learnings.status` is `trial | confirmed | retired`; a database `CHECK` constraint refuses `confirmed` without a recorded `outcome`. Each lesson keeps source, date and approver.
* **Data freshness**: every pull is logged in `refresh_log`; the dashboard shows last refresh, the newest day of data stored, and a latency note per source. The last `PULL_DAYS` (default 7) days are re-pulled each run because platforms restate recent figures.

## Run locally

```bash
npm install
npm test                      # unit tests, no network and no login needed
npm run db:local              # apply migrations to the local D1
npx wrangler dev              # http://localhost:8787 ; add --test-scheduled to trigger cron at /__scheduled
```

Create `.dev.vars` (git-ignored) only if you want to try the OAuth flows:

```
META_APP_SECRET=...           # Meta app secret
TOKEN_ENC_KEY=...             # 32 random bytes, base64: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Deploy (Cloudflare Workers + D1)

```bash
npx wrangler d1 create unified-media-hub     # copy the database_id into your own wrangler config
npx wrangler d1 migrations apply DB --remote
npx wrangler secret put META_APP_SECRET
npx wrangler secret put TOKEN_ENC_KEY
npx wrangler deploy
```

Then add `https://<your-worker>/auth/meta/callback` to *Valid OAuth Redirect URIs* in the Meta app. The TikTok redirect (`/auth/tiktok/callback`) is registered automatically through Dynamic Client Registration on the first TikTok sign-in.

Set `DEMO_DATA = "false"` in `wrangler.toml` to hide the synthetic dataset.

## Real limits (read before relying on it)

* **Meta**: the app runs in development mode and has not passed App Review or Business Verification. Only people with a role on the app can sign in, and only to ad accounts and pages they already have access to. Serving outside users requires Advanced Access, which requires review.
* **TikTok**: there is no approved TikTok Marketing API app behind this. The hub acts as its own MCP client against TikTok's official Ads MCP server using OAuth 2.0 + PKCE. Whether that endpoint may be used from a self-built client in a production service is governed by TikTok's terms and has not been confirmed with TikTok; treat it as unverified for anything beyond a prototype.
* **Data timing and attribution**: platform insights arrive late and can be restated within attribution windows. Meta "conversions" here are a preference-ordered pick of one action type (purchase, then lead) and follow the account's default attribution settings; TikTok uses the `conversion` metric. These are not reconciled to any commercial source of truth.
* **Synthetic demo data**: BRAND X figures are invented. They demonstrate layout and flow, not accuracy.
* **Not built yet**: upload of a real media plan / agency report (reconciliation runs on the synthetic set only), multi-user roles, brand-level access control, page insights, alerting. Brief matching is rule-based (phrase patterns with a negation check) and will miss paraphrases.
* Live Meta and TikTok pulls have only been exercised against mocked responses in tests; no real account was connected during development of this version.

## Security notes

Responses carry a strict CSP and `no-store`; state parameters are single-use and bound to the session; disconnecting deletes the stored tokens and accounts. This is a prototype and has not had a security review.

## License

Not yet specified.
