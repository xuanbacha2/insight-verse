// Synthetic multi-brand demo data (fictional Brand X / Y / Z). Deterministic: same output on every run. No real names, IDs or cards.
import { addDays, daysBetween, type Range } from './timeline';
import { campaignDays, campaignStats, statsFor, ZERO, add, type AdSet, type Campaign, type DayStat } from './campaigns';

export const SYNTH_ANCHOR = '2026-10-11'; // the demo "today"
export const SYNTH_START = '2026-09-01';

export type BrandId = 'x' | 'y' | 'z';
export type Objective = 'purchases' | 'messages' | 'leads';
export interface Brand { id: BrandId; name: string; code: string; vertical: string; objective: Objective; result: string; resultOne: string }
export const BRANDS: Brand[] = [
  { id: 'x', name: 'Brand X', code: 'BX', vertical: 'Food', objective: 'purchases', result: 'Purchases', resultOne: 'purchase' },
  { id: 'y', name: 'Brand Y', code: 'BY', vertical: 'Beverage', objective: 'messages', result: 'Messages', resultOne: 'message' },
  { id: 'z', name: 'Brand Z', code: 'BZ', vertical: 'Hospitality', objective: 'leads', result: 'Leads', resultOne: 'lead' },
];
export const brandById = (id: string | null | undefined): Brand | null => BRANDS.find((b) => b.id === id) ?? null;
export const brandOfCampaign = (c: { name: string }): Brand => BRANDS.find((b) => c.name.startsWith(b.code + '-')) ?? BRANDS[0];
/** 'all' or a brand id; anything else falls back to 'all'. */
export const parseBrand = (v: string | null | undefined): BrandId | 'all' => (BRANDS.some((b) => b.id === v) ? (v as BrandId) : 'all');

export type AcctStatus = 'active' | 'balance_due';
export interface SynthAccount {
  id: string; brand: BrandId; name: string; platform: 'meta' | 'tiktok'; status: AcctStatus; currency: 'VND';
  util: number; threshold: number; balance_due: number; alert: string | null;
}
const M = 1_000_000;
export const ACCOUNTS: SynthAccount[] = [
  { id: 'BX-A101', brand: 'x', name: 'Brand X · Meta Launch', platform: 'meta', status: 'active', currency: 'VND', util: 0.58, threshold: 90 * M, balance_due: 18_600_000, alert: null },
  { id: 'BX-A102', brand: 'x', name: 'Brand X · Meta Always-On', platform: 'meta', status: 'active', currency: 'VND', util: 0.71, threshold: 120 * M, balance_due: 31_200_000, alert: null },
  { id: 'BX-T201', brand: 'x', name: 'Brand X · TikTok', platform: 'tiktok', status: 'active', currency: 'VND', util: 0.93, threshold: 70 * M, balance_due: 22_100_000, alert: 'Spend is close to the account cap' },
  { id: 'BY-A101', brand: 'y', name: 'Brand Y · Meta Summer', platform: 'meta', status: 'balance_due', currency: 'VND', util: 0.77, threshold: 60 * M, balance_due: 74_800_000, alert: 'Balance due is over the billing threshold' },
  { id: 'BY-A102', brand: 'y', name: 'Brand Y · Meta Always-On', platform: 'meta', status: 'active', currency: 'VND', util: 0.64, threshold: 80 * M, balance_due: 26_400_000, alert: null },
  { id: 'BY-T201', brand: 'y', name: 'Brand Y · TikTok', platform: 'tiktok', status: 'active', currency: 'VND', util: 0.52, threshold: 50 * M, balance_due: 9_400_000, alert: null },
  { id: 'BZ-A101', brand: 'z', name: 'Brand Z · Meta Bookings', platform: 'meta', status: 'active', currency: 'VND', util: 0.69, threshold: 100 * M, balance_due: 41_300_000, alert: null },
  { id: 'BZ-T201', brand: 'z', name: 'Brand Z · TikTok', platform: 'tiktok', status: 'active', currency: 'VND', util: 0.46, threshold: 40 * M, balance_due: 12_700_000, alert: null },
];

function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function rng(seed: string) { let a = hash(seed); return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export { hash as hashStr };

interface Spec { acct: string; name: string; type: 'ABO' | 'CBO'; base: number; adsets?: number; paused?: boolean; plan?: number; cpm?: number; ctr?: number; cvr?: number }
const SPECS: Spec[] = [
  // Brand X (food, purchases)
  { acct: 'BX-A101', name: 'BX-LAUNCH-AWARE_ABO_01', type: 'ABO', base: 14 * M, adsets: 3, plan: 0.82, cvr: 0.016 },
  { acct: 'BX-A101', name: 'BX-LAUNCH-VIDEO_CBO_02', type: 'CBO', base: 9 * M, plan: 1.0, cvr: 0.017 },
  { acct: 'BX-A101', name: 'BX-LAUNCH-TRIAL_ABO_03', type: 'ABO', base: 6 * M, adsets: 2, plan: 0.96, cvr: 0.024 },
  { acct: 'BX-A102', name: 'BX-ALWAYSON-REACH_CBO_01', type: 'CBO', base: 11 * M, plan: 1.05, cvr: 0.015 },
  { acct: 'BX-A102', name: 'BX-ALWAYSON-CONVERT_ABO_02', type: 'ABO', base: 16 * M, adsets: 4, plan: 0.88, cvr: 0.026 },
  { acct: 'BX-A102', name: 'BX-ALWAYSON-CONTENT_CBO_03', type: 'CBO', base: 4 * M, paused: true, plan: 1.1, cvr: 0.014 },
  { acct: 'BX-T201', name: 'BX-LAUNCH-TT-AWARE_CBO_01', type: 'CBO', base: 12 * M, plan: 0.9, cpm: 38000, ctr: 0.011, cvr: 0.012 },
  { acct: 'BX-T201', name: 'BX-LAUNCH-TT-CONVERT_ABO_02', type: 'ABO', base: 8 * M, adsets: 3, plan: 0.84, cpm: 42000, ctr: 0.012, cvr: 0.016 },
  // Brand Y (beverage, messages)
  { acct: 'BY-A101', name: 'BY-SUMMER-AWARE_CBO_01', type: 'CBO', base: 10 * M, plan: 1.02, cvr: 0.03 },
  { acct: 'BY-A101', name: 'BY-SUMMER-CHAT_ABO_02', type: 'ABO', base: 9 * M, adsets: 3, plan: 0.93, cvr: 0.045 },
  { acct: 'BY-A101', name: 'BY-SUMMER-STORE_CBO_03', type: 'CBO', base: 5 * M, plan: 1.0, cvr: 0.035 },
  { acct: 'BY-A102', name: 'BY-ALWAYSON-REACH_CBO_01', type: 'CBO', base: 8 * M, plan: 1.08, cvr: 0.028 },
  { acct: 'BY-A102', name: 'BY-ALWAYSON-CHAT_ABO_02', type: 'ABO', base: 12 * M, adsets: 4, plan: 0.9, cvr: 0.046 },
  { acct: 'BY-A102', name: 'BY-ALWAYSON-TEST_ABO_03', type: 'ABO', base: 3 * M, adsets: 2, paused: true, plan: 1.0, cvr: 0.03 },
  { acct: 'BY-T201', name: 'BY-SUMMER-TT-AWARE_CBO_01', type: 'CBO', base: 9 * M, plan: 0.95, cpm: 36000, ctr: 0.013, cvr: 0.024 },
  { acct: 'BY-T201', name: 'BY-SUMMER-TT-CHAT_ABO_02', type: 'ABO', base: 6 * M, adsets: 2, plan: 1.04, cpm: 40000, ctr: 0.014, cvr: 0.032 },
  // Brand Z (hospitality, leads)
  { acct: 'BZ-A101', name: 'BZ-STAY-AWARE_CBO_01', type: 'CBO', base: 8 * M, plan: 0.9, cvr: 0.012 },
  { acct: 'BZ-A101', name: 'BZ-STAY-BOOKING_ABO_02', type: 'ABO', base: 11 * M, adsets: 3, plan: 0.95, cvr: 0.02 },
  { acct: 'BZ-A101', name: 'BZ-EVENTS-LEAD_ABO_03', type: 'ABO', base: 6 * M, adsets: 2, plan: 1.02, cvr: 0.022 },
  { acct: 'BZ-A101', name: 'BZ-WEEKEND-OFFER_CBO_04', type: 'CBO', base: 4 * M, paused: true, plan: 1.0, cvr: 0.016 },
  { acct: 'BZ-T201', name: 'BZ-STAY-TT-AWARE_CBO_01', type: 'CBO', base: 7 * M, plan: 1.0, cpm: 39000, ctr: 0.011, cvr: 0.008 },
  { acct: 'BZ-T201', name: 'BZ-STAY-TT-LEAD_ABO_02', type: 'ABO', base: 5 * M, adsets: 2, plan: 0.92, cpm: 41000, ctr: 0.012, cvr: 0.011 },
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
    const stop = s.paused ? '2026-10-05' : null;
    const id = `${acct.id.slice(0, 2)}C-${String(i + 1).padStart(3, '0')}`;
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
export const campaignBrand = (c: Campaign): BrandId => ACCOUNTS.find((a) => a.id === c.account_id)!.brand;
export const campaignsOf = (brand: BrandId | 'all'): Campaign[] => campaigns().filter((c) => brand === 'all' || campaignBrand(c) === brand);
export const accountsOf = (brand: BrandId | 'all'): SynthAccount[] => ACCOUNTS.filter((a) => brand === 'all' || a.brand === brand);
/** Label of the result metric for a selection: the brand's own (Purchases, Messages, Leads) or a neutral one when brands are mixed. */
export const resultLabel = (brand: BrandId | 'all'): string => (brand === 'all' ? 'Results' : brandById(brand)!.result);

export interface AccountRow extends SynthAccount { period: DayStat; today: DayStat; lifetime: number; cap: number; capPct: number; campaigns: number }
export function accountRows(r: Pick<Range, 'from' | 'to'>, codeFilter?: (name: string) => boolean, brand: BrandId | 'all' = 'all'): AccountRow[] {
  const all = campaigns();
  return accountsOf(brand).map((a) => {
    const cs = all.filter((c) => c.account_id === a.id && (!codeFilter || codeFilter(c.name)));
    const allOfAcct = all.filter((c) => c.account_id === a.id);
    const period = cs.reduce((t, c) => add(t, campaignStats(c, r)), ZERO);
    const today = cs.reduce((t, c) => add(t, campaignStats(c, { from: SYNTH_ANCHOR, to: SYNTH_ANCHOR })), ZERO);
    const lifetime = allOfAcct.reduce((t, c) => t + statsFor(campaignDays(c), { from: SYNTH_START, to: SYNTH_ANCHOR }).spend, 0);
    const cap = Math.ceil(lifetime / a.util / M) * M;
    return { ...a, period, today, lifetime, cap, capPct: lifetime / cap, campaigns: cs.length };
  });
}
