import type { Env } from './env';
import { demoEnabled } from './env';
import { applyFilter, byKey, mondayOf, reconcile, totals, weeklyTemplate, type Filter, type Flag, type Insufficient, type M, type Totals, type WeekRow } from './analysis';
import { loadDemo, seedDemo } from './demo';
import { connectionsFor, nowIso } from './db';
import { LATENCY_NOTE } from './pull';

export interface FreshRow { label: string; synthetic: boolean; status: string; accounts: number | string; lastRefresh: string | null; dataThrough: string | null; rows: number | string; note: string; connId?: string }
export interface SourceSummary { source: string; t: Totals; targetConv: number | null; convCmp: number | null; lyConv: number | null; gated: boolean }

export interface DashModel {
  dataset: 'demo' | 'mine'; synthetic: boolean; demoAvailable: boolean; gapScenario: boolean;
  filter: Required<Filter>; sourcesAvail: string[]; range: { min: string | null; max: string | null };
  total: Totals; bySource: SourceSummary[]; weeks: WeekRow[]; campaigns: Array<{ source: string; campaign: string; t: Totals }>;
  flags: Flag[]; insufficient: Insufficient[]; reconNote: string | null; fresh: FreshRow[]; learnings: Record<string, number>; generated: string;
}

export function sourceSummary(rows: M[], plan: Parameters<typeof weeklyTemplate>[1], ly: Parameters<typeof weeklyTemplate>[2], insuff: Insufficient[]): SourceSummary[] {
  return byKey(rows, (r) => r.source).map(({ k, t }) => {
    const wk = weeklyTemplate(rows.filter((r) => r.source === k), plan, ly, insuff);
    const ok = wk.filter((w) => !w.gated && w.targetConv !== null);
    return { source: k, t, targetConv: ok.length ? ok.reduce((s, w) => s + (w.targetConv ?? 0), 0) : null,
      convCmp: ok.length ? ok.reduce((s, w) => s + w.t.conversions, 0) : null,
      lyConv: ok.length && ok.every((w) => w.lyConv !== null) ? ok.reduce((s, w) => s + (w.lyConv ?? 0), 0) : null, gated: wk.some((w) => w.gated) };
  });
}

export function buildModel(a: {
  dataset: 'demo' | 'mine'; all: M[]; plan: Parameters<typeof weeklyTemplate>[1]; agency: Parameters<typeof reconcile>[2]; ly: Parameters<typeof weeklyTemplate>[2];
  filter: Filter; gap: boolean; demoAvailable: boolean; fresh: FreshRow[]; learnings: Record<string, number>;
}): DashModel {
  let all = a.all;
  const synthetic = a.dataset === 'demo';
  if (synthetic && a.gap) all = all.filter((r) => !(r.source === 'tiktok' && r.campaign === 'BX-TRIAL-CONVERT' && mondayOf(r.date) === '2026-09-07'));
  const dates = all.map((r) => r.date).sort();
  const filter = { source: a.filter.source || 'all', from: a.filter.from || '', to: a.filter.to || '' };
  const rows = applyFilter(all, filter);
  const recon = synthetic ? reconcile(all, a.plan, a.agency) : { flags: [], insufficient: [] };
  const plan = synthetic ? a.plan : [], ly = synthetic ? a.ly : [];
  return {
    dataset: a.dataset, synthetic, demoAvailable: a.demoAvailable, gapScenario: a.gap && synthetic, filter,
    sourcesAvail: [...new Set(all.map((r) => r.source))].sort(), range: { min: dates[0] ?? null, max: dates[dates.length - 1] ?? null },
    total: totals(rows), bySource: sourceSummary(rows, plan, ly, recon.insufficient),
    weeks: weeklyTemplate(rows, plan, ly, recon.insufficient),
    campaigns: byKey(rows, (r) => `${r.source}\u0000${r.campaign}`).map(({ k, t }) => { const [source, campaign] = k.split('\u0000'); return { source, campaign, t }; }),
    flags: recon.flags, insufficient: recon.insufficient,
    reconNote: synthetic ? null : 'Reconciliation needs a media plan and an agency report to compare against; none is loaded for connected accounts yet (demo data only).',
    fresh: a.fresh, learnings: a.learnings, generated: nowIso(),
  };
}

export async function loadDashboard(env: Env, hash: string, q: URLSearchParams): Promise<DashModel> {
  const demoOn = demoEnabled(env);
  if (demoOn) await seedDemo(env.DB);
  const fresh: FreshRow[] = [];
  const mine: M[] = [];
  for (const c of await connectionsFor(env, hash)) {
    const n = await env.DB.prepare(`SELECT COUNT(*) AS n FROM accounts WHERE connection_id=? AND selected=1 AND kind IN ('ad_account','advertiser')`).bind(c.id).first<{ n: number }>();
    const agg = await env.DB.prepare(`SELECT MAX(date) AS d, COUNT(*) AS r FROM metrics_daily WHERE source=? AND account_id IN (SELECT id FROM accounts WHERE connection_id=? AND selected=1)`).bind(c.provider, c.id).first<{ d: string | null; r: number }>();
    const last = await env.DB.prepare(`SELECT finished FROM refresh_log WHERE source=? AND status IN ('ok','error') ORDER BY id DESC LIMIT 1`).bind(c.provider).first<{ finished: string | null }>();
    fresh.push({ label: `${c.provider === 'meta' ? 'Meta' : 'TikTok'}${c.display_name ? ' (' + c.display_name + ')' : ''}`, synthetic: false, status: c.status, accounts: n?.n ?? 0,
      lastRefresh: last?.finished ?? null, dataThrough: agg?.d ?? null, rows: agg?.r ?? 0, note: LATENCY_NOTE[c.provider] ?? '', connId: c.id });
  }
  const r = await env.DB.prepare(`SELECT date, source, campaign, spend, impressions, clicks, conversions FROM metrics_daily WHERE is_synthetic=0 AND account_id IN
    (SELECT a.id FROM accounts a JOIN connections c ON c.id=a.connection_id WHERE c.session_hash=? AND a.selected=1) ORDER BY date`).bind(hash).all<M>();
  mine.push(...(r.results ?? []));

  const dataset: 'demo' | 'mine' = !demoOn || q.get('data') === 'mine' || (q.get('data') !== 'demo' && mine.length > 0) ? 'mine' : 'demo';
  let demo = { metrics: [] as M[], plan: [] as never[], agency: [] as never[], ly: [] as never[] };
  if (demoOn) {
    demo = (await loadDemo(env.DB)) as typeof demo;
    const seed = await env.DB.prepare(`SELECT finished, latency_note FROM refresh_log WHERE source='demo' AND status='seed' ORDER BY id LIMIT 1`).first<{ finished: string; latency_note: string }>();
    for (const s of [...new Set(demo.metrics.map((m) => m.source))].sort()) {
      const rs = demo.metrics.filter((m) => m.source === s);
      fresh.push({ label: `${s === 'tiktok' ? 'TikTok' : s[0].toUpperCase() + s.slice(1)} - BRAND X demo`, synthetic: true, status: 'seeded', accounts: 1,
        lastRefresh: seed?.finished ?? null, dataThrough: rs.reduce((m, x) => (x.date > m ? x.date : m), ''), rows: rs.length, note: seed?.latency_note ?? '' });
    }
  }
  const lr = (await env.DB.prepare(`SELECT status, COUNT(*) AS n FROM learnings WHERE session_hash IS NULL OR session_hash=? GROUP BY status`).bind(hash).all<{ status: string; n: number }>()).results ?? [];
  return buildModel({
    dataset, all: dataset === 'demo' ? demo.metrics : mine, plan: demo.plan, agency: demo.agency, ly: demo.ly,
    filter: { source: q.get('source') || 'all', from: /^\d{4}-\d{2}-\d{2}$/.test(q.get('from') || '') ? q.get('from')! : '', to: /^\d{4}-\d{2}-\d{2}$/.test(q.get('to') || '') ? q.get('to')! : '' },
    gap: q.get('gap') === '1', demoAvailable: demoOn, fresh, learnings: Object.fromEntries(lr.map((x) => [x.status, x.n])),
  });
}
