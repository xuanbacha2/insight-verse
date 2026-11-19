import type { Env } from './env';
import { graphVersion } from './env';
import { decryptToken, encryptToken } from './crypto';
import { logFinish, logStart, nowIso, upsertMetrics, type MetricRow } from './db';
import { McpAuthError, mcpCall, mcpOpen } from './mcp';
import { ttRefresh } from './oauth';

type Fetcher = typeof fetch;
export interface DiscoveredAccount { kind: 'ad_account' | 'page' | 'advertiser'; external_id: string; name: string | null; currency: string | null }

export const LATENCY_NOTE: Record<string, string> = {
  meta: 'Graph API insights lag the platform UI and can be restated inside the attribution window; the last days are re-pulled on every run.',
  tiktok: 'TikTok reports use the advertiser time zone; recent days can be restated; the last days are re-pulled on every run.',
};

const ymd = (d: Date) => d.toISOString().slice(0, 10);
export function pullRange(days: number, now = new Date()) {
  const until = ymd(now);
  const since = ymd(new Date(now.getTime() - (days - 1) * 86400_000));
  return { since, until };
}

// ------------------------------------------------------------------ Meta
const CONVERSION_PREFERENCE = ['purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase', 'lead', 'onsite_conversion.lead_grouped'];
export function pickConversions(actions: Array<{ action_type: string; value: string }> | undefined): number {
  if (!actions) return 0;
  for (const t of CONVERSION_PREFERENCE) {
    const a = actions.find((x) => x.action_type === t);
    if (a) return Number(a.value) || 0;
  }
  return 0;
}

async function graphGet(env: Env, token: string, path: string, params: Record<string, string>, f: Fetcher) {
  const url = `https://graph.facebook.com/${graphVersion(env)}/${path}?${new URLSearchParams(params)}`;
  const r = await f(url, { headers: { Authorization: `Bearer ${token}` } }); // token in header, never in URL
  const j = (await r.json()) as any;
  if (!r.ok) {
    const e = new Error(`Graph ${path} failed: ${String(j?.error?.message || r.status).slice(0, 160)}`) as Error & { code?: number };
    e.code = j?.error?.code;
    throw e;
  }
  return j;
}

async function graphAll(env: Env, token: string, path: string, params: Record<string, string>, f: Fetcher, maxPages = 20) {
  const out: any[] = [];
  let after: string | undefined;
  for (let i = 0; i < maxPages; i++) {
    const j = await graphGet(env, token, path, after ? { ...params, after } : params, f);
    out.push(...(j.data ?? []));
    after = j.paging?.next ? j.paging?.cursors?.after : undefined;
    if (!after) break;
  }
  return out;
}

export async function listMetaAccounts(env: Env, token: string, f: Fetcher = fetch): Promise<{ me: { id: string; name: string | null }; accounts: DiscoveredAccount[] }> {
  const me = await graphGet(env, token, 'me', { fields: 'id,name' }, f);
  const accounts: DiscoveredAccount[] = [];
  try {
    for (const a of await graphAll(env, token, 'me/adaccounts', { fields: 'account_id,name,currency', limit: '100' }, f))
      accounts.push({ kind: 'ad_account', external_id: String(a.account_id), name: a.name ?? null, currency: a.currency ?? null });
  } catch { /* permission may be missing; page list still useful */ }
  try {
    // no access_token field requested: the hub does not store page tokens
    for (const p of await graphAll(env, token, 'me/accounts', { fields: 'id,name', limit: '100' }, f))
      accounts.push({ kind: 'page', external_id: String(p.id), name: p.name ?? null, currency: null });
  } catch { /* ignore */ }
  return { me: { id: String(me.id), name: me.name ?? null }, accounts };
}

export async function pullMeta(env: Env, token: string, acct: { id: string; external_id: string; currency: string | null }, days: number, f: Fetcher = fetch): Promise<MetricRow[]> {
  const { since, until } = pullRange(days);
  const rows = await graphAll(env, token, `act_${acct.external_id}/insights`, {
    level: 'campaign', time_increment: '1', limit: '500',
    fields: 'campaign_name,spend,impressions,clicks,actions',
    time_range: JSON.stringify({ since, until }),
  }, f);
  return rows.map((r) => ({
    date: r.date_start, source: 'meta', account_id: acct.id, campaign: r.campaign_name || '(unnamed)',
    spend: Number(r.spend) || 0, impressions: Number(r.impressions) || 0, clicks: Number(r.clicks) || 0,
    conversions: pickConversions(r.actions), currency: acct.currency,
  }));
}

// ------------------------------------------------------------------ TikTok via MCP
export function collectAdvertisers(payload: unknown): DiscoveredAccount[] {
  const out = new Map<string, DiscoveredAccount>();
  const stack: unknown[] = [payload];
  while (stack.length) {
    const cur = stack.pop();
    if (Array.isArray(cur)) { stack.push(...cur); continue; }
    if (cur && typeof cur === 'object') {
      const o = cur as Record<string, unknown>;
      if (o.advertiser_id !== undefined) {
        const id = String(o.advertiser_id);
        out.set(id, { kind: 'advertiser', external_id: id, name: (o.advertiser_name ?? o.name ?? null) as string | null, currency: null });
      }
      stack.push(...Object.values(o));
    }
  }
  return [...out.values()];
}

export async function listTikTokAdvertisers(token: string, f: Fetcher = fetch) {
  const s = await mcpOpen(token, f);
  return collectAdvertisers(await mcpCall(s, 'auth_advertiser_get', {}, f));
}

export function splitWindows(since: string, until: string, size = 30): Array<{ since: string; until: string }> {
  const out: Array<{ since: string; until: string }> = [];
  let cur = new Date(since + 'T00:00:00Z');
  const end = new Date(until + 'T00:00:00Z');
  while (cur <= end) {
    const winEnd = new Date(Math.min(cur.getTime() + (size - 1) * 86400_000, end.getTime()));
    out.push({ since: ymd(cur), until: ymd(winEnd) });
    cur = new Date(winEnd.getTime() + 86400_000);
  }
  return out;
}

export async function pullTikTok(token: string, acct: { id: string; external_id: string }, days: number, f: Fetcher = fetch): Promise<MetricRow[]> {
  const s = await mcpOpen(token, f);
  const { since, until } = pullRange(days);
  const rows: MetricRow[] = [];
  for (const w of splitWindows(since, until)) {
    let page = 1, total = 1;
    while (page <= total && page <= 20) {
      const p = await mcpCall(s, 'report_integrated_get', {
        report_type: 'BASIC', advertiser_id: acct.external_id, data_level: 'AUCTION_CAMPAIGN',
        dimensions: ['campaign_id', 'stat_time_day'],
        metrics: ['campaign_name', 'spend', 'impressions', 'clicks', 'conversion'],
        start_date: w.since, end_date: w.until, page, page_size: 1000,
      }, f);
      for (const it of p.data?.list ?? []) {
        const m = it.metrics ?? {}, d = it.dimensions ?? {};
        const day = String(d.stat_time_day ?? '').slice(0, 10);
        if (!day) continue;
        rows.push({
          date: day, source: 'tiktok', account_id: acct.id, campaign: m.campaign_name || String(d.campaign_id ?? '(unnamed)'),
          spend: Number(m.spend) || 0, impressions: Number(m.impressions) || 0, clicks: Number(m.clicks) || 0,
          conversions: Number(m.conversion) || 0,
        });
      }
      total = Number(p.data?.page_info?.total_page) || 1;
      page++;
    }
  }
  return rows;
}

// ------------------------------------------------------------------ orchestration (cron)
interface ConnRow { id: string; provider: 'meta' | 'tiktok'; token_enc: string; refresh_enc: string | null; expires_at: string | null }

async function tiktokToken(env: Env, c: ConnRow, f: Fetcher, force = false): Promise<string> {
  let token = await decryptToken(c.token_enc, env.TOKEN_ENC_KEY);
  const soon = c.expires_at && Date.parse(c.expires_at) - Date.now() < 120_000;
  if ((force || soon) && c.refresh_enc) {
    const t = await ttRefresh(env, await decryptToken(c.refresh_enc, env.TOKEN_ENC_KEY), f);
    token = t.access_token;
    await env.DB.prepare(`UPDATE connections SET token_enc=?, refresh_enc=COALESCE(?, refresh_enc), expires_at=?, updated_at=? WHERE id=?`)
      .bind(await encryptToken(t.access_token, env.TOKEN_ENC_KEY), t.refresh_token ? await encryptToken(t.refresh_token, env.TOKEN_ENC_KEY) : null,
        t.expires_in ? new Date(Date.now() + t.expires_in * 1000).toISOString() : null, nowIso(), c.id).run();
  }
  return token;
}

export async function runPull(env: Env, f: Fetcher = fetch): Promise<{ source: string; rows: number; status: string }[]> {
  const days = Math.max(1, Math.min(30, Number(env.PULL_DAYS) || 7));
  const conns = (await env.DB.prepare(`SELECT id, provider, token_enc, refresh_enc, expires_at FROM connections WHERE status='active'`).all<ConnRow>()).results ?? [];
  const results: { source: string; rows: number; status: string }[] = [];
  for (const c of conns) {
    const logId = await logStart(env.DB, c.provider);
    try {
      const accts = (await env.DB.prepare(`SELECT id, external_id, currency FROM accounts WHERE connection_id=? AND selected=1 AND kind IN ('ad_account','advertiser')`)
        .bind(c.id).all<{ id: string; external_id: string; currency: string | null }>()).results ?? [];
      let n = 0;
      if (c.provider === 'meta') {
        const token = await decryptToken(c.token_enc, env.TOKEN_ENC_KEY);
        for (const a of accts) n += await upsertMetrics(env.DB, await pullMeta(env, token, a, days, f));
      } else {
        let token = await tiktokToken(env, c, f);
        for (const a of accts) {
          try { n += await upsertMetrics(env.DB, await pullTikTok(token, a, days, f)); }
          catch (e) {
            if (!(e instanceof McpAuthError)) throw e;
            token = await tiktokToken(env, c, f, true); // one refresh retry
            n += await upsertMetrics(env.DB, await pullTikTok(token, a, days, f));
          }
        }
      }
      await logFinish(env.DB, logId, 'ok', n, LATENCY_NOTE[c.provider]);
      results.push({ source: c.provider, rows: n, status: 'ok' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'error';
      if (e instanceof McpAuthError || (e as { code?: number }).code === 190)
        await env.DB.prepare(`UPDATE connections SET status='expired', updated_at=? WHERE id=?`).bind(nowIso(), c.id).run();
      await logFinish(env.DB, logId, 'error', 0, LATENCY_NOTE[c.provider], msg);
      results.push({ source: c.provider, rows: 0, status: 'error' });
    }
  }
  return results;
}
