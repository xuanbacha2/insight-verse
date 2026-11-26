import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { addDays, resolveRange } from '../src/timeline';
import { add, campaignDays, campaignStats, effectiveDailyBudget, matchesCode, parseCodes, ZERO } from '../src/campaigns';
import { ACCOUNTS, accountRows, campaigns, campaignsOf, parseBrand, SYNTH_ANCHOR, SYNTH_START } from '../src/synth';
import { brainAnswers } from '../src/pages';
import { ageGenderMatrix, buildCells, enoughData, insightsAll, META_PL, placementTable, sumCells, TT_PL } from '../src/audience';
import { handle } from '../src/index';
import { makeDb } from './d1shim';
import type { Env } from '../src/env';

const env = (): Env => ({ DB: makeDb(), DEMO_DATA: 'true', META_APP_ID: '123' });
const get = async (p: string) => { const r = await handle(new Request('https://hub.test' + p), env()); return { r, t: await r.text() }; };

describe('timeline presets', () => {
  const A = '2026-10-11';
  it('Today, 3D, 7D, 14D, 30D end on the anchor and span the right number of days', () => {
    const want: Record<string, [string, number]> = { today: ['2026-10-11', 1], '3d': ['2026-10-09', 3], '7d': ['2026-10-05', 7], '14d': ['2026-09-28', 14], '30d': ['2026-09-12', 30] };
    for (const [k, [from, n]] of Object.entries(want)) {
      const r = resolveRange({ range: k }, A);
      expect(r).toMatchObject({ preset: k, from, to: A, days: n });
    }
  });
  it('date maths crosses month and year boundaries', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(resolveRange({ range: '7d' }, '2026-01-03').from).toBe('2025-12-28');
  });
  it('custom range: valid, swapped, clamped; junk falls back to 7D', () => {
    expect(resolveRange({ range: 'custom', from: '2026-09-10', to: '2026-09-20' }, A)).toMatchObject({ preset: 'custom', from: '2026-09-10', to: '2026-09-20', days: 11 });
    expect(resolveRange({ from: '2026-09-20', to: '2026-09-10' }, A)).toMatchObject({ from: '2026-09-10', to: '2026-09-20' });
    expect(resolveRange({ range: 'custom', from: '2026-09-20', to: '2027-01-01' }, A).to).toBe(A);
    expect(resolveRange({ range: 'custom', from: '2026-08-01', to: '2026-09-02' }, A, '2026-09-01').from).toBe('2026-09-01');
    expect(resolveRange({ range: 'nope', from: 'x' }, A)).toMatchObject({ preset: '7d', days: 7 });
  });
});

describe('ABO rollup', () => {
  const cs = campaigns();
  it('ABO campaigns report 0 at campaign level and roll up to the sum of ad set budgets', () => {
    const abo = cs.filter((c) => c.budget_type === 'ABO');
    expect(abo.length).toBeGreaterThan(3);
    for (const c of abo) {
      expect(c.daily_budget).toBe(0);
      expect(c.adsets.length).toBeGreaterThan(1);
      expect(effectiveDailyBudget(c)).toBe(c.adsets.reduce((s, a) => s + a.daily_budget, 0));
      expect(effectiveDailyBudget(c)).toBeGreaterThan(0);
    }
  });
  it('ABO spend over a range equals the sum of ad set spend; CBO uses its own budget', () => {
    const r = { from: '2026-10-05', to: SYNTH_ANCHOR };
    const c = cs.find((x) => x.budget_type === 'ABO')!;
    const sum = c.adsets.reduce((s, a) => s + Object.entries(a.days).filter(([d]) => d >= r.from && d <= r.to).reduce((t, [, v]) => t + v.spend, 0), 0);
    expect(campaignStats(c, r).spend).toBe(sum);
    expect(Object.keys(campaignDays(c)).length).toBe(Object.keys(c.adsets[0].days).length);
    const cbo = cs.find((x) => x.budget_type === 'CBO')!;
    expect(effectiveDailyBudget(cbo)).toBe(cbo.daily_budget);
  });
});

describe('campaign code filter', () => {
  it('matches by case-insensitive substring; several terms are OR-ed; empty matches all', () => {
    expect(matchesCode('BX-LAUNCH-AWARE_ABO_01', 'bx-launch')).toBe(true);
    expect(matchesCode('BX-ALWAYSON-REACH_CBO_01', 'BX-LAUNCH')).toBe(false);
    expect(matchesCode('BX-ALWAYSON-REACH_CBO_01', 'BX-LAUNCH, alwayson')).toBe(true);
    expect(matchesCode('anything', '')).toBe(true);
    expect(parseCodes('  a,,b  c ')).toEqual(['a', 'b', 'c']);
  });
  it('filters the synthetic campaigns and account totals', () => {
    const launch = campaigns().filter((c) => matchesCode(c.name, 'BX-LAUNCH'));
    expect(launch.length).toBeGreaterThan(0);
    expect(launch.length).toBeLessThan(campaigns().length);
    const r = { from: SYNTH_START, to: SYNTH_ANCHOR };
    const all = accountRows(r).reduce((s, a) => s + a.period.spend, 0);
    const only = accountRows(r, (n) => matchesCode(n, 'BX-LAUNCH')).reduce((s, a) => s + a.period.spend, 0);
    expect(only).toBeLessThan(all);
  });
});

describe('demo screens', () => {
  it('accounts carry status, cap, threshold and balance due', () => {
    expect(new Set(ACCOUNTS.map((a) => a.status))).toEqual(new Set(['active', 'balance_due']));
    expect(new Set(ACCOUNTS.map((a) => a.brand))).toEqual(new Set(['x', 'y', 'z']));
    for (const a of accountRows({ from: SYNTH_START, to: SYNTH_ANCHOR })) { expect(a.cap).toBeGreaterThan(a.lifetime); expect(a.threshold).toBeGreaterThan(0); }
  });
  it('overview, campaigns, brain render; presets and filter change the output', async () => {
    const o7 = (await get('/overview?range=7d')).t, o3 = (await get('/overview?range=3d')).t, ob = (await get('/overview?range=7d&q=BX-LAUNCH')).t;
    for (const t of [o7, o3]) { expect(t).toContain('Demo data'); expect(t).toContain('Balance due'); expect(t).toContain('balance due'); }
    expect(o7).not.toBe(o3);
    expect(ob).not.toBe(o7);
    const c = (await get('/campaigns?range=30d&q=BX-ALWAYSON&brand=x')).t;
    expect(c).toContain('BX-ALWAYSON-CONVERT_ABO_02');
    expect(c).not.toContain('BX-LAUNCH-AWARE_ABO_01');
    expect(c).toContain('Σ 4 ad sets');
    const custom = (await get('/campaigns?range=custom&from=2026-09-10&to=2026-09-12')).t;
    expect(custom).toContain('Custom · 2026-09-10 to 2026-09-12');
    const b = (await get('/brain?ask=2')).t;
    expect(b).toContain('Media Hub'); expect(b).toContain('Source:');
  });
  it('brain answers are computed from the synthetic data and carry a source tag', () => {
    const a = brainAnswers();
    expect(a).toHaveLength(6);
    for (const x of a) { expect(x.source).toMatch(/^Source:/); expect(x.title.length).toBeGreaterThan(5); }
    expect(a[0].title).toContain('overspend');
    expect(a[4].lines.join(' ')).toMatch(/Spend share/);
  });
  it('serves the script from self, CSP allows fonts only from Google Fonts, no forbidden claims or names', async () => {
    const { r } = await get('/overview');
    const csp = r.headers.get('Content-Security-Policy')!;
    expect(csp).toContain("script-src 'self'"); expect(csp).toContain('fonts.gstatic.com'); expect(csp).toContain("default-src 'none'");
    const js = await handle(new Request('https://hub.test/assets/hub.js'), env());
    expect(js.headers.get('Content-Type')).toContain('javascript');
    const pages = await Promise.all(['/', '/overview', '/campaigns', '/audience', '/brain', '/dashboard', '/memory', '/accounts'].map(async (p) => (await get(p)).t));
    const bad = /real[- ]?time|instant|100%|already integrated/i;
    for (const t of pages) expect(t).not.toMatch(bad);
  });
});

// Private entity names live in a gitignored local file (test/.forbidden-names); claims are checked everywhere.
const LOCAL_NAMES = (() => { try { return readFileSync(new URL('./.forbidden-names', import.meta.url), 'utf8').trim(); } catch { return ''; } })();
const NAMES = new RegExp([LOCAL_NAMES && String.raw`\b(` + LOCAL_NAMES + ')', 'real[- ]?time|instant|100%|already integrated'].filter(Boolean).join('|'), 'i');

describe('brand filter', () => {
  it('brands own disjoint campaigns and accounts; All is the sum', () => {
    const r = { from: SYNTH_START, to: SYNTH_ANCHOR };
    const sp = (b: 'x' | 'y' | 'z' | 'all') => campaignsOf(b).reduce((s, c) => s + campaignStats(c, r).spend, 0);
    expect(campaignsOf('x').length + campaignsOf('y').length + campaignsOf('z').length).toBe(campaigns().length);
    expect(sp('x') + sp('y') + sp('z')).toBe(sp('all'));
    expect(campaignsOf('y').every((c) => c.name.startsWith('BY-'))).toBe(true);
    expect(parseBrand('q')).toBe('all');
    expect(accountRows(r, undefined, 'z').every((a) => a.brand === 'z')).toBe(true);
  });
  it('pages follow the brand param and the other filters together', async () => {
    const y = (await get('/campaigns?brand=y&range=30d')).t, z = (await get('/campaigns?brand=z&q=BZ-STAY&type=ABO')).t;
    expect(y).toContain('BY-SUMMER-AWARE_CBO_01'); expect(y).not.toContain('BX-LAUNCH-AWARE_ABO_01'); expect(y).toContain('Messages');
    expect(z).toContain('BZ-STAY-BOOKING_ABO_02'); expect(z).not.toContain('BZ-STAY-AWARE_CBO_01'); expect(z).toContain('Leads');
    const dx = (await get('/dashboard?brand=x')).t, dy = (await get('/dashboard?brand=y')).t;
    expect(dx).toContain('BX-LAUNCH-AWARE'); expect(dy).toContain('BY-LAUNCH-AWARE'); expect(dy).not.toContain('BX-LAUNCH-AWARE');
    const mem = (await get('/memory?brand=z')).t;
    expect(mem).toContain('L-201'); expect(mem).not.toContain('L-101');
  });
});

describe('demographic aggregation', () => {
  const r30 = resolveRange({ range: '30d' }, SYNTH_ANCHOR, SYNTH_START);
  it('cells add back to the campaign totals and the shares add to 1', () => {
    const cs = campaignsOf('x'), cells = buildCells(cs, r30), t = sumCells(cells);
    const want = cs.reduce((a, c) => add(a, campaignStats(c, r30)), ZERO);
    expect(t.spend).toBeCloseTo(want.spend, 0); expect(t.impressions).toBeCloseTo(want.impressions, 0);
    expect(t.clicks).toBeCloseTo(want.clicks, 0); expect(t.results).toBeCloseTo(want.conversions, 0);
    const m = ageGenderMatrix(cells);
    expect(m.rows.reduce((s, x) => s + x.all.spendShare, 0)).toBeCloseTo(1, 6);
    expect(m.rows.reduce((s, x) => s + x.all.resultShare, 0)).toBeCloseTo(1, 6);
    expect(placementTable(cells).reduce((s, p) => s + p.m.spendShare, 0)).toBeCloseTo(1, 6);
  });
  it('TikTok campaigns only carry TikTok placements, Meta only Meta', () => {
    const cells = buildCells(campaignsOf('y'), r30);
    for (const c of cells) expect((c.platform === 'meta' ? META_PL : TT_PL) as readonly string[]).toContain(c.placement);
  });
  it('follows the timeline and the code filter', () => {
    const r3 = resolveRange({ range: '3d' }, SYNTH_ANCHOR, SYNTH_START);
    expect(sumCells(buildCells(campaignsOf('x'), r3)).spend).toBeLessThan(sumCells(buildCells(campaignsOf('x'), r30)).spend);
    const only = campaignsOf('x').filter((c) => matchesCode(c.name, 'LAUNCH'));
    expect(sumCells(buildCells(only, r30)).spend).toBeLessThan(sumCells(buildCells(campaignsOf('x'), r30)).spend);
  });
  it('is deterministic', () => { expect(JSON.stringify(buildCells(campaignsOf('z'), r30))).toBe(JSON.stringify(buildCells(campaignsOf('z'), r30))); });
});

describe('insight rules', () => {
  const r30 = resolveRange({ range: '30d' }, SYNTH_ANCHOR, SYNTH_START);
  const ins = (b: 'x' | 'y' | 'z') => insightsAll(buildCells(campaignsOf(b), r30), b, 20);
  it('flags wasteful placements, efficient and costly segments, cross pockets, with the numbers behind them', () => {
    const rules = new Set(ins('x').map((i) => i.rule));
    for (const k of ['placement-waste', 'efficient-segment', 'costly-segment', 'cross-star', 'placement-star']) expect(rules.has(k), k).toBe(true);
    const w = ins('x').find((i) => i.rule === 'placement-waste')!;
    expect(w.title).toMatch(/Audience Network: \d+% of spend, \d+% of purchases/);
    expect(w.action).toMatch(/Exclude/); expect(w.facts.length).toBeGreaterThanOrEqual(4);
  });
  it('each brand speaks its own result word; Z surfaces clicks without leads', () => {
    expect(ins('y').some((i) => /messages/.test(i.title))).toBe(true);
    expect(ins('z').some((i) => /leads/.test(i.title))).toBe(true);
    expect(ins('z').some((i) => i.rule === 'engaged-not-converting')).toBe(true);
  });
  it('withholds conclusions when there are too few results', () => {
    const tiny = buildCells(campaignsOf('z').slice(0, 1), resolveRange({ range: 'today' }, SYNTH_ANCHOR, SYNTH_START));
    expect(enoughData(tiny)).toBe(false); expect(insightsAll(tiny, 'z')).toEqual([]);
  });
  it('merges adjacent age bands, and the filters change the cards', async () => {
    expect(ins('x').some((i) => /Women 25–44/.test(i.title))).toBe(true);
    const a = (await get('/audience?brand=x&range=30d')).t, b = (await get('/audience?brand=x&range=30d&pf=meta')).t;
    expect(a).toContain('Suggested action'); expect(a).not.toBe(b); expect(b).not.toContain('TikTok In-feed');
    const all = (await get('/audience')).t;
    expect(all).toContain('Result types differ'); expect(all).toContain('Brand Y');
  });
  it('no page carries a forbidden name or claim', async () => {
    for (const p of ['/', '/overview', '/campaigns', '/audience?brand=y', '/brain?ask=5', '/dashboard', '/memory?sample=1', '/accounts']) expect((await get(p)).t, p).not.toMatch(NAMES);
  });
});
