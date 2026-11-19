// Pure analysis helpers: weekly template maths and reconciliation checks (ported from the rule-based Python demo).
export interface M { date: string; source: string; campaign: string; spend: number; impressions: number; clicks: number; conversions: number }
export interface Plan { week_index: number; week_start: string; source: string; campaign: string; campaign_type?: string | null; budget: number;
  target_impressions: number; target_clicks: number; target_conversions: number; kpi_definition: string; line_no: number }
export interface Agency { line_no: number; week_start: string; period_start: string; period_end: string; source: string; campaign: string;
  spend: number; impressions: number; clicks: number; conversions: number; kpi_definition: string }
export interface LastYear { week_index: number; source: string; campaign_type: string; spend: number; impressions: number; clicks: number; conversions: number }

export interface Totals { spend: number; impressions: number; clicks: number; conversions: number; ctr: number | null; cpc: number | null; cpa: number | null }

const div = (a: number, b: number) => (b > 0 ? a / b : null);
export function totals(rows: Array<Pick<M, 'spend' | 'impressions' | 'clicks' | 'conversions'>>): Totals {
  let spend = 0, impressions = 0, clicks = 0, conversions = 0;
  for (const r of rows) { spend += r.spend; impressions += r.impressions; clicks += r.clicks; conversions += r.conversions; }
  return { spend, impressions, clicks, conversions, ctr: div(clicks, impressions), cpc: div(spend, clicks), cpa: div(spend, conversions) };
}

export const addDays = (iso: string, n: number) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 86400_000).toISOString().slice(0, 10);
export function mondayOf(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  return addDays(iso, -dow);
}
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fmtDay = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
const vnd = (x: number) => Math.round(x).toLocaleString('en-US');
const pct = (x: number) => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(1)}%`;

export interface Filter { source?: string; from?: string; to?: string }
export function applyFilter(rows: M[], f: Filter): M[] {
  return rows.filter((r) => (!f.source || f.source === 'all' || r.source === f.source) && (!f.from || r.date >= f.from) && (!f.to || r.date <= f.to));
}

// ---------------------------------------------------------------- reconciliation
export interface Flag { type: string; sev: 'HIGH' | 'MEDIUM'; title: string; detail: string; refs: Array<{ file: string; line: number }> }
export interface Insufficient { source: string; campaign: string; week_start: string; week_index: number; days: number }

const TOL_SPEND = 0.01;
const keyOf = (w: string, s: string, c: string) => `${w}|${s}|${c}`;
const label = (s: string) => s === 'tiktok' ? 'TikTok' : s[0].toUpperCase() + s.slice(1);

export function reconcile(exp: M[], plan: Plan[], agency: Agency[]): { flags: Flag[]; insufficient: Insufficient[] } {
  const days = new Map<string, Map<string, M>>();
  for (const r of exp) {
    const k = keyOf(mondayOf(r.date), r.source, r.campaign);
    if (!days.has(k)) days.set(k, new Map());
    days.get(k)!.set(r.date, r);
  }
  const pkey = new Map(plan.map((p) => [keyOf(p.week_start, p.source, p.campaign), p]));
  const flags: Flag[] = [];
  const insufficient: Insufficient[] = [];

  // Sufficiency gate: every plan line needs all 7 days in the export, otherwise no conclusion is drawn for it.
  const gated = new Set<string>();
  for (const [k, p] of pkey) {
    const n = days.get(k)?.size ?? 0;
    if (n < 7) {
      gated.add(k);
      insufficient.push({ source: p.source, campaign: p.campaign, week_start: p.week_start, week_index: p.week_index, days: n });
      const miss: string[] = [];
      for (let i = 0; i < 7; i++) { const d = addDays(p.week_start, i); if (!days.get(k)?.has(d)) miss.push(d); }
      flags.push({ type: 'NOT_ENOUGH_DATA', sev: 'HIGH',
        title: `Not enough data to conclude: ${label(p.source)} / ${p.campaign}, week ${p.week_index} (${fmtDay(p.week_start)})`,
        detail: `The export has ${n} of 7 days (missing ${miss.map(fmtDay).join(', ')}). The hub does not interpolate or fill gaps: figures, comparisons and checks for this line are withheld until the data is supplied.`,
        refs: [{ file: 'media_plan.csv', line: p.line_no }] });
    }
  }

  const seen = new Set<string>();
  const kpi = new Map<string, Array<{ a: Agency; ex: number }>>();
  for (const a of [...agency].sort((x, y) => x.line_no - y.line_no)) {
    const k = keyOf(a.week_start, a.source, a.campaign);
    if (seen.has(k)) continue; // duplicate agency line: first one is used
    seen.add(k);
    const p = pkey.get(k);
    if (!p || gated.has(k)) continue;
    const inPeriod = [...days.get(k)!.values()].filter((r) => r.date >= a.period_start && r.date <= a.period_end);
    const exSpend = inPeriod.reduce((s, r) => s + r.spend, 0);
    const exConv = inPeriod.reduce((s, r) => s + r.conversions, 0);

    const missing: string[] = [];
    for (let i = 0; i < 7; i++) { const d = addDays(p.week_start, i); if (d < a.period_start || d > a.period_end) missing.push(d); }
    if (missing.length) {
      const ms = missing.reduce((s, d) => s + (days.get(k)!.get(d)?.spend ?? 0), 0);
      const wk = [...days.get(k)!.values()].reduce((s, r) => s + r.spend, 0);
      flags.push({ type: 'MISSING_DAY', sev: 'HIGH', title: `Missing day: ${label(a.source)} / ${a.campaign}, week of ${fmtDay(a.week_start)}`,
        detail: `Agency report covers ${fmtDay(a.period_start)}-${fmtDay(a.period_end)} (${7 - missing.length} of 7 days); missing ${missing.map(fmtDay).join(', ')}. Export shows ${vnd(ms)} VND spend (${(ms / wk * 100).toFixed(1)}% of the week) on the missing day(s).`,
        refs: [{ file: 'agency_report.csv', line: a.line_no }] });
    }
    if (a.kpi_definition !== p.kpi_definition) {
      if (!kpi.has(`${a.source}|${a.campaign}`)) kpi.set(`${a.source}|${a.campaign}`, []);
      kpi.get(`${a.source}|${a.campaign}`)!.push({ a, ex: exConv });
    }
    if (exSpend > 0 && Math.abs(a.spend - exSpend) > TOL_SPEND * exSpend) {
      flags.push({ type: 'COST_MISMATCH', sev: 'HIGH', title: `Cost mismatch: ${label(a.source)} / ${a.campaign}, week of ${fmtDay(a.week_start)}`,
        detail: `Agency ${vnd(a.spend)} VND vs platform export ${vnd(exSpend)} VND (${pct(a.spend / exSpend - 1)}); plan ${vnd(p.budget)} VND. Tolerance is ${TOL_SPEND * 100}%. The agency should explain (fees, tax or entry error).`,
        refs: [{ file: 'agency_report.csv', line: a.line_no }, { file: 'media_plan.csv', line: p.line_no }] });
    }
  }
  for (const [, list] of kpi) {
    const a0 = list[0].a, p0 = pkey.get(keyOf(a0.week_start, a0.source, a0.campaign))!;
    const infl = list.filter((x) => x.ex > 0).map((x) => x.a.conversions / x.ex - 1);
    flags.push({ type: 'KPI_DEFINITION', sev: 'HIGH', title: `KPI definition differs from plan: ${label(a0.source)} / ${a0.campaign}, ${list.length} line(s)`,
      detail: `Agency reports "${a0.kpi_definition}"; plan says "${p0.kpi_definition}". Agency conversions are on average ${infl.length ? pct(infl.reduce((s, x) => s + x, 0) / infl.length) : 'n/a'} above the export, so they must not be compared with the target as they stand. Weeks starting: ${list.map((x) => fmtDay(x.a.week_start)).join(', ')}.`,
      refs: list.map((x) => ({ file: 'agency_report.csv', line: x.a.line_no })) });
  }
  const order = { HIGH: 0, MEDIUM: 1 } as const;
  flags.sort((x, y) => order[x.sev] - order[y.sev] || x.type.localeCompare(y.type) || (x.refs[0]?.line ?? 0) - (y.refs[0]?.line ?? 0));
  insufficient.sort((x, y) => x.week_index - y.week_index);
  return { flags, insufficient };
}

// ---------------------------------------------------------------- weekly template
export interface WeekRow { week: string; label: string; t: Totals; targetConv: number | null; targetCpa: number | null; lyConv: number | null; lySpend: number | null; gated: boolean; gatedSources: string[]; perSource: Record<string, Totals> }

export function weeklyTemplate(rows: M[], plan: Plan[], ly: LastYear[], insufficient: Insufficient[]): WeekRow[] {
  const weeks = [...new Set(rows.map((r) => mondayOf(r.date)))].sort();
  const sources = new Set(rows.map((r) => r.source));
  return weeks.map((w) => {
    const rs = rows.filter((r) => mondayOf(r.date) === w);
    const ps = plan.filter((p) => p.week_start === w && sources.has(p.source));
    const idx = ps[0]?.week_index;
    const lys = idx ? ly.filter((l) => l.week_index === idx && sources.has(l.source)) : [];
    const perSource: Record<string, Totals> = {};
    for (const src of sources) perSource[src] = totals(rs.filter((r) => r.source === src));
    const gated = insufficient.some((i) => i.week_start === w && sources.has(i.source));
    const tc = ps.reduce((s, p) => s + p.target_conversions, 0), tb = ps.reduce((s, p) => s + p.budget, 0);
    return { week: w, label: `${fmtDay(w)} - ${fmtDay(addDays(w, 6))}`, t: totals(rs),
      targetConv: ps.length ? tc : null, targetCpa: ps.length && tc > 0 ? tb / tc : null,
      lyConv: lys.length ? lys.reduce((s, l) => s + l.conversions, 0) : null, lySpend: lys.length ? lys.reduce((s, l) => s + l.spend, 0) : null, gated, gatedSources: [...new Set(insufficient.filter((i) => i.week_start === w).map((i) => i.source))], perSource };
  });
}

export function byKey(rows: M[], key: (r: M) => string): Array<{ k: string; t: Totals }> {
  const g = new Map<string, M[]>();
  for (const r of rows) { const k = key(r); if (!g.has(k)) g.set(k, []); g.get(k)!.push(r); }
  return [...g.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => ({ k, t: totals(v) }));
}
