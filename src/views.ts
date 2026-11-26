import type { DashModel, FreshRow } from './dashboard';
import type { BriefResult, Learning } from './memory';
import type { Totals } from './analysis';
import { fmtDay } from './analysis';
import { colorClass, legend, lineChart, stackedBars } from './charts';
import { PRESETS, PRESET_LABEL, resolveRange } from './timeline';
import { BRANDS, brandById, type BrandId } from './synth';
import { kpi } from './kit';
import type { Setup } from './pages';
import { esc, icon, layout, nav } from './ui';
export { esc, layout };

const shellOf = (title: string, group: string, page: string, path: string, brand: BrandId | 'all') => ({ title, group, page, path, brand });

export function messagePage(title: string, msg: string): string {
  return layout(shellOf(title, 'Hub', 'none', '/', 'all'), `<div class="card"><h2>${esc(title)}</h2><p class="muted mt">${esc(msg)}</p><p class="mt"><a class="btn sec" href="/">Back to home</a></p></div>`);
}

// ---------------------------------------------------------------- dashboard (UNIFY)
const n0 = (x: number | null | undefined) => (x === null || x === undefined ? '-' : Math.round(x).toLocaleString('en-US'));
const p1 = (x: number | null) => (x === null ? '-' : (x * 100).toFixed(2) + '%');
const dlt = (a: number | null, b: number | null) => {
  if (a === null || b === null || b === 0) return '<span class="muted">-</span>';
  const d = a / b - 1;
  return `<span class="${d >= 0 ? 'ok' : 'bad'}">${d >= 0 ? '+' : ''}${(d * 100).toFixed(1)}%</span>`;
};
const srcName = (s: string) => (s === 'tiktok' ? 'TikTok' : s[0].toUpperCase() + s.slice(1));
const DEMO = '<span class="tagc blue">Demo data</span>';

function tiles(t: Totals, unit: string, res: string): string {
  return `<div class="kpis">${[kpi(`Spend${unit}`, n0(t.spend), '', '', 'prim'), kpi('Impressions', n0(t.impressions)), kpi('Clicks', n0(t.clicks)), kpi('CTR', p1(t.ctr)), kpi(`CPC${unit}`, n0(t.cpc)), kpi(res, n0(t.conversions)), kpi(`Cost per result${unit}`, n0(t.cpa))].join('')}</div>`;
}

function freshnessTable(rows: FreshRow[], withDisconnect: boolean): string {
  const body = rows.map((s) => `<tr><td><b>${esc(s.label)}</b></td>
<td><span class="tagc ${s.status === 'active' || s.status === 'demo' ? 'ok' : 'bad'}"><i class="d"></i>${esc(s.status)}</span></td><td class="n">${esc(s.accounts)}</td><td>${esc(s.lastRefresh ?? 'never')}</td><td>${esc(s.dataThrough ?? 'no data yet')}</td>
<td><span class="tagc ${s.age === 'up to date' ? 'ok' : 'warn'}">${esc(s.age)}</span></td><td class="n">${esc(s.rows)}</td>
<td class="muted small">${esc(s.note)}</td>${withDisconnect ? `<td>${s.connId ? `<a class="btn sec sm" href="/accounts">Accounts</a> <form method="post" action="/disconnect/${esc(s.connId)}" style="display:inline"><button class="btn sec sm" type="submit">Disconnect</button></form>` : ''}</td>` : ''}</tr>`).join('');
  return `<div class="card flush"><div class="tw"><table><thead><tr><th>Source</th><th>Status</th><th class="n">Accounts</th><th>Last refresh (UTC)</th><th>Data through</th><th>Data age</th><th class="n">Rows</th><th>Latency note</th>${withDisconnect ? '<th></th>' : ''}</tr></thead><tbody>${body || `<tr><td colspan="9">No sources yet. <a href="/accounts">Connect one</a>.</td></tr>`}</tbody></table></div>
<p class="muted small" style="padding:10px 18px 14px">Refresh is scheduled (hourly). "Data through" is the newest day stored; platforms can restate recent days.</p></div>`;
}

export function dashboardPage(m: DashModel, view: 'exec' | 'analyst' = 'analyst'): string {
  const unit = m.synthetic ? ' (VND)' : '';
  const f = m.filter;
  const brand = m.brand;
  const res = m.synthetic ? (brand === 'all' ? 'Results' : brandById(brand)!.result) : 'Conversions';
  const srcOpts = ['all', ...m.sourcesAvail].map((s) => `<option value="${s}"${f.source === s ? ' selected' : ''}>${s === 'all' ? 'All sources' : srcName(s)}</option>`).join('');
  const labels = m.weeks.map((w) => fmtDay(w.week));
  const srcs = m.sourcesAvail.filter((s) => f.source === 'all' || f.source === s);
  const spendSeries = srcs.map((s) => ({ name: srcName(s), cls: colorClass(s), values: m.weeks.map((w) => w.perSource[s]?.spend ?? 0) }));
  const cpaSeries = [...srcs.map((s) => ({ name: srcName(s), cls: colorClass(s), values: m.weeks.map((w) => (w.gatedSources.includes(s) ? null : w.perSource[s]?.cpa ?? null)) as Array<number | null> })),
    ...(m.synthetic ? [{ name: 'Target cost per result (all sources)', cls: 'target', dashed: true, values: m.weeks.map((w) => (w.gated ? null : w.targetCpa)) as Array<number | null> }] : [])];

  const srcRows = m.bySource.map((s) => `<tr><td>${srcName(s.source)}</td><td class="n">${n0(s.t.spend)}</td><td class="n">${n0(s.t.impressions)}</td><td class="n">${n0(s.t.clicks)}</td><td class="n">${p1(s.t.ctr)}</td><td class="n">${n0(s.t.cpc)}</td><td class="n">${n0(s.t.conversions)}</td><td class="n">${n0(s.t.cpa)}</td>
${m.synthetic ? `<td class="n">${s.gated && s.targetConv === null ? '<span class="warn">not enough data</span>' : n0(s.targetConv)}</td><td class="n">${dlt(s.convCmp, s.targetConv)}</td><td class="n">${n0(s.lyConv)}</td><td class="n">${dlt(s.convCmp, s.lyConv)}</td>` : ''}</tr>`).join('');
  const wkRows = m.weeks.map((w) => `<tr><td>${w.label}</td><td class="n">${n0(w.t.spend)}</td><td class="n">${n0(w.t.impressions)}</td><td class="n">${n0(w.t.clicks)}</td><td class="n">${p1(w.t.ctr)}</td><td class="n">${n0(w.t.cpc)}</td><td class="n">${n0(w.t.conversions)}</td><td class="n">${n0(w.t.cpa)}</td>
${m.synthetic ? (w.gated ? `<td colspan="4"><span class="warn">Not enough data to conclude (export has a gap this week)</span></td>` : `<td class="n">${n0(w.targetConv)}</td><td class="n">${dlt(w.t.conversions, w.targetConv)}</td><td class="n">${n0(w.lyConv)}</td><td class="n">${dlt(w.t.conversions, w.lyConv)}</td>`) : ''}</tr>`).join('');
  const cmpHead = m.synthetic ? '<th class="n">Target</th><th class="n">vs target</th><th class="n">Last year</th><th class="n">vs last year</th>' : '';
  const campRows = m.campaigns.map((c) => `<tr><td>${srcName(c.source)}</td><td class="cn">${esc(c.campaign)}</td><td class="n">${n0(c.t.spend)}</td><td class="n">${n0(c.t.impressions)}</td><td class="n">${n0(c.t.clicks)}</td><td class="n">${p1(c.t.ctr)}</td><td class="n">${n0(c.t.cpc)}</td><td class="n">${n0(c.t.conversions)}</td><td class="n">${n0(c.t.cpa)}</td></tr>`).join('');
  const head = (first: string) => `<thead><tr><th>${first}</th><th class="n">Spend${unit}</th><th class="n">Impr.</th><th class="n">Clicks</th><th class="n">CTR</th><th class="n">CPC</th><th class="n">${esc(res)}</th><th class="n">Cost / result</th>${cmpHead}</tr></thead>`;

  const flags = m.reconNote ? `<p class="muted">${esc(m.reconNote)}</p>` : (m.flags.length ? m.flags.map((x) => `<div class="flag${x.type === 'NOT_ENOUGH_DATA' ? ' gate' : ''}"><b>${esc(x.title)}</b> <span class="tagc ${x.type === 'NOT_ENOUGH_DATA' ? 'warn' : 'bad'}">${x.type.replace(/_/g, ' ').toLowerCase()}</span><br>${esc(x.detail)}<div class="refs">Source lines: ${x.refs.map((r) => `${esc(r.file)}:L${r.line}`).join(', ')}</div></div>`).join('') : '<p class="muted">No flags on this data.</p>');
  const l = m.learnings;
  const toggles = m.demoAvailable ? `<a class="btn sec sm" href="/dashboard?data=${m.synthetic ? 'mine' : 'demo'}${brand === 'all' ? '' : '&brand=' + brand}">Show ${m.synthetic ? 'my connected data' : 'demo data'}</a>` : '';

  const exec = view === 'exec';
  const qs = (o: Record<string, string>) => { const p = new URLSearchParams({ data: m.dataset, source: f.source, ...(brand === 'all' ? {} : { brand }), ...(m.gapScenario ? { gap: '1' } : {}), ...(f.from ? { from: f.from } : {}), ...(f.to ? { to: f.to } : {}), view, ...o }); if (o.brand === 'all') p.delete('brand'); return '/dashboard?' + p.toString(); };
  const presetChips = m.range.max && m.range.min ? PRESETS.filter((k) => k !== 'today').map((k) => { const rr = resolveRange({ range: k }, m.range.max!, m.range.min!); return `<a class="${f.from === rr.from && f.to === rr.to ? 'on' : ''}" href="${esc(qs({ from: rr.from, to: rr.to }))}">${PRESET_LABEL[k]}</a>`; }).join('') : '';
  const viewChips = `<a class="${exec ? 'on' : ''}" href="${esc(qs({ view: 'exec' }))}">Executive</a><a class="${exec ? '' : 'on'}" href="${esc(qs({ view: 'analyst' }))}">Analyst</a>`;
  const brandChips = ['all', ...BRANDS.map((b) => b.id)].map((id) => `<a class="${brand === id ? 'on' : ''}" href="${esc(qs({ brand: id }))}">${id === 'all' ? 'All brands' : brandById(id)!.name}</a>`).join('');
  const bq = brand === 'all' ? '' : `<input type="hidden" name="brand" value="${brand}">`;
  return layout(shellOf('UNIFY weekly', 'Dashboard', 'dashboard', '/dashboard', brand), `
<div class="card fbar"><div class="frow"><div class="seg" aria-label="View">${viewChips}</div><div class="seg" aria-label="Timeline">${presetChips}</div>${m.synthetic ? `<div class="seg" aria-label="Brand">${brandChips}</div>` : ''}</div>
<form class="frow" method="get" action="/dashboard"><input type="hidden" name="data" value="${m.dataset}"><input type="hidden" name="view" value="${view}">${bq}
<label class="fld">Source<select name="source">${srcOpts}</select></label>
<label class="fld">From<input type="date" name="from" value="${esc(f.from)}" min="${esc(m.range.min ?? '')}" max="${esc(m.range.max ?? '')}"></label>
<label class="fld">To<input type="date" name="to" value="${esc(f.to)}" min="${esc(m.range.min ?? '')}" max="${esc(m.range.max ?? '')}"></label>
${m.synthetic ? `<label class="fld">Scenario<select name="gap"><option value="0">Complete export</option><option value="1"${m.gapScenario ? ' selected' : ''}>Simulate a missing week (TikTok)</option></select></label>` : ''}
<button class="btn sm" type="submit">Apply</button><a class="btn sm sec" href="/dashboard?data=${m.dataset}${brand === 'all' ? '' : '&brand=' + brand}">Reset</a>${toggles}</form>
<p class="small muted">Data available ${esc(m.range.min ?? 'n/a')} to ${esc(m.range.max ?? 'n/a')}. ${m.synthetic ? 'Weekly template with target, last year and reconciliation flags.' : 'Showing data pulled from your connected accounts (currency as reported by each platform).'}</p></div>
<div class="sec"><div class="sec-h">${icon('trend', 20)}<h2>Weekly performance</h2>${m.synthetic ? DEMO : ''}</div>
${m.weeks.length ? `${tiles(m.total, unit, res)}
<div class="g2 mt"><div class="card"><h3>Spend by week${unit}</h3>${stackedBars(labels, spendSeries, 'weekly spend', 'Spend by week and source')}${legend(spendSeries)}</div>
<div class="card"><h3>Cost per result by week${unit}</h3>${lineChart(labels, cpaSeries, 'spend / result', 'Cost per result by week and source')}${legend(cpaSeries)}</div></div>
${exec ? '' : `<div class="card flush mt"><div class="head"><h2>By source</h2></div><div class="tw"><table>${head('Source')}<tbody>${srcRows}</tbody></table></div></div>
<div class="card flush mt"><div class="head"><h2>By week</h2></div><div class="tw"><table>${head('Week')}<tbody>${wkRows}</tbody></table></div></div>
<div class="card flush mt"><div class="head"><h2>By campaign</h2></div><div class="tw"><table><thead><tr><th>Source</th><th>Campaign</th><th class="n">Spend${unit}</th><th class="n">Impr.</th><th class="n">Clicks</th><th class="n">CTR</th><th class="n">CPC</th><th class="n">${esc(res)}</th><th class="n">Cost / result</th></tr></thead><tbody>${campRows}</tbody></table></div></div>`}` : '<div class="card">No data for this selection yet. Connect an account, or widen the date range.</div>'}</div>
<div class="sec"><div class="sec-h">${icon('alert', 20)}<h2>Mismatch flags</h2>${m.synthetic ? DEMO : ''}</div>
<p class="muted small" style="margin:-4px 0 6px">Plan vs agency report vs platform export. Each flag names the file and line it came from. When data is missing the hub says it cannot conclude instead of filling the gap.</p>${flags}</div>
<div class="sec"><div class="sec-h">${icon('refresh', 20)}<h2>Data age</h2></div>${freshnessTable(m.fresh, true)}</div>
<div class="sec"><div class="card"><h2>${icon('book', 18)}Brand memory</h2><p class="mt">Confirmed lessons: <strong>${l.confirmed ?? 0}</strong> &middot; Trial decisions: <strong>${l.trial ?? 0}</strong> &middot; Retired: <strong>${l.retired ?? 0}</strong> &middot; <a href="${esc(nav('/memory', brand))}">Open memory</a></p>
<p class="muted small mt">A trial decision becomes a confirmed lesson only when its measured result is recorded (enforced by the database schema).</p></div></div>
<p class="muted small mt">Page generated ${esc(m.generated)}.</p>`);
}

// ---------------------------------------------------------------- memory
const STATUS_CLS: Record<string, string> = { confirmed: 'ok', trial: 'warn', retired: '' };

export function memoryPage(a: { learnings: Learning[]; brief: string; result: BriefResult | null; error?: string; notice?: string; brand: BrandId | 'all' }): string {
  const bq = a.brand === 'all' ? '' : `<input type="hidden" name="brand" value="${a.brand}">`;
  const rows = a.learnings.map((l) => `<tr><td><b>${esc(l.id)}</b> ${l.is_synthetic ? DEMO : ''}</td><td><span class="tagc ${STATUS_CLS[l.status]}">${l.status}</span></td>
<td>${esc(l.topic ?? '')}<div class="cs">${esc(l.channel ?? '')}</div></td><td style="min-width:260px">${esc(l.lesson)}</td><td>${esc(l.source)}<div class="cs">${esc(l.source_ref ?? '')}</div></td><td>${esc(l.date)}</td><td>${esc(l.approver)}</td>
<td style="min-width:160px">${l.outcome ? esc(l.outcome) : '<span class="muted">none yet</span>'}</td>
<td>${l.status === 'trial' && l.session_hash ? `<form method="post" action="/memory/confirm">${bq}<input type="hidden" name="id" value="${esc(l.id)}"><input type="text" name="outcome" placeholder="Measured result (required)" required minlength="5" maxlength="1000" style="width:190px"><br><input type="text" name="approver" placeholder="Confirmed by" required maxlength="80" style="width:190px;margin-top:4px"><br><button class="btn sm" type="submit" style="margin-top:4px">Confirm with outcome</button></form>` : ''}</td></tr>`).join('');
  const r = a.result;
  const short = (t: string) => (t.length > 140 ? t.slice(0, 137) + '...' : t);
  const result = r ? `<div class="sec"><div class="sec-h">${icon('check', 20)}<h2>Brief check result</h2></div>
<p class="muted small">Scanned ${r.scanned} lines against ${r.confirmedCount} confirmed lessons and ${r.trialCount} trial decisions; ${r.ignored.length} ignored (${r.ignored.map((i) => `${esc(i.learning.id)}: ${esc(i.why)}`).join('; ') || 'none'}). Only confirmed lessons raise flags.</p>
${r.flags.map((h) => `<div class="hit"><b>Flag</b> brief line ${h.line}: "${esc(short(h.text))}"<br>Matches confirmed lesson <b>${esc(h.learning.id)}</b> (${esc(h.learning.date)}, ${esc(h.learning.source)}; ${esc(h.learning.channel ?? '')}, ${esc(h.learning.topic ?? '')})<br>Lesson: ${esc(h.learning.lesson)}<br><span class="muted">Earlier decision: ${esc(h.learning.decision_taken ?? 'n/a')} (approved by ${esc(h.learning.approver)})</span></div>`).join('') || '<p class="mt">No confirmed lesson matched any line.</p>'}
${r.trial.map((h) => `<div class="hit try"><b>Trial, not verified</b> brief line ${h.line}: "${esc(short(h.text))}" touches trial decision ${esc(h.learning.id)}. Not a confirmed lesson; shown for reference only.</div>`).join('')}
${r.negated.map((h) => `<div class="hit neg"><b>Skipped</b> brief line ${h.line}: "${esc(short(h.text))}" (matched ${esc(h.learning.id)} but sits behind a negation, so the line says not to do it)</div>`).join('')}
<p class="muted small mt">${r.flags.length} flag(s). No flag does not mean no risk: the reviewer still reads the brief.</p></div>` : '';
  const sel = a.brand === 'all' ? '' : `&brand=${a.brand}`;
  return layout(shellOf('Brand memory', 'Memory', 'memory', '/memory', a.brand), `
<section class="hero-card"><h1><span class="ic-b">${icon('book', 17)}</span>Brand memory · ${esc(a.brand === 'all' ? 'All brands' : brandById(a.brand)!.name)}</h1>
<p class="lead">Decisions become lessons in two steps: approved as a <b>trial</b>, then <b>confirmed</b> only with a recorded outcome. New briefs are checked against confirmed lessons; trial and retired entries never raise a flag. Entries tagged ${DEMO} are fictional lessons visible to everyone; entries you add are private to your browser session.</p>
<div class="seg" style="margin-top:12px" aria-label="Brand">${['all', ...BRANDS.map((b) => b.id)].map((id) => `<a class="${a.brand === id ? 'on' : ''}" href="/memory${id === 'all' ? '' : '?brand=' + id}">${id === 'all' ? 'All brands' : brandById(id)!.name}</a>`).join('')}</div></section>
${a.error ? `<div class="notice err">${esc(a.error)}</div>` : ''}${a.notice ? `<div class="notice">${esc(a.notice)}</div>` : ''}
<div class="card flush"><div class="tw"><table><thead><tr><th>ID</th><th>Status</th><th>Topic</th><th>Lesson / decision</th><th>Source</th><th>Date</th><th>Approver</th><th>Outcome</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></div>
<div class="g2 mt" id="check">
<div class="card"><h2>Check a brief</h2><form class="stack-f mt" method="post" action="/memory/check">${bq}<textarea name="brief" rows="11" maxlength="8000" required placeholder="Paste brief text">${esc(a.brief)}</textarea>
<p class="mt"><button class="btn" type="submit">Check brief</button> <a class="btn sec" href="/memory?sample=1${sel}#check">Load sample brief</a></p></form></div>
<div class="card"><h2>Approve a decision as a trial</h2><form class="stack-f mt" method="post" action="/memory/approve">${bq}
<p><label class="fld">Decision / lesson<textarea name="lesson" rows="3" required minlength="10" maxlength="1000"></textarea></label></p>
<p><label class="fld">Keywords that would signal it in a brief (comma separated, plain phrases)<input type="text" name="keywords" maxlength="300"></label></p>
<p class="frow"><input type="text" name="topic" placeholder="Topic" maxlength="80"><input type="text" name="channel" placeholder="Channel" maxlength="40"><input type="text" name="source" placeholder="Source campaign" maxlength="120"></p>
<p class="frow"><input type="text" name="approver" placeholder="Approved by (required)" required maxlength="80"><button class="btn" type="submit">Approve as trial</button></p></form></div></div>
${result}`);
}

// ---------------------------------------------------------------- connect
export interface AcctConn { id: string; provider: string; display_name: string | null; status: string; accounts: Array<{ id: string; kind: string; external_id: string; name: string | null; currency: string | null; selected: number }> }

export function accountsPage(conns: AcctConn[], setup: Setup, notice?: string): string {
  const body = conns.map((c) => `<div class="card mt"><h2>${c.provider === 'meta' ? 'Meta' : 'TikTok'}${c.display_name ? ' - ' + esc(c.display_name) : ''} <span class="tagc ok">${esc(c.status)}</span></h2>
<form method="post" action="/accounts/${esc(c.id)}"><div class="tw mt"><table><thead><tr><th>Include in pull</th><th>Type</th><th>Name</th><th>ID</th><th>Currency</th></tr></thead><tbody>
${c.accounts.map((a) => `<tr><td>${a.kind === 'page' ? '<span class="muted">listed only</span>' : `<input type="checkbox" name="sel" value="${esc(a.id)}"${a.selected ? ' checked' : ''}>`}</td><td>${esc(a.kind.replace('_', ' '))}</td><td>${esc(a.name ?? '(unnamed)')}</td><td class="muted">${esc(a.external_id)}</td><td>${esc(a.currency ?? '')}</td></tr>`).join('') || '<tr><td colspan="5">No accounts were returned for this login.</td></tr>'}</tbody></table></div>
<p class="mt"><button class="btn" type="submit">Save selection</button> <a class="btn sec" href="/dashboard?data=mine">Open dashboard</a></p></form></div>`).join('');
  return layout(shellOf('Connect', 'Connect', 'accounts', '/accounts', 'all'), `
<section class="hero-card"><h1><span class="ic-b">${icon('link', 17)}</span>Connect accounts</h1><p class="lead">Sign in with your own Meta and TikTok accounts. The hub keeps access tokens on the server, lists the pages and ad accounts you can see, and pulls daily campaign metrics into the same views as the demo.</p>
<p class="mt"><a class="btn" href="/auth/meta/start">Connect Meta</a> <a class="btn sec" href="/auth/tiktok/start">Connect TikTok</a></p>
<p class="small muted mt">Setup · Meta ${setup.metaReady ? 'ready' : 'waiting for the operator to set the app secret'} · TikTok ${setup.ttReady ? 'ready' : 'waiting for the operator to set the encryption key'} · read-only scopes</p></section>
${notice ? `<div class="notice">${esc(notice)}</div>` : ''}
${body || '<div class="card">No connections yet. Connect Meta or TikTok above.</div>'}
<div class="card mt"><h2>Good to know</h2><ul class="mt small" style="padding-left:18px;display:grid;gap:6px"><li><b>Meta:</b> the hub's app is in development mode and has not passed App Review. Only people with a role on the app can sign in, and only to accounts they already have access to.</li>
<li><b>TikTok:</b> connects through TikTok's official Ads MCP server with OAuth 2.0 and PKCE. Use from a self-built client is not confirmed with TikTok.</li>
<li><b>Data age:</b> platform numbers arrive late and can be restated. Every source shows its last refresh and newest day of data; refresh runs hourly.</li>
<li><b>Pages:</b> listed so you can see what the login grants; page insights are not pulled in this version.</li></ul></div>`);
}
