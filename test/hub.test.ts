import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { b64urlEncode, decryptToken, encryptToken, makePkce } from '../src/crypto';
import { upsertMetrics } from '../src/db';
import { seedDemo } from '../src/demo';
import { handle } from '../src/index';
import { extractRpcMessage } from '../src/mcp';
import { collectAdvertisers, pickConversions, splitWindows } from '../src/pull';
import { makeDb } from './d1shim';
import type { Env } from '../src/env';

const KEY = b64urlEncode(crypto.getRandomValues(new Uint8Array(32)));
const mkEnv = (extra: Partial<Env> = {}): Env => ({ DB: makeDb(), DEMO_DATA: 'true', META_APP_ID: '123', ...extra });

describe('PKCE', () => {
  it('challenge is BASE64URL(SHA256(verifier)) and verifier is RFC 7636 length', async () => {
    const { verifier, challenge } = await makePkce();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(challenge).toBe(createHash('sha256').update(verifier).digest('base64url'));
  });
});

describe('token encryption', () => {
  it('round-trips, uses a fresh IV, and never contains the plaintext', async () => {
    const a = await encryptToken('tok-abc-123', KEY), b = await encryptToken('tok-abc-123', KEY);
    expect(a).not.toBe(b);
    expect(a).not.toContain('tok-abc');
    expect(await decryptToken(a, KEY)).toBe('tok-abc-123');
  });
  it('rejects tampering and wrong key', async () => {
    const a = await encryptToken('x', KEY);
    const parts = a.split('.');
    const ct = parts[2];
    parts[2] = (ct[0] === 'A' ? 'B' : 'A') + ct.slice(1);
    await expect(decryptToken(parts.join('.'), KEY)).rejects.toBeTruthy();
    await expect(decryptToken(a, b64urlEncode(crypto.getRandomValues(new Uint8Array(32))))).rejects.toBeTruthy();
  });
  it('fails closed without a key', async () => { await expect(encryptToken('x', undefined)).rejects.toThrow(); });
});

describe('upsert', () => {
  it('is idempotent and overwrites restated values', async () => {
    const env = mkEnv();
    const row = { date: '2026-11-01', source: 'meta', account_id: 'a1', campaign: 'C', spend: 10, impressions: 100, clicks: 5, conversions: 1 };
    await upsertMetrics(env.DB, [row]);
    await upsertMetrics(env.DB, [{ ...row, spend: 12.5 }]);
    const r = await env.DB.prepare('SELECT COUNT(*) n, MAX(spend) s FROM metrics_daily').first<{ n: number; s: number }>();
    expect(r).toEqual({ n: 1, s: 12.5 });
  });
});

describe('schema guard', () => {
  it('refuses a confirmed learning without a recorded outcome', async () => {
    const env = mkEnv();
    const ins = (status: string, outcome: string | null) =>
      env.DB.prepare("INSERT INTO learnings (id,status,source,date,approver,lesson,outcome) VALUES (?,?,'s','2026-01-01','a','l',?)").bind('id-' + status, status, outcome).run();
    await expect(ins('confirmed', null)).rejects.toBeTruthy();
    await expect(ins('trial', null)).resolves.toBeTruthy();
  });
});

describe('demo seed + dashboard', () => {
  it('seeds 560 synthetic rows once and renders SYNTHETIC labels', async () => {
    const env = mkEnv();
    expect(await seedDemo(env.DB)).toBe(560);
    expect(await seedDemo(env.DB)).toBe(0);
    const res = await handle(new Request('https://hub.test/dashboard'), env);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('SYNTHETIC');
    expect(html).toContain('BRAND X');
    expect(html).toContain('Last refresh');
    expect(html).toContain('Data through');
    expect(html.toLowerCase()).not.toContain('real' + '-time');
    expect(html).toMatch(/Confirmed lessons: <strong>5<\/strong>/);
  });
  it('DEMO_DATA=false hides synthetic data', async () => {
    const env = mkEnv({ DEMO_DATA: 'false' });
    const html = await (await handle(new Request('https://hub.test/dashboard'), env)).text();
    expect(html).not.toContain('BRAND X demo');
  });
});

describe('routes', () => {
  it('healthz and landing return 200 with security headers', async () => {
    const env = mkEnv();
    const h = await handle(new Request('https://hub.test/healthz'), env);
    expect(h.status).toBe(200);
    expect(((await h.json()) as { ok: boolean }).ok).toBe(true);
    const r = await handle(new Request('https://hub.test/'), env);
    expect(r.status).toBe(200);
    expect(r.headers.get('Content-Security-Policy')).toContain("default-src 'none'");
    expect(r.headers.get('Set-Cookie')).toMatch(/HttpOnly; Secure; SameSite=Lax/);
  });
  it('Meta start is 503 until secrets exist, then redirects with state and minimal scopes', async () => {
    expect((await handle(new Request('https://hub.test/auth/meta/start'), mkEnv())).status).toBe(503);
    const env = mkEnv({ META_APP_SECRET: 's', TOKEN_ENC_KEY: KEY, META_SCOPES: 'ads_read,business_management,pages_show_list,read_insights' });
    const res = await handle(new Request('https://hub.test/auth/meta/start'), env);
    expect(res.status).toBe(302);
    const loc = new URL(res.headers.get('Location')!);
    expect(loc.hostname).toBe('www.facebook.com');
    expect(loc.searchParams.get('redirect_uri')).toBe('https://hub.test/auth/meta/callback');
    expect(loc.searchParams.get('scope')).toBe('ads_read,business_management,pages_show_list,read_insights');
    expect(loc.searchParams.get('state')!.length).toBeGreaterThan(20);
    expect(loc.search).not.toContain('secret');
  });
  it('TikTok start registers a client (DCR), sends S256 PKCE and resource, stores verifier encrypted', async () => {
    const env = mkEnv({ TOKEN_ENC_KEY: KEY });
    let regBody: any;
    const fakeFetch = (async (u: string, init: RequestInit) => {
      expect(String(u)).toContain('/oauth/register');
      regBody = JSON.parse(String(init.body));
      return new Response(JSON.stringify({ client_id: 'cid-test' }), { status: 201 });
    }) as unknown as typeof fetch;
    const res = await handle(new Request('https://hub.test/auth/tiktok/start'), env, undefined, fakeFetch);
    expect(res.status).toBe(302);
    expect(regBody.redirect_uris).toEqual(['https://hub.test/auth/tiktok/callback']);
    expect(regBody.token_endpoint_auth_method).toBe('none');
    const loc = new URL(res.headers.get('Location')!);
    expect(loc.origin + loc.pathname).toBe('https://business-api.tiktok.com/portal/mcp-tt4b-authorize');
    expect(loc.searchParams.get('code_challenge_method')).toBe('S256');
    expect(loc.searchParams.get('code_challenge')!.length).toBe(43);
    expect(loc.searchParams.get('resource')).toContain('open_mcp');
    const st = await env.DB.prepare('SELECT verifier_enc FROM oauth_state').first<{ verifier_enc: string }>();
    expect(st!.verifier_enc.startsWith('v1.')).toBe(true);
  });
  it('callback rejects unknown state', async () => {
    const env = mkEnv({ META_APP_SECRET: 's', TOKEN_ENC_KEY: KEY });
    expect((await handle(new Request('https://hub.test/auth/meta/callback?code=x&state=nope'), env)).status).toBe(400);
  });
});

describe('pull helpers', () => {
  it('splitWindows respects the 30-day TikTok limit', () => {
    const w = splitWindows('2026-01-01', '2026-03-05');
    expect(w[0]).toEqual({ since: '2026-01-01', until: '2026-01-30' });
    expect(w[w.length - 1].until).toBe('2026-03-05');
  });
  it('parses SSE and JSON MCP bodies', () => {
    expect(extractRpcMessage('event: message\ndata: {"jsonrpc":"2.0","id":3,"result":{"ok":1}}\n\n', 3).result.ok).toBe(1);
    expect(extractRpcMessage('{"id":4,"result":{}}', 4)).toBeTruthy();
    expect(extractRpcMessage('{"id":4}', 5)).toBeNull();
  });
  it('finds advertisers anywhere in the payload; picks Meta conversions by preference', () => {
    expect(collectAdvertisers({ data: { list: [{ advertiser_id: 1, advertiser_name: 'A' }, { advertiser_id: 2 }] } }).map((a) => a.external_id).sort()).toEqual(['1', '2']);
    expect(pickConversions([{ action_type: 'link_click', value: '9' }, { action_type: 'lead', value: '3' }, { action_type: 'purchase', value: '2' }])).toBe(2);
  });
});
