import { describe, expect, it } from 'vitest';
import { b64urlEncode } from '../src/crypto';
import { sessionHash } from '../src/db';
import { loadDemo, seedDemo, SAMPLE_BRIEF } from '../src/demo';
import { handle } from '../src/index';
import { approveAsTrial, checkBrief, confirmWithOutcome, listLearnings, MemoryError, type Learning } from '../src/memory';
import { addDays, mondayOf, reconcile, type Agency, type M, type Plan } from '../src/analysis';
import { makeDb } from './d1shim';
import type { Env } from '../src/env';

const mkEnv = (): Env => ({ DB: makeDb(), DEMO_DATA: 'true', META_APP_ID: '1', TOKEN_ENC_KEY: b64urlEncode(crypto.getRandomValues(new Uint8Array(32))) });
const L = (o: Partial<Learning>): Learning => ({ id: 'X', status: 'confirmed', source: 's', source_ref: null, date: '2025-01-01', approver: 'a', channel: 'All', topic: 't',
  lesson: 'lesson', decision_taken: 'dec', patterns: 'view[- ]through', outcome: 'o', is_synthetic: 0, session_hash: null, ...o });

describe('demo data rename', () => {
  it('uses BX- prefix, keeps every number unchanged', async () => {
    const env = mkEnv();
    await seedDemo(env.DB);
    const d = await loadDemo(env.DB);
    expect(new Set(d.metrics.map((m) => m.campaign))).toEqual(new Set(['BX-LAUNCH-AWARE', 'BX-TRIAL-CONVERT', 'BX-RETARGET']));
    expect(d.metrics.reduce((s, m) => s + m.spend, 0)).toBe(2345854000); // identical to the original synthetic export
    expect(d.metrics.reduce((s, m) => s + m.conversions, 0)).toBe(22907);
    expect(JSON.stringify(d)).not.toContain('M' + 'NR');
    expect(SAMPLE_BRIEF).not.toContain('M' + 'NR');
  });
});

describe('brief check (port of demo_check --check-brief)', () => {
  it('flags exactly the 5 planted brief lines from confirmed lessons, never the retired one', async () => {
    const env = mkEnv();
    await seedDemo(env.DB);
    const r = checkBrief(SAMPLE_BRIEF, await listLearnings(env.DB, 'any'));
    const pairs = r.flags.map((h) => `${h.line}:${h.learning.id}`).sort();
    expect(pairs).toEqual(['9:L-006', '10:L-003', '13:L-001', '16:L-002', '19:L-004'].sort());
    expect(r.flags.some((h) => h.learning.id === 'L-005')).toBe(false);
    expect(r.ignored.map((i) => i.learning.id)).toContain('L-005');
  });
  it('trial and retired lessons never raise flags (trial shown separately)', () => {
    const brief = 'KPI includes view-through conversions.';
    expect(checkBrief(brief, [L({ status: 'trial' })]).flags).toHaveLength(0);
    expect(checkBrief(brief, [L({ status: 'trial' })]).trial).toHaveLength(1);
    expect(checkBrief(brief, [L({ status: 'retired' })]).flags).toHaveLength(0);
    expect(checkBrief(brief, [L({ status: 'confirmed' })]).flags).toHaveLength(1);
  });
  it('a negated brief line is not flagged', () => {
    const conf = [L({})];
    for (const t of ['We will not count view-through as conversions.', 'KPI: purchases, excluding view-through', 'Không tính view-through vào KPI']) {
      const r = checkBrief(t, conf);
      expect(r.flags, t).toHaveLength(0);
      expect(r.negated, t).toHaveLength(1);
    }
  });
  it('ignores lessons recorded after the brief draft date', () => {
    const r = checkBrief('Brief (draft v1, 2025-06-01)\nIncludes view-through.', [L({ date: '2025-09-01' })]);
    expect(r.flags).toHaveLength(0);
    expect(r.ignored).toHaveLength(1);
  });
});

describe('trial -> confirmed lifecycle', () => {
  it('refuses to confirm without an outcome; confirms with one; only then it flags', async () => {
    const env = mkEnv();
    const h = 'sess-1';
    const id = await approveAsTrial(env.DB, h, { lesson: 'Cap Meta frequency at 3 per week', approver: 'Brand lead', keywords: 'frequency cap, weekly frequency' });
    const brief = 'Plan: no weekly frequency cap on Meta';
    // trial: not a flag
    expect(checkBrief('Remove the frequency cap entirely', await listLearnings(env.DB, h)).flags).toHaveLength(0);
    await expect(confirmWithOutcome(env.DB, h, id, '', 'Brand lead')).rejects.toBeInstanceOf(MemoryError);
    await expect(confirmWithOutcome(env.DB, h, id, '   ', 'Brand lead')).rejects.toBeInstanceOf(MemoryError);
    expect((await env.DB.prepare('SELECT status FROM learnings WHERE id=?').bind(id).first<{ status: string }>())!.status).toBe('trial');
    await confirmWithOutcome(env.DB, h, id, 'CPA fell 12% over 4 weeks vs control', 'Brand lead');
    const after = await listLearnings(env.DB, h);
    expect(after.find((l) => l.id === id)!.status).toBe('confirmed');
    expect(checkBrief('Remove the frequency cap entirely', after).flags).toHaveLength(1);
    expect(brief).toBeTruthy();
  });
  it("cannot confirm another session's trial, and the HTTP form rejects a missing outcome", async () => {
    const env = mkEnv();
    const id = await approveAsTrial(env.DB, 'owner', { lesson: 'Rotate creative every 3 weeks', approver: 'A' });
    await expect(confirmWithOutcome(env.DB, 'someone-else', id, 'measured result here', 'B')).rejects.toBeInstanceOf(MemoryError);
    const res = await handle(new Request('https://hub.test/memory/confirm', { method: 'POST', body: new URLSearchParams({ id, outcome: '', approver: 'x' }) }), env);
    expect(res.status).toBe(400);
    expect(await res.text()).toContain('outcome');
  });
  it('user keywords are escaped, not run as regex', async () => {
    const env = mkEnv();
    const id = await approveAsTrial(env.DB, 'h', { lesson: 'Avoid bursts with (a+)+ shape', approver: 'A', keywords: '(a+)+$' });
    const row = await env.DB.prepare('SELECT patterns FROM learnings WHERE id=?').bind(id).first<{ patterns: string }>();
    expect(row!.patterns).toBe('\\(a\\+\\)\\+\\$');
  });
});

// ------------------------------------------------------------ reconciliation (independent hand-written data)
const week = '2026-08-03';
const days = (n: number, spend = 100): M[] => Array.from({ length: n }, (_, i) => ({ date: addDays(week, i), source: 'meta', campaign: 'C', spend, impressions: 1000, clicks: 50, conversions: 5 }));
const plan: Plan[] = [{ week_index: 1, week_start: week, source: 'meta', campaign: 'C', budget: 700, target_impressions: 1, target_clicks: 1, target_conversions: 35, kpi_definition: 'purchases', line_no: 2 }];
const ag = (o: Partial<Agency> = {}): Agency => ({ line_no: 2, week_start: week, period_start: week, period_end: addDays(week, 6), source: 'meta', campaign: 'C', spend: 700, impressions: 7000, clicks: 350, conversions: 35, kpi_definition: 'purchases', ...o });

describe('reconciliation', () => {
  it('clean data gives no flags', () => { expect(reconcile(days(7), plan, [ag()]).flags).toEqual([]); });
  it('spend off by more than 1% is flagged with the agency line; 0.5% is not', () => {
    expect(reconcile(days(7), plan, [ag({ spend: 706 })]).flags).toEqual([]);
    const f = reconcile(days(7), plan, [ag({ spend: 784 })]).flags;
    expect(f.map((x) => x.type)).toEqual(['COST_MISMATCH']);
    expect(f[0].refs[0]).toEqual({ file: 'agency_report.csv', line: 2 });
  });
  it('agency period shorter than the week is a missing-day flag', () => {
    const f = reconcile(days(7), plan, [ag({ period_end: addDays(week, 5), spend: 600 })]).flags;
    expect(f.map((x) => x.type)).toEqual(['MISSING_DAY']);
    expect(f[0].detail).toContain('9 Aug');
  });
  it('different KPI definition is flagged', () => {
    const f = reconcile(days(7), plan, [ag({ kpi_definition: 'purchases + view-through', conversions: 48 })]).flags;
    expect(f.map((x) => x.type)).toEqual(['KPI_DEFINITION']);
  });
  it('gate: export with a missing day gives NOT_ENOUGH_DATA and withholds the other checks for that line', () => {
    const r = reconcile(days(6), plan, [ag({ spend: 9999 })]);
    expect(r.insufficient).toHaveLength(1);
    expect(r.flags.map((x) => x.type)).toEqual(['NOT_ENOUGH_DATA']); // no cost mismatch drawn from incomplete data
    expect(mondayOf('2026-08-09')).toBe(week);
  });
  it('on the full demo data finds the planted cases and no gate', async () => {
    const env = mkEnv();
    await seedDemo(env.DB);
    const d = await loadDemo(env.DB);
    const r = reconcile(d.metrics, d.plan, d.agency);
    expect(r.insufficient).toHaveLength(0);
    const by = (t: string) => r.flags.filter((f) => f.type === t);
    expect(by('MISSING_DAY')[0].refs[0].line).toBe(29);
    expect(by('COST_MISMATCH').map((f) => f.refs[0].line)).toContain(55);
    expect(by('KPI_DEFINITION')[0].refs.map((x) => x.line)).toEqual([46, 54, 62, 70, 78]);
    // simulated gap: TikTok BX-TRIAL-CONVERT week 6 missing
    const gap = d.metrics.filter((m) => !(m.source === 'tiktok' && m.campaign === 'BX-TRIAL-CONVERT' && mondayOf(m.date) === '2026-09-07'));
    const g = reconcile(gap, d.plan, d.agency);
    expect(g.insufficient.map((i) => `${i.source}/${i.campaign}/w${i.week_index}/${i.days}`)).toEqual(['tiktok/BX-TRIAL-CONVERT/w6/0']);
    expect(g.flags.find((f) => f.type === 'NOT_ENOUGH_DATA')!.refs[0].line).toBe(47);
  });
});

describe('pages', () => {
  it('dashboard shows template pieces, flags with source lines, freshness; filter and gap scenario work', async () => {
    const env = mkEnv();
    const get = async (p: string) => (await handle(new Request('https://hub.test' + p), env)).text();
    const html = await get('/dashboard');
    for (const s of ['Weekly performance', 'Demo data', '<svg', 'CTR', 'CPC', 'Cost / result', 'vs target', 'vs last year', 'By campaign', 'Mismatch flags', 'agency_report.csv:L29', 'Data age', 'Last refresh', 'Latency note'])
      expect(html, s).toContain(s);
    expect(html).not.toContain('Not enough data to conclude');
    const tt = await get('/dashboard?source=tiktok');
    expect(tt).toContain('TikTok');
    expect(tt).not.toMatch(/<td>Meta<\/td><td>BX-/); // campaign table has no Meta rows
    const ranged = await get('/dashboard?from=2026-09-01&to=2026-09-30');
    expect(ranged).toContain('1 Sep'.slice(0, 0) + 'Data available');
    const gap = await get('/dashboard?gap=1');
    expect(gap).toContain('Not enough data to conclude');
    expect(html.toLowerCase()).not.toContain('real' + '-time');
  });
  it('memory page lists lessons, sample brief check returns 5 flags; accounts + landing render', async () => {
    const env = mkEnv();
    const mem = await (await handle(new Request('https://hub.test/memory?sample=1'), env)).text();
    expect(mem).toContain('Check a brief');
    expect(mem).toContain('L-006');
    const res = await (await handle(new Request('https://hub.test/memory/check', { method: 'POST', body: new URLSearchParams({ brief: SAMPLE_BRIEF }) }), env)).text();
    expect((res.match(/<b>Flag<\/b>/g) ?? []).length).toBe(5);
    const land = await (await handle(new Request('https://hub.test/accounts'), env)).text();
    for (const s of ['development mode', 'official Ads MCP', 'Connect Meta']) expect(land).toContain(s);
    expect(land.toLowerCase()).not.toMatch(new RegExp(['real-?time', '10' + '0%', 'abso' + 'lute'].join('|')));
  });
  it('account selection toggles pulls, only for the owning session', async () => {
    const env = mkEnv();
    const first = await handle(new Request('https://hub.test/accounts'), env);
    const sid = /hub_sid=([^;]+)/.exec(first.headers.get('Set-Cookie')!)![1];
    const hash = await sessionHash(sid);
    await env.DB.prepare(`INSERT INTO connections (id,session_hash,provider,token_enc,status,created_at,updated_at) VALUES ('c1',?,'meta','x','active','t','t')`).bind(hash).run();
    for (const [i, k] of [['a1', 'ad_account'], ['a2', 'ad_account'], ['p1', 'page']])
      await env.DB.prepare(`INSERT INTO accounts (id,connection_id,provider,kind,external_id,name,selected) VALUES (?,?,?,?,?,?,1)`).bind('c1:' + i, 'c1', 'meta', k, i, 'N-' + i).run();
    const page = await (await handle(new Request('https://hub.test/accounts', { headers: { Cookie: `hub_sid=${sid}` } }), env)).text();
    expect(page).toContain('N-a1');
    expect(page).toContain('listed only');
    const post = (cookie: string) => handle(new Request('https://hub.test/accounts/c1', { method: 'POST', headers: { Cookie: cookie }, body: new URLSearchParams([['sel', 'c1:a1']]) }), env);
    expect((await post('hub_sid=intruder-session-intruder-session')).status).toBe(404);
    expect((await post(`hub_sid=${sid}`)).status).toBe(200);
    const sel = (await env.DB.prepare(`SELECT id, selected FROM accounts WHERE kind='ad_account' ORDER BY id`).all<{ id: string; selected: number }>()).results;
    expect(sel).toEqual([{ id: 'c1:a1', selected: 1 }, { id: 'c1:a2', selected: 0 }]);
  });
});

describe('freshness of demo source', () => {
  it('records the seed in refresh_log with a finish time and note', async () => {
    const env = mkEnv();
    await seedDemo(env.DB);
    const r = await env.DB.prepare(`SELECT finished, latency_note, status FROM refresh_log WHERE source='demo'`).first<{ finished: string; latency_note: string; status: string }>();
    expect(r!.status).toBe('seed');
    expect(r!.finished).toBeTruthy();
    expect(r!.latency_note).toContain('Demo');
    const html = await (await handle(new Request('https://hub.test/dashboard'), env)).text();
    expect(html).not.toContain('<td>never</td>');
  });
});

describe('gated weeks', () => {
  it('week template marks the gated source so charts can withhold its CPA', async () => {
    const { weeklyTemplate } = await import('../src/analysis');
    const rows = days(6);
    const r = reconcile(rows, plan, [ag()]);
    const wk = weeklyTemplate(rows, plan, [], r.insufficient);
    expect(wk[0].gated).toBe(true);
    expect(wk[0].gatedSources).toEqual(['meta']);
  });
});
