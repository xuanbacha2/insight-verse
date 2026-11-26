// Shared view state (brand, timeline, filters), URL building, number formats and filter bar.
import { matchesCode, type Campaign } from './campaigns';
import { ACCOUNTS, BRANDS, campaignBrand, parseBrand, SYNTH_ANCHOR, SYNTH_START, type BrandId } from './synth';
import { PRESETS, PRESET_LABEL, resolveRange, type Range } from './timeline';
import { esc, icon } from './ui';

export interface View {
  brand: BrandId | 'all'; range: Range; q: string; type: 'all' | 'ABO' | 'CBO'; acct: string; platform: 'all' | 'meta' | 'tiktok'; ask: string | null;
}
export function parseView(sp: URLSearchParams): View {
  const type = sp.get('type'), pf = sp.get('pf'), acct = sp.get('acct') ?? '';
  return {
    brand: parseBrand(sp.get('brand')),
    range: resolveRange({ range: sp.get('range'), from: sp.get('from'), to: sp.get('to') }, SYNTH_ANCHOR, SYNTH_START),
    q: (sp.get('q') ?? '').slice(0, 80),
    type: type === 'ABO' || type === 'CBO' ? type : 'all',
    acct: ACCOUNTS.some((a) => a.id === acct) ? acct : '',
    platform: pf === 'meta' || pf === 'tiktok' ? pf : 'all',
    ask: sp.get('ask'),
  };
}

/** Query string for the view, with overrides (null removes a key). Default values are omitted to keep URLs short. */
export function viewUrl(base: string, v: View, over: Record<string, string | null> = {}, hash = ''): string {
  const p = new URLSearchParams();
  const set = (k: string, val: string | null | undefined) => { if (val) p.set(k, val); };
  set('range', v.range.preset === '7d' ? null : v.range.preset);
  if (v.range.preset === 'custom') { p.set('from', v.range.from); p.set('to', v.range.to); }
  set('brand', v.brand === 'all' ? null : v.brand);
  set('q', v.q); set('type', v.type === 'all' ? null : v.type); set('acct', v.acct); set('pf', v.platform === 'all' ? null : v.platform);
  for (const [k, val] of Object.entries(over)) { if (val === null) p.delete(k); else p.set(k, val); }
  if ('range' in over && over.range !== 'custom') { p.delete('from'); p.delete('to'); }
  if (p.get('range') === '7d') p.delete('range');
  const qs = p.toString();
  return base + (qs ? '?' + qs : '') + hash;
}

export function filterCampaigns(cs: Campaign[], v: View): Campaign[] {
  return cs.filter((c) => (v.brand === 'all' || campaignBrand(c) === v.brand) && matchesCode(c.name, v.q) && (v.type === 'all' || c.budget_type === v.type)
    && (!v.acct || c.account_id === v.acct) && (v.platform === 'all' || c.platform === v.platform));
}

export const n0 = (x: number | null | undefined) => (x === null || x === undefined || Number.isNaN(x) ? '-' : Math.round(x).toLocaleString('en-US'));
export const p1 = (x: number | null | undefined) => (x === null || x === undefined ? '-' : (x * 100).toFixed(1) + '%');
export const p2 = (x: number | null | undefined) => (x === null || x === undefined ? '-' : (x * 100).toFixed(2) + '%');
export const mil = (x: number) => (x >= 1e9 ? (x / 1e9).toFixed(2) + 'B' : x >= 1e6 ? (x / 1e6).toFixed(1) + 'M' : n0(x));
export const mult = (x: number | null) => (x === null ? '-' : x.toFixed(2) + 'x');

export const brandTag = (id: BrandId) => { const b = BRANDS.find((x) => x.id === id)!; return `<span class="tagc ${id === 'x' ? 'blue' : id === 'y' ? 'ok' : 'violet'}">${esc(b.name)}</span>`; };

export interface BarOpts { type?: boolean; acct?: boolean; platform?: boolean; code?: boolean }
/** Timeline presets, brand switch and (optionally) ABO/CBO, account, platform and campaign-code filters. */
export function filterBar(base: string, v: View, o: BarOpts = {}): string {
  const r = v.range;
  const presets = PRESETS.map((k) => `<a class="${r.preset === k ? 'on' : ''}" href="${esc(viewUrl(base, v, { range: k }))}">${PRESET_LABEL[k]}</a>`).join('');
  const custom = `<div class="cust"><details${r.preset === 'custom' ? '' : ''}><summary class="${r.preset === 'custom' ? 'on' : ''}">Custom</summary>
<form class="box" method="get" action="${base}"><input type="hidden" name="range" value="custom">${hidden(v, ['range', 'from', 'to'])}
<label class="fld">From<input type="date" name="from" value="${esc(r.from)}" min="${SYNTH_START}" max="${SYNTH_ANCHOR}"></label>
<label class="fld">To<input type="date" name="to" value="${esc(r.to)}" min="${SYNTH_START}" max="${SYNTH_ANCHOR}"></label><button class="btn sm" type="submit">Apply</button></form></details></div>`;
  const brands = ['all', ...BRANDS.map((b) => b.id)].map((id) => `<a class="${v.brand === id ? 'on' : ''}" href="${esc(viewUrl(base, v, { brand: id === 'all' ? null : id, acct: null }))}">${id === 'all' ? 'All brands' : BRANDS.find((b) => b.id === id)!.name}</a>`).join('');
  const types = o.type ? `<div class="seg" aria-label="Budget type">${(['all', 'ABO', 'CBO'] as const).map((t) => `<a class="${v.type === t ? 'on' : ''}" href="${esc(viewUrl(base, v, { type: t === 'all' ? null : t }))}">${t === 'all' ? 'ABO + CBO' : t}</a>`).join('')}</div>` : '';
  const pf = o.platform ? `<div class="seg" aria-label="Platform">${(['all', 'meta', 'tiktok'] as const).map((t) => `<a class="${v.platform === t ? 'on' : ''}" href="${esc(viewUrl(base, v, { pf: t === 'all' ? null : t }))}">${t === 'all' ? 'Meta + TikTok' : t === 'meta' ? 'Meta' : 'TikTok'}</a>`).join('')}</div>` : '';
  const accts = ACCOUNTS.filter((a) => v.brand === 'all' || a.brand === v.brand);
  const form = `<form class="frow" method="get" action="${base}">${hidden(v, ['q', 'acct'])}
${o.acct ? `<select name="acct" aria-label="Ad account"><option value="">All ad accounts (${accts.length})</option>${accts.map((a) => `<option value="${a.id}"${v.acct === a.id ? ' selected' : ''}>${esc(a.name)}</option>`).join('')}</select>` : ''}
${o.code === false ? '' : `<input class="grow" type="search" name="q" value="${esc(v.q)}" placeholder="Campaign code contains (e.g. LAUNCH, CHAT)" maxlength="80" aria-label="Campaign code filter">`}
<button class="btn sm" type="submit">${icon('filter', 14)}<span>Apply</span></button>${v.q || v.acct ? `<a class="btn sm sec" href="${esc(viewUrl(base, v, { q: null, acct: null }))}">Clear</a>` : ''}</form>`;
  return `<div class="card fbar" role="group" aria-label="Filters"><div class="frow"><div class="seg" aria-label="Timeline">${presets}${custom}</div><div class="seg" aria-label="Brand">${brands}</div>${types}${pf}</div>${form}
<p class="small muted">${esc(r.label)} · ${r.days} day${r.days > 1 ? 's' : ''} · demo today ${SYNTH_ANCHOR}</p></div>`;
}
/** Hidden inputs carrying the current view, except the named keys. */
function hidden(v: View, skip: string[]): string {
  const f: Record<string, string> = { range: v.range.preset === '7d' ? '' : v.range.preset, from: v.range.preset === 'custom' ? v.range.from : '', to: v.range.preset === 'custom' ? v.range.to : '',
    brand: v.brand === 'all' ? '' : v.brand, q: v.q, type: v.type === 'all' ? '' : v.type, acct: v.acct, pf: v.platform === 'all' ? '' : v.platform };
  return Object.entries(f).filter(([k, val]) => val && !skip.includes(k)).map(([k, val]) => `<input type="hidden" name="${k}" value="${esc(val)}">`).join('');
}

export function kpi(label: string, value: string, sub = '', ic = '', cls = ''): string {
  return `<div class="kpi ${cls}"><div class="k">${esc(label)}</div>${ic ? `<span class="bub">${ic}</span>` : ''}<div class="v">${value}</div><div class="s">${sub}</div></div>`;
}
export const pageShell = (title: string, group: string, page: string, path: string, brand: BrandId | 'all') => ({ title, group, page, path, brand });
