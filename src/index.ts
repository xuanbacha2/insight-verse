import type { Env } from './env';
import { demoEnabled } from './env';
import { encryptToken, randomToken } from './crypto';
import { nowIso, sessionHash } from './db';
import { sampleBrief, seedDemo } from './demo';
import { loadDashboard } from './dashboard';
import { approveAsTrial, checkBrief, confirmWithOutcome, listLearnings, MemoryError } from './memory';
import { consumeState, metaConfigured, metaExchange, metaStartUrl, ttConfigured, ttExchange, ttStartUrl } from './oauth';
import { listMetaAccounts, listTikTokAdvertisers, runPull, type DiscoveredAccount } from './pull';
import { audiencePage, brainPage, campaignsPage, homePage, overviewPage, parseView } from './pages';
import { brandById, parseBrand, type BrandId } from './synth';
import { CSS, HUB_JS } from './ui';
import { accountsPage, dashboardPage, memoryPage, messagePage, type AcctConn } from './views';

const COOKIE = 'hub_sid';
const SEC_HEADERS = {
  'Content-Security-Policy': "default-src 'none'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src data:; script-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store',
};

function readCookie(req: Request, name: string): string | null {
  const m = (req.headers.get('Cookie') || '').match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? m[1] : null;
}

interface Ctx { sid: string; hash: string; isNew: boolean }
async function session(req: Request): Promise<Ctx> {
  const existing = readCookie(req, COOKIE);
  const sid = existing && /^[A-Za-z0-9_-]{20,}$/.test(existing) ? existing : randomToken(24);
  return { sid, hash: await sessionHash(sid), isNew: sid !== existing };
}

function respond(ctx: Ctx, body: string | null, init: ResponseInit & { headers?: Record<string, string> } = {}): Response {
  const h = new Headers({ ...SEC_HEADERS, ...(init.headers ?? {}) });
  if (ctx.isNew) h.append('Set-Cookie', `${COOKIE}=${ctx.sid}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`);
  if (body !== null && !h.has('Content-Type')) h.set('Content-Type', 'text/html; charset=utf-8');
  return new Response(body, { ...init, headers: h });
}
const redirect = (ctx: Ctx, url: string) => respond(ctx, null, { status: 302, headers: { Location: url } });

async function saveConnection(env: Env, ctx: Ctx, provider: 'meta' | 'tiktok', tok: { access_token: string; refresh_token?: string; expires_in?: number },
  who: { id: string | null; name: string | null }, scopes: string, accounts: DiscoveredAccount[]) {
  const id = randomToken(12), now = nowIso();
  if (who.id) { // reconnecting the same identity replaces the old connection
    await env.DB.prepare(`DELETE FROM connections WHERE session_hash=? AND provider=? AND external_user_id=?`).bind(ctx.hash, provider, who.id).run();
  }
  await env.DB.prepare(`INSERT INTO connections (id, session_hash, provider, external_user_id, display_name, token_enc, refresh_enc, expires_at, scopes, status, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,'active',?,?)`).bind(id, ctx.hash, provider, who.id, who.name,
    await encryptToken(tok.access_token, env.TOKEN_ENC_KEY), tok.refresh_token ? await encryptToken(tok.refresh_token, env.TOKEN_ENC_KEY) : null,
    tok.expires_in ? new Date(Date.now() + tok.expires_in * 1000).toISOString() : null, scopes, now, now).run();
  for (const a of accounts) {
    await env.DB.prepare(`INSERT OR REPLACE INTO accounts (id, connection_id, provider, kind, external_id, name, currency, selected) VALUES (?,?,?,?,?,?,?,1)`)
      .bind(`${id}:${a.kind}:${a.external_id}`, id, provider, a.kind, a.external_id, a.name, a.currency).run();
  }
  return id;
}

const ensureDemo = async (env: Env) => { if (demoEnabled(env)) await seedDemo(env.DB); };

async function memoryView(env: Env, ctx: Ctx, brand: BrandId | 'all', extra: { brief?: string; result?: ReturnType<typeof checkBrief> | null; error?: string; notice?: string } = {}, status = 200) {
  await ensureDemo(env);
  const learnings = await listLearnings(env.DB, ctx.hash, brandById(brand)?.code);
  return respond(ctx, memoryPage({ learnings, brief: extra.brief ?? '', result: extra.result ?? null, error: extra.error, notice: extra.notice, brand }), { status });
}

async function accountsView(env: Env, ctx: Ctx, setup: { metaReady: boolean; ttReady: boolean }, notice?: string) {
  const conns = (await env.DB.prepare(`SELECT id, provider, display_name, status FROM connections WHERE session_hash=? ORDER BY created_at`).bind(ctx.hash).all<Omit<AcctConn, 'accounts'>>()).results ?? [];
  const out: AcctConn[] = [];
  for (const c of conns) {
    const a = (await env.DB.prepare(`SELECT id, kind, external_id, name, currency, selected FROM accounts WHERE connection_id=? ORDER BY kind, name`).bind(c.id).all<AcctConn['accounts'][number]>()).results ?? [];
    out.push({ ...c, accounts: a });
  }
  return respond(ctx, accountsPage(out, setup, notice));
}

async function formBody(req: Request): Promise<URLSearchParams> {
  const text = await req.text();
  return new URLSearchParams(text.length > 20000 ? text.slice(0, 20000) : text);
}

export async function handle(req: Request, env: Env, execCtx?: { waitUntil(p: Promise<unknown>): void }, f: typeof fetch = fetch): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  const ctx = await session(req);
  try {
    if (path === '/healthz') {
      let db = false;
      try { await env.DB.prepare('SELECT 1').first(); db = true; } catch { /* leave false */ }
      return respond(ctx, JSON.stringify({ ok: db, db, time: nowIso(), demo: demoEnabled(env) }), { headers: { 'Content-Type': 'application/json' }, status: db ? 200 : 503 });
    }
    const setup = { metaReady: metaConfigured(env), ttReady: ttConfigured(env) };
    if (req.method === 'GET' && path === '/') return respond(ctx, homePage(parseView(url.searchParams), setup));
    if (req.method === 'GET' && path === '/assets/hub.js') return respond(ctx, HUB_JS, { headers: { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
    if (req.method === 'GET' && path === '/assets/hub.css') return respond(ctx, CSS, { headers: { 'Content-Type': 'text/css; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
    if (req.method === 'GET' && path === '/overview') return respond(ctx, overviewPage(parseView(url.searchParams)));
    if (req.method === 'GET' && path === '/campaigns') return respond(ctx, campaignsPage(parseView(url.searchParams)));
    if (req.method === 'GET' && path === '/audience') return respond(ctx, audiencePage(parseView(url.searchParams)));
    if (req.method === 'GET' && path === '/brain') return respond(ctx, brainPage(parseView(url.searchParams)));
    if (req.method === 'GET' && path === '/dashboard') return respond(ctx, dashboardPage(await loadDashboard(env, ctx.hash, url.searchParams), url.searchParams.get('view') === 'exec' ? 'exec' : 'analyst'));

    if (req.method === 'GET' && path === '/memory') { const b = parseBrand(url.searchParams.get('brand')); return memoryView(env, ctx, b, { brief: url.searchParams.get('sample') === '1' ? sampleBrief(b) : '' }); }
    if (req.method === 'POST' && path === '/memory/check') {
      const form = await formBody(req), b = parseBrand(form.get('brand'));
      const brief = form.get('brief')?.slice(0, 8000) ?? '';
      await ensureDemo(env);
      return memoryView(env, ctx, b, { brief, result: checkBrief(brief, await listLearnings(env.DB, ctx.hash, brandById(b)?.code)) });
    }
    if (req.method === 'POST' && path === '/memory/approve') {
      const form = await formBody(req), b = parseBrand(form.get('brand'));
      try {
        const id = await approveAsTrial(env.DB, ctx.hash, Object.fromEntries(form));
        return memoryView(env, ctx, b, { notice: `Saved ${id} as a TRIAL decision. It becomes a confirmed lesson only when you record its measured result.` });
      } catch (e) { if (e instanceof MemoryError) return memoryView(env, ctx, b, { error: e.message }, 400); throw e; }
    }
    if (req.method === 'POST' && path === '/memory/confirm') {
      const f2 = await formBody(req), bb = parseBrand(f2.get('brand'));
      try {
        await confirmWithOutcome(env.DB, ctx.hash, f2.get('id') ?? '', f2.get('outcome') ?? '', f2.get('approver') ?? '');
        return memoryView(env, ctx, bb, { notice: `${f2.get('id')} confirmed with its recorded outcome.` });
      } catch (e) { if (e instanceof MemoryError) return memoryView(env, ctx, bb, { error: e.message }, 400); throw e; }
    }
    if (req.method === 'GET' && path === '/accounts') return accountsView(env, ctx, setup);
    const am = path.match(/^\/accounts\/([A-Za-z0-9_-]+)$/);
    if (req.method === 'POST' && am) {
      const own = await env.DB.prepare(`SELECT id FROM connections WHERE id=? AND session_hash=?`).bind(am[1], ctx.hash).first();
      if (!own) return respond(ctx, messagePage('Not found', 'No such connection.'), { status: 404 });
      const sel = new Set((await formBody(req)).getAll('sel'));
      const accts = (await env.DB.prepare(`SELECT id FROM accounts WHERE connection_id=? AND kind IN ('ad_account','advertiser')`).bind(am[1]).all<{ id: string }>()).results ?? [];
      for (const a of accts) await env.DB.prepare(`UPDATE accounts SET selected=? WHERE id=? AND connection_id=?`).bind(sel.has(a.id) ? 1 : 0, a.id, am[1]).run();
      return accountsView(env, ctx, setup, `Saved: ${accts.filter((a) => sel.has(a.id)).length} of ${accts.length} accounts will be pulled on the next refresh.`);
    }

    if (req.method === 'GET' && path === '/auth/meta/start') {
      if (!metaConfigured(env)) return respond(ctx, messagePage('Meta is not configured', 'The hub operator has not yet set the Meta app secret and token encryption key.'), { status: 503 });
      return redirect(ctx, await metaStartUrl(env, url.origin, ctx.hash));
    }
    if (req.method === 'GET' && path === '/auth/meta/callback') {
      if (!metaConfigured(env)) return respond(ctx, messagePage('Meta is not configured', 'Setup incomplete.'), { status: 503 });
      const err = url.searchParams.get('error');
      if (err) return respond(ctx, messagePage('Meta sign-in cancelled', `Meta returned: ${url.searchParams.get('error_description') || err}`), { status: 400 });
      const code = url.searchParams.get('code'), state = url.searchParams.get('state');
      if (!code || !state || !(await consumeState(env, state, 'meta', ctx.hash))) return respond(ctx, messagePage('Sign-in link invalid or expired', 'Start again from the home page.'), { status: 400 });
      const tok = await metaExchange(env, url.origin, code, f);
      const { me, accounts } = await listMetaAccounts(env, tok.access_token, f);
      await saveConnection(env, ctx, 'meta', tok, { id: me.id, name: me.name }, env.META_SCOPES || 'ads_read,business_management,pages_show_list,read_insights', accounts);
      execCtx?.waitUntil(runPull(env, f));
      return redirect(ctx, '/accounts');
    }

    if (req.method === 'GET' && path === '/auth/tiktok/start') {
      if (!ttConfigured(env)) return respond(ctx, messagePage('TikTok is not configured', 'The token encryption key is not set.'), { status: 503 });
      return redirect(ctx, await ttStartUrl(env, url.origin, ctx.hash, f));
    }
    if (req.method === 'GET' && path === '/auth/tiktok/callback') {
      if (!ttConfigured(env)) return respond(ctx, messagePage('TikTok is not configured', 'Setup incomplete.'), { status: 503 });
      const err = url.searchParams.get('error');
      if (err) return respond(ctx, messagePage('TikTok sign-in cancelled', `TikTok returned: ${url.searchParams.get('error_description') || err}`), { status: 400 });
      const code = url.searchParams.get('code'), state = url.searchParams.get('state');
      const st = code && state ? await consumeState(env, state, 'tiktok', ctx.hash) : null;
      if (!code || !st?.verifier) return respond(ctx, messagePage('Sign-in link invalid or expired', 'Start again from the home page.'), { status: 400 });
      const tok = await ttExchange(env, url.origin, code, st.verifier, f);
      const accounts = await listTikTokAdvertisers(tok.access_token, f);
      await saveConnection(env, ctx, 'tiktok', tok, { id: null, name: null }, 'mcp:tt4b', accounts);
      execCtx?.waitUntil(runPull(env, f));
      return redirect(ctx, '/accounts');
    }

    const dm = path.match(/^\/disconnect\/([A-Za-z0-9_-]+)$/);
    if (req.method === 'POST' && dm) {
      await env.DB.prepare(`DELETE FROM connections WHERE id=? AND session_hash=?`).bind(dm[1], ctx.hash).run();
      return redirect(ctx, '/dashboard');
    }
    return respond(ctx, messagePage('Not found', 'No such page.'), { status: 404 });
  } catch (e) {
    console.error('request failed', path, e instanceof Error ? e.message : 'error'); // never log tokens or bodies
    return respond(ctx, messagePage('Something went wrong', 'The request could not be completed. Please try again.'), { status: 500 });
  }
}

export default {
  fetch: (req: Request, env: Env, ctx: ExecutionContext) => handle(req, env, ctx),
  async scheduled(_e: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runPull(env).then((r) => console.log('pull', JSON.stringify(r))));
  },
} satisfies ExportedHandler<Env>;
