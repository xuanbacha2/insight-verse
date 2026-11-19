import type { DashModel, FreshRow } from './dashboard';
import type { BriefResult, Learning } from './memory';
import type { Totals } from './analysis';
import { fmtDay } from './analysis';
import { colorClass, legend, lineChart, stackedBars } from './charts';

export const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const CSS = `
:root{--bg:#f6f5f1;--fg:#1c1c1a;--mut:#63635d;--card:#fff;--line:#e2e0d8;--acc:#1f5fbf;--accfg:#fff;--warn:#9a4d05;--warnbg:#fff3df;--good:#15803d;--bad:#b91c1c;--c1:#2563eb;--c2:#0d9488;--c3:#d97706;--c4:#7c3aed;--grid:#e9e7df}
@media (prefers-color-scheme:dark){:root{--bg:#141413;--fg:#efeee9;--mut:#a5a49c;--card:#1d1d1b;--line:#34332f;--acc:#7fb0ff;--accfg:#101010;--warn:#f5b254;--warnbg:#33260f;--good:#4ade80;--bad:#f87171;--c1:#7fb0ff;--c2:#5eead4;--c3:#fbbf24;--c4:#c4b5fd;--grid:#2a2926}}
*{box-sizing:border-box}html{background:var(--bg)}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,Segoe UI,Roboto,sans-serif}
main{max-width:1100px;margin:0 auto;padding:20px 20px 48px}main.wide{max-width:1560px}
header.top{display:flex;align-items:center;gap:28px;border-bottom:1px solid var(--line);padding-bottom:12px;margin-bottom:6px}
header.top b{font-size:1.05rem}nav a{margin-right:18px;color:var(--mut);text-decoration:none;padding:4px 0}nav a.on{color:var(--fg);border-bottom:2px solid var(--acc)}
h1{font-size:1.9rem;line-height:1.2;margin:.5em 0 .3em}h2{font-size:1.2rem;margin:1.5em 0 .5em}h3{font-size:1rem;margin:0 0 .4em}
p,li{max-width:76ch}.mut{color:var(--mut);font-size:.92rem}.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 18px;margin:10px 0}
.btn{display:inline-block;background:var(--acc);color:var(--accfg);padding:9px 18px;border-radius:8px;text-decoration:none;border:1px solid var(--acc);font:inherit;cursor:pointer;margin:4px 8px 4px 0}
.btn.sec{background:transparent;color:var(--acc)}.btn.sm{padding:3px 10px;font-size:.88rem}
.banner{background:var(--warnbg);color:var(--warn);border:1px solid var(--warn);border-radius:8px;padding:9px 14px;margin:12px 0;font-weight:600}
.tw{overflow-x:auto}table{border-collapse:collapse;width:99.9%;font-size:.93rem}th,td{text-align:left;padding:7px 10px;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--mut);font-weight:600;white-space:nowrap}
td.n,th.n{text-align:right;font-variant-numeric:tabular-nums}
.tag{display:inline-block;border:1px solid var(--warn);color:var(--warn);border-radius:99px;padding:0 9px;font-size:.78rem;font-weight:600;vertical-align:middle}
.tag.plain{border-color:var(--line);color:var(--mut)}.ok{color:var(--good)}.bad{color:var(--bad)}.warn{color:var(--warn)}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin:12px 0}.tile{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 16px}
.tile .v{font-size:1.65rem;font-weight:650;font-variant-numeric:tabular-nums}.tile .k{color:var(--mut);font-size:.85rem}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}@media (max-width:1000px){.grid2{grid-template-columns:1fr}}
.cols3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}@media (max-width:800px){.cols3{grid-template-columns:1fr}}
.chart{width:99.9%;height:auto}.chart .grid{stroke:var(--grid)}.chart .axis{fill:var(--mut);font-size:14px}
.f-meta{fill:var(--c1);background:var(--c1)}.f-tiktok{fill:var(--c2);background:var(--c2)}.f-google{fill:var(--c3);background:var(--c3)}.f-other{fill:var(--c4);background:var(--c4)}.f-target{fill:var(--mut);background:var(--mut)}
.l-meta{stroke:var(--c1)}.l-tiktok{stroke:var(--c2)}.l-google{stroke:var(--c3)}.l-other{stroke:var(--c4)}.l-target{stroke:var(--mut)}.chart path{stroke-width:2.4}.chart .dashed{stroke-dasharray:6 5}
.legend{display:flex;gap:16px;flex-wrap:wrap;font-size:.86rem;color:var(--mut);margin:6px 0}.sw{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:6px;vertical-align:-1px}.sw-dash{height:3px;vertical-align:3px}
form.filters{display:flex;flex-wrap:wrap;gap:12px;align-items:end}form.filters label{display:flex;flex-direction:column;font-size:.82rem;color:var(--mut)}
input,select,textarea{font:inherit;background:var(--card);color:var(--fg);border:1px solid var(--line);border-radius:6px;padding:6px 8px}textarea{width:99.9%}
.flag{border-left:4px solid var(--bad);padding:6px 12px;margin:10px 0;background:var(--card);border-radius:0 8px 8px 0}.flag.gate{border-left-color:var(--warn)}.flag .refs{color:var(--mut);font-size:.85rem}
.hit{border-left:4px solid var(--bad);padding:6px 12px;margin:10px 0;background:var(--card)}.hit.try{border-left-color:var(--warn)}.hit.neg{border-left-color:var(--line)}
.hero{display:grid;grid-template-columns:1.25fr 1fr;gap:28px;align-items:start}@media (max-width:900px){.hero{grid-template-columns:1fr}}
@media (min-width:1500px){body{font-size:17px}}`;

export function layout(title: string, body: string, active = '', wide = false): string {
  const nav = [['/', 'Home'], ['/dashboard', 'Dashboard'], ['/memory', 'Memory'], ['/accounts', 'Accounts']]
    .map(([h, l]) => `<a href="${h}"${active === h ? ' class="on"' : ''}>${l}</a>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><style>${CSS}</style></head><body><main${wide ? ' class="wide"' : ''}>
<header class="top"><b>Unified Media Hub</b><nav>${nav}</nav></header>${body}
<p class="mut" style="margin-top:36px">Prototype. Dashboards refresh on a schedule and show the age of each source.</p>
</main></body></html>`;
}

export interface LandingState { metaReady: boolean; ttReady: boolean }

export function landingPage(s: LandingState): string {
  return layout('Unified Media Hub', `
<div class="hero"><div>
<h1>One login to your media data, a dashboard that refreshes on a schedule, and a memory of what worked.</h1>
<p>Sign in with your own Meta and TikTok accounts. The hub keeps the access tokens on the server, lists the pages and ad accounts you are allowed to see, pulls daily campaign metrics into ready-made templates, and shows when each source was last refreshed and how old its data is. Approved decisions are stored as <em>trial</em> and become confirmed lessons only once a measured result is recorded; new briefs are checked against confirmed lessons.</p>
<p><a class="btn" href="/auth/meta/start">Connect Meta</a><a class="btn" href="/auth/tiktok/start">Connect TikTok</a><a class="btn sec" href="/dashboard">Open the demo dashboard</a></p>
<p class="mut">Setup status: Meta ${s.metaReady ? 'ready' : 'waiting for the operator to set the app secret'}; TikTok ${s.ttReady ? 'ready' : 'waiting for the operator to set the encryption key'}. Read-only scopes only.</p>
</div>
<div class="card"><h3>Limits, stated plainly</h3><ul>
<li><b>Meta:</b> the hub's app is in development mode and has not passed App Review. Only people with a role on the app can sign in, and only to accounts they already have access to.</li>
<li><b>TikTok:</b> connects through TikTok's official Ads MCP server with OAuth 2.0 and PKCE, not through an approved Marketing API app. Use from a self-built client is not confirmed with TikTok.</li>
<li><b>Data latency:</b> platform numbers arrive late and can be restated inside attribution windows. Every source shows its last refresh and newest day of data; refresh runs hourly, not instantly.</li>
<li><b>Demo figures are SYNTHETIC:</b> fictional brand "BRAND X", invented numbers, labelled wherever shown.</li></ul></div></div>
<div class="cols3" style="margin-top:18px">
<div class="card"><h3>1. Connect</h3><p class="mut">OAuth sign-in with your own account. Pick which ad accounts to include.</p></div>
<div class="card"><h3>2. Weekly template</h3><p class="mut">Spend, CTR, CPC, conversions and CPA by source and week, against target and last year where available, plus reconciliation flags.</p></div>
<div class="card"><h3>3. Brand memory</h3><p class="mut">Trial decisions, confirmed lessons with their result, and a brief check against confirmed lessons.</p></div></div>`, '/');
}

export function messagePage(title: string, msg: string): string {
  return layout(title, `<h1>${esc(title)}</h1><p>${esc(msg)}</p><p><a class="btn sec" href="/">Back</a></p>`);
}

// ---------------------------------------------------------------- dashboard
const n0 = (x: number | null | undefined) => (x === null || x === undefined ? '-' : Math.round(x).toLocaleString('en-US'));
const p1 = (x: number | null) => (x === null ? '-' : (x * 100).toFixed(2) + '%');
const dlt = (a: number | null, b: number | null) => {
  if (a === null || b === null || b === 0) return '<span class="mut">-</span>';
  const d = a / b - 1;
  return `<span class="${d >= 0 ? 'ok' : 'bad'}">${d >= 0 ? '+' : ''}${(d * 100).toFixed(1)}%</span>`;
};
const srcName = (s: string) => (s === 'tiktok' ? 'TikTok' : s[0].toUpperCase() + s.slice(1));
const SYN = '<span class="tag">SYNTHETIC</span>';

function tiles(t: Totals, unit: string): string {
  const items: Array<[string, string]> = [[`Spend${unit}`, n0(t.spend)], ['Impressions', n0(t.impressions)], ['Clicks', n0(t.clicks)], ['CTR', p1(t.ctr)],
    [`CPC${unit}`, n0(t.cpc)], ['Conversions', n0(t.conversions)], [`CPA${unit}`, n0(t.cpa)]];
  return `<div class="tiles">${items.map(([k, v]) => `<div class="tile"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('')}</div>`;
}

function freshnessTable(rows: FreshRow[], withDisconnect: boolean): string {
  const body = rows.map((s) => `<tr><td>${esc(s.label)} ${s.synthetic ? SYN : ''}</td>
<td class="${s.status === 'active' || s.status === 'seeded' ? 'ok' : 'bad'}">${esc(s.status)}</td><td class="n">${esc(s.accounts)}</td><td>${esc(s.lastRefresh ?? 'never')}</td><td>${esc(s.dataThrough ?? 'no data yet')}</td><td class="n">${esc(s.rows)}</td>
<td class="mut">${esc(s.note)}</td>${withDisconnect ? `<td>${s.connId ? `<a class="btn sec sm" href="/accounts">Accounts</a> <form method="post" action="/disconnect/${esc(s.connId)}" style="display:inline"><button class="btn sec sm" type="submit">Disconnect</button></form>` : ''}</td>` : ''}</tr>`).join('');
  return `<div class="card tw"><table><tr><th>Source</th><th>Status</th><th class="n">Accounts</th><th>Last refresh (UTC)</th><th>Data through</th><th class="n">Rows</th><th>Latency note</th>${withDisconnect ? '<th></th>' : ''}</tr>${body || `<tr><td colspan="8">No sources yet. <a href="/">Connect one</a>.</td></tr>`}</table>
<p class="mut">Refresh is scheduled (hourly). "Data through" is the newest day stored; platforms can restate recent days.</p></div>`;
}

export function dashboardPage(m: DashModel): string {
  const unit = m.synthetic ? ' (VND)' : '';
  const f = m.filter;
  const srcOpts = ['all', ...m.sourcesAvail].map((s) => `<option value="${s}"${f.source === s ? ' selected' : ''}>${s === 'all' ? 'All sources' : srcName(s)}</option>`).join('');
  const labels = m.weeks.map((w) => fmtDay(w.week));
  const srcs = m.sourcesAvail.filter((s) => f.source === 'all' || f.source === s);
  const spendSeries = srcs.map((s) => ({ name: srcName(s), cls: colorClass(s), values: m.weeks.map((w) => w.perSource[s]?.spend ?? 0) }));
  const cpaSeries = [...srcs.map((s) => ({ name: srcName(s), cls: colorClass(s), values: m.weeks.map((w) => (w.gatedSources.includes(s) ? null : w.perSource[s]?.cpa ?? null)) as Array<number | null> })),
    ...(m.synthetic ? [{ name: 'Target CPA (all sources)', cls: 'target', dashed: true, values: m.weeks.map((w) => (w.gated ? null : w.targetCpa)) as Array<number | null> }] : [])];

  const srcRows = m.bySource.map((s) => `<tr><td>${srcName(s.source)}</td><td class="n">${n0(s.t.spend)}</td><td class="n">${n0(s.t.impressions)}</td><td class="n">${n0(s.t.clicks)}</td><td class="n">${p1(s.t.ctr)}</td><td class="n">${n0(s.t.cpc)}</td><td class="n">${n0(s.t.conversions)}</td><td class="n">${n0(s.t.cpa)}</td>
${m.synthetic ? `<td class="n">${s.gated && s.targetConv === null ? '<span class="warn">not enough data</span>' : n0(s.targetConv)}</td><td class="n">${dlt(s.convCmp, s.targetConv)}</td><td class="n">${n0(s.lyConv)}</td><td class="n">${dlt(s.convCmp, s.lyConv)}</td>` : ''}</tr>`).join('');
  const wkRows = m.weeks.map((w) => `<tr><td>${w.label}</td><td class="n">${n0(w.t.spend)}</td><td class="n">${n0(w.t.impressions)}</td><td class="n">${n0(w.t.clicks)}</td><td class="n">${p1(w.t.ctr)}</td><td class="n">${n0(w.t.cpc)}</td><td class="n">${n0(w.t.conversions)}</td><td class="n">${n0(w.t.cpa)}</td>
${m.synthetic ? (w.gated ? `<td colspan="4"><span class="warn">Not enough data to conclude (export has a gap this week)</span></td>` : `<td class="n">${n0(w.targetConv)}</td><td class="n">${dlt(w.t.conversions, w.targetConv)}</td><td class="n">${n0(w.lyConv)}</td><td class="n">${dlt(w.t.conversions, w.lyConv)}</td>`) : ''}</tr>`).join('');
  const cmpHead = m.synthetic ? '<th class="n">Target conv.</th><th class="n">vs target</th><th class="n">Last-year conv.</th><th class="n">vs last year</th>' : '';
  const campRows = m.campaigns.map((c) => `<tr><td>${srcName(c.source)}</td><td>${esc(c.campaign)}</td><td class="n">${n0(c.t.spend)}</td><td class="n">${n0(c.t.impressions)}</td><td class="n">${n0(c.t.clicks)}</td><td class="n">${p1(c.t.ctr)}</td><td class="n">${n0(c.t.cpc)}</td><td class="n">${n0(c.t.conversions)}</td><td class="n">${n0(c.t.cpa)}</td></tr>`).join('');
  const head = (first: string) => `<tr><th>${first}</th><th class="n">Spend${unit}</th><th class="n">Impr.</th><th class="n">Clicks</th><th class="n">CTR</th><th class="n">CPC</th><th class="n">Conv.</th><th class="n">CPA</th>${cmpHead}</tr>`;

  const flags = m.reconNote ? `<p class="mut">${esc(m.reconNote)}</p>` : (m.flags.length ? m.flags.map((x) => `<div class="flag${x.type === 'NOT_ENOUGH_DATA' ? ' gate' : ''}"><b>${esc(x.title)}</b> <span class="tag plain">${x.type.replace(/_/g, ' ')}</span><br>${esc(x.detail)}<div class="refs">Source lines: ${x.refs.map((r) => `${esc(r.file)}:L${r.line}`).join(', ')}</div></div>`).join('') : '<p class="mut">No flags on this data.</p>');
  const l = m.learnings;
  const toggles = m.demoAvailable ? `<a class="btn sec sm" href="/dashboard?data=${m.synthetic ? 'mine' : 'demo'}">Show ${m.synthetic ? 'my connected data' : 'demo data'}</a>` : '';

  return layout('Dashboard - Unified Media Hub', `
<h1>Weekly performance ${m.synthetic ? SYN : ''}</h1>
${m.synthetic ? '<div class="banner">SYNTHETIC DATA: fictional brand BRAND X, invented numbers for demonstration. They say nothing about real performance.</div>' : '<p class="mut">Showing data pulled from your connected accounts (currency as reported by each platform).</p>'}
<div class="card"><form class="filters" method="get" action="/dashboard"><input type="hidden" name="data" value="${m.dataset}">
<label>Source<select name="source">${srcOpts}</select></label>
<label>From<input type="date" name="from" value="${esc(f.from)}" min="${esc(m.range.min ?? '')}" max="${esc(m.range.max ?? '')}"></label>
<label>To<input type="date" name="to" value="${esc(f.to)}" min="${esc(m.range.min ?? '')}" max="${esc(m.range.max ?? '')}"></label>
${m.synthetic ? `<label>Scenario<select name="gap"><option value="0">Complete export</option><option value="1"${m.gapScenario ? ' selected' : ''}>Simulate a missing week (TikTok)</option></select></label>` : ''}
<button class="btn" type="submit">Apply</button><a class="btn sec" href="/dashboard?data=${m.dataset}">Reset</a>${toggles}</form>
<p class="mut">Data available ${esc(m.range.min ?? 'n/a')} to ${esc(m.range.max ?? 'n/a')}.</p></div>
${m.weeks.length ? `${tiles(m.total, unit)}
<div class="grid2"><div class="card"><h3>Spend by week${unit}</h3>${stackedBars(labels, spendSeries, 'weekly spend', 'Spend by week and source')}${legend(spendSeries)}</div>
<div class="card"><h3>CPA by week${unit}</h3>${lineChart(labels, cpaSeries, 'spend / conversion', 'CPA by week and source')}${legend(cpaSeries)}</div></div>
<h2>By source</h2><div class="card tw"><table>${head('Source')}${srcRows}</table></div>
<h2>By week</h2><div class="card tw"><table>${head('Week')}${wkRows}</table></div>
<h2>By campaign</h2><div class="card tw"><table><tr><th>Source</th><th>Campaign</th><th class="n">Spend${unit}</th><th class="n">Impr.</th><th class="n">Clicks</th><th class="n">CTR</th><th class="n">CPC</th><th class="n">Conv.</th><th class="n">CPA</th></tr>${campRows}</table></div>` : '<div class="card">No data for this selection yet. Connect an account, or widen the date range.</div>'}
<h2>Flags ${m.synthetic ? SYN : ''}</h2>
<p class="mut">Plan vs agency report vs platform export. Each flag names the file and line it came from. When data is missing the hub says it cannot conclude instead of filling the gap.</p>${flags}
<h2>Data freshness</h2>${freshnessTable(m.fresh, true)}
<h2>Brand memory</h2>
<div class="card">Confirmed lessons: <strong>${l.confirmed ?? 0}</strong> &middot; Trial decisions: <strong>${l.trial ?? 0}</strong> &middot; Retired: <strong>${l.retired ?? 0}</strong> &middot; <a href="/memory">Open memory</a>
<p class="mut">A trial decision becomes a confirmed lesson only when its measured result is recorded (enforced by the database schema).</p></div>
<p class="mut">Page generated ${esc(m.generated)}.</p>`, '/dashboard', true);
}

// ---------------------------------------------------------------- memory
const STATUS_CLS: Record<string, string> = { confirmed: 'ok', trial: 'warn', retired: 'mut' };

export function memoryPage(a: { learnings: Learning[]; brief: string; result: BriefResult | null; error?: string; notice?: string }): string {
  const rows = a.learnings.map((l) => `<tr><td>${esc(l.id)} ${l.is_synthetic ? SYN : ''}</td><td class="${STATUS_CLS[l.status]}"><b>${l.status}</b></td>
<td>${esc(l.topic ?? '')}<br><span class="mut">${esc(l.channel ?? '')}</span></td><td>${esc(l.lesson)}</td><td>${esc(l.source)}<br><span class="mut">${esc(l.source_ref ?? '')}</span></td><td>${esc(l.date)}</td><td>${esc(l.approver)}</td>
<td>${l.outcome ? esc(l.outcome) : '<span class="mut">none yet</span>'}</td>
<td>${l.status === 'trial' && l.session_hash ? `<form method="post" action="/memory/confirm"><input type="hidden" name="id" value="${esc(l.id)}"><input name="outcome" placeholder="Measured result (required)" required minlength="5" maxlength="1000" style="width:190px"><br><input name="approver" placeholder="Confirmed by" required maxlength="80" style="width:190px;margin-top:4px"><br><button class="btn sm" type="submit" style="margin-top:4px">Confirm with outcome</button></form>` : ''}</td></tr>`).join('');
  const r = a.result;
  const short = (t: string) => (t.length > 140 ? t.slice(0, 137) + '...' : t);
  const result = r ? `<h2>Brief check result</h2>
<p class="mut">Scanned ${r.scanned} lines against ${r.confirmedCount} confirmed lessons and ${r.trialCount} trial decisions; ${r.ignored.length} ignored (${r.ignored.map((i) => `${esc(i.learning.id)}: ${esc(i.why)}`).join('; ') || 'none'}). Only confirmed lessons raise flags.</p>
${r.flags.map((h) => `<div class="hit"><b>FLAG</b> brief line ${h.line}: "${esc(short(h.text))}"<br>Matches confirmed lesson <b>${esc(h.learning.id)}</b> (${esc(h.learning.date)}, ${esc(h.learning.source)}; ${esc(h.learning.channel ?? '')}, ${esc(h.learning.topic ?? '')})<br>Lesson: ${esc(h.learning.lesson)}<br><span class="mut">Earlier decision: ${esc(h.learning.decision_taken ?? 'n/a')} (approved by ${esc(h.learning.approver)})</span></div>`).join('') || '<p>No confirmed lesson matched any line.</p>'}
${r.trial.map((h) => `<div class="hit try"><b>TRIAL, NOT VERIFIED</b> brief line ${h.line}: "${esc(short(h.text))}" touches trial decision ${esc(h.learning.id)}. Not a confirmed lesson; shown for reference only.</div>`).join('')}
${r.negated.map((h) => `<div class="hit neg"><b>SKIPPED</b> brief line ${h.line}: "${esc(short(h.text))}" (matched ${esc(h.learning.id)} but sits behind a negation, so the line says not to do it)</div>`).join('')}
<p class="mut">${r.flags.length} flag(s). No flag does not mean no risk: the reviewer still reads the brief.</p>` : '';
  return layout('Brand memory - Unified Media Hub', `
<h1>Brand memory</h1>
<p>Decisions become lessons in two steps: approved as a <b>trial</b>, then <b>confirmed</b> only with a recorded outcome. New briefs are checked against confirmed lessons; trial and retired entries never raise a flag. Entries tagged ${SYN} are fictional demo lessons visible to everyone; entries you add are private to your browser session.</p>
${a.error ? `<div class="banner" style="color:var(--bad);border-color:var(--bad);background:transparent">${esc(a.error)}</div>` : ''}${a.notice ? `<div class="banner">${esc(a.notice)}</div>` : ''}
<div class="card tw"><table><tr><th>ID</th><th>Status</th><th>Topic</th><th>Lesson / decision</th><th>Source</th><th>Date</th><th>Approver</th><th>Outcome</th><th></th></tr>${rows}</table></div>
<div class="grid2">
<div class="card"><h3>Check a brief</h3><form method="post" action="/memory/check"><textarea name="brief" rows="11" maxlength="8000" required placeholder="Paste brief text">${esc(a.brief)}</textarea>
<p><button class="btn" type="submit">Check brief</button><a class="btn sec" href="/memory?sample=1">Load sample brief</a></p></form></div>
<div class="card"><h3>Approve a decision as a trial</h3><form method="post" action="/memory/approve">
<p><label>Decision / lesson<br><textarea name="lesson" rows="3" required minlength="10" maxlength="1000"></textarea></label></p>
<p><label>Keywords that would signal it in a brief (comma separated, plain phrases)<br><input name="keywords" maxlength="300" style="width:99.9%"></label></p>
<p><input name="topic" placeholder="Topic" maxlength="80"> <input name="channel" placeholder="Channel" maxlength="40"> <input name="source" placeholder="Source campaign" maxlength="120"></p>
<p><input name="approver" placeholder="Approved by (required)" required maxlength="80"> <button class="btn" type="submit">Approve as trial</button></p></form></div></div>
${result}`, '/memory', true);
}

// ---------------------------------------------------------------- accounts
export interface AcctConn { id: string; provider: string; display_name: string | null; status: string; accounts: Array<{ id: string; kind: string; external_id: string; name: string | null; currency: string | null; selected: number }> }

export function accountsPage(conns: AcctConn[], notice?: string): string {
  const body = conns.map((c) => `<div class="card"><h3>${c.provider === 'meta' ? 'Meta' : 'TikTok'}${c.display_name ? ' - ' + esc(c.display_name) : ''} <span class="tag plain">${esc(c.status)}</span></h3>
<form method="post" action="/accounts/${esc(c.id)}"><div class="tw"><table><tr><th>Include in pull</th><th>Type</th><th>Name</th><th>ID</th><th>Currency</th></tr>
${c.accounts.map((a) => `<tr><td>${a.kind === 'page' ? '<span class="mut">listed only</span>' : `<input type="checkbox" name="sel" value="${esc(a.id)}"${a.selected ? ' checked' : ''}>`}</td><td>${esc(a.kind.replace('_', ' '))}</td><td>${esc(a.name ?? '(unnamed)')}</td><td class="mut">${esc(a.external_id)}</td><td>${esc(a.currency ?? '')}</td></tr>`).join('') || '<tr><td colspan="5">No accounts were returned for this login.</td></tr>'}</table></div>
<p><button class="btn" type="submit">Save selection</button> <a class="btn sec" href="/dashboard?data=mine">Open dashboard</a></p></form></div>`).join('');
  return layout('Accounts - Unified Media Hub', `<h1>Accounts</h1>${notice ? `<div class="banner">${esc(notice)}</div>` : ''}
<p>These are the ad accounts and advertisers your login can see. Only ticked ones are pulled on each refresh. Pages are listed so you can see what the login grants; page insights are not pulled in this version.</p>
${body || '<div class="card">No connections yet. <a href="/">Connect Meta or TikTok</a>.</div>'}`, '/accounts');
}
