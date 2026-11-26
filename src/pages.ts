// New demo screens: multi-account overview, campaign table (ABO rollup), "Ask the brain" mock. Synthetic data only.
import { campaignStats, cpa, ctr, effectiveDailyBudget, matchesCode, ZERO, add, type DayStat } from './campaigns';
import { accountRows, ACCOUNTS, campaigns, SYNTH_ANCHOR, SYNTH_START } from './synth';
import { PRESETS, PRESET_LABEL, resolveRange, daysBetween, type Range } from './timeline';
import { esc, hud, layout, reveal } from './ui';

const n0 = (x: number | null | undefined) => (x === null || x === undefined ? '-' : Math.round(x).toLocaleString('en-US'));
const p2 = (x: number | null) => (x === null ? '-' : (x * 100).toFixed(2) + '%');
const mil = (x: number) => (x >= 1e9 ? (x / 1e9).toFixed(2) + 'B' : (x / 1e6).toFixed(1) + 'M');

export interface ViewQuery { range?: string | null; from?: string | null; to?: string | null; q?: string | null; ask?: string | null }
export const parseQuery = (sp: URLSearchParams): ViewQuery => ({ range: sp.get('range'), from: sp.get('from'), to: sp.get('to'), q: (sp.get('q') ?? '').slice(0, 80), ask: sp.get('ask') });
export const rangeOf = (q: ViewQuery): Range => resolveRange(q, SYNTH_ANCHOR, SYNTH_START);

function href(base: string, r: Range, q: string, preset?: string): string {
  const p = new URLSearchParams();
  p.set('range', preset ?? r.preset);
  if ((preset ?? r.preset) === 'custom') { p.set('from', r.from); p.set('to', r.to); }
  if (q) p.set('q', q);
  return `${base}?${p.toString()}`;
}

function controls(base: string, r: Range, q: string): string {
  const chips = PRESETS.map((k) => `<a class="chip${r.preset === k ? ' on' : ''}" href="${esc(href(base, r, q, k))}">${PRESET_LABEL[k]}</a>`).join('');
  const codes = ['', 'BX-LAUNCH', 'BX-ALWAYSON'].map((c) => {
    const p = new URLSearchParams({ range: r.preset }); if (r.preset === 'custom') { p.set('from', r.from); p.set('to', r.to); } if (c) p.set('q', c);
    return `<a class="chip${q.toUpperCase() === c ? ' on' : ''}" href="${base}?${esc(p.toString())}">${c || 'All codes'}</a>`;
  }).join('');
  return `<div class="card flat vf rv"><form class="ctl" method="get" action="${base}">
<div class="grp"><span class="mono">Timeline</span><div class="chips">${chips}<a class="chip${r.preset === 'custom' ? ' on' : ''}" href="#custom">Custom</a></div></div>
<div class="grp" id="custom"><span class="mono">Custom range</span><div class="chips"><input id="custom-from" type="date" name="from" value="${esc(r.from)}" min="${SYNTH_START}" max="${SYNTH_ANCHOR}" aria-label="From"><input type="date" name="to" value="${esc(r.to)}" min="${SYNTH_START}" max="${SYNTH_ANCHOR}" aria-label="To"></div></div>
<div class="grp"><span class="mono">Campaign code contains</span><input type="search" name="q" value="${esc(q)}" placeholder="e.g. BX-LAUNCH" maxlength="80" aria-label="Campaign code filter"></div>
<input type="hidden" name="range" value="custom"><button class="btn" type="submit">Apply</button></form>
<div class="chips" style="margin-top:14px">${codes}</div>
<p class="mono" style="margin:14px 0 0">${esc(r.label)} · ${r.days} day${r.days > 1 ? 's' : ''} · <span style="white-space:nowrap">demo today ${SYNTH_ANCHOR}</span></p></div>`;
}

function tiles(t: DayStat, extra: Array<[string, string]> = []): string {
  const items: Array<[string, string, boolean]> = [['Spend (VND)', `<span data-count="${Math.round(t.spend)}">${n0(t.spend)}</span>`, true], ['Impressions', n0(t.impressions), false], ['Clicks', n0(t.clicks), false], ['CTR', p2(ctr(t)), false], ['Conversions', n0(t.conversions), false], ['CPA (VND)', n0(cpa(t)), false], ...extra.map(([k, v]) => [k, v, false] as [string, string, boolean])];
  return `<div class="tiles">${items.map(([k, v, key]) => `<div class="tile${key ? ' key' : ''} rv"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('')}</div>`;
}

const statusPill = (s: string) => `<span class="pill ${s === 'active' ? 'fill' : s === 'unsettled' ? 'warn' : 'bad'}">${s}</span>`;

// ---------------------------------------------------------------- overview
export function overviewPage(vq: ViewQuery): string {
  const r = rangeOf(vq), q = vq.q ?? '';
  const rows = accountRows(r, (n) => matchesCode(n, q));
  const total = rows.reduce((t, a) => add(t, a.period), ZERO);
  const attention = rows.filter((a) => a.status !== 'active' || a.alert || a.balance_due > a.threshold).length;
  const cards = rows.map((a) => {
    const over = a.balance_due > a.threshold;
    return `<article class="card vf acct is-${a.status} rv" aria-label="${esc(a.name)}">
<div class="hd"><div><div class="nm">${esc(a.name)}</div><div class="id">${esc(a.id)} · ${a.platform === 'meta' ? 'Meta' : 'TikTok'}</div></div>${statusPill(a.status)}</div>
<div class="mono" style="margin-bottom:8px">Spend · ${esc(r.preset === 'today' ? 'today' : r.preset === 'custom' ? 'custom range' : r.preset.toUpperCase())}</div><div class="big">${n0(a.period.spend)}</div>
<div class="kv"><div><div class="k">Spend today</div><div class="v">${n0(a.today.spend)}</div></div><div><div class="k">Campaigns</div><div class="v">${a.campaigns}</div></div>
<div><div class="k">Spend cap</div><div class="v">${mil(a.cap)}</div></div><div><div class="k">Billing threshold</div><div class="v">${mil(a.threshold)}</div></div>
<div><div class="k">Balance due</div><div class="v ${over ? 'warn' : ''}">${n0(a.balance_due)}</div></div><div><div class="k">Cap used</div><div class="v">${(a.capPct * 100).toFixed(0)}%</div></div></div>
<div class="meter${a.capPct > 0.9 ? ' hot' : ''}" role="img" aria-label="Cap used ${(a.capPct * 100).toFixed(0)} percent"><i style="width:${Math.min(100, a.capPct * 100).toFixed(1)}%"></i></div>
${a.alert ? `<div class="alert"><span class="pill ${a.status === 'disabled' ? 'bad' : 'warn'}">${esc(a.alert)}</span></div>` : ''}</article>`;
  }).join('');
  return layout('Overview - Unified Media Hub', `${hud('01', 'Overview')}
<h1>${reveal('Every ad account. <em>One</em> screen.')}</h1>
<p class="lead">Status, spend, cap, billing threshold and balance due for each ad account, side by side. Pick a timeline or filter by campaign code; the cards and totals follow.</p>
${controls('/overview', r, q)}
${tiles(total, [['Accounts needing attention', `<span data-count="${attention}">${attention}</span>`]])}
<h2>Ad accounts <span class="tag plain">${rows.length} accounts</span></h2>
<div class="acc-grid">${cards}</div>
<div class="card vf rv" style="margin-top:22px"><div class="mono" style="margin-bottom:8px">05 · Ask the brain</div><h3>Why is cost over plan?</h3><p class="mut">Ask in plain words and get the answer with its source. Demo with synthetic data.</p><a class="btn sec sm" href="/brain">Open the brain</a></div>`, '/overview', true);
}

// ---------------------------------------------------------------- campaigns
export function campaignRows(vq: ViewQuery) {
  const r = rangeOf(vq);
  return { r, rows: campaigns().filter((c) => matchesCode(c.name, vq.q)).map((c) => ({ c, t: campaignStats(c, r), budget: effectiveDailyBudget(c) })).sort((a, b) => b.t.spend - a.t.spend) };
}

export function campaignsPage(vq: ViewQuery): string {
  const { r, rows } = campaignRows(vq), q = vq.q ?? '';
  const total = rows.reduce((t, x) => add(t, x.t), ZERO);
  const acct = (id: string) => ACCOUNTS.find((a) => a.id === id)!;
  const body = rows.map(({ c, t, budget }) => `<tr><td><span class="codename">${esc(c.name)}</span><div class="mono" style="margin-top:6px">${esc(acct(c.account_id).name.replace('BRAND X · ', ''))} · ${c.platform === 'meta' ? 'Meta' : 'TikTok'}</div></td>
<td><span class="pill ${c.budget_type === 'ABO' ? '' : 'dim'}">${c.budget_type}</span></td>
<td class="n">${n0(budget)}${c.budget_type === 'ABO' ? `<details class="abo"><summary>Σ ${c.adsets.length} ad sets</summary><ul>${c.adsets.map((s) => `<li><span>${esc(s.name)}</span><span>${n0(s.daily_budget)}</span></li>`).join('')}</ul></details>` : ''}</td>
<td>${statusPill(c.status === 'active' ? 'active' : 'paused').replace('bad', 'dim')}</td>
<td class="n">${n0(t.spend)}</td><td class="n">${n0(t.impressions)}</td><td class="n">${n0(t.clicks)}</td><td class="n">${p2(ctr(t))}</td><td class="n">${n0(t.conversions)}</td><td class="n">${n0(cpa(t))}</td></tr>`).join('');
  return layout('Campaigns - Unified Media Hub', `${hud('02', 'Campaigns')}
<h1>${reveal('Campaigns, <em>rolled up</em> the way they spend')}</h1>
<p class="lead">For ABO campaigns the budget sits on the ad sets, so the daily budget shown is the sum of their ad sets and the spend is the sum of their spend.</p>
${controls('/campaigns', r, q)}${tiles(total, [['Campaigns shown', String(rows.length)]])}
<h2>Campaign table</h2>
<div class="card tw flat"><table><thead><tr><th>Campaign code</th><th>Budget type</th><th class="n">Budget / day (VND)</th><th>Status</th><th class="n">Spend (VND)</th><th class="n">Impr.</th><th class="n">Clicks</th><th class="n">CTR</th><th class="n">Conv.</th><th class="n">CPA</th></tr></thead>
<tbody>${body || '<tr><td colspan="10">No campaign code contains this text. Clear the filter to see all.</td></tr>'}</tbody></table></div>
<p class="mut">ABO budget per day = sum of ad set budgets (the platform reports 0 at campaign level). CBO shows the campaign budget.</p>`, '/campaigns', true);
}

// ---------------------------------------------------------------- brain (mock)
export interface BrainAnswer { id: string; q: string; title: string; lines: string[]; source: string }
export function brainAnswers(): BrainAnswer[] {
  const r = resolveRange({ range: '14d' }, SYNTH_ANCHOR, SYNTH_START);
  const over = campaigns().filter((c) => c.status === 'active').map((c) => {
    const spend = campaignStats(c, r).spend, plan = c.planned_daily * r.days;
    return { c, spend, plan, diff: spend - plan };
  }).sort((a, b) => b.diff - a.diff);
  const totalOver = over.filter((x) => x.diff > 0).reduce((s, x) => s + x.diff, 0);
  const top = over[0];
  const l7 = resolveRange({ range: '7d' }, SYNTH_ANCHOR, SYNTH_START);
  const launch = campaigns().filter((c) => matchesCode(c.name, 'BX-LAUNCH')).reduce((t, c) => add(t, campaignStats(c, l7)), ZERO);
  const att = ACCOUNTS.filter((a) => a.status !== 'active' || a.alert);
  return [
    { id: '1', q: 'why is cost over plan?', title: `${top.c.name} drives most of the overspend.`,
      lines: [`Last 14 days: ${mil(top.spend)} spent against ${mil(top.plan)} planned (${top.diff >= 0 ? '+' : ''}${((top.diff / top.plan) * 100).toFixed(0)}%). It is ${((top.diff / totalOver) * 100).toFixed(0)}% of the total overrun of ${mil(totalOver)} VND.`, `Budget type ${top.c.budget_type}${top.c.budget_type === 'ABO' ? ' (ad set budgets summed)' : ''}.`], source: 'Source: hub data · platform export' },
    { id: '2', q: 'which account needs attention?', title: `${att.length} accounts need a look.`,
      lines: att.map((a) => `${a.name}: ${a.alert ?? a.status}.`), source: 'Source: hub data · account status' },
    { id: '3', q: 'what did we learn about creative rotation?', title: 'Rotate creative every 3 to 4 weeks.',
      lines: ['Conversion rate on TikTok fell after about four weeks on the same creative. The confirmed lesson L-001 is checked against every new brief.'], source: 'Source: hub memory · L-001' },
    { id: '4', q: 'how is BX-LAUNCH doing over 7D?', title: `${mil(launch.spend)} VND spent, ${n0(launch.conversions)} conversions.`,
      lines: [`CPA ${n0(cpa(launch))} VND, CTR ${p2(ctr(launch))} across all campaigns whose code contains BX-LAUNCH (${l7.from} to ${l7.to}).`], source: 'Source: hub data · platform export' },
  ];
}

export function brainPage(vq: ViewQuery): string {
  const all = brainAnswers(), cur = all.find((a) => a.id === vq.ask) ?? all[0];
  return layout('Brain - Unified Media Hub', `${hud('05', 'Ask the brain')}
<h1>${reveal('Ask the <em>brain</em>')}</h1>
<p class="lead">Questions go to the hub's memory and data, and the answer comes back with its source. This panel is a demo with synthetic data and prepared questions.</p>
<div class="brain"><div class="qs rv" role="list" aria-label="Questions">${all.map((a) => `<a role="listitem" class="${a.id === cur.id ? 'on' : ''}" href="/brain?ask=${a.id}">@Media Hub ${esc(a.q)}</a>`).join('')}</div>
<div class="card vf flat rv" style="padding:0;border:0;background:none"><div class="win"><div class="bar"><i></i><i></i><i></i><span class="cap">Demo · synthetic data</span></div>
<div class="ask"><b>@Media Hub</b> ${esc(cur.q)}</div>
<div class="ans"><div class="who">Media Hub</div><div class="t" data-type>${esc(cur.title)}</div>${cur.lines.map((l) => `<p>${esc(l)}</p>`).join('')}<span class="src">${esc(cur.source)}</span></div></div></div></div>`, '/brain', true);
}

export { daysBetween };
