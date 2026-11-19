import type { Env } from './env';
import { graphVersion } from './env';
import { decryptToken, encryptToken, makePkce, randomToken } from './crypto';
import { nowIso } from './db';
import { TT_BASE } from './mcp';

export const TT_AUTHORIZE = 'https://business-api.tiktok.com/portal/mcp-tt4b-authorize';
export const TT_TOKEN = `${TT_BASE}/oauth/token`;
export const TT_REGISTER = `${TT_BASE}/oauth/register`;
export const TT_SCOPE = 'mcp:tt4b';
export const META_DEFAULT_SCOPES = 'ads_read,business_management,pages_show_list,read_insights';

export const redirectUri = (origin: string, provider: 'meta' | 'tiktok') => `${origin}/auth/${provider}/callback`;

const form = (o: Record<string, string>) => new URLSearchParams(o);

async function saveState(env: Env, provider: string, sessionHash: string, verifier?: string) {
  const state = randomToken(24);
  await env.DB.prepare(`DELETE FROM oauth_state WHERE created_at < ?`).bind(new Date(Date.now() - 3600_000).toISOString()).run();
  await env.DB.prepare(`INSERT INTO oauth_state (state, provider, session_hash, verifier_enc, created_at) VALUES (?,?,?,?,?)`)
    .bind(state, provider, sessionHash, verifier ? await encryptToken(verifier, env.TOKEN_ENC_KEY) : null, nowIso()).run();
  return state;
}

/** One-time use: returns the stored row and deletes it; null when unknown/expired/session mismatch. */
export async function consumeState(env: Env, state: string, provider: string, sessionHash: string) {
  const row = await env.DB.prepare(`SELECT * FROM oauth_state WHERE state=? AND provider=?`).bind(state, provider)
    .first<{ session_hash: string; verifier_enc: string | null; created_at: string }>();
  if (!row) return null;
  await env.DB.prepare(`DELETE FROM oauth_state WHERE state=?`).bind(state).run();
  if (row.session_hash !== sessionHash) return null;
  if (Date.now() - Date.parse(row.created_at) > 3600_000) return null;
  return { verifier: row.verifier_enc ? await decryptToken(row.verifier_enc, env.TOKEN_ENC_KEY) : null };
}

// ---------------------------------------------------------------- Meta
export function metaConfigured(env: Env) { return Boolean(env.META_APP_ID && env.META_APP_SECRET && env.TOKEN_ENC_KEY); }

export async function metaStartUrl(env: Env, origin: string, sessionHash: string): Promise<string> {
  const state = await saveState(env, 'meta', sessionHash);
  const p = new URLSearchParams({
    client_id: env.META_APP_ID!, redirect_uri: redirectUri(origin, 'meta'), state,
    scope: env.META_SCOPES || META_DEFAULT_SCOPES, response_type: 'code',
  });
  return `https://www.facebook.com/${graphVersion(env)}/dialog/oauth?${p}`;
}

/** Exchange code -> short token -> long-lived token (server side; secret goes in POST body, not the URL). */
export async function metaExchange(env: Env, origin: string, code: string, fetcher: typeof fetch = fetch) {
  const base = `https://graph.facebook.com/${graphVersion(env)}/oauth/access_token`;
  const post = async (o: Record<string, string>) => {
    const r = await fetcher(base, { method: 'POST', body: form(o) });
    const j = (await r.json()) as any;
    if (!r.ok || !j.access_token) throw new Error(`Meta token exchange failed: ${String(j?.error?.message || r.status).slice(0, 160)}`);
    return j as { access_token: string; expires_in?: number };
  };
  const short = await post({ client_id: env.META_APP_ID!, client_secret: env.META_APP_SECRET!, redirect_uri: redirectUri(origin, 'meta'), code });
  return post({ grant_type: 'fb_exchange_token', client_id: env.META_APP_ID!, client_secret: env.META_APP_SECRET!, fb_exchange_token: short.access_token });
}

// ------------------------------------------- TikTok (MCP OAuth 2.0 + PKCE S256, public client, Dynamic Client Registration)
export const ttConfigured = (env: Env) => Boolean(env.TOKEN_ENC_KEY);

async function ttClientId(env: Env, origin: string, fetcher: typeof fetch = fetch): Promise<string> {
  const ru = redirectUri(origin, 'tiktok');
  const ex = await env.DB.prepare(`SELECT client_id FROM oauth_clients WHERE provider='tiktok' AND redirect_uri=?`).bind(ru).first<{ client_id: string }>();
  if (ex) return ex.client_id;
  const r = await fetcher(TT_REGISTER, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_name: 'Unified Media Hub (prototype)', redirect_uris: [ru],
      grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'],
      token_endpoint_auth_method: 'none', scope: TT_SCOPE,
    }),
  });
  const j = (await r.json().catch(() => ({}))) as any;
  if (!r.ok || !j.client_id) throw new Error(`TikTok client registration failed (HTTP ${r.status})`);
  await env.DB.prepare(`INSERT OR REPLACE INTO oauth_clients (provider, redirect_uri, client_id) VALUES ('tiktok',?,?)`).bind(ru, j.client_id).run();
  return j.client_id;
}

export async function ttStartUrl(env: Env, origin: string, sessionHash: string, fetcher: typeof fetch = fetch): Promise<string> {
  const clientId = await ttClientId(env, origin, fetcher);
  const { verifier, challenge } = await makePkce();
  const state = await saveState(env, 'tiktok', sessionHash, verifier);
  const p = new URLSearchParams({
    response_type: 'code', client_id: clientId, redirect_uri: redirectUri(origin, 'tiktok'), scope: TT_SCOPE,
    state, code_challenge: challenge, code_challenge_method: 'S256', resource: TT_BASE,
  });
  return `${TT_AUTHORIZE}?${p}`;
}

export async function ttExchange(env: Env, origin: string, code: string, verifier: string, fetcher: typeof fetch = fetch) {
  const clientId = await ttClientId(env, origin, fetcher);
  const r = await fetcher(TT_TOKEN, {
    method: 'POST', headers: { Accept: 'application/json' },
    body: form({ grant_type: 'authorization_code', code, redirect_uri: redirectUri(origin, 'tiktok'), client_id: clientId, code_verifier: verifier, resource: TT_BASE }),
  });
  const j = (await r.json().catch(() => ({}))) as any;
  if (!r.ok || !j.access_token) throw new Error(`TikTok token exchange failed (HTTP ${r.status})`);
  return j as { access_token: string; refresh_token?: string; expires_in?: number };
}

export async function ttRefresh(env: Env, refreshToken: string, fetcher: typeof fetch = fetch) {
  const row = await env.DB.prepare(`SELECT client_id FROM oauth_clients WHERE provider='tiktok' LIMIT 1`).first<{ client_id: string }>();
  if (!row) throw new Error('no TikTok client registration');
  const r = await fetcher(TT_TOKEN, {
    method: 'POST', headers: { Accept: 'application/json' },
    body: form({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: row.client_id, resource: TT_BASE }),
  });
  const j = (await r.json().catch(() => ({}))) as any;
  if (!r.ok || !j.access_token) throw new Error(`TikTok refresh failed (HTTP ${r.status})`);
  return j as { access_token: string; refresh_token?: string; expires_in?: number };
}
