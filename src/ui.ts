// Visual system shared by every page. Tokens, fonts and motion follow the Unified Media Hub clip:
// near-black field, ivory type, one lime accent, wide sans caps + serif italic + mono HUD labels, viewfinder corners.
export const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export const FONTS = 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=Instrument+Serif:ital@1&family=JetBrains+Mono:wght@500;700&display=swap';

const GRID = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><path d='M80 72v16M72 80h16' stroke='%23ECEEE9' stroke-opacity='.14' stroke-width='1.5' fill='none'/></svg>\")";
const NOISE = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

export const CSS = `
:root{--bg:#0C0E0C;--panel:#151613;--panel2:#1b1d19;--ivory:#ECEEE9;--lime:#CCFF22;--limedim:#9fc41a;--g1:#868a80;--g2:#4D504C;--g3:#3B3E3C;--mut:#A3A79C;--warn:#FFB43A;--bad:#FF6B5A;--glow:rgba(204,255,34,.16);
--c1:#CCFF22;--c2:#ECEEE9;--c3:#8a8f82;--c4:#6f9a2a;
--ser:'Instrument Serif',Georgia,serif;--wide:'Archivo',system-ui,sans-serif;--mono:'JetBrains Mono',ui-monospace,Consolas,monospace}
*{box-sizing:border-box}html{background:var(--bg);color-scheme:dark;-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ivory);font:400 16px/1.55 'Archivo',system-ui,sans-serif;position:relative;min-height:100vh;overflow-x:hidden}
body::before{content:"";position:fixed;inset:0;z-index:-2;pointer-events:none;background:radial-gradient(ellipse at 50% 30%,rgba(40,46,34,.5) 0%,rgba(12,14,12,0) 65%),${GRID};background-size:100% 100%,160px 160px}
body::after{content:"";position:fixed;inset:0;z-index:60;pointer-events:none;opacity:.05;mix-blend-mode:overlay;background:${NOISE}}
a{color:var(--lime)}::selection{background:var(--lime);color:#0C0E0C}
main{max-width:1360px;margin:0 auto;padding:22px 24px 40px}main.wide{max-width:1560px}
header.top{display:flex;align-items:center;gap:20px 28px;flex-wrap:wrap;padding:6px 0 16px;margin-bottom:6px;border-bottom:1px solid rgba(236,238,233,.1)}
.brand{display:flex;align-items:center;gap:12px;color:var(--ivory);text-decoration:none;font:800 18px/1 var(--wide);font-stretch:125%;text-transform:uppercase;letter-spacing:-.01em;white-space:nowrap}
.brand svg{width:26px;height:26px;flex:none}
nav.tabs{display:flex;flex-wrap:wrap;gap:2px 6px;margin-left:auto}
nav.tabs a{font:500 12px/1 var(--mono);letter-spacing:.16em;text-transform:uppercase;color:var(--g1);text-decoration:none;padding:10px 12px;border-radius:999px;border:1px solid transparent;transition:color .2s,border-color .2s,box-shadow .2s}
nav.tabs a b{color:var(--g2);font-weight:700;margin-right:7px}
nav.tabs a:hover{color:var(--ivory)}nav.tabs a.on{color:#0C0E0C;background:var(--lime);box-shadow:0 0 28px var(--glow)}nav.tabs a.on b{color:#0C0E0C}
.demo-tag{font:500 11px/1 var(--mono);letter-spacing:.2em;text-transform:uppercase;color:var(--lime);border:1px solid rgba(204,255,34,.5);padding:7px 12px;border-radius:999px;white-space:nowrap;display:inline-flex;gap:8px;align-items:center}
.demo-tag::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--lime);box-shadow:0 0 0 3px rgba(204,255,34,.18),0 0 12px 3px rgba(204,255,34,.6)}
.hud{display:flex;align-items:center;gap:14px;margin:26px 0 10px;font:500 13px/1 var(--mono);letter-spacing:.22em;text-transform:uppercase;color:var(--ivory)}
.hud b{color:var(--lime);font-weight:700}.hud i{flex:1;height:1px;background:linear-gradient(90deg,rgba(236,238,233,.25),transparent)}
h1{font:800 clamp(1.7rem,4.6vw,3.3rem)/1.02 var(--wide);font-stretch:125%;text-transform:uppercase;letter-spacing:-.015em;margin:.2em 0 .35em;max-width:20ch}
h1.metal,.metal{background:linear-gradient(180deg,#fff 0%,#d7dadc 30%,#7b8085 50%,#eef0f1 66%,#a3a9ae 100%);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent}
h1 em,h2 em,.ser{font:italic 400 1.18em/1 var(--ser);text-transform:none;letter-spacing:0;-webkit-text-fill-color:currentColor;color:var(--ivory)}
h1 .acc{color:var(--lime);-webkit-text-fill-color:var(--lime)}
h1.wide-h{max-width:none}
h1::after{content:"";display:inline-block;width:.2em;height:.2em;margin-left:.22em;border-radius:50%;background:var(--lime);box-shadow:0 0 0 .1em rgba(204,255,34,.18),0 0 .5em .2em rgba(204,255,34,.55);vertical-align:.05em}
h2{font:800 1.05rem/1.2 var(--wide);font-stretch:112%;text-transform:uppercase;letter-spacing:-.005em;margin:2em 0 .7em;display:flex;align-items:center;gap:12px}
h2::before{content:"";width:18px;height:3px;background:var(--lime);border-radius:2px;flex:none}
h3{font:800 .95rem/1.25 var(--wide);font-stretch:112%;text-transform:uppercase;margin:0 0 .5em}
p,li{max-width:78ch}.lead{font-size:1.08rem;color:#d4d7cf;max-width:64ch}
.mut{color:var(--mut);font-size:.92rem}.mono{font:500 12px/1.3 var(--mono);letter-spacing:.16em;text-transform:uppercase;color:var(--g1)}
.card{position:relative;background:var(--panel);border:1.5px solid var(--g3);border-radius:18px;padding:18px 22px;margin:12px 0;transition:border-color .25s,box-shadow .25s,transform .25s}
.card:hover,.card.on{border-color:var(--lime);box-shadow:0 0 50px var(--glow)}
.card.flat:hover{border-color:var(--g3);box-shadow:none}
.card.dash{border-style:dashed;border-color:var(--g1)}
.vf::before{content:"";position:absolute;inset:-7px;pointer-events:none;z-index:2;opacity:.9;
background:linear-gradient(var(--lime),var(--lime)) left top/20px 2px no-repeat,linear-gradient(var(--lime),var(--lime)) left top/2px 20px no-repeat,
linear-gradient(var(--lime),var(--lime)) right top/20px 2px no-repeat,linear-gradient(var(--lime),var(--lime)) right top/2px 20px no-repeat,
linear-gradient(var(--lime),var(--lime)) left bottom/20px 2px no-repeat,linear-gradient(var(--lime),var(--lime)) left bottom/2px 20px no-repeat,
linear-gradient(var(--lime),var(--lime)) right bottom/20px 2px no-repeat,linear-gradient(var(--lime),var(--lime)) right bottom/2px 20px no-repeat}
.btn{display:inline-block;background:var(--lime);color:#0C0E0C;font:700 13px/1 var(--mono);letter-spacing:.14em;text-transform:uppercase;padding:13px 22px;border-radius:999px;text-decoration:none;border:1.5px solid var(--lime);cursor:pointer;margin:4px 8px 4px 0;transition:box-shadow .2s,transform .2s,background .2s}
.btn:hover{box-shadow:0 0 30px rgba(204,255,34,.45);transform:translateY(-1px)}
.btn.sec{background:transparent;color:var(--lime)}.btn.sec:hover{background:rgba(204,255,34,.08)}.btn.sm{padding:8px 14px;font-size:11px}
.btn:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,summary:focus-visible{outline:2px solid var(--lime);outline-offset:3px}
.banner{background:transparent;color:var(--lime);border:1px solid rgba(204,255,34,.5);border-radius:14px;padding:10px 16px;margin:12px 0;font:500 12px/1.5 var(--mono);letter-spacing:.1em;text-transform:uppercase}
.tw{overflow-x:auto;-webkit-overflow-scrolling:touch}table{border-collapse:collapse;width:100%;font-size:.92rem}
th,td{text-align:left;padding:11px 12px;border-bottom:1px solid rgba(236,238,233,.08);vertical-align:top}
th{font:500 11px/1.3 var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--g1);white-space:nowrap;border-bottom:1px solid rgba(236,238,233,.2)}
tbody tr{transition:background .2s}tbody tr:hover,table tr:hover td{background:rgba(204,255,34,.04)}
.tw td:first-child{white-space:nowrap}.tw td .codename{white-space:normal}td.n,th.n{text-align:right;font-variant-numeric:tabular-nums}
.tag{display:inline-block;border:1px solid rgba(204,255,34,.5);color:var(--lime);border-radius:999px;padding:3px 9px;font:500 10px/1.2 var(--mono);letter-spacing:.14em;text-transform:uppercase;vertical-align:middle;white-space:nowrap}
.tag.plain{border-color:var(--g3);color:var(--mut)}.ok{color:var(--lime)}.bad{color:var(--bad)}.warn{color:var(--warn)}
.pill{display:inline-flex;align-items:center;gap:7px;border-radius:999px;padding:5px 12px;font:700 11px/1 var(--mono);letter-spacing:.14em;text-transform:uppercase;white-space:nowrap;border:1.5px solid var(--lime);color:var(--lime)}
.pill::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor;box-shadow:0 0 8px currentColor}
.pill.fill{background:var(--lime);color:#0C0E0C}.pill.fill::before{box-shadow:none}
.pill.warn{border-color:var(--warn);color:var(--warn)}.pill.bad{border-color:var(--bad);color:var(--bad)}.pill.dim{border-color:var(--g2);color:var(--g1)}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(190px,100%),1fr));gap:12px;margin:14px 0}
.tile{position:relative;background:var(--panel);border:1.5px solid var(--g3);border-radius:18px;padding:16px 18px 18px;transition:border-color .25s,box-shadow .25s}
.tile:hover{border-color:var(--lime);box-shadow:0 0 40px var(--glow)}
.tile .k{font:500 11px/1.3 var(--mono);letter-spacing:.16em;text-transform:uppercase;color:var(--g1);margin-bottom:10px}
.tile .v{white-space:nowrap;font:800 clamp(1.05rem,1.45vw,1.5rem)/1.1 var(--wide);font-stretch:112%;font-variant-numeric:tabular-nums;letter-spacing:-.01em}
.tile.key .v{position:relative;display:inline-block;padding-bottom:9px}.tile.key .v::after{content:"";position:absolute;left:0;bottom:0;width:100%;height:4px;background:var(--lime);border-radius:2px;transform-origin:left;animation:ul 1s .3s cubic-bezier(.2,.8,.2,1) both}
@keyframes ul{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.grid2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px}@media (max-width:1000px){.grid2{grid-template-columns:minmax(0,1fr)}}
.cols3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}@media (max-width:800px){.cols3{grid-template-columns:minmax(0,1fr)}}
.chart{width:100%;height:auto}.chart .grid{stroke:rgba(236,238,233,.09)}.chart .axis{fill:var(--g1);font:500 11px var(--mono)}
.f-meta{fill:var(--c1);background:var(--c1)}.f-tiktok{fill:var(--c2);background:var(--c2)}.f-google{fill:var(--c3);background:var(--c3)}.f-other{fill:var(--c4);background:var(--c4)}.f-target{fill:var(--warn);background:var(--warn)}
.l-meta{stroke:var(--c1)}.l-tiktok{stroke:var(--c2)}.l-google{stroke:var(--c3)}.l-other{stroke:var(--c4)}.l-target{stroke:var(--warn)}.chart path{stroke-width:2.6}.chart .dashed{stroke-dasharray:6 5}
.chart rect{transition:opacity .2s}.chart rect:hover{opacity:.75}
.legend{display:flex;gap:16px;flex-wrap:wrap;font:500 11px/1.4 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--mut);margin:8px 0 0}.sw{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:7px;vertical-align:-1px}.sw-dash{height:3px;vertical-align:3px}
form.filters{display:flex;flex-wrap:wrap;gap:14px;align-items:end}form.filters label{display:flex;flex-direction:column;gap:6px;font:500 11px/1.2 var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--g1)}
input,select,textarea{font:inherit;font-size:.95rem;background:#0f110e;color:var(--ivory);border:1.5px solid var(--g3);border-radius:12px;padding:10px 12px;transition:border-color .2s,box-shadow .2s;max-width:100%;color-scheme:dark}
input:focus,select:focus,textarea:focus{border-color:var(--lime);box-shadow:0 0 0 3px rgba(204,255,34,.14);outline:none}textarea{width:100%}input::placeholder,textarea::placeholder{color:#6d7167}
.flag{border-left:3px solid var(--bad);padding:10px 16px;margin:10px 0;background:var(--panel);border-radius:0 14px 14px 0}.flag.gate{border-left-color:var(--warn)}.flag .refs{color:var(--mut);font:500 11px/1.5 var(--mono);letter-spacing:.06em;margin-top:6px}
.hit{border-left:3px solid var(--bad);padding:10px 16px;margin:10px 0;background:var(--panel);border-radius:0 14px 14px 0}.hit.try{border-left-color:var(--warn)}.hit.neg{border-left-color:var(--g3)}
.hero{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:34px;align-items:start}@media (max-width:900px){.hero{grid-template-columns:minmax(0,1fr)}}
/* controls */
.ctl{display:flex;flex-wrap:wrap;gap:14px 22px;align-items:end}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chip{font:700 12px/1 var(--mono);letter-spacing:.14em;text-transform:uppercase;text-decoration:none;color:var(--ivory);border:1.5px solid var(--g3);border-radius:999px;padding:10px 15px;transition:all .2s;background:transparent;cursor:pointer}
.chip:hover{border-color:var(--lime);color:var(--lime)}.chip.on{background:var(--lime);border-color:var(--lime);color:#0C0E0C;box-shadow:0 0 24px var(--glow)}
.ctl .grp{display:flex;flex-direction:column;gap:8px}.ctl .grp>.mono{font-size:10px}
.ctl input[type=search],.ctl input[type=text]{width:230px}.ctl input[type=date]{width:158px}
/* account cards */
.acc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(330px,100%),1fr));gap:16px;margin:14px 0}
.acct{padding:20px 22px;margin:0}.acct .hd{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:14px}
.acct .nm{font:800 1.05rem/1.2 var(--wide);font-stretch:112%;text-transform:uppercase}.acct .id{font:500 11px/1.4 var(--mono);letter-spacing:.14em;color:var(--g1);margin-top:4px;text-transform:uppercase}
.acct .big{font:800 clamp(1.5rem,2.4vw,2rem)/1 var(--wide);font-stretch:118%;font-variant-numeric:tabular-nums;display:inline-block;padding-bottom:8px;position:relative}
.acct .big::after{content:"";position:absolute;left:0;bottom:0;width:100%;height:4px;background:var(--lime);border-radius:2px}
.acct.is-unsettled .big::after{background:var(--warn)}.acct.is-disabled .big::after{background:var(--g2)}
.kv{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px 18px;margin:16px 0 4px}.kv div .k{font:500 10px/1.3 var(--mono);letter-spacing:.16em;text-transform:uppercase;color:var(--g1)}.kv div .v{font:600 1rem var(--wide);font-variant-numeric:tabular-nums;margin-top:3px}
.meter{height:6px;background:rgba(236,238,233,.1);border-radius:3px;margin:16px 0 6px;overflow:hidden}.meter i{display:block;height:100%;background:var(--lime);border-radius:3px;box-shadow:0 0 12px 1px rgba(204,255,34,.6);transform-origin:left;animation:ul 1.1s .2s cubic-bezier(.2,.8,.2,1) both}
.meter.hot i{background:var(--warn);box-shadow:0 0 12px 1px rgba(255,180,58,.6)}
.alert{margin-top:14px}.alert .pill{white-space:normal;line-height:1.35}
/* ABO details */
details.abo summary{cursor:pointer;list-style:none;display:inline-flex;gap:8px;align-items:center;font:700 11px/1.3 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--lime)}
details.abo summary::-webkit-details-marker{display:none}details.abo summary::after{content:"+";font-size:14px}details.abo[open] summary::after{content:"-"}
details.abo ul{margin:8px 0 0;padding:0;list-style:none}details.abo li{display:flex;justify-content:space-between;gap:16px;font-size:.85rem;color:var(--mut);padding:3px 0;border-bottom:1px dashed rgba(236,238,233,.1)}
.codename{font:500 .88rem var(--mono);letter-spacing:.02em;word-break:break-all}
/* brain */
.brain{display:grid;grid-template-columns:minmax(240px,.8fr) minmax(0,1.4fr);gap:26px;align-items:start}@media (max-width:900px){.brain{grid-template-columns:minmax(0,1fr)}}
.qs{display:flex;flex-direction:column;gap:10px}.qs a{text-decoration:none;color:var(--ivory);border:1.5px solid var(--g3);border-radius:14px;padding:13px 16px;font:600 .92rem/1.3 var(--wide);transition:all .2s}
.qs a:hover{border-color:var(--lime);color:var(--lime)}.qs a.on{border-color:var(--lime);background:rgba(204,255,34,.07);color:var(--lime)}
.win{background:#0f110e;border:1.5px solid var(--g3);border-radius:18px;padding:20px 22px 24px;min-height:320px}
.win .bar{display:flex;gap:7px;margin-bottom:18px}.win .bar i{width:9px;height:9px;border-radius:50%;background:var(--g3)}.win .cap{margin-left:auto;font:500 10px/1 var(--mono);letter-spacing:.18em;text-transform:uppercase;color:var(--g1)}
.ask{display:inline-block;border:1.5px solid var(--lime);color:var(--ivory);border-radius:999px;padding:10px 18px;font:600 .92rem/1.2 var(--wide);box-shadow:0 0 28px var(--glow);margin-bottom:18px;max-width:100%}
.ask b{color:var(--lime)}
.ans{background:var(--panel);border:1px solid var(--g3);border-radius:14px;padding:16px 18px}
.ans .who{font:700 10px/1 var(--mono);letter-spacing:.2em;text-transform:uppercase;color:var(--lime);margin-bottom:10px}
.ans .t{font:800 clamp(1.2rem,2.6vw,1.7rem)/1.15 var(--wide);letter-spacing:-.01em;margin:0 0 10px}.ans p{margin:.4em 0;color:#d4d7cf}
.src{display:inline-block;margin-top:12px;border:1.5px solid var(--lime);color:var(--lime);border-radius:999px;padding:6px 14px;font:700 10px/1 var(--mono);letter-spacing:.16em;text-transform:uppercase}
/* steps */
.steps{counter-reset:s;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}@media (max-width:800px){.steps{grid-template-columns:minmax(0,1fr)}}
.step{position:relative;background:var(--panel);border:1.5px dashed var(--g1);border-radius:18px;padding:18px 20px;transition:all .25s}.step:hover{border-style:solid;border-color:var(--lime);box-shadow:0 0 40px var(--glow)}
.step .n{text-transform:uppercase;font:700 12px/1 var(--mono);letter-spacing:.2em;color:var(--lime);margin-bottom:12px}
.rule{height:1px;background:rgba(236,238,233,.1);margin:26px 0}
footer.f{margin-top:44px;padding-top:16px;border-top:1px solid rgba(236,238,233,.08);display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font:500 11px/1.4 var(--mono);letter-spacing:.18em;text-transform:uppercase;color:var(--g2)}
/* motion */
.rv{opacity:0;transform:translateY(18px);transition:opacity .7s cubic-bezier(.2,.8,.2,1),transform .7s cubic-bezier(.2,.8,.2,1)}.rv.in{opacity:1;transform:none}
.w{display:inline-block;overflow:hidden;vertical-align:bottom;padding:.06em .08em .14em 0;margin-bottom:-.14em}.w>span{display:inline-block;transform:translateY(110%);transition:transform .6s cubic-bezier(.2,.8,.2,1)}.w.in>span{transform:none}
.no-js .rv,.no-js .w>span{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){.rv,.w>span{opacity:1!important;transform:none!important;transition:none!important}.tile.key .v::after,.meter i{animation:none}*{scroll-behavior:auto!important}}
@media (max-width:640px){main{padding:16px 16px 34px}header.top{gap:14px}nav.tabs{margin-left:0;width:100%;overflow-x:auto;flex-wrap:nowrap;padding-bottom:4px}nav.tabs a{flex:none}.demo-tag{margin-left:auto}.brand{font-size:15px}
h1{max-width:none}.tiles{grid-template-columns:repeat(2,minmax(0,1fr))}.tile .v{font-size:1.02rem}.acc-grid{grid-template-columns:minmax(0,1fr)}.ctl input[type=search],.ctl input[type=text]{width:100%}.ctl .grp{width:100%}.ctl input[type=date]{width:calc(50% - 8px)}.card{padding:16px 16px}.vf::before{inset:-5px}}
@media (min-width:1500px){body{font-size:17px}}`;

const LOGO = `<svg viewBox="0 0 26 26" aria-hidden="true"><g stroke="#CCFF22" stroke-width="2" stroke-linecap="round"><path d="M13 13V3M13 13l8.7 5M13 13l-8.7 5"/></g><g fill="#CCFF22"><circle cx="13" cy="3" r="2.4"/><circle cx="21.7" cy="18" r="2.4"/><circle cx="4.3" cy="18" r="2.4"/></g></svg>`;

export const NAV: Array<[string, string, string]> = [['/overview', '01', 'Overview'], ['/campaigns', '02', 'Campaigns'], ['/dashboard', '03', 'Unify'], ['/memory', '04', 'Memory'], ['/brain', '05', 'Brain'], ['/accounts', '06', 'Connect']];

export function hud(n: string, name: string): string { return `<div class="hud"><span><b>${n}</b> · ${esc(name)}</span><i></i></div>`; }

/** Heading with by-word reveal. Words wrapped in <em>..</em> or <span class="acc"> in `html` are kept as-is (split on top-level spaces only). */
export function reveal(html: string): string {
  let depth = 0, out = '', buf = '';
  const flush = () => { if (buf) { out += `<span class="w"><span>${buf}</span></span> `; buf = ''; } };
  for (let i = 0; i < html.length; i++) {
    const c = html[i];
    if (c === '<') { const j = html.indexOf('>', i); const tag = html.slice(i, j + 1); depth += tag.startsWith('</') ? -1 : 1; buf += tag; i = j; }
    else if (c === ' ' && depth === 0) flush();
    else buf += c;
  }
  flush();
  return out.trim();
}

export function layout(title: string, body: string, active = '', wide = false): string {
  const nav = NAV.map(([h, n, l]) => `<a href="${h}"${active === h ? ' class="on" aria-current="page"' : ''}><b>${n}</b>${l}</a>`).join('');
  return `<!doctype html><html lang="en" class="no-js"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#0C0E0C"><title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${FONTS}">
<link rel="stylesheet" href="/assets/hub.css"><script src="/assets/hub.js" defer></script></head><body><main${wide ? ' class="wide"' : ''}>
<header class="top"><a class="brand" href="/">${LOGO}Unified Media Hub</a><nav class="tabs" aria-label="Sections">${nav}</nav><span class="demo-tag">Demo data</span></header>${body}
<footer class="f"><span>Unified Media Hub · prototype</span><span>Refreshed on a schedule · source age shown</span></footer>
</main></body></html>`;
}

export const HUB_JS = `(()=>{
var d=document,r=d.documentElement;r.classList.remove('no-js');
var rm=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
function inView(){return 'IntersectionObserver' in window}
var targets=[].slice.call(d.querySelectorAll('.w,.rv'));
if(rm||!inView()){targets.forEach(function(e){e.classList.add('in')})}
else{var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){var t=e.target,dl=+(t.getAttribute('data-d')||0);setTimeout(function(){t.classList.add('in')},dl);io.unobserve(t)}})},{threshold:.1});
targets.forEach(function(e,i){if(e.classList.contains('w')){var p=e.parentNode;var idx=[].indexOf.call(p.querySelectorAll('.w'),e);e.setAttribute('data-d',idx*70)}io.observe(e)});
setTimeout(function(){targets.forEach(function(e){e.classList.add('in')})},2500)}
[].slice.call(d.querySelectorAll('[data-count]')).forEach(function(el){
 var to=+el.getAttribute('data-count'),pre=el.getAttribute('data-pre')||'',suf=el.getAttribute('data-suf')||'',dec=+(el.getAttribute('data-dec')||0);
 function fmt(v){return pre+v.toLocaleString('en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec})+suf}
 if(rm){el.textContent=fmt(to);return}
 var t0=null;function step(ts){if(t0===null)t0=ts;var u=Math.min(1,(ts-t0)/900),e=1-Math.pow(1-u,3);el.textContent=fmt(to*e);if(u<1)requestAnimationFrame(step);else el.textContent=fmt(to)}
 requestAnimationFrame(step)});
var ans=d.querySelector('[data-type]');
if(ans&&!rm){var full=ans.textContent;ans.textContent='';var i=0;(function tick(){i+=2;ans.textContent=full.slice(0,i);if(i<full.length)setTimeout(tick,16);else ans.textContent=full})()}
})();`;
