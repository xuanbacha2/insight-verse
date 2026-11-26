// Synthetic multi-account demo data (fictional BRAND X). Deterministic: same output on every run. No real names, IDs or cards.
import { addDays, daysBetween, type Range } from './timeline';
import { campaignDays, campaignStats, statsFor, ZERO, add, type AdSet, type Campaign, type DayStat } from './campaigns';

export const SYNTH_ANCHOR = '2026-10-11'; // the demo "today"
export const SYNTH_START = '2026-09-01';

export type AcctStatus = 'active' | 'unsettled' | 'disabled';
export interface SynthAccount {
  id: string; name: string; platform: 'meta' | 'tiktok'; status: AcctStatus; currency: 'VND';
  util: number; threshold: number; balance_due: number; alert: string | null;
}
const M = 1_000_000;
export const ACCOUNTS: SynthAccount[] = [
  { id: 'BX-A101', name: 'BRAND X · Launch', platform: 'meta', status: 'active', currency: 'VND', util: 0.58, threshold: 90 * M, balance_due: 18_600_000, alert: null },
  { id: 'BX-A102', name: 'BRAND X · Always-On', platform: 'meta', status: 'active', currency: 'VND', util: 0.71, threshold: 120 * M, balance_due: 31_200_000, alert: null },
  { id: 'BX-A103', name: 'BRAND X · Retarget', platform: 'meta', status: 'unsettled', currency: 'VND', util: 0.77, threshold: 60 * M, balance_due: 74_800_000, alert: 'Balance due is over the billing threshold' },
  { id: 'BX-A104', name: 'BRAND X · Regional Test', platform: 'meta', status: 'disabled', currency: 'VND', util: 0.34, threshold: 30 * M, balance_due: 0, alert: 'Account disabled after a policy review' },
  { id: 'BX-T201', name: 'BRAND X · TikTok Launch', platform: 'tiktok', status: 'active', currency: 'VND', util: 0.64, threshold: 70 * M, balance_due: 22_100_000, alert: null },
  { id: 'BX-T202', name: 'BRAND X · TikTok Always-On', platform: 'tiktok', status: 'active', currency: 'VND', util: 0.93, threshold: 50 * M, balance_due: 9_400_000, alert: 'Spend is close to the account cap' },
];

function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed: string) { let a = hash(seed); return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

interface Spec { acct: string; name: string; type: 'ABO' | 'CBO'; base: number; adsets?: number; paused?: boolean; plan?: number; cpm?: number; ctr?: number; cvr?: number }
const SPECS: Spec[] = [
  { acct: 'BX-A101', name: 'BX-LAUNCH-AWARE_ABO_01', type: 'ABO', base: 14 * M, adsets: 3, plan: 0.82 },
  { acct: 'BX-A101', name: 'BX-LAUNCH-VIDEO_CBO_02', type: 'CBO', base: 9 * M, plan: 1.0 },
  { acct: 'BX-A101', name: 'BX-LAUNCH-TRIAL_ABO_03', type: 'ABO', base: 6 * M, adsets: 2, plan: 0.96 },
  { acct: 'BX-A102', name: 'BX-ALWAYSON-REACH_CBO_01', type: 'CBO', base: 11 * M, plan: 1.05 },
  { acct: 'BX-A102', name: 'BX-ALWAYSON-CONVERT_ABO_02', type: 'ABO', base: 16 * M, adsets: 4, plan: 0.88 },
  { acct: 'BX-A102', name: 'BX-ALWAYSON-CONTENT_CBO_03', type: 'CBO', base: 4 * M, paused: true, plan: 1.1 },
  { acct: 'BX-A103', name: 'BX-RETARGET-CART_ABO_01', type: 'ABO', base: 7 * M, adsets: 2, plan: 0.9 },
  { acct: 'BX-A103', name: 'BX-RETARGET-VIEWERS_CBO_02', type: 'CBO', base: 5 * M, plan: 0.97 },
  { acct: 'BX-A103', name: 'BX-LAUNCH-RETARGET_CBO_03', type: 'CBO', base: 6 * M, plan: 1.0 },
  { acct: 'BX-A104', name: 'BX-REGIONAL-TEST_ABO_01', type: 'ABO', base: 3 * M, adsets: 2, paused: true, plan: 1.0 },
  { acct: 'BX-T201', name: 'BX-LAUNCH-TT-AWARE_CBO_01', type: 'CBO', base: 12 * M, plan: 0.9, cpm: 38000, ctr: 0.011 },
  { acct: 'BX-T201', name: 'BX-LAUNCH-TT-CONVERT_ABO_02', type: 'ABO', base: 8 * M, adsets: 3, plan: 0.84, cpm: 42000, ctr: 0.012 },
  { acct: 'BX-T202', name: 'BX-ALWAYSON-TT-REACH_CBO_01', type: 'CBO', base: 7 * M, plan: 1.0, cpm: 36000, ctr: 0.010 },
  { acct: 'BX-T202', name: 'BX-ALWAYSON-TT-SPARK_ABO_02', type: 'ABO', base: 5 * M, adsets: 2, plan: 1.04, cpm: 40000, ctr: 0.012 },
];

function series(seed: string, base: number, s: Spec, from: string, to: string, stopAfter: string | null): Record<string, DayStat> {
  const r = rng(seed), out: Record<string, DayStat> = {};
  const cpm = s.cpm ?? 52000, ctr = s.ctr ?? 0.0085, cvr = s.cvr ?? 0.02;
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const dow = new Date(d + 'T00:00:00Z').getUTCDay();
    const wk = dow === 0 || dow === 6 ? 1.12 : 1;
    const drift = 1 + (daysBetween(from, d) / 40) * 0.12;
    if (stopAfter && d > stopAfter) { out[d] = { ...ZERO }; continue; }
    const spend = Math.round(base * wk * drift * (0.85 + r() * 0.3) / 1000) * 1000;
    const impressions = Math.round(spend / cpm * 1000 * (0.92 + r() * 0.16));
    const clicks = Math.round(impressions * ctr * (0.9 + r() * 0.2));
    const conversions = Math.round(clicks * cvr * (0.7 + r() * 0.6));
    out[d] = { spend, impressions, clicks, conversions };
  }
  return out;
}

function build(): Campaign[] {
  return SPECS.map((s, i) => {
    const acct = ACCOUNTS.find((a) => a.id === s.acct)!;
    const stop = acct.status === 'disabled' ? '2026-10-01' : s.paused ? '2026-10-05' : null;
    const id = `BXC-${String(i + 1).padStart(3, '0')}`;
    let adsets: AdSet[] = [], days: Record<string, DayStat> = {}, daily = 0;
    if (s.type === 'ABO') {
      const n = s.adsets ?? 2, weights = Array.from({ length: n }, (_, k) => 1 + ((hash(id + k) % 70) / 100));
      const wsum = weights.reduce((a, b) => a + b, 0);
      adsets = weights.map((w, k) => {
        const share = w / wsum;
        return { id: `${id}-S${k + 1}`, name: `${['Core audience', 'Lookalike 1%', 'Interest stack', 'Broad'][k % 4]} · set ${k + 1}`,
          daily_budget: Math.round((s.base * 1.05 * share) / 100000) * 100000,
          days: series(`${id}-S${k}`, s.base * share, s, SYNTH_START, SYNTH_ANCHOR, stop) };
      });
      daily = 0; // ABO: the platform reports 0 at campaign level
    } else {
      daily = Math.round((s.base * 1.05) / 100000) * 100000;
      days = series(id, s.base, s, SYNTH_START, SYNTH_ANCHOR, stop);
    }
    return { id, account_id: s.acct, platform: acct.platform, name: s.name, status: stop ? 'paused' : 'active', budget_type: s.type, daily_budget: daily, adsets, days, planned_daily: Math.round(s.base * (s.plan ?? 1)) };
  });
}
let CACHE: Campaign[] | null = null;
export const campaigns = (): Campaign[] => (CACHE ??= build());

export interface AccountRow extends SynthAccount { period: DayStat; today: DayStat; lifetime: number; cap: number; capPct: number; campaigns: number }
export function accountRows(r: Pick<Range, 'from' | 'to'>, codeFilter?: (name: string) => boolean): AccountRow[] {
  const all = campaigns();
  return ACCOUNTS.map((a) => {
    const cs = all.filter((c) => c.account_id === a.id && (!codeFilter || codeFilter(c.name)));
    const allOfAcct = all.filter((c) => c.account_id === a.id);
    const period = cs.reduce((t, c) => add(t, campaignStats(c, r)), ZERO);
    const today = cs.reduce((t, c) => add(t, campaignStats(c, { from: SYNTH_ANCHOR, to: SYNTH_ANCHOR })), ZERO);
    const lifetime = allOfAcct.reduce((t, c) => t + statsFor(campaignDays(c), { from: SYNTH_START, to: SYNTH_ANCHOR }).spend, 0);
    const cap = Math.ceil(lifetime / a.util / M) * M;
    return { ...a, period, today, lifetime, cap, capPct: lifetime / cap, campaigns: cs.length };
  });
}
