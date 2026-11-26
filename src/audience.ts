// Demographic x placement model (synthetic) and rule-based insight generation.
// Each campaign's totals for the selected range are split over age x gender x placement cells with fixed, per-brand
// weights, so every filter (timeline, brand, campaign code) flows through and the totals always add back up.
import { campaignStats, type Campaign } from './campaigns';
import { brandOfCampaign, brandById, rng, type BrandId } from './synth';

export const AGES = ['13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'] as const;
export const GENDERS = ['female', 'male', 'unknown'] as const;
export const META_PL = ['Facebook Feed', 'Facebook Reels', 'Facebook Stories', 'Instagram Feed', 'Instagram Reels', 'Instagram Stories', 'Messenger', 'Audience Network'] as const;
export const TT_PL = ['TikTok In-feed', 'TikTok Search', 'Pangle & other'] as const;
export type Age = (typeof AGES)[number];
export type Gender = (typeof GENDERS)[number];
export const GENDER_LABEL: Record<Gender, string> = { female: 'Women', male: 'Men', unknown: 'Unknown' };
export const placementsOf = (platform: 'meta' | 'tiktok'): readonly string[] => (platform === 'meta' ? META_PL : TT_PL);

export interface Cell { brand: BrandId; platform: 'meta' | 'tiktok'; age: Age; gender: Gender; placement: string; spend: number; impressions: number; clicks: number; results: number }

// ---------------------------------------------------------------- weights (per brand)
// Spend: where the money goes. Eff: results per unit of spend relative to the average (the "truth" the insights should find).
const AGE_SPEND = [0.012, 0.13, 0.27, 0.24, 0.16, 0.12, 0.068];
const AGE_CTR = [1.2, 1.25, 1.1, 1, 0.9, 0.85, 0.8];
const GEN_SPEND: Record<BrandId, number[]> = { x: [0.54, 0.43, 0.03], y: [0.49, 0.48, 0.03], z: [0.5, 0.47, 0.03] };
const AGE_EFF: Record<BrandId, number[]> = {
  x: [0.3, 0.9, 1.35, 1.25, 0.95, 0.65, 0.45],
  y: [0.5, 1.3, 1.25, 0.9, 0.7, 0.5, 0.35],
  z: [0.2, 0.6, 1.0, 1.4, 1.4, 1.0, 0.6],
};
const GEN_EFF: Record<BrandId, number[]> = { x: [1.12, 0.78, 0.5], y: [1.0, 1.05, 0.4], z: [1.15, 0.9, 0.5] };
const PL_SPEND: Record<string, number[]> = {
  x: [0.24, 0.12, 0.06, 0.12, 0.18, 0.08, 0.06, 0.14], y: [0.22, 0.13, 0.07, 0.17, 0.2, 0.05, 0.04, 0.12], z: [0.2, 0.2, 0.06, 0.14, 0.19, 0.05, 0.05, 0.11],
  tx: [0.6, 0.12, 0.28], ty: [0.62, 0.1, 0.28], tz: [0.55, 0.12, 0.33],
};
const PL_EFF: Record<string, number[]> = {
  x: [1.0, 1.05, 0.8, 0.95, 1.45, 1.0, 0.9, 0.25], y: [0.7, 0.9, 1.0, 0.8, 1.3, 1.5, 1.6, 0.3], z: [1.3, 0.5, 0.5, 1.0, 0.6, 0.6, 1.2, 0.22],
  tx: [1.1, 1.3, 0.35], ty: [0.9, 1.1, 0.4], tz: [0.6, 0.8, 0.3],
};
const PL_CTR: Record<string, number[]> = { m: [1, 1.3, 0.9, 1, 1.5, 1.1, 0.7, 1.7], t: [1.4, 0.8, 1.8] };
const PL_CPM: Record<string, number[]> = { m: [1, 0.8, 0.7, 1.1, 0.85, 0.75, 0.9, 0.45], t: [1, 1.2, 0.5] };

/** Extra lift or drag on specific cells: the interactions the insights should be able to surface. */
function boost(b: BrandId, age: number, gender: number, pl: string): number {
  let m = 1;
  if (b === 'x') { if (gender === 0 && (age === 2 || age === 3) && pl === 'Instagram Reels') m *= 1.4; if (gender === 1 && age >= 5) m *= 0.7; }
  if (b === 'y') { if (age === 1 && pl === 'Instagram Stories') m *= 1.3; if (pl === 'Messenger' && age <= 2) m *= 1.2; }
  if (b === 'z') { if ((age === 3 || age === 4) && pl === 'Facebook Feed') m *= 1.25; if (gender === 0 && age === 3 && pl === 'Messenger') m *= 1.2; }
  return m;
}

interface W { cell: Omit<Cell, 'spend' | 'impressions' | 'clicks' | 'results'>; s: number; e: number; ctr: number; cpm: number }
const WCACHE = new Map<string, W[]>();
function weights(c: Campaign): W[] {
  const hit = WCACHE.get(c.id);
  if (hit) return hit;
  const b = brandOfCampaign(c).id, r = rng('aud-' + c.id), pls = placementsOf(c.platform);
  const key = c.platform === 'meta' ? b : 't' + b, ck = c.platform === 'meta' ? 'm' : 't';
  const out: W[] = [];
  AGES.forEach((age, a) => GENDERS.forEach((gender, g) => pls.forEach((placement, p) => {
    const noise = 0.88 + r() * 0.24;
    out.push({
      cell: { brand: b, platform: c.platform, age, gender, placement },
      s: AGE_SPEND[a] * GEN_SPEND[b][g] * PL_SPEND[key][p] * (0.9 + r() * 0.2),
      e: AGE_EFF[b][a] * GEN_EFF[b][g] * PL_EFF[key][p] * boost(b, a, g, placement) * noise,
      ctr: AGE_CTR[a] * PL_CTR[ck][p] * (g === 0 ? 1.04 : 1) * (b === 'z' && /Reels/.test(placement) ? 1.3 : 1),
      cpm: PL_CPM[ck][p] * (a === 1 || a === 2 ? 1.08 : 0.95),
    });
  })));
  WCACHE.set(c.id, out);
  return out;
}

/** Split the campaigns' totals for the range over cells. Cells are merged across campaigns by (brand, platform, age, gender, placement). */
export function buildCells(cs: Campaign[], range: { from: string; to: string }): Cell[] {
  const acc = new Map<string, Cell>();
  for (const c of cs) {
    const t = campaignStats(c, range);
    if (!t.spend) continue;
    const w = weights(c);
    const sS = w.reduce((x, y) => x + y.s, 0);
    const spends = w.map((x) => (t.spend * x.s) / sS);
    const impW = w.map((x, i) => spends[i] / x.cpm), sI = impW.reduce((x, y) => x + y, 0);
    const imps = impW.map((x) => (t.impressions * x) / sI);
    const clkW = w.map((x, i) => imps[i] * x.ctr), sC = clkW.reduce((x, y) => x + y, 0);
    const resW = w.map((x, i) => spends[i] * x.e), sR = resW.reduce((x, y) => x + y, 0);
    w.forEach((x, i) => {
      const k = `${x.cell.brand}|${x.cell.platform}|${x.cell.age}|${x.cell.gender}|${x.cell.placement}`;
      let cur = acc.get(k);
      if (!cur) acc.set(k, (cur = { ...x.cell, spend: 0, impressions: 0, clicks: 0, results: 0 }));
      cur.spend += spends[i]; cur.impressions += imps[i]; cur.clicks += (t.clicks * clkW[i]) / sC; cur.results += (t.conversions * resW[i]) / sR;
    });
  }
  return [...acc.values()];
}

// ---------------------------------------------------------------- aggregation
export interface Agg { spend: number; impressions: number; clicks: number; results: number }
export const ZERO_AGG: Agg = { spend: 0, impressions: 0, clicks: 0, results: 0 };
export const sumCells = (cs: Cell[]): Agg => cs.reduce((t, c) => ({ spend: t.spend + c.spend, impressions: t.impressions + c.impressions, clicks: t.clicks + c.clicks, results: t.results + c.results }), { ...ZERO_AGG });
export function groupCells<K extends string>(cs: Cell[], key: (c: Cell) => K): Map<K, Agg> {
  const m = new Map<K, Agg>();
  for (const c of cs) {
    const k = key(c), cur = m.get(k) ?? { ...ZERO_AGG };
    cur.spend += c.spend; cur.impressions += c.impressions; cur.clicks += c.clicks; cur.results += c.results; m.set(k, cur);
  }
  return m;
}
export interface Metrics { spend: number; impressions: number; clicks: number; results: number; ctr: number | null; cpr: number | null; spendShare: number; resultShare: number; index: number | null; cprVsAvg: number | null; ctrVsAvg: number | null }
export function metricsOf(a: Agg, total: Agg): Metrics {
  const ctr = a.impressions ? a.clicks / a.impressions : null, cpr = a.results ? a.spend / a.results : null;
  const tctr = total.impressions ? total.clicks / total.impressions : null, tcpr = total.results ? total.spend / total.results : null;
  const spendShare = total.spend ? a.spend / total.spend : 0, resultShare = total.results ? a.results / total.results : 0;
  return { ...a, ctr, cpr, spendShare, resultShare, index: spendShare > 0 ? resultShare / spendShare : null,
    cprVsAvg: cpr !== null && tcpr ? cpr / tcpr : null, ctrVsAvg: ctr !== null && tctr ? ctr / tctr : null };
}

export interface Matrix { rows: Array<{ age: Age; cells: Record<Gender, Metrics>; all: Metrics }>; total: Metrics }
export function ageGenderMatrix(cs: Cell[]): Matrix {
  const total = sumCells(cs), g = groupCells(cs, (c) => `${c.age}|${c.gender}`);
  const ga = groupCells(cs, (c) => c.age);
  return {
    total: metricsOf(total, total),
    rows: AGES.map((age) => ({ age, all: metricsOf(ga.get(age) ?? ZERO_AGG, total),
      cells: Object.fromEntries(GENDERS.map((gd) => [gd, metricsOf(g.get(`${age}|${gd}`) ?? ZERO_AGG, total)])) as Record<Gender, Metrics> })),
  };
}
export function placementTable(cs: Cell[]): Array<{ platform: 'meta' | 'tiktok'; placement: string; m: Metrics }> {
  const total = sumCells(cs), g = groupCells(cs, (c) => `${c.platform}|${c.placement}`);
  const out: Array<{ platform: 'meta' | 'tiktok'; placement: string; m: Metrics }> = [];
  for (const [k, a] of g) { const [platform, placement] = k.split('|'); out.push({ platform: platform as 'meta' | 'tiktok', placement, m: metricsOf(a, total) }); }
  return out.sort((x, y) => (x.platform === y.platform ? y.m.spend - x.m.spend : x.platform === 'meta' ? -1 : 1));
}
export interface CrossRow { age: Age; gender: Gender; placement: string; platform: 'meta' | 'tiktok'; m: Metrics }
export function crossTable(cs: Cell[]): CrossRow[] {
  const total = sumCells(cs);
  return cs.map((c) => ({ age: c.age, gender: c.gender, placement: c.placement, platform: c.platform, m: metricsOf(c, total) }));
}
/** Top segments by efficiency: needs a minimum share of spend and a minimum number of results so tiny cells do not win. */
export function topSegments(cs: Cell[], n = 8, minSpendShare = 0.015, minResults = 25): CrossRow[] {
  return crossTable(cs).filter((r) => r.m.spendShare >= minSpendShare && r.m.results >= minResults && r.m.index !== null).sort((a, b) => b.m.index! - a.m.index!).slice(0, n);
}
export function bottomSegments(cs: Cell[], n = 5, minSpendShare = 0.015): CrossRow[] {
  return crossTable(cs).filter((r) => r.m.spendShare >= minSpendShare && r.m.index !== null).sort((a, b) => a.m.index! - b.m.index!).slice(0, n);
}

// ---------------------------------------------------------------- insights
export type Kind = 'shift' | 'cut' | 'exclude' | 'test' | 'fix' | 'watch';
export interface Insight {
  id: string; rule: string; kind: Kind; brand: BrandId; title: string; action: string; impact: number;
  facts: Array<{ k: string; v: string }>;
}
const pct = (x: number, d = 0) => `${(x * 100).toFixed(d)}%`;
const mult = (x: number) => `${x.toFixed(1)}x`;
const vnd = (x: number) => (x >= 1e6 ? `${(x / 1e6).toFixed(1)}M` : `${Math.round(x / 1e3)}K`);
export const MIN_RESULTS = 100;

const segLabel = (g: Gender, ages: string) => `${GENDER_LABEL[g]} ${ages}`;
function ageSpan(list: Age[]): string {
  const f = list[0], l = list[list.length - 1];
  if (list.length === 1) return f === '65+' ? '65+' : f.replace('-', '–');
  return l === '65+' ? `${f.split('-')[0]}+` : `${f.split('-')[0]}–${l.split('-')[1]}`;
}
/** Merge consecutive age bands that share a gender into one label ("Men 55+"). */
function mergeBands(rows: Array<{ age: Age; gender: Gender }>): Array<{ gender: Gender; ages: Age[]; label: string }> {
  const out: Array<{ gender: Gender; ages: Age[]; label: string }> = [];
  for (const g of GENDERS) {
    const idx = rows.filter((r) => r.gender === g).map((r) => AGES.indexOf(r.age)).sort((a, b) => a - b);
    let run: number[] = [];
    const flush = () => { if (run.length) { const ages = run.map((i) => AGES[i]); out.push({ gender: g, ages, label: segLabel(g, ageSpan(ages)) }); } run = []; };
    for (const i of idx) { if (run.length && i !== run[run.length - 1] + 1) flush(); run.push(i); }
    flush();
  }
  return out;
}

export function insightsFor(cs: Cell[], brandId: BrandId): Insight[] {
  const b = brandById(brandId)!, res = b.result.toLowerCase();
  const total = sumCells(cs);
  if (total.results < MIN_RESULTS || total.spend <= 0) return [];
  const T = metricsOf(total, total);
  const out: Insight[] = [];
  const facts = (m: Metrics): Array<{ k: string; v: string }> => [
    { k: 'Spend share', v: pct(m.spendShare, 1) }, { k: `${b.result} share`, v: pct(m.resultShare, 1) },
    { k: 'Cost per result', v: m.cpr ? `${vnd(m.cpr)} (${mult(m.cprVsAvg ?? 1)} avg)` : '-' }, { k: 'CTR', v: m.ctr !== null ? `${pct(m.ctr, 2)} (${mult(m.ctrVsAvg ?? 1)} avg)` : '-' }, { k: 'Results', v: Math.round(m.results).toLocaleString('en-US') },
  ];
  const impact = (m: Metrics) => Math.abs(m.spend * (1 - 1 / (m.index ?? 1)));

  // age x gender
  const g = groupCells(cs, (c) => `${c.age}|${c.gender}`);
  const seg = [...g.entries()].map(([k, a]) => { const [age, gender] = k.split('|') as [Age, Gender]; return { age, gender, m: metricsOf(a, total) }; }).filter((s) => s.gender !== 'unknown');

  // R1: efficient demographic segments
  for (const band of mergeBands(seg.filter((s) => s.m.index !== null && s.m.index >= 1.35 && s.m.spendShare >= 0.04 && s.m.results >= 30))) {
    const m = metricsOf(sumCells(cs.filter((c) => c.gender === band.gender && band.ages.includes(c.age))), total);
    out.push({ id: `shift-${band.gender}-${band.ages[0]}`, rule: 'efficient-segment', kind: 'shift', brand: brandId,
      title: `${band.label} bring ${pct(m.resultShare)} of ${res} at ${pct(m.spendShare)} of spend`,
      action: `Shift budget toward ${band.label}: raise their ad set budgets by about 20% and watch cost per result for 3 days.`, impact: impact(m), facts: facts(m) });
  }
  // R2: expensive demographic segments
  for (const band of mergeBands(seg.filter((s) => s.m.cprVsAvg !== null && s.m.cprVsAvg >= 1.8 && s.m.spendShare >= 0.03))) {
    const m = metricsOf(sumCells(cs.filter((c) => c.gender === band.gender && band.ages.includes(c.age))), total);
    out.push({ id: `cut-${band.gender}-${band.ages[0]}`, rule: 'costly-segment', kind: 'cut', brand: brandId,
      title: `${band.label}: cost per result is ${mult(m.cprVsAvg ?? 1)} the average`,
      action: `Narrow targeting or exclude ${band.label} from broad ad sets; move that ${pct(m.spendShare)} of spend to the efficient segments.`, impact: impact(m), facts: facts(m) });
  }
  // placements
  const pt = placementTable(cs);
  for (const p of pt) {
    const m = p.m;
    if (m.spendShare >= 0.06 && m.index !== null && m.index <= 0.4)
      out.push({ id: `excl-${p.placement}`, rule: 'placement-waste', kind: 'exclude', brand: brandId,
        title: `${p.placement}: ${pct(m.spendShare)} of spend, ${pct(m.resultShare)} of ${res}`,
        action: `Exclude ${p.placement} in placement settings and let that budget flow to the placements that convert.`, impact: impact(m), facts: facts(m) });
    else if (m.index !== null && m.index >= 1.4 && m.spendShare <= 0.2 && m.spendShare >= 0.04)
      out.push({ id: `star-${p.placement}`, rule: 'placement-star', kind: 'shift', brand: brandId,
        title: `${p.placement} brings ${pct(m.resultShare)} of ${res} at ${pct(m.spendShare)} of spend`,
        action: `Give ${p.placement} more room: build a dedicated creative cut for it and raise its share of spend step by step.`, impact: impact(m), facts: facts(m) });
    if (m.ctrVsAvg !== null && m.ctrVsAvg >= 1.2 && m.cprVsAvg !== null && m.cprVsAvg >= 1.25 && m.spendShare >= 0.05 && !(m.spendShare >= 0.06 && m.index !== null && m.index <= 0.4))
      out.push({ id: `engaged-${p.placement}`, rule: 'engaged-not-converting', kind: 'fix', brand: brandId,
        title: `${p.placement} gets ${mult(m.ctrVsAvg)} the clicks but costs ${mult(m.cprVsAvg)} per result`,
        action: `People tap but do not act. Check the first screen after the click (offer, landing page, ${b.objective === 'messages' ? 'opening message' : b.objective === 'leads' ? 'form length' : 'checkout steps'}) before adding spend.`, impact: impact(m) * 0.8, facts: facts(m) });
  }
  // R: under-served efficient placement or segment (test)
  for (const p of pt) {
    const m = p.m;
    if (m.cprVsAvg !== null && m.cprVsAvg <= 0.7 && m.spendShare < 0.04 && m.results >= 15)
      out.push({ id: `test-${p.placement}`, rule: 'under-served', kind: 'test', brand: brandId,
        title: `${p.placement} is cheap but gets only ${pct(m.spendShare, 1)} of spend`,
        action: `Run a small test: double its budget for a week and check that cost per result holds.`, impact: m.spend * 0.5, facts: facts(m) });
  }
  // R: cross cells
  for (const r of topSegments(cs, 3, 0.012, 20).filter((x) => x.gender !== 'unknown' && x.m.index! >= 1.8)) {
    out.push({ id: `cross-${r.age}-${r.gender}-${r.placement}`, rule: 'cross-star', kind: 'shift', brand: brandId,
      title: `${segLabel(r.gender, ageSpan([r.age]))} on ${r.placement}: ${mult(r.m.index!)} more ${res} than their spend share`,
      action: `Treat this pocket as a priority audience: dedicated ad set, creative made for ${r.placement}.`, impact: impact(r.m) * 0.9, facts: facts(r.m) });
  }
  // R: platform gap
  const byPlat = groupCells(cs, (c) => c.platform), meta = byPlat.get('meta'), tt = byPlat.get('tiktok');
  if (meta && tt) {
    const mm = metricsOf(meta, total), tm = metricsOf(tt, total);
    if (mm.cpr && tm.cpr && mm.spendShare >= 0.1 && tm.spendShare >= 0.1) {
      const hi = tm.cpr > mm.cpr ? tm : mm, lo = hi === tm ? mm : tm, hiName = hi === tm ? 'TikTok' : 'Meta', loName = hi === tm ? 'Meta' : 'TikTok';
      if (hi.cpr! / lo.cpr! >= 1.25)
        out.push({ id: 'platform-gap', rule: 'platform-gap', kind: 'shift', brand: brandId,
          title: `${hiName} costs ${mult(hi.cpr! / lo.cpr!)} ${loName} per result`,
          action: `Cap ${hiName} at its current share of ${pct(hi.spendShare)} and move the next budget step to ${loName} until the gap closes.`, impact: impact(hi) * 0.7,
          facts: [{ k: `${hiName} cost per result`, v: vnd(hi.cpr!) }, { k: `${loName} cost per result`, v: vnd(lo.cpr!) }, { k: `${hiName} spend share`, v: pct(hi.spendShare, 1) }, { k: `${hiName} ${b.result} share`, v: pct(hi.resultShare, 1) }] });
    }
  }
  // R: gender skew
  const gg = groupCells(cs, (c) => c.gender), fe = gg.get('female');
  if (fe) {
    const m = metricsOf(fe, total), male = metricsOf(gg.get('male') ?? ZERO_AGG, total);
    const hi = m.resultShare - m.spendShare >= male.resultShare - male.spendShare ? { m, n: 'Women' } : { m: male, n: 'Men' };
    if (hi.m.resultShare - hi.m.spendShare >= 0.08)
      out.push({ id: 'gender-skew', rule: 'gender-skew', kind: 'shift', brand: brandId,
        title: `${hi.n} bring ${pct(hi.m.resultShare)} of ${res} at ${pct(hi.m.spendShare)} of spend`,
        action: `Lean the creative and copy toward ${hi.n.toLowerCase()} and keep the other gender on a smaller test budget.`, impact: impact(hi.m) * 0.6, facts: facts(hi.m) });
  }
  // R: concentration
  const top3 = [...seg].sort((a, b2) => b2.m.results - a.m.results).slice(0, 3);
  const share = top3.reduce((s, x) => s + x.m.resultShare, 0);
  if (share >= 0.55)
    out.push({ id: 'concentration', rule: 'concentration', kind: 'watch', brand: brandId,
      title: `Three segments carry ${pct(share)} of ${res}`,
      action: `Keep one creative line per segment (${top3.map((x) => segLabel(x.gender, ageSpan([x.age]))).join(', ')}) and refresh it every 3 to 4 weeks to avoid fatigue.`, impact: total.spend * 0.02,
      facts: [{ k: 'Top segments', v: top3.map((x) => segLabel(x.gender, ageSpan([x.age]))).join(' · ') }, { k: `${b.result} share`, v: pct(share, 1) }, { k: 'Spend share', v: pct(top3.reduce((s, x) => s + x.m.spendShare, 0), 1) }, { k: 'Results', v: Math.round(top3.reduce((s, x) => s + x.m.results, 0)).toLocaleString('en-US') }] });
  return out.sort((x, y) => y.impact - x.impact);
}

export function insightsAll(cs: Cell[], brand: BrandId | 'all', limit = 8): Insight[] {
  const ids: BrandId[] = brand === 'all' ? ['x', 'y', 'z'] : [brand];
  const per = ids.map((id) => insightsFor(cs.filter((c) => c.brand === id), id));
  if (brand !== 'all') return per[0].slice(0, limit);
  // all brands: take the strongest few of each so every brand is represented
  const each = Math.max(1, Math.ceil(limit / 3));
  return per.flatMap((p) => p.slice(0, each)).sort((a, b2) => b2.impact - a.impact).slice(0, limit);
}
export const enoughData = (cs: Cell[]): boolean => sumCells(cs).results >= MIN_RESULTS;
