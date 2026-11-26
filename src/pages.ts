// Demo screens: home, multi-account overview, campaign table (ABO rollup), demographic x placement, "Ask the brain". Synthetic data only.
import { add, campaignDays, campaignStats, cpa, ctr, effectiveDailyBudget, ZERO, type DayStat } from './campaigns';
import { ageGenderMatrix, AGES, bottomSegments, buildCells, enoughData, GENDER_LABEL, GENDERS, groupCells, insightsAll, metricsOf, placementTable, sumCells, topSegments, MIN_RESULTS,
  type Cell, type Insight, type Metrics } from './audience';
import { legend, stackedBars } from './charts';
import { filterBar, filterCampaigns, kpi, mil, mult, n0, p1, p2, parseView, viewUrl, brandTag, type View } from './kit';
import { accountRows, ACCOUNTS, BRANDS, brandById, campaignBrand, campaigns, campaignsOf, resultLabel, SYNTH_ANCHOR, SYNTH_START, type BrandId } from './synth';
import { addDays, resolveRange } from './timeline';
import { esc, icon, layout, nav } from './ui';
import learningsSeed from './demo-data.json';

export { parseView };
export type ViewQuery = View;
const shell = (title: string, group: string, page: string, path: string, v: View) => ({ title, group, page, path, brand: v.brand });
const brandName = (v: View) => (v.brand === 'all' ? 'All brands' : brandById(v.brand)!.name);

// ---------------------------------------------------------------- shared blocks
export const filteredCampaigns = (v: View) => filterCampaigns(campaigns(), v);
function totals(v: View) {
  const cs = filteredCampaigns(v);
  return { cs, t: cs.reduce((t, c) => add(t, campaignStats(c, v.range)), ZERO) };
}
const cellsFor = (v: View, range = v.range): Cell[] => buildCells(filteredCampaigns(v), range);

function spendChart(v: View): string {
  const cs = filteredCampaigns(v);
  const days: string[] = [];
  for (let d = v.range.from; d <= v.range.to; d = addDays(d, 1)) days.push(d);
  const per = (pf: 'meta' | 'tiktok') => days.map((d) => cs.filter((c) => c.platform === pf).reduce((s, c) => s + (campaignDays(c)[d]?.spend ?? 0), 0));
  const series = [{ name: 'Meta', cls: 'meta', values: per('meta') }, { name: 'TikTok', cls: 'tiktok', values: per('tiktok') }];
  return `${stackedBars(days.map((d) => d.slice(5)), series, 'spend (VND)', 'Spend by day and platform')}${legend(series)}`;
}

/** Compact audience block used on the overview and home pages. */
function audienceSummary(v: View): string {
  const cells = cellsFor(v);
  const link = esc(viewUrl('/audience', v, {}));
  if (!enoughData(cells)) return `<div class="card"><h2>${icon('users', 18)}Audience snapshot</h2><p class="muted">Not enough results in this timeline to read audience patterns. Widen the timeline.</p></div>`;
  const ins = insightsAll(cells, v.brand, 3);
  const brand: BrandId | null = v.brand === 'all' ? null : v.brand;
  const m = ageGenderMatrix(brand ? cells.filter((c) => c.brand === brand) : cells);
  const bars = m.rows.map((r) => `<div class="brow"><div class="lab">${r.age.replace('-', '–')}</div><div class="track two"><i class="i-sp" style="width:${(r.all.spendShare * 100 / 0.35 > 100 ? 100 : r.all.spendShare * 100 / 0.35).toFixed(1)}%"></i><i class="i-rs" style="width:${(r.all.resultShare * 100 / 0.35 > 100 ? 100 : r.all.resultShare * 100 / 0.35).toFixed(1)}%"></i></div><div class="n small">${p1(r.all.spendShare)} / ${p1(r.all.resultShare)}</div></div>`).join('');
  return `<div class="card"><h2>${icon('users', 18)}Audience snapshot<a class="more" href="${link}">Open Demographic × Placement</a></h2>
<div class="g2 mt"><div><div class="lg"><span><i class="i-sp"></i>Share of spend</span><span><i class="i-rs"></i>Share of ${esc(resultLabel(v.brand).toLowerCase())}</span></div>${bars}</div>
<div><h3>Generated insights</h3>${ins.map((i) => `<a class="att" href="${esc(viewUrl('/audience', v, {}, '#insights'))}"><span class="ib blue">${icon('spark', 15)}</span><span class="t">${esc(i.title)}${v.brand === 'all' ? `<small>${esc(brandById(i.brand)!.name)}</small>` : ''}</span></a>`).join('')}</div></div></div>`;
}

// ---------------------------------------------------------------- home
export interface Setup { metaReady: boolean; ttReady: boolean }
export function homePage(v: View, s: Setup): string {
  const { cs, t } = totals(v);
  const rows = accountRows(v.range, undefined, v.brand);
  const attn = rows.filter((a) => a.alert || a.balance_due > a.threshold);
  const cells = cellsFor(v), ins = insightsAll(cells, v.brand, 12);
  const res = resultLabel(v.brand);
  const top = cs.map((c) => ({ c, st: campaignStats(c, v.range) })).sort((a, b) => b.st.spend - a.st.spend).slice(0, 6);
  const mock = `<svg viewBox="0 0 320 190" aria-hidden="true"><rect width="320" height="190" rx="10" fill="#0f1730"/>
<rect x="14" y="14" width="88" height="40" rx="6" fill="#1a2547"/><rect x="116" y="14" width="88" height="40" rx="6" fill="#1a2547"/><rect x="218" y="14" width="88" height="40" rx="6" fill="#1a2547"/>
<rect x="22" y="24" width="30" height="5" rx="2" fill="#6d94ff"/><rect x="22" y="36" width="52" height="9" rx="3" fill="#fff"/><rect x="124" y="24" width="30" height="5" rx="2" fill="#6d94ff"/><rect x="124" y="36" width="44" height="9" rx="3" fill="#fff"/><rect x="226" y="24" width="30" height="5" rx="2" fill="#6d94ff"/><rect x="226" y="36" width="58" height="9" rx="3" fill="#fff"/>
<path d="M14 150 L50 128 L86 138 L122 104 L158 118 L194 84 L230 98 L266 66 L306 76" fill="none" stroke="#6d94ff" stroke-width="3" stroke-linejoin="round"/>
<path d="M14 160 L50 146 L86 150 L122 130 L158 140 L194 118 L230 124 L266 108 L306 112" fill="none" stroke="#12b76a" stroke-width="3" stroke-linejoin="round"/>
<g fill="#1a2547"><rect x="14" y="66" width="292" height="1" /><rect x="14" y="170" width="292" height="1"/></g></svg>`;
  const connect = `<div class="card"><h2>${icon('link', 18)}Connect your own accounts</h2><p class="muted small mt">Sign in with Meta or TikTok to bring your ad accounts into the same views. Read-only access; you pick which accounts to include.</p>
<p class="mt"><a class="btn" href="/auth/meta/start">Connect Meta</a> <a class="btn sec" href="/auth/tiktok/start">Connect TikTok</a></p>
<p class="small muted mt">Setup: Meta ${s.metaReady ? 'ready' : 'waiting for the operator to set the app secret'} · TikTok ${s.ttReady ? 'ready' : 'waiting for the operator to set the encryption key'}</p></div>`;
  return layout(shell('Home', 'Home', 'home', '/', v), `
<section class="banner"><div><span class="pill">${icon('spark', 14)}Meta + TikTok in one hub</span><h1>One screen for every ad account, brand and audience</h1>
<p>Track spend by timeline, see ABO budgets rolled up, and read which age, gender and placement pockets bring the results.</p>
<a class="btn w" href="${esc(viewUrl('/audience', v, {}))}">Open audience insights ${icon('right', 16)}</a><a class="btn g" href="${esc(viewUrl('/overview', v, {}))}">View overview</a></div>
<div class="mock" aria-hidden="true">${mock}</div></section>
<div class="g-side"><div class="stack">
<div class="sec-h" style="margin-top:0">${icon('dash', 20)}<h2>Overview · ${esc(brandName(v))}</h2><span class="muted small">${esc(v.range.label)}</span><a class="more" href="${esc(viewUrl('/overview', v, {}))}">See details</a></div>
<div class="kpis">${kpi('Ad accounts', String(rows.length), `${rows.filter((a) => a.platform === 'meta').length} Meta · ${rows.filter((a) => a.platform === 'tiktok').length} TikTok`, icon('wallet', 18))}
${kpi('Spend (VND)', mil(t.spend), `${n0(t.spend)} · ${esc(v.range.label.split(' · ')[0])}`, icon('trend', 18), 'prim')}
${kpi(res, n0(t.conversions), v.brand === 'all' ? 'purchases, messages, leads' : `CTR ${p2(ctr(t))}`, icon('target', 18))}
${v.brand === 'all' ? kpi('Brands', '3', 'Food · Beverage · Hospitality', icon('layers', 18)) : kpi('Cost per result', n0(cpa(t)), 'VND per ' + brandById(v.brand)!.resultOne, icon('trend', 18))}
${kpi('Active campaigns', `${cs.filter((c) => c.status === 'active').length} <small>/ ${cs.length}</small>`, 'ABO and CBO', icon('mega', 18), 'good')}
${kpi('Audience insights', String(ins.length), 'ready to review', icon('spark', 18), ins.length ? 'prim' : '')}</div>
<div class="card flush"><div class="head"><h2>${icon('trend', 18)}Top campaigns by spend</h2><a class="more sec-h" style="margin:0 0 0 auto;font-size:13px" href="${esc(viewUrl('/campaigns', v, {}))}">Open all</a></div>
<div class="tw"><table><thead><tr><th>Campaign</th><th>Brand</th><th class="n">Spend (VND)</th><th class="n">${esc(res)}</th></tr></thead><tbody>${top.map(({ c, st }) => `<tr><td><div class="cn">${esc(c.name)}</div><div class="cs">${esc(ACCOUNTS.find((a) => a.id === c.account_id)!.name)}</div></td><td>${brandTag(campaignBrand(c))}</td><td class="n"><b>${n0(st.spend)}</b></td><td class="n">${n0(st.conversions)}</td></tr>`).join('')}</tbody></table></div></div>
${audienceSummary(v)}</div>
<aside class="stack"><div class="card"><h2>${icon('alert', 18)}What needs attention</h2>
<div class="cta mt"><b>${attn.length} account${attn.length === 1 ? '' : 's'} to review</b><small>Billing and spend cap, simple checks only</small></div>
${attn.map((a) => `<a class="att" href="${esc(viewUrl('/overview', v, {}, '#accounts'))}"><span class="ib">${icon('wallet', 15)}</span><span class="t">${esc(a.name)}<small>${esc(a.alert ?? '')}</small></span></a>`).join('') || '<p class="muted small mt">All accounts are within their limits.</p>'}
${ins[0] ? `<a class="att" href="${esc(viewUrl('/audience', v, {}, '#insights'))}"><span class="ib blue">${icon('spark', 15)}</span><span class="t">${esc(ins[0].title)}<small>Top audience insight</small></span></a>` : ''}
<p class="mt"><a class="btn full" href="${esc(viewUrl('/overview', v, {}, '#accounts'))}">Review accounts ${icon('right', 16)}</a></p></div>
${connect}</aside></div>`);
}

// ---------------------------------------------------------------- overview
export function overviewPage(v: View): string {
  const rows = accountRows(v.range, (n) => filteredCampaigns({ ...v, acct: '' }).some((c) => c.name === n), v.brand);
  const total = rows.reduce((t, a) => add(t, a.period), ZERO);
  const today = rows.reduce((t, a) => add(t, a.today), ZERO);
  const attention = rows.filter((a) => a.alert || a.balance_due > a.threshold).length;
  const lifetime = rows.reduce((s, a) => s + a.lifetime, 0);
  const cards = rows.map((a) => {
    const over = a.balance_due > a.threshold;
    return `<article class="card acct" aria-label="${esc(a.name)}"><div class="hd"><div><div class="nm">${esc(a.name)}</div><div class="id">${esc(a.id)} · ${a.platform === 'meta' ? 'Meta' : 'TikTok'}</div></div><span class="tagc ${a.status === 'active' ? 'ok' : 'warn'}"><i class="d"></i>${a.status === 'active' ? 'active' : 'balance due'}</span></div>
<div class="muted small">Spend · ${esc(v.range.preset === 'today' ? 'today' : v.range.preset === 'custom' ? 'custom range' : v.range.preset.toUpperCase())}</div><div class="big">${n0(a.period.spend)}</div>
<div class="kv"><div><div class="k">Spend today</div><div class="v">${n0(a.today.spend)}</div></div><div><div class="k">Campaigns</div><div class="v">${a.campaigns}</div></div>
<div><div class="k">Spend cap</div><div class="v">${mil(a.cap)}</div></div><div><div class="k">Billing threshold</div><div class="v">${mil(a.threshold)}</div></div>
<div><div class="k">Balance due</div><div class="v ${over ? 'warn' : ''}">${n0(a.balance_due)}</div></div><div><div class="k">Cap used</div><div class="v">${(a.capPct * 100).toFixed(0)}%</div></div></div>
<div class="meter${a.capPct > 0.9 ? ' hot' : ''}" role="img" aria-label="Cap used ${(a.capPct * 100).toFixed(0)} percent"><i style="width:${Math.min(100, a.capPct * 100).toFixed(1)}%"></i></div>
${a.alert ? `<div class="alert"><span class="tagc warn">${esc(a.alert)}</span></div>` : ''}</article>`;
  }).join('');
  const byBrand = BRANDS.filter((b) => v.brand === 'all' || b.id === v.brand).map((b) => {
    const cs = filterCampaigns(campaigns(), { ...v, brand: b.id });
    const t = cs.reduce((x, c) => add(x, campaignStats(c, v.range)), ZERO);
    return { b, t };
  });
  const maxS = Math.max(1, ...byBrand.map((x) => x.t.spend));
  const brandBars = byBrand.map(({ b, t }) => `<div class="brow"><div class="lab">${esc(b.name)}<small>${esc(b.vertical)} · ${esc(b.result.toLowerCase())}</small></div><div class="track"><i class="i-rs" style="width:${(t.spend / maxS * 100).toFixed(1)}%"></i></div><div class="n"><b>${mil(t.spend)}</b></div></div>`).join('');
  return layout(shell('Overview', 'Dashboard', 'overview', '/overview', v), `
${filterBar('/overview', v, { acct: true, platform: true })}
<section class="hero-card mt"><h1><span class="ic-b">${icon('wallet', 17)}</span>All ad accounts · ${esc(brandName(v))}</h1><span class="hero-tag">${attention} need attention</span>
<div class="hero-row"><div class="hk blue"><div class="k">Ad accounts</div><div class="big">${rows.length}</div><div class="chips"><span class="tagc">${rows.filter((a) => a.platform === 'meta').length} Meta</span><span class="tagc">${rows.filter((a) => a.platform === 'tiktok').length} TikTok</span><span class="tagc">${attention} to review</span></div></div>
<div class="hk"><div class="k">Spend · ${esc(v.range.label.split(' · ')[0])}</div><div class="mid">${n0(total.spend)}</div><div class="sub3 mt"><div><div class="k muted">Impressions</div><b>${mil(total.impressions)}</b></div><div><div class="k muted">Clicks</div><b>${n0(total.clicks)}</b></div><div><div class="k muted">CTR</div><b>${p2(ctr(total))}</b></div></div></div>
<div class="hk"><div class="k">Spend (VND)</div><div class="sub3"><div><div class="k muted">Today</div><b>${mil(today.spend)}</b></div><div><div class="k muted">Selected</div><b class="ok">${mil(total.spend)}</b></div><div><div class="k muted">Since 1 Sep</div><b>${mil(lifetime)}</b></div></div><p class="small muted mt">${esc(resultLabel(v.brand))}: <b>${n0(total.conversions)}</b> · cost per result <b>${n0(cpa(total))}</b></p></div></div></section>
<div class="g21 mt"><div class="card"><h2>${icon('trend', 18)}Spend by day</h2>${spendChart(v)}</div><div class="card"><h2>${icon('layers', 18)}Spend by brand</h2><div class="mt">${brandBars}</div></div></div>
<div class="sec" id="accounts"><div class="sec-h">${icon('wallet', 20)}<h2>Ad accounts</h2><span class="tagc">${rows.length} accounts</span></div><div class="agrid">${cards || '<div class="card">No ad accounts match these filters.</div>'}</div></div>
<div class="sec">${audienceSummary(v)}</div>
<div class="card mt"><h2>${icon('spark', 18)}Ask the brain</h2><p class="muted mt">Ask in plain words and get the answer with its source. Example: <em>why is cost over plan?</em></p><p class="mt"><a class="btn sec sm" href="${esc(nav('/brain', v.brand))}">Open the brain</a></p></div>`);
}

// ---------------------------------------------------------------- campaigns
export function campaignRows(v: View) {
  return { r: v.range, rows: filteredCampaigns(v).map((c) => ({ c, t: campaignStats(c, v.range), budget: effectiveDailyBudget(c) })).sort((a, b) => b.t.spend - a.t.spend) };
}
export function campaignsPage(v: View): string {
  const { r, rows } = campaignRows(v);
  const total = rows.reduce((t, x) => add(t, x.t), ZERO);
  const acct = (id: string) => ACCOUNTS.find((a) => a.id === id)!;
  const res = resultLabel(v.brand);
  const body = rows.map(({ c, t, budget }) => `<tr><td><span class="sw ${c.status === 'active' ? 'on' : ''}" role="img" aria-label="${c.status}"></span></td>
<td><div class="cn">${esc(c.name)}</div><div class="cs">${esc(acct(c.account_id).name)} · ${c.platform === 'meta' ? 'Meta' : 'TikTok'}</div></td>
<td>${brandTag(campaignBrand(c))}</td><td><span class="tagc ${c.budget_type === 'ABO' ? 'blue' : ''}">${c.budget_type}${c.budget_type === 'ABO' ? ` (${c.adsets.length})` : ''}</span></td>
<td><span class="tagc ${c.status === 'active' ? 'ok' : ''}"><i class="d"></i>${c.status === 'active' ? 'Running' : 'Paused'}</span></td>
<td class="n">${n0(budget)}${c.budget_type === 'ABO' ? `<details class="abo"><summary>Σ ${c.adsets.length} ad sets</summary><ul>${c.adsets.map((s) => `<li><span>${esc(s.name)}</span><span>${n0(s.daily_budget)}</span></li>`).join('')}</ul></details>` : ''}</td>
<td class="n"><b>${n0(t.spend)}</b></td><td class="n">${n0(t.impressions)}</td><td class="n">${p2(ctr(t))}</td><td class="n"><b>${n0(t.conversions)}</b></td><td class="n">${n0(cpa(t))}</td></tr>`).join('');
  const active = rows.filter((x) => x.c.status === 'active').length;
  return layout(shell('Campaigns', 'Assets', 'campaigns', '/campaigns', v), `
<div class="kpis">${kpi(`Spend · ${r.label.split(' · ')[0]}`, mil(total.spend), `${n0(total.spend)} VND`, '', 'prim')}${kpi(res, n0(total.conversions), `CTR ${p2(ctr(total))}`)}${v.brand === 'all' ? kpi('Brands', '3', 'cost per result is per brand') : kpi('Cost per result', n0(cpa(total)), 'VND per ' + brandById(v.brand)!.resultOne)}${kpi('Running campaigns', `${active} <small>/ ${rows.length}</small>`, 'ABO and CBO', '', 'good')}</div>
<div class="mt">${filterBar('/campaigns', v, { type: true, acct: true, platform: true })}</div>
<div class="card flush mt"><div class="head"><h2>${icon('mega', 18)}Campaign table</h2><span class="tagc">${rows.length} campaigns</span></div>
<div class="tw"><table><thead><tr><th>On</th><th>Campaign and account</th><th>Brand</th><th>Type</th><th>Status</th><th class="n">Budget / day (VND)</th><th class="n">Spend (VND)</th><th class="n">Impr.</th><th class="n">CTR</th><th class="n">${esc(res)}</th><th class="n">Cost / result</th></tr></thead>
<tbody>${body || '<tr><td colspan="11">No campaign matches these filters. Clear the filter to see all.</td></tr>'}</tbody></table></div></div>
<p class="cols-note">ABO budget per day = sum of ad set budgets (the platform reports 0 at campaign level). CBO shows the campaign budget. The switch shows run status and is read only.</p>`);
}

// ---------------------------------------------------------------- audience
const KIND: Record<string, [string, string]> = { shift: ['Shift budget', 'ok'], cut: ['Cut or narrow', 'bad'], exclude: ['Exclude', 'bad'], test: ['Test', 'violet'], fix: ['Fix the next step', 'warn'], watch: ['Watch', ''] };
export function insightCard(i: Insight, showBrand: boolean): string {
  const [label, cls] = KIND[i.kind];
  return `<article class="ins ${i.kind}"><div class="top"><span class="tagc ${cls}">${label}</span>${showBrand ? brandTag(i.brand) : ''}</div><div class="t">${esc(i.title)}</div>
<div class="facts">${i.facts.map((f) => `<div><div class="k">${esc(f.k)}</div><div class="v">${esc(f.v)}</div></div>`).join('')}</div><div class="act"><b>Suggested action.</b> ${esc(i.action)}</div></article>`;
}

const hue = (x: number, max: number, c = '49,94,245') => `rgba(${c},${Math.min(0.78, Math.max(0.04, (x / (max || 1)) * 0.78)).toFixed(2)})`;
const effColor = (i: number | null) => (i === null ? 'transparent' : i >= 1 ? `rgba(18,183,106,${Math.min(0.7, (i - 1) * 0.55 + 0.06).toFixed(2)})` : `rgba(239,74,85,${Math.min(0.65, (1 - i) * 0.9 + 0.05).toFixed(2)})`);
const cprColor = (x: number | null) => (x === null ? 'transparent' : effColor(1 / x));

function heatCell(m: Metrics, max: { spend: number; res: number; ctr: number }, label: string): string {
  const eff = m.index;
  return `<td class="hc" style="--b-eff:${effColor(eff)};--b-spend:${hue(m.spendShare, max.spend)};--b-res:${hue(m.resultShare, max.res, '18,183,106')};--b-cpr:${cprColor(m.cprVsAvg)};--b-ctr:${hue(m.ctr ?? 0, max.ctr, '87,83,245')}" title="${esc(label)}">
<span class="hv hv-eff">${eff === null ? '-' : mult(eff)}</span><span class="hv hv-spend">${p1(m.spendShare)}</span><span class="hv hv-res">${p1(m.resultShare)}</span><span class="hv hv-cpr">${m.cpr ? n0(m.cpr / 1000) + 'K' : '-'}</span><span class="hv hv-ctr">${p2(m.ctr)}</span></td>`;
}
const HEAT_BTNS = (id: string) => [['eff', 'Efficiency'], ['spend', 'Spend share'], ['res', 'Result share'], ['cpr', 'Cost per result'], ['ctr', 'CTR']].map(([m, l], i) => `<button type="button" class="${i === 0 ? 'on' : ''}" data-heat="${id}" data-m="${m}">${l}</button>`).join('');

function ageGenderBlock(cells: Cell[], res: string): string {
  const m = ageGenderMatrix(cells);
  const all = m.rows.flatMap((r) => GENDERS.map((g) => r.cells[g]));
  const max = { spend: Math.max(...all.map((x) => x.spendShare)), res: Math.max(...all.map((x) => x.resultShare)), ctr: Math.max(...all.map((x) => x.ctr ?? 0)) };
  const heat = m.rows.map((r) => `<tr><td class="rl">${r.age.replace('-', '–')}</td>${GENDERS.map((g) => heatCell(r.cells[g], max, `${GENDER_LABEL[g]} ${r.age}`)).join('')}${heatCell(r.all, { spend: Math.max(...m.rows.map((x) => x.all.spendShare)), res: Math.max(...m.rows.map((x) => x.all.resultShare)), ctr: max.ctr }, `All ${r.age}`)}</tr>`).join('');
  const detail = m.rows.flatMap((r) => GENDERS.map((g) => ({ age: r.age, g, x: r.cells[g] }))).map(({ age, g, x }) => {
    const cls = x.index !== null && x.spendShare >= 0.02 ? (x.index >= 1.35 ? 'hl' : '') : '';
    return `<tr class="${cls}"><td>${age.replace('-', '–')}</td><td>${GENDER_LABEL[g]}</td><td class="n">${n0(x.spend)}</td><td class="n">${n0(x.impressions)}</td><td class="n">${p2(x.ctr)}</td><td class="n">${n0(x.results)}</td><td class="n">${n0(x.cpr)}</td><td class="n">${p1(x.spendShare)}</td><td class="n">${p1(x.resultShare)}</td><td class="n"><b>${x.index === null ? '-' : mult(x.index)}</b></td></tr>`;
  }).join('');
  const t = m.total;
  return `<div class="sec" id="age-gender"><div class="sec-h">${icon('users', 20)}<h2>Age × gender</h2></div>
<div class="card"><div class="frow"><div class="seg" role="group" aria-label="Heatmap metric">${HEAT_BTNS('heat-ag')}</div><span class="small muted">Efficiency = share of ${esc(res.toLowerCase())} ÷ share of spend. Above 1.0x is better than average.</span></div>
<div class="tw mt"><table class="heat" id="heat-ag" data-m="eff"><thead><tr><th>Age</th><th class="n">Women</th><th class="n">Men</th><th class="n">Unknown</th><th class="n">All genders</th></tr></thead><tbody>${heat}</tbody></table></div></div>
<div class="card flush mt"><div class="head"><h2>Segment detail</h2><span class="small muted">Highlighted rows: at least 1.35x efficiency with 2% or more of spend</span></div><div class="tw"><table><thead><tr><th>Age</th><th>Gender</th><th class="n">Spend (VND)</th><th class="n">Impr.</th><th class="n">CTR</th><th class="n">${esc(res)}</th><th class="n">Cost / result</th><th class="n">Spend share</th><th class="n">Result share</th><th class="n">Efficiency</th></tr></thead>
<tbody>${detail}<tr><td colspan="2"><b>Total</b></td><td class="n"><b>${n0(t.spend)}</b></td><td class="n"><b>${n0(t.impressions)}</b></td><td class="n"><b>${p2(t.ctr)}</b></td><td class="n"><b>${n0(t.results)}</b></td><td class="n"><b>${n0(t.cpr)}</b></td><td class="n">all</td><td class="n">all</td><td class="n">1.00x</td></tr></tbody></table></div></div></div>`;
}

function placementBlock(cells: Cell[], res: string): string {
  const pt = placementTable(cells);
  const one = (pf: 'meta' | 'tiktok') => {
    const rows = pt.filter((p) => p.platform === pf);
    if (!rows.length) return '';
    const mx = Math.max(0.01, ...rows.flatMap((p) => [p.m.spendShare, p.m.resultShare]));
    return `<div class="card flush mt"><div class="head"><h2>${pf === 'meta' ? 'Meta placements' : 'TikTok placements'}</h2></div><div class="tw"><table><thead><tr><th>Placement</th><th style="min-width:170px">Spend vs ${esc(res.toLowerCase())} share</th><th class="n">Spend (VND)</th><th class="n">Impr.</th><th class="n">CTR</th><th class="n">${esc(res)}</th><th class="n">Cost / result</th><th class="n">Efficiency</th></tr></thead><tbody>${rows.map((p) => {
      const bad = p.m.index !== null && p.m.index <= 0.4 && p.m.spendShare >= 0.06, good = p.m.index !== null && p.m.index >= 1.4;
      return `<tr><td class="cn" style="min-width:150px">${esc(p.placement)}</td><td><div class="track two"><i class="i-sp" style="width:${(p.m.spendShare / mx * 100).toFixed(1)}%"></i><i class="${bad ? 'i-bad' : 'i-rs'}" style="width:${(p.m.resultShare / mx * 100).toFixed(1)}%"></i></div><div class="small muted">${p1(p.m.spendShare)} spend · ${p1(p.m.resultShare)} ${esc(res.toLowerCase())}</div></td>
<td class="n">${n0(p.m.spend)}</td><td class="n">${n0(p.m.impressions)}</td><td class="n">${p2(p.m.ctr)}</td><td class="n">${n0(p.m.results)}</td><td class="n">${n0(p.m.cpr)}</td><td class="n"><span class="tagc ${bad ? 'bad' : good ? 'ok' : ''}">${p.m.index === null ? '-' : mult(p.m.index)}</span></td></tr>`;
    }).join('')}</tbody></table></div></div>`;
  };
  return `<div class="sec" id="placement"><div class="sec-h">${icon('layers', 20)}<h2>Placements</h2></div><div class="lg"><span><i class="i-sp"></i>Share of spend</span><span><i class="i-rs"></i>Share of ${esc(res.toLowerCase())}</span><span><i class="i-bad"></i>Spend with almost no results</span></div>${one('meta')}${one('tiktok')}</div>`;
}

function crossBlock(cells: Cell[], res: string): string {
  const total = sumCells(cells);
  const pls = [...new Set(cells.map((c) => `${c.platform}|${c.placement}`))].sort((a, b) => (a.startsWith('meta') === b.startsWith('meta') ? 0 : a.startsWith('meta') ? -1 : 1));
  const g = groupCells<string>(cells, (c) => `${c.platform}|${c.placement}|${c.age}`);
  const rows = pls.map((k) => {
    const [pf, pl] = k.split('|');
    return `<tr><td class="rl">${esc(pl)}<small>${pf === 'meta' ? 'Meta' : 'TikTok'}</small></td>${AGES.map((a) => { const x = g.get(`${k}|${a}`); const m = metricsOf(x ?? { spend: 0, impressions: 0, clicks: 0, results: 0 }, total);
      return `<td class="hc" style="--b-eff:${m.spendShare >= 0.002 ? effColor(m.index) : 'transparent'};--b-spend:${hue(m.spendShare, 0.05)};--b-res:${hue(m.resultShare, 0.05, '18,183,106')};--b-cpr:${m.spendShare >= 0.002 ? cprColor(m.cprVsAvg) : 'transparent'};--b-ctr:${hue(m.ctr ?? 0, 0.03, '87,83,245')}"><span class="hv hv-eff">${m.spendShare >= 0.002 && m.index !== null ? mult(m.index) : '-'}</span><span class="hv hv-spend">${p1(m.spendShare)}</span><span class="hv hv-res">${p1(m.resultShare)}</span><span class="hv hv-cpr">${m.cpr ? n0(m.cpr / 1000) + 'K' : '-'}</span><span class="hv hv-ctr">${p2(m.ctr)}</span></td>`; }).join('')}</tr>`;
  }).join('');
  const seg = (r: ReturnType<typeof topSegments>[number]) => `<tr><td><b>${GENDER_LABEL[r.gender]} ${r.age.replace('-', '–')}</b><div class="cs">${esc(r.placement)}</div></td><td class="n">${p1(r.m.spendShare)}</td><td class="n">${p1(r.m.resultShare)}</td><td class="n">${n0(r.m.results)}</td><td class="n">${n0(r.m.cpr)}</td><td class="n"><span class="tagc ${r.m.index! >= 1 ? 'ok' : 'bad'}">${mult(r.m.index)}</span></td></tr>`;
  const head = `<thead><tr><th>Segment</th><th class="n">Spend share</th><th class="n">Result share</th><th class="n">${esc(res)}</th><th class="n">Cost / result</th><th class="n">Efficiency</th></tr></thead>`;
  return `<div class="sec" id="cross"><div class="sec-h">${icon('grid', 20)}<h2>Demographic × placement</h2></div>
<div class="card"><div class="frow"><div class="seg" role="group" aria-label="Heatmap metric">${HEAT_BTNS('heat-x')}</div><span class="small muted">Rows are placements, columns are age bands (all genders).</span></div>
<div class="tw mt"><table class="heat" id="heat-x" data-m="eff"><thead><tr><th>Placement</th>${AGES.map((a) => `<th class="n">${a.replace('-', '–')}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div></div>
<div class="stack mt"><div class="card flush"><div class="head"><h2>Top segments</h2><span class="small muted">age × gender × placement, at least 1.5% of spend</span></div><div class="tw"><table>${head}<tbody>${topSegments(cells, 8, 0.015, 25).map(seg).join('') || '<tr><td colspan="6">No segment passes the minimum size yet.</td></tr>'}</tbody></table></div></div>
<div class="card flush"><div class="head"><h2>Weakest segments</h2><span class="small muted">same minimum size</span></div><div class="tw"><table>${head}<tbody>${bottomSegments(cells, 8, 0.015).map(seg).join('') || '<tr><td colspan="6">No segment passes the minimum size yet.</td></tr>'}</tbody></table></div></div></div></div>`;
}

export function audienceData(v: View) {
  const cells = cellsFor(v).filter((c) => v.platform === 'all' || c.platform === v.platform);
  return { cells, insights: insightsAll(cells, v.brand, v.brand === 'all' ? 9 : 8), enough: enoughData(cells), total: sumCells(cells) };
}

export function audiencePage(v: View): string {
  const { cells, insights, enough, total } = audienceData(v);
  const res = resultLabel(v.brand);
  const bar = filterBar('/audience', v, { platform: true });
  const head = (extra = '') => `<section class="hero-card"><h1><span class="ic-b">${icon('users', 17)}</span>Demographic × Placement · ${esc(brandName(v))}</h1><span class="hero-tag">${esc(v.range.label.split(' · ')[0])}</span>
<div class="hero-row"><div class="hk blue"><div class="k">Spend (VND)</div><div class="big">${mil(total.spend)}</div><div class="chips"><span class="tagc">${n0(total.impressions)} impressions</span></div></div>
<div class="hk"><div class="k">${esc(res)}</div><div class="mid">${n0(total.results)}</div><p class="small muted mt">CTR ${p2(total.impressions ? total.clicks / total.impressions : null)}</p></div>
<div class="hk"><div class="k">Cost per result (VND)</div><div class="mid">${v.brand === 'all' ? 'per brand' : n0(total.results ? total.spend / total.results : null)}</div><p class="small muted mt">${extra}</p></div></div></section>`;
  if (!enough) return layout(shell('Demographic × Placement', 'Audience', 'audience', '/audience', v), `${bar}<div class="mt">${head('Not enough results to read patterns')}</div><div class="notice">Not enough results in this selection to draw conclusions (fewer than ${MIN_RESULTS}). Widen the timeline or clear the campaign filter. The hub does not fill the gap with guesses.</div>`);
  const cards = `<div class="sec" id="insights"><div class="sec-h">${icon('spark', 20)}<h2>Generated insights</h2><span class="tagc blue">${insights.length}</span></div>
<p class="muted small" style="margin:-4px 0 12px">Rules read the numbers below and write what they mean. Each card shows the figures behind it and a suggested action. They follow the timeline, brand and campaign filters.</p>
<div class="igrid">${insights.map((i) => insightCard(i, v.brand === 'all')).join('') || '<div class="card">No rule fires on this selection: spend and results are spread evenly.</div>'}</div></div>`;
  if (v.brand === 'all') {
    const tiles = BRANDS.map((b) => {
      const cs = cells.filter((c) => c.brand === b.id), t = sumCells(cs), m = ageGenderMatrix(cs);
      const best = m.rows.flatMap((r) => GENDERS.filter((g) => g !== 'unknown').map((g) => ({ age: r.age, g, x: r.cells[g] }))).filter((x) => x.x.spendShare >= 0.04).sort((a, c2) => (c2.x.index ?? 0) - (a.x.index ?? 0))[0];
      const bestPl = placementTable(cs).filter((p) => p.m.spendShare >= 0.04).sort((a, c2) => (c2.m.index ?? 0) - (a.m.index ?? 0))[0];
      return `<a class="card" style="color:inherit;text-decoration:none" href="${esc(viewUrl('/audience', v, { brand: b.id }))}"><div class="top">${brandTag(b.id)}</div><h3 class="mt">${esc(b.vertical)} · ${esc(b.result.toLowerCase())}</h3>
<div class="kv mt"><div><div class="k">Spend</div><div class="v">${mil(t.spend)}</div></div><div><div class="k">${esc(b.result)}</div><div class="v">${n0(t.results)}</div></div>
<div><div class="k">Best segment</div><div class="v">${best ? `${GENDER_LABEL[best.g]} ${best.age.replace('-', '–')}` : '-'}</div></div><div><div class="k">Best placement</div><div class="v">${bestPl ? esc(bestPl.placement) : '-'}</div></div></div><p class="mt small ok"><b>Open the full view</b></p></a>`;
    }).join('');
    return layout(shell('Demographic × Placement', 'Audience', 'audience', '/audience', v), `${bar}<div class="mt">${head('Result types differ per brand')}</div>
<div class="notice">Result types differ by brand (purchases, messages, leads), so cost per result is only comparable inside one brand. Pick a brand for the full tables.</div><div class="g3 mt">${tiles}</div>${cards}`);
  }
  return layout(shell('Demographic × Placement', 'Audience', 'audience', '/audience', v), `${bar}<div class="mt">${head(`${brandById(v.brand)!.vertical} · ${esc(res.toLowerCase())}`)}</div>${cards}${ageGenderBlock(cells, res)}${placementBlock(cells, res)}${crossBlock(cells, res)}`);
}

// ---------------------------------------------------------------- brain (mock)
export interface BrainAnswer { id: string; q: string; title: string; lines: string[]; source: string }
const SEED = learningsSeed as unknown as { learnings: Array<{ id: string; status: string; source: string; topic: string; lesson: string }> };
export function brainAnswers(v?: Pick<View, 'brand'>): BrainAnswer[] {
  const brand = v?.brand ?? 'all';
  const brandObj = brand === 'all' ? null : brandById(brand)!;
  const r14 = resolveRange({ range: '14d' }, SYNTH_ANCHOR, SYNTH_START), r7 = resolveRange({ range: '7d' }, SYNTH_ANCHOR, SYNTH_START);
  const cs = campaignsOf(brand);
  const over = cs.filter((c) => c.status === 'active').map((c) => {
    const spend = campaignStats(c, r14).spend, plan = c.planned_daily * r14.days;
    return { c, spend, plan, diff: spend - plan };
  }).sort((a, b) => b.diff - a.diff);
  const totalOver = over.filter((x) => x.diff > 0).reduce((s, x) => s + x.diff, 0);
  const top = over[0];
  const code = brandObj ? brandObj.code : 'BX';
  const codeSet = cs.filter((c) => c.name.startsWith(code + '-'));
  const l7 = codeSet.reduce((t, c) => add(t, campaignStats(c, r7)), ZERO);
  const att = ACCOUNTS.filter((a) => (brand === 'all' || a.brand === brand) && (a.status !== 'active' || a.alert));
  const lessons = SEED.learnings.filter((l) => (!brandObj || l.source.startsWith(brandObj.code + '-')) && l.status === 'confirmed');
  const ins = insightsAll(buildCells(cs, r14), brand, 12);
  const pick = (kinds: string[]) => ins.find((i) => kinds.includes(i.kind));
  const shift = pick(['shift']), waste = pick(['exclude', 'cut']);
  const rl = brandObj ? brandObj.result.toLowerCase() : 'results';
  return [
    { id: '1', q: 'why is cost over plan?', title: `${top.c.name} drives most of the overspend.`,
      lines: [`Last 14 days: ${mil(top.spend)} spent against ${mil(top.plan)} planned (${top.diff >= 0 ? '+' : ''}${((top.diff / top.plan) * 100).toFixed(0)}%). It is ${totalOver > 0 ? ((top.diff / totalOver) * 100).toFixed(0) : '0'}% of the total overrun of ${mil(totalOver)} VND.`, `Budget type ${top.c.budget_type}${top.c.budget_type === 'ABO' ? ' (ad set budgets summed)' : ''}.`], source: 'Source: hub data · platform export' },
    { id: '2', q: 'which account needs attention?', title: att.length ? `${att.length} account${att.length > 1 ? 's' : ''} need a look.` : 'No account needs attention.',
      lines: att.length ? att.map((a) => `${a.name}: ${a.alert ?? a.status}.`) : ['Every account is within its billing threshold and spend cap.'], source: 'Source: hub data · account status' },
    { id: '3', q: 'what has the memory confirmed so far?', title: `${lessons.length} confirmed lesson${lessons.length === 1 ? '' : 's'} are checked against every new brief.`,
      lines: lessons.slice(0, 3).map((l) => `${l.id} (${l.topic}): ${l.lesson}.`), source: `Source: hub memory · ${lessons.slice(0, 3).map((l) => l.id).join(', ')}` },
    { id: '4', q: `how is ${code}-* doing over 7D?`, title: `${mil(l7.spend)} VND spent, ${n0(l7.conversions)} ${rl}.`,
      lines: [`Cost per result ${n0(cpa(l7))} VND, CTR ${p2(ctr(l7))} across all campaigns whose code starts with ${code}- (${r7.from} to ${r7.to}).`], source: 'Source: hub data · platform export' },
    { id: '5', q: 'which audience should get more budget?', title: shift ? shift.title + '.' : 'No audience stands out yet.',
      lines: shift ? [`${shift.action}`, shift.facts.slice(0, 3).map((f) => `${f.k}: ${f.v}`).join(' · ')] : ['Spend and results are spread evenly over the audience segments.'], source: 'Source: hub data · demographic × placement' },
    { id: '6', q: 'where are we wasting spend?', title: waste ? waste.title + '.' : 'No clear waste found.',
      lines: waste ? [`${waste.action}`, waste.facts.slice(0, 3).map((f) => `${f.k}: ${f.v}`).join(' · ')] : ['No placement or segment spends a large share for almost no results.'], source: 'Source: hub data · demographic × placement' },
  ];
}

export function brainPage(v: View): string {
  const all = brainAnswers(v), cur = all.find((a) => a.id === v.ask) ?? all[0];
  return layout(shell('Ask the brain', 'Memory', 'brain', '/brain', v), `
<section class="hero-card"><h1><span class="ic-b">${icon('spark', 17)}</span>Ask the brain · ${esc(brandName(v))}</h1><p class="lead">Questions go to the hub's memory and data, and the answer comes back with its source. This panel answers prepared questions from demo data.</p></section>
<div class="brain"><div class="qs" role="list" aria-label="Questions">${all.map((a) => `<a role="listitem" class="${a.id === cur.id ? 'on' : ''}" href="${esc(viewUrl('/brain', v, { ask: a.id }))}">${esc(a.q)}</a>`).join('')}</div>
<div class="card chat"><div class="ask">${esc(cur.q)}</div>
<div class="ans"><div class="who">${icon('spark', 15)}Media Hub</div><div class="t" data-type>${esc(cur.title)}</div>${cur.lines.map((l) => `<p>${esc(l)}</p>`).join('')}<span class="src">${esc(cur.source)}</span></div>
<p class="small muted mt">Demo data. Answers are computed from the figures on the other pages.</p></div></div>`);
}
