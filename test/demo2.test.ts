import { describe, expect, it } from 'vitest';
import { addDays, resolveRange } from '../src/timeline';
import { campaignDays, campaignStats, effectiveDailyBudget, matchesCode, parseCodes } from '../src/campaigns';
import { ACCOUNTS, accountRows, campaigns, SYNTH_ANCHOR, SYNTH_START } from '../src/synth';
import { brainAnswers } from '../src/pages';
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
    expect(new Set(ACCOUNTS.map((a) => a.status))).toEqual(new Set(['active', 'unsettled', 'disabled']));
    for (const a of accountRows({ from: SYNTH_START, to: SYNTH_ANCHOR })) { expect(a.cap).toBeGreaterThan(a.lifetime); expect(a.threshold).toBeGreaterThan(0); }
  });
  it('overview, campaigns, brain render; presets and filter change the output', async () => {
    const o7 = (await get('/overview?range=7d')).t, o3 = (await get('/overview?range=3d')).t, ob = (await get('/overview?range=7d&q=BX-LAUNCH')).t;
    for (const t of [o7, o3]) { expect(t).toContain('Demo data'); expect(t).toContain('Balance due'); expect(t).toContain('unsettled'); }
    expect(o7).not.toBe(o3);
    expect(ob).not.toBe(o7);
    const c = (await get('/campaigns?range=30d&q=BX-ALWAYSON')).t;
    expect(c).toContain('BX-ALWAYSON-CONVERT_ABO_02');
    expect(c).not.toContain('BX-LAUNCH-AWARE_ABO_01');
    expect(c).toContain('Σ 4 ad sets');
    const custom = (await get('/campaigns?range=custom&from=2026-09-10&to=2026-09-12')).t;
    expect(custom).toContain('Custom · 2026-09-10 to 2026-09-12');
    const b = (await get('/brain?ask=2')).t;
    expect(b).toContain('@Media Hub'); expect(b).toContain('Source:');
  });
  it('brain answers are computed from the synthetic data and carry a source tag', () => {
    const a = brainAnswers();
    expect(a).toHaveLength(4);
    for (const x of a) { expect(x.source).toMatch(/^Source:/); expect(x.title.length).toBeGreaterThan(5); }
    expect(a[0].title).toContain('overspend');
  });
  it('serves the script from self, CSP allows fonts only from Google Fonts, no forbidden claims or names', async () => {
    const { r } = await get('/overview');
    const csp = r.headers.get('Content-Security-Policy')!;
    expect(csp).toContain("script-src 'self'"); expect(csp).toContain('fonts.gstatic.com'); expect(csp).toContain("default-src 'none'");
    const js = await handle(new Request('https://hub.test/assets/hub.js'), env());
    expect(js.headers.get('Content-Type')).toContain('javascript');
    const pages = await Promise.all(['/', '/overview', '/campaigns', '/brain', '/dashboard', '/memory'].map(async (p) => (await get(p)).t));
    const bad = /real[- ]?time|instant|100%|already integrated/i;
    for (const t of pages) expect(t).not.toMatch(bad);
  });
});
