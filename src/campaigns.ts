// Campaign maths: ABO budget rollup, campaign-code filter, range aggregation.
import { inRange, type Range } from './timeline';

export interface DayStat { spend: number; impressions: number; clicks: number; conversions: number }
export interface AdSet { id: string; name: string; daily_budget: number; days: Record<string, DayStat> }
export interface Campaign {
  id: string; account_id: string; platform: 'meta' | 'tiktok'; name: string; status: 'active' | 'paused';
  budget_type: 'ABO' | 'CBO';
  /** Raw value as the platform reports it: 0 for ABO (budget lives on the ad sets). */
  daily_budget: number;
  adsets: AdSet[];
  /** CBO campaigns carry their own daily series; ABO campaigns derive theirs from ad sets. */
  days: Record<string, DayStat>;
  planned_daily: number;
}
export const ZERO: DayStat = { spend: 0, impressions: 0, clicks: 0, conversions: 0 };
export const add = (a: DayStat, b: DayStat): DayStat => ({ spend: a.spend + b.spend, impressions: a.impressions + b.impressions, clicks: a.clicks + b.clicks, conversions: a.conversions + b.conversions });

/** ABO: the campaign has no budget of its own, so the daily budget shown is the sum of its ad sets. CBO: its own budget. */
export const effectiveDailyBudget = (c: Campaign): number => (c.budget_type === 'ABO' ? c.adsets.reduce((s, a) => s + a.daily_budget, 0) : c.daily_budget);

/** Day series used for tables: ABO campaigns are the sum of their ad sets. */
export function campaignDays(c: Campaign): Record<string, DayStat> {
  if (c.budget_type !== 'ABO') return c.days;
  const out: Record<string, DayStat> = {};
  for (const a of c.adsets) for (const [d, s] of Object.entries(a.days)) out[d] = add(out[d] ?? ZERO, s);
  return out;
}
export function statsFor(days: Record<string, DayStat>, r: Pick<Range, 'from' | 'to'>): DayStat {
  let t = ZERO;
  for (const [d, s] of Object.entries(days)) if (inRange(d, r)) t = add(t, s);
  return t;
}
export const campaignStats = (c: Campaign, r: Pick<Range, 'from' | 'to'>) => statsFor(campaignDays(c), r);

/** Substring filter on campaign name/code. Several terms separated by comma, semicolon or whitespace are OR-ed. Empty = all. */
export function parseCodes(q: string | null | undefined): string[] {
  return (q ?? '').split(/[,;\s]+/).map((x) => x.trim().toLowerCase()).filter(Boolean).slice(0, 8);
}
export function matchesCode(name: string, q: string | null | undefined): boolean {
  const terms = parseCodes(q);
  if (!terms.length) return true;
  const n = name.toLowerCase();
  return terms.some((t) => n.includes(t));
}

export const ctr = (s: DayStat) => (s.impressions ? s.clicks / s.impressions : null);
export const cpa = (s: DayStat) => (s.conversions ? s.spend / s.conversions : null);
