// Visual system shared by every page: a light workspace shell (sidebar, sticky top bar, cards, tables, segmented filters).
// Tokens use the --umh-* prefix. Icons are inline stroke SVGs in the Lucide style (ISC licence). No external images.
import { BRANDS, type BrandId } from './synth';

export const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export const FONTS = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';

const P: Record<string, string> = {
  home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  dash: '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
  box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  spark: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>',
  book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  down: '<path d="m6 9 6 6 6-6"/>', right: '<path d="m9 18 6-6-6-6"/>', left: '<path d="m15 18-6-6 6-6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  trend: '<path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/>',
  wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
  cal: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  mega: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
  grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
};
export const icon = (n: string, size = 18, cls = 'ic') => `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] ?? ''}</svg>`;

// ---------------------------------------------------------------- shell
export interface Shell { title: string; group: string; page: string; path: string; brand: BrandId | 'all'; keep?: Record<string, string> }

const brandQs = (b: BrandId | 'all') => (b === 'all' ? '' : `?brand=${b}`);
/** Link to another section, keeping the selected brand. */
export const nav = (path: string, b: BrandId | 'all') => path + brandQs(b);

interface Item { label: string; path: string; id: string; badge?: string }
interface Group { id: string; label: string; ic: string; items: Item[] }
const GROUPS: Group[] = [
  { id: 'dash', label: 'Dashboard', ic: 'dash', items: [{ label: 'Overview', path: '/overview', id: 'overview' }, { label: 'UNIFY weekly', path: '/dashboard', id: 'dashboard' }] },
  { id: 'assets', label: 'Assets', ic: 'box', items: [{ label: 'Campaigns', path: '/campaigns', id: 'campaigns' }, { label: 'Ad accounts', path: '/overview#accounts', id: 'accounts-list' }] },
  { id: 'aud', label: 'Audience', ic: 'users', items: [{ label: 'Demographic × Placement', path: '/audience', id: 'audience' }, { label: 'Generated insights', path: '/audience#insights', id: 'insights' }] },
  { id: 'mem', label: 'Memory', ic: 'book', items: [{ label: 'Brand memory', path: '/memory', id: 'memory' }, { label: 'Check a brief', path: '/memory#check', id: 'check' }] },
];

function brandSwitcher(b: BrandId | 'all', path: string): string {
  const cur = b === 'all' ? { name: 'All brands', sub: '3 brands · 8 ad accounts', letter: 'A' } : (() => { const x = BRANDS.find((q) => q.id === b)!; return { name: x.name, sub: `${x.vertical} · ${x.result.toLowerCase()}`, letter: x.code[1] }; })();
  const base = path.split('#')[0];
  const opt = (id: string, name: string, sub: string, letter: string) =>
    `<a class="ws-opt${id === b ? ' on' : ''}" href="${esc(id === 'all' ? base : `${base}?brand=${id}`)}"><span class="ws-av sm l-${id}">${letter}</span><span><b>${esc(name)}</b><small>${esc(sub)}</small></span></a>`;
  return `<details class="ws"><summary class="ws-btn" aria-label="Switch brand"><span class="ws-av l-${b}">${cur.letter}</span><span class="ws-info"><span class="ws-label">Brand</span><span class="ws-name">${esc(cur.name)}</span></span>${icon('down', 15, 'ic ws-chev')}</summary>
<div class="ws-menu">${opt('all', 'All brands', '3 brands · 8 ad accounts', 'A')}${BRANDS.map((x) => opt(x.id, x.name, `${x.vertical} · ${x.result.toLowerCase()}`, x.code[1])).join('')}</div></details>`;
}

export function layout(s: Shell, body: string): string {
  const b = s.brand;
  const active = s.page;
  const groups = GROUPS.map((g) => {
    const open = g.items.some((i) => i.id === active) || (active === 'home' && (g.id === 'dash' || g.id === 'aud'));
    return `<details class="grp"${open ? ' open' : ''}><summary class="item${open ? ' on' : ''}">${icon(g.ic, 18, 'nav-ic')}<span class="lbl">${g.label}</span>${icon('down', 14, 'chev')}</summary><div class="sub">${
      g.items.map((i) => `<a class="sub-item${i.id === active ? ' on' : ''}" href="${esc(nav(i.path.split('#')[0], b) + (i.path.includes('#') ? '#' + i.path.split('#')[1] : ''))}">${esc(i.label)}</a>`).join('')}</div></details>`;
  }).join('');
  const top = (id: string, label: string, ic: string, path: string) => `<a class="item${active === id ? ' on' : ''}" href="${esc(nav(path, b))}"${active === id ? ' aria-current="page"' : ''}>${icon(ic, 18, 'nav-ic')}<span class="lbl">${label}</span></a>`;
  const bn = (id: string, label: string, ic: string, path: string) => `<a class="${active === id ? 'on' : ''}" href="${esc(nav(path, b))}">${icon(ic, 20)}<span>${label}</span></a>`;
  const bq = b === 'all' ? '' : `<input type="hidden" name="brand" value="${b}">`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#315ef5"><title>${esc(s.title)} - Unified Media Hub</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${FONTS}">
<link rel="stylesheet" href="/assets/hub.css"><script src="/assets/hub.js" defer></script></head><body>
<div class="app" id="app">
<aside class="sb" id="sb" aria-label="Main navigation">
<div class="sb-brand"><a class="brand" href="${esc(nav('/', b))}" aria-label="Unified Media Hub home"><span class="logo" aria-hidden="true">UM</span><span class="brand-txt"><span class="brand-name">Unified Media Hub</span><span class="brand-sub">Meta + TikTok · one login</span></span></a></div>
<div class="sb-tog"><button type="button" class="tog" id="sbTog" aria-label="Collapse or expand the menu">${icon('left', 16)}</button></div>
${brandSwitcher(b, s.path)}
<nav class="sb-nav" id="sbNav">${top('home', 'Home', 'home', '/')}${groups}${top('brain', 'Ask the brain', 'spark', '/brain')}${top('accounts', 'Connect', 'link', '/accounts')}</nav>
<div class="sb-foot"><div class="quota"><div class="q-top"><span class="q-tile">${icon('layers', 16, 'ic')}</span><span class="q-plan">Workspace</span><span class="q-pill">Demo data</span></div>
<div class="q-row"><div class="q-meta"><span>Brands</span><span>3 / 3</span></div><div class="q-bar"><i class="q-full"></i></div></div>
<div class="q-row"><div class="q-meta"><span>Ad accounts</span><span>8 / 50</span></div><div class="q-bar"><i style="width:16%"></i></div></div></div>
<a class="btn full" href="/accounts">${icon('link', 16)}<span>Connect accounts</span></a></div>
</aside>
<div class="scrim" id="scrim"></div>
<div class="mc">
<header class="tb"><div class="tb-l"><button type="button" class="tb-menu" id="tbMenu" aria-label="Open menu">${icon('menu', 18)}</button>${icon('zap', 20, 'ic bolt')}<div class="crumb"><span>${esc(s.group)}</span><em>${esc(s.page === 'home' ? 'Overview' : s.title)}</em></div></div>
<div class="tb-r"><form class="tb-search" method="get" action="/campaigns" role="search">${bq}${icon('search', 15)}<input type="search" name="q" placeholder="Search campaign code" maxlength="80" aria-label="Search campaign code"></form>
<span class="live"><i></i>Demo data</span>
<a class="tb-btn" href="" title="Reload the page">${icon('refresh', 16)}<span>Refresh</span></a>
<details class="pop"><summary class="tb-btn ico" aria-label="Alerts">${icon('bell', 18)}<b class="badge">2</b></summary><div class="pop-box"><div class="pop-head">Needs attention</div>
<a class="pop-item" href="${esc(nav('/overview', b))}#accounts"><span class="dot warn"></span><div><b>Brand Y · Meta Summer</b><small>Balance due is over the billing threshold</small></div></a>
<a class="pop-item" href="${esc(nav('/overview', b))}#accounts"><span class="dot warn"></span><div><b>Brand X · TikTok</b><small>Spend is close to the account cap</small></div></a></div></details>
<span class="user"><span class="av">DV</span><span class="u-meta"><b>Demo viewer</b><small>Read only</small></span></span></div></header>
<main class="content" id="main">${body}</main>
</div></div>
<nav class="bnav" aria-label="Quick navigation">${bn('home', 'Home', 'home', '/')}${bn('campaigns', 'Campaigns', 'mega', '/campaigns')}${bn('audience', 'Audience', 'users', '/audience')}${bn('memory', 'Memory', 'book', '/memory')}${bn('brain', 'Brain', 'spark', '/brain')}</nav>
</body></html>`;
}

export const HUB_JS = `(()=>{
var d=document,r=d.documentElement;
try{if(localStorage.getItem('umh-sb')==='1')r.classList.add('sb-collapsed')}catch(e){}
function on(id,ev,fn){var e=d.getElementById(id);if(e)e.addEventListener(ev,fn)}
on('sbTog','click',function(){var c=r.classList.toggle('sb-collapsed');try{localStorage.setItem('umh-sb',c?'1':'0')}catch(e){}});
on('tbMenu','click',function(){r.classList.add('sb-open')});
on('scrim','click',function(){r.classList.remove('sb-open')});
d.addEventListener('click',function(e){
  [].slice.call(d.querySelectorAll('details.pop[open],details.ws[open]')).forEach(function(p){if(!p.contains(e.target))p.removeAttribute('open')});
  var a=e.target.closest&&e.target.closest('.sb a');if(a)r.classList.remove('sb-open');
  var h=e.target.closest&&e.target.closest('[data-heat]');
  if(h){var t=d.getElementById(h.getAttribute('data-heat'));if(t){t.setAttribute('data-m',h.getAttribute('data-m'));[].slice.call(h.parentNode.children).forEach(function(c){c.classList.toggle('on',c===h)})}}
  var tg=e.target.closest&&e.target.closest('[data-tab]');
  if(tg){var box=tg.closest('[data-tabs]');if(box){[].slice.call(box.querySelectorAll('[data-tab]')).forEach(function(c){c.classList.toggle('on',c===tg)});[].slice.call(box.querySelectorAll('[data-pane]')).forEach(function(p){p.hidden=p.getAttribute('data-pane')!==tg.getAttribute('data-tab')})}}
});
d.addEventListener('keydown',function(e){if(e.key==='Escape'){r.classList.remove('sb-open');[].slice.call(d.querySelectorAll('details[open].pop,details[open].ws')).forEach(function(p){p.removeAttribute('open')})}});
var ans=d.querySelector('[data-type]');
if(ans&&!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)){var full=ans.textContent;ans.textContent='';var i=0;(function tick(){i+=3;ans.textContent=full.slice(0,i);if(i<full.length)setTimeout(tick,14);else ans.textContent=full})()}
})();`;

export const CSS = `
:root{--umh-blue-50:#eef3ff;--umh-blue-100:#dde7ff;--umh-blue-200:#c2d3ff;--umh-blue-400:#6d94ff;--umh-blue-500:#397bff;--umh-blue-600:#315ef5;--umh-blue-700:#2946d3;--umh-blue-900:#1d2f80;
--umh-violet-500:#5753f5;--umh-green-50:#e9faf1;--umh-green-500:#12b76a;--umh-green-700:#077a45;--umh-amber-50:#fff6e6;--umh-amber-500:#f79009;--umh-amber-700:#a95d05;--umh-red-50:#fdeced;--umh-red-500:#ef4a55;--umh-red-600:#d92d3a;
--umh-n0:#fff;--umh-n25:#fcfcfd;--umh-n50:#f7f8fa;--umh-n100:#f0f2f5;--umh-n200:#e3e7ed;--umh-n300:#d2d8e1;--umh-n400:#98a2b3;--umh-n500:#667085;--umh-n600:#475467;--umh-n700:#344054;--umh-n900:#101828;
--bg:var(--umh-n50);--surface:#fff;--border:var(--umh-n200);--ink:var(--umh-n900);--muted:var(--umh-n500);--primary:var(--umh-blue-600);--primary-soft:var(--umh-blue-50);
--radius:14px;--shadow:0 1px 3px rgba(16,24,40,.05),0 1px 2px rgba(16,24,40,.03);--sbw:264px;
--c1:#315ef5;--c2:#12b76a;--c3:#f79009;--c4:#5753f5}
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-text-size-adjust:100%;background:var(--bg)}
body{font-family:'Inter','Segoe UI',system-ui,-apple-system,Roboto,sans-serif;font-variant-numeric:tabular-nums;background:var(--bg);color:var(--ink);font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased;min-height:100vh;overflow-x:hidden}
a{color:var(--primary);text-decoration:none}a:hover{text-decoration:underline}
button,input,select,textarea{font:inherit;color:inherit}
:focus-visible{outline:2px solid var(--umh-blue-500);outline-offset:2px;border-radius:6px}
.app{display:flex;min-height:100vh}
.mc{flex:1;min-width:0;display:flex;flex-direction:column}
/* sidebar */
.sb{width:var(--sbw);flex:none;background:#fff;border-right:1px solid var(--border);display:flex;flex-direction:column;position:sticky;top:0;height:100vh;z-index:80;overflow:hidden}
.sb-brand{height:64px;display:flex;align-items:center;padding:0 14px;border-bottom:1px solid var(--border);flex:none}
.brand{display:flex;align-items:center;gap:10px;color:var(--ink);text-decoration:none!important;min-width:0}
.logo{width:36px;height:36px;border-radius:10px;background:linear-gradient(180deg,#2966ff 0%,#487bff 45%,#84a4ff 100%);color:#fff;font-weight:800;font-size:14px;display:grid;place-items:center;box-shadow:0 4px 12px rgba(49,94,245,.28);flex:none}
.brand-txt{display:flex;flex-direction:column;line-height:1.15;min-width:0}.brand-name{font-weight:700;font-size:15px;white-space:nowrap}.brand-sub{font-size:11px;font-weight:600;color:var(--primary);white-space:nowrap}
.sb-tog{display:flex;justify-content:flex-end;padding:8px 12px 0;flex:none}
.tog{width:32px;height:32px;border:1px solid var(--border);background:#fff;border-radius:9px;display:grid;place-items:center;cursor:pointer;color:var(--umh-n600)}.tog:hover{background:var(--umh-n50)}
.ws{position:relative;margin:8px 12px 6px;flex:none}
.ws summary{list-style:none;cursor:pointer}.ws summary::-webkit-details-marker{display:none}
.ws-btn{display:flex;align-items:center;gap:10px;width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:12px;background:#fff;box-shadow:var(--shadow)}
.ws-av{width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,#2966ff,#6d94ff);color:#fff;font-weight:700;font-size:13px;display:grid;place-items:center;flex:none}
.ws-av.sm{width:26px;height:26px;font-size:11px}.l-x{background:linear-gradient(135deg,#2966ff,#6d94ff)}.l-y{background:linear-gradient(135deg,#0d9b59,#12b76a)}.l-z{background:linear-gradient(135deg,#5753f5,#3f3ac4)}.l-all{background:linear-gradient(135deg,#344054,#667085)}
.ws-info{display:flex;flex-direction:column;line-height:1.2;min-width:0;flex:1}.ws-label{font-size:11px;color:var(--muted)}.ws-name{font-weight:600;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ws-chev{color:var(--muted);flex:none}
.ws-menu{position:absolute;left:0;right:0;top:calc(100% + 6px);background:#fff;border:1px solid var(--border);border-radius:12px;box-shadow:0 12px 32px rgba(16,24,40,.14);padding:6px;z-index:90}
.ws-opt{display:flex;align-items:center;gap:10px;padding:8px;border-radius:9px;color:var(--ink);text-decoration:none!important}.ws-opt:hover,.ws-opt.on{background:var(--primary-soft)}
.ws-opt b{display:block;font-size:13px;font-weight:600}.ws-opt small{display:block;font-size:11px;color:var(--muted)}
.sb-nav{flex:1;overflow-y:auto;padding:8px 12px;display:flex;flex-direction:column;gap:2px;min-height:0}
.item{display:flex;align-items:center;gap:10px;height:40px;padding:0 12px;border-radius:10px;color:var(--umh-n700);font-weight:500;font-size:14px;cursor:pointer;text-decoration:none!important;list-style:none;width:100%}
.item::-webkit-details-marker{display:none}.item:hover{background:var(--umh-n50)}
.item.on{background:var(--primary-soft);color:var(--primary);font-weight:600}
.nav-ic{flex:none;color:var(--umh-n500)}.item.on .nav-ic{color:var(--primary)}
.lbl{flex:1;white-space:nowrap}.chev{color:var(--umh-n400);transition:transform .15s}details[open]>summary .chev{transform:rotate(180deg)}
.sub{display:flex;flex-direction:column;gap:2px;margin:2px 0 6px 21px;padding-left:12px;border-left:1px solid var(--umh-n200)}
.sub-item{display:block;padding:8px 12px;border-radius:9px;color:var(--umh-n600);font-size:13.5px;text-decoration:none!important}.sub-item:hover{background:var(--umh-n50)}.sub-item.on{background:var(--primary-soft);color:var(--primary);font-weight:600}
.sb-foot{padding:10px 12px 14px;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:10px;flex:none}
.quota{border:1px solid var(--umh-blue-100);background:linear-gradient(180deg,var(--umh-blue-50),#fff);border-radius:12px;padding:10px 12px}
.q-top{display:flex;align-items:center;gap:8px;margin-bottom:8px}.q-tile{width:26px;height:26px;border-radius:8px;background:#fff;border:1px solid var(--umh-blue-100);color:var(--primary);display:grid;place-items:center}
.q-plan{font-weight:700;font-size:13px}.q-pill{margin-left:auto;font-size:10.5px;font-weight:700;color:#fff;background:var(--primary);padding:2px 8px;border-radius:999px}
.q-row+.q-row{margin-top:7px}.q-meta{display:flex;justify-content:space-between;font-size:12px;color:var(--umh-n700);margin-bottom:3px}
.q-bar{height:5px;border-radius:3px;background:var(--umh-blue-100);overflow:hidden}.q-bar i.q-full{width:calc(99.99%)}.q-bar i{display:block;height:100%;background:var(--primary);border-radius:3px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:38px;padding:0 16px;border-radius:10px;border:1px solid var(--primary);background:linear-gradient(180deg,#3d6bff,#315ef5);color:#fff!important;font-weight:600;font-size:13.5px;cursor:pointer;text-decoration:none!important;white-space:nowrap;box-shadow:0 2px 6px rgba(49,94,245,.25)}
.btn:hover{filter:brightness(1.05)}.btn.full{width:100%;height:42px}
.btn.sec{background:#fff;color:var(--primary)!important;border-color:var(--umh-blue-200);box-shadow:none}.btn.sec:hover{background:var(--primary-soft)}.btn.sm{height:32px;padding:0 12px;font-size:12.5px}
.scrim{display:none}
/* top bar */
.tb{height:64px;position:sticky;top:0;z-index:70;background:rgba(255,255,255,.94);backdrop-filter:blur(8px);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 20px}
.tb-l{display:flex;align-items:center;gap:12px;min-width:0}.bolt{color:var(--primary);flex:none}
.crumb{display:flex;gap:8px;align-items:baseline;font-weight:700;font-size:16px;white-space:nowrap}.crumb em{font-style:italic;font-weight:600;color:var(--primary)}
.tb-menu{display:none;width:40px;height:40px;border:1px solid var(--border);background:#fff;border-radius:10px;place-items:center;cursor:pointer}
.tb-r{display:flex;align-items:center;gap:8px;min-width:0}
.tb-search{display:flex;align-items:center;gap:8px;height:38px;padding:0 12px;border:1px solid var(--border);border-radius:10px;background:var(--umh-n50);color:var(--muted)}
.tb-search input{border:0;background:transparent;outline:none;width:150px;font-size:13px}
.live{display:inline-flex;align-items:center;gap:8px;height:34px;padding:0 14px;border-radius:999px;background:var(--umh-green-50);color:var(--umh-green-700);font-weight:600;font-size:13px;border:1px solid #cdf3e0;white-space:nowrap}
.live i{width:8px;height:8px;border-radius:50%;background:var(--umh-green-500)}
.tb-btn{display:inline-flex;align-items:center;gap:7px;height:38px;padding:0 11px;border-radius:10px;border:0;background:transparent;color:var(--umh-n700);font-weight:500;font-size:13.5px;cursor:pointer;text-decoration:none!important;position:relative;list-style:none}
.tb-btn:hover{background:var(--umh-n100)}.tb-btn.ico{padding:0 9px}
details.pop{position:relative}details.pop summary::-webkit-details-marker{display:none}
.badge{position:absolute;top:2px;right:2px;min-width:17px;height:17px;border-radius:9px;background:var(--umh-red-500);color:#fff;font-size:10.5px;font-weight:700;display:grid;place-items:center;padding:0 4px}
.pop-box{position:absolute;right:0;top:calc(100% + 8px);width:300px;background:#fff;border:1px solid var(--border);border-radius:12px;box-shadow:0 12px 32px rgba(16,24,40,.14);padding:6px;z-index:90}
.pop-head{padding:8px 10px;font-weight:700;font-size:13px}.pop-item{display:flex;gap:10px;align-items:flex-start;padding:9px 10px;border-radius:9px;color:var(--ink);text-decoration:none!important}.pop-item:hover{background:var(--umh-n50)}
.pop-item b{display:block;font-size:13px}.pop-item small{display:block;color:var(--muted);font-size:12px}
.dot{width:9px;height:9px;border-radius:50%;margin-top:6px;flex:none;background:var(--umh-n400)}.dot.warn{background:var(--umh-amber-500)}.dot.ok{background:var(--umh-green-500)}.dot.bad{background:var(--umh-red-500)}
.user{display:flex;align-items:center;gap:9px;height:46px;padding:0 12px 0 8px;border:1px solid var(--border);border-radius:12px;background:#fff}
.av{width:30px;height:30px;border-radius:9px;background:var(--primary-soft);color:var(--primary);font-weight:700;font-size:12px;display:grid;place-items:center;border:1px solid var(--umh-blue-100)}
.u-meta{display:flex;flex-direction:column;line-height:1.15}.u-meta b{font-size:13px}.u-meta small{font-size:11px;color:var(--muted)}
.content{padding:20px 24px 40px;width:100%;max-width:1600px;margin:0 auto;min-width:0}
/* cards and headings */
.card{background:#fff;border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);padding:18px 20px;min-width:0}
.card+.card,.stack>*+*{margin-top:16px}.agrid>.card,.g2>.card,.g21>.card,.g3>.card,.g-side>*{margin-top:0}
.card h2,.sec-h{font-size:16px;font-weight:700;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.card h3{font-size:14.5px;font-weight:700;margin-bottom:6px}
.sec{margin-top:22px}.sec-h{margin-bottom:12px}.sec-h .ic{color:var(--primary)}.sec-h .more{margin-left:auto;font-size:13px;font-weight:500}
.muted,.mut{color:var(--muted)}.small{font-size:12.5px}
.lead{color:var(--umh-n600);font-size:14.5px;max-width:78ch}
.hero-card{position:relative;overflow:hidden;border:1px solid var(--umh-blue-100);border-radius:18px;padding:22px;background:linear-gradient(120deg,#eaf0ff 0%,#dbe6ff 45%,#eef3ff 100%);margin-bottom:18px}
.hero-card::before{content:"";position:absolute;right:-60px;top:-80px;width:340px;height:340px;border-radius:50%;background:radial-gradient(circle,rgba(109,148,255,.35),rgba(109,148,255,0) 65%)}
.hero-card>*{position:relative}
.hero-card h1{font-size:22px;font-weight:700;display:flex;gap:10px;align-items:center;margin-bottom:14px}
.hero-card h1 .ic-b{width:30px;height:30px;border-radius:50%;background:var(--primary);color:#fff;display:grid;place-items:center}
.hero-tag{position:absolute!important;right:18px;top:18px;background:#fff;border:1px solid var(--umh-blue-200);color:var(--primary);font-weight:600;font-size:12.5px;padding:4px 12px;border-radius:999px}
.hero-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,1fr);gap:14px}
.hk{background:#fff;border-radius:14px;padding:16px 18px;box-shadow:var(--shadow);border:1px solid rgba(255,255,255,.7);min-width:0}
.hk.blue{background:linear-gradient(135deg,#2e5bf0,#4a7bff 60%,#6d94ff);color:#fff;border:0;position:relative;overflow:hidden}
.hk.blue::after{content:"";position:absolute;right:-30px;bottom:-40px;width:150px;height:150px;border-radius:50%;background:rgba(255,255,255,.12)}
.hk .k{font-size:13px;color:var(--umh-n600);margin-bottom:6px}.hk.blue .k{color:rgba(255,255,255,.85)}
.hk .big{font-size:34px;font-weight:800;line-height:1.1}.hk .mid{font-size:22px;font-weight:800;line-height:1.2}
.hk .chips{margin-top:12px;display:flex;gap:8px;flex-wrap:wrap}
.hk.blue .tagc{background:rgba(255,255,255,.2);color:#fff;border-color:rgba(255,255,255,.3)}
.sub3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:6px}.sub3 .k{font-size:12px;margin-bottom:2px}.sub3 b{font-size:16px;font-weight:800}
/* kpi cards */
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:14px}
.kpi{background:#fff;border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);padding:16px 18px;position:relative;min-width:0}
.kpi .k{font-size:13.5px;color:var(--primary);font-weight:500;padding-right:44px}
.kpi .v{font-size:26px;font-weight:800;margin:4px 0 8px;line-height:1.15;word-break:break-word}.kpi .v small{font-size:14px;font-weight:600;color:var(--muted)}
.kpi .s{font-size:12.5px;color:var(--muted)}
.kpi .bub{position:absolute;right:14px;top:14px;width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#397bff,#5b8cff);color:#fff;display:grid;place-items:center;box-shadow:0 4px 10px rgba(49,94,245,.25)}
.kpi.warn .v{color:var(--umh-amber-700)}.kpi.good .v{color:var(--umh-green-700)}.kpi.prim .v{color:var(--primary)}
/* tags */
.tagc,.tag{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;border-radius:999px;font-size:12px;font-weight:600;background:var(--umh-n100);color:var(--umh-n700);border:1px solid var(--umh-n200);white-space:nowrap}
.tagc.ok,.tag.ok{background:var(--umh-green-50);color:var(--umh-green-700);border-color:#cdf3e0}.tagc.warn,.tag.warn{background:var(--umh-amber-50);color:var(--umh-amber-700);border-color:#ffe9c2}
.tagc.bad,.tag.bad{background:var(--umh-red-50);color:var(--umh-red-600);border-color:#fbd8da}.tagc.blue,.tag.blue{background:var(--primary-soft);color:var(--primary);border-color:var(--umh-blue-100)}
.tagc.violet{background:#f0efff;color:#3f3ac4;border-color:#e3e1ff}.tagc .d{width:7px;height:7px;border-radius:50%;background:currentColor}
.ok{color:var(--umh-green-700)}.bad{color:var(--umh-red-600)}.warn{color:var(--umh-amber-700)}
/* filters */
.fbar{display:flex;flex-direction:column;gap:12px}
.frow{display:flex;flex-wrap:wrap;gap:10px 12px;align-items:center}
.seg{display:inline-flex;flex-wrap:wrap;gap:2px;padding:4px;border:1px solid var(--border);border-radius:12px;background:var(--umh-n50);max-width:100%}
.seg a,.seg button,.seg summary{display:inline-flex;align-items:center;height:32px;padding:0 13px;border-radius:9px;color:var(--umh-n700);font-weight:500;font-size:13.5px;text-decoration:none!important;border:0;background:transparent;cursor:pointer;list-style:none}
.seg a:hover,.seg button:hover{background:#fff}.seg .on{background:#fff;color:var(--primary);font-weight:600;box-shadow:0 1px 2px rgba(16,24,40,.08)}
.seg summary::-webkit-details-marker{display:none}
.cust{position:relative}.cust>.box{position:absolute;left:0;top:calc(100% + 8px);background:#fff;border:1px solid var(--border);border-radius:12px;box-shadow:0 12px 32px rgba(16,24,40,.14);padding:14px;z-index:60;display:flex;gap:10px;align-items:end;flex-wrap:wrap;width:max-content;max-width:min(92vw,420px)}
.fld{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--muted);font-weight:500}
input[type=text],input[type=search],input[type=date],select,textarea{height:38px;border:1px solid var(--border);border-radius:10px;background:#fff;padding:0 12px;font-size:13.5px;max-width:100%}
textarea{height:auto;padding:10px 12px;width:100%;line-height:1.5}
input:focus,select:focus,textarea:focus{border-color:var(--umh-blue-400);box-shadow:0 0 0 3px rgba(57,123,255,.15);outline:none}
.grow{flex:1;min-width:180px}
/* tables */
.tw{overflow-x:auto;-webkit-overflow-scrolling:touch}
table{width:100%;border-collapse:collapse;font-size:13.5px}
th{background:var(--umh-n50);color:var(--umh-n600);font-size:11.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;text-align:left;padding:12px 14px;white-space:nowrap;border-bottom:1px solid var(--border)}
td{padding:12px 14px;border-bottom:1px solid var(--umh-n100);vertical-align:middle}
tbody tr:hover td{background:var(--umh-n25)}
td.n,th.n{text-align:right;font-variant-numeric:tabular-nums}
.cn{font-weight:600;word-break:break-word;min-width:200px}.cs{font-size:12px;color:var(--muted);font-weight:400;margin-top:2px}
.card.flush{padding:0;overflow:hidden}.card.flush .head{padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.sw{display:inline-block;width:38px;height:22px;border-radius:999px;background:var(--umh-n300);position:relative;vertical-align:middle}.sw::after{content:"";position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25)}
.sw.on{background:var(--primary)}.sw.on::after{left:18px}
details.abo summary{cursor:pointer;list-style:none;font-size:12px;color:var(--primary);font-weight:600;margin-top:3px}details.abo summary::-webkit-details-marker{display:none}
details.abo ul{list-style:none;margin-top:6px;font-size:12px;color:var(--muted)}details.abo li{display:flex;justify-content:space-between;gap:14px;padding:2px 0;border-bottom:1px dashed var(--umh-n200)}
/* account cards */
.agrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,320px),1fr));gap:14px}
.acct .hd{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:12px}.acct .nm{font-weight:700;font-size:15px}.acct .id{font-size:12px;color:var(--muted)}
.acct .big{font-size:26px;font-weight:800;margin:2px 0 10px}
.kv{display:grid;grid-template-columns:1fr 1fr;gap:10px 16px}.kv .k{font-size:12px;color:var(--muted)}.kv .v{font-weight:700;font-size:14px}
.meter{height:7px;border-radius:4px;background:var(--umh-n100);margin:14px 0 6px;overflow:hidden}.meter i{display:block;height:100%;background:var(--primary);border-radius:4px}.meter.hot i{background:var(--umh-amber-500)}
.alert{margin-top:10px;font-size:12.5px;display:flex;gap:6px;align-items:center}
/* layout helpers */
.g2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px}.g3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.g21{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:16px}.g-side{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:16px;align-items:start}
.mt{margin-top:16px}
/* hero banner (home) */
.banner{position:relative;overflow:hidden;border-radius:20px;background:linear-gradient(120deg,#2552ee 0%,#3f6dfa 50%,#6d94ff 100%);color:#fff;padding:34px 36px;min-height:260px;display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:24px;align-items:center;margin-bottom:20px}
.banner::before{content:"";position:absolute;left:-90px;bottom:-140px;width:420px;height:420px;border-radius:50%;background:rgba(255,255,255,.08)}
.banner>*{position:relative}.banner .pill{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(255,255,255,.55);border-radius:999px;padding:6px 14px;font-weight:600;font-size:13px;margin-bottom:14px}
.banner h1{font-size:34px;line-height:1.15;font-weight:800;margin-bottom:10px}.banner p{color:rgba(255,255,255,.92);font-size:15px;max-width:48ch;margin-bottom:18px}
.banner .btn.w{background:#fff;color:var(--primary)!important;border-color:#fff;height:44px;padding:0 22px;box-shadow:0 6px 18px rgba(16,24,40,.18)}
.banner .btn.g{background:transparent;border-color:rgba(255,255,255,.6);box-shadow:none;margin-left:8px}
.mock{background:rgba(16,24,48,.78);border-radius:14px;padding:14px;box-shadow:0 18px 40px rgba(16,24,48,.35);transform:rotate(-2deg)}
.mock svg{display:block;width:100%;height:auto}
/* attention list */
.att{display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:12px;background:var(--umh-n50);color:var(--ink);text-decoration:none!important;margin-top:8px;border:1px solid transparent}.att:hover{border-color:var(--umh-blue-200)}
.att .n{font-weight:800;font-size:18px;min-width:26px}.att .t{flex:1;font-size:13.5px;min-width:0}.att .t small{display:block;color:var(--muted);font-size:12px}
.att .ib{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:var(--umh-amber-50);color:var(--umh-amber-700);flex:none}.att .ib.blue{background:var(--primary-soft);color:var(--primary)}
.cta{background:linear-gradient(135deg,#eaf0ff,#dbe6ff);border:1px solid var(--umh-blue-100);border-radius:14px;padding:14px 16px;margin-bottom:10px}.cta b{display:block;font-size:15px}.cta small{color:var(--umh-n600)}
/* bars */
.brow{display:grid;grid-template-columns:minmax(60px,.7fr) minmax(0,2.4fr) auto;gap:12px;align-items:center;padding:7px 0;font-size:13.5px}
.brow .n{white-space:nowrap}.card h2 .more{margin-left:auto;font-size:13px;font-weight:500}.heat td.rl small{display:block;font-weight:400;color:var(--muted);font-size:11px}.track.two{margin:2px 0}.brow .lab{font-weight:600;min-width:0;word-break:break-word}.brow .lab small{display:block;font-weight:400;color:var(--muted);font-size:11.5px}
.track{position:relative;height:10px;border-radius:5px;background:var(--umh-n100);overflow:hidden}.track i{position:absolute;left:0;top:0;bottom:0;border-radius:5px}
.track.two{height:20px;background:none;display:flex;flex-direction:column;gap:3px;overflow:visible}.track.two i{position:relative;display:block;height:8px;border-radius:4px;min-width:2px}
.i-sp{background:var(--umh-n400)}.i-rs{background:var(--primary)}.i-bad{background:var(--umh-red-500)}.i-good{background:var(--umh-green-500)}
.lg{display:flex;gap:16px;flex-wrap:wrap;font-size:12.5px;color:var(--umh-n600);margin:4px 0 8px}.lg i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:6px;vertical-align:-1px}
/* heat table */
.heat td.hc{text-align:center;font-weight:600;min-width:84px}
.heat .hv{display:none}.heat[data-m=eff] .hv-eff,.heat[data-m=spend] .hv-spend,.heat[data-m=res] .hv-res,.heat[data-m=cpr] .hv-cpr,.heat[data-m=ctr] .hv-ctr{display:inline}
.heat[data-m=eff] td.hc{background:var(--b-eff)}.heat[data-m=spend] td.hc{background:var(--b-spend)}.heat[data-m=res] td.hc{background:var(--b-res)}.heat[data-m=cpr] td.hc{background:var(--b-cpr)}.heat[data-m=ctr] td.hc{background:var(--b-ctr)}
.heat td.rl{font-weight:700;background:var(--umh-n50);white-space:nowrap}
.heat td.hc small{display:block;font-weight:400;color:var(--umh-n600);font-size:11px}
/* insights */
.igrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr));gap:14px}
.ins{background:#fff;border:1px solid var(--border);border-left:4px solid var(--primary);border-radius:var(--radius);box-shadow:var(--shadow);padding:16px 18px;display:flex;flex-direction:column;gap:10px;min-width:0}
.ins.shift{border-left-color:var(--umh-green-500)}.ins.cut,.ins.exclude{border-left-color:var(--umh-red-500)}.ins.test{border-left-color:var(--umh-violet-500)}.ins.fix{border-left-color:var(--umh-amber-500)}.ins.watch{border-left-color:var(--umh-n400)}
.ins .t{font-weight:700;font-size:15px;line-height:1.35}.ins .top{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.facts{display:grid;grid-template-columns:1fr 1fr;gap:8px 14px;background:var(--umh-n50);border-radius:10px;padding:10px 12px}.facts .k{font-size:11.5px;color:var(--muted)}.facts .v{font-weight:700;font-size:13px}
.act{font-size:13.5px;color:var(--umh-n700)}.act b{color:var(--ink)}
/* brain */
.brain{display:grid;grid-template-columns:minmax(240px,.8fr) minmax(0,1.6fr);gap:16px;align-items:start}
.qs{display:flex;flex-direction:column;gap:8px}.qs a{display:block;padding:12px 14px;border:1px solid var(--border);border-radius:12px;background:#fff;color:var(--ink);font-weight:500;font-size:13.5px;text-decoration:none!important;box-shadow:var(--shadow)}.qs a:hover{border-color:var(--umh-blue-200)}.qs a.on{background:var(--primary-soft);border-color:var(--umh-blue-200);color:var(--primary);font-weight:600}
.chat{min-height:300px}.ask{display:inline-block;background:var(--primary);color:#fff;border-radius:14px 14px 4px 14px;padding:10px 16px;font-weight:500;margin-bottom:16px;max-width:100%}
.ans{background:var(--umh-n50);border:1px solid var(--border);border-radius:14px;padding:16px 18px}.ans .who{display:flex;gap:8px;align-items:center;font-size:12px;font-weight:700;color:var(--primary);margin-bottom:8px}
.ans .t{font-size:19px;font-weight:700;line-height:1.3;margin-bottom:8px}.ans p{margin:6px 0;color:var(--umh-n700)}
.src{display:inline-block;margin-top:10px;font-size:12px;font-weight:600;color:var(--primary);background:#fff;border:1px solid var(--umh-blue-100);padding:4px 12px;border-radius:999px}
/* misc */
.notice{background:var(--primary-soft);border:1px solid var(--umh-blue-100);color:var(--umh-blue-900);border-radius:12px;padding:10px 14px;margin:12px 0;font-size:13.5px}
.notice.err{background:var(--umh-red-50);border-color:#fbd8da;color:var(--umh-red-600)}
.flag{border-left:4px solid var(--umh-red-500);background:#fff;border:1px solid var(--border);border-left-width:4px;border-radius:12px;padding:12px 16px;margin-top:10px;font-size:13.5px}.flag.gate{border-left-color:var(--umh-amber-500)}.flag .refs{color:var(--muted);font-size:12px;margin-top:6px}
.hit{border-left:4px solid var(--umh-red-500);background:#fff;border:1px solid var(--border);border-left-width:4px;border-radius:12px;padding:12px 16px;margin-top:10px;font-size:13.5px}.hit.try{border-left-color:var(--umh-amber-500)}.hit.neg{border-left-color:var(--umh-n400)}
.chart{width:100%;height:auto}.chart .grid{stroke:var(--umh-n200)}.chart .axis{fill:var(--umh-n500);font-size:11px}
.f-meta{fill:var(--c1);background:var(--c1)}.f-tiktok{fill:var(--c4);background:var(--c4)}.f-google{fill:var(--c3);background:var(--c3)}.f-other{fill:var(--c2);background:var(--c2)}.f-target{fill:var(--c3);background:var(--c3)}
.l-meta{stroke:var(--c1)}.l-tiktok{stroke:var(--c4)}.l-google{stroke:var(--c3)}.l-other{stroke:var(--c2)}.l-target{stroke:var(--c3)}.chart path{stroke-width:2.4}.chart .dashed{stroke-dasharray:6 5}
.legend{display:flex;gap:16px;flex-wrap:wrap;font-size:12.5px;color:var(--umh-n600);margin-top:8px}.legend .sw2{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:6px;vertical-align:-1px}.sw-dash{height:3px!important;vertical-align:3px!important}
form.stack-f p{margin-bottom:10px}
.tabs{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:14px}
.cols-note{font-size:12.5px;color:var(--muted);margin-top:10px}
.hl{background:var(--umh-green-50)!important}
.bnav{display:none}
@media (max-width:1200px){.g-side{grid-template-columns:minmax(0,1fr)}.hero-row{grid-template-columns:minmax(0,1fr)}.g21{grid-template-columns:minmax(0,1fr)}}
@media (max-width:1100px){.tb-search input{width:100px}.u-meta{display:none}.user{padding:0 8px;height:40px}}
@media (max-width:900px){.sb{position:fixed;left:0;top:0;bottom:0;transform:translateX(-102%);transition:transform .2s;box-shadow:0 0 40px rgba(16,24,40,.25)}
.sb-open .sb{transform:none}.sb-open .scrim{display:block;position:fixed;inset:0;background:rgba(16,24,40,.4);z-index:75}.tb-menu{display:grid}.sb-tog{display:none}
.g2,.g3,.brain,.banner{grid-template-columns:minmax(0,1fr)}.banner{padding:24px 20px}.banner h1{font-size:26px}.mock{display:none}.tb-search,.live,.tb-btn span,.crumb em{display:none}
.tb{padding:0 12px}.content{padding:16px 14px 90px}.bnav{display:flex;position:fixed;bottom:0;left:0;right:0;z-index:70;background:#fff;border-top:1px solid var(--border);padding:6px 8px calc(6px + env(safe-area-inset-bottom));justify-content:space-around;gap:4px}
.bnav a{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 2px;border-radius:10px;color:var(--umh-n600);font-size:11px;font-weight:600;text-decoration:none!important}.bnav a.on{background:var(--primary-soft);color:var(--primary)}
.crumb{font-size:15px}.hero-card{padding:16px}.hero-tag{position:static!important;display:inline-block;margin-bottom:10px}.kpis{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.kpi .v{font-size:21px}.kpi .k{padding-right:0}.kpi .bub{display:none}
.brow{grid-template-columns:minmax(40px,.6fr) minmax(0,1.6fr) auto;gap:8px}.facts{grid-template-columns:1fr 1fr}.hk .big{font-size:28px}.cust>.box{position:fixed;left:14px;right:14px;top:auto;max-width:none;width:auto}.pop-box{position:fixed;right:10px;left:10px;width:auto;top:66px}}
html.sb-collapsed{--sbw:76px}html.sb-collapsed .sb .brand-txt,html.sb-collapsed .sb .lbl,html.sb-collapsed .sb .chev,html.sb-collapsed .sb .sub,html.sb-collapsed .sb .ws-info,html.sb-collapsed .sb .ws-chev,html.sb-collapsed .sb .quota,html.sb-collapsed .sb .btn.full span{display:none}
html.sb-collapsed .sb .item{justify-content:center;padding:0}html.sb-collapsed .sb .tog svg{transform:rotate(180deg)}html.sb-collapsed .sb .ws-btn{justify-content:center;padding:6px}html.sb-collapsed .sb .sb-tog{justify-content:center}
@media (max-width:900px){html.sb-collapsed{--sbw:264px}html.sb-collapsed .sb .brand-txt,html.sb-collapsed .sb .lbl,html.sb-collapsed .sb .ws-info,html.sb-collapsed .sb .quota,html.sb-collapsed .sb .btn.full span{display:revert}html.sb-collapsed .sb .item{justify-content:flex-start;padding:0 12px}}
@media (prefers-reduced-motion:reduce){*{transition:none!important;scroll-behavior:auto!important}}
@media print{.sb,.tb,.bnav{display:none}}`;
